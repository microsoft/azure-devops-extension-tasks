import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { queryVersion } from '../commands/query-version.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import type { AuthCredentials } from '../auth.js';

describe('queryVersion', () => {
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

  it('returns marketplace version when action is None', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
      stdout: '',
      stderr: '',
    });

    const result = await queryVersion(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        versionAction: 'None',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.version).toBe('1.2.3');
    expect(result.source).toBe('marketplace');
  });

  it('increments major version', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
      stdout: '',
      stderr: '',
    });

    const result = await queryVersion(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        versionAction: 'Major',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.version).toBe('2.0.0');
  });

  it('increments minor version', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
      stdout: '',
      stderr: '',
    });

    const result = await queryVersion(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        versionAction: 'Minor',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.version).toBe('1.3.0');
  });

  it('increments patch version', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
      stdout: '',
      stderr: '',
    });

    const result = await queryVersion(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        versionAction: 'Patch',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.version).toBe('1.2.4');
  });

  it('uses override variable when provided', async () => {
    const executeSpy = jest.spyOn(tfxManager, 'execute');
    platform.setVariableValue('OVERRIDE_VERSION', '9.9.9');

    const result = await queryVersion(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        extensionVersionOverrideVariable: 'OVERRIDE_VERSION',
      },
      auth,
      tfxManager,
      platform
    );

    expect(result.version).toBe('9.9.9');
    expect(result.source).toBe('override');
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('sets Extension.Version output when override variable is used', async () => {
    platform.setVariableValue('OVERRIDE_VERSION', '9.9.9');

    await queryVersion(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        extensionVersionOverrideVariable: 'OVERRIDE_VERSION',
      },
      auth,
      tfxManager,
      platform
    );

    const outputs = platform.getOutputs();
    expect(outputs.get('Extension.Version')).toBe('9.9.9');
  });

  it('sets Extension.Version output when marketplace version is used', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
      stdout: '',
      stderr: '',
    });

    await queryVersion(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        versionAction: 'Patch',
      },
      auth,
      tfxManager,
      platform
    );

    const outputs = platform.getOutputs();
    expect(outputs.get('Extension.Version')).toBe('1.2.4');
  });

  it('throws for invalid marketplace semantic version when action increments', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: { extensionId: 'ext', publisher: 'pub', version: 'invalid' },
      stdout: '',
      stderr: '',
    });

    await expect(
      queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          versionAction: 'Major',
        },
        auth,
        tfxManager,
        platform
      )
    ).rejects.toThrow("Version 'invalid' is not a valid semantic version");
  });

  it('throws when marketplace response does not contain version', async () => {
    jest.spyOn(tfxManager, 'execute').mockResolvedValue({
      exitCode: 0,
      json: { extensionId: 'ext', publisher: 'pub' },
      stdout: '',
      stderr: '',
    });

    await expect(
      queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
        },
        auth,
        tfxManager,
        platform
      )
    ).rejects.toThrow('Could not determine extension version from marketplace response');
  });
});
