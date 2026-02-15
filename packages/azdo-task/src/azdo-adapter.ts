import * as tl from 'azure-pipelines-task-lib/task.js';
import * as tr from 'azure-pipelines-task-lib/toolrunner.js';
import * as ttl from 'azure-pipelines-tool-lib/tool.js';
import { IPlatformAdapter, TaskResult, ExecOptions } from '@extension-tasks/core';
import { promises as fs } from 'fs';

/**
 * Azure Pipelines platform adapter
 * Implements IPlatformAdapter using azure-pipelines-task-lib
 */
export class AzdoAdapter implements IPlatformAdapter {
  // ===== Input =====

  getInput(name: string, required?: boolean): string | undefined {
    return tl.getInput(name, required) || undefined;
  }

  getBoolInput(name: string, required?: boolean): boolean {
    return tl.getBoolInput(name, required);
  }

  getDelimitedInput(name: string, delimiter: string, required?: boolean): string[] {
    return tl.getDelimitedInput(name, delimiter, required);
  }

  // ===== Output =====

  setOutput(name: string, value: string): void {
    tl.setVariable(name, value, false, true);
  }

  setResult(result: TaskResult, message: string): void {
    const tlResult =
      result === TaskResult.Succeeded
        ? tl.TaskResult.Succeeded
        : result === TaskResult.Failed
          ? tl.TaskResult.Failed
          : tl.TaskResult.SucceededWithIssues;
    tl.setResult(tlResult, message);
  }

  setVariable(name: string, value: string, isSecret?: boolean, isOutput?: boolean): void {
    tl.setVariable(name, value, isSecret, isOutput);
  }

  setSecret(value: string): void {
    tl.setSecret(value);
  }

  // ===== Logging =====

  debug(message: string): void {
    tl.debug(message);
  }

  info(message: string): void {
    console.log(message);
  }

  warning(message: string): void {
    tl.warning(message);
  }

  error(message: string): void {
    tl.error(message);
  }

  // ===== Execution =====

  async which(tool: string, check?: boolean): Promise<string> {
    return tl.which(tool, check);
  }

  async exec(tool: string, args: string[], options?: ExecOptions): Promise<number> {
    const toolRunner = tl.tool(tool);
    toolRunner.arg(args);

    const execOptions: tr.IExecOptions = {
      cwd: options?.cwd,
      silent: options?.silent,
      ignoreReturnCode: options?.ignoreReturnCode,
      failOnStdErr: options?.failOnStdErr,
      outStream: options?.outStream,
      errStream: options?.errStream,
    };

    if (options?.env) {
      for (const [key, value] of Object.entries(options.env)) {
        process.env[key] = value;
      }
    }

    return toolRunner.exec(execOptions);
  }

  // ===== Filesystem =====

  findMatch(root: string, patterns: string[]): string[] {
    return tl.findMatch(root, patterns);
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
    await fs.mkdir(dirPath, { recursive: true });
  }

  async rmRF(dirPath: string): Promise<void> {
    await fs.rm(dirPath, { recursive: true, force: true });
  }

  // ===== Environment =====

  getVariable(name: string): string | undefined {
    return tl.getVariable(name);
  }

  getTempDir(): string {
    const agentTemp = tl.getVariable('Agent.TempDirectory');
    return agentTemp || require('os').tmpdir();
  }

  // ===== Tool Management =====

  async cacheDir(sourceDir: string, tool: string, version: string): Promise<string> {
    return ttl.cacheDir(sourceDir, tool, version);
  }

  findCachedTool(tool: string, version: string): string | undefined {
    const found = ttl.findLocalTool(tool, version);
    return found || undefined;
  }

  async downloadTool(url: string): Promise<string> {
    return ttl.downloadTool(url);
  }
}
