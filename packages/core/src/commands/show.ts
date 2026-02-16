/**
 * Show command - Displays extension metadata from marketplace
 */

import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import type { AuthCredentials } from '../auth.js';
import { ArgBuilder } from '../arg-builder.js';

/**
 * Options for show command
 */
export interface ShowOptions {
  /** Publisher ID */
  publisherId: string;
  /** Extension ID */
  extensionId: string;
}

/**
 * Extension metadata from marketplace
 */
export interface ExtensionMetadata {
  /** Extension ID */
  id: string;
  /** Publisher ID */
  publisher: string;
  /** Extension version */
  version: string;
  /** Display name */
  name?: string;
  /** Description */
  description?: string;
  /** Categories */
  categories?: string[];
  /** Tags */
  tags?: string[];
  /** Any other metadata from tfx */
  [key: string]: any;
}

/**
 * Result from show command
 */
export interface ShowResult {
  /** Extension metadata */
  metadata: ExtensionMetadata;
  /** Exit code from tfx */
  exitCode: number;
}

/**
 * Show extension metadata from marketplace
 * @param options Show options
 * @param auth Authentication credentials
 * @param tfx TfxManager instance
 * @param platform Platform adapter
 * @returns Show result with extension metadata
 */
export async function showExtension(
  options: ShowOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<ShowResult> {
  platform.info(`Querying extension ${options.publisherId}.${options.extensionId}...`);

  const extensionId = options.extensionId;

  // Build tfx arguments
  const args = new ArgBuilder()
    .arg(['extension', 'show'])
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
    throw new Error(`tfx extension show failed with exit code ${result.exitCode}`);
  }

  // Parse JSON result
  const json = result.json as any;
  if (!json) {
    throw new Error('tfx did not return expected JSON output');
  }

  const metadata: ExtensionMetadata = {
    id: json.extensionId || json.id || extensionId,
    publisher: json.publisher || options.publisherId,
    version: json.version || json.versions?.[0]?.version || '',
    name: json.extensionName || json.displayName || json.name,
    description: json.shortDescription || json.description,
    categories: json.categories,
    tags: json.tags,
    ...json, // Include all other fields
  };

  platform.info(`Extension: ${metadata.name || metadata.id} v${metadata.version}`);
  if (metadata.description) {
    platform.info(`Description: ${metadata.description}`);
  }

  return {
    metadata,
    exitCode: result.exitCode,
  };
}
