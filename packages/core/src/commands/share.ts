/**
 * Share command - Shares an extension with organizations
 */

import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import type { AuthCredentials } from '../auth.js';
import { ArgBuilder } from '../arg-builder.js';

/**
 * Options for share command
 */
export interface ShareOptions {
  /** Publisher ID */
  publisherId: string;
  /** Extension ID */
  extensionId: string;
  /** Extension tag (optional, appended to extension ID) */
  extensionTag?: string;
  /** Array of organization names to share with */
  shareWith: string[];
}

/**
 * Result from share command
 */
export interface ShareResult {
  /** Whether extension was shared successfully */
  success: boolean;
  /** Extension ID that was shared */
  extensionId: string;
  /** Publisher ID */
  publisherId: string;
  /** Organizations shared with */
  sharedWith: string[];
  /** Exit code from tfx */
  exitCode: number;
}

/**
 * Share an extension with organizations
 * @param options Share options
 * @param auth Authentication credentials
 * @param tfx TfxManager instance
 * @param platform Platform adapter
 * @returns Share result
 */
export async function shareExtension(
  options: ShareOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<ShareResult> {
  if (!options.shareWith || options.shareWith.length === 0) {
    throw new Error('shareWith must contain at least one organization');
  }

  platform.info(
    `Sharing extension ${options.publisherId}.${options.extensionId} with ${options.shareWith.length} organization(s)...`
  );

  // Build extension ID with tag if provided
  let extensionId = options.extensionId;
  if (options.extensionTag) {
    extensionId = extensionId + options.extensionTag;
    platform.debug(`Extension ID with tag: ${extensionId}`);
  }

  // Build tfx arguments
  const args = new ArgBuilder()
    .arg(['extension', 'share'])
    .flag('--json')
    .flag('--no-color')
    .option('--publisher', options.publisherId)
    .option('--extension-id', extensionId)
    .flag('--share-with');

  // Add each organization
  options.shareWith.forEach((org) => args.arg(org));

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
    throw new Error(`tfx extension share failed with exit code ${result.exitCode}`);
  }

  platform.info(`Successfully shared extension with: ${options.shareWith.join(', ')}`);

  return {
    success: true,
    extensionId,
    publisherId: options.publisherId,
    sharedWith: options.shareWith,
    exitCode: result.exitCode,
  };
}
