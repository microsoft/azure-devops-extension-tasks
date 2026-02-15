import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { unpublishExtension } from '../commands/unpublish.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import type { AuthCredentials } from '../auth.js';

describe('unpublishExtension', () => {
  let platform: MockPlatformAdapter;
  let tfxManager: TfxManager;
  let patAuth: AuthCredentials;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
    platform.registerTool('tfx', '/usr/bin/tfx');
    tfxManager = new TfxManager({ tfxVersion: 'built-in', platform });
    patAuth = {
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'test-token',
    };
  });

  it('unpublishes extension using PAT auth', async () => {
    const executeSpy = jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    const result = await unpublishExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      patAuth,
      tfxManager,
      platform
    );

    expect(result.success).toBe(true);
    expect(result.publisherId).toBe('pub');
    expect(result.extensionId).toBe('ext');

    const callArgs = executeSpy.mock.calls[0][0];
    expect(callArgs).toContain('extension');
    expect(callArgs).toContain('unpublish');
    expect(callArgs).toContain('--publisher');
    expect(callArgs).toContain('pub');
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('ext');
    expect(callArgs).toContain('--auth-type');
    expect(callArgs).toContain('pat');
    expect(callArgs).toContain('--token');
    expect(platform.isSecret('test-token')).toBe(true);
  });

  it('uses extension ID and basic authentication', async () => {
    const executeSpy = jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    await unpublishExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      {
        authType: 'basic',
        serviceUrl: 'https://marketplace.visualstudio.com',
        username: 'user',
        password: 'pass',
      },
      tfxManager,
      platform
    );

    const callArgs = executeSpy.mock.calls[0][0];
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('ext');
    expect(callArgs).toContain('--auth-type');
    expect(callArgs).toContain('basic');
    expect(callArgs).toContain('--username');
    expect(callArgs).toContain('user');
    expect(callArgs).toContain('--password');
    expect(callArgs).toContain('pass');
    expect(platform.isSecret('pass')).toBe(true);
  });

  it('throws when tfx exits with non-zero code', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 1,
      json: {},
      stdout: '',
      stderr: 'failed',
    });

    await expect(
      unpublishExtension(
        {
          publisherId: 'pub',
          extensionId: 'ext',
        },
        patAuth,
        tfxManager,
        platform
      )
    ).rejects.toThrow('tfx extension unpublish failed with exit code 1');
  });
});
