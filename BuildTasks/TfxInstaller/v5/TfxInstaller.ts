import tr from 'azure-pipelines-task-lib/toolrunner.js';

import taskLib from 'azure-pipelines-task-lib/task.js';
import toolLib from 'azure-pipelines-tool-lib/tool.js';

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { parse, format, Url } from 'url';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

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
    try {
        // Since we can't await in sync functions, we'll use --registry directly
        // and skip npmrc file creation for this function
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
    } catch (error) {
        taskLib.debug(`Error in queryLatestMatch: ${error instanceof Error ? error.message : String(error instanceof Object ? JSON.stringify(error) : error)}`);
        return "";
    }
}

async function acquireTfx(version: string, registry?: string): Promise<string> {
    let npmrcPath: string | null = null;
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
        
        // Create npmrc file when registry is specified
        npmrcPath = await createNpmrcFile(registry);
        
        const npmRunner = new tr.ToolRunner("npm");
        const args = ["install", "tfx-cli@" + version, "-g", "--prefix", extPath, '--no-fund'];
        
        // Add registry if specified
        if (registry) {
            args.push("--registry", registry);
            
            // Use the npmrc file if created
            if (npmrcPath) {
                args.push("--userconfig", npmrcPath);
            }
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
        taskLib.debug(`Error installing tfx: ${error instanceof Error ? error.message : String(error instanceof Object ? JSON.stringify(error) : error)}`);
        return Promise.reject(new Error("Failed to install tfx"));
    }
    finally {
        // Clean up npmrc file if created
        await cleanupNpmrcFile(npmrcPath);
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
    if (proxyBypassHosts?.length === 0) {
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
        } catch {
            taskLib.debug(`Could not parse registry URL: ${registry}`);
        }
    }

    // Add all bypass hosts
    proxyBypassHosts.forEach(bypassHost => {
        try {
            // If it's a regex pattern, we can't easily determine domains, so we add it directly
            bypassDomainSet.add(bypassHost);
        } catch (error) {
            taskLib.debug(`Error processing bypass host ${bypassHost}: ${error instanceof Error ? error.message : String(error instanceof Object ? JSON.stringify(error) : error)}`);
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

async function createNpmrcFile(registry?: string): Promise<string | null> {
    if (!registry) {
        return null;
    }

    try {
        // Create a temporary npmrc file
        const tempNpmrcPath = path.join(taskLib.getVariable('Agent.TempDirectory') || os.tmpdir(), `npmrc_${Date.now()}`);
        
        let npmrcContent = '';
        
        // Add registry URL
        if (registry) {
            const sanitizedRegistryUrl = registry.endsWith('/') ? registry : `${registry}/`;
            npmrcContent += `registry=${sanitizedRegistryUrl}\n`;
            
            // Parse the registry URL to get the host
            const registryUrl = parse(registry);
            if (registryUrl.host) {
                // Add always-auth setting for the registry
                npmrcContent += `${registryUrl.host}:always-auth=true\n`;
            }
        }

        // Configure proxy settings if needed
        const proxy = getProxyFromEnvironment();
        if (proxy) {
            npmrcContent += `proxy=${proxy}\n`;
            npmrcContent += `https-proxy=${proxy}\n`;
        }

        // Write the content to the temporary file
        await writeFileAsync(tempNpmrcPath, npmrcContent);
        taskLib.debug(`Created .npmrc file at ${tempNpmrcPath}`);

        return tempNpmrcPath;
    } catch (error) {
        taskLib.warning(`Failed to create .npmrc file: ${error instanceof Error ? error.message : String(error instanceof Object ? JSON.stringify(error) : error)}`);
        return null;
    }
}

async function cleanupNpmrcFile(npmrcPath: string | null): Promise<void> {
    if (!npmrcPath) {
        return;
    }

    try {
        await unlinkAsync(npmrcPath);
        taskLib.debug(`Removed temporary .npmrc file: ${npmrcPath}`);
    } catch (error) {
        taskLib.warning(`Failed to clean up .npmrc file: ${error instanceof Error ? error.message : String(error instanceof Object ? JSON.stringify(error) : error)}`);
    }
}
