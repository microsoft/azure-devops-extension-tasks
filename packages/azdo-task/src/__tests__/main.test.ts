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
const normalizeAccountToServiceUrlMock = jest.fn((value: string) => value);
const validateNodeAvailableMock = jest.fn();
const validateNpmAvailableMock = jest.fn();
const validateTfxAvailableMock = jest.fn();
const versionSourceNeedsMarketplaceMock = jest.fn((_s?: string[]) => true);

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
  normalizeAccountToServiceUrl: normalizeAccountToServiceUrlMock,
  validateNodeAvailable: validateNodeAvailableMock,
  validateNpmAvailable: validateNpmAvailableMock,
  validateTfxAvailable: validateTfxAvailableMock,
  versionSourceNeedsMarketplace: versionSourceNeedsMarketplaceMock,
}));

type PlatformConfig = {
  inputs?: Record<string, string | undefined>;
  boolInputs?: Record<string, boolean>;
  delimitedInputs?: Record<string, string[]>;
  fileExists?: Record<string, boolean>;
};

function createPlatformMock(config: PlatformConfig = {}) {
  const inputValues = config.inputs ?? {};
  const boolValues = config.boolInputs ?? {};
  const delimitedValues = config.delimitedInputs ?? {};
  const fileExistsValues = config.fileExists ?? {};

  return {
    getInput: jest.fn((name: string) => inputValues[name]),
    getPathInput: jest.fn((name: string) => inputValues[name]),
    getBoolInput: jest.fn((name: string) => boolValues[name] ?? false),
    getDelimitedInput: jest.fn((name: string, delimiter: string) => {
      return delimitedValues[`${name}|${delimiter}`] ?? [];
    }),
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
    fileExists: jest.fn(async (filePath: string) => fileExistsValues[filePath] ?? true),
  };
}

async function importMainAndFlush(): Promise<void> {
  jest.resetModules();
  await import('../main.js');
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function expectNoLegacyStatusOutputs(platform: ReturnType<typeof createPlatformMock>): void {
  const legacyOutputs = [
    'published',
    'shared',
    'unshared',
    'installed',
    'waitForValidation',
    'waitForInstallation',
  ];

  for (const outputName of legacyOutputs) {
    expect(platform.setOutput).not.toHaveBeenCalledWith(outputName, expect.anything());
  }
}

describe('Azure DevOps main entrypoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    normalizeAccountToServiceUrlMock.mockImplementation((value: string) => value);
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
        'manifestFile|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(validateNodeAvailableMock).toHaveBeenCalledWith(platform);
    expect(packageExtensionMock).toHaveBeenCalled();
    expect(platform.setOutput).toHaveBeenCalledWith('vsixPath', '/tmp/ext.vsix');
    expect(getAuthMock).not.toHaveBeenCalled();
    expect(platform.setResult).toHaveBeenCalledWith('Succeeded', 'package completed successfully');
  });

  it('forwards package manifest editor options', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'package',
        tfxVersion: 'built-in',
        manifestFile: 'vss-extension.json',
        publisherId: 'publisher',
        extensionId: 'extension',
        extensionVersion: '1.2.3',
        extensionName: 'Name',
        extensionVisibility: 'private_preview',
        extensionPricing: 'free',
        manifestFileJs: 'manifests/build-manifest.js',
        overridesFile: 'manifests/overrides.json',
        updateTasksVersion: 'major',
      },
      boolInputs: {
        updateTasksId: true,
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
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
        manifestFileJs: 'manifests/build-manifest.js',
        overridesFile: 'manifests/overrides.json',
        updateTasksVersion: 'major',
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
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        use: 'manifest',
        manifestFileJs: 'manifests/build-manifest.js',
        overridesFile: 'manifests/overrides.json',
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(validateTfxAvailableMock).toHaveBeenCalledWith(platform);
    expect(validateNpmAvailableMock).not.toHaveBeenCalled();
    expect(getAuthMock).toHaveBeenCalledWith('PAT', 'svc-connection', platform);
    expect(validateAccountUrlMock).toHaveBeenCalledWith('https://dev.azure.com/org');
    expect(publishExtensionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        manifestFileJs: 'manifests/build-manifest.js',
        overridesFile: 'manifests/overrides.json',
      }),
      expect.anything(),
      expect.anything(),
      platform
    );
    expect(platform.setResult).toHaveBeenCalledWith('Succeeded', 'publish completed successfully');
  });

  it('fails early when vsixFile does not exist', async () => {
    const missingPath = '/tmp/missing.vsix';
    const platform = createPlatformMock({
      inputs: {
        operation: 'publish',
        tfxVersion: 'built-in',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        use: 'vsix',
        vsixFile: missingPath,
      },
      fileExists: {
        [missingPath]: false,
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(publishExtensionMock).not.toHaveBeenCalled();
    expect(tlSetResultMock).toHaveBeenCalledWith(
      'Failed',
      expect.stringContaining(
        `Input 'vsixFile' must reference an existing file. File not found: ${missingPath}`
      )
    );
  });

  it('fails early when manifestFileJs does not exist', async () => {
    const missingPath = '/tmp/missing-manifest.js';
    const platform = createPlatformMock({
      inputs: {
        operation: 'package',
        tfxVersion: 'built-in',
        manifestFileJs: missingPath,
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
      fileExists: {
        [missingPath]: false,
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(packageExtensionMock).not.toHaveBeenCalled();
    expect(tlSetResultMock).toHaveBeenCalledWith(
      'Failed',
      expect.stringContaining(
        `Input 'manifestFileJs' must reference an existing file. File not found: ${missingPath}`
      )
    );
  });

  it('fails early when overridesFile does not exist', async () => {
    const missingPath = '/tmp/missing-overrides.json';
    const platform = createPlatformMock({
      inputs: {
        operation: 'package',
        tfxVersion: 'built-in',
        overridesFile: missingPath,
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
      fileExists: {
        [missingPath]: false,
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(packageExtensionMock).not.toHaveBeenCalled();
    expect(tlSetResultMock).toHaveBeenCalledWith(
      'Failed',
      expect.stringContaining(
        `Input 'overridesFile' must reference an existing file. File not found: ${missingPath}`
      )
    );
  });

  it('does not emit legacy status outputs for operation-only commands', async () => {
    const cases: Array<{
      operation: 'share' | 'unshare' | 'install' | 'waitForValidation' | 'waitForInstallation';
      delimitedInputs?: Record<string, string[]>;
      inputs?: Record<string, string | undefined>;
    }> = [
      {
        operation: 'share',
        delimitedInputs: {
          'accounts|\n': ['org1'],
        },
      },
      {
        operation: 'unshare',
        delimitedInputs: {
          'accounts|\n': ['org1'],
        },
      },
      {
        operation: 'install',
        delimitedInputs: {
          'accounts|;': ['https://dev.azure.com/org1'],
          'accounts|\n': ['https://dev.azure.com/org1'],
        },
      },
      {
        operation: 'waitForValidation',
        delimitedInputs: {
          'manifestFile|\n': ['vss-extension.json'],
        },
      },
      {
        operation: 'waitForInstallation',
        delimitedInputs: {
          'accounts|;': ['https://dev.azure.com/org1'],
          'accounts|\n': ['https://dev.azure.com/org1'],
        },
      },
    ];

    waitForValidationMock.mockImplementation(async () => ({ status: 'success' }));

    for (const testCase of cases) {
      const platform = createPlatformMock({
        inputs: {
          operation: testCase.operation,
          connectionType: 'PAT',
          connectionNamePAT: 'svc-connection',
          publisherId: 'publisher',
          extensionId: 'extension',
          ...testCase.inputs,
        },
        delimitedInputs: testCase.delimitedInputs,
      });
      azdoAdapterCtorMock.mockReturnValue(platform);

      await importMainAndFlush();

      expect(tlSetResultMock).not.toHaveBeenCalledWith('Failed', expect.anything());
      expectNoLegacyStatusOutputs(platform);
    }
  });

  it('accepts manual YAML casing for connectionType', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'publish',
        tfxVersion: 'built-in',
        connectionType: 'azurerm',
        connectionNameAzureRm: 'svc-connection',
        use: 'manifest',
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(getAuthMock).toHaveBeenCalledWith('azurerm', 'svc-connection', platform);
    expect(publishExtensionMock).toHaveBeenCalled();
  });

  it('uses workload identity service connection input for WorkloadIdentity type', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'publish',
        tfxVersion: 'built-in',
        connectionType: 'WorkloadIdentity',
        connectionNameWorkloadIdentity: 'wif-connection',
        use: 'manifest',
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(getAuthMock).toHaveBeenCalledWith('WorkloadIdentity', 'wif-connection', platform);
    expect(publishExtensionMock).toHaveBeenCalled();
  });

  it('executes show operation and emits extension metadata output', async () => {
    const metadata = { id: 'extension', version: '1.0.0' };
    showExtensionMock.mockImplementation(async () => ({ metadata }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'show',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('extensionMetadata', JSON.stringify(metadata));
  });

  it('sets installed output when install succeeds', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'install',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
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
  });

  it('forwards publish manifest editor options', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'publish',
        tfxVersion: 'built-in',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        use: 'manifest',
        outputPath: '/out',
        extensionVisibility: 'public_preview',
        extensionPricing: 'paid',
        updateTasksVersion: 'patch',
      },
      boolInputs: {
        updateTasksId: true,
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(publishExtensionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publishSource: 'manifest',
        outputPath: '/out',
        extensionVisibility: 'public_preview',
        extensionPricing: 'paid',
        updateTasksVersion: 'patch',
        updateTasksId: true,
      }),
      expect.anything(),
      expect.anything(),
      platform
    );
  });

  it('sets shared output when share succeeds', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'share',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'accounts|\n': ['org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(shareExtensionMock).toHaveBeenCalled();
  });

  it('sets unshared output when unshare succeeds', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'unshare',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'accounts|\n': ['org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(unshareExtensionMock).toHaveBeenCalled();
  });

  it('fails install operation when not all accounts succeed', async () => {
    installExtensionMock.mockImplementationOnce(async () => ({ allSuccess: false }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'install',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
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

  it('fails waitForInstallation when expectedTasks is invalid JSON', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'waitForInstallation',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
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

  it('executes queryVersion and updates build number when requested', async () => {
    queryVersionMock.mockImplementation(async () => ({
      proposedVersion: '2.0.0',
      currentVersion: '1.0.0',
    }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'queryVersion',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
        versionAction: 'MAJOR',
      },
      boolInputs: {
        setBuildNumber: true,
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(queryVersionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        marketplaceVersionAction: 'Major',
      }),
      expect.anything(),
      expect.anything(),
      platform
    );
    expect(tlCommandMock).toHaveBeenCalledWith('build.updatebuildnumber', undefined, '2.0.0');
    expect(platform.setOutput).toHaveBeenCalledWith('proposedVersion', '2.0.0');
    expect(platform.setOutput).toHaveBeenCalledWith('currentVersion', '1.0.0');
  });

  it('skips auth when queryVersion versionSource excludes marketplace', async () => {
    versionSourceNeedsMarketplaceMock.mockReturnValue(false);
    queryVersionMock.mockImplementation(async () => ({
      proposedVersion: '3.0.0',
      currentVersion: '3.0.0',
    }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'queryVersion',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'versionSource|\n': ['manifest'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(versionSourceNeedsMarketplaceMock).toHaveBeenCalledWith(['manifest']);
    expect(getAuthMock).not.toHaveBeenCalled();
    expect(queryVersionMock).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      expect.anything(),
      platform
    );
    expect(platform.setOutput).toHaveBeenCalledWith('proposedVersion', '3.0.0');
    expect(platform.setResult).toHaveBeenCalledWith(
      'Succeeded',
      'queryVersion completed successfully'
    );
  });

  it('initializes queryVersion outputs before query execution and keeps them empty on failure', async () => {
    queryVersionMock.mockImplementationOnce(async () => {
      throw new Error('tfx failed');
    });

    const platform = createPlatformMock({
      inputs: {
        operation: 'queryVersion',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
        versionAction: 'patch',
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('proposedVersion', '');
    expect(platform.setOutput).toHaveBeenCalledWith('currentVersion', '');
    expect(tlSetResultMock).toHaveBeenCalledWith('Failed', 'tfx failed');
  });

  it('initializes declared task outputs before input validation', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'package',
        tfxVersion: 'built-in',
        extensionVersion: 'invalid-version',
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(platform.setOutput).toHaveBeenCalledWith('vsixPath', '');
    expect(platform.setOutput).toHaveBeenCalledWith('extensionMetadata', '');
    expect(platform.setOutput).toHaveBeenCalledWith('proposedVersion', '');
    expect(platform.setOutput).toHaveBeenCalledWith('currentVersion', '');
  });

  it('sets waitForInstallation output when verification succeeds', async () => {
    getAuthMock.mockImplementationOnce(async () => ({
      token: 'token',
      serviceUrl: 'https://marketplace.visualstudio.com',
    }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'waitForInstallation',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
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

    expect(waitForInstallationMock).toHaveBeenCalled();
    expect(validateAccountUrlMock).not.toHaveBeenCalledWith('https://marketplace.visualstudio.com');
    expect(validateAccountUrlMock).toHaveBeenCalledWith('https://dev.azure.com/org1');
  });

  it('passes vsixFile to waitForInstallation even when use is manifest', async () => {
    const vsixPath = '/tmp/my-extension.vsix';
    const platform = createPlatformMock({
      inputs: {
        operation: 'waitForInstallation',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        use: 'manifest',
        vsixFile: vsixPath,
      },
      delimitedInputs: {
        'accounts|;': ['https://dev.azure.com/org1'],
        'accounts|\n': ['https://dev.azure.com/org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(waitForInstallationMock).toHaveBeenCalledWith(
      expect.objectContaining({ vsixPath }),
      expect.anything(),
      platform
    );
  });

  it('forwards manifestFile for identity fallback in install', async () => {
    const platform = createPlatformMock({
      inputs: {
        operation: 'install',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
        'accounts|;': ['https://dev.azure.com/org1'],
        'accounts|\n': ['https://dev.azure.com/org1'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(installExtensionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        manifestGlobs: ['vss-extension.json'],
      }),
      expect.anything(),
      expect.anything(),
      platform
    );
  });

  it('fails waitForValidation when status is not success', async () => {
    waitForValidationMock.mockImplementation(async () => ({ status: 'failed' }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'waitForValidation',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(waitForValidationMock).toHaveBeenCalled();
    expect(tlSetResultMock).toHaveBeenCalledWith('Failed', 'Validation failed with status: failed');
  });

  it('sets waitForValidation output when validation succeeds', async () => {
    waitForValidationMock.mockImplementation(async () => ({ status: 'success' }));

    const platform = createPlatformMock({
      inputs: {
        operation: 'waitForValidation',
        connectionType: 'PAT',
        connectionNamePAT: 'svc-connection',
        publisherId: 'publisher',
        extensionId: 'extension',
        extensionVersion: '1.2.3',
        timeoutMinutes: '12',
        pollingIntervalSeconds: '45',
      },
      delimitedInputs: {
        'manifestFile|\n': ['vss-extension.json'],
      },
    });
    azdoAdapterCtorMock.mockReturnValue(platform);

    await importMainAndFlush();

    expect(waitForValidationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extensionVersion: '1.2.3',
        timeoutMinutes: 12,
        pollingIntervalSeconds: 45,
      }),
      expect.anything(),
      expect.anything(),
      platform
    );
    expect(waitForValidationMock).toHaveBeenCalled();
  });
});
