import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { AuthCredentials } from '../auth.js';
import { waitForValidation } from '../commands/wait-for-validation.js';
import { TfxManager } from '../tfx-manager.js';
import { createIdentityVsix } from './helpers/create-test-vsix.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('waitForValidation', () => {
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

  it('should validate successfully on first attempt', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    const result = await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(true);
    expect(result.status).toBe('success');
    expect(result.attempts).toBe(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('should retry on pending status', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');

    // First two attempts return pending
    mockExecute.mockResolvedValueOnce({
      exitCode: 0,
      json: { status: 'pending' },
      stdout: '',
      stderr: '',
    });
    mockExecute.mockResolvedValueOnce({
      exitCode: 0,
      json: { status: 'pending' },
      stdout: '',
      stderr: '',
    });
    // Third attempt succeeds
    mockExecute.mockResolvedValueOnce({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    const result = await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        timeoutMinutes: 0.00005,
        pollingIntervalSeconds: 0.001,
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(true);
    expect(result.status).toBe('success');
    expect(result.attempts).toBe(3);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('should handle failed validation', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 1,
      json: { status: 'failed' },
      stdout: '',
      stderr: '',
    });

    const result = await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.attempts).toBe(1);
  });

  it('logs nested validation failure details from message payload', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 1,
      json: {
        status: 'error',
        message: JSON.stringify({
          results: [
            {
              status: 'failure',
              source: 'PackageValidationStep',
              message:
                "Task definition visible rule 'operation = package || operation = publish && use = manifest || operation = wait-for-validation' is invalid. Rule cannot contain both '&&' and '||' operators.",
              reports: [],
              details: [],
            },
            {
              status: 'success',
              source: 'VirusScanStep',
              message: '',
              reports: [],
              details: [],
            },
          ],
        }),
      },
      stdout: '',
      stderr: '',
    });

    const result = await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('error');
    expect(
      platform.errorMessages.some(
        (m) =>
          m.includes('❌ PackageValidationStep:') &&
          m.includes("Rule cannot contain both '&&' and '||' operators")
      )
    ).toBe(true);
    expect(platform.infoMessages).toContain('✅ VirusScanStep: ');
  });

  it('should timeout after max retries', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    // Always return pending
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'pending' },
      stdout: '',
      stderr: '',
    });

    const result = await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        timeoutMinutes: 0.00005,
        pollingIntervalSeconds: 0.001,
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('pending');
    expect(result.attempts).toBe(3);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('should derive retry count from timeoutMinutes and pollingIntervalSeconds', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'pending' },
      stdout: '',
      stderr: '',
    });

    const result = await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        timeoutMinutes: 0.001,
        pollingIntervalSeconds: 0.03,
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('pending');
    expect(result.attempts).toBe(2);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  }, 15_000);

  it('should use correct tfx arguments', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await waitForValidation(
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
    expect(callArgs).toContain('isvalid');
    expect(callArgs).toContain('--publisher');
    expect(callArgs).toContain('pub');
    expect(callArgs).toContain('--extension-id');
    expect(callArgs).toContain('ext');
    expect(callArgs).toContain('--json');
  });

  it('should include extension-version argument when provided', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        extensionVersion: '1.2.3',
      },
      auth,
      tfxManager,
      platform
    );

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs).toContain('--version');
    expect(callArgs).toContain('1.2.3');
  });

  it('should use extension ID as provided', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await waitForValidation(
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

  it('should resolve publisher and extension from vsixFile', async () => {
    const vsix = await createIdentityVsix({
      publisher: 'publisher-from-vsix',
      extensionId: 'extension-from-vsix',
    });

    try {
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { status: 'success' },
        stdout: '',
        stderr: '',
      });

      await waitForValidation(
        {
          vsixFile: vsix.vsixFile,
        },
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--publisher');
      expect(callArgs).toContain('publisher-from-vsix');
      expect(callArgs).toContain('--extension-id');
      expect(callArgs).toContain('extension-from-vsix');
    } finally {
      await vsix.cleanup();
    }
  });

  it('should resolve publisher and extension from manifestGlobs', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'wait-validation-manifest-'));
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
      const mockExecute = jest.spyOn(tfxManager, 'execute');
      mockExecute.mockResolvedValue({
        exitCode: 0,
        json: { status: 'success' },
        stdout: '',
        stderr: '',
      });

      await waitForValidation(
        {
          rootFolder: testDir,
          manifestGlobs: ['vss-extension.json'],
        },
        auth,
        tfxManager,
        platform
      );

      const callArgs = mockExecute.mock.calls[0][0];
      expect(callArgs).toContain('--publisher');
      expect(callArgs).toContain('publisher-from-manifest');
      expect(callArgs).toContain('--extension-id');
      expect(callArgs).toContain('extension-from-manifest');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should include manifest arguments when provided', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        rootFolder: '/project',
        manifestGlobs: ['vss-extension.json'],
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
  });

  it('should handle authentication', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await waitForValidation(
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
    expect(platform.isSecret('test-token')).toBe(true);
  });

  it('should use basic auth credentials when auth type is basic', async () => {
    const basicAuth: AuthCredentials = {
      authType: 'basic',
      serviceUrl: 'https://marketplace.visualstudio.com',
      username: 'user',
      password: 'pass',
    };

    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'success' },
      stdout: '',
      stderr: '',
    });

    await waitForValidation(
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

  it('should warn when response has unknown status', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { status: 'mystery' },
      stdout: '',
      stderr: '',
    });

    const result = await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        timeoutMinutes: 0.00001,
        pollingIntervalSeconds: 0.001,
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('mystery' as any);
    expect(platform.warningMessages.some((m) => m.includes('Unknown validation status'))).toBe(
      true
    );
  });

  it('should warn when validation response has no status', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockResolvedValue({
      exitCode: 0,
      json: { unexpected: true },
      stdout: '',
      stderr: '',
    });

    const result = await waitForValidation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        timeoutMinutes: 0.00001,
        pollingIntervalSeconds: 0.001,
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.isValid).toBe(false);
    expect(result.status).toBe('pending');
    expect(platform.warningMessages).toContain('No status in validation response');
  });

  it('should throw after repeated execution exceptions at max retries', async () => {
    const mockExecute = jest.spyOn(tfxManager, 'execute');
    mockExecute.mockRejectedValue(new Error('transient failure'));

    await expect(
      waitForValidation(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          timeoutMinutes: 0.00001,
          pollingIntervalSeconds: 0.001,
        },
        auth,
        tfxManager,
        platform
      )
    ).rejects.toThrow('transient failure');
  });
});
