import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as glob from '@actions/glob';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import { ExecOptions, IPlatformAdapter, TaskResult } from '@extension-tasks/core';
import { promises as fs } from 'fs';
import * as os from 'os';
import path from 'path';

/**
 * GitHub Actions platform adapter
 * Implements IPlatformAdapter using @actions/* packages
 */
export class GitHubAdapter implements IPlatformAdapter {
  // ===== Input =====

  getInput(name: string, required?: boolean): string | undefined {
    const value = core.getInput(name, { required: required || false });
    return value || undefined;
  }

  getBoolInput(name: string, required?: boolean): boolean {
    const value = core.getInput(name, { required: required || false });
    if (!value) {
      return false;
    }

    return core.getBooleanInput(name, { required: required || false });
  }

  getDelimitedInput(name: string, delimiter: string, required?: boolean): string[] {
    const value = core.getInput(name, { required: required || false });
    if (!value) return [];
    return value
      .split(delimiter)
      .map((v) => v.trim())
      .filter((v) => v);
  }

  // ===== Output =====

  setOutput(name: string, value: string): void {
    core.setOutput(name, value);
  }

  setResult(result: TaskResult, message: string): void {
    if (result === TaskResult.Succeeded) {
      core.info(`✅ ${message}`);
    } else if (result === TaskResult.Failed) {
      core.setFailed(message);
    } else {
      core.warning(message);
    }
  }

  setVariable(name: string, value: string, isSecret?: boolean, isOutput?: boolean): void {
    if (isSecret) {
      core.setSecret(value);
    }
    if (isOutput) {
      core.setOutput(name, value);
    } else {
      core.exportVariable(name, value);
    }
  }

  setSecret(value: string): void {
    core.setSecret(value);
  }

  // ===== Logging =====

  debug(message: string): void {
    core.debug(message);
  }

  info(message: string): void {
    core.info(message);
  }

  warning(message: string): void {
    core.warning(message);
  }

  error(message: string): void {
    core.error(message);
  }

  isDebugEnabled(): boolean {
    return core.isDebug() || process.env.ACTIONS_STEP_DEBUG === 'true';
  }

  // ===== Execution =====

  async which(tool: string, check?: boolean): Promise<string> {
    const result = await io.which(tool, check);
    return result;
  }

  async exec(tool: string, args: string[], options?: ExecOptions): Promise<number> {
    let stderr = '';
    const toolCommand = tool.includes(' ') ? `"${tool}"` : tool;

    const listeners = {
      stdout: (data: Buffer) => {
        const str = data.toString();
        if (options?.outStream) {
          options.outStream.write(str);
        }
      },
      stderr: (data: Buffer) => {
        const str = data.toString();
        stderr += str;
        if (options?.errStream) {
          options.errStream.write(str);
        }
      },
    };

    const exitCode = await exec.exec(toolCommand, args, {
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

  async findMatch(root: string, patterns: string[]): Promise<string[]> {
    const normalizedPatterns = patterns
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0)
      .map((pattern) => {
        const isExclude = pattern.startsWith('!');
        const value = isExclude ? pattern.slice(1) : pattern;
        const rootedPattern = path.isAbsolute(value) ? value : path.join(root, value);
        const normalized = rootedPattern.replace(/\\/g, '/');
        return isExclude ? `!${normalized}` : normalized;
      });

    if (normalizedPatterns.length === 0) {
      return [];
    }

    const globber = await glob.create(normalizedPatterns.join('\n'));
    const matches = await globber.glob();

    return Array.from(new Set(matches.map((match) => path.resolve(match))));
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async mkdirP(dirPath: string): Promise<void> {
    await io.mkdirP(dirPath);
  }

  async rmRF(dirPath: string): Promise<void> {
    await io.rmRF(dirPath);
  }

  // ===== Environment =====

  getVariable(name: string): string | undefined {
    return process.env[name];
  }

  getTempDir(): string {
    return process.env.RUNNER_TEMP || os.tmpdir();
  }

  // ===== Tool Management =====

  async cacheDir(sourceDir: string, tool: string, version: string): Promise<string> {
    return tc.cacheDir(sourceDir, tool, version);
  }

  findCachedTool(tool: string, version: string): string | undefined {
    const found = tc.find(tool, version);
    return found || undefined;
  }

  async downloadTool(url: string): Promise<string> {
    return tc.downloadTool(url);
  }
}
