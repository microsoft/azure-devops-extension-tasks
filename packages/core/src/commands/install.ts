/**
 * Install command - Installs an extension to organization(s)
 */

import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import type { AuthCredentials } from '../auth.js';
import { ArgBuilder } from '../arg-builder.js';

/**
 * Options for install command
 */
export interface InstallOptions {
  /** Publisher ID */
  publisherId: string;
  /** Extension ID */
  extensionId: string;
  /** Target organization URLs to install to */
  accounts: string[];
  /** Extension version to install (optional) */
  extensionVersion?: string;
}

/**
 * Result from install command for a single account
 */
export interface InstallAccountResult {
  /** Account URL */
  account: string;
  /** Whether installation succeeded */
  success: boolean;
  /** Whether extension was already installed */
  alreadyInstalled: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Result from install command
 */
export interface InstallResult {
  /** Extension ID that was installed */
  extensionId: string;
  /** Publisher ID */
  publisherId: string;
  /** Results per account */
  accountResults: InstallAccountResult[];
  /** Overall success (all accounts succeeded) */
  allSuccess: boolean;
  /** Exit code from tfx */
  exitCode: number;
}

/**
 * Install an extension to one or more organizations
 * @param options Install options
 * @param auth Authentication credentials
 * @param tfx TfxManager instance
 * @param platform Platform adapter
 * @returns Install result
 */
export async function installExtension(
  options: InstallOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<InstallResult> {
  if (!options.accounts || options.accounts.length === 0) {
    throw new Error('accounts must contain at least one organization URL');
  }

  platform.info(
    `Installing extension ${options.publisherId}.${options.extensionId} to ${options.accounts.length} organization(s)...`
  );

  const extensionId = options.extensionId;

  const accountResults: InstallAccountResult[] = [];
  let overallExitCode = 0;

  // Install to each account
  for (const account of options.accounts) {
    platform.info(`Installing to ${account}...`);

    // Build tfx arguments for this account
    const args = new ArgBuilder()
      .arg(['extension', 'install'])
      .flag('--json')
      .flag('--no-color')
      .option('--publisher', options.publisherId)
      .option('--extension-id', extensionId)
      .option('--service-url', account);

    // Version if specified
    if (options.extensionVersion) {
      args.option('--extension-version', options.extensionVersion);
    }

    // Authentication (using marketplace auth, not account-specific)
    args.option('--auth-type', auth.authType);

    if (auth.authType === 'pat') {
      args.option('--token', auth.token);
      platform.setSecret(auth.token);
    } else if (auth.authType === 'basic') {
      args.option('--username', auth.username);
      args.option('--password', auth.password);
      platform.setSecret(auth.password);
    }

    try {
      // Execute tfx
      const result = await tfx.execute(args.build(), { captureJson: true });

      if (result.exitCode === 0) {
        accountResults.push({
          account,
          success: true,
          alreadyInstalled: false,
        });
        platform.info(`✓ Successfully installed to ${account}`);
      } else {
        // Check if error is "already installed" (TF1590010)
        const stderr = result.stderr || '';
        const alreadyInstalled = stderr.includes('TF1590010');

        if (alreadyInstalled) {
          accountResults.push({
            account,
            success: true,
            alreadyInstalled: true,
          });
          platform.warning(`Extension already installed in ${account} - continuing`);
        } else {
          accountResults.push({
            account,
            success: false,
            alreadyInstalled: false,
            error: `Exit code ${result.exitCode}`,
          });
          platform.error(`✗ Failed to install to ${account}: exit code ${result.exitCode}`);
          overallExitCode = result.exitCode;
        }
      }
    } catch (err) {
      accountResults.push({
        account,
        success: false,
        alreadyInstalled: false,
        error: String(err),
      });
      platform.error(`✗ Failed to install to ${account}: ${err}`);
      overallExitCode = 1;
    }
  }

  const allSuccess = accountResults.every((r) => r.success);
  const successCount = accountResults.filter((r) => r.success).length;

  platform.info(`Installation complete: ${successCount}/${options.accounts.length} succeeded`);

  return {
    extensionId,
    publisherId: options.publisherId,
    accountResults,
    allSuccess,
    exitCode: overallExitCode,
  };
}
