/**
 * VSIX Editor - Modify VSIX files in memory
 * 
 * Provides chainable API for modifying VSIX archives.
 * Tracks modifications without writing until toWriter() is called.
 * 
 * Chain: Reader → Editor → Writer
 */

import type { VsixReader } from './vsix-reader.js';
import type { ExtensionManifest, TaskManifest } from './manifest-reader.js';
import type { VsixWriter } from './vsix-writer.js';
import { Buffer } from 'buffer';

/**
 * Tracks a file modification in the VSIX
 */
interface FileModification {
  type: 'add' | 'modify' | 'remove';
  path: string;
  content?: Buffer;
}

/**
 * VsixEditor - Chainable editor for VSIX modifications
 * 
 * Example usage:
 * ```typescript
 * const reader = await VsixReader.open('input.vsix');
 * const writer = await reader
 *   .toEditor()
 *   .setPublisher('new-publisher')
 *   .setVersion('2.0.0')
 *   .setVisibility('public')
 *   .toWriter();
 * await writer.writeToFile('output.vsix');
 * ```
 */
export class VsixEditor {
  private readonly reader: VsixReader;
  private modifications: Map<string, FileModification> = new Map();
  private manifestModifications: Partial<ExtensionManifest> = {};
  private taskManifestModifications: Map<string, Partial<TaskManifest>> = new Map();

  constructor(reader: VsixReader) {
    this.reader = reader;
  }

  /**
   * Create an editor from a reader
   * @param reader The VSIX reader to edit
   * @returns VsixEditor instance
   */
  static fromReader(reader: VsixReader): VsixEditor {
    return new VsixEditor(reader);
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
   * @param visibility 'public' or 'private'
   * @returns This editor for chaining
   */
  setVisibility(visibility: 'public' | 'private'): this {
    if (!this.manifestModifications.galleryFlags) {
      this.manifestModifications.galleryFlags = [];
    }
    const flags = this.manifestModifications.galleryFlags as string[];
    
    // Remove existing visibility flags
    const visibilityIndex = flags.findIndex(f => 
      f === 'Public' || f === 'Private'
    );
    if (visibilityIndex >= 0) {
      flags.splice(visibilityIndex, 1);
    }
    
    // Add new flag
    flags.push(visibility === 'public' ? 'Public' : 'Private');
    
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
    const flags = this.manifestModifications.galleryFlags as string[];
    
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
   * Update a task's version
   * @param taskName Name of the task
   * @param version New version (e.g., "1.2.3")
   * @returns This editor for chaining
   */
  updateTaskVersion(taskName: string, version: string): this {
    const [major, minor, patch] = version.split('.').map(Number);
    if (!this.taskManifestModifications.has(taskName)) {
      this.taskManifestModifications.set(taskName, {});
    }
    const taskMods = this.taskManifestModifications.get(taskName)!;
    taskMods.version = { Major: major, Minor: minor, Patch: patch };
    return this;
  }

  /**
   * Update a task's ID (UUID)
   * @param taskName Name of the task
   * @param id New task ID (UUID)
   * @returns This editor for chaining
   */
  updateTaskId(taskName: string, id: string): this {
    if (!this.taskManifestModifications.has(taskName)) {
      this.taskManifestModifications.set(taskName, {});
    }
    const taskMods = this.taskManifestModifications.get(taskName)!;
    taskMods.id = id;
    return this;
  }

  /**
   * Add or modify a file in the VSIX
   * @param path Path within the VSIX
   * @param content File content
   * @returns This editor for chaining
   */
  setFile(path: string, content: Buffer | string): this {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const normalizedPath = path.replace(/\\/g, '/');
    
    this.modifications.set(normalizedPath, {
      type: 'modify',
      path: normalizedPath,
      content: buffer
    });
    
    return this;
  }

  /**
   * Remove a file from the VSIX
   * @param path Path within the VSIX
   * @returns This editor for chaining
   */
  removeFile(path: string): this {
    const normalizedPath = path.replace(/\\/g, '/');
    
    this.modifications.set(normalizedPath, {
      type: 'remove',
      path: normalizedPath
    });
    
    return this;
  }

  /**
   * Convert to a writer for output
   * Creates a VsixWriter that will apply all modifications
   * @returns Promise<VsixWriter> ready to write
   */
  async toWriter(): Promise<VsixWriter> {
    // Import VsixWriter here to avoid circular dependency
    const { VsixWriter } = await import('./vsix-writer.js');
    return VsixWriter.fromEditor(this);
  }

  /**
   * Get the source reader
   * @internal
   */
  getReader(): VsixReader {
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
}
