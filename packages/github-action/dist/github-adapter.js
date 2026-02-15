import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import * as io from '@actions/io';
import { TaskResult } from '@extension-tasks/core';
import { promises as fs } from 'fs';
import * as os from 'os';
/**
 * GitHub Actions platform adapter
 * Implements IPlatformAdapter using @actions/* packages
 */
export class GitHubAdapter {
    // ===== Input =====
    getInput(name, required) {
        const value = core.getInput(name, { required: required || false });
        return value || undefined;
    }
    getBoolInput(name, required) {
        return core.getBooleanInput(name, { required: required || false });
    }
    getDelimitedInput(name, delimiter, required) {
        const value = core.getInput(name, { required: required || false });
        if (!value)
            return [];
        return value
            .split(delimiter)
            .map((v) => v.trim())
            .filter((v) => v);
    }
    // ===== Output =====
    setOutput(name, value) {
        core.setOutput(name, value);
    }
    setResult(result, message) {
        if (result === TaskResult.Succeeded) {
            core.info(`✅ ${message}`);
        }
        else if (result === TaskResult.Failed) {
            core.setFailed(message);
        }
        else {
            core.warning(message);
        }
    }
    setVariable(name, value, isSecret, isOutput) {
        if (isSecret) {
            core.setSecret(value);
        }
        if (isOutput) {
            core.setOutput(name, value);
        }
        else {
            core.exportVariable(name, value);
        }
    }
    setSecret(value) {
        core.setSecret(value);
    }
    // ===== Logging =====
    debug(message) {
        core.debug(message);
    }
    info(message) {
        core.info(message);
    }
    warning(message) {
        core.warning(message);
    }
    error(message) {
        core.error(message);
    }
    // ===== Execution =====
    async which(tool, check) {
        const result = await io.which(tool, check);
        return result;
    }
    async exec(tool, args, options) {
        let stderr = '';
        const listeners = {
            stdout: (data) => {
                const str = data.toString();
                if (options?.outStream) {
                    options.outStream.write(str);
                }
            },
            stderr: (data) => {
                const str = data.toString();
                stderr += str;
                if (options?.errStream) {
                    options.errStream.write(str);
                }
            },
        };
        const exitCode = await exec.exec(tool, args, {
            cwd: options?.cwd,
            env: options?.env,
            silent: options?.silent,
            ignoreReturnCode: options?.ignoreReturnCode,
            listeners,
        });
        if (options?.failOnStdErr && stderr) {
            throw new Error(`Command failed with stderr: ${stderr}`);
        }
        return exitCode;
    }
    // ===== Filesystem =====
    findMatch(_root, _patterns) {
        void _root;
        void _patterns;
        // GitHub Actions doesn't have a built-in glob matcher
        // We'd need to implement this or use a library
        // For now, return empty array (will be enhanced later)
        core.warning('findMatch not yet implemented in GitHub Actions adapter');
        return [];
    }
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    async readFile(filePath) {
        return fs.readFile(filePath, 'utf-8');
    }
    async writeFile(filePath, content) {
        await fs.writeFile(filePath, content, 'utf-8');
    }
    async mkdirP(dirPath) {
        await io.mkdirP(dirPath);
    }
    async rmRF(dirPath) {
        await io.rmRF(dirPath);
    }
    // ===== Environment =====
    getVariable(name) {
        return process.env[name];
    }
    getTempDir() {
        return process.env.RUNNER_TEMP || os.tmpdir();
    }
    // ===== Tool Management =====
    async cacheDir(sourceDir, tool, version) {
        return tc.cacheDir(sourceDir, tool, version);
    }
    findCachedTool(tool, version) {
        const found = tc.find(tool, version);
        return found || undefined;
    }
    async downloadTool(url) {
        return tc.downloadTool(url);
    }
}
//# sourceMappingURL=github-adapter.js.map