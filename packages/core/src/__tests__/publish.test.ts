import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import yazl from 'yazl';
import type { AuthCredentials } from '../auth.js';
import type { PublishOptions } from '../commands/publish.js';
import { publishExtension } from '../commands/publish.js';
import { ManifestEditor } from '../manifest-editor.js';
import { TfxManager } from '../tfx-manager.js';
import { VsixReader } from '../vsix-reader.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('publishExtension', () => {
  let platform: MockPlatformAdapter;
  let tfxManager: TfxManager;
  let auth: AuthCredentials;
  let testRootFolder: string;

  const withManifestDefaults = (options: Partial<PublishOptions> = {}): PublishOptions => ({
    publishSource: 'manifest' as const,
    rootFolder: options.rootFolder ?? testRootFolder,
    manifestGlobs: options.manifestGlobs ?? ['vss-extension.json'],
    ...options,
  });

  beforeEach(async () => {
    platform = new MockPlatformAdapter();
    platform.registerTool('tfx', '/usr/bin/tfx');
    tfxManager = new TfxManager({ tfxVersion: 'built-in', platform });
    auth = {
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'test-token-123',
    };

    testRootFolder = await fs.mkdtemp(join(tmpdir(), 'publish-cmd-default-root-'));
    await fs.writeFile(
      join(testRootFolder, 'vss-extension.json'),
      JSON.stringify({ id: 'ext', publisher: 'pub', version: '1.0.0', files: [] }),
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(testRootFolder, { recursive: true, force: true });
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

      const result = await publishExtension(withManifestDefaults(), auth, tfxManager, platform);

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

    it('should return packaged vsix path when publishing from manifest', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: {
          published: true,
          packaged: '/out/generated-manifest.vsix',
        },
        stdout: '',
        stderr: '',
      });

      const result = await publishExtension(withManifestDefaults(), auth, tfxManager, platform);

      expect(result.vsixPath).toBe('/out/generated-manifest.vsix');
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

      await publishExtension(withManifestDefaults(), basicAuth, tfxManager, platform);

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

      const rootFolder = await fs.mkdtemp(join(tmpdir(), 'publish-manifest-options-'));
      await fs.writeFile(
        join(rootFolder, 'vss-extension.json'),
        JSON.stringify(
          {
            manifestVersion: 1,
            id: 'test-extension',
            publisher: 'test-publisher',
            version: '1.0.0',
            name: 'Test Extension',
            files: [],
          },
          null,
          2
        )
      );

      try {
        await publishExtension(
          withManifestDefaults({
            rootFolder,
            manifestGlobs: ['vss-extension.json'],
            publisherId: 'pub',
            extensionId: 'ext',
            extensionVersion: '2.0.0',
          }),
          auth,
          tfxManager,
          platform
        );
      } finally {
        await fs.rm(rootFolder, { recursive: true, force: true });
      }

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--root');
      expect(callArgs).toContain(rootFolder);
      expect(callArgs).toContain('--manifest-globs');
      expect(callArgs).toContain('vss-extension.json');
      expect(callArgs).toContain('--publisher');
      expect(callArgs).toContain('pub');
      expect(callArgs).toContain('--extension-id');
      expect(callArgs).toContain('ext');
      expect(callArgs).toContain('--extension-version');
      expect(callArgs).toContain('2.0.0');
    });

    it('should apply extension ID override', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension(
        withManifestDefaults({
          extensionId: 'my-ext',
        }),
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--extension-id');
      expect(callArgs).toContain('my-ext');
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

    it('should handle minimal vsix publish payload without metadata', async () => {
      platform.setFileContent('/path/to/extension.vsix', 'mock vsix content');

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: {
          packaged: null,
          published: true,
          shared: null,
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
    });

    it('should read and log version from a real vsix when publish payload has no metadata', async () => {
      const tempDir = await fs.mkdtemp(join(tmpdir(), 'publish-real-vsix-'));
      const vsixPath = join(tempDir, 'workflow-test.vsix');

      const zipFile = new yazl.ZipFile();
      zipFile.addBuffer(
        Buffer.from(
          JSON.stringify(
            {
              manifestVersion: 1,
              id: 'workflow-test',
              publisher: 'jessehouwing',
              version: '0.1.3',
              name: 'Workflow Test',
              files: [],
            },
            null,
            2
          )
        ),
        'vss-extension.json'
      );

      await new Promise<void>((resolve, reject) => {
        zipFile.outputStream
          .pipe(createWriteStream(vsixPath))
          .on('finish', resolve)
          .on('error', reject);
        zipFile.end();
      });

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: {
          packaged: null,
          published: true,
          shared: null,
        },
        stdout: '',
        stderr: '',
      });

      try {
        const result = await publishExtension(
          {
            publishSource: 'vsix',
            vsixFile: vsixPath,
          },
          auth,
          tfxManager,
          platform
        );

        expect(result.extensionId).toBe('workflow-test');
        expect(result.extensionVersion).toBe('0.1.3');
        expect(result.publisherId).toBe('jessehouwing');
        expect(
          platform.infoMessages.some((message) =>
            message.includes('Published extension: workflow-test v0.1.3')
          )
        ).toBe(true);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
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
        withManifestDefaults({
          shareWith: ['org1', 'org2'],
          extensionVisibility: 'private',
        }),
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
        withManifestDefaults({
          shareWith: ['org1'],
          extensionVisibility: 'public',
        }),
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
        withManifestDefaults({
          noWaitValidation: true,
        }),
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
        withManifestDefaults({
          bypassValidation: true,
        }),
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
        publishExtension(withManifestDefaults(), auth, tfxManager, platform)
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
        publishExtension(withManifestDefaults(), auth, tfxManager, platform)
      ).rejects.toThrow('tfx did not return expected JSON output');
    });
  });

  it('should update manifest tasks before publishing when requested', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'publish-cmd-'));
    const taskDir = join(root, 'task1');
    await fs.mkdir(taskDir, { recursive: true });

    await fs.writeFile(
      join(root, 'vss-extension.json'),
      JSON.stringify({
        id: 'ext',
        publisher: 'pub',
        version: '1.0.0',
        files: [{ path: 'task1' }],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'task1' },
          },
        ],
      }),
      'utf-8'
    );

    await fs.writeFile(
      join(taskDir, 'task.json'),
      JSON.stringify({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'task1',
        friendlyName: 'Task 1',
        description: 'desc',
        version: { Major: 1, Minor: 0, Patch: 0 },
        instanceNameFormat: 'Task 1',
      }),
      'utf-8'
    );

    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { published: true, packaged: '/out/ext.vsix' },
      stdout: '',
      stderr: '',
    });

    await publishExtension(
      withManifestDefaults({
        rootFolder: root,
        manifestGlobs: ['vss-extension.json'],
        extensionVersion: '2.0.0',
        updateTasksVersion: true,
      }),
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--overrides-file');
    expect(platform.infoMessages).toContain('Updating task manifests before publishing...');
    expect(platform.infoMessages).toContain('Task manifests updated successfully');
  });

  it('should modify vsix before publishing when overrides are provided', async () => {
    const tempDir = await fs.mkdtemp(join(tmpdir(), 'publish-vsix-'));
    const originalGetTempDir = platform.getTempDir.bind(platform);
    platform.getTempDir = () => tempDir;

    platform.setFileContent('/path/to/extension.vsix', 'mock vsix content');

    const writeToFileMock = jest.fn(async () => undefined);
    const writerCloseMock = jest.fn(async () => undefined);
    const readerCloseMock = jest.fn(async () => undefined);
    const applyOptionsMock = jest.fn(async () => undefined);
    const toWriterMock = jest.fn(async () => ({
      writeToFile: writeToFileMock,
      close: writerCloseMock,
    }));

    const vsixOpenSpy = jest.spyOn(VsixReader, 'open').mockResolvedValue({
      close: readerCloseMock,
    } as any);

    const fromReaderSpy = jest.spyOn(ManifestEditor, 'fromReader').mockReturnValue({
      applyOptions: applyOptionsMock,
      toWriter: toWriterMock,
    } as any);

    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { published: true, id: 'my-extension', version: '1.0.0', publisher: 'my-publisher' },
      stdout: '',
      stderr: '',
    });

    const result = await publishExtension(
      {
        publishSource: 'vsix',
        vsixFile: '/path/to/extension.vsix',
        extensionVersion: '2.0.0',
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    const vsixArgIndex = callArgs.indexOf('--vsix');
    expect(vsixArgIndex).toBeGreaterThan(-1);
    expect(callArgs[vsixArgIndex + 1]).toContain('temp-');
    expect(result.vsixPath).toBe(callArgs[vsixArgIndex + 1]);
    expect(writeToFileMock).toHaveBeenCalled();
    expect(writerCloseMock).toHaveBeenCalled();
    expect(readerCloseMock).toHaveBeenCalled();

    vsixOpenSpy.mockRestore();
    fromReaderSpy.mockRestore();
    platform.getTempDir = originalGetTempDir;
  });
});
