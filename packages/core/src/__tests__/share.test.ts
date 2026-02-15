import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { shareExtension } from '../commands/share.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import type { AuthCredentials } from '../auth.js';

describe('shareExtension', () => {
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

  it('shares extension with organizations using PAT auth', async () => {
    const executeSpy = jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: {},
      stdout: '',
      stderr: '',
    });

    const result = await shareExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        shareWith: ['org1', 'org2'],
      },
      patAuth,
      tfxManager,
      platform
    );

    expect(result.success).toBe(true);
    expect(result.publisherId).toBe('pub');
    expect(result.extensionId).toBe('ext');
    expect(result.sharedWith).toEqual(['org1', 'org2']);

    const callArgs = executeSpy.mock.calls[0][0];
    expect(callArgs).toContain('extension');
    expect(callArgs).toContain('share');
    expect(callArgs).toContain('--share-with');
    expect(callArgs).toContain('org1');
    expect(callArgs).toContain('org2');
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

    await shareExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        shareWith: ['org1'],
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

  it('throws when shareWith is empty', async () => {
    await expect(
      shareExtension(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          shareWith: [],
        },
        patAuth,
        tfxManager,
        platform
      )
    ).rejects.toThrow('shareWith must contain at least one organization');
  });

  it('throws when tfx exits with non-zero code', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 1,
      json: {},
      stdout: '',
      stderr: 'failed',
    });

    await expect(
      shareExtension(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          shareWith: ['org1'],
        },
        patAuth,
        tfxManager,
        platform
      )
    ).rejects.toThrow('tfx extension share failed with exit code 1');
  });
});
