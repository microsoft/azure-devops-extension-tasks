import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { installExtension } from '../commands/install.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import type { AuthCredentials } from '../auth.js';

describe('installExtension', () => {
  let platform: MockPlatformAdapter;
  let tfxManager: TfxManager;
  let auth: AuthCredentials;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
    platform.registerTool('tfx', '/usr/bin/tfx');
    tfxManager = new TfxManager({ tfxVersion: 'built-in', platform });
    auth = {
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'test-token',
    };
  });

  it('should install to single account successfully', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    const result = await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.allSuccess).toBe(true);
    expect(result.accountResults).toHaveLength(1);
    expect(result.accountResults[0].success).toBe(true);
    expect(result.accountResults[0].alreadyInstalled).toBe(false);
  });

  it('should install to multiple accounts', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    const result = await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: [
          'https://dev.azure.com/org1',
          'https://dev.azure.com/org2',
          'https://dev.azure.com/org3',
        ],
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.allSuccess).toBe(true);
    expect(result.accountResults).toHaveLength(3);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('should handle already installed extension', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 1,
      json: {},
      stdout: '',
      stderr: 'error: Error: TF1590010: Extension already installed',
    });

    const result = await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.allSuccess).toBe(true);
    expect(result.accountResults[0].success).toBe(true);
    expect(result.accountResults[0].alreadyInstalled).toBe(true);
    expect(platform.warningMessages.some((m) => m.includes('already installed'))).toBe(true);
  });

  it('should handle mixed success/failure across accounts', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');

    // First account succeeds
    mockExecute.mockResolvedValueOnce({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    // Second account fails
    mockExecute.mockResolvedValueOnce({
      exitCode: 1,
      json: {},
      stdout: '',
      stderr: 'error: Some other error',
    });

    const result = await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1', 'https://dev.azure.com/org2'],
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.allSuccess).toBe(false);
    expect(result.accountResults[0].success).toBe(true);
    expect(result.accountResults[1].success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('should apply extension tag', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        extensionTag: '-dev',
        accounts: ['https://dev.azure.com/org1'],
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('ext-dev');
  });

  it('should include version if specified', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        extensionVersion: '1.2.3',
        accounts: ['https://dev.azure.com/org1'],
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--extension-version');
    expect(callArgs).toContain('1.2.3');
  });

  it('should use PAT authentication', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--auth-type');
    expect(callArgs).toContain('pat');
    expect(callArgs).toContain('--token');
    expect(platform.isSecret('test-token')).toBe(true);
  });

  it('should throw if no accounts specified', async () => {
    await expect(
      installExtension(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          accounts: [],
        },
        auth,
        tfxManager,
        platform
      )
    ).rejects.toThrow('accounts must contain at least one');
  });

  it('should set service-url for each account', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1', 'https://dev.azure.com/org2'],
      },
      auth,
      tfxManager,
      platform
    );

    const call1Args = mockExecute.mock.calls[0][0];
    const call2Args = mockExecute.mock.calls[1][0];

    expect(call1Args).toContain('https://dev.azure.com/org1');
    expect(call2Args).toContain('https://dev.azure.com/org2');
  });

  it('should use basic authentication credentials when auth type is basic', async () => {
    const basicAuth: AuthCredentials = {
      authType: 'basic',
      serviceUrl: 'https://marketplace.visualstudio.com',
      username: 'user',
      password: 'pass',
    };

    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
      },
      basicAuth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--auth-type');
    expect(callArgs).toContain('basic');
    expect(callArgs).toContain('--username');
    expect(callArgs).toContain('user');
    expect(callArgs).toContain('--password');
    expect(callArgs).toContain('pass');
    expect(platform.isSecret('pass')).toBe(true);
  });

  it('should handle execution exception and continue with failed account result', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockRejectedValueOnce(new Error('network failure'));

    const result = await installExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.allSuccess).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.accountResults[0].success).toBe(false);
    expect(result.accountResults[0].error).toContain('network failure');
    expect(platform.errorMessages.some((m) => m.includes('Failed to install'))).toBe(true);
  });
});
