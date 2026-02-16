/**
 * Platform abstraction layer interface
 * This interface abstracts ALL platform-specific operations
 */

export enum TaskResult {
  Succeeded = 0,
  Failed = 1,
  Warning = 2,
}

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  silent?: boolean;
  ignoreReturnCode?: boolean;
  outStream?: NodeJS.WritableStream;
  errStream?: NodeJS.WritableStream;
  failOnStdErr?: boolean;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Platform adapter interface
 * Implementations provide platform-specific functionality for Azure Pipelines or GitHub Actions
 */
export interface IPlatformAdapter {
  // ===== Input =====
  getInput(name: string, required?: boolean): string | undefined;
  getBoolInput(name: string, required?: boolean): boolean;
  getDelimitedInput(name: string, delimiter: string, required?: boolean): string[];

  // ===== Output =====
  setOutput(name: string, value: string): void;
  setResult(result: TaskResult, message: string): void;
  setVariable(name: string, value: string, isSecret?: boolean, isOutput?: boolean): void;
  setSecret(value: string): void;

  // ===== Logging =====
  debug(message: string): void;
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  isDebugEnabled(): boolean;

  // ===== Execution =====
  which(tool: string, check?: boolean): Promise<string>;
  exec(tool: string, args: string[], options?: ExecOptions): Promise<number>;

  // ===== Filesystem =====
  findMatch(root: string, patterns: string[]): Promise<string[]>;
  fileExists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdirP(path: string): Promise<void>;
  rmRF(path: string): Promise<void>;

  // ===== Environment =====
  getVariable(name: string): string | undefined;
  getTempDir(): string;

  // ===== Tool Management =====
  cacheDir(sourceDir: string, tool: string, version: string): Promise<string>;
  findCachedTool(tool: string, version: string): string | undefined;
  downloadTool(url: string): Promise<string>;
}
