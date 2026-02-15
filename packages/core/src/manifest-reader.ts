/**
 * Manifest Reader - Base class for reading extension and task manifests
 *
 * Provides abstract interface for reading manifests from different sources
 * (VSIX files, filesystem, etc.). Implementations provide source-specific
 * reading logic while sharing the same interface.
 *
 * Architecture:
 * - ManifestReader (base/abstract) - defines interface
 * - VsixReader extends ManifestReader - reads from VSIX
 * - FilesystemManifestReader extends ManifestReader - reads from filesystem
 */

/**
 * Extension manifest from vss-extension.json
 */
export interface ExtensionManifest {
  manifestVersion?: number;
  id: string;
  publisher: string;
  version: string;
  name?: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  targets?: Array<{ id: string }>;
  icons?: Record<string, string>;
  content?: Record<string, string>;
  files?: Array<{ path: string; packagePath?: string }>;
  contributions?: Array<{
    id: string;
    type: string;
    targets?: string[];
    properties?: Record<string, unknown>;
  }>;
  galleryFlags?: string[];
  [key: string]: unknown;
}

/**
 * Task manifest from task.json
 */
export interface TaskManifest {
  id: string;
  name: string;
  friendlyName: string;
  description: string;
  version: {
    Major: number;
    Minor: number;
    Patch: number;
  };
  instanceNameFormat?: string;
  inputs?: Array<{
    name: string;
    type: string;
    label: string;
    required?: boolean;
    defaultValue?: string;
    [key: string]: unknown;
  }>;
  execution?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Quick metadata access
 */
export interface ManifestMetadata {
  publisher: string;
  extensionId: string;
  version: string;
  name?: string;
  description?: string;
}

/**
 * Task information
 */
export interface TaskInfo {
  name: string;
  friendlyName: string;
  version: string;
  path: string;
}

/**
 * ManifestReader - Abstract base class for reading manifests
 *
 * Provides a common interface for reading extension and task manifests
 * from different sources (VSIX files, filesystem, etc.).
 *
 * Subclasses must implement:
 * - readExtensionManifest(): Read the main extension manifest
 * - readTaskManifest(path): Read a specific task manifest
 * - findTaskPaths(): Find all task paths in the extension
 * - close(): Clean up resources
 */
export abstract class ManifestReader {
  /**
   * Read the extension manifest (vss-extension.json or extension.vsomanifest)
   * @returns Parsed extension manifest
   */
  abstract readExtensionManifest(): Promise<ExtensionManifest>;

  /**
   * Read a task manifest (task.json)
   * @param taskPath Path to the task directory or task.json file
   * @returns Parsed task manifest
   */
  abstract readTaskManifest(taskPath: string): Promise<TaskManifest>;

  /**
   * Find all task paths in the extension
   * @returns Array of task directory paths
   */
  abstract findTaskPaths(): Promise<string[]>;

  /**
   * Close and clean up resources
   */
  abstract close(): Promise<void>;

  /**
   * Read all task manifests in the extension
   * Default implementation using findTaskPaths() and readTaskManifest()
   * Subclasses can override for optimization
   * @returns Array of task manifests with their paths
   */
  async readTaskManifests(): Promise<Array<{ path: string; manifest: TaskManifest }>> {
    const taskPaths = await this.findTaskPaths();
    const results: Array<{ path: string; manifest: TaskManifest }> = [];

    for (const taskPath of taskPaths) {
      try {
        const manifest = await this.readTaskManifest(taskPath);
        results.push({ path: taskPath, manifest });
      } catch {
        // Skip tasks that don't have valid task.json
        // Silently continue - caller can check if all expected tasks were found
      }
    }

    return results;
  }

  /**
   * Get quick metadata about the extension
   * Default implementation using readExtensionManifest()
   * @returns Extension metadata
   */
  async getMetadata(): Promise<ManifestMetadata> {
    const manifest = await this.readExtensionManifest();
    return {
      publisher: manifest.publisher,
      extensionId: manifest.id,
      version: manifest.version,
      name: manifest.name,
      description: manifest.description,
    };
  }

  /**
   * Get information about all tasks in the extension
   * Default implementation using readTaskManifests()
   * @returns Array of task information
   */
  async getTasksInfo(): Promise<TaskInfo[]> {
    const tasks = await this.readTaskManifests();
    return tasks.map(({ path, manifest }) => ({
      name: manifest.name,
      friendlyName: manifest.friendlyName,
      version: `${manifest.version.Major}.${manifest.version.Minor}.${manifest.version.Patch}`,
      path,
    }));
  }
}
