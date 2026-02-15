/**
 * Tests for ManifestEditor.applyOptions()
 *
 * Tests the unified options application that eliminates code duplication
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ManifestEditor } from '../manifest-editor.js';
import { VsixReader } from '../vsix-reader.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import { writeFileSync, mkdirSync, createWriteStream, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import yazl from 'yazl';

describe('ManifestEditor.applyOptions()', () => {
  let testVsixPath: string;
  let mockPlatform: MockPlatformAdapter;
  let testDir: string;

  beforeEach(async () => {
    mockPlatform = new MockPlatformAdapter();

    // Create a test VSIX file
    testDir = join(tmpdir(), `manifest-editor-test-${Date.now()}`);
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
      galleryFlags: [],
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
      id: 'old-task-id-123',
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

    // Write to file
    await new Promise<void>((resolve, reject) => {
      zipFile.outputStream
        .pipe(createWriteStream(testVsixPath))
        .on('finish', resolve)
        .on('error', reject);
      zipFile.end();
    });
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should apply publisher override', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      publisherId: 'new-publisher',
    });

    const mods = editor.getManifestModifications();
    expect(mods.publisher).toBe('new-publisher');

    await reader.close();
  });

  it('should apply extension ID override', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      extensionId: 'my-extension',
    });

    const mods = editor.getManifestModifications();
    expect(mods.id).toBe('my-extension');

    await reader.close();
  });

  it('should apply extension ID without tag', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      extensionId: 'my-extension',
    });

    const mods = editor.getManifestModifications();
    expect(mods.id).toBe('my-extension');

    await reader.close();
  });

  it('should apply extension version', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      extensionVersion: '2.5.0',
    });

    const mods = editor.getManifestModifications();
    expect(mods.version).toBe('2.5.0');

    await reader.close();
  });

  it('should apply extension name', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      extensionName: 'New Extension Name',
    });

    const mods = editor.getManifestModifications();
    expect(mods.name).toBe('New Extension Name');

    await reader.close();
  });

  it('should apply visibility settings', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      extensionVisibility: 'public',
    });

    const mods = editor.getManifestModifications();
    expect(mods.galleryFlags).toContain('Public');

    await reader.close();
  });

  it('should apply pricing settings', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      extensionPricing: 'free',
    });

    const mods = editor.getManifestModifications();
    expect(mods.galleryFlags).toContain('Free');

    await reader.close();
  });

  it('should update task versions when requested', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      extensionVersion: '2.3.4',
      updateTasksVersion: true,
      updateTasksVersionType: 'major',
    });

    const taskMods = editor.getTaskManifestModifications();
    const testTaskMod = taskMods.get('TestTask');

    expect(testTaskMod).toBeDefined();
    expect(testTaskMod!.version).toEqual({
      Major: 2,
      Minor: 3,
      Patch: 4,
    });

    await reader.close();
  });

  it('should use major as default version type', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      extensionVersion: '3.0.0',
      updateTasksVersion: true,
      // No updateTasksVersionType specified
    });

    const taskMods = editor.getTaskManifestModifications();
    const testTaskMod = taskMods.get('TestTask');

    expect(testTaskMod!.version).toEqual({
      Major: 3,
      Minor: 0,
      Patch: 0,
    });

    await reader.close();
  });

  it('should update task IDs when requested', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      updateTasksId: true,
    });

    const taskMods = editor.getTaskManifestModifications();
    const testTaskMod = taskMods.get('TestTask');

    expect(testTaskMod).toBeDefined();
    expect(testTaskMod!.id).toBeDefined();
    expect(testTaskMod!.id).not.toBe('old-task-id-123');
    // Should be a UUID format
    expect(testTaskMod!.id).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
    );

    await reader.close();
  });

  it('should apply multiple options at once', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      publisherId: 'new-pub',
      extensionId: 'new-ext',
      extensionVersion: '2.0.0',
      extensionName: 'New Name',
      extensionVisibility: 'private',
      updateTasksVersion: true,
      updateTasksVersionType: 'minor',
      updateTasksId: true,
    });

    // Check extension modifications
    const mods = editor.getManifestModifications();
    expect(mods.publisher).toBe('new-pub');
    expect(mods.id).toBe('new-ext');
    expect(mods.version).toBe('2.0.0');
    expect(mods.name).toBe('New Name');
    expect(mods.galleryFlags).toContain('Private');

    // Check task modifications
    const taskMods = editor.getTaskManifestModifications();
    const testTaskMod = taskMods.get('TestTask');
    expect(testTaskMod).toBeDefined();
    expect(testTaskMod!.version).toBeDefined();
    expect(testTaskMod!.id).toBeDefined();
    expect(testTaskMod!.id).toMatch(/^[a-f0-9]{8}-/); // UUID format

    await reader.close();
  });

  it('should handle empty options gracefully', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({});

    const mods = editor.getManifestModifications();
    expect(Object.keys(mods).length).toBe(0);

    const taskMods = editor.getTaskManifestModifications();
    expect(taskMods.size).toBe(0);

    await reader.close();
  });

  it('should skip task version update if no extension version provided', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    await editor.applyOptions({
      updateTasksVersion: true,
      // No extensionVersion provided
    });

    const taskMods = editor.getTaskManifestModifications();
    expect(taskMods.size).toBe(0);

    await reader.close();
  });

  it('should return editor for chaining', async () => {
    const reader = await VsixReader.open(testVsixPath);
    const editor = ManifestEditor.fromReader(reader);

    const result = await editor.applyOptions({
      publisherId: 'test',
    });

    expect(result).toBe(editor);

    await reader.close();
  });

  it('should handle all visibility options', async () => {
    const reader = await VsixReader.open(testVsixPath);

    const testCases: Array<{
      visibility: 'public' | 'private' | 'public_preview' | 'private_preview';
      expectedFlags: string[];
    }> = [
      { visibility: 'public', expectedFlags: ['Public'] },
      { visibility: 'private', expectedFlags: ['Private'] },
      { visibility: 'public_preview', expectedFlags: ['Public', 'Preview'] },
      { visibility: 'private_preview', expectedFlags: ['Private', 'Preview'] },
    ];

    for (const testCase of testCases) {
      const editor = ManifestEditor.fromReader(reader);

      await editor.applyOptions({
        extensionVisibility: testCase.visibility,
      });

      const mods = editor.getManifestModifications();
      for (const flag of testCase.expectedFlags) {
        expect(mods.galleryFlags).toContain(flag);
      }
    }

    await reader.close();
  });
});
