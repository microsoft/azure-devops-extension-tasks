import { describe, it, expect } from '@jest/globals';
import { TaskResult } from '../platform.js';

describe('platform exports', () => {
  it('exports runtime TaskResult enum values', () => {
    expect(TaskResult.Succeeded).toBe(0);
    expect(TaskResult.Failed).toBe(1);
    expect(TaskResult.Warning).toBe(2);
  });
});
