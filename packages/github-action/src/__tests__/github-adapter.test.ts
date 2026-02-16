import { TaskResult } from '@extension-tasks/core';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Writable } from 'stream';
import { GitHubAdapter } from '../github-adapter.js';

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  let originalInputName: string | undefined;
  let originalInputItems: string | undefined;
  let originalInputBypassValidation: string | undefined;
  let originalToken: string | undefined;
  let originalExitCode: string | number | undefined;
  let originalActionsStepDebug: string | undefined;
  let originalActionsRunnerDebug: string | undefined;

  beforeEach(() => {
    adapter = new GitHubAdapter();
    originalInputName = process.env.INPUT_NAME;
    originalInputItems = process.env.INPUT_ITEMS;
    originalInputBypassValidation = process.env['INPUT_BYPASS-VALIDATION'];
    originalToken = process.env.TOKEN;
    originalExitCode = process.exitCode;
    originalActionsStepDebug = process.env.ACTIONS_STEP_DEBUG;
    originalActionsRunnerDebug = process.env.ACTIONS_RUNNER_DEBUG;
  });

  afterEach(() => {
    process.env.INPUT_NAME = originalInputName;
    process.env.INPUT_ITEMS = originalInputItems;
    process.env['INPUT_BYPASS-VALIDATION'] = originalInputBypassValidation;
    process.env.TOKEN = originalToken;
    process.exitCode = originalExitCode;
    process.env.ACTIONS_STEP_DEBUG = originalActionsStepDebug;
    process.env.ACTIONS_RUNNER_DEBUG = originalActionsRunnerDebug;
  });

  it('detects debug mode from GitHub debug environment variables', () => {
    process.env.ACTIONS_STEP_DEBUG = 'true';
    process.env.ACTIONS_RUNNER_DEBUG = 'false';
    expect(adapter.isDebugEnabled()).toBe(true);

    process.env.ACTIONS_STEP_DEBUG = 'false';
    process.env.ACTIONS_RUNNER_DEBUG = 'true';
    expect(adapter.isDebugEnabled()).toBe(true);

    process.env.ACTIONS_STEP_DEBUG = 'false';
    process.env.ACTIONS_RUNNER_DEBUG = 'false';
    expect(adapter.isDebugEnabled()).toBe(false);
  });

  it('reads string input values', () => {
    process.env.INPUT_NAME = 'abc';

    const result = adapter.getInput('name', true);

    expect(result).toBe('abc');
  });

  it('returns false for optional boolean input when not set', () => {
    delete process.env['INPUT_BYPASS-VALIDATION'];

    const result = adapter.getBoolInput('bypass-validation', false);

    expect(result).toBe(false);
  });

  it('returns false for optional boolean input when empty string is provided', () => {
    process.env['INPUT_BYPASS-VALIDATION'] = '';

    const result = adapter.getBoolInput('bypass-validation', false);

    expect(result).toBe(false);
  });

  it('throws for invalid boolean input values', () => {
    process.env['INPUT_BYPASS-VALIDATION'] = 'not-a-bool';

    expect(() => adapter.getBoolInput('bypass-validation', false)).toThrow(
      /Core Schema|boolean input list/
    );
  });

  it('throws when required boolean input is undefined', () => {
    delete process.env['INPUT_BYPASS-VALIDATION'];

    expect(() => adapter.getBoolInput('bypass-validation', true)).toThrow(
      /Input required and not supplied/
    );
  });

  it('throws when required boolean input is empty', () => {
    process.env['INPUT_BYPASS-VALIDATION'] = '';

    expect(() => adapter.getBoolInput('bypass-validation', true)).toThrow(
      /Input required and not supplied/
    );
  });

  it('parses delimited input values', () => {
    process.env.INPUT_ITEMS = 'a, b, c';

    const result = adapter.getDelimitedInput('items', ',', true);

    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('exports non-output variables to environment', () => {
    adapter.setVariable('TOKEN', 'value', false, false);

    expect(process.env.TOKEN).toBe('value');
  });

  it('sets failed result via process exit code', () => {
    adapter.setResult(TaskResult.Failed, 'failed');

    expect(process.exitCode).toBe(1);
  });

  it('sets succeeded and warning results without throwing', () => {
    expect(() => adapter.setResult(TaskResult.Succeeded, 'ok')).not.toThrow();
    expect(() => adapter.setResult(TaskResult.Warning, 'warn')).not.toThrow();
  });

  it('returns empty delimited input when not set', () => {
    delete process.env.INPUT_ITEMS;
    expect(adapter.getDelimitedInput('items', ',', false)).toEqual([]);
  });

  it('handles setVariable secret and output modes', () => {
    adapter.setVariable('SECRET_VAR', 'secret', true, false);
    adapter.setVariable('OUTPUT_VAR', 'output', false, true);

    expect(process.env.SECRET_VAR).toBe('secret');
  });

  it('findMatch returns matching files for glob patterns', async () => {
    const baseDir = await fs.mkdtemp(join(tmpdir(), 'github-adapter-findmatch-'));
    const nestedDir = join(baseDir, 'nested');
    const tsFile = join(nestedDir, 'sample.ts');
    const txtFile = join(nestedDir, 'sample.txt');

    await fs.mkdir(nestedDir, { recursive: true });
    await fs.writeFile(tsFile, 'export const sample = 1;', 'utf-8');
    await fs.writeFile(txtFile, 'sample', 'utf-8');

    const result = await adapter.findMatch(baseDir, ['**/*.ts']);

    expect(result).toContain(tsFile);
    expect(result).not.toContain(txtFile);

    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('handles filesystem read/write/mkdir/rm and existence', async () => {
    const baseDir = await fs.mkdtemp(join(tmpdir(), 'github-adapter-'));
    const nestedDir = join(baseDir, 'nested');
    const filePath = join(nestedDir, 'file.txt');

    await adapter.mkdirP(nestedDir);
    await adapter.writeFile(filePath, 'hello');

    expect(await adapter.fileExists(filePath)).toBe(true);
    expect(await adapter.readFile(filePath)).toBe('hello');

    await adapter.rmRF(baseDir);
    expect(await adapter.fileExists(filePath)).toBe(false);
  });

  it('reads env variables and temp directory fallback', () => {
    process.env.TEST_GH_VAR = 'x';
    const originalRunnerTemp = process.env.RUNNER_TEMP;
    delete process.env.RUNNER_TEMP;

    expect(adapter.getVariable('TEST_GH_VAR')).toBe('x');
    expect(adapter.getTempDir()).toBeTruthy();

    process.env.RUNNER_TEMP = originalRunnerTemp;
    delete process.env.TEST_GH_VAR;
  });

  it('returns undefined for missing cached tool', () => {
    process.env.RUNNER_TOOL_CACHE = tmpdir();
    expect(adapter.findCachedTool('definitely-missing-tool', '0.0.0')).toBeUndefined();
    delete process.env.RUNNER_TOOL_CACHE;
  });

  it('resolves existing tools through which', async () => {
    const result = await adapter.which('node', true);

    expect(result).toBeTruthy();
  });

  it('exec writes stdout to outStream and returns code', async () => {
    let captured = '';
    const outStream = new Writable({
      write(chunk, _encoding, callback) {
        captured += chunk.toString();
        callback();
      },
    });

    const code = await adapter.exec(process.execPath, ['-e', "process.stdout.write('ok')"], {
      outStream,
    });

    expect(code).toBe(0);
    expect(captured).toContain('ok');
  });

  it('exec throws when failOnStdErr is true and stderr is written', async () => {
    await expect(
      adapter.exec(process.execPath, ['-e', "process.stderr.write('boom')"], {
        failOnStdErr: true,
        ignoreReturnCode: true,
      })
    ).rejects.toThrow('Command failed with stderr: boom');
  });
});
