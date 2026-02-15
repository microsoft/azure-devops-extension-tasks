/**
 * Publish command - Publishes an extension to the marketplace
 */

import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import type { AuthCredentials } from '../auth.js';
import { ArgBuilder } from '../arg-builder.js';
import { VsixReader } from '../vsix-reader.js';
import { ManifestEditor } from '../manifest-editor.js';

/**
 * Source for publishing
 */
export type PublishSource = 'manifest' | 'vsix';

/**
 * Options for publish command
 */
export interface PublishOptions {
  // Source
  publishSource: PublishSource;

  // Manifest source (when publishSource = 'manifest')
  rootFolder?: string;
  manifestGlobs?: string[];
  overridesFile?: string;

  // VSIX source (when publishSource = 'vsix')
  vsixFile?: string;

  // Overrides
  publisherId?: string;
  extensionId?: string;
  extensionTag?: string;
  extensionName?: string;
  extensionVersion?: string;
  extensionVisibility?: 'private' | 'public' | 'private_preview' | 'public_preview';

  // Task patching
  updateTasksVersion?: boolean;
  updateTasksVersionType?: 'major' | 'minor' | 'patch';
  updateTasksId?: boolean;

  // Sharing
  shareWith?: string[]; // Array of organization names to share with

  // Behavior
  noWaitValidation?: boolean;
  bypassValidation?: boolean;
  outputVariable?: string;
}

/**
 * Result from publish command
 */
export interface PublishResult {
  /** Whether extension was published successfully */
  published: boolean;
  /** Path to the vsix file that was published */
  vsixPath: string;
  /** Extension ID */
  extensionId: string;
  /** Extension version */
  extensionVersion: string;
  /** Publisher ID */
  publisherId: string;
  /** Exit code from tfx */
  exitCode: number;
}

/**
 * Helper function to execute tfx publish and parse results
 */
async function executeTfxPublish(
  tfx: TfxManager,
  args: ArgBuilder,
  platform: IPlatformAdapter,
  options: PublishOptions
): Promise<PublishResult> {
  // Sharing
  if (options.shareWith && options.shareWith.length > 0) {
    // Only share if extension is not public
    const isPublic =
      options.extensionVisibility === 'public' || 
      options.extensionVisibility === 'public_preview';
    
    if (isPublic) {
      platform.warning('Ignoring shareWith - not available for public extensions');
    } else {
      args.flag('--share-with');
      options.shareWith.forEach((org) => args.arg(org));
    }
  }

  // Flags
  if (options.noWaitValidation) {
    args.flag('--no-wait-validation');
  }

  if (options.bypassValidation) {
    args.flag('--bypass-validation');
  }

  // Execute tfx
  const result = await tfx.execute(args.build(), { captureJson: true });

  if (result.exitCode !== 0) {
    platform.error(`tfx exited with code ${result.exitCode}`);
    throw new Error(`tfx extension publish failed with exit code ${result.exitCode}`);
  }

  // Parse JSON result
  const json = result.json as any;
  if (!json || !json.published) {
    throw new Error('tfx did not return expected JSON output with published status');
  }

  // Determine vsix path
  let vsixPath = '';
  if (options.publishSource === 'manifest') {
    vsixPath = json.packaged || '';
  } else {
    vsixPath = options.vsixFile || '';
  }

  // Set output variable if specified
  if (options.outputVariable && vsixPath) {
    platform.setVariable(options.outputVariable, vsixPath, false, true);
  }

  platform.info(`Published extension: ${json.id} v${json.version}`);

  return {
    published: json.published === true,
    vsixPath,
    extensionId: json.id || options.extensionId || '',
    extensionVersion: json.version || options.extensionVersion || '',
    publisherId: json.publisher || options.publisherId || '',
    exitCode: result.exitCode,
  };
}

/**
 * Publish an extension to the marketplace
 * @param options Publish options
 * @param auth Authentication credentials
 * @param tfx TfxManager instance
 * @param platform Platform adapter
 * @returns Publish result
 */
export async function publishExtension(
  options: PublishOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<PublishResult> {
  platform.info('Publishing extension...');

  // Build tfx arguments
  const args = new ArgBuilder()
    .arg(['extension', 'publish'])
    .flag('--json')
    .flag('--no-color')
    .flag('--debug-log-stream')
    .arg('stderr');

  // Authentication
  args.option('--service-url', auth.serviceUrl);
  
  if (auth.authType === 'pat') {
    args.option('--auth-type', 'pat');
    args.option('--token', auth.token!);
    platform.setSecret(auth.token!);
  } else if (auth.authType === 'basic') {
    args.option('--auth-type', 'basic');
    args.option('--username', auth.username!);
    args.option('--password', auth.password!);
    platform.setSecret(auth.password!);
  }

  // Source-specific arguments
  if (options.publishSource === 'manifest') {
    // Publishing from manifest files
    if (options.rootFolder) {
      args.option('--root', options.rootFolder);
    }

    if (options.manifestGlobs && options.manifestGlobs.length > 0) {
      args.flag('--manifest-globs');
      options.manifestGlobs.forEach((glob) => args.arg(glob));
    }

    if (options.overridesFile) {
      args.option('--overrides-file', options.overridesFile);
    }

    // Overrides
    if (options.publisherId) {
      args.option('--publisher', options.publisherId);
    }

    let extensionId = options.extensionId;
    if (extensionId && options.extensionTag) {
      extensionId = extensionId + options.extensionTag;
      platform.debug(`Extension ID with tag: ${extensionId}`);
    }

    if (extensionId) {
      args.option('--extension-id', extensionId);
    }

    if (options.extensionName) {
      args.option('--extension-name', options.extensionName);
    }

    if (options.extensionVersion) {
      args.option('--extension-version', options.extensionVersion);
    }

    if (options.extensionVisibility) {
      args.option('--extension-visibility', options.extensionVisibility);
    }

    // Handle task version and ID updates for manifest publishing
    // This uses the same approach as package.ts
    let cleanupWriter: (() => Promise<void>) | null = null;
    
    if (options.updateTasksVersion || options.updateTasksId) {
      platform.info('Updating task manifests before publishing...');
      
      try {
        // Import filesystem manifest modules
        const { FilesystemManifestReader } = await import('../filesystem-manifest-reader.js');
        const { ManifestEditor } = await import('../manifest-editor.js');
        
        // Create filesystem reader for the source directory
        const rootFolder = options.rootFolder || '.';
        const manifestGlobs = options.manifestGlobs || ['vss-extension.json'];
        
        const reader = new FilesystemManifestReader({
          rootFolder,
          manifestGlobs,
          platform
        });
        
        // Create editor and apply all options at once
        const editor = ManifestEditor.fromReader(reader);
        await editor.applyOptions({
          publisherId: options.publisherId,
          extensionId: options.extensionId,
          extensionTag: options.extensionTag,
          extensionVersion: options.extensionVersion,
          extensionName: options.extensionName,
          extensionVisibility: options.extensionVisibility,
          updateTasksVersion: options.updateTasksVersion,
          updateTasksVersionType: options.updateTasksVersionType,
          updateTasksId: options.updateTasksId,
        });
        
        // Write modifications to filesystem
        const writer = await editor.toWriter();
        await writer.writeToFilesystem();
        
        // Get overrides file path if generated
        const overridesPath = (writer as any).getOverridesPath();
        if (overridesPath) {
          platform.debug(`Using overrides file: ${overridesPath}`);
          args.option('--overrides-file', overridesPath);
        }
        
        // Setup cleanup function
        cleanupWriter = async () => {
          await writer.close();
          await reader.close();
        };
        
        platform.info('Task manifests updated successfully');
      } catch (err) {
        platform.error(`Failed to update task manifests: ${(err as Error).message}`);
        throw err;
      }
    }

  // Execute tfx and handle cleanup
    try {
      return await executeTfxPublish(tfx, args, platform, options);
    } finally {
      if (cleanupWriter) {
        await cleanupWriter();
      }
    }
  } else {
    // Publishing from VSIX file
    // Publishing from VSIX file
    if (!options.vsixFile) {
      throw new Error('vsixFile is required when publishSource is "vsix"');
    }

    // Check if file exists
    const fileExists = await platform.fileExists(options.vsixFile);
    if (!fileExists) {
      throw new Error(`VSIX file not found: ${options.vsixFile}`);
    }

    // Check if we need to modify the VSIX before publishing
    const needsModification =
      options.publisherId ||
      options.extensionId ||
      options.extensionVersion ||
      options.extensionName ||
      options.extensionVisibility ||
      options.updateTasksVersion ||
      options.updateTasksId;

    if (needsModification) {
      platform.info('Modifying VSIX before publishing...');
      
      // Open the VSIX and create an editor using the unified architecture
      const reader = await VsixReader.open(options.vsixFile);
      const editor = ManifestEditor.fromReader(reader);
      
      // Apply all options at once
      await editor.applyOptions({
        publisherId: options.publisherId,
        extensionId: options.extensionId,
        extensionTag: options.extensionTag,
        extensionVersion: options.extensionVersion,
        extensionName: options.extensionName,
        extensionVisibility: options.extensionVisibility,
        updateTasksVersion: options.updateTasksVersion,
        updateTasksVersionType: options.updateTasksVersionType,
        updateTasksId: options.updateTasksId,
      });
      
      // Write modified VSIX to a temporary file
      const writer = await editor.toWriter();
      const tempDir = platform.getTempDir();
      const tempVsixPath = `${tempDir}/temp-${Date.now()}.vsix`;
      
      platform.debug(`Writing modified VSIX to: ${tempVsixPath}`);
      await writer.writeToFile(tempVsixPath);
      await writer.close();
      await reader.close();
      
      // Use the modified VSIX for publishing
      args.option('--vsix', tempVsixPath);
      
      platform.info('VSIX modifications applied successfully');
    } else {
      // No modifications needed - publish as-is
      args.option('--vsix', options.vsixFile);
    }
  }

  // Execute tfx using the helper function
  return executeTfxPublish(tfx, args, platform, options);
}
