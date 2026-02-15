import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Writable } from 'stream';
import { GitHubAdapter } from '../github-adapter.js';
import { TaskResult } from '@extension-tasks/core';

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  let originalInputName: string | undefined;
  let originalInputItems: string | undefined;
  let originalToken: string | undefined;
  let originalExitCode: string | number | undefined;

  beforeEach(() => {
    adapter = new GitHubAdapter();
    originalInputName = process.env.INPUT_NAME;
    originalInputItems = process.env.INPUT_ITEMS;
    originalToken = process.env.TOKEN;
    originalExitCode = process.exitCode;
  });

  afterEach(() => {
    process.env.INPUT_NAME = originalInputName;
    process.env.INPUT_ITEMS = originalInputItems;
    process.env.TOKEN = originalToken;
    process.exitCode = originalExitCode;
  });

  it('reads string input values', () => {
    process.env.INPUT_NAME = 'abc';

    const result = adapter.getInput('name', true);

    expect(result).toBe('abc');
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
});
