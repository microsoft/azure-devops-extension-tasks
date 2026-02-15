/**
 * WaitForValidation command - Validates extension against marketplace with retry
 */

import { ArgBuilder } from '../arg-builder.js';
import type { AuthCredentials } from '../auth.js';
import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';

/**
 * Validation status from marketplace
 */
export type ValidationStatus = 'pending' | 'success' | 'failed' | 'error';

/**
 * Options for waitForValidation command
 */
export interface WaitForValidationOptions {
  /** Publisher ID */
  publisherId: string;
  /** Extension ID */
  extensionId: string;
  /** Root folder for manifest (if validating from manifest) */
  rootFolder?: string;
  /** Manifest globs (if validating from manifest) */
  manifestGlobs?: string[];
  /** Max retries for pending validation (default: 10) */
  maxRetries?: number;
  /** Min timeout between retries in minutes (default: 1) */
  minTimeout?: number;
  /** Max timeout between retries in minutes (default: 15) */
  maxTimeout?: number;
}

/**
 * Result from waitForValidation command
 */
export interface WaitForValidationResult {
  /** Validation status */
  status: ValidationStatus;
  /** Whether extension is valid */
  isValid: boolean;
  /** Extension ID */
  extensionId: string;
  /** Publisher ID */
  publisherId: string;
  /** Number of attempts made */
  attempts: number;
  /** Exit code from tfx */
  exitCode: number;
}

/**
 * Validate extension against marketplace
 * Retries if validation is pending
 * @param options WaitForValidation options
 * @param auth Authentication credentials
 * @param tfx TfxManager instance
 * @param platform Platform adapter
 * @returns WaitForValidation result
 */
export async function waitForValidation(
  options: WaitForValidationOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<WaitForValidationResult> {
  platform.info(`Validating extension ${options.publisherId}.${options.extensionId}...`);

  const extensionId = options.extensionId;

  // Retry configuration
  const maxRetries = options.maxRetries ?? 10;
  const minTimeoutMs = (options.minTimeout ?? 1) * 60 * 1000;
  const maxTimeoutMs = (options.maxTimeout ?? 15) * 60 * 1000;

  let attempts = 0;
  let lastStatus: ValidationStatus = 'pending';
  let lastExitCode = 0;

  while (attempts < maxRetries) {
    attempts++;
    platform.info(`Validation attempt ${attempts}/${maxRetries}...`);

    // Build tfx arguments
    const args = new ArgBuilder()
      .arg(['extension', 'isvalid'])
      .flag('--json')
      .flag('--no-color')
      .option('--publisher', options.publisherId)
      .option('--extension-id', extensionId);

    // Manifest arguments if provided
    if (options.rootFolder) {
      args.option('--root', options.rootFolder);
    }

    if (options.manifestGlobs && options.manifestGlobs.length > 0) {
      args.flag('--manifest-globs');
      options.manifestGlobs.forEach((glob) => args.arg(glob));
    }

    // Authentication
    args.option('--service-url', auth.serviceUrl);

    if (auth.authType === 'pat') {
      args.option('--auth-type', 'pat');
      args.option('--token', auth.token);
      platform.setSecret(auth.token);
    } else if (auth.authType === 'basic') {
      args.option('--auth-type', 'basic');
      args.option('--username', auth.username);
      args.option('--password', auth.password);
      platform.setSecret(auth.password);
    }

    try {
      // Execute tfx (allow non-zero exit codes for pending/failed status)
      const result = await tfx.execute(args.build(), { captureJson: true });
      lastExitCode = result.exitCode;

      // Parse JSON result
      const json = result.json as any;
      if (json && json.status) {
        lastStatus = json.status as ValidationStatus;

        switch (lastStatus) {
          case 'success':
            platform.info('✓ Extension validation succeeded');
            return {
              status: lastStatus,
              isValid: true,
              extensionId,
              publisherId: options.publisherId,
              attempts,
              exitCode: result.exitCode,
            };

          case 'pending':
            platform.info('⏳ Validation pending, retrying...');
            // Wait before retry with exponential backoff
            if (attempts < maxRetries) {
              const waitTime = Math.min(minTimeoutMs * Math.pow(2, attempts - 1), maxTimeoutMs);
              platform.debug(`Waiting ${waitTime / 1000}s before retry...`);
              await sleep(waitTime);
            }
            break;

          case 'failed':
          case 'error':
            platform.error(`✗ Extension validation failed: ${lastStatus}`);
            return {
              status: lastStatus,
              isValid: false,
              extensionId,
              publisherId: options.publisherId,
              attempts,
              exitCode: result.exitCode,
            };

          default:
            platform.warning(`Unknown validation status: ${lastStatus}`);
            break;
        }
      } else {
        platform.warning('No status in validation response');
      }
    } catch (err) {
      platform.error(`Validation attempt ${attempts} failed: ${err}`);
      if (attempts >= maxRetries) {
        throw err;
      }
      // Wait before retry
      await sleep(minTimeoutMs);
    }
  }

  // Max retries reached
  platform.error(
    `✗ Extension validation timed out after ${attempts} attempts (status: ${lastStatus})`
  );
  return {
    status: lastStatus,
    isValid: false,
    extensionId,
    publisherId: options.publisherId,
    attempts,
    exitCode: lastExitCode,
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
