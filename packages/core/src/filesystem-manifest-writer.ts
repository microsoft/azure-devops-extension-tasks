/**
 * Filesystem Manifest Writer - Write modified manifests to filesystem
 *
 * Writes extension and task manifests back to the filesystem and generates
 * an overrides.json file for tfx to use during packaging.
 */

import { mkdir, readFile, readdir, writeFile } from 'fs/promises';
import path from 'path';
import type { FilesystemManifestReader } from './filesystem-manifest-reader.js';
import type { ManifestEditor } from './manifest-editor.js';
import type { ExtensionManifest, TaskManifest } from './manifest-reader.js';
import type { IPlatformAdapter } from './platform.js';

/**
 * FilesystemManifestWriter - Write manifests to filesystem
 *
 * Writes modified extension and task manifests directly to filesystem files.
 * Also generates an overrides.json file in the temp directory that tfx can
 * use to override values during packaging without modifying source files.
 *
 * Example usage:
 * ```typescript
 * const reader = new FilesystemManifestReader({ rootFolder: './src', platform });
 * const editor = ManifestEditor.fromReader(reader);
 * editor.setVersion('2.0.0');
 * await editor.updateAllTaskVersions('2.0.0', 'major');
 *
 * const writer = await editor.toWriter();
 * await writer.writeToFilesystem();
 * await writer.close();
 *
 * // Use writer.getOverridesPath() with tfx --overrides-file
 * ```
 */
export class FilesystemManifestWriter {
  private readonly editor: ManifestEditor;
  private readonly platform: IPlatformAdapter;
  private overridesPath: string | null = null;

  private constructor(editor: ManifestEditor, platform: IPlatformAdapter) {
    this.editor = editor;
    this.platform = platform;
  }

  /**
   * Create a writer from an editor
   * @param editor The editor with modifications
   * @returns FilesystemManifestWriter instance
   */
  static fromEditor(editor: ManifestEditor): FilesystemManifestWriter {
    const reader = editor.getReader();

    // Ensure reader is a FilesystemManifestReader
    if (reader.constructor.name !== 'FilesystemManifestReader') {
      throw new Error('FilesystemManifestWriter can only be used with FilesystemManifestReader');
    }

    // Get platform from reader (we need it for file operations)
    const fsReader = reader as FilesystemManifestReader;
    const platform = (fsReader as any).platform as IPlatformAdapter;

    return new FilesystemManifestWriter(editor, platform);
  }

  /**
   * Write modified manifests to the filesystem
   *
   * This updates task.json files directly and writes extension manifest changes.
   * It also generates an overrides.json in the temp directory that can be passed
   * to tfx with --overrides-file.
   *
   * @returns Promise that resolves when writing is complete
   */
  async writeToFilesystem(): Promise<void> {
    const reader = this.editor.getReader() as FilesystemManifestReader;
    const rootFolder = (reader as any).getRootFolder() as string;

    const manifestMods = this.editor.getManifestModifications();
    const taskManifestMods = this.editor.getTaskManifestModifications();
    const fileMods = this.editor.getModifications();

    this.platform.debug('Writing manifests to filesystem...');

    // Optional: synchronize extension manifest binary file entries
    let synchronizedManifests: Array<{ manifestPath: string; manifest: ExtensionManifest }> = [];
    if (this.editor.shouldSynchronizeBinaryFileEntries()) {
      synchronizedManifests = await this.synchronizeBinaryFileEntries(reader, rootFolder);
    }

    // Step 1: Write task manifest modifications
    if (taskManifestMods.size > 0) {
      await this.writeTaskManifests(reader, rootFolder, taskManifestMods);
    }

    // Step 2: Write extension manifest modifications (if directly modifying source)
    // Note: For package command, we typically use overrides.json instead
    // But we support direct writes for other scenarios
    if (Object.keys(manifestMods).length > 0 || synchronizedManifests.length > 0) {
      await this.writeSynchronizedManifests(reader, manifestMods, synchronizedManifests);
    }

    // Step 3: Write any additional file modifications
    for (const [filePath, mod] of fileMods) {
      if (mod.type === 'modify' && mod.content) {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootFolder, filePath);

        this.platform.debug(`Writing file: ${absolutePath}`);
        await writeFile(absolutePath, new Uint8Array(mod.content));
      }
    }

    // Step 4: Generate overrides.json for extension manifest overrides
    // This is used by tfx during packaging to override values without modifying source
    await this.generateOverridesFile(manifestMods);

    this.platform.info('Manifests written to filesystem successfully');
  }

  /**
   * Write task manifest modifications to filesystem
   */
  private async writeTaskManifests(
    reader: FilesystemManifestReader,
    rootFolder: string,
    taskManifestMods: Map<string, Partial<TaskManifest>>
  ): Promise<void> {
    const tasks = await reader.readTaskManifests();
    const appliedTaskNames = new Set<string>();

    // Get packagePath map to resolve actual source paths
    const packagePathMap = (await (reader as any).buildPackagePathMap()) as Map<string, string>;

    for (const { path: taskPath, manifest } of tasks) {
      const mods = taskManifestMods.get(manifest.name);
      if (mods) {
        appliedTaskNames.add(manifest.name);
        // Apply modifications
        Object.assign(manifest, mods);

        // Resolve actual source path using prefix matching (same logic as reader)
        let actualPath = taskPath;
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
          `Writing task manifest: taskPath='${taskPath}', actualPath='${actualPath}'`
        );

        // Resolve absolute path
        const absoluteTaskPath = path.isAbsolute(actualPath)
          ? actualPath
          : path.join(rootFolder, actualPath);

        const taskJsonPath = path.join(absoluteTaskPath, 'task.json');

        this.platform.debug(`Writing to file: ${taskJsonPath}`);
        const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
        await writeFile(taskJsonPath, manifestJson, 'utf-8');
      }
    }

    // Fallback: apply modifications for tasks not discoverable via contribution paths
    for (const [taskName, mods] of taskManifestMods.entries()) {
      if (appliedTaskNames.has(taskName)) {
        continue;
      }

      const fallbackTaskDir = await this.findTaskDirectoryByName(rootFolder, taskName);
      if (!fallbackTaskDir) {
        this.platform.debug(`No task.json found for task '${taskName}' during fallback write`);
        continue;
      }

      const taskJsonPath = path.join(fallbackTaskDir, 'task.json');
      const content = (await readFile(taskJsonPath)).toString('utf8');
      const manifest = JSON.parse(content) as TaskManifest;
      Object.assign(manifest, mods);

      this.platform.debug(`Fallback writing task manifest: ${taskJsonPath}`);
      await writeFile(taskJsonPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    }
  }

  /**
   * Recursively find a task directory by task manifest name
   */
  private async findTaskDirectoryByName(
    rootFolder: string,
    taskName: string
  ): Promise<string | null> {
    const stack: string[] = [rootFolder];

    while (stack.length > 0) {
      const current = stack.pop();
      let entries;

      try {
        entries = await readdir(current, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const absolutePath = path.join(current, entry.name);

        if (entry.isDirectory()) {
          stack.push(absolutePath);
          continue;
        }

        if (!entry.isFile() || entry.name !== 'task.json') {
          continue;
        }

        try {
          const content = (await readFile(absolutePath)).toString('utf8');
          const manifest = JSON.parse(content) as TaskManifest;
          if (manifest.name === taskName) {
            return path.dirname(absolutePath);
          }
        } catch {
          // ignore unreadable/invalid task manifests during search
        }
      }
    }

    return null;
  }

  /**
   * Write extension manifest modifications to filesystem
   */
  private async writeExtensionManifest(
    reader: FilesystemManifestReader,
    manifestMods: Partial<ExtensionManifest>,
    baseManifest?: ExtensionManifest
  ): Promise<void> {
    const manifest = baseManifest ?? (await reader.readExtensionManifest());
    Object.assign(manifest, manifestMods);

    // Get manifest path from reader
    const manifestPath = (reader as any).getManifestPath() as string;
    if (!manifestPath) {
      throw new Error('Extension manifest path not resolved');
    }

    this.platform.debug(`Writing extension manifest: ${manifestPath}`);
    await this.writeManifestAtPath(manifestPath, manifest);
  }

  private async writeSynchronizedManifests(
    reader: FilesystemManifestReader,
    manifestMods: Partial<ExtensionManifest>,
    synchronizedManifests: Array<{ manifestPath: string; manifest: ExtensionManifest }>
  ): Promise<void> {
    const primaryManifestPath = (reader as any).getManifestPath() as string | null;
    const synchronizedByPath = new Map<string, ExtensionManifest>(
      synchronizedManifests.map((item) => [item.manifestPath, item.manifest])
    );

    // Apply explicit extension manifest modifications to primary manifest only.
    if (Object.keys(manifestMods).length > 0) {
      const primaryBaseManifest = primaryManifestPath
        ? synchronizedByPath.get(primaryManifestPath)
        : undefined;
      await this.writeExtensionManifest(reader, manifestMods, primaryBaseManifest);

      if (primaryManifestPath) {
        synchronizedByPath.delete(primaryManifestPath);
      }
    }

    // Write remaining synchronized manifests without extension-level overrides.
    for (const [manifestPath, manifest] of synchronizedByPath) {
      this.platform.debug(`Writing synchronized extension manifest: ${manifestPath}`);
      await this.writeManifestAtPath(manifestPath, manifest);
    }
  }

  private async writeManifestAtPath(
    manifestPath: string,
    manifest: ExtensionManifest
  ): Promise<void> {
    const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
    await writeFile(manifestPath, manifestJson, 'utf-8');
  }

  /**
   * Synchronize extension manifest file entries for extensionless files.
   *
   * Behavior ported from the legacy manifest-fix workflow:
   * 1) Remove all explicit application/octet-stream file entries
   * 2) Re-scan manifest-referenced directories
   * 3) Add extensionless files back as application/octet-stream
   *
   * packagePath mapping is preserved for added file entries.
   */
  private async synchronizeBinaryFileEntries(
    reader: FilesystemManifestReader,
    rootFolder: string
  ): Promise<Array<{ manifestPath: string; manifest: ExtensionManifest }>> {
    const allManifests = await reader.readAllExtensionManifests();

    if (allManifests.length === 0) {
      this.platform.debug('No extension manifest files array found; skipping binary file sync');
      return [];
    }

    const changedManifests: Array<{ manifestPath: string; manifest: ExtensionManifest }> = [];
    let totalRemovedCount = 0;
    let totalAddedCount = 0;

    for (const { path: manifestPath, manifest } of allManifests) {
      const originalFiles = Array.isArray(manifest.files) ? manifest.files : [];
      if (originalFiles.length === 0) {
        continue;
      }

      const retainedFiles = originalFiles.filter(
        (entry) => entry.contentType !== 'application/octet-stream'
      );
      const removedCount = originalFiles.length - retainedFiles.length;
      totalRemovedCount += removedCount;

      const scanRoots = await this.getManifestDirectoryScanRoots(rootFolder, retainedFiles);

      const existingKeys = new Set<string>();
      for (const entry of retainedFiles) {
        existingKeys.add(this.getManifestEntryKey(entry.path, entry.packagePath));
      }

      const addedEntries: Array<{ path: string; packagePath?: string; contentType: string }> = [];

      for (const scanRoot of scanRoots) {
        const files = await this.collectFilesRecursive(scanRoot.absolutePath);

        for (const absoluteFilePath of files) {
          const fileName = path.basename(absoluteFilePath);
          if (!this.isExtensionlessFileName(fileName)) {
            continue;
          }

          const relativeInsideRoot = this.toPosixPath(
            path.relative(scanRoot.absolutePath, absoluteFilePath)
          );

          const filePath = this.joinManifestPath(scanRoot.manifestPathPrefix, relativeInsideRoot);
          const packagePath = scanRoot.packagePathPrefix
            ? this.joinManifestPath(scanRoot.packagePathPrefix, relativeInsideRoot)
            : undefined;

          const key = this.getManifestEntryKey(filePath, packagePath);
          if (existingKeys.has(key)) {
            continue;
          }

          existingKeys.add(key);
          addedEntries.push({
            path: filePath,
            packagePath,
            contentType: 'application/octet-stream',
          });
        }
      }

      totalAddedCount += addedEntries.length;

      if (removedCount > 0 || addedEntries.length > 0) {
        manifest.files = [...retainedFiles, ...addedEntries];
        changedManifests.push({ manifestPath, manifest });
      }
    }

    if (changedManifests.length === 0) {
      this.platform.debug('Binary file sync: no changes required');
      return [];
    }

    this.platform.info(
      `Synchronized binary file entries in extension manifests (removed ${totalRemovedCount}, added ${totalAddedCount})`
    );
    return changedManifests;
  }

  private async getManifestDirectoryScanRoots(
    rootFolder: string,
    fileEntries: Array<{ path: string; packagePath?: string }>
  ): Promise<
    Array<{ absolutePath: string; manifestPathPrefix: string; packagePathPrefix?: string }>
  > {
    const roots: Array<{
      absolutePath: string;
      manifestPathPrefix: string;
      packagePathPrefix?: string;
    }> = [];

    for (const entry of fileEntries) {
      if (!entry.path) {
        continue;
      }

      const absolutePath = path.isAbsolute(entry.path)
        ? entry.path
        : path.join(rootFolder, entry.path.replace(/\//g, path.sep));

      let stats;
      try {
        stats = await readdir(absolutePath, { withFileTypes: true });
      } catch {
        continue;
      }

      // If directory is readable, we consider it a scan root
      if (Array.isArray(stats)) {
        roots.push({
          absolutePath,
          manifestPathPrefix: this.toPosixPath(entry.path),
          packagePathPrefix: entry.packagePath ? this.toPosixPath(entry.packagePath) : undefined,
        });
      }
    }

    return roots;
  }

  private async collectFilesRecursive(directory: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        const nestedFiles = await this.collectFilesRecursive(absolutePath);
        files.push(...nestedFiles);
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }

    return files;
  }

  private isExtensionlessFileName(fileName: string): boolean {
    return !/\.[^.]+$/.test(fileName) || fileName.endsWith('.');
  }

  private toPosixPath(inputPath: string): string {
    return inputPath.replace(/\\/g, '/').replace(/^\.\//, '');
  }

  private joinManifestPath(basePath: string, relativePath: string): string {
    const normalizedBase = this.toPosixPath(basePath).replace(/\/$/, '');
    const normalizedRelative = this.toPosixPath(relativePath).replace(/^\//, '');
    if (!normalizedRelative) {
      return normalizedBase;
    }
    return `${normalizedBase}/${normalizedRelative}`;
  }

  private getManifestEntryKey(filePath: string, packagePath?: string): string {
    const normalizedPath = this.toPosixPath(filePath);
    const normalizedPackagePath = packagePath ? this.toPosixPath(packagePath) : '';
    return `${normalizedPath}::${normalizedPackagePath}`;
  }

  /**
   * Generate overrides.json file in temp directory
   *
   * This file can be passed to tfx with --overrides-file to override
   * extension manifest values during packaging without modifying source files.
   */
  private async generateOverridesFile(manifestMods: Partial<ExtensionManifest>): Promise<void> {
    if (Object.keys(manifestMods).length === 0) {
      this.platform.debug('No manifest modifications, skipping overrides.json generation');
      return;
    }

    // Create overrides object with only the fields that should be overridden
    const overrides: any = {};

    if (manifestMods.publisher) {
      overrides.publisher = manifestMods.publisher;
    }

    if (manifestMods.id) {
      overrides.id = manifestMods.id;
    }

    if (manifestMods.version) {
      overrides.version = manifestMods.version;
    }

    if (manifestMods.name) {
      overrides.name = manifestMods.name;
    }

    if (manifestMods.description) {
      overrides.description = manifestMods.description;
    }

    if (manifestMods.galleryFlags) {
      overrides.galleryFlags = manifestMods.galleryFlags;
    }

    // Write to temp directory
    const tempDir = this.platform.getTempDir();
    await mkdir(tempDir, { recursive: true });
    this.overridesPath = path.join(tempDir, `overrides-${Date.now()}.json`);

    this.platform.debug(`Writing overrides file: ${this.overridesPath}`);
    const overridesJson = JSON.stringify(overrides, null, 2) + '\n';
    await writeFile(this.overridesPath, overridesJson, 'utf-8');

    this.platform.info(`Generated overrides file: ${this.overridesPath}`);
  }

  /**
   * Get the path to the generated overrides.json file
   * This can be passed to tfx with --overrides-file
   * @returns Path to overrides.json or null if not generated
   */
  getOverridesPath(): string | null {
    return this.overridesPath;
  }

  /**
   * Close and cleanup resources
   */
  async close(): Promise<void> {
    // Could clean up overrides file here, but we leave it for tfx to use
    // Temp directory will be cleaned up by the build agent
  }
}
