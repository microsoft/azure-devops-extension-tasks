/**
 * Tests for ManifestEditor and VsixWriter
 *
 * These tests verify the chaining behavior and modification tracking
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import yazl from 'yazl';
import { ManifestEditor } from '../manifest-editor.js';
import { VsixReader } from '../vsix-reader.js';
import { VsixWriter } from '../vsix-writer.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('ManifestEditor', () => {
  let testVsixPath: string;
  let mockPlatform: MockPlatformAdapter;

  beforeEach(async () => {
    mockPlatform = new MockPlatformAdapter();

    // Create a test VSIX file
    const testDir = join(tmpdir(), `vsix-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testVsixPath = join(testDir, 'test.vsix');

    const zipFile = new yazl.ZipFile();

    // Add extension manifest
    const manifest = {
      manifestVersion: 1,
      id: 'test-extension',
      publisher: 'test-publisher',
      version: '1.0.0',
      name: 'Test Extension',
      description: 'Test Description',
      categories: ['Azure Pipelines'],
      contributions: [
        {
          id: 'test-task',
          type: 'ms.vss-distributed-task.task',
          targets: ['ms.vss-distributed-task.tasks'],
          properties: {
            name: 'TestTask',
          },
        },
      ],
    };

    zipFile.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2)), 'vss-extension.json');

    // Add a task manifest
    const taskManifest = {
      id: 'abc-123',
      name: 'TestTask',
      friendlyName: 'Test Task',
      description: 'A test task',
      version: {
        Major: 1,
        Minor: 0,
        Patch: 0,
      },
    };

    zipFile.addBuffer(Buffer.from(JSON.stringify(taskManifest, null, 2)), 'TestTask/task.json');

    // Add a dummy file
    zipFile.addBuffer(Buffer.from('dummy content'), 'dummy.txt');

    // Write to file
    await new Promise<void>((resolve, reject) => {
      (zipFile.outputStream as any)
        .pipe(createWriteStream(testVsixPath) as any)
        .on('finish', resolve)
        .on('error', reject);
      zipFile.end();
    });
  });

  it('should create an editor from a reader', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    expect(editor).toBeInstanceOf(ManifestEditor);
    expect(editor.getReader()).toBe(reader);

    await reader.close();
  });

  it('should track publisher modification', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    editor.setPublisher('new-publisher');

    const mods = editor.getManifestModifications();
    expect(mods.publisher).toBe('new-publisher');

    await reader.close();
  });

  it('should track version modification', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    editor.setVersion('2.0.0');

    const mods = editor.getManifestModifications();
    expect(mods.version).toBe('2.0.0');

    await reader.close();
  });

  it('should track multiple modifications with chaining', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader)
      .setPublisher('chained-publisher')
      .setVersion('3.0.0')
      .setExtensionId('chained-id')
      .setName('Chained Name')
      .setDescription('Chained Description');

    const mods = editor.getManifestModifications();
    expect(mods.publisher).toBe('chained-publisher');
    expect(mods.version).toBe('3.0.0');
    expect(mods.id).toBe('chained-id');
    expect(mods.name).toBe('Chained Name');
    expect(mods.description).toBe('Chained Description');

    await reader.close();
  });

  it('should track visibility modification', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    editor.setVisibility('public');

    const mods = editor.getManifestModifications();
    expect(mods.galleryFlags).toContain('Public');

    await reader.close();
  });

  it('should track pricing modification', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    editor.setPricing('free');

    const mods = editor.getManifestModifications();
    expect(mods.galleryFlags).toContain('Free');

    await reader.close();
  });

  it('should track task version modification', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    editor.updateTaskVersion('TestTask', '2.1.0');

    const taskMods = editor.getTaskManifestModifications();
    expect(taskMods.get('TestTask')?.version).toEqual({
      Major: 2,
      Minor: 1,
      Patch: 0,
    });

    await reader.close();
  });

  it('should track task ID modification', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    editor.updateTaskId('TestTask', 'test-publisher', 'test-extension');

    const taskMods = editor.getTaskManifestModifications();
    expect(taskMods.get('TestTask')?.id).toBeTruthy();

    await reader.close();
  });

  it('should track file additions', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    editor.setFile('newfile.txt', 'new content');

    const mods = editor.getModifications();
    const newFileMod = mods.get('newfile.txt');
    expect(newFileMod?.type).toBe('modify');
    expect(newFileMod?.content?.toString()).toBe('new content');

    await reader.close();
  });

  it('should track file removals', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    editor.removeFile('dummy.txt');

    const mods = editor.getModifications();
    const removeMod = mods.get('dummy.txt');
    expect(removeMod?.type).toBe('remove');

    await reader.close();
  });

  it('should convert to writer', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);
    const writer = await editor.toWriter();

    expect(writer).toBeInstanceOf(VsixWriter);

    await reader.close();
  });
});

describe('VsixWriter', () => {
  let testVsixPath: string;
  let outputVsixPath: string;

  beforeEach(async () => {
    // Create test VSIX
    const testDir = join(tmpdir(), `vsix-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testVsixPath = join(testDir, 'input.vsix');
    outputVsixPath = join(testDir, 'output.vsix');

    const zipFile = new yazl.ZipFile();

    const manifest = {
      manifestVersion: 1,
      id: 'test-extension',
      publisher: 'original-publisher',
      version: '1.0.0',
      name: 'Original Name',
      description: 'Original Description',
    };

    zipFile.addBuffer(Buffer.from(JSON.stringify(manifest, null, 2)), 'vss-extension.json');

    zipFile.addBuffer(Buffer.from('original content'), 'file1.txt');
    zipFile.addBuffer(Buffer.from('unchanged content'), 'file2.txt');

    await new Promise<void>((resolve, reject) => {
      (zipFile.outputStream as any)
        .pipe(createWriteStream(testVsixPath) as any)
        .on('finish', resolve)
        .on('error', reject);
      zipFile.end();
    });
  });

  it('should write modified VSIX to file', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const writer = await ManifestEditor.fromReader(reader)
      .setPublisher('new-publisher')
      .setVersion('2.0.0')
      .toWriter();

    await writer.writeToFile(outputVsixPath);
    await reader.close();

    // Verify output file exists
    expect(existsSync(outputVsixPath)).toBe(true);

    // Verify modifications were applied
    const outputReader = await VsixReader.open(outputVsixPath);
    const manifest = await outputReader.readExtensionManifest();

    expect(manifest.publisher).toBe('new-publisher');
    expect(manifest.version).toBe('2.0.0');

    await outputReader.close();
  });

  it('should preserve unchanged files', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const writer = await ManifestEditor.fromReader(reader).setPublisher('new-publisher').toWriter();

    await writer.writeToFile(outputVsixPath);
    await reader.close();

    // Verify unchanged file is preserved
    const outputReader = await VsixReader.open(outputVsixPath);
    const file2Content = await outputReader.readFile('file2.txt');

    expect(file2Content.toString()).toBe('unchanged content');

    await outputReader.close();
  });

  it('should write to buffer', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const writer = await ManifestEditor.fromReader(reader)
      .setPublisher('buffer-publisher')
      .toWriter();

    const buffer = await writer.writeToBuffer();
    await reader.close();

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);

    // Write buffer to file and verify
    writeFileSync(outputVsixPath, buffer);

    const outputReader = await VsixReader.open(outputVsixPath);
    const manifest = await outputReader.readExtensionManifest();

    expect(manifest.publisher).toBe('buffer-publisher');

    await outputReader.close();
  });
});
