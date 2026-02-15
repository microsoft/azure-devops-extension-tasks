import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { isValidExtension } from '../commands/is-valid.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import type { AuthCredentials } from '../auth.js';

describe('isValidExtension', () => {
  let platform: MockPlatformAdapter;
  let tfxManager: TfxManager;
  let auth: AuthCredentials;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
    platform.registerTool('tfx', '/usr/bin/tfx');
    tfxManager = new TfxManager({ version: 'built-in', platform });
    auth = {
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'test-token',
    };
  });

  it('should validate successfully on first attempt', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    const result = await isValidExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(true);
    expect(result.status).toBe('success');
    expect(result.attempts).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('should retry on pending status', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    
    // First two attempts return pending
    mockExecute.mockResolvedValueOnce({
      exitCode: 0,
      json: { status: 'pending' },
      stdout: '',
      stderr: '',
    });
    mockExecute.mockResolvedValueOnce({
      exitCode: 0,
      json: { status: 'pending' },
      stdout: '',
      stderr: '',
    });
    // Third attempt succeeds
    mockExecute.mockResolvedValueOnce({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    const result = await isValidExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        maxRetries: 5,
        minTimeout: 0.001, // Very short for testing
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(true);
    expect(result.status).toBe('success');
    expect(result.attempts).toBe(3);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('should handle failed validation', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 1,
      json: { status: 'failed' },
      stdout: '',
      stderr: '',
    });

    const result = await isValidExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.attempts).toBe(1);
  });

  it('should timeout after max retries', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    // Always return pending
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'pending' },
      stdout: '',
      stderr: '',
    });

    const result = await isValidExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        maxRetries: 3,
        minTimeout: 0.001,
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('pending');
    expect(result.attempts).toBe(3);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('should use correct tfx arguments', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await isValidExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('extension');
    expect(callArgs).toContain('isvalid');
    expect(callArgs).toContain('--publisher');
    expect(callArgs).toContain('pub');
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('ext');
    expect(callArgs).toContain('--json');
  });

  it('should apply extension tag', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await isValidExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        extensionTag: '-dev',
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('ext-dev');
  });

  it('should include manifest arguments when provided', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await isValidExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        rootFolder: '/project',
        manifestGlobs: ['vss-extension.json'],
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--root');
    expect(callArgs).toContain('/project');
    expect(callArgs).toContain('--manifest-globs');
    expect(callArgs).toContain('vss-extension.json');
  });

  it('should handle authentication', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await isValidExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--auth-type');
    expect(callArgs).toContain('pat');
    expect(platform.isSecret('test-token')).toBe(true);
  });
});
