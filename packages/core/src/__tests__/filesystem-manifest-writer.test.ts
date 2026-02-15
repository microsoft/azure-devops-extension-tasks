/**
 * Tests for FilesystemManifestWriter
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FilesystemManifestReader } from '../filesystem-manifest-reader.js';
import { FilesystemManifestWriter } from '../filesystem-manifest-writer.js';
import { ManifestEditor } from '../manifest-editor.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FilesystemManifestWriter', () => {
  let testDir: string;
  let mockPlatform: MockPlatformAdapter;

  beforeEach(() => {
    mockPlatform = new MockPlatformAdapter();
    
    // Create a test directory
    testDir = join(tmpdir(), `writer-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('writeToFilesystem', () => {
    it('should write task manifest modifications to filesystem', async () => {
      // Create test manifests
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task1' }
          }
        ]
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(extManifest)
      );
      
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      const taskManifest = {
        id: 'old-id',
        name: 'Task1',
        friendlyName: 'Test Task',
        version: { Major: 1, Minor: 0, Patch: 0 }
      };
      
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify(taskManifest)
      );
      
      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '2.0.0',
        updateTasksVersion: true,
        updateTasksVersionType: 'major'
      });
      
      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();
      
      // Verify task.json was updated
      const updatedTaskJson = JSON.parse(
        readFileSync(join(testDir, 'Task1', 'task.json'), 'utf-8')
      );
      
      expect(updatedTaskJson.version.Major).toBe(2);
      expect(updatedTaskJson.version.Minor).toBe(0);
      expect(updatedTaskJson.version.Patch).toBe(0);
      
      await writer.close();
      await reader.close();
    });

    it('should generate overrides.json for extension manifest modifications', async () => {
      // Create test manifest
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(extManifest)
      );
      
      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        publisherId: 'new-pub',
        extensionVersion: '2.0.0',
        extensionName: 'New Name'
      });
      
      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();
      
      // Verify overrides.json was created
      const overridesPath = writer.getOverridesPath();
      expect(overridesPath).toBeTruthy();
      expect(existsSync(overridesPath!)).toBe(true);
      
      // Verify overrides content
      const overrides = JSON.parse(readFileSync(overridesPath!, 'utf-8'));
      expect(overrides.publisher).toBe('new-pub');
      expect(overrides.version).toBe('2.0.0');
      expect(overrides.name).toBe('New Name');
      
      await writer.close();
      await reader.close();
    });

    it('should not generate overrides.json if no extension modifications', async () => {
      // Create test manifests
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task1' }
          }
        ]
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(extManifest)
      );
      
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 }
        })
      );
      
      // Create reader and editor (only task modifications)
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        updateTasksId: true
      });
      
      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();
      
      // Verify no overrides.json was created
      const overridesPath = writer.getOverridesPath();
      expect(overridesPath).toBeNull();
      
      await writer.close();
      await reader.close();
    });

    it('should handle multiple task updates', async () => {
      // Create test manifests with multiple tasks
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task1' }
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task2' }
          }
        ]
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(extManifest)
      );
      
      // Create Task1
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 }
        })
      );
      
      // Create Task2
      mkdirSync(join(testDir, 'Task2'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'task.json'),
        JSON.stringify({
          id: 'id2',
          name: 'Task2',
          version: { Major: 1, Minor: 0, Patch: 0 }
        })
      );
      
      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '3.5.7',
        updateTasksVersion: true,
        updateTasksVersionType: 'minor'
      });
      
      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();
      
      // Verify both tasks were updated
      const task1Json = JSON.parse(
        readFileSync(join(testDir, 'Task1', 'task.json'), 'utf-8')
      );
      const task2Json = JSON.parse(
        readFileSync(join(testDir, 'Task2', 'task.json'), 'utf-8')
      );
      
      // Minor update keeps Major, updates Minor and Patch
      expect(task1Json.version.Major).toBe(1);
      expect(task1Json.version.Minor).toBe(5);
      expect(task1Json.version.Patch).toBe(7);
      
      expect(task2Json.version.Major).toBe(1);
      expect(task2Json.version.Minor).toBe(5);
      expect(task2Json.version.Patch).toBe(7);
      
      await writer.close();
      await reader.close();
    });

    it('should handle visibility and pricing in overrides', async () => {
      // Create test manifest
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        galleryFlags: []
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(extManifest)
      );
      
      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVisibility: 'public',
        extensionPricing: 'free'
      });
      
      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();
      
      // Verify overrides.json contains flags
      const overridesPath = writer.getOverridesPath();
      const overrides = JSON.parse(readFileSync(overridesPath!, 'utf-8'));
      
      expect(overrides.galleryFlags).toContain('Public');
      expect(overrides.galleryFlags).toContain('Free');
      
      await writer.close();
      await reader.close();
    });
  });

  describe('getOverridesPath', () => {
    it('should return null if no overrides were generated', async () => {
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(extManifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      const editor = ManifestEditor.fromReader(reader);
      // No modifications
      
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();
      
      expect(writer.getOverridesPath()).toBeNull();
      
      await writer.close();
      await reader.close();
    });

    it('should return path if overrides were generated', async () => {
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(extManifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '2.0.0'
      });
      
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();
      
      const overridesPath = writer.getOverridesPath();
      expect(overridesPath).toBeTruthy();
      expect(typeof overridesPath).toBe('string');
      expect(existsSync(overridesPath!)).toBe(true);
      
      await writer.close();
      await reader.close();
    });
  });
});
