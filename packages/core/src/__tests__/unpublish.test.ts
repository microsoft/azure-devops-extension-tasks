import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AuthCredentials } from '../auth.js';
import { unpublishExtension } from '../commands/unpublish.js';
import { TfxManager } from '../tfx-manager.js';
import { createIdentityVsix } from './helpers/create-test-vsix.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

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

  it('resolves identity from vsixFile', async () => {
    const vsix = await createIdentityVsix({
      publisher: 'publisher-from-vsix',
      extensionId: 'extension-from-vsix',
    });

    try {
      const executeSpy = jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: {},
        stdout: '',
        stderr: '',
      });

      await unpublishExtension(
        {
          vsixFile: vsix.vsixFile,
        },
        patAuth,
        tfxManager,
        platform
      );

      const callArgs = executeSpy.mock.calls[0][0];
      expect(callArgs).toContain('--publisher');
      expect(callArgs).toContain('publisher-from-vsix');
      expect(callArgs).toContain('--extension-id');
      expect(callArgs).toContain('extension-from-vsix');
    } finally {
      await vsix.cleanup();
    }
  });

  it('resolves identity from manifestGlobs', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'unpublish-manifest-'));
    const manifestPath = join(testDir, 'vss-extension.json');
    await writeFile(
      manifestPath,
      JSON.stringify({
        publisher: 'publisher-from-manifest',
        id: 'extension-from-manifest',
        version: '1.0.0',
        name: 'test',
      }),
      'utf-8'
    );

    try {
      const executeSpy = jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: {},
        stdout: '',
        stderr: '',
      });

      await unpublishExtension(
        {
          rootFolder: testDir,
          manifestGlobs: ['vss-extension.json'],
        },
        patAuth,
        tfxManager,
        platform
      );

      const callArgs = executeSpy.mock.calls[0][0];
      expect(callArgs).toContain('--publisher');
      expect(callArgs).toContain('publisher-from-manifest');
      expect(callArgs).toContain('--extension-id');
      expect(callArgs).toContain('extension-from-manifest');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
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
