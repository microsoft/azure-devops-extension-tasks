import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { showExtension } from '../commands/show.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import type { AuthCredentials } from '../auth.js';

describe('showExtension', () => {
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

  it('should query extension metadata', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: {
        extensionId: 'my-ext',
        publisher: 'my-pub',
        version: '1.2.3',
        extensionName: 'My Extension',
        shortDescription: 'A great extension',
        categories: ['Build and release'],
        tags: ['azure', 'devops'],
      },
      stdout: '',
      stderr: '',
    });

    const result = await showExtension(
      {
        publisherId: 'my-pub',
        extensionId: 'my-ext',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.metadata.id).toBe('my-ext');
    expect(result.metadata.publisher).toBe('my-pub');
    expect(result.metadata.version).toBe('1.2.3');
    expect(result.metadata.name).toBe('My Extension');
    expect(result.metadata.description).toBe('A great extension');
    expect(result.metadata.categories).toContain('Build and release');
  });

  it('should use correct tfx arguments', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { id: 'ext', publisher: 'pub', version: '1.0.0' },
      stdout: '',
      stderr: '',
    });

    await showExtension(
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
    expect(callArgs).toContain('show');
    expect(callArgs).toContain('--publisher');
    expect(callArgs).toContain('pub');
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('ext');
    expect(callArgs).toContain('--json');
  });

  it('should use extension ID as provided', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { id: 'ext', publisher: 'pub', version: '1.0.0' },
      stdout: '',
      stderr: '',
    });

    await showExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('ext');
  });

  it('should set output variable when specified', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { id: 'ext', publisher: 'pub', version: '1.0.0' },
      stdout: '',
      stderr: '',
    });

    await showExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        outputVariable: 'EXT_DATA',
      },
      auth,
      tfxManager,
      platform
    );

    const outputs = platform.getOutputs();
    const outputData = outputs.get('EXT_DATA');
    expect(outputData).toBeDefined();

    const parsed = JSON.parse(outputData!);
    expect(parsed.id).toBe('ext');
  });

  it('should handle authentication', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { id: 'ext', publisher: 'pub', version: '1.0.0' },
      stdout: '',
      stderr: '',
    });

    await showExtension(
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
    expect(callArgs).toContain('--token');
    expect(platform.isSecret('test-token')).toBe(true);
  });

  it('should throw on non-zero exit code', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Error',
    });

    await expect(
      showExtension(
        {
          publisherId: 'pub',
          extensionId: 'ext',
        },
        auth,
        tfxManager,
        platform
      )
    ).rejects.toThrow('tfx extension show failed with exit code 1');
  });

  it('should throw if JSON output missing', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: undefined,
      stdout: '',
      stderr: '',
    });

    await expect(
      showExtension(
        {
          publisherId: 'pub',
          extensionId: 'ext',
        },
        auth,
        tfxManager,
        platform
      )
    ).rejects.toThrow('tfx did not return expected JSON output');
  });

  it('should support basic auth and mark password as secret', async () => {
    const basicAuth: AuthCredentials = {
      authType: 'basic',
      serviceUrl: 'https://marketplace.visualstudio.com',
      username: 'user',
      password: 'pass',
    };

    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { id: 'ext', publisher: 'pub', version: '1.0.0' },
      stdout: '',
      stderr: '',
    });

    await showExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
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

  it('should map metadata from fallback fields', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: {
        id: 'ext',
        publisher: 'pub',
        versions: [{ version: '2.3.4' }],
        displayName: 'Display Name',
        description: 'Long description',
      },
      stdout: '',
      stderr: '',
    });

    const result = await showExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.metadata.id).toBe('ext');
    expect(result.metadata.version).toBe('2.3.4');
    expect(result.metadata.name).toBe('Display Name');
    expect(result.metadata.description).toBe('Long description');
  });

  it('should fall back to requested extension id when response id is missing', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: {
        publisher: 'pub',
        version: '1.0.0',
        name: 'FallbackName',
      },
      stdout: '',
      stderr: '',
    });

    const result = await showExtension(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.metadata.id).toBe('ext');
    expect(result.metadata.name).toBe('FallbackName');
  });
});
