/**
 * Package command - Creates a .vsix file from extension manifest
 */

import { ArgBuilder } from '../arg-builder.js';
import { FilesystemManifestReader } from '../filesystem-manifest-reader.js';
import { ManifestEditor } from '../manifest-editor.js';
import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';

/**
 * Options for package command
 */
export interface PackageOptions {
  // Manifest source
  rootFolder?: string;
  manifestGlobs?: string[];
  overridesFile?: string;

  // Overrides
  publisherId?: string;
  extensionId?: string;
  extensionName?: string;
  extensionVersion?: string;
  extensionVisibility?: 'private' | 'public' | 'private_preview' | 'public_preview';
  extensionPricing?: 'free' | 'paid' | 'trial';

  // Task patching
  updateTasksVersion?: boolean;
  updateTasksVersionType?: 'major' | 'minor' | 'patch';
  updateTasksId?: boolean;

  // Output
  outputPath?: string;

  // Behavior
  bypassValidation?: boolean;
  revVersion?: boolean;
}

/**
 * Result from package command
 */
export interface PackageResult {
  /** Path to created .vsix file */
  vsixPath: string;
  /** Extension ID from manifest */
  extensionId: string;
  /** Extension version */
  extensionVersion: string;
  /** Publisher ID from manifest */
  publisherId: string;
  /** Exit code from tfx */
  exitCode: number;
}

/**
 * Package an extension into a .vsix file
 * @param options Package options
 * @param tfx TfxManager instance
 * @param platform Platform adapter
 * @returns Package result with vsix path and metadata
 */
export async function packageExtension(
  options: PackageOptions,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<PackageResult> {
  platform.info('Packaging extension...');

  // Build tfx arguments
  const args = new ArgBuilder().arg(['extension', 'create']).flag('--json').flag('--no-color');

  // Manifest arguments
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

  const extensionId = options.extensionId;

  if (extensionId) {
    args.option('--extension-id', extensionId);
  }

  // Output path
  if (options.outputPath) {
    args.option('--output-path', options.outputPath);
  }

  // Flags
  if (options.bypassValidation) {
    args.flag('--bypass-validation');
  }

  if (options.revVersion) {
    args.flag('--rev-version');
  }

  // Handle manifest updates using the unified architecture
  let cleanupWriter: (() => Promise<void>) | null = null;
  const synchronizeBinaryFileEntries = true;

  const shouldApplyManifestOptions =
    options.updateTasksVersion ||
    options.updateTasksId ||
    options.extensionVersion ||
    options.extensionName ||
    options.extensionVisibility ||
    options.extensionPricing ||
    synchronizeBinaryFileEntries;

  if (shouldApplyManifestOptions) {
    platform.info('Updating task manifests before packaging...');

    try {
      // Create filesystem reader for the source directory
      const rootFolder = options.rootFolder || '.';
      const manifestGlobs = options.manifestGlobs || ['vss-extension.json'];

      const reader = new FilesystemManifestReader({
        rootFolder,
        manifestGlobs,
        platform,
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
        updateTasksVersion: options.updateTasksVersion,
        updateTasksVersionType: options.updateTasksVersionType,
        updateTasksId: options.updateTasksId,
        synchronizeBinaryFileEntries,
      });

      // Write modifications to filesystem
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Get overrides file path if generated
      const overridesPath = writer.getOverridesPath();
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

  try {
    // Execute tfx
    const result = await tfx.execute(args.build(), { captureJson: true });

    if (result.exitCode !== 0) {
      platform.error(`tfx exited with code ${result.exitCode}`);
      throw new Error(`tfx extension create failed with exit code ${result.exitCode}`);
    }

    // Parse JSON result
    const json = result.json as any;
    if (!json || !json.path) {
      throw new Error('tfx did not return expected JSON output with path');
    }

    // Always set Extension.OutputPath for compatibility
    platform.setVariable('Extension.OutputPath', json.path, false, true);

    platform.info(`Packaged extension: ${json.path}`);

    return {
      vsixPath: json.path,
      extensionId: json.id || extensionId || '',
      extensionVersion: json.version || options.extensionVersion || '',
      publisherId: json.publisher || options.publisherId || '',
      exitCode: result.exitCode,
    };
  } finally {
    // Clean up writer resources if created
    if (cleanupWriter) {
      await cleanupWriter();
    }
  }
}
