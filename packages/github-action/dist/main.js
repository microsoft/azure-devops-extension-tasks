import * as core from '@actions/core';
import { installExtension, packageExtension, publishExtension, queryVersion, shareExtension, showExtension, TaskResult, TfxManager, unpublishExtension, unshareExtension, validateAccountUrl, validateAzureCliAvailable, validateExtensionId, validateNodeAvailable, validateNpmAvailable, validatePublisherId, validateTfxAvailable, validateVersion, waitForInstallation, waitForValidation, normalizeAccountToServiceUrl, } from '@extension-tasks/core';
import { getAuth } from './auth/index.js';
import { GitHubAdapter } from './github-adapter.js';
async function run() {
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
        // Create TfxManager
        const tfxVersion = platform.getInput('tfx-version') || 'built-in';
        // Validate binaries based on tfx version mode
        if (tfxVersion === 'path') {
            // User wants to use tfx from PATH
            await validateTfxAvailable(platform);
        }
        else if (tfxVersion !== 'built-in') {
            // Version spec mode - need npm to download
            await validateNpmAvailable(platform);
        }
        const tfxManager = new TfxManager({ tfxVersion: tfxVersion, platform });
        // Get authentication if needed (not required for package)
        let auth;
        if (operation !== 'package') {
            const authType = (platform.getInput('auth-type') || 'pat');
            // For OIDC auth, validate Azure CLI is available
            if (authType === 'oidc') {
                await validateAzureCliAvailable(platform);
            }
            // Get authentication credentials with optional service/marketplace URLs
            const token = platform.getInput('token');
            const username = platform.getInput('username');
            const password = platform.getInput('password');
            const serviceUrl = operation === 'install' || operation === 'wait-for-installation'
                ? undefined
                : platform.getInput('service-url');
            auth = await getAuth(authType, platform, {
                token,
                username,
                password,
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.setFailed(message);
    }
}
async function runPackage(platform, tfxManager) {
    const options = {
        rootFolder: platform.getInput('root-folder'),
        manifestGlobs: platform.getDelimitedInput('manifest-globs', '\n'),
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        extensionVersion: platform.getInput('extension-version'),
        extensionName: platform.getInput('extension-name'),
        extensionVisibility: platform.getInput('extension-visibility'),
        updateTasksVersion: platform.getBoolInput('update-tasks-version'),
        updateTasksId: platform.getBoolInput('update-tasks-id'),
        outputPath: platform.getInput('output-path'),
        bypassValidation: platform.getBoolInput('bypass-validation'),
        revVersion: platform.getBoolInput('rev-version'),
    };
    const result = await packageExtension(options, tfxManager, platform);
    if (result.vsixPath) {
        platform.setOutput('vsix-path', result.vsixPath);
    }
}
async function runPublish(platform, tfxManager, auth) {
    const publishSource = platform.getInput('publish-source', true);
    const result = await publishExtension({
        publishSource,
        vsixFile: publishSource === 'vsix' ? platform.getInput('vsix-file', true) : undefined,
        manifestGlobs: publishSource === 'manifest'
            ? platform.getDelimitedInput('manifest-globs', '\n', true)
            : undefined,
        rootFolder: publishSource === 'manifest' ? platform.getInput('root-folder') : undefined,
        publisherId: platform.getInput('publisher-id'),
        extensionId: platform.getInput('extension-id'),
        extensionVersion: platform.getInput('extension-version'),
        extensionName: platform.getInput('extension-name'),
        extensionVisibility: platform.getInput('extension-visibility'),
        shareWith: platform.getDelimitedInput('share-with', '\n'),
        noWaitValidation: platform.getBoolInput('no-wait-validation'),
        bypassValidation: platform.getBoolInput('bypass-validation'),
        updateTasksVersion: platform.getBoolInput('update-tasks-version'),
        updateTasksId: platform.getBoolInput('update-tasks-id'),
    }, auth, tfxManager, platform);
    if (result.vsixPath) {
        platform.setOutput('vsix-path', result.vsixPath);
    }
    platform.debug(`Published: ${JSON.stringify(result)}`);
}
async function runUnpublish(platform, tfxManager, auth) {
    await unpublishExtension({
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
    }, auth, tfxManager, platform);
}
async function runShare(platform, tfxManager, auth) {
    await shareExtension({
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
        shareWith: platform.getDelimitedInput('accounts', '\n', true),
    }, auth, tfxManager, platform);
}
async function runUnshare(platform, tfxManager, auth) {
    await unshareExtension({
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
        unshareWith: platform.getDelimitedInput('accounts', '\n', true),
    }, auth, tfxManager, platform);
}
async function runInstall(platform, tfxManager, auth) {
    const result = await installExtension({
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
        accounts: platform.getDelimitedInput('accounts', '\n', true),
    }, auth, tfxManager, platform);
    if (!result.allSuccess) {
        throw new Error(`Some accounts failed to install the extension`);
    }
}
async function runShow(platform, tfxManager, auth) {
    const options = {
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
    };
    const result = await showExtension(options, auth, tfxManager, platform);
    if (result.metadata) {
        platform.setOutput('extension-metadata', JSON.stringify(result.metadata));
    }
}
async function runQueryVersion(platform, tfxManager, auth) {
    const result = await queryVersion({
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
        versionAction: platform.getInput('version-action') ?? 'None',
        extensionVersionOverrideVariable: platform.getInput('extension-version-override'),
    }, auth, tfxManager, platform);
    platform.setOutput('proposed-version', result.proposedVersion);
    platform.setOutput('current-version', result.currentVersion);
}
async function runWaitForValidation(platform, tfxManager, auth) {
    const result = await waitForValidation({
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
        rootFolder: platform.getInput('root-folder'),
        manifestGlobs: platform.getDelimitedInput('manifest-globs', '\n'),
        maxRetries: parseInt(platform.getInput('max-retries') || '10'),
        minTimeout: parseInt(platform.getInput('min-timeout') || '1'),
        maxTimeout: parseInt(platform.getInput('max-timeout') || '15'),
    }, auth, tfxManager, platform);
    if (result.status !== 'success') {
        throw new Error(`Validation failed with status: ${result.status}`);
    }
}
async function runWaitForInstallation(platform, auth) {
    const expectedTasksInput = platform.getInput('expected-tasks');
    let expectedTasks;
    if (expectedTasksInput) {
        try {
            expectedTasks = JSON.parse(expectedTasksInput);
        }
        catch (error) {
            throw new Error(`Failed to parse expected-tasks: ${error}`);
        }
    }
    const result = await waitForInstallation({
        publisherId: platform.getInput('publisher-id', true),
        extensionId: platform.getInput('extension-id', true),
        accounts: platform.getDelimitedInput('accounts', '\n', true),
        expectedTasks,
        manifestPath: platform.getInput('manifest-path'),
        vsixPath: platform.getInput('vsix-path'),
        timeoutMinutes: parseInt(platform.getInput('timeout-minutes') || '10'),
        pollingIntervalSeconds: parseInt(platform.getInput('polling-interval-seconds') || '30'),
    }, auth, platform);
    if (!result.success) {
        throw new Error(`Verification failed - not all tasks are available`);
    }
}
// Run the action
void run();
//# sourceMappingURL=main.js.map