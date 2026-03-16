/**
 * Publish command - Publishes an extension to the marketplace
 */

import { copyFile, mkdir } from 'fs/promises';
import { basename, join } from 'path';
import { cwd } from 'process';
import { ArgBuilder } from '../arg-builder.js';
import type { AuthCredentials } from '../auth.js';
import { ManifestEditor } from '../manifest-editor.js';
import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import { VsixReader } from '../vsix-reader.js';
import { resolveTaskUpdateOptionPrecedence } from './manifest-option-precedence.js';

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
  localizationRoot?: string;
  manifestGlobs?: string[];
  manifestFileJs?: string;
  overridesFile?: string;

  // VSIX source (when publishSource = 'vsix')
  vsixFile?: string;

  // Output
  outputPath?: string;

  // Overrides
  publisherId?: string;
  extensionId?: string;
  extensionName?: string;
  extensionVersion?: string;
  extensionVisibility?: 'private' | 'public' | 'private_preview' | 'public_preview';
  extensionPricing?: 'free' | 'paid' | 'trial';

  // Task patching
  updateTasksVersion?: 'none' | 'major' | 'minor' | 'patch';
  updateTasksId?: boolean;

  // Behavior
  noWaitValidation?: boolean;
  bypassValidation?: boolean;
}

/**
 * Result from publish command
 */
export interface PublishResult {
  /** Whether extension was published successfully */
  published: boolean;
  /** Path to the vsix file that was published */
  vsixFile: string;
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
  options: PublishOptions,
  publishedVsixFile?: string
): Promise<PublishResult> {
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

  let extensionId = '';
  let extensionVersion = '';
  let publisherId = '';

  if (options.publishSource === 'vsix') {
    const metadataVsixFile = publishedVsixFile ?? options.vsixFile;

    if (metadataVsixFile && (await platform.fileExists(metadataVsixFile))) {
      try {
        const reader = await VsixReader.open(metadataVsixFile);
        const metadata = await reader.getMetadata();
        await reader.close();

        extensionId = metadata.extensionId;
        extensionVersion = metadata.version;
        publisherId = metadata.publisher;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        platform.debug(`Could not read VSIX metadata from ${metadataVsixFile}: ${errorMessage}`);
      }
    }
  } else {
    extensionId = json.id || '';
    extensionVersion = json.version || '';
    publisherId = json.publisher || '';
  }

  extensionId = extensionId || options.extensionId || '';
  extensionVersion = extensionVersion || options.extensionVersion || '';
  publisherId = publisherId || options.publisherId || '';

  // Determine vsix path
  let vsixFile =
    options.publishSource === 'manifest'
      ? (json.packaged ?? '')
      : (publishedVsixFile ?? options.vsixFile ?? '');

  if (options.outputPath && vsixFile) {
    const sourceExists = await platform.fileExists(vsixFile);
    if (sourceExists) {
      const outputVsixFile = join(options.outputPath, basename(vsixFile));
      await mkdir(options.outputPath, { recursive: true });
      await copyFile(vsixFile, outputVsixFile);
      platform.debug(`Copied published VSIX to output path: ${outputVsixFile}`);
      vsixFile = outputVsixFile;
    } else {
      platform.warning(
        `Could not copy VSIX to output path because source file was not found: ${vsixFile}`
      );
    }
  }

  platform.info(
    `Published extension: ${extensionId || '(unknown id)'} v${extensionVersion || '(unknown version)'}`
  );

  return {
    published: json.published === true,
    vsixFile,
    extensionId,
    extensionVersion,
    publisherId,
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
    args.option('--token', auth.token);
    platform.setSecret(auth.token);
  } else if (auth.authType === 'basic') {
    args.option('--auth-type', 'basic');
    args.option('--username', auth.username);
    args.option('--password', auth.password);
    platform.setSecret(auth.password);
  }

  // Source-specific arguments
  if (options.publishSource === 'manifest') {
    // Publishing from manifest files
    if (options.rootFolder) {
      args.option('--root', options.rootFolder);
    }

    if (options.localizationRoot) {
      args.option('--loc-root', options.localizationRoot);
    }

    if (options.manifestGlobs && options.manifestGlobs.length > 0) {
      args.flag('--manifest-globs');
      options.manifestGlobs.forEach((glob) => args.arg(glob));
    }

    if (options.manifestFileJs) {
      args.option('--manifest-js', options.manifestFileJs);
    }

    // Overrides
    if (options.publisherId) {
      args.option('--publisher', options.publisherId);
    }

    const extensionId = options.extensionId;

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

    const synchronizeBinaryFileEntries = true;

    if (
      (options.updateTasksVersion && options.updateTasksVersion !== 'none') ||
      options.updateTasksId ||
      options.extensionPricing ||
      synchronizeBinaryFileEntries
    ) {
      platform.info('Updating task manifests before publishing...');

      try {
        // Import filesystem manifest modules
        const { FilesystemManifestReader } = await import('../filesystem-manifest-reader.js');
        const { ManifestEditor } = await import('../manifest-editor.js');

        // Create filesystem reader for the source directory
        const rootFolder = options.rootFolder || cwd();
        const manifestGlobs = options.manifestGlobs || ['vss-extension.json'];

        const reader = new FilesystemManifestReader({
          rootFolder,
          manifestGlobs,
          platform,
        });

        const taskVersionUpdateType =
          options.updateTasksVersion && options.updateTasksVersion !== 'none'
            ? options.updateTasksVersion
            : undefined;
        const shouldUpdateTaskVersion = !!taskVersionUpdateType;
        const shouldUpdateTaskIds = options.updateTasksId === true;

        const resolvedTaskUpdateOptions = await resolveTaskUpdateOptionPrecedence({
          reader,
          platform,
          overridesFile: options.overridesFile,
          publisherId: options.publisherId,
          extensionId: options.extensionId,
          extensionVersion: options.extensionVersion,
        });

        // Create editor and apply all options at once
        const editor = ManifestEditor.fromReader(reader);
        await editor.applyOptions({
          publisherId: options.publisherId,
          extensionId: options.extensionId,
          extensionVersion: options.extensionVersion,
          extensionName: options.extensionName,
          extensionVisibility: options.extensionVisibility,
          extensionPricing: options.extensionPricing,
          synchronizeBinaryFileEntries,
        });

        if (shouldUpdateTaskVersion) {
          if (resolvedTaskUpdateOptions.extensionVersion) {
            await editor.updateAllTaskVersions(
              resolvedTaskUpdateOptions.extensionVersion,
              taskVersionUpdateType
            );
          } else {
            platform.warning(
              'Skipping task version updates because no extension version is defined'
            );
          }
        }

        if (shouldUpdateTaskIds) {
          if (resolvedTaskUpdateOptions.publisherId && resolvedTaskUpdateOptions.extensionId) {
            const tasks = await reader.getTasksInfo();
            for (const task of tasks) {
              editor.updateTaskId(
                task.path,
                task.name,
                resolvedTaskUpdateOptions.publisherId,
                resolvedTaskUpdateOptions.extensionId
              );
            }
          } else {
            platform.warning(
              'Skipping task ID updates because publisher ID or extension ID is not defined'
            );
          }
        }

        // Write modifications to filesystem
        const writer = await editor.toWriter();
        await writer.writeToFilesystem({ overridesFilePath: options.overridesFile });

        // Get overrides file path if generated
        const overridesPath = writer.getOverridesPath();
        if (overridesPath) {
          platform.debug(`Using overrides file: ${overridesPath}`);
          args.option('--overrides-file', overridesPath);
        } else if (options.overridesFile) {
          args.option('--overrides-file', options.overridesFile);
        }

        // Setup cleanup function
        cleanupWriter = async () => {
          await writer.close();
          await reader.close();
        };

        platform.info('Task manifests updated successfully');
      } catch (err: unknown) {
        platform.error(`Failed to update task manifests: ${(err as Error).message}`);
        throw err;
      }
    }

    // Execute tfx and handle cleanup
    try {
      if (options.overridesFile && !args.build().includes('--overrides-file')) {
        args.option('--overrides-file', options.overridesFile);
      }

      return await executeTfxPublish(tfx, args, platform, options);
    } finally {
      if (cleanupWriter) {
        await cleanupWriter();
      }
    }
  } else {
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
      options.extensionPricing ||
      (options.updateTasksVersion && options.updateTasksVersion !== 'none') ||
      options.updateTasksId;

    let vsixFileToPublish = options.vsixFile;

    if (needsModification) {
      platform.info('Modifying VSIX before publishing...');

      // Open the VSIX and create an editor using the unified architecture
      const reader = await VsixReader.open(options.vsixFile);
      const editor = ManifestEditor.fromReader(reader);

      // Apply all options at once
      await editor.applyOptions({
        publisherId: options.publisherId,
        extensionId: options.extensionId,
        extensionVersion: options.extensionVersion,
        extensionName: options.extensionName,
        extensionVisibility: options.extensionVisibility,
        extensionPricing: options.extensionPricing,
        updateTasksVersion: options.updateTasksVersion,
        updateTasksId: options.updateTasksId,
      });

      // Write modified VSIX to a temporary file
      const writer = await editor.toWriter();
      const tempDir = platform.getTempDir();
      const tempVsixFile = `${tempDir}/temp-${Date.now()}.vsix`;

      platform.debug(`Writing modified VSIX to: ${tempVsixFile}`);
      await writer.writeToFile(tempVsixFile);
      await writer.close();
      await reader.close();

      // Use the modified VSIX for publishing
      vsixFileToPublish = tempVsixFile;
      args.option('--vsix', tempVsixFile);

      platform.info('VSIX modifications applied successfully');
    } else {
      // No modifications needed - publish as-is
      args.option('--vsix', options.vsixFile);
    }

    return executeTfxPublish(tfx, args, platform, options, vsixFileToPublish);
  }
}
