/**
 * WaitForValidation command - Validates extension against marketplace with retry
 */

import { ArgBuilder } from '../arg-builder.js';
import type { AuthCredentials } from '../auth.js';
import { resolveExtensionIdentity } from '../extension-identity.js';
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
  publisherId?: string;
  /** Extension ID */
  extensionId?: string;
  /** Path to VSIX file to infer publisher/extension identity */
  vsixFile?: string;
  /** Optional extension version to validate */
  extensionVersion?: string;
  /** Root folder for manifest (if validating from manifest) */
  rootFolder?: string;
  /** Manifest globs (if validating from manifest) */
  manifestGlobs?: string[];
  /** Total timeout in minutes (aligned with wait-for-installation, default: 10) */
  timeoutMinutes?: number;
  /** Polling interval in seconds (aligned with wait-for-installation, default: 30) */
  pollingIntervalSeconds?: number;
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

interface ValidationStepResult {
  status?: string;
  source?: string;
  message?: string;
  details?: unknown[];
  reports?: unknown[];
}

interface ValidationPayload {
  results?: ValidationStepResult[];
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
  const identity = await resolveExtensionIdentity(options, platform, 'wait-for-validation');

  platform.info(`Validating extension ${identity.publisherId}.${identity.extensionId}...`);

  const extensionId = identity.extensionId;

  // Retry configuration (aligned with wait-for-installation)
  const timeoutMinutes = options.timeoutMinutes ?? 10;
  const pollingIntervalSeconds = options.pollingIntervalSeconds ?? 30;
  const maxRetries = Math.max(1, Math.ceil((timeoutMinutes * 60) / pollingIntervalSeconds));
  const pollingIntervalMs = pollingIntervalSeconds * 1000;

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
      .option('--publisher', identity.publisherId)
      .option('--extension-id', extensionId);

    if (options.extensionVersion) {
      args.option('--version', options.extensionVersion);
    }

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
              publisherId: identity.publisherId,
              attempts,
              exitCode: result.exitCode,
            };

          case 'pending':
            platform.info('⏳ Validation pending, retrying...');
            // Wait before retry
            if (attempts < maxRetries) {
              platform.debug(`Waiting ${pollingIntervalSeconds}s before retry...`);
              await sleep(pollingIntervalMs);
            }
            break;

          case 'failed':
          case 'error':
            logValidationFailureDetails(json, platform);
            platform.error(`✗ Extension validation failed: ${lastStatus}`);
            return {
              status: lastStatus,
              isValid: false,
              extensionId,
              publisherId: identity.publisherId,
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      platform.error(`Validation attempt ${attempts} failed: ${errorMessage}`);
      if (attempts >= maxRetries) {
        throw err;
      }
      // Wait before retry
      await sleep(pollingIntervalMs);
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
    publisherId: identity.publisherId,
    attempts,
    exitCode: lastExitCode,
  };
}

function parseValidationPayload(raw: unknown): ValidationPayload | undefined {
  if (!raw) {
    return undefined;
  }

  if (typeof raw === 'string') {
    try {
      return parseValidationPayload(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }

  if (typeof raw === 'object') {
    const payload = raw as ValidationPayload;
    if (Array.isArray(payload.results)) {
      return payload;
    }
  }

  return undefined;
}

function logValidationFailureDetails(json: any, platform: IPlatformAdapter): void {
  if (!json || typeof json !== 'object') {
    return;
  }

  const parsed =
    parseValidationPayload(json) ||
    (typeof json.message === 'string' && json.message.trim().length > 0
      ? parseValidationPayload(json.message)
      : undefined);

  if (!parsed?.results?.length) {
    if (typeof json.message === 'string' && json.message.trim().length > 0) {
      platform.error(`Validation message: ${json.message}`);
    }
    return;
  }

  for (const step of parsed.results) {
    const status = (step.status ?? '').toLowerCase();
    const isSuccess = status === 'success';
    const icon = isSuccess ? '✅' : '❌';
    const source = step.source ?? 'unknown-step';
    const message = step.message?.trim() || '';
    const line = `${icon} ${source}: ${message}`;

    if (isSuccess) {
      platform.info(line);
    } else {
      platform.error(line);
    }
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
