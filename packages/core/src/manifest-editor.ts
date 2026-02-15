/**
 * Manifest Editor - Unified manifest editing for both VSIX and filesystem sources
 *
 * Provides chainable API for modifying extension and task manifests.
 * Tracks modifications without writing until toWriter() is called.
 * Works with any ManifestReader implementation (VSIX or filesystem).
 *
 * Centralizes all logic for calculating UUIDs, updating task versions, etc.
 */

import { v5 as uuidv5 } from 'uuid';
import type { ManifestReader, ExtensionManifest, TaskManifest } from './manifest-reader.js';
import { Buffer } from 'buffer';

/**
 * Tracks a file modification
 */
interface FileModification {
  type: 'add' | 'modify' | 'remove';
  path: string;
  content?: Buffer;
}

/**
 * Options for creating a ManifestEditor
 */
export interface ManifestEditorOptions {
  reader: ManifestReader;
}

/**
 * Options for applying changes to manifests
 * Contains all possible modifications that can be made to an extension
 */
export interface ApplyManifestOptions {
  // Extension manifest overrides
  publisherId?: string;
  extensionId?: string;
  extensionTag?: string;
  extensionVersion?: string;
  extensionName?: string;
  extensionVisibility?: 'public' | 'private' | 'public_preview' | 'private_preview';
  extensionPricing?: 'free' | 'paid' | 'trial';

  // Task updates
  updateTasksVersion?: boolean;
  updateTasksVersionType?: 'major' | 'minor' | 'patch';
  updateTasksId?: boolean;
}

/**
 * ManifestEditor - Unified editor for extension and task manifests
 *
 * Works with any ManifestReader (VsixReader, FilesystemManifestReader, etc.)
 * Provides chainable API for modifications and centralizes all manifest
 * editing logic including UUID generation and task version calculations.
 *
 * Example usage with VSIX:
 * ```typescript
 * const reader = await VsixReader.open('input.vsix');
 * const editor = ManifestEditor.fromReader(reader);
 * await editor
 *   .setPublisher('new-publisher')
 *   .setVersion('2.0.0')
 *   .updateAllTaskVersions('2.0.0', 'major')
 *   .updateAllTaskIds();
 * const writer = await editor.toWriter();
 * await writer.writeToFile('output.vsix');
 * ```
 *
 * Example usage with filesystem:
 * ```typescript
 * const reader = new FilesystemManifestReader({ rootFolder: './src', platform });
 * const editor = ManifestEditor.fromReader(reader);
 * await editor
 *   .setVersion('1.5.0')
 *   .updateAllTaskVersions('1.5.0', 'minor');
 * const writer = await editor.toWriter();
 * await writer.writeToFilesystem('./dist');
 * ```
 */
export class ManifestEditor {
  private readonly reader: ManifestReader;
  private modifications: Map<string, FileModification> = new Map();
  private manifestModifications: Partial<ExtensionManifest> = {};
  private taskManifestModifications: Map<string, Partial<TaskManifest>> = new Map();

  // Track original task IDs for updating extension manifest references
  private taskIdUpdates: Map<string, { oldId: string; newId: string }> = new Map();

  constructor(options: ManifestEditorOptions) {
    this.reader = options.reader;
  }

  /**
   * Create an editor from a reader
   * @param reader The manifest reader (VSIX or filesystem)
   * @returns ManifestEditor instance
   */
  static fromReader(reader: ManifestReader): ManifestEditor {
    return new ManifestEditor({ reader });
  }

  /**
   * Apply a set of options to the manifest
   * This is the main entry point for batch modifications
   * All conditional logic for applying changes is contained here
   *
   * @param options Options to apply
   * @returns Promise<this> for async chaining
   */
  async applyOptions(options: ApplyManifestOptions): Promise<this> {
    // Apply extension manifest overrides
    if (options.publisherId) {
      this.setPublisher(options.publisherId);
    }

    // Handle extension ID with optional tag
    if (options.extensionId) {
      let extensionId = options.extensionId;
      if (options.extensionTag) {
        extensionId = extensionId + options.extensionTag;
      }
      this.setExtensionId(extensionId);
    }

    if (options.extensionVersion) {
      this.setVersion(options.extensionVersion);
    }

    if (options.extensionName) {
      this.setName(options.extensionName);
    }

    if (options.extensionVisibility) {
      this.setVisibility(options.extensionVisibility);
    }

    if (options.extensionPricing) {
      this.setPricing(options.extensionPricing);
    }

    // Apply task updates
    if (options.updateTasksVersion && options.extensionVersion) {
      const versionType = options.updateTasksVersionType || 'major';
      await this.updateAllTaskVersions(options.extensionVersion, versionType);
    }

    if (options.updateTasksId) {
      await this.updateAllTaskIds();
    }

    return this;
  }

  /**
   * Set the publisher ID
   * @param publisher New publisher ID
   * @returns This editor for chaining
   */
  setPublisher(publisher: string): this {
    this.manifestModifications.publisher = publisher;
    return this;
  }

  /**
   * Set the extension ID
   * @param id New extension ID
   * @returns This editor for chaining
   */
  setExtensionId(id: string): this {
    this.manifestModifications.id = id;
    return this;
  }

  /**
   * Set the extension version
   * @param version New version (e.g., "1.2.3")
   * @returns This editor for chaining
   */
  setVersion(version: string): this {
    this.manifestModifications.version = version;
    return this;
  }

  /**
   * Set the extension name
   * @param name New display name
   * @returns This editor for chaining
   */
  setName(name: string): this {
    this.manifestModifications.name = name;
    return this;
  }

  /**
   * Set the extension description
   * @param description New description
   * @returns This editor for chaining
   */
  setDescription(description: string): this {
    this.manifestModifications.description = description;
    return this;
  }

  /**
   * Set extension visibility in gallery
   * @param visibility 'public', 'private', 'public_preview', or 'private_preview'
   * @returns This editor for chaining
   */
  setVisibility(visibility: 'public' | 'private' | 'public_preview' | 'private_preview'): this {
    if (!this.manifestModifications.galleryFlags) {
      this.manifestModifications.galleryFlags = [];
    }
    const flags = this.manifestModifications.galleryFlags;

    // Remove existing visibility flags
    const visibilityFlags = ['Public', 'Private', 'Preview'];
    for (const flag of visibilityFlags) {
      const index = flags.indexOf(flag);
      if (index >= 0) {
        flags.splice(index, 1);
      }
    }

    // Add new flags based on visibility
    if (visibility === 'public') {
      flags.push('Public');
    } else if (visibility === 'private') {
      flags.push('Private');
    } else if (visibility === 'public_preview') {
      flags.push('Public', 'Preview');
    } else if (visibility === 'private_preview') {
      flags.push('Private', 'Preview');
    }

    return this;
  }

  /**
   * Set extension pricing model
   * @param pricing 'free', 'paid', or 'trial'
   * @returns This editor for chaining
   */
  setPricing(pricing: 'free' | 'paid' | 'trial'): this {
    if (!this.manifestModifications.galleryFlags) {
      this.manifestModifications.galleryFlags = [];
    }
    const flags = this.manifestModifications.galleryFlags;

    // Remove existing pricing flags
    const pricingFlags = ['Free', 'Paid', 'Trial'];
    for (const flag of pricingFlags) {
      const index = flags.indexOf(flag);
      if (index >= 0) {
        flags.splice(index, 1);
      }
    }

    // Add new flag
    const flagMap = { free: 'Free', paid: 'Paid', trial: 'Trial' };
    flags.push(flagMap[pricing]);

    return this;
  }

  /**
   * Update a specific task's version
   * @param taskName Name of the task
   * @param extensionVersion Extension version to apply (e.g., "1.2.3")
   * @param versionType How to apply the version: 'major', 'minor', or 'patch'
   * @returns This editor for chaining
   */
  updateTaskVersion(
    taskName: string,
    extensionVersion: string,
    versionType: 'major' | 'minor' | 'patch' = 'major'
  ): this {
    const versionParts = extensionVersion.split('.');
    if (versionParts.length > 3) {
      // Warning: version has more than 3 parts
      // Taking only first 3
    }

    const newVersion = {
      major: parseInt(versionParts[0], 10) || 0,
      minor: parseInt(versionParts[1], 10) || 0,
      patch: parseInt(versionParts[2], 10) || 0,
    };

    if (!this.taskManifestModifications.has(taskName)) {
      this.taskManifestModifications.set(taskName, {});
    }

    const taskMods = this.taskManifestModifications.get(taskName);

    // Get existing version from modifications or we'll read it when applying
    const existingVersion = taskMods.version || { Major: 0, Minor: 0, Patch: 0 };

    // Apply version update based on type (cascading per v5 logic)
    switch (versionType) {
      case 'major':
        taskMods.version = {
          Major: newVersion.major,
          Minor: newVersion.minor,
          Patch: newVersion.patch,
        };
        break;
      case 'minor':
        taskMods.version = {
          Major: existingVersion.Major,
          Minor: newVersion.minor,
          Patch: newVersion.patch,
        };
        break;
      case 'patch':
        taskMods.version = {
          Major: existingVersion.Major,
          Minor: existingVersion.Minor,
          Patch: newVersion.patch,
        };
        break;
    }

    return this;
  }

  /**
   * Update a specific task's ID (UUID) using v5 namespacing
   * @param taskName Name of the task
   * @param publisherId Publisher ID (for UUID generation)
   * @param extensionId Extension ID (for UUID generation)
   * @returns This editor for chaining
   */
  updateTaskId(taskName: string, publisherId: string, extensionId: string): this {
    // Generate deterministic UUID v5 based on publisher, extension, and task name
    // This matches v5 implementation exactly
    const marketplaceNamespace = uuidv5('https://marketplace.visualstudio.com/vsts', uuidv5.URL);
    const taskNamespace = `${publisherId}.${extensionId}.${taskName}`;
    const newId = uuidv5(taskNamespace, marketplaceNamespace);

    if (!this.taskManifestModifications.has(taskName)) {
      this.taskManifestModifications.set(taskName, {});
    }

    const taskMods = this.taskManifestModifications.get(taskName);

    // Store old ID for updating extension manifest references later
    // We'll read the old ID when applying modifications
    taskMods.id = newId;

    return this;
  }

  /**
   * Update all tasks' versions in the extension
   * Reads all tasks from the reader and updates their versions
   * @param extensionVersion Extension version to apply
   * @param versionType How to apply the version: 'major', 'minor', or 'patch'
   * @returns Promise<this> for async chaining
   */
  async updateAllTaskVersions(
    extensionVersion: string,
    versionType: 'major' | 'minor' | 'patch' = 'major'
  ): Promise<this> {
    const tasks = await this.reader.getTasksInfo();
    const versionParts = extensionVersion.split('.');
    const parsedVersion = {
      major: parseInt(versionParts[0], 10) || 0,
      minor: parseInt(versionParts[1], 10) || 0,
      patch: parseInt(versionParts[2], 10) || 0,
    };

    for (const task of tasks) {
      const existingParts = (task.version || '0.0.0').split('.');
      const existingVersion = {
        Major: parseInt(existingParts[0], 10) || 0,
        Minor: parseInt(existingParts[1], 10) || 0,
        Patch: parseInt(existingParts[2], 10) || 0,
      };

      if (!this.taskManifestModifications.has(task.name)) {
        this.taskManifestModifications.set(task.name, {});
      }

      const taskMods = this.taskManifestModifications.get(task.name);

      switch (versionType) {
        case 'major':
          taskMods.version = {
            Major: parsedVersion.major,
            Minor: parsedVersion.minor,
            Patch: parsedVersion.patch,
          };
          break;
        case 'minor':
          taskMods.version = {
            Major: existingVersion.Major,
            Minor: parsedVersion.minor,
            Patch: parsedVersion.patch,
          };
          break;
        case 'patch':
          taskMods.version = {
            Major: existingVersion.Major,
            Minor: existingVersion.Minor,
            Patch: parsedVersion.patch,
          };
          break;
      }
    }

    return this;
  }

  /**
   * Update all tasks' IDs in the extension using v5 namespacing
   * Reads extension manifest for publisher/ID and all tasks from reader
   * @returns Promise<this> for async chaining
   */
  async updateAllTaskIds(): Promise<this> {
    const manifest = await this.reader.readExtensionManifest();
    const publisherId = this.manifestModifications.publisher || manifest.publisher;
    const extensionId = this.manifestModifications.id || manifest.id;

    const tasks = await this.reader.getTasksInfo();

    for (const task of tasks) {
      this.updateTaskId(task.name, publisherId, extensionId);
    }

    return this;
  }

  /**
   * Add or modify a file
   * @param path Path to the file
   * @param content File content
   * @returns This editor for chaining
   */
  setFile(path: string, content: Buffer | string): this {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const normalizedPath = path.replace(/\\/g, '/');

    this.modifications.set(normalizedPath, {
      type: 'modify',
      path: normalizedPath,
      content: buffer,
    });

    return this;
  }

  /**
   * Remove a file
   * @param path Path to the file
   * @returns This editor for chaining
   */
  removeFile(path: string): this {
    const normalizedPath = path.replace(/\\/g, '/');

    this.modifications.set(normalizedPath, {
      type: 'remove',
      path: normalizedPath,
    });

    return this;
  }

  /**
   * Convert to a writer for output
   * The writer type depends on the reader type
   * @returns Promise<Writer> ready to write (VsixWriter or FilesystemManifestWriter)
   */
  async toWriter(): Promise<any> {
    // Dynamically import based on reader type
    const readerConstructorName = this.reader.constructor.name;

    if (readerConstructorName === 'VsixReader') {
      const { VsixWriter } = await import('./vsix-writer.js');
      return VsixWriter.fromEditor(this);
    } else if (readerConstructorName === 'FilesystemManifestReader') {
      const { FilesystemManifestWriter } = await import('./filesystem-manifest-writer.js');
      return FilesystemManifestWriter.fromEditor(this);
    } else {
      throw new Error(`Unsupported reader type: ${readerConstructorName}`);
    }
  }

  /**
   * Get the source reader
   * @internal
   */
  getReader(): ManifestReader {
    return this.reader;
  }

  /**
   * Get all file modifications
   * @internal
   */
  getModifications(): Map<string, FileModification> {
    return this.modifications;
  }

  /**
   * Get manifest modifications
   * @internal
   */
  getManifestModifications(): Partial<ExtensionManifest> {
    return this.manifestModifications;
  }

  /**
   * Get task manifest modifications
   * @internal
   */
  getTaskManifestModifications(): Map<string, Partial<TaskManifest>> {
    return this.taskManifestModifications;
  }

  /**
   * Get task ID updates (for updating extension manifest references)
   * @internal
   */
  getTaskIdUpdates(): Map<string, { oldId: string; newId: string }> {
    return this.taskIdUpdates;
  }
}
