import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { PackageOptions } from '../commands/package.js';
import { packageExtension } from '../commands/package.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('packageExtension', () => {
  let platform: MockPlatformAdapter;
  let tfxManager: TfxManager;
  let testRootFolder: string;

  const withManifestDefaults = (options: PackageOptions = {}): PackageOptions => ({
    rootFolder: options.rootFolder ?? testRootFolder,
    manifestGlobs: options.manifestGlobs ?? ['vss-extension.json'],
    ...options,
  });

  beforeEach(async () => {
    platform = new MockPlatformAdapter();
    platform.registerTool('tfx', '/usr/bin/tfx');
    tfxManager = new TfxManager({ tfxVersion: 'built-in', platform });

    testRootFolder = await fs.mkdtemp(join(tmpdir(), 'package-cmd-default-root-'));
    await fs.writeFile(
      join(testRootFolder, 'vss-extension.json'),
      JSON.stringify({ id: 'ext', publisher: 'pub', version: '1.0.0', files: [] }),
      'utf-8'
    );
  });

  afterEach(async () => {
    await fs.rm(testRootFolder, { recursive: true, force: true });
  });

  it('should package extension with minimal options', async () => {
    // Mock tfx output
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {
        path: '/output/extension.vsix',
        id: 'my-extension',
        version: '1.0.0',
        publisher: 'my-publisher',
      },
      stdout: '',
      stderr: '',
    });

    const result = await packageExtension(withManifestDefaults(), tfxManager, platform);

    expect(result.vsixPath).toBe('/output/extension.vsix');
    expect(result.extensionId).toBe('my-extension');
    expect(result.extensionVersion).toBe('1.0.0');
    expect(result.publisherId).toBe('my-publisher');
    expect(result.exitCode).toBe(0);

    // Check tfx was called with correct args
    expect(mockExecute).toHaveBeenCalledWith(
      expect.arrayContaining(['extension', 'create', '--json', '--no-color']),
      expect.objectContaining({ captureJson: true })
    );
  });

  it('should include root folder in arguments', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'pkg-root-arg-'));
    await fs.writeFile(
      join(root, 'vss-extension.json'),
      JSON.stringify({
        id: 'ext',
        publisher: 'pub',
        version: '1.0.0',
        files: [],
      }),
      'utf-8'
    );

    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    try {
      await packageExtension({ rootFolder: root }, tfxManager, platform);

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--root');
      expect(callArgs).toContain(root);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('should include manifest globs in arguments', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(
      withManifestDefaults({
        manifestGlobs: ['vss-extension.json', '*.json'],
      }),
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--manifest-globs');
    expect(callArgs).toContain('vss-extension.json');
    expect(callArgs).toContain('*.json');
  });

  it('should apply extension ID override', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix', id: 'my-extension' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(
      withManifestDefaults({
        extensionId: 'my-extension',
      }),
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('my-extension');
  });

  it('should include publisher override', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(
      withManifestDefaults({ publisherId: 'custom-publisher' }),
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--publisher');
    expect(callArgs).toContain('custom-publisher');
  });

  it('should include extension version override', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'pkg-version-override-'));
    await fs.writeFile(
      join(root, 'vss-extension.json'),
      JSON.stringify({
        id: 'ext',
        publisher: 'pub',
        version: '1.0.0',
        files: [],
      }),
      'utf-8'
    );

    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix', version: '2.0.0' },
      stdout: '',
      stderr: '',
    });

    try {
      await packageExtension(
        {
          rootFolder: root,
          manifestGlobs: ['vss-extension.json'],
          extensionVersion: '2.0.0',
        },
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--overrides-file');
      expect(callArgs).not.toContain('--extension-version');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('should include output path', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/custom/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(
      withManifestDefaults({ outputPath: '/custom/output' }),
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--output-path');
    expect(callArgs).toContain('/custom/output');
  });

  it('should include bypass validation flag', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(withManifestDefaults({ bypassValidation: true }), tfxManager, platform);

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--bypass-validation');
  });

  it('should include rev-version flag', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(withManifestDefaults({ revVersion: true }), tfxManager, platform);

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--rev-version');
  });

  it('should always set Extension.OutputPath variable', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(withManifestDefaults(), tfxManager, platform);

    const outputs = platform.getOutputs();
    expect(outputs.get('Extension.OutputPath')).toBe('/output/extension.vsix');
  });

  it('should throw error on non-zero exit code', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Error message',
    });

    await expect(packageExtension(withManifestDefaults(), tfxManager, platform)).rejects.toThrow(
      'tfx extension create failed with exit code 1'
    );

    // Verify error was logged
    expect(platform.errorMessages.length).toBeGreaterThan(0);
  });

  it('should throw error if JSON output missing path', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { id: 'test' }, // Missing path
      stdout: '',
      stderr: '',
    });

    await expect(packageExtension(withManifestDefaults(), tfxManager, platform)).rejects.toThrow(
      'tfx did not return expected JSON output with path'
    );
  });

  it('should log packaging message', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(withManifestDefaults(), tfxManager, platform);

    expect(platform.infoMessages).toContain('Packaging extension...');
    expect(platform.infoMessages.some((m) => m.includes('Packaged extension'))).toBe(true);
  });

  it('should update task manifests and add generated overrides file', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'pkg-cmd-'));
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
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(
      {
        rootFolder: root,
        manifestGlobs: ['vss-extension.json'],
        extensionVersion: '2.0.0',
        updateTasksVersion: true,
        updateTasksVersionType: 'major',
      },
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--overrides-file');
    expect(platform.infoMessages).toContain('Updating task manifests before packaging...');
    expect(platform.infoMessages).toContain('Task manifests updated successfully');
  });

  it('should log and throw when task manifest update fails', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');

    await expect(
      packageExtension(
        {
          rootFolder: join(tmpdir(), 'missing-manifest-folder'),
          manifestGlobs: ['vss-extension.json'],
          extensionVersion: '2.0.0',
          updateTasksVersion: true,
        },
        tfxManager,
        platform
      )
    ).rejects.toThrow();

    expect(mockExecute).not.toHaveBeenCalled();
    expect(platform.errorMessages.some((m) => m.includes('Failed to update task manifests'))).toBe(
      true
    );
  });

  it('should pass publisher and extension ID directly to tfx while synchronizing binary file entries', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension(
      withManifestDefaults({
        publisherId: 'new-publisher',
        extensionId: 'new-extension',
      }),
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--publisher');
    expect(callArgs).toContain('new-publisher');
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('new-extension');
    expect(callArgs).toContain('--overrides-file');
    expect(platform.infoMessages).toContain('Updating task manifests before packaging...');
  });

  it('should combine files arrays across multiple manifests and process all referenced folders', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'pkg-multi-manifest-'));
    try {
      const pingTaskDir = join(root, 'PingTask');
      const multiPingTaskDir = join(root, 'MultiPingTask');

      await fs.mkdir(pingTaskDir, { recursive: true });
      await fs.mkdir(multiPingTaskDir, { recursive: true });

      await fs.writeFile(
        join(pingTaskDir, 'task.json'),
        JSON.stringify({ name: 'PingTask' }),
        'utf-8'
      );
      await fs.writeFile(
        join(multiPingTaskDir, 'task.json'),
        JSON.stringify({ name: 'MultiPingTask' }),
        'utf-8'
      );

      await fs.writeFile(join(pingTaskDir, 'demo-noext'), 'ping', 'utf-8');
      await fs.writeFile(join(multiPingTaskDir, 'multi-noext'), 'multi', 'utf-8');

      await fs.writeFile(
        join(root, 'vss-extension.json'),
        JSON.stringify({
          id: 'ping-ext',
          publisher: 'ping-publisher',
          version: '1.0.0',
          files: [{ path: 'PingTask' }],
          contributions: [
            {
              id: 'PingTask',
              type: 'ms.vss-distributed-task.task',
              properties: { name: 'PingTask' },
            },
          ],
        }),
        'utf-8'
      );

      await fs.writeFile(
        join(root, 'vss-extension.multipingtask.json'),
        JSON.stringify({
          files: [{ path: 'MultiPingTask' }],
          contributions: [
            {
              id: 'MultiPingTask',
              type: 'ms.vss-distributed-task.task',
              properties: { name: 'MultiPingTask' },
            },
          ],
        }),
        'utf-8'
      );

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { path: '/output/extension.vsix' },
        stdout: '',
        stderr: '',
      });

      await packageExtension(
        {
          rootFolder: root,
          manifestGlobs: ['vss-extension.json', 'vss-extension.multipingtask.json'],
        },
        tfxManager,
        platform
      );

      const rewrittenPrimaryManifestContent = await fs.readFile(join(root, 'vss-extension.json'));
      const rewrittenPrimaryManifest = JSON.parse(
        rewrittenPrimaryManifestContent.toString('utf-8')
      ) as {
        files: Array<{ path: string; contentType?: string }>;
      };

      const rewrittenSecondaryManifestContent = await fs.readFile(
        join(root, 'vss-extension.multipingtask.json')
      );
      const rewrittenSecondaryManifest = JSON.parse(
        rewrittenSecondaryManifestContent.toString('utf-8')
      ) as {
        files: Array<{ path: string; contentType?: string }>;
      };

      expect(
        rewrittenPrimaryManifest.files.some(
          (file) =>
            file.path === 'PingTask/demo-noext' && file.contentType === 'application/octet-stream'
        )
      ).toBe(true);

      expect(
        rewrittenSecondaryManifest.files.some(
          (file) =>
            file.path === 'MultiPingTask/multi-noext' &&
            file.contentType === 'application/octet-stream'
        )
      ).toBe(true);

      expect(
        rewrittenPrimaryManifest.files.some((file) => file.path === 'MultiPingTask/multi-noext')
      ).toBe(false);
      expect(
        rewrittenSecondaryManifest.files.some((file) => file.path === 'PingTask/demo-noext')
      ).toBe(false);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('should add extensionless files to the correct manifest with packagePath mapping across multiple manifests', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'pkg-multi-manifest-packagepath-'));
    try {
      const cliTaskDir = join(root, 'compiled', 'cli');
      const toolsTaskDir = join(root, 'compiled', 'tools');

      await fs.mkdir(cliTaskDir, { recursive: true });
      await fs.mkdir(toolsTaskDir, { recursive: true });

      await fs.writeFile(
        join(cliTaskDir, 'task.json'),
        JSON.stringify({ name: 'CLITask' }),
        'utf-8'
      );
      await fs.writeFile(
        join(toolsTaskDir, 'task.json'),
        JSON.stringify({ name: 'ToolsTask' }),
        'utf-8'
      );

      await fs.writeFile(join(cliTaskDir, 'noext-cli'), 'cli', 'utf-8');
      await fs.writeFile(join(toolsTaskDir, 'noext-tools'), 'tools', 'utf-8');

      await fs.writeFile(
        join(root, 'vss-extension.json'),
        JSON.stringify({
          id: 'cli-ext',
          publisher: 'cli-publisher',
          version: '1.0.0',
          files: [{ path: 'compiled/cli', packagePath: 'CLI' }],
          contributions: [
            {
              id: 'CLITask',
              type: 'ms.vss-distributed-task.task',
              properties: { name: 'CLI' },
            },
          ],
        }),
        'utf-8'
      );

      await fs.writeFile(
        join(root, 'vss-extension.tools.json'),
        JSON.stringify({
          files: [{ path: 'compiled/tools', packagePath: 'Tools' }],
          contributions: [
            {
              id: 'ToolsTask',
              type: 'ms.vss-distributed-task.task',
              properties: { name: 'Tools' },
            },
          ],
        }),
        'utf-8'
      );

      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { path: '/output/extension.vsix' },
        stdout: '',
        stderr: '',
      });

      await packageExtension(
        {
          rootFolder: root,
          manifestGlobs: ['vss-extension.json', 'vss-extension.tools.json'],
        },
        tfxManager,
        platform
      );

      const rewrittenPrimaryManifestContent = await fs.readFile(join(root, 'vss-extension.json'));
      const rewrittenPrimaryManifest = JSON.parse(
        rewrittenPrimaryManifestContent.toString('utf-8')
      ) as {
        files: Array<{ path: string; packagePath?: string; contentType?: string }>;
      };

      const rewrittenSecondaryManifestContent = await fs.readFile(
        join(root, 'vss-extension.tools.json')
      );
      const rewrittenSecondaryManifest = JSON.parse(
        rewrittenSecondaryManifestContent.toString('utf-8')
      ) as {
        files: Array<{ path: string; packagePath?: string; contentType?: string }>;
      };

      expect(
        rewrittenPrimaryManifest.files.some(
          (file) =>
            file.path === 'compiled/cli/noext-cli' &&
            file.packagePath === 'CLI/noext-cli' &&
            file.contentType === 'application/octet-stream'
        )
      ).toBe(true);

      expect(
        rewrittenSecondaryManifest.files.some(
          (file) =>
            file.path === 'compiled/tools/noext-tools' &&
            file.packagePath === 'Tools/noext-tools' &&
            file.contentType === 'application/octet-stream'
        )
      ).toBe(true);

      expect(
        rewrittenPrimaryManifest.files.some((file) => file.path === 'compiled/tools/noext-tools')
      ).toBe(false);
      expect(
        rewrittenSecondaryManifest.files.some((file) => file.path === 'compiled/cli/noext-cli')
      ).toBe(false);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
