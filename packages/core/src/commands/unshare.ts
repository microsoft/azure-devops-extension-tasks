/**
 * Unshare command - Unshares an extension from organizations
 */

import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import type { AuthCredentials } from '../auth.js';
import { ArgBuilder } from '../arg-builder.js';

/**
 * Options for unshare command
 */
export interface UnshareOptions {
  /** Publisher ID */
  publisherId: string;
  /** Extension ID */
  extensionId: string;
  /** Extension tag (optional, appended to extension ID) */
  extensionTag?: string;
  /** Array of organization names to unshare from */
  unshareWith: string[];
}

/**
 * Result from unshare command
 */
export interface UnshareResult {
  /** Whether extension was unshared successfully */
  success: boolean;
  /** Extension ID that was unshared */
  extensionId: string;
  /** Publisher ID */
  publisherId: string;
  /** Organizations unshared from */
  unsharedFrom: string[];
  /** Exit code from tfx */
  exitCode: number;
}

/**
 * Unshare an extension from organizations
 * @param options Unshare options
 * @param auth Authentication credentials
 * @param tfx TfxManager instance
 * @param platform Platform adapter
 * @returns Unshare result
 */
export async function unshareExtension(
  options: UnshareOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<UnshareResult> {
  if (!options.unshareWith || options.unshareWith.length === 0) {
    throw new Error('unshareWith must contain at least one organization');
  }

  platform.info(
    `Unsharing extension ${options.publisherId}.${options.extensionId} from ${options.unshareWith.length} organization(s)...`
  );

  // Build extension ID with tag if provided
  let extensionId = options.extensionId;
  if (options.extensionTag) {
    extensionId = extensionId + options.extensionTag;
    platform.debug(`Extension ID with tag: ${extensionId}`);
  }

  // Build tfx arguments
  const args = new ArgBuilder()
    .arg(['extension', 'unshare'])
    .flag('--json')
    .flag('--no-color')
    .option('--publisher', options.publisherId)
    .option('--extension-id', extensionId)
    .flag('--unshare-with');

  // Add each organization
  options.unshareWith.forEach((org) => args.arg(org));

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

  // Execute tfx
  const result = await tfx.execute(args.build(), { captureJson: true });

  if (result.exitCode !== 0) {
    platform.error(`tfx exited with code ${result.exitCode}`);
    throw new Error(`tfx extension unshare failed with exit code ${result.exitCode}`);
  }

  platform.info(`Successfully unshared extension from: ${options.unshareWith.join(', ')}`);

  return {
    success: true,
    extensionId,
    publisherId: options.publisherId,
    unsharedFrom: options.unshareWith,
    exitCode: result.exitCode,
  };
}
