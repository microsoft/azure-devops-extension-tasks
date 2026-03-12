import * as core from '@actions/core';
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
  validateAzureCliAvailable,
  validateExtensionId,
  validateNodeAvailable,
  validateNpmAvailable,
  validatePublisherId,
  validateTfxAvailable,
  validateVersion,
  versionSourceNeedsMarketplace,
  waitForInstallation,
  waitForValidation,
} from '@extension-tasks/core';
import { AuthType, getAuth } from './auth/index.js';
import { GitHubAdapter } from './github-adapter.js';

async function validateSingleFileInputs(
  platform: GitHubAdapter,
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
    const platform = new GitHubAdapter();

    // Validate node is available (always required)
    await validateNodeAvailable(platform);

    // Get the operation to perform
    const operation = platform.getInput('operation', true);
    if (!operation) {
      throw new Error('Operation is required');
    }

    platform.debug(`Starting operation: ${operation}`);

    // Validate common inputs early to fail fast
    const publisherId = platform.getInput('publisher-id');
    if (publisherId) {
      validatePublisherId(publisherId);
    }

    const extensionId = platform.getInput('extension-id');
    if (extensionId) {
      validateExtensionId(extensionId);
    }

    const extensionVersion = platform.getInput('extension-version');
    if (extensionVersion) {
      if (operation === 'install') {
        throw new Error('install does not support extension-version');
      }
      validateVersion(extensionVersion);
    }

    await validateSingleFileInputs(platform, [
      { name: 'vsix-file', value: platform.getInput('vsix-file') },
      { name: 'manifest-file-js', value: platform.getInput('manifest-file-js') },
      { name: 'overrides-file', value: platform.getInput('overrides-file') },
    ]);

    // Create TfxManager
    const tfxVersion = platform.getInput('tfx-version') || 'built-in';

    // Validate binaries based on tfx version mode
    if (tfxVersion === 'path') {
      // User wants to use tfx from PATH
      await validateTfxAvailable(platform);
    } else if (tfxVersion !== 'built-in') {
      // Version spec mode - need npm to download
      await validateNpmAvailable(platform);
    }

    const tfxManager = new TfxManager({ tfxVersion: tfxVersion, platform });

    // Get authentication if needed (not required for package; conditional for query-version)
    let auth: AuthCredentials | undefined;
    const needsAuth = (() => {
      if (operation === 'package') {
        return false;
      }
      if (operation === 'query-version') {
        const versionSourceLines = platform.getDelimitedInput('version-source', '\n', false);
        return versionSourceNeedsMarketplace(
          versionSourceLines.length > 0 ? versionSourceLines : undefined
        );
      }
      return true;
    })();

    if (needsAuth) {
      const authType = (platform.getInput('auth-type') || 'pat') as AuthType;

      // For OIDC auth, validate Azure CLI is available
      if (authType === 'oidc') {
        await validateAzureCliAvailable(platform);
      }

      // Get authentication credentials with optional service/marketplace URLs
      const token = platform.getInput('token');
      const username = platform.getInput('username');
      const serviceUrl =
        operation === 'install' || operation === 'wait-for-installation'
          ? undefined
          : platform.getInput('service-url');

      auth = await getAuth(authType, platform, {
        token,
        username,
        serviceUrl,
      });

      // Secret masking is now handled inside auth providers
      // But we keep this as defense in depth
      if (auth.token) {
        platform.setSecret(auth.token);
      }
      if (auth.password) {
        platform.setSecret(auth.password);
      }

      // Validate service URL if present
      if (operation !== 'install' && operation !== 'wait-for-installation' && auth.serviceUrl) {
        validateAccountUrl(auth.serviceUrl);
      }
    }

    // Validate account URLs for operations that need them
    if (operation === 'install' || operation === 'wait-for-installation') {
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

      case 'query-version':
        await runQueryVersion(platform, tfxManager, auth);
        break;

      case 'wait-for-validation':
        await runWaitForValidation(platform, tfxManager, auth);
        break;

      case 'wait-for-installation':
        await runWaitForInstallation(platform, auth);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    platform.info('✅ Operation completed successfully');
    platform.setResult(TaskResult.Succeeded, `${operation} completed successfully`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
  }
}

function getUpdateTasksVersionMode(
  platform: GitHubAdapter
): 'none' | 'major' | 'minor' | 'patch' | undefined {
  const value = platform.getInput('update-tasks-version');
  if (!value) {
    return undefined;
  }

  if (value === 'none' || value === 'major' || value === 'minor' || value === 'patch') {
    return value;
  }

  throw new Error(
    `Invalid update-tasks-version value '${value}'. Expected one of: none, major, minor, patch.`
  );
}

async function runPackage(platform: GitHubAdapter, tfxManager: TfxManager): Promise<void> {
  const extensionPricingInput = platform.getInput('extension-pricing');

  const options = {
    localizationRoot: platform.getInput('localization-root'),
    manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
    manifestFileJs: platform.getInput('manifest-file-js'),
    overridesFile: platform.getInput('overrides-file'),
    publisherId: platform.getInput('publisher-id'),
    extensionId: platform.getInput('extension-id'),
    extensionVersion: platform.getInput('extension-version'),
    extensionName: platform.getInput('extension-name'),
    extensionVisibility: platform.getInput('extension-visibility') as
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
    updateTasksId: platform.getBoolInput('update-tasks-id'),
    outputPath: platform.getInput('output-path'),
    bypassValidation: platform.getBoolInput('bypass-validation'),
  };

  const result = await packageExtension(options, tfxManager, platform);

  if (result.vsixPath) {
    platform.setOutput('vsix-path', result.vsixPath);
  }
}

async function runPublish(
  platform: GitHubAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const useInput = platform.getInput('use');
  const publishSource = (useInput || 'manifest') as 'manifest' | 'vsix';
  const extensionPricingInput = platform.getInput('extension-pricing');

  const result = await publishExtension(
    {
      publishSource,
      vsixFile: publishSource === 'vsix' ? platform.getInput('vsix-file', true) : undefined,
      manifestGlobs:
        publishSource === 'manifest'
          ? platform.getDelimitedInput('manifest-file', '\n')
          : undefined,
      manifestFileJs:
        publishSource === 'manifest' ? platform.getInput('manifest-file-js') : undefined,
      overridesFile: publishSource === 'manifest' ? platform.getInput('overrides-file') : undefined,
      localizationRoot:
        publishSource === 'manifest' ? platform.getInput('localization-root') : undefined,
      publisherId: platform.getInput('publisher-id'),
      extensionId: platform.getInput('extension-id'),
      extensionVersion: platform.getInput('extension-version'),
      extensionName: platform.getInput('extension-name'),
      extensionVisibility: platform.getInput('extension-visibility') as any,
      extensionPricing:
        extensionPricingInput && extensionPricingInput !== 'default'
          ? (extensionPricingInput as 'free' | 'paid' | 'trial')
          : undefined,
      outputPath: platform.getInput('output-path'),
      noWaitValidation: platform.getBoolInput('no-wait-validation'),
      bypassValidation: platform.getBoolInput('bypass-validation'),
      updateTasksVersion: getUpdateTasksVersionMode(platform),
      updateTasksId: platform.getBoolInput('update-tasks-id'),
    },
    auth,
    tfxManager,
    platform
  );

  if (result.vsixPath) {
    platform.setOutput('vsix-path', result.vsixPath);
  }

  platform.debug(`Published: ${JSON.stringify(result)}`);
}

async function runUnpublish(
  platform: GitHubAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await unpublishExtension(
    {
      publisherId: platform.getInput('publisher-id'),
      extensionId: platform.getInput('extension-id'),
      vsixPath: platform.getInput('vsix-path'),
      manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
    },
    auth,
    tfxManager,
    platform
  );
}

async function runShare(
  platform: GitHubAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await shareExtension(
    {
      publisherId: platform.getInput('publisher-id'),
      extensionId: platform.getInput('extension-id'),
      vsixPath: platform.getInput('vsix-path'),
      manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
      shareWith: platform.getDelimitedInput('accounts', '\n', true),
    },
    auth,
    tfxManager,
    platform
  );
}

async function runUnshare(
  platform: GitHubAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  await unshareExtension(
    {
      publisherId: platform.getInput('publisher-id'),
      extensionId: platform.getInput('extension-id'),
      vsixPath: platform.getInput('vsix-path'),
      manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
      unshareWith: platform.getDelimitedInput('accounts', '\n', true),
    },
    auth,
    tfxManager,
    platform
  );
}

async function runInstall(
  platform: GitHubAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const result = await installExtension(
    {
      publisherId: platform.getInput('publisher-id'),
      extensionId: platform.getInput('extension-id'),
      vsixPath: platform.getInput('vsix-path'),
      manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
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
  platform: GitHubAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const options = {
    publisherId: platform.getInput('publisher-id', true),
    extensionId: platform.getInput('extension-id', true),
  };

  const result = await showExtension(options, auth, tfxManager, platform);

  if (result.metadata) {
    platform.setOutput('metadata', JSON.stringify(result.metadata));
  }
}

async function runQueryVersion(
  platform: GitHubAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials | undefined
): Promise<void> {
  // Handle deprecated version-action → marketplace-version-action rename
  const newInput = platform.getInput('marketplace-version-action');
  const legacyInput = platform.getInput('version-action');

  if (legacyInput && newInput && legacyInput !== newInput) {
    throw new Error(
      "Both 'version-action' and 'marketplace-version-action' are set with different values. " +
        "Use only 'marketplace-version-action'."
    );
  }
  if (legacyInput && !newInput) {
    platform.warning(
      "Input 'version-action' is deprecated. Use 'marketplace-version-action' instead."
    );
  }

  const versionActionRaw = newInput || legacyInput;

  const normalizedVersionAction = (() => {
    const input = (versionActionRaw ?? 'none').trim().toLowerCase();
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

  // Parse version-source (newline-separated)
  const versionSourceLines = platform.getDelimitedInput('version-source', '\n', false);
  const versionSource = versionSourceLines.length > 0 ? versionSourceLines : undefined;

  // Handle deprecated extension-version-override
  const extensionVersionOverride = platform.getInput('extension-version-override');
  if (extensionVersionOverride) {
    platform.warning(
      "Input 'extension-version-override' is deprecated. Use 'version-source' with a version value instead."
    );
  }

  const result = await queryVersion(
    {
      publisherId: platform.getInput('publisher-id') || undefined,
      extensionId: platform.getInput('extension-id') || undefined,
      marketplaceVersionAction: normalizedVersionAction,
      versionSource,
      extensionVersionOverrideVariable: extensionVersionOverride || undefined,
      use: (platform.getInput('use') || 'manifest') as 'manifest' | 'vsix',
      vsixFile: platform.getInput('vsix-file') || undefined,
      manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
    },
    auth,
    tfxManager,
    platform
  );

  platform.setOutput('proposed-version', result.proposedVersion);
  platform.setOutput('current-version', result.currentVersion);
  platform.setOutput('version-source', result.source);
}

async function runWaitForValidation(
  platform: GitHubAdapter,
  tfxManager: TfxManager,
  auth: AuthCredentials
): Promise<void> {
  const timeoutMinutesInput = platform.getInput('timeout-minutes');
  const pollingIntervalSecondsInput = platform.getInput('polling-interval-seconds');

  const result = await waitForValidation(
    {
      publisherId: platform.getInput('publisher-id'),
      extensionId: platform.getInput('extension-id'),
      vsixPath: platform.getInput('vsix-path'),
      extensionVersion: platform.getInput('extension-version'),
      manifestGlobs: platform.getDelimitedInput('manifest-file', '\n'),
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

async function runWaitForInstallation(
  platform: GitHubAdapter,
  auth: AuthCredentials
): Promise<void> {
  const expectedTasksInput = platform.getInput('expected-tasks');
  let expectedTasks;
  if (expectedTasksInput) {
    try {
      expectedTasks = JSON.parse(expectedTasksInput);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const wrappedError = new Error(`Failed to parse expected-tasks: ${errorMessage}`) as Error & {
        cause?: unknown;
      };
      wrappedError.cause = error;
      throw wrappedError;
    }
  }

  const result = await waitForInstallation(
    {
      publisherId: platform.getInput('publisher-id'),
      extensionId: platform.getInput('extension-id'),
      accounts: platform.getDelimitedInput('accounts', '\n', true),
      expectedTasks,
      manifestFiles: platform.getDelimitedInput('manifest-file', '\n'),
      vsixPath: platform.getInput('vsix-path'),
      timeoutMinutes: parseInt(platform.getInput('timeout-minutes') || '10'),
      pollingIntervalSeconds: parseInt(platform.getInput('polling-interval-seconds') || '30'),
    },
    auth,
    platform
  );

  if (!result.success) {
    throw new Error(`Verification failed - not all tasks are available`);
  }
}

// Run the action
void run();
