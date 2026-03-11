import {
  AuthCredentials,
  installExtension,
  normalizeAccountToServiceUrl,
  packageExtension,
  publishExtension,
  queryVersion,
  shareExtension,
  showExtension,
  TaskResult,
  TfxManager,
  unpublishExtension,
  unshareExtension,
  validateAccountUrl,
  validateExtensionId,
  validateNodeAvailable,
  validateNpmAvailable,
  validatePublisherId,
  validateTfxAvailable,
  validateVersion,
  waitForInstallation,
  waitForValidation,
} from '@extension-tasks/core';
import * as tl from 'azure-pipelines-task-lib/task.js';
import { getAuth } from './auth/index.js';
import { AzdoAdapter } from './azdo-adapter.js';

function normalizeOperation(operation: string): string {
  switch (operation.trim()) {
    case 'query-version':
      return 'queryVersion';
    case 'wait-for-validation':
      return 'waitForValidation';
    case 'wait-for-installation':
      return 'waitForInstallation';
    default:
      return operation;
  }
}

function initializeDeclaredOutputs(platform: AzdoAdapter): void {
  platform.setOutput('vsixPath', '');
  platform.setOutput('extensionMetadata', '');
  platform.setOutput('proposedVersion', '');
  platform.setOutput('currentVersion', '');
}

async function validateSingleFileInputs(
  platform: AzdoAdapter,
  inputs: Array<{ name: string; value: string | undefined }>
): Promise<void> {
  for (const input of inputs) {
    if (!input.value) {
      continue;
    }

    const exists = await platform.fileExists(input.value);
    if (!exists) {
      throw new Error(
        `Input '${input.name}' must reference an existing file. File not found: ${input.value}`
      );
    }
  }
}

async function run(): Promise<void> {
  try {
    const platform = new AzdoAdapter();
    process.env.AZDO_TASK_FORCE_TFX_VERBOSE = 'true';

    // Validate node is available (always required)
    await validateNodeAvailable(platform);

    // Get the operation to perform
    const rawOperation = platform.getInput('operation', true);
    if (!rawOperation) {
      throw new Error('Operation is required');
    }
    const operation = normalizeOperation(rawOperation);

    initializeDeclaredOutputs(platform);

    platform.debug(`Starting operation: ${operation}`);

    // Validate common inputs early to fail fast
    const publisherId = platform.getInput('publisherId');
    if (publisherId) {
      validatePublisherId(publisherId);
    }

    const extensionId = platform.getInput('extensionId');
    if (extensionId) {
      validateExtensionId(extensionId);
    }

    const extensionVersion = platform.getInput('extensionVersion');
    if (extensionVersion) {
      if (operation === 'install') {
        throw new Error('install does not support extensionVersion');
      }
      validateVersion(extensionVersion);
    }

    await validateSingleFileInputs(platform, [
      { name: 'vsixFile', value: platform.getPathInput('vsixFile') },
      { name: 'manifestFileJs', value: platform.getPathInput('manifestFileJs') },
      { name: 'overridesFile', value: platform.getPathInput('overridesFile') },
    ]);

    // Create TfxManager
    const tfxVersion = platform.getInput('tfxVersion') || 'built-in';

    // Validate binaries based on tfx version mode
    if (tfxVersion === 'path') {
      // User wants to use tfx from PATH
      await validateTfxAvailable(platform);
    } else if (tfxVersion !== 'built-in') {
      // Version spec mode - need npm to download
      await validateNpmAvailable(platform);
    }

    const tfxManager = new TfxManager({ tfxVersion: tfxVersion, platform });

    // Get authentication if needed (not required for package)
    let auth;
    if (operation !== 'package') {
      const connectionType = platform.getInput('connectionType', true);
      const normalizedConnectionType = connectionType.trim().toLowerCase();

      // Get the appropriate connection name based on type
      let connectionName: string | undefined;
      if (normalizedConnectionType === 'pat') {
        connectionName = platform.getInput('connectionNamePAT', true);
      } else if (normalizedConnectionType === 'workloadidentity') {
        connectionName = platform.getInput('connectionNameWorkloadIdentity', true);
      } else if (normalizedConnectionType === 'azurerm') {
        connectionName = platform.getInput('connectionNameAzureRm', true);
      } else if (normalizedConnectionType === 'basic') {
        connectionName = platform.getInput('connectionNameBasic', true);
      }

      if (!connectionName) {
        throw new Error('Service connection name is required for this operation');
      }

      auth = await getAuth(connectionType, connectionName, platform);

      // Validate service URL if present
      if (operation !== 'install' && operation !== 'waitForInstallation' && auth.serviceUrl) {
        validateAccountUrl(auth.serviceUrl);
      }
    }

    // Validate account URLs for operations that need them
    if (operation === 'install' || operation === 'waitForInstallation') {
      const accounts = platform.getDelimitedInput('accounts', ';', false);
      accounts.forEach((account) => {
        if (account) {
          validateAccountUrl(normalizeAccountToServiceUrl(account));
        }
      });
    }

    // Route to appropriate command
    switch (operation) {
      case 'package':
        await runPackage(platform, tfxManager);
        break;

      case 'publish':
        await runPublish(platform, tfxManager, auth);
        break;

      case 'unpublish':
        await runUnpublish(platform, tfxManager, auth);
        break;

      case 'share':
        await runShare(platform, tfxManager, auth);
        break;

      case 'unshare':
        await runUnshare(platform, tfxManager, auth);
        break;

      case 'install':
        await runInstall(platform, tfxManager, auth);
        break;

      case 'show':
        await runShow(platform, tfxManager, auth);
        break;

      case 'queryVersion':
        await runQueryVersion(platform, tfxManager, auth);
        break;

      case 'waitForValidation':
        await runWaitForValidation(platform, tfxManager, auth);
        break;

      case 'waitForInstallation':
        await runWaitForInstallation(platform, auth);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    platform.info('✅ Operation completed successfully');
    platform.setResult(TaskResult.Succeeded, `${operation} completed successfully`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    tl.error(message);
    tl.setResult(tl.TaskResult.Failed, message);
  }
}

function getUpdateTasksVersionMode(
  platform: AzdoAdapter
): 'none' | 'major' | 'minor' | 'patch' | undefined {
  const value = platform.getInput('updateTasksVersion');
  if (!value) {
    return undefined;
  }

  if (value === 'none' || value === 'major' || value === 'minor' || value === 'patch') {
    return value;
  }

  throw new Error(
    `Invalid updateTasksVersion value '${value}'. Expected one of: none, major, minor, patch.`
  );
}

async function runPackage(platform: AzdoAdapter, tfxManager: TfxManager): Promise<void> {
  const extensionPricingInput = platform.getInput('extensionPricing');

  const options = {
    localizationRoot: platform.getPathInput('localizationRoot'),
    manifestGlobs: platform.getDelimitedInput('manifestFile', '\n'),
    manifestFileJs: platform.getPathInput('manifestFileJs'),
    overridesFile: platform.getPathInput('overridesFile'),
    publisherId: platform.getInput('publisherId'),
    extensionId: platform.getInput('extensionId'),
    extensionVersion: platform.getInput('extensionVersion'),
    extensionName: platform.getInput('extensionName'),
    extensionVisibility: platform.getInput('extensionVisibility') as
      | 'private'
      | 'public'
      | 'private_preview'
      | 'public_preview'
      | undefined,
    extensionPricing:
      extensionPricingInput && extensionPricingInput !== 'default'
        ? (extensionPricingInput as 'free' | 'paid' | 'trial')
        : undefined,
    updateTasksVersion: getUpdateTasksVersionMode(platform),
    updateTasksId: platform.getBoolInput('updateTasksId'),
    outputPath: platform.getPathInput('outputPath'),
    bypassValidation: platform.getBoolInput('bypassValidation'),
  };

  const result = await packageExtension(options, tfxManager, platform);

  if (result.vsixPath) {
    platform.setOutput('vsixPath', result.vsixPath);
  }
}

async function runPublish(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const use = platform.getInput('use', true) as 'manifest' | 'vsix';
  const extensionPricingInput = platform.getInput('extensionPricing');

  const result = await publishExtension(
    {
      publishSource: use,
      vsixFile: use === 'vsix' ? platform.getPathInput('vsixFile', true) : undefined,
      manifestGlobs:
        use === 'manifest' ? platform.getDelimitedInput('manifestFile', '\n') : undefined,
      manifestFileJs: use === 'manifest' ? platform.getPathInput('manifestFileJs') : undefined,
      overridesFile: use === 'manifest' ? platform.getPathInput('overridesFile') : undefined,
      localizationRoot: use === 'manifest' ? platform.getPathInput('localizationRoot') : undefined,
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      extensionVersion: platform.getInput('extensionVersion'),
      extensionName: platform.getInput('extensionName'),
      extensionVisibility: platform.getInput('extensionVisibility') as
        | 'private'
        | 'public'
        | 'private_preview'
        | 'public_preview'
        | undefined,
      extensionPricing:
        extensionPricingInput && extensionPricingInput !== 'default'
          ? (extensionPricingInput as 'free' | 'paid' | 'trial')
          : undefined,
      outputPath: platform.getPathInput('outputPath'),
      noWaitValidation: platform.getBoolInput('noWaitValidation'),
      bypassValidation: platform.getBoolInput('bypassValidation'),
      updateTasksVersion: getUpdateTasksVersionMode(platform),
      updateTasksId: platform.getBoolInput('updateTasksId'),
    },
    auth,
    tfxManager,
    platform
  );

  platform.debug(`Published: ${JSON.stringify(result)}`);
}

async function runUnpublish(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await unpublishExtension(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getPathInput('vsixFile') || platform.getInput('vsixPath'),
      manifestGlobs: platform.getDelimitedInput('manifestFile', '\n'),
    },
    auth,
    tfxManager,
    platform
  );
}

async function runShare(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await shareExtension(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getPathInput('vsixFile') || platform.getInput('vsixPath'),
      manifestGlobs: platform.getDelimitedInput('manifestFile', '\n'),
      shareWith: platform.getDelimitedInput('accounts', '\n', true),
    },
    auth,
    tfxManager,
    platform
  );
}

async function runUnshare(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await unshareExtension(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getPathInput('vsixFile') || platform.getInput('vsixPath'),
      manifestGlobs: platform.getDelimitedInput('manifestFile', '\n'),
      unshareWith: platform.getDelimitedInput('accounts', '\n', true),
    },
    auth,
    tfxManager,
    platform
  );
}

async function runInstall(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const result = await installExtension(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getPathInput('vsixFile') || platform.getInput('vsixPath'),
      manifestGlobs: platform.getDelimitedInput('manifestFile', '\n'),
      accounts: platform.getDelimitedInput('accounts', '\n', true),
    },
    auth,
    tfxManager,
    platform
  );

  if (!result.allSuccess) {
    throw new Error(`Some accounts failed to install the extension`);
  }
}

async function runShow(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const options = {
    publisherId: platform.getInput('publisherId', true),
    extensionId: platform.getInput('extensionId', true),
  };

  const result = await showExtension(options, auth, tfxManager, platform);

  if (result.metadata) {
    platform.setOutput('extensionMetadata', JSON.stringify(result.metadata));
  }
}

async function runQueryVersion(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: any
): Promise<void> {
  const normalizedVersionAction = (() => {
    const input = (platform.getInput('versionAction') ?? 'none').trim().toLowerCase();
    if (input === 'major') {
      return 'Major' as const;
    }
    if (input === 'minor') {
      return 'Minor' as const;
    }
    if (input === 'patch') {
      return 'Patch' as const;
    }
    return 'None' as const;
  })();

  const result = await queryVersion(
    {
      publisherId: platform.getInput('publisherId') || undefined,
      extensionId: platform.getInput('extensionId') || undefined,
      versionAction: normalizedVersionAction,
      extensionVersionOverrideVariable: platform.getInput('extensionVersionOverride'),
      use: (platform.getInput('use') || 'manifest') as 'manifest' | 'vsix',
      vsixFile: platform.getPathInput('vsixFile') || undefined,
      manifestGlobs: platform.getDelimitedInput('manifestFile', '\n'),
    },
    auth,
    tfxManager,
    platform
  );

  if (platform.getBoolInput('setBuildNumber')) {
    tl.command('build.updatebuildnumber', undefined, result.proposedVersion);
  }

  platform.setOutput('proposedVersion', result.proposedVersion);
  platform.setOutput('currentVersion', result.currentVersion);
}

async function runWaitForValidation(
  platform: AzdoAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const timeoutMinutesInput = platform.getInput('timeoutMinutes');
  const pollingIntervalSecondsInput = platform.getInput('pollingIntervalSeconds');

  const result = await waitForValidation(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      vsixPath: platform.getPathInput('vsixFile') || platform.getInput('vsixPath'),
      manifestGlobs: platform.getDelimitedInput('manifestFile', '\n'),
      extensionVersion: platform.getInput('extensionVersion'),
      timeoutMinutes: timeoutMinutesInput ? parseInt(timeoutMinutesInput, 10) : undefined,
      pollingIntervalSeconds: pollingIntervalSecondsInput
        ? parseInt(pollingIntervalSecondsInput, 10)
        : undefined,
    },
    auth,
    tfxManager,
    platform
  );

  if (result.status !== 'success') {
    throw new Error(`Validation failed with status: ${result.status}`);
  }
}

async function runWaitForInstallation(platform: AzdoAdapter, auth: AuthCredentials): Promise<void> {
  const use = platform.getInput('use') as 'manifest' | 'vsix' | undefined;
  const vsixPath = platform.getPathInput('vsixFile') || platform.getInput('vsixPath');
  const expectedTasksInput = platform.getInput('expectedTasks');
  let expectedTasks;
  if (expectedTasksInput) {
    try {
      expectedTasks = JSON.parse(expectedTasksInput);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const wrappedError = new Error(`Failed to parse expectedTasks: ${errorMessage}`) as Error & {
        cause?: unknown;
      };
      wrappedError.cause = error;
      throw wrappedError;
    }
  }

  const result = await waitForInstallation(
    {
      publisherId: platform.getInput('publisherId'),
      extensionId: platform.getInput('extensionId'),
      accounts: platform.getDelimitedInput('accounts', '\n', true),
      expectedTasks,
      manifestFiles:
        use === 'manifest' ? platform.getDelimitedInput('manifestFile', '\n') : undefined,
      vsixPath,
      timeoutMinutes: parseInt(platform.getInput('timeoutMinutes') || '10'),
      pollingIntervalSeconds: parseInt(platform.getInput('pollingIntervalSeconds') || '30'),
    },
    auth,
    platform
  );

  if (!result.success) {
    throw new Error(`Verification failed - not all tasks are available`);
  }
}

// Run the task
void run();
