import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createWriteStream, promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import yazl from 'yazl';
import type { AuthCredentials } from '../auth.js';
import type { PublishOptions } from '../commands/publish.js';
import { publishExtension } from '../commands/publish.js';
import { ManifestEditor } from '../manifest-editor.js';
import { TfxManager } from '../tfx-manager.js';
import { VsixReader } from '../vsix-reader.js';
import { createManifestTaskFixture } from './helpers/create-manifest-task-fixture.js';
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
      expect(result.vsixFile).toBe('/output/extension.vsix');
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

      expect(result.vsixFile).toBe('/out/generated-manifest.vsix');
    });

    it('should copy packaged vsix to outputPath when publishing from manifest', async () => {
      const publishDir = await fs.mkdtemp(join(tmpdir(), 'publish-manifest-output-'));
      const packagedPath = join(publishDir, 'generated-manifest.vsix');
      const outputPath = join(publishDir, 'out');

      await fs.writeFile(packagedPath, 'manifest-published-vsix', 'utf-8');

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: {
          published: true,
          packaged: packagedPath,
        },
        stdout: '',
        stderr: '',
      });

      try {
        const result = await publishExtension(
          withManifestDefaults({ outputPath }),
          auth,
          tfxManager,
          platform
        );

        const expectedPath = join(outputPath, 'generated-manifest.vsix');
        expect(result.vsixFile).toBe(expectedPath);
        const copied = await fs.readFile(expectedPath, 'utf-8');
        expect(copied).toBe('manifest-published-vsix');
      } finally {
        await fs.rm(publishDir, { recursive: true, force: true });
      }
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

    it('should include manifest-js argument for manifest publish', async () => {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      await publishExtension(
        withManifestDefaults({ manifestFileJs: 'manifests/build-manifest.js' }),
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--manifest-js');
      expect(callArgs).toContain('manifests/build-manifest.js');
    });

    it('should merge generated overrides into provided overrides file for manifest publish', async () => {
      const fixture = await createManifestTaskFixture({
        prefix: 'publish-overrides-merge-',
        createTask: false,
      });
      const overridesPath = join(fixture.root, 'overrides.json');
      await fs.writeFile(
        overridesPath,
        JSON.stringify({ description: 'keep-me' }, null, 2),
        'utf-8'
      );

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { published: true, packaged: '/out/ext.vsix' },
        stdout: '',
        stderr: '',
      });

      try {
        await publishExtension(
          withManifestDefaults({
            rootFolder: fixture.root,
            manifestGlobs: ['vss-extension.json'],
            extensionVersion: '2.0.0',
            overridesFile: overridesPath,
          }),
          auth,
          tfxManager,
          platform
        );

        const callArgs = mockExecute.mock.calls[0][0];
        const overridesFlagIndex = callArgs.lastIndexOf('--overrides-file');
        expect(overridesFlagIndex).toBeGreaterThan(-1);
        expect(callArgs[overridesFlagIndex + 1]).toBe(overridesPath);

        const mergedOverrides = JSON.parse((await fs.readFile(overridesPath)).toString('utf8')) as {
          description?: string;
          version?: string;
        };
        expect(mergedOverrides.description).toBe('keep-me');
        expect(mergedOverrides.version).toBe('2.0.0');
      } finally {
        await fixture.cleanup();
      }
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
      expect(result.vsixFile).toBe('/path/to/extension.vsix');

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
      expect(result.vsixFile).toBe('/path/to/extension.vsix');
    });

    it('should copy published vsix to outputPath when publishing from vsix', async () => {
      const publishDir = await fs.mkdtemp(join(tmpdir(), 'publish-vsix-output-'));
      const vsixFile = join(publishDir, 'input.vsix');
      const outputPath = join(publishDir, 'out');

      await fs.writeFile(vsixFile, 'vsix-content', 'utf-8');

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: {
          published: true,
        },
        stdout: '',
        stderr: '',
      });

      try {
        const result = await publishExtension(
          {
            publishSource: 'vsix',
            vsixFile,
            outputPath,
          },
          auth,
          tfxManager,
          platform
        );

        const expectedPath = join(outputPath, 'input.vsix');
        expect(result.vsixFile).toBe(expectedPath);
        const copied = await fs.readFile(expectedPath, 'utf-8');
        expect(copied).toBe('vsix-content');
      } finally {
        await fs.rm(publishDir, { recursive: true, force: true });
      }
    });

    it('should read and log version from a real vsix when publish payload has no metadata', async () => {
      const tempDir = await fs.mkdtemp(join(tmpdir(), 'publish-real-vsix-'));
      const vsixFile = join(tempDir, 'workflow-test.vsix');

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
          .pipe(createWriteStream(vsixFile) as unknown as NodeJS.WritableStream)
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
            vsixFile: vsixFile,
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
    const fixture = await createManifestTaskFixture({ prefix: 'publish-manifest-update-' });

    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { published: true, packaged: '/out/ext.vsix' },
      stdout: '',
      stderr: '',
    });

    try {
      await publishExtension(
        withManifestDefaults({
          rootFolder: fixture.root,
          manifestGlobs: ['vss-extension.json'],
          extensionVersion: '2.0.0',
          updateTasksVersion: 'major',
        }),
        auth,
        tfxManager,
        platform
      );
    } finally {
      await fixture.cleanup();
    }

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
    expect(result.vsixFile).toBe(callArgs[vsixArgIndex + 1]);
    expect(writeToFileMock).toHaveBeenCalled();
    expect(writerCloseMock).toHaveBeenCalled();
    expect(readerCloseMock).toHaveBeenCalled();

    vsixOpenSpy.mockRestore();
    fromReaderSpy.mockRestore();
    platform.getTempDir = originalGetTempDir;
  });
});
