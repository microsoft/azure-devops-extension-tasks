import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const setFailedMock = jest.fn();

const getAuthMock = jest.fn();
const githubAdapterCtorMock = jest.fn();

const tfxManagerCtorMock = jest.fn();
const packageExtensionMock = jest.fn();
const publishExtensionMock = jest.fn();
const unpublishExtensionMock = jest.fn();
const shareExtensionMock = jest.fn();
const unshareExtensionMock = jest.fn();
const installExtensionMock = jest.fn();
const showExtensionMock = jest.fn();
const queryVersionMock = jest.fn();
const waitForValidationMock = jest.fn();
const waitForInstallationMock = jest.fn();

const validateExtensionIdMock = jest.fn();
const validatePublisherIdMock = jest.fn();
const validateVersionMock = jest.fn();
const validateAccountUrlMock = jest.fn();
const validateNodeAvailableMock = jest.fn();
const validateNpmAvailableMock = jest.fn();
const validateTfxAvailableMock = jest.fn();
const validateAzureCliAvailableMock = jest.fn();

jest.unstable_mockModule('@actions/core', () => ({
  setFailed: setFailedMock,
}));

jest.unstable_mockModule('../github-adapter.js', () => ({
  GitHubAdapter: githubAdapterCtorMock,
}));

jest.unstable_mockModule('../auth/index.js', () => ({
  getAuth: getAuthMock,
  AuthType: {},
}));

jest.unstable_mockModule('@extension-tasks/core', () => ({
  TaskResult: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
  },
  TfxManager: tfxManagerCtorMock,
  packageExtension: packageExtensionMock,
  publishExtension: publishExtensionMock,
  unpublishExtension: unpublishExtensionMock,
  shareExtension: shareExtensionMock,
  unshareExtension: unshareExtensionMock,
  installExtension: installExtensionMock,
  showExtension: showExtensionMock,
  queryVersion: queryVersionMock,
  waitForValidation: waitForValidationMock,
  waitForInstallation: waitForInstallationMock,
  validateExtensionId: validateExtensionIdMock,
  validatePublisherId: validatePublisherIdMock,
  validateVersion: validateVersionMock,
  validateAccountUrl: validateAccountUrlMock,
  validateNodeAvailable: validateNodeAvailableMock,
  validateNpmAvailable: validateNpmAvailableMock,
  validateTfxAvailable: validateTfxAvailableMock,
  validateAzureCliAvailable: validateAzureCliAvailableMock,
}));

type PlatformConfig = {
  inputs?: Record<string, string | undefined>;
  boolInputs?: Record<string, boolean>;
  delimitedInputs?: Record<string, string[]>;
};

function createPlatformMock(config: PlatformConfig = {}) {
  const inputValues = config.inputs ?? {};
  const boolValues = config.boolInputs ?? {};
  const delimitedValues = config.delimitedInputs ?? {};

  return {
    getInput: jest.fn((name: string) => inputValues[name]),
    getBoolInput: jest.fn((name: string) => boolValues[name] ?? false),
    getDelimitedInput: jest.fn((name: string, delimiter: string) => {
      return delimitedValues[`${name}|${delimiter}`] ?? [];
    }),
    getPathInput: jest.fn(),
    setSecret: jest.fn(),
    setVariable: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    exec: jest.fn(),
    which: jest.fn(),
    getVariable: jest.fn(),
    setOutput: jest.fn(),
    setResult: jest.fn(),
  };
}

async function importMainAndFlush(): Promise<void> {
  jest.resetModules();
  await import('../main.js');
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('GitHub Action main entrypoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateNodeAvailableMock.mockImplementation(async () => undefined);
    validateNpmAvailableMock.mockImplementation(async () => undefined);
    validateTfxAvailableMock.mockImplementation(async () => undefined);
    validateAzureCliAvailableMock.mockImplementation(async () => undefined);
    getAuthMock.mockImplementation(async () => ({
      token: 'token',
      password: 'password',
      serviceUrl: 'https://dev.azure.com/org',
    }));
    packageExtensionMock.mockImplementation(async () => ({ vsixPath: '/tmp/ext.vsix' }));
    publishExtensionMock.mockImplementation(async () => ({}));
    installExtensionMock.mockImplementation(async () => ({ allSuccess: true }));
    waitForInstallationMock.mockImplementation(async () => ({ success: true }));
  });

  it('executes package operation successfully', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'package',
        'tfx-version': 'built-in',
      },
      delimitedInputs: {
        'manifest-globs|\n': ['vss-extension.json'],
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(validateNodeAvailableMock).toHaveBeenCalledWith(platform);
    expect(packageExtensionMock).toHaveBeenCalled();
    expect(platform.setOutput).toHaveBeenCalledWith('vsix-path', '/tmp/ext.vsix');
    expect(getAuthMock).not.toHaveBeenCalled();
    expect(platform.setResult).toHaveBeenCalledWith('Succeeded', 'package completed successfully');
  });

  it('forwards package task update flags and overrides', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'package',
        'tfx-version': 'built-in',
        'root-folder': '/repo',
        'publisher-id': 'publisher',
        'extension-id': 'extension',
        'extension-version': '1.2.3',
        'extension-name': 'Name',
        'extension-visibility': 'private',
        'output-path': '/out',
      },
      boolInputs: {
        'update-tasks-version': true,
        'update-tasks-id': true,
        'bypass-validation': false,
        'rev-version': false,
      },
      delimitedInputs: {
        'manifest-globs|\n': ['vss-extension.json'],
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(packageExtensionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rootFolder: '/repo',
        publisherId: 'publisher',
        extensionId: 'extension',
        extensionVersion: '1.2.3',
        extensionName: 'Name',
        extensionVisibility: 'private',
        updateTasksVersion: true,
        updateTasksId: true,
        outputPath: '/out',
      }),
      expect.anything(),
      platform
    );
  });

  it('executes publish operation with oidc auth and version-spec tfx', async () => {
    publishExtensionMock.mockImplementation(async () => ({ vsixPath: '/tmp/published.vsix' }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'publish',
        'tfx-version': '^0.17.0',
        'auth-type': 'oidc',
        'publish-source': 'manifest',
      },
      delimitedInputs: {
        'manifest-globs|\n': ['vss-extension.json'],
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(validateNpmAvailableMock).toHaveBeenCalledWith(platform);
    expect(validateAzureCliAvailableMock).toHaveBeenCalledWith(platform);
    expect(getAuthMock).toHaveBeenCalledWith('oidc', platform, {
      token: undefined,
      username: undefined,
      password: undefined,
      serviceUrl: undefined,
    });
    expect(platform.setSecret).toHaveBeenCalledWith('token');
    expect(platform.setSecret).toHaveBeenCalledWith('password');
    expect(validateAccountUrlMock).toHaveBeenCalledWith('https://dev.azure.com/org');
    expect(publishExtensionMock).toHaveBeenCalled();
    expect(platform.setOutput).toHaveBeenCalledWith('vsix-path', '/tmp/published.vsix');
  });

  it('executes publish from vsix and emits modified vsix path output', async () => {
    publishExtensionMock.mockImplementation(async () => ({
      vsixPath: '/tmp/temp-12345.vsix',
    }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'publish',
        'tfx-version': 'built-in',
        'auth-type': 'pat',
        'publish-source': 'vsix',
        'vsix-file': '/repo/original.vsix',
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(publishExtensionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publishSource: 'vsix',
        vsixFile: '/repo/original.vsix',
      }),
      expect.anything(),
      expect.anything(),
      platform
    );
    expect(platform.setOutput).toHaveBeenCalledWith('vsix-path', '/tmp/temp-12345.vsix');
  });

  it('fails wait-for-installation when expected-tasks JSON is invalid', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'wait-for-installation',
        'auth-type': 'pat',
        'publisher-id': 'publisher',
        'extension-id': 'extension',
        'expected-tasks': '{invalid-json',
      },
      delimitedInputs: {
        'accounts|;': ['https://dev.azure.com/org1'],
        'accounts|\n': ['https://dev.azure.com/org1'],
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(getAuthMock).toHaveBeenCalledWith('pat', platform, {
      token: undefined,
      username: undefined,
      password: undefined,
      serviceUrl: undefined,
    });
    expect(waitForInstallationMock).not.toHaveBeenCalled();
    expect(setFailedMock).toHaveBeenCalled();
    expect(String(setFailedMock.mock.calls[0][0])).toContain('Failed to parse expected-tasks');
  });

  it('fails on unknown operation', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'nope',
        'auth-type': 'pat',
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(setFailedMock).toHaveBeenCalledWith('Unknown operation: nope');
  });

  it('executes query-version and sets outputs', async () => {
    queryVersionMock.mockImplementation(async () => ({
      proposedVersion: '2.0.0',
      currentVersion: '1.0.0',
    }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'query-version',
        'auth-type': 'pat',
        'publisher-id': 'publisher',
        'extension-id': 'extension',
        'version-action': 'Major',
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(queryVersionMock).toHaveBeenCalled();
    expect(platform.setOutput).toHaveBeenCalledWith('proposed-version', '2.0.0');
    expect(platform.setOutput).toHaveBeenCalledWith('current-version', '1.0.0');
  });

  it('executes show and sets extension metadata output', async () => {
    const metadata = {
      id: 'extension',
      publisher: 'publisher',
      version: '1.2.3',
    };
    showExtensionMock.mockImplementation(async () => ({ metadata }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'show',
        'auth-type': 'pat',
        'publisher-id': 'publisher',
        'extension-id': 'extension',
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(showExtensionMock).toHaveBeenCalled();
    expect(platform.setOutput).toHaveBeenCalledWith('extension-metadata', JSON.stringify(metadata));
  });

  it('fails wait-for-validation when status is not success', async () => {
    waitForValidationMock.mockImplementation(async () => ({ status: 'failed' }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'wait-for-validation',
        'auth-type': 'pat',
        'publisher-id': 'publisher',
        'extension-id': 'extension',
      },
      delimitedInputs: {
        'manifest-globs|\n': ['vss-extension.json'],
      },
    });
    githubAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(waitForValidationMock).toHaveBeenCalled();
    expect(setFailedMock).toHaveBeenCalledWith('Validation failed with status: failed');
  });
});
