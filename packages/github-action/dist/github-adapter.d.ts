import { IPlatformAdapter, TaskResult, ExecOptions } from '@extension-tasks/core';
/**
 * GitHub Actions platform adapter
 * Implements IPlatformAdapter using @actions/* packages
 */
export declare class GitHubAdapter implements IPlatformAdapter {
    getInput(name: string, required?: boolean): string | undefined;
    getBoolInput(name: string, required?: boolean): boolean;
    getDelimitedInput(name: string, delimiter: string, required?: boolean): string[];
    setOutput(name: string, value: string): void;
    setResult(result: TaskResult, message: string): void;
    setVariable(name: string, value: string, isSecret?: boolean, isOutput?: boolean): void;
    setSecret(value: string): void;
    debug(message: string): void;
    info(message: string): void;
    warning(message: string): void;
    error(message: string): void;
    which(tool: string, check?: boolean): Promise<string>;
    exec(tool: string, args: string[], options?: ExecOptions): Promise<number>;
    findMatch(root: string, patterns: string[]): Promise<string[]>;
    fileExists(filePath: string): Promise<boolean>;
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    mkdirP(dirPath: string): Promise<void>;
    rmRF(dirPath: string): Promise<void>;
    getVariable(name: string): string | undefined;
    getTempDir(): string;
    cacheDir(sourceDir: string, tool: string, version: string): Promise<string>;
    findCachedTool(tool: string, version: string): string | undefined;
    downloadTool(url: string): Promise<string>;
}
//# sourceMappingURL=github-adapter.d.ts.map