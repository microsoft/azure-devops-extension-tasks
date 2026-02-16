import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const tlErrorMock = jest.fn();
const tlSetResultMock = jest.fn();
const tlCommandMock = jest.fn();

const getAuthMock = jest.fn();
const azdoAdapterCtorMock = jest.fn();

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

jest.unstable_mockModule('azure-pipelines-task-lib/task.js', () => ({
  error: tlErrorMock,
  setResult: tlSetResultMock,
  command: tlCommandMock,
  TaskResult: {
    Succeeded: 'Succeeded',
    Failed: 'Failed',
  },
}));

jest.unstable_mockModule('../azdo-adapter.js', () => ({
  AzdoAdapter: azdoAdapterCtorMock,
}));

jest.unstable_mockModule('../auth/index.js', () => ({
  getAuth: getAuthMock,
  ConnectionType: {},
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

describe('Azure DevOps main entrypoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateNodeAvailableMock.mockImplementation(async () => undefined);
    validateNpmAvailableMock.mockImplementation(async () => undefined);
    validateTfxAvailableMock.mockImplementation(async () => undefined);
    getAuthMock.mockImplementation(async () => ({
      token: 'token',
      serviceUrl: 'https://dev.azure.com/org',
    }));
    packageExtensionMock.mockImplementation(async () => ({ vsixPath: '/tmp/ext.vsix' }));
    publishExtensionMock.mockImplementation(async () => ({
      published: true,
      vsixPath: '/tmp/publish.vsix',
    }));
    installExtensionMock.mockImplementation(async () => ({ allSuccess: true }));
    waitForInstallationMock.mockImplementation(async () => ({ success: true }));
  });

  it('executes package operation and sets output variable', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'package',
        tfxVersion: 'built-in',
      },
      delimitedInputs: {
        'manifestGlobs|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(validateNodeAvailableMock).toHaveBeenCalledWith(platform);
    expect(packageExtensionMock).toHaveBeenCalled();
    expect(platform.setOutput).toHaveBeenCalledWith('extension.outputPath', '/tmp/ext.vsix');
    expect(getAuthMock).not.toHaveBeenCalled();
    expect(platform.setResult).toHaveBeenCalledWith('Succeeded', 'package completed successfully');
  });

  it('forwards package manifest editor options', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'package',
        tfxVersion: 'built-in',
        rootFolder: '/repo',
        manifestGlobs: 'vss-extension.json',
        publisherId: 'publisher',
        extensionId: 'extension',
        extensionVersion: '1.2.3',
        extensionName: 'Name',
        extensionVisibility: 'private_preview',
        extensionPricing: 'free',
      },
      boolInputs: {
        updateTasksVersion: true,
        updateTasksId: true,
      },
      delimitedInputs: {
        'manifestGlobs|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(packageExtensionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publisherId: 'publisher',
        extensionId: 'extension',
        extensionVersion: '1.2.3',
        extensionName: 'Name',
        extensionVisibility: 'private_preview',
        extensionPricing: 'free',
        updateTasksVersion: true,
        updateTasksVersionType: undefined,
        updateTasksId: true,
      }),
      expect.anything(),
      platform
    );
  });

  it('executes publish operation with auth and path-based tfx validation', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'publish',
        tfxVersion: 'path',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publishSource: 'manifest',
      },
      delimitedInputs: {
        'manifestGlobs|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(validateTfxAvailableMock).toHaveBeenCalledWith(platform);
    expect(validateNpmAvailableMock).not.toHaveBeenCalled();
    expect(getAuthMock).toHaveBeenCalledWith('connectedService:VsTeam', 'svc-connection', platform);
    expect(validateAccountUrlMock).toHaveBeenCalledWith('https://dev.azure.com/org');
    expect(publishExtensionMock).toHaveBeenCalled();
    expect(platform.setOutput).toHaveBeenCalledWith('extension.published', 'true');
    expect(platform.setResult).toHaveBeenCalledWith('Succeeded', 'publish completed successfully');
  });

  it('executes show operation and emits extension metadata output', async () => {
    const metadata = { id: 'extension', version: '1.0.0' };
    showExtensionMock.mockImplementation(async () => ({ metadata }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'show',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('extension.metadata', JSON.stringify(metadata));
  });

  it('sets extension.installed output when install succeeds', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'install',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'accounts|;': ['https://dev.azure.com/org1'],
        'accounts|\n': ['https://dev.azure.com/org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('extension.installed', 'true');
  });

  it('forwards publish manifest editor options', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'publish',
        tfxVersion: 'built-in',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publishSource: 'manifest',
        rootFolder: '/repo',
        extensionVisibility: 'public_preview',
        extensionPricing: 'paid',
        updateTasksVersionType: 'patch',
      },
      boolInputs: {
        updateTasksVersion: true,
        updateTasksId: true,
      },
      delimitedInputs: {
        'manifestGlobs|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(publishExtensionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publishSource: 'manifest',
        rootFolder: '/repo',
        extensionVisibility: 'public_preview',
        extensionPricing: 'paid',
        updateTasksVersion: true,
        updateTasksVersionType: 'patch',
        updateTasksId: true,
      }),
      expect.anything(),
      expect.anything(),
      platform
    );
  });

  it('sets extension.shared output when share succeeds', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'share',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'shareWith|\n': ['org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('extension.shared', 'true');
  });

  it('sets extension.unshared output when unshare succeeds', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'unshare',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'unshareWith|\n': ['org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('extension.unshared', 'true');
  });

  it('fails install operation when not all accounts succeed', async () => {
    installExtensionMock.mockImplementationOnce(async () => ({ allSuccess: false }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'install',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'accounts|;': ['https://dev.azure.com/org1'],
        'accounts|\n': ['https://dev.azure.com/org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(installExtensionMock).toHaveBeenCalled();
    expect(tlErrorMock).toHaveBeenCalledWith('Some accounts failed to install the extension');
    expect(tlSetResultMock).toHaveBeenCalledWith(
      'Failed',
      'Some accounts failed to install the extension'
    );
  });

  it('fails wait-for-installation when expectedTasks is invalid JSON', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'wait-for-installation',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
        expectedTasks: '{invalid-json',
      },
      delimitedInputs: {
        'accounts|;': ['https://dev.azure.com/org1'],
        'accounts|\n': ['https://dev.azure.com/org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(waitForInstallationMock).not.toHaveBeenCalled();
    expect(tlSetResultMock).toHaveBeenCalled();
    expect(String(tlSetResultMock.mock.calls[0][1])).toContain('Failed to parse expectedTasks');
  });

  it('executes query-version and updates build number when requested', async () => {
    queryVersionMock.mockImplementation(async () => ({
      proposedVersion: '2.0.0',
      currentVersion: '1.0.0',
    }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'query-version',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
        versionAction: 'major',
      },
      boolInputs: {
        setBuildNumber: true,
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(queryVersionMock).toHaveBeenCalled();
    expect(tlCommandMock).toHaveBeenCalledWith('build.updatebuildnumber', undefined, '2.0.0');
    expect(platform.setOutput).toHaveBeenCalledWith('extension.proposedVersion', '2.0.0');
    expect(platform.setOutput).toHaveBeenCalledWith('extension.currentVersion', '1.0.0');
  });

  it('sets extension.waitForInstallation output when verification succeeds', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'wait-for-installation',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'accounts|;': ['https://dev.azure.com/org1'],
        'accounts|\n': ['https://dev.azure.com/org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('extension.waitForInstallation', 'true');
  });

  it('fails wait-for-validation when status is not success', async () => {
    waitForValidationMock.mockImplementation(async () => ({ status: 'failed' }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'wait-for-validation',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'manifestGlobs|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(waitForValidationMock).toHaveBeenCalled();
    expect(tlSetResultMock).toHaveBeenCalledWith('Failed', 'Validation failed with status: failed');
  });

  it('sets extension.waitForValidation output when validation succeeds', async () => {
    waitForValidationMock.mockImplementation(async () => ({ status: 'success' }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'wait-for-validation',
        connectionType: 'connectedService:VsTeam',
        connectionName: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'manifestGlobs|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('extension.waitForValidation', 'true');
  });
});
