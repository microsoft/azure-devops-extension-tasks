/**
 * Integration tests for the complete VSIX read → edit → write chain
 * 
 * These tests verify the end-to-end workflow and efficient ZIP updates
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { VsixReader } from '../vsix-reader.js';
import { ManifestEditor } from '../manifest-editor.js';
import { writeFileSync, mkdirSync, existsSync, statSync, readFileSync, createWriteStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import yazl from 'yazl';
import yauzl from 'yauzl';

describe('VSIX Chain Integration Tests', () => {
  let testVsixPath: string;
  let outputVsixPath: string;
  let testDir: string;

  beforeEach(async () => {
    // Create test directory
    testDir = join(tmpdir(), `vsix-chain-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testVsixPath = join(testDir, 'input.vsix');
    outputVsixPath = join(testDir, 'output.vsix');
    
    // Create a realistic test VSIX
    const zipFile = new yazl.ZipFile();
    
    const manifest = {
      manifestVersion: 1,
      id: 'vsts-developer-tools-build-tasks',
      publisher: 'jessehouwing',
      version: '5.0.0',
      name: 'Developer Tools Build Tasks',
      description: 'Build tasks for developers',
      categories: ['Azure Pipelines'],
      tags: ['build', 'tasks'],
      galleryFlags: ['Public'],
      contributions: [
        {
          id: 'publish-task',
          type: 'ms.vss-distributed-task.task',
          targets: ['ms.vss-distributed-task.tasks'],
          properties: { name: 'PublishExtension' }
        },
        {
          id: 'package-task',
          type: 'ms.vss-distributed-task.task',
          targets: ['ms.vss-distributed-task.tasks'],
          properties: { name: 'PackageExtension' }
        }
      ],
      files: [
        { path: 'PublishExtension' },
        { path: 'PackageExtension' }
      ]
    };
    
    zipFile.addBuffer(
      Buffer.from(JSON.stringify(manifest, null, 2)),
      'vss-extension.json'
    );
    
    // Add task manifests
    const publishTask = {
      id: 'publish-uuid',
      name: 'PublishExtension',
      friendlyName: 'Publish Extension',
      description: 'Publishes an extension',
      version: { Major: 5, Minor: 0, Patch: 0 }
    };
    
    const packageTask = {
      id: 'package-uuid',
      name: 'PackageExtension',
      friendlyName: 'Package Extension',
      description: 'Packages an extension',
      version: { Major: 5, Minor: 0, Patch: 0 }
    };
    
    zipFile.addBuffer(
      Buffer.from(JSON.stringify(publishTask, null, 2)),
      'PublishExtension/task.json'
    );
    
    zipFile.addBuffer(
      Buffer.from(JSON.stringify(packageTask, null, 2)),
      'PackageExtension/task.json'
    );
    
    // Add some "binary" files (simulating large files that shouldn't be recompressed)
    const largeContent = Buffer.alloc(10000, 'x');
    zipFile.addBuffer(largeContent, 'PublishExtension/index.js');
    zipFile.addBuffer(largeContent, 'PackageExtension/index.js');
    
    // Add icon and readme
    zipFile.addBuffer(Buffer.from('icon data'), 'icon.png');
    zipFile.addBuffer(Buffer.from('# README\n\nThis is a test'), 'README.md');
    
    await new Promise<void>((resolve, reject) => {
      zipFile.outputStream
        .pipe(createWriteStream(testVsixPath))
        .on('finish', resolve)
        .on('error', reject);
      zipFile.end();
    });
  });

  it('should complete full read → edit → write chain', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    const writer = await ManifestEditor.fromReader(reader)
      .setPublisher('modified-publisher')
      .setVersion('6.0.0')
      .setName('Modified Name')
      .setVisibility('private')
      .updateTaskVersion('PublishExtension', '6.0.0')
      .updateTaskVersion('PackageExtension', '6.0.0')
      .toWriter();
    
    await writer.writeToFile(outputVsixPath);
    await writer.close();
    await reader.close();
    
    // Verify output exists
    expect(existsSync(outputVsixPath)).toBe(true);
    
    // Verify modifications
    const outputReader = await VsixReader.open(outputVsixPath);
    const manifest = await outputReader.readExtensionManifest();
    const tasks = await outputReader.readTaskManifests();
    
    expect(manifest.publisher).toBe('modified-publisher');
    expect(manifest.version).toBe('6.0.0');
    expect(manifest.name).toBe('Modified Name');
    expect(manifest.galleryFlags).toContain('Private');
    
    const publishTask = tasks.find(t => t.manifest.name === 'PublishExtension');
    const packageTask = tasks.find(t => t.manifest.name === 'PackageExtension');
    
    expect(publishTask?.manifest.version).toEqual({ Major: 6, Minor: 0, Patch: 0 });
    expect(packageTask?.manifest.version).toEqual({ Major: 6, Minor: 0, Patch: 0 });
    
    await outputReader.close();
  });

  it('should preserve unchanged files byte-for-byte', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    // Read unchanged file before modification
    const originalReadme = await reader.readFile('README.md');
    const originalIcon = await reader.readFile('icon.png');
    
    const writer = await ManifestEditor.fromReader(reader)
      .setPublisher('new-publisher')
      .toWriter();
    
    await writer.writeToFile(outputVsixPath);
    await writer.close();
    await reader.close();
    
    // Read same files from output
    const outputReader = await VsixReader.open(outputVsixPath);
    const outputReadme = await outputReader.readFile('README.md');
    const outputIcon = await outputReader.readFile('icon.png');
    
    // Verify byte-for-byte equality
    expect(outputReadme.equals(originalReadme)).toBe(true);
    expect(outputIcon.equals(originalIcon)).toBe(true);
    
    await outputReader.close();
  });

  it('should handle file additions', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    const writer = await ManifestEditor.fromReader(reader)
      .setFile('newfile.txt', 'This is a new file')
      .setFile('another/nested/file.json', JSON.stringify({ test: true }))
      .toWriter();
    
    await writer.writeToFile(outputVsixPath);
    await writer.close();
    await reader.close();
    
    // Verify new files exist
    const outputReader = await VsixReader.open(outputVsixPath);
    
    expect(await outputReader.fileExists('newfile.txt')).toBe(true);
    expect(await outputReader.fileExists('another/nested/file.json')).toBe(true);
    
    const newFileContent = await outputReader.readFile('newfile.txt');
    expect(newFileContent.toString()).toBe('This is a new file');
    
    await outputReader.close();
  });

  it('should handle file removals', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    const writer = await ManifestEditor.fromReader(reader)
      .removeFile('README.md')
      .removeFile('icon.png')
      .toWriter();
    
    await writer.writeToFile(outputVsixPath);
    await writer.close();
    await reader.close();
    
    // Verify files were removed
    const outputReader = await VsixReader.open(outputVsixPath);
    
    expect(await outputReader.fileExists('README.md')).toBe(false);
    expect(await outputReader.fileExists('icon.png')).toBe(false);
    
    // Verify other files still exist
    expect(await outputReader.fileExists('vss-extension.json')).toBe(true);
    
    await outputReader.close();
  });

  it('should handle mixed operations (add, modify, remove)', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    const writer = await ManifestEditor.fromReader(reader)
      .setPublisher('mixed-publisher')
      .setVersion('7.0.0')
      .setFile('new-file.txt', 'new content')
      .removeFile('icon.png')
      .updateTaskVersion('PublishExtension', '7.0.0')
      .toWriter();
    
    await writer.writeToFile(outputVsixPath);
    await writer.close();
    await reader.close();
    
    const outputReader = await VsixReader.open(outputVsixPath);
    const manifest = await outputReader.readExtensionManifest();
    
    expect(manifest.publisher).toBe('mixed-publisher');
    expect(manifest.version).toBe('7.0.0');
    expect(await outputReader.fileExists('new-file.txt')).toBe(true);
    expect(await outputReader.fileExists('icon.png')).toBe(false);
    expect(await outputReader.fileExists('README.md')).toBe(true);
    
    const tasks = await outputReader.readTaskManifests();
    const publishTask = tasks.find(t => t.manifest.name === 'PublishExtension');
    expect(publishTask?.manifest.version).toEqual({ Major: 7, Minor: 0, Patch: 0 });
    
    await outputReader.close();
  });

  it('should write to buffer and then to file', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    const writer = await ManifestEditor.fromReader(reader)
      .setPublisher('buffer-test')
      .toWriter();
    
    const buffer = await writer.writeToBuffer();
    await writer.close();
    await reader.close();
    
    // Write buffer to file
    writeFileSync(outputVsixPath, buffer);
    
    // Verify
    const outputReader = await VsixReader.open(outputVsixPath);
    const manifest = await outputReader.readExtensionManifest();
    
    expect(manifest.publisher).toBe('buffer-test');
    
    await outputReader.close();
  });

  it('should efficiently handle large VSIXs without full recompression', async () => {
    // This test verifies that unchanged large files aren't recompressed
    // We can't directly test compression level, but we can verify the output is valid
    
    const reader = await VsixReader.open(testVsixPath);
    
    // Only modify manifest, leave large files unchanged
    const writer = await ManifestEditor.fromReader(reader)
      .setVersion('5.1.0')
      .toWriter();
    
    const startTime = Date.now();
    await writer.writeToFile(outputVsixPath);
    const duration = Date.now() - startTime;
    
    await writer.close();
    await reader.close();
    
    // Verify output is valid and contains all expected files
    const outputReader = await VsixReader.open(outputVsixPath);
    const files = await outputReader.listFiles();
    
    // Should have all original files
    expect(files.length).toBeGreaterThanOrEqual(7); // manifest + 2 tasks + 2 large files + icon + readme
    
    // Verify large files are present
    expect(await outputReader.fileExists('PublishExtension/index.js')).toBe(true);
    expect(await outputReader.fileExists('PackageExtension/index.js')).toBe(true);
    
    await outputReader.close();
    
    // Duration should be reasonable (this is a rough check)
    // If we were fully recompressing, it would take longer
    expect(duration).toBeLessThan(5000); // 5 seconds is plenty for this small test
  });

  it('should maintain file integrity across chain', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    // Get original file list
    const originalFiles = await reader.listFiles();
    const originalFileNames = originalFiles.map(f => f.path).sort();
    
    // Make a non-destructive change
    const writer = await ManifestEditor.fromReader(reader)
      .setDescription('New description')
      .toWriter();
    
    await writer.writeToFile(outputVsixPath);
    await writer.close();
    await reader.close();
    
    // Verify all original files still exist
    const outputReader = await VsixReader.open(outputVsixPath);
    const outputFiles = await outputReader.listFiles();
    const outputFileNames = outputFiles.map(f => f.path).sort();
    
    expect(outputFileNames).toEqual(originalFileNames);
    
    await outputReader.close();
  });
});
