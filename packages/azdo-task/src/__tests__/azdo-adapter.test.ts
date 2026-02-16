import { TaskResult } from '@extension-tasks/core';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AzdoAdapter } from '../azdo-adapter.js';

describe('AzdoAdapter', () => {
  let adapter: AzdoAdapter;
  let originalInputMyInput: string | undefined;
  let originalInputMyFlag: string | undefined;
  let originalInputItems: string | undefined;
  let originalToken: string | undefined;
  let originalSystemDebug: string | undefined;

  beforeEach(() => {
    adapter = new AzdoAdapter();
    originalInputMyInput = process.env.INPUT_MYINPUT;
    originalInputMyFlag = process.env.INPUT_MYFLAG;
    originalInputItems = process.env.INPUT_ITEMS;
    originalToken = process.env.TOKEN;
    originalSystemDebug = process.env.SYSTEM_DEBUG;
  });

  afterEach(() => {
    process.env.INPUT_MYINPUT = originalInputMyInput;
    process.env.INPUT_MYFLAG = originalInputMyFlag;
    process.env.INPUT_ITEMS = originalInputItems;
    process.env.TOKEN = originalToken;
    process.env.SYSTEM_DEBUG = originalSystemDebug;
  });

  it('detects debug mode from system.debug variable', () => {
    process.env.SYSTEM_DEBUG = 'true';
    expect(adapter.isDebugEnabled()).toBe(true);

    process.env.SYSTEM_DEBUG = 'false';
    expect(adapter.isDebugEnabled()).toBe(false);
  });

  it('sets variables through task-lib', () => {
    adapter.setVariable('TOKEN', 'value', false, false);

    expect(process.env.TOKEN).toBe('value');
  });

  it('logs info to console', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    adapter.info('hello');

    expect(spy).toHaveBeenCalledWith('hello');
  });

  it('maps warning setResult without throwing', () => {
    expect(() => adapter.setResult(TaskResult.Warning, 'warning')).not.toThrow();
  });

  it('maps succeeded and failed setResult without throwing', () => {
    expect(() => adapter.setResult(TaskResult.Succeeded, 'ok')).not.toThrow();
    expect(() => adapter.setResult(TaskResult.Failed, 'nope')).not.toThrow();
  });

  it('reads boolean and delimited inputs', () => {
    process.env.INPUT_MYFLAG = 'true';
    process.env.INPUT_ITEMS = 'a,b,c';

    expect(typeof adapter.getBoolInput('myFlag', false)).toBe('boolean');
    expect(Array.isArray(adapter.getDelimitedInput('items', ',', false))).toBe(true);
  });

  it('writes output variables and secrets', () => {
    adapter.setOutput('myOutput', 'value');
    adapter.setSecret('secret-value');
    adapter.debug('debug');
    adapter.warning('warning');
    adapter.error('error');

    expect(process.env.MYOUTPUT).toBe('value');
  });

  it('handles filesystem read/write/mkdir/rm and existence', async () => {
    const baseDir = await fs.mkdtemp(join(tmpdir(), 'azdo-adapter-'));
    const nestedDir = join(baseDir, 'nested');
    const filePath = join(nestedDir, 'file.txt');

    await adapter.mkdirP(nestedDir);
    await adapter.writeFile(filePath, 'hello');

    expect(await adapter.fileExists(filePath)).toBe(true);
    expect(await adapter.readFile(filePath)).toBe('hello');

    await adapter.rmRF(baseDir);
    expect(await adapter.fileExists(filePath)).toBe(false);
  });

  it('reads variables and temp dir value', () => {
    adapter.setVariable('TEST_AZDO_VAR', 'x', false, false);
    process.env.AGENT_TEMPDIRECTORY = tmpdir();

    expect(adapter.getVariable('TEST_AZDO_VAR')).toBe('x');
    expect(adapter.getTempDir()).toBeTruthy();
    delete process.env.TEST_AZDO_VAR;
    delete process.env.AGENT_TEMPDIRECTORY;
  });

  it('returns undefined for missing cached tool', () => {
    process.env.AGENT_TOOLSDIRECTORY = tmpdir();
    expect(adapter.findCachedTool('definitely-missing-tool', '0.0.0')).toBeUndefined();
    delete process.env.AGENT_TOOLSDIRECTORY;
  });

  it('finds node via which', async () => {
    const result = await adapter.which('node', true);

    expect(result).toBeTruthy();
  });

  it('executes node command and returns success code', async () => {
    const code = await adapter.exec(process.execPath, ['-e', "process.stdout.write('ok')"]);

    expect(code).toBe(0);
  });

  it('exec applies env options when provided', async () => {
    await adapter.exec(process.execPath, ['-e', "process.stdout.write('ok')"], {
      env: { ADAPTER_TEST_ENV: 'set-value' },
      ignoreReturnCode: true,
      silent: true,
      failOnStdErr: false,
    });

    expect(process.env.ADAPTER_TEST_ENV).toBe('set-value');
    delete process.env.ADAPTER_TEST_ENV;
  });
});
