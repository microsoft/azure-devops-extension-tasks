import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { packageExtension } from '../commands/package.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('packageExtension', () => {
  let platform: MockPlatformAdapter;
  let tfxManager: TfxManager;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
    platform.registerTool('tfx', '/usr/bin/tfx');
    tfxManager = new TfxManager({ tfxVersion: 'built-in', platform });
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

    const result = await packageExtension({}, tfxManager, platform);

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
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension({ rootFolder: '/project/root' }, tfxManager, platform);

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--root');
    expect(callArgs).toContain('/project/root');
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
      {
        manifestGlobs: ['vss-extension.json', '*.json'],
      },
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
      {
        extensionId: 'my-extension',
      },
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

    await packageExtension({ publisherId: 'custom-publisher' }, tfxManager, platform);

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--publisher');
    expect(callArgs).toContain('custom-publisher');
  });

  it('should include extension version override', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix', version: '2.0.0' },
      stdout: '',
      stderr: '',
    });

    await packageExtension({ extensionVersion: '2.0.0' }, tfxManager, platform);

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--extension-version');
    expect(callArgs).toContain('2.0.0');
  });

  it('should include output path', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/custom/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension({ outputPath: '/custom/output' }, tfxManager, platform);

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

    await packageExtension({ bypassValidation: true }, tfxManager, platform);

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

    await packageExtension({ revVersion: true }, tfxManager, platform);

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--rev-version');
  });

  it('should set output variable when specified', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension({ outputVariable: 'MY_VSIX_PATH' }, tfxManager, platform);

    const outputs = platform.getOutputs();
    expect(outputs.get('MY_VSIX_PATH')).toBe('/output/extension.vsix');
  });

  it('should always set Extension.OutputPath variable', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { path: '/output/extension.vsix' },
      stdout: '',
      stderr: '',
    });

    await packageExtension({}, tfxManager, platform);

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

    await expect(packageExtension({}, tfxManager, platform)).rejects.toThrow(
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

    await expect(packageExtension({}, tfxManager, platform)).rejects.toThrow(
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

    await packageExtension({}, tfxManager, platform);

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
});
