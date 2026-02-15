import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AzdoAdapter } from '../azdo-adapter.js';
import { TaskResult } from '@extension-tasks/core';

describe('AzdoAdapter', () => {
  let adapter: AzdoAdapter;
  let originalInputMyInput: string | undefined;
  let originalInputMyFlag: string | undefined;
  let originalInputItems: string | undefined;
  let originalToken: string | undefined;

  beforeEach(() => {
    adapter = new AzdoAdapter();
    originalInputMyInput = process.env.INPUT_MYINPUT;
    originalInputMyFlag = process.env.INPUT_MYFLAG;
    originalInputItems = process.env.INPUT_ITEMS;
    originalToken = process.env.TOKEN;
  });

  afterEach(() => {
    process.env.INPUT_MYINPUT = originalInputMyInput;
    process.env.INPUT_MYFLAG = originalInputMyFlag;
    process.env.INPUT_ITEMS = originalInputItems;
    process.env.TOKEN = originalToken;
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

  it('finds node via which', async () => {
    const result = await adapter.which('node', true);

    expect(result).toBeTruthy();
  });

  it('executes node command and returns success code', async () => {
    const code = await adapter.exec(process.execPath, ['-e', "process.stdout.write('ok')"]);

    expect(code).toBe(0);
  });
});
