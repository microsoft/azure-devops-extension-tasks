import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { publishExtension } from '../commands/publish.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import type { AuthCredentials } from '../auth.js';

describe('publishExtension', () => {
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
      token: 'test-token-123',
    };
  });

  describe('manifest publishing', () => {
    it('should publish from manifest with PAT auth', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: {
          published: true,
          packaged: '/output/extension.vsix',
          id: 'my-extension',
          version: '1.0.0',
          publisher: 'my-publisher',
        },
        stdout: '',
        stderr: '',
      });

      const result = await publishExtension(
        { publishSource: 'manifest' },
        auth,
        tfxManager,
        platform
      );

      expect(result.published).toBe(true);
      expect(result.vsixPath).toBe('/output/extension.vsix');
      expect(result.extensionId).toBe('my-extension');

      // Check auth args
      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--auth-type');
      expect(callArgs).toContain('pat');
      expect(callArgs).toContain('--token');
      expect(callArgs).toContain('test-token-123');

      // Check token was marked secret
      expect(platform.isSecret('test-token-123')).toBe(true);
    });

    it('should publish from manifest with basic auth', async () => {
      const basicAuth: AuthCredentials = {
        authType: 'basic',
        serviceUrl: 'https://marketplace.visualstudio.com',
        username: 'user',
        password: 'pass',
      };

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension({ publishSource: 'manifest' }, basicAuth, tfxManager, platform);

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--auth-type');
      expect(callArgs).toContain('basic');
      expect(callArgs).toContain('--username');
      expect(callArgs).toContain('user');
      expect(callArgs).toContain('--password');
      expect(callArgs).toContain('pass');

      // Check password was marked secret
      expect(platform.isSecret('pass')).toBe(true);
    });

    it('should include manifest options', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension(
        {
          publishSource: 'manifest',
          rootFolder: '/project',
          manifestGlobs: ['vss-extension.json'],
          publisherId: 'pub',
          extensionId: 'ext',
          extensionVersion: '2.0.0',
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
      expect(callArgs).toContain('--publisher');
      expect(callArgs).toContain('pub');
      expect(callArgs).toContain('--extension-id');
      expect(callArgs).toContain('ext');
      expect(callArgs).toContain('--extension-version');
      expect(callArgs).toContain('2.0.0');
    });

    it('should apply extension tag', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension(
        {
          publishSource: 'manifest',
          extensionId: 'my-ext',
          extensionTag: '-dev',
        },
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--extension-id');
      expect(callArgs).toContain('my-ext-dev');
    });
  });

  describe('vsix publishing', () => {
    it('should publish from vsix file', async () => {
      platform.setFileContent('/path/to/extension.vsix', 'mock vsix content');

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: {
          published: true,
          id: 'my-extension',
          version: '1.0.0',
          publisher: 'my-publisher',
        },
        stdout: '',
        stderr: '',
      });

      const result = await publishExtension(
        {
          publishSource: 'vsix',
          vsixFile: '/path/to/extension.vsix',
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.published).toBe(true);
      expect(result.vsixPath).toBe('/path/to/extension.vsix');

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--vsix');
      expect(callArgs).toContain('/path/to/extension.vsix');
    });

    it('should throw if vsixFile not specified', async () => {
      await expect(
        publishExtension({ publishSource: 'vsix' }, auth, tfxManager, platform)
      ).rejects.toThrow('vsixFile is required');
    });

    it('should throw if vsixFile does not exist', async () => {
      await expect(
        publishExtension(
          {
            publishSource: 'vsix',
            vsixFile: '/nonexistent/file.vsix',
          },
          auth,
          tfxManager,
          platform
        )
      ).rejects.toThrow('VSIX file not found');
    });
  });

  describe('sharing', () => {
    it('should share with specified organizations', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension(
        {
          publishSource: 'manifest',
          shareWith: ['org1', 'org2'],
          extensionVisibility: 'private',
        },
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--share-with');
      expect(callArgs).toContain('org1');
      expect(callArgs).toContain('org2');
    });

    it('should not share public extensions', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension(
        {
          publishSource: 'manifest',
          shareWith: ['org1'],
          extensionVisibility: 'public',
        },
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).not.toContain('--share-with');
      expect(platform.warningMessages.some((m) => m.includes('public extensions'))).toBe(true);
    });
  });

  describe('flags', () => {
    it('should include no-wait-validation flag', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension(
        {
          publishSource: 'manifest',
          noWaitValidation: true,
        },
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--no-wait-validation');
    });

    it('should include bypass-validation flag', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension(
        {
          publishSource: 'manifest',
          bypassValidation: true,
        },
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--bypass-validation');
    });
  });

  describe('error handling', () => {
    it('should throw on non-zero exit code', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Error',
      });

      await expect(
        publishExtension({ publishSource: 'manifest' }, auth, tfxManager, platform)
      ).rejects.toThrow('tfx extension publish failed with exit code 1');
    });

    it('should throw if JSON missing published status', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { id: 'test' }, // Missing published
        stdout: '',
        stderr: '',
      });

      await expect(
        publishExtension({ publishSource: 'manifest' }, auth, tfxManager, platform)
      ).rejects.toThrow('tfx did not return expected JSON output');
    });
  });

  it('should set output variable when specified', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { published: true, packaged: '/out/ext.vsix' },
      stdout: '',
      stderr: '',
    });

    await publishExtension(
      {
        publishSource: 'manifest',
        outputVariable: 'PUBLISHED_VSIX',
      },
      auth,
      tfxManager,
      platform
    );

    const outputs = platform.getOutputs();
    expect(outputs.get('PUBLISHED_VSIX')).toBe('/out/ext.vsix');
  });
});
