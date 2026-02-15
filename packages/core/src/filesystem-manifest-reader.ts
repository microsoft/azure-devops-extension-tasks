/**
 * Filesystem Manifest Reader - Read manifests from filesystem
 *
 * Extends ManifestReader to provide filesystem-based reading of extension
 * and task manifests directly from source directories.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { ManifestReader, type ExtensionManifest, type TaskManifest } from './manifest-reader.js';
import type { IPlatformAdapter } from './platform.js';

/**
 * FilesystemManifestReader - Read manifests from filesystem
 *
 * Reads extension and task manifests directly from a source directory.
 * Useful for package command where manifests haven't been packaged yet.
 *
 * Example usage:
 * ```typescript
 * const reader = new FilesystemManifestReader({
 *   rootFolder: '/path/to/extension',
 *   manifestGlobs: ['vss-extension.json'],
 *   platform
 * });
 * const manifest = await reader.readExtensionManifest();
 * await reader.close();
 * ```
 */
export class FilesystemManifestReader extends ManifestReader {
  private readonly rootFolder: string;
  private readonly manifestGlobs: string[];
  private readonly platform: IPlatformAdapter;
  private manifestPath: string | null = null;
  private manifestPaths: string[] | null = null;
  private extensionManifest: ExtensionManifest | null = null;
  // Map of packagePath (task name) to actual source path
  private packagePathMap: Map<string, string> | null = null;

  constructor(options: {
    rootFolder: string;
    manifestGlobs?: string[];
    platform: IPlatformAdapter;
  }) {
    super();
    this.rootFolder = options.rootFolder;
    this.manifestGlobs = options.manifestGlobs || ['vss-extension.json'];
    this.platform = options.platform;
  }

  /**
   * Find and resolve all extension manifest file paths
   */
  private async resolveManifestPaths(): Promise<string[]> {
    if (this.manifestPaths) {
      return this.manifestPaths;
    }

    const matches = await this.platform.findMatch(this.rootFolder, this.manifestGlobs);

    if (matches.length === 0) {
      const commonNames = ['vss-extension.json', 'extension.vsomanifest'];
      for (const name of commonNames) {
        const candidate = path.join(this.rootFolder, name);
        if (await this.platform.fileExists(candidate)) {
          this.manifestPaths = [candidate];
          this.manifestPath = candidate;
          return this.manifestPaths;
        }
      }

      throw new Error(
        `Extension manifest not found in ${this.rootFolder}. ` +
          `Tried patterns: ${this.manifestGlobs.join(', ')}`
      );
    }

    if (matches.length > 1) {
      this.platform.warning(
        `Multiple manifest files found: ${matches.join(', ')}. Using first match as primary.`
      );
    }

    this.manifestPaths = matches;
    this.manifestPath = matches[0];
    return this.manifestPaths;
  }

  /**
   * Find and resolve the extension manifest file path
   */
  private async resolveManifestPath(): Promise<string> {
    const paths = await this.resolveManifestPaths();
    return paths[0];
  }

  /**
   * Read the extension manifest from filesystem
   * @returns Parsed extension manifest
   */
  async readExtensionManifest(): Promise<ExtensionManifest> {
    if (this.extensionManifest) {
      return this.extensionManifest;
    }

    const manifestPath = await this.resolveManifestPath();
    const content = (await readFile(manifestPath)).toString('utf8');
    this.extensionManifest = JSON.parse(content);
    return this.extensionManifest;
  }

  /**
   * Build a map of packagePath to actual source path from files array
   * This handles cases where task.json is in a different directory than the final package path
   * @returns Map of packagePath to source path
   */
  private async buildPackagePathMap(): Promise<Map<string, string>> {
    if (this.packagePathMap) {
      return this.packagePathMap;
    }

    this.packagePathMap = new Map<string, string>();
    const manifest = await this.readExtensionManifest();

    // Check if files array exists with packagePath mappings
    if (manifest.files) {
      for (const file of manifest.files) {
        // If packagePath is specified, map it to the source path
        if (file.packagePath) {
          this.packagePathMap.set(file.packagePath, file.path);
          this.platform.debug(
            `Mapped packagePath '${file.packagePath}' to source path '${file.path}'`
          );
        }
      }
    }

    return this.packagePathMap;
  }

  /**
   * Find task paths from the extension manifest
   * @returns Array of task directory paths (relative to rootFolder)
   */
  async findTaskPaths(): Promise<string[]> {
    const manifest = await this.readExtensionManifest();
    const taskPaths: string[] = [];

    // Look for task contributions
    if (manifest.contributions) {
      for (const contribution of manifest.contributions) {
        if (contribution.type === 'ms.vss-distributed-task.task' && contribution.properties) {
          const name = contribution.properties.name as string;
          if (name) {
            taskPaths.push(name);
          }
        }
      }
    }

    // If no contributions found, look in files array
    if (taskPaths.length === 0 && manifest.files) {
      for (const file of manifest.files) {
        const taskJsonPath = path.join(this.rootFolder, file.path, 'task.json');
        if (await this.platform.fileExists(taskJsonPath)) {
          taskPaths.push(file.path);
        }
      }
    }

    return taskPaths;
  }

  /**
   * Read a task manifest from filesystem
   * @param taskPath Path to the task directory (relative to rootFolder) or packagePath
   * @returns Parsed task manifest
   */
  async readTaskManifest(taskPath: string): Promise<TaskManifest> {
    // Build packagePath map to handle files with packagePath
    const packagePathMap = await this.buildPackagePathMap();

    // Check if taskPath starts with a packagePath prefix and replace it
    let actualPath = taskPath;

    // Normalize path separators for consistent matching
    const normalizedTaskPath = taskPath.replace(/\\/g, '/');

    // Try to find a matching packagePath prefix
    for (const [pkgPath, sourcePath] of packagePathMap.entries()) {
      const normalizedPkgPath = pkgPath.replace(/\\/g, '/');

      // Check for exact match or prefix match (packagePath/subdir)
      if (normalizedTaskPath === normalizedPkgPath) {
        // Exact match: TaskName → sourcePath
        actualPath = sourcePath;
        break;
      } else if (normalizedTaskPath.startsWith(normalizedPkgPath + '/')) {
        // Prefix match: TaskName/v2 → sourcePath/v2
        const remainder = normalizedTaskPath.substring(normalizedPkgPath.length + 1);
        actualPath = path.join(sourcePath, remainder);
        break;
      }
    }

    this.platform.debug(
      `Reading task manifest: taskPath='${taskPath}', actualPath='${actualPath}'`
    );

    // Resolve relative path from rootFolder
    const absoluteTaskPath = path.isAbsolute(actualPath)
      ? actualPath
      : path.join(this.rootFolder, actualPath);

    const taskJsonPath = path.join(absoluteTaskPath, 'task.json');

    if (!(await this.platform.fileExists(taskJsonPath))) {
      throw new Error(`Task manifest not found: ${taskJsonPath}`);
    }

    const content = (await readFile(taskJsonPath)).toString('utf8');
    return JSON.parse(content);
  }

  /**
   * Close and clean up resources
   * No-op for filesystem reader as there are no persistent resources
   */
  async close(): Promise<void> {
    // No resources to clean up
    this.extensionManifest = null;
    this.manifestPath = null;
    this.manifestPaths = null;
    this.packagePathMap = null;
  }

  /**
   * Read all extension manifests matched by manifest globs
   */
  async readAllExtensionManifests(): Promise<Array<{ path: string; manifest: ExtensionManifest }>> {
    const paths = await this.resolveManifestPaths();
    const manifests: Array<{ path: string; manifest: ExtensionManifest }> = [];

    for (const manifestPath of paths) {
      const content = (await readFile(manifestPath)).toString('utf8');
      manifests.push({
        path: manifestPath,
        manifest: JSON.parse(content) as ExtensionManifest,
      });
    }

    return manifests;
  }

  /**
   * Get the root folder path
   */
  getRootFolder(): string {
    return this.rootFolder;
  }

  /**
   * Get the resolved manifest path (if already resolved)
   */
  getManifestPath(): string | null {
    return this.manifestPath;
  }
}
