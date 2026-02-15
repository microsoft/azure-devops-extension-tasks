/**
 * Filesystem Manifest Reader - Read manifests from filesystem
 * 
 * Extends ManifestReader to provide filesystem-based reading of extension
 * and task manifests directly from source directories.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import {
  ManifestReader,
  type ExtensionManifest,
  type TaskManifest,
} from './manifest-reader.js';
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
  private extensionManifest: ExtensionManifest | null = null;

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
   * Find and resolve the extension manifest file path
   */
  private async resolveManifestPath(): Promise<string> {
    if (this.manifestPath) {
      return this.manifestPath;
    }

    // Try to find manifest using globs
    const matches = this.platform.findMatch(this.rootFolder, this.manifestGlobs);
    
    if (matches.length === 0) {
      // Fallback: check for common manifest names
      const commonNames = ['vss-extension.json', 'extension.vsomanifest'];
      for (const name of commonNames) {
        const candidate = path.join(this.rootFolder, name);
        if (await this.platform.fileExists(candidate)) {
          this.manifestPath = candidate;
          return candidate;
        }
      }
      throw new Error(
        `Extension manifest not found in ${this.rootFolder}. ` +
        `Tried patterns: ${this.manifestGlobs.join(', ')}`
      );
    }

    if (matches.length > 1) {
      this.platform.warning(
        `Multiple manifest files found: ${matches.join(', ')}. Using first match.`
      );
    }

    this.manifestPath = matches[0];
    return this.manifestPath;
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
    const content = await readFile(manifestPath, 'utf-8');
    this.extensionManifest = JSON.parse(content);
    return this.extensionManifest;
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
   * @param taskPath Path to the task directory (relative to rootFolder)
   * @returns Parsed task manifest
   */
  async readTaskManifest(taskPath: string): Promise<TaskManifest> {
    // Resolve relative path from rootFolder
    const absoluteTaskPath = path.isAbsolute(taskPath) 
      ? taskPath 
      : path.join(this.rootFolder, taskPath);
    
    const taskJsonPath = path.join(absoluteTaskPath, 'task.json');
    
    if (!await this.platform.fileExists(taskJsonPath)) {
      throw new Error(`Task manifest not found: ${taskJsonPath}`);
    }

    const content = await readFile(taskJsonPath, 'utf-8');
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
