import tr from 'azure-pipelines-task-lib/toolrunner.js';

import taskLib from 'azure-pipelines-task-lib/task.js';
import toolLib from 'azure-pipelines-tool-lib/tool.js';

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { parse, format, Url } from 'url';

const debug = taskLib.getVariable("system.debug") || false;

try {
    const version = taskLib.getInput("version", true);
    const checkLatest = taskLib.getBoolInput("checkLatest", false) || false;
    const registry = taskLib.getInput("registry", false);

    await getTfx(version, checkLatest, registry);
    await taskLib.tool("tfx").arg(["version", "--no-color"]).execAsync();
}
catch (error: any) {
    taskLib.setResult(taskLib.TaskResult.Failed, error.message);
}

async function getTfx(versionSpec: string, checkLatest: boolean, registry?: string) {
    if (toolLib.isExplicitVersion(versionSpec)) {
        checkLatest = false; // check latest doesn't make sense when explicit version
    }

    let toolPath: string;
    if (!checkLatest) {
        toolPath = toolLib.findLocalTool('tfx', versionSpec);
    }

    if (!toolPath) {
        let version: string;
        if (toolLib.isExplicitVersion(versionSpec)) {
            version = versionSpec;
        }
        else {
            version = queryLatestMatch(versionSpec, registry);
            if (!version) {
                throw new Error(`Unable to find Tfx version '${versionSpec}'`);
            }

            toolPath = toolLib.findLocalTool('tfx', version);
        }

        if (!toolPath) {
            toolPath = await acquireTfx(version, registry);
        }
    }

    if (os.platform() !== "win32")
    {
        // Depending on target platform npm behaves slightly different. This seems to differ between distros and npm versions too.
        const probePaths = [toolPath, path.join(toolPath, "/bin"), path.join(toolPath, "/node_modules/.bin/")];
        toolPath = probePaths.find((probePath) => {
            return taskLib.exist(path.join(probePath, "/tfx"));
        });
    }

    taskLib.setVariable("__tfxpath", toolPath, false);
    toolLib.prependPath(toolPath);
}

function queryLatestMatch(versionSpec: string, registry?: string): string {
    const npmRunner = new tr.ToolRunner("npm");
    const args = ["show", "tfx-cli", "versions", "--json"];
    
    // Add registry if specified
    if (registry) {
        args.push("--registry", registry);
    }
    
    // Configure proxy settings if available
    const execOptions = configureNpmOptions();
    
    npmRunner.arg(args);
    const result = npmRunner.execSync({ ...execOptions, failOnStdErr: false, silent: !debug, ignoreReturnCode: false} as tr.IExecOptions);
    if (result.code === 0)
    {
        const versions: string[] = JSON.parse(result.stdout.trim());
        const version: string = toolLib.evaluateVersions(versions, versionSpec);
        return version;
    }
    return "";
}

async function acquireTfx(version: string, registry?: string): Promise<string> {
    try{
        version = toolLib.cleanVersion(version);

        let extPath: string;
        taskLib.assertAgent('2.115.0');
        extPath = taskLib.getVariable('Agent.TempDirectory');
        if (!extPath) {
            throw new Error('Expected Agent.TempDirectory to be set');
        }
        extPath = path.join(extPath, 'tfx'); // use as short a path as possible due to nested node_modules folders

        taskLib.mkdirP(path.join(extPath));
        const npmRunner = new tr.ToolRunner("npm");
        const args = ["install", "tfx-cli@" + version, "-g", "--prefix", extPath, '--no-fund'];
        
        // Add registry if specified
        if (registry) {
            args.push("--registry", registry);
        }
        
        // Configure proxy settings if available
        const execOptions = configureNpmOptions();
        
        npmRunner.arg(args);

        const result = npmRunner.execSync({ ...execOptions, failOnStdErr: false, silent: !debug, ignoreReturnCode: false} as tr.IExecOptions);
        if (result.code === 0)
        {
            if (os.platform() === "win32")
            {
                fs.unlinkSync(path.join(extPath, "/tfx"));
            }
            return await toolLib.cacheDir(extPath, 'tfx', version);
        }
    }
    catch (error) {
        taskLib.debug(`Error installing tfx: ${error instanceof Error ? error.message : String(error)}`);
        return Promise.reject(new Error("Failed to install tfx"));
    }
}

function getProxyFromEnvironment(): string | undefined {
    const proxyUrl: string = taskLib.getVariable('agent.proxyurl');
    if (proxyUrl) {
        const proxy: Url = parse(proxyUrl);
        const proxyUsername: string = taskLib.getVariable('agent.proxyusername') || '';
        const proxyPassword: string = taskLib.getVariable('agent.proxypassword') || '';

        if (proxyUsername) {
            proxy.auth = proxyUsername;
        }

        if (proxyPassword) {
            proxy.auth = `${proxyUsername}:${proxyPassword}`;
        }

        const authProxy = format(proxy);

        // Register the formatted proxy url as a secret if it contains a password
        if (proxyPassword) {
            taskLib.setSecret(authProxy);
        }

        return authProxy;
    }

    return undefined;
}

function getProxyBypass(): string | undefined {
    // Check if there are any proxy bypass hosts
    const proxyBypassHosts: string[] = JSON.parse(taskLib.getVariable('Agent.ProxyBypassList') || '[]'); 
    if (proxyBypassHosts == null || proxyBypassHosts.length == 0) {
        return undefined;
    }

    // Include the registry in the bypass list if it's specified
    const registry = taskLib.getInput("registry", false);
    const bypassDomainSet = new Set<string>();
    
    if (registry) {
        try {
            const registryUrl = parse(registry);
            if (registryUrl.hostname) {
                bypassDomainSet.add(registryUrl.hostname);
            }
        } catch (error) {
            taskLib.debug(`Could not parse registry URL: ${registry}`);
        }
    }

    // Add all bypass hosts
    proxyBypassHosts.forEach(bypassHost => {
        try {
            // If it's a regex pattern, we can't easily determine domains, so we add it directly
            bypassDomainSet.add(bypassHost);
        } catch (error) {
            taskLib.debug(`Error processing bypass host ${bypassHost}: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    // Return a comma separated list of the bypass domains
    if (bypassDomainSet.size > 0) {
        const bypassDomainArray = Array.from(bypassDomainSet);
        return bypassDomainArray.join(',');
    }
    
    return undefined;
}

function configureNpmOptions(): tr.IExecOptions {
    const options: tr.IExecOptions = {};
    
    // Set environment
    options.env = { ...process.env };

    // Add log level for verbose debugging
    if (debug || taskLib.getBoolInput("verbose", false)) {
        options.env['NPM_CONFIG_LOGLEVEL'] = 'verbose';
    }

    // Configure proxy settings
    const proxy = getProxyFromEnvironment();
    if (proxy) {
        taskLib.debug(`Using proxy "${sanitizeUrl(proxy)}" for npm`);
        options.env['NPM_CONFIG_PROXY'] = proxy;
        options.env['NPM_CONFIG_HTTPS-PROXY'] = proxy;

        const proxybypass = getProxyBypass();
        if (proxybypass) {
            // Check if there are any existing NOPROXY values
            const existingNoProxy = process.env["NO_PROXY"];
            let finalBypass = proxybypass;
            
            if (existingNoProxy) {
                // Trim trailing comma
                const trimmedProxy = existingNoProxy.endsWith(',') 
                    ? existingNoProxy.slice(0, -1) 
                    : existingNoProxy;
                
                // Append our bypass list
                finalBypass = trimmedProxy + ',' + proxybypass;
            }

            taskLib.debug(`Setting NO_PROXY for npm: "${finalBypass}"`);
            options.env['NO_PROXY'] = finalBypass;
        }
    }

    return options;
}

function sanitizeUrl(url: string): string {
    const parsed = parse(url);
    if (parsed.auth) {
        parsed.auth = "***:***";
    }
    return format(parsed);
}
