/**
 * Unpublish command - Removes an extension from the marketplace
 */

import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import type { AuthCredentials } from '../auth.js';
import { ArgBuilder } from '../arg-builder.js';

/**
 * Options for unpublish command
 */
export interface UnpublishOptions {
  /** Publisher ID */
  publisherId: string;
  /** Extension ID */
  extensionId: string;
  /** Extension tag (optional, appended to extension ID) */
  extensionTag?: string;
}

/**
 * Result from unpublish command
 */
export interface UnpublishResult {
  /** Whether extension was unpublished successfully */
  success: boolean;
  /** Extension ID that was unpublished */
  extensionId: string;
  /** Publisher ID */
  publisherId: string;
  /** Exit code from tfx */
  exitCode: number;
}

/**
 * Unpublish an extension from the marketplace
 * @param options Unpublish options
 * @param auth Authentication credentials
 * @param tfx TfxManager instance
 * @param platform Platform adapter
 * @returns Unpublish result
 */
export async function unpublishExtension(
  options: UnpublishOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<UnpublishResult> {
  platform.info(`Unpublishing extension ${options.publisherId}.${options.extensionId}...`);

  // Build extension ID with tag if provided
  let extensionId = options.extensionId;
  if (options.extensionTag) {
    extensionId = extensionId + options.extensionTag;
    platform.debug(`Extension ID with tag: ${extensionId}`);
  }

  // Build tfx arguments
  const args = new ArgBuilder()
    .arg(['extension', 'unpublish'])
    .flag('--json')
    .flag('--no-color')
    .option('--publisher', options.publisherId)
    .option('--extension-id', extensionId);

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
    throw new Error(`tfx extension unpublish failed with exit code ${result.exitCode}`);
  }

  platform.info(`Successfully unpublished extension: ${options.publisherId}.${extensionId}`);

  return {
    success: true,
    extensionId,
    publisherId: options.publisherId,
    exitCode: result.exitCode,
  };
}
