/**
 * Mock platform adapter for testing
 * Provides in-memory implementation of IPlatformAdapter
 */

import type { IPlatformAdapter, TaskResult, ExecOptions } from '../../platform.js';
import fs from 'fs/promises';
import path, { dirname } from 'path';
import { statSync } from 'fs';
import { tmpdir } from 'os';

/**
 * Mock platform adapter for testing
 */
export class MockPlatformAdapter implements IPlatformAdapter {
  private readonly fsSandboxRoot = path.join(tmpdir(), `mock-platform-${process.pid}`);

  // State
  private inputs = new Map<string, string>();
  private variables = new Map<string, string>();
  private outputs = new Map<string, string>();
  private secrets = new Set<string>();
  private files = new Map<string, string>();
  private tools = new Map<string, string>();
  private cachedTools = new Map<string, Map<string, string>>();

  // Captured calls
  public debugMessages: string[] = [];
  public infoMessages: string[] = [];
  public warningMessages: string[] = [];
  public errorMessages: string[] = [];
  public execCalls: Array<{ tool: string; args: string[]; options?: ExecOptions }> = [];
  public result?: { result: TaskResult; message: string };

  // ===== Input =====
  getInput(name: string, required?: boolean): string | undefined {
    const value = this.inputs.get(name);
    if (required && !value) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return value;
  }

  getBoolInput(name: string, required?: boolean): boolean {
    const value = this.getInput(name, required);
    if (!value) {
      return false;
    }
    return value.toLowerCase() === 'true';
  }

  getDelimitedInput(name: string, delimiter: string, required?: boolean): string[] {
    const value = this.getInput(name, required);
    if (!value) {
      return [];
    }
    return value.split(delimiter).filter((s) => s.trim().length > 0);
  }

  // ===== Output =====
  setOutput(name: string, value: string): void {
    this.outputs.set(name, value);
  }

  setResult(result: TaskResult, message: string): void {
    this.result = { result, message };
  }

  setVariable(name: string, value: string, isSecret?: boolean, isOutput?: boolean): void {
    this.variables.set(name, value);
    if (isSecret) {
      this.secrets.add(value);
    }
    if (isOutput) {
      this.outputs.set(name, value);
    }
  }

  setSecret(value: string): void {
    this.secrets.add(value);
  }

  // ===== Logging =====
  debug(message: string): void {
    this.debugMessages.push(message);
  }

  info(message: string): void {
    this.infoMessages.push(message);
  }

  warning(message: string): void {
    this.warningMessages.push(message);
  }

  error(message: string): void {
    this.errorMessages.push(message);
  }

  // ===== Execution =====
  async which(tool: string, check?: boolean): Promise<string> {
    const path = this.tools.get(tool);
    if (!path) {
      if (check) {
        throw new Error(`Tool not found: ${tool}`);
      }
      return '';
    }
    return path;
  }

  async exec(tool: string, args: string[], options?: ExecOptions): Promise<number> {
    this.execCalls.push({ tool, args, options });

    // Write to output streams if provided
    if (options?.outStream) {
      options.outStream.write('Mock stdout output\n');
    }
    if (options?.errStream) {
      options.errStream.write('Mock stderr output\n');
    }

    // Return success by default
    return 0;
  }

  // ===== Filesystem =====
  async findMatch(_root: string, patterns: string[]): Promise<string[]> {
    // In-memory matches
    const matches: string[] = [];
    for (const [filePath] of this.files) {
      for (const pattern of patterns) {
        if (this.matchesPattern(filePath, pattern)) {
          matches.push(filePath);
          break;
        }
      }
    }

    // Real filesystem exact-path fallback used by tests that write to disk
    for (const pattern of patterns) {
      if (pattern.includes('*') || pattern.includes('?')) {
        continue;
      }
      const candidate = path.join(_root, pattern);
      try {
        const stat = statSync(candidate);
        if (stat.isFile()) {
          matches.push(candidate);
        }
      } catch {
        // ignore missing paths
      }
    }

    return matches;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Very simple pattern matching for testing
    if (pattern === '*' || pattern === '**/*') {
      return true;
    }
    // Exact match
    if (filePath === pattern || filePath.endsWith('/' + pattern)) {
      return true;
    }
    // Wildcard match (basic)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(filePath);
  }

  async fileExists(path: string): Promise<boolean> {
    if (this.files.has(path)) {
      return true;
    }

    try {
      await fs.access(this.resolveFsPath(path));
      return true;
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content !== undefined) {
      return content;
    }

    return fs.readFile(this.resolveFsPath(path), 'utf-8');
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
    const fsPath = this.resolveFsPath(path);
    await fs.mkdir(dirname(fsPath), { recursive: true });
    await fs.writeFile(fsPath, content, 'utf-8');
  }

  async mkdirP(path: string): Promise<void> {
    await fs.mkdir(this.resolveFsPath(path), { recursive: true });
  }

  async rmRF(path: string): Promise<void> {
    this.files.delete(path);
    await fs.rm(this.resolveFsPath(path), { recursive: true, force: true });
  }

  private resolveFsPath(targetPath: string): string {
    if (!this.shouldSandboxPath(targetPath)) {
      return targetPath;
    }

    const relativeUnixPath = targetPath.replace(/^\/+/, '');
    return path.join(this.fsSandboxRoot, relativeUnixPath);
  }

  private shouldSandboxPath(targetPath: string): boolean {
    if (!path.isAbsolute(targetPath)) {
      return false;
    }

    if (/^[a-zA-Z]:[\\/]/.test(targetPath)) {
      return false;
    }

    const normalizedPath = targetPath.replace(/\\/g, '/');
    const normalizedTmpDir = tmpdir().replace(/\\/g, '/').replace(/\/+$/, '');

    return (
      !normalizedPath.startsWith(`${normalizedTmpDir}/`) && normalizedPath !== normalizedTmpDir
    );
  }

  // ===== Environment =====
  getVariable(name: string): string | undefined {
    return this.variables.get(name);
  }

  getTempDir(): string {
    return '/tmp';
  }

  // ===== Tool Management =====
  async cacheDir(_sourceDir: string, tool: string, version: string): Promise<string> {
    if (!this.cachedTools.has(tool)) {
      this.cachedTools.set(tool, new Map());
    }
    const cachedPath = `/cache/${tool}/${version}`;
    this.cachedTools.get(tool).set(version, cachedPath);
    return cachedPath;
  }

  findCachedTool(tool: string, version: string): string | undefined {
    return this.cachedTools.get(tool)?.get(version);
  }

  async downloadTool(url: string): Promise<string> {
    return `/downloads/${url.split('/').pop()}`;
  }

  // ===== Test Helpers =====

  /**
   * Set an input value for testing
   */
  setInput(name: string, value: string): void {
    this.inputs.set(name, value);
  }

  /**
   * Set tool location for testing
   */
  setToolLocation(tool: string, path: string): void {
    this.tools.set(tool, path);
  }

  /**
   * Set multiple inputs at once
   */
  setInputs(inputs: Record<string, string>): void {
    for (const [name, value] of Object.entries(inputs)) {
      this.inputs.set(name, value);
    }
  }

  /**
   * Set a variable value for testing
   */
  setVariableValue(name: string, value: string): void {
    this.variables.set(name, value);
  }

  /**
   * Register a tool path
   */
  registerTool(name: string, path: string): void {
    this.tools.set(name, path);
  }

  /**
   * Set file content for testing
   */
  setFileContent(path: string, content: string): void {
    this.files.set(path, content);
  }

  /**
   * Set multiple files at once
   */
  setFiles(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      this.files.set(path, content);
    }
  }

  /**
   * Clear all state
   */
  reset(): void {
    this.inputs.clear();
    this.variables.clear();
    this.outputs.clear();
    this.secrets.clear();
    this.files.clear();
    this.tools.clear();
    this.cachedTools.clear();
    this.debugMessages = [];
    this.infoMessages = [];
    this.warningMessages = [];
    this.errorMessages = [];
    this.execCalls = [];
    this.result = undefined;
  }

  /**
   * Get all outputs
   */
  getOutputs(): Map<string, string> {
    return new Map(this.outputs);
  }

  /**
   * Check if value is marked as secret
   */
  isSecret(value: string): boolean {
    return this.secrets.has(value);
  }
}
