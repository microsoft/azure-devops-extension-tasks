/**
 * Tests for FilesystemManifestWriter
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FilesystemManifestReader } from '../filesystem-manifest-reader.js';
import { FilesystemManifestWriter } from '../filesystem-manifest-writer.js';
import { ManifestEditor } from '../manifest-editor.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FilesystemManifestWriter', () => {
  let testDir: string;
  let mockPlatform: MockPlatformAdapter;

  beforeEach(() => {
    mockPlatform = new MockPlatformAdapter();

    // Create a test directory
    testDir = mkdtempSync(join(tmpdir(), 'writer-test-'));
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
            properties: { name: 'Task1' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      const taskManifest = {
        id: 'old-id',
        name: 'Task1',
        friendlyName: 'Test Task',
        version: { Major: 1, Minor: 0, Patch: 0 },
      };

      writeFileSync(join(testDir, 'Task1', 'task.json'), JSON.stringify(taskManifest));

      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '2.0.0',
        updateTasksVersion: true,
        updateTasksVersionType: 'major',
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
        version: '1.0.0',
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        publisherId: 'new-pub',
        extensionVersion: '2.0.0',
        extensionName: 'New Name',
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
            properties: { name: 'Task1' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Create reader and editor (only task modifications)
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        updateTasksId: true,
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
            properties: { name: 'Task1' },
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task2' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create Task1
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Create Task2
      mkdirSync(join(testDir, 'Task2'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'task.json'),
        JSON.stringify({
          id: 'id2',
          name: 'Task2',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '3.5.7',
        updateTasksVersion: true,
        updateTasksVersionType: 'minor',
      });

      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify both tasks were updated
      const task1Json = JSON.parse(readFileSync(join(testDir, 'Task1', 'task.json'), 'utf-8'));
      const task2Json = JSON.parse(readFileSync(join(testDir, 'Task2', 'task.json'), 'utf-8'));

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
        galleryFlags: [],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVisibility: 'public',
        extensionPricing: 'free',
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
        version: '1.0.0',
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
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
        version: '1.0.0',
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '2.0.0',
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

  describe('packagePath support', () => {
    it('should write task manifests to actual source paths when packagePath is used', async () => {
      // Create extension manifest with packagePath
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [{ path: 'tasks/terraform-cli/.dist', packagePath: 'TerraformCLI' }],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'TerraformCLI' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create task in actual source directory
      mkdirSync(join(testDir, 'tasks', 'terraform-cli', '.dist'), { recursive: true });
      writeFileSync(
        join(testDir, 'tasks', 'terraform-cli', '.dist', 'task.json'),
        JSON.stringify({
          id: 'old-id',
          name: 'TerraformCLI',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '2.5.0',
        updateTasksVersion: true,
        updateTasksVersionType: 'major',
      });

      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify task.json was written to actual source path, not packagePath
      const updatedTaskJson = JSON.parse(
        readFileSync(join(testDir, 'tasks', 'terraform-cli', '.dist', 'task.json'), 'utf-8')
      );

      expect(updatedTaskJson.version.Major).toBe(2);
      expect(updatedTaskJson.version.Minor).toBe(5);
      expect(updatedTaskJson.version.Patch).toBe(0);

      // Verify it did NOT write to packagePath location
      expect(existsSync(join(testDir, 'TerraformCLI', 'task.json'))).toBe(false);

      await writer.close();
      await reader.close();
    });

    it('should write to direct path when no packagePath is specified', async () => {
      // Create extension manifest without packagePath
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task1' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create task in direct path
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '3.0.0',
        updateTasksVersion: true,
        updateTasksVersionType: 'major',
      });

      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify task.json was written to direct path
      const updatedTaskJson = JSON.parse(
        readFileSync(join(testDir, 'Task1', 'task.json'), 'utf-8')
      );

      expect(updatedTaskJson.version.Major).toBe(3);
      expect(updatedTaskJson.version.Minor).toBe(0);
      expect(updatedTaskJson.version.Patch).toBe(0);

      await writer.close();
      await reader.close();
    });

    it('should handle mixed packagePath and direct paths correctly', async () => {
      // Create extension manifest with mixed paths
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [
          { path: 'compiled/task1', packagePath: 'Task1' },
          // Task2 has no packagePath
        ],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task1' },
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task2' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Task1 with packagePath
      mkdirSync(join(testDir, 'compiled', 'task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'compiled', 'task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Task2 without packagePath
      mkdirSync(join(testDir, 'Task2'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'task.json'),
        JSON.stringify({
          id: 'id2',
          name: 'Task2',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Create reader and editor
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);
      await editor.applyOptions({
        extensionVersion: '4.2.1',
        updateTasksVersion: true,
        updateTasksVersionType: 'major',
      });

      // Write changes
      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify Task1 was written to compiled/task1
      const task1Json = JSON.parse(
        readFileSync(join(testDir, 'compiled', 'task1', 'task.json'), 'utf-8')
      );
      expect(task1Json.version.Major).toBe(4);
      expect(task1Json.version.Minor).toBe(2);
      expect(task1Json.version.Patch).toBe(1);

      // Verify Task2 was written to Task2
      const task2Json = JSON.parse(readFileSync(join(testDir, 'Task2', 'task.json'), 'utf-8'));
      expect(task2Json.version.Major).toBe(4);
      expect(task2Json.version.Minor).toBe(2);
      expect(task2Json.version.Patch).toBe(1);

      await writer.close();
      await reader.close();
    });

    it('should write to correct path when packagePath has subdirectories', async () => {
      // Create test manifests
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [{ path: 'compiled/cli', packagePath: 'CLI' }],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'CLI' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create task in subdirectory
      mkdirSync(join(testDir, 'compiled', 'cli', 'v2'), { recursive: true });
      writeFileSync(
        join(testDir, 'compiled', 'cli', 'v2', 'task.json'),
        JSON.stringify({
          id: 'cli-v2',
          name: 'CLI-v2',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);

      // Update task version for CLI/v2
      const task = await reader.readTaskManifest('CLI/v2');
      await editor.updateTaskVersion(task.name, '2.5.3', 'major');

      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify file was written to compiled/cli/v2/task.json
      const taskJson = JSON.parse(
        readFileSync(join(testDir, 'compiled', 'cli', 'v2', 'task.json'), 'utf-8')
      );
      expect(taskJson.version.Major).toBe(2);
      expect(taskJson.version.Minor).toBe(5);
      expect(taskJson.version.Patch).toBe(3);

      await writer.close();
      await reader.close();
    });

    it('should handle nested subdirectories with packagePath mapping', async () => {
      // Create test manifests
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [{ path: 'build/dist/tasks', packagePath: 'MyTasks' }],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'MyTasks' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create task in deeply nested subdirectory
      mkdirSync(join(testDir, 'build', 'dist', 'tasks', 'installer', 'v3'), { recursive: true });
      writeFileSync(
        join(testDir, 'build', 'dist', 'tasks', 'installer', 'v3', 'task.json'),
        JSON.stringify({
          id: 'installer-v3',
          name: 'Installer-v3',
          version: { Major: 3, Minor: 1, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);

      // Update task version
      const task = await reader.readTaskManifest('MyTasks/installer/v3');
      await editor.updateTaskVersion(task.name, '5.0.0', 'major');

      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify file was written to build/dist/tasks/installer/v3/task.json
      const taskJson = JSON.parse(
        readFileSync(
          join(testDir, 'build', 'dist', 'tasks', 'installer', 'v3', 'task.json'),
          'utf-8'
        )
      );
      expect(taskJson.version.Major).toBe(5);
      expect(taskJson.version.Minor).toBe(0);
      expect(taskJson.version.Patch).toBe(0);

      await writer.close();
      await reader.close();
    });

    it('should write multiple tasks with mixed packagePath and direct paths', async () => {
      // Create test manifests
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [
          { path: 'compiled/task1', packagePath: 'Task1' },
          { path: 'Task2' }, // No packagePath
        ],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task1' },
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task2' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Task1 with subdirectory and packagePath
      mkdirSync(join(testDir, 'compiled', 'task1', 'v2'), { recursive: true });
      writeFileSync(
        join(testDir, 'compiled', 'task1', 'v2', 'task.json'),
        JSON.stringify({
          id: 't1-v2',
          name: 'Task1-v2',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Task2 with subdirectory but no packagePath
      mkdirSync(join(testDir, 'Task2', 'v3'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'v3', 'task.json'),
        JSON.stringify({
          id: 't2-v3',
          name: 'Task2-v3',
          version: { Major: 2, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);

      // Update both tasks
      const task1 = await reader.readTaskManifest('Task1/v2');
      await editor.updateTaskVersion(task1.name, '3.0.0', 'major');

      const task2 = await reader.readTaskManifest('Task2/v3');
      await editor.updateTaskVersion(task2.name, '4.0.0', 'major');

      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify Task1 was written to compiled/task1/v2
      const task1Json = JSON.parse(
        readFileSync(join(testDir, 'compiled', 'task1', 'v2', 'task.json'), 'utf-8')
      );
      expect(task1Json.version.Major).toBe(3);

      // Verify Task2 was written to Task2/v3
      const task2Json = JSON.parse(
        readFileSync(join(testDir, 'Task2', 'v3', 'task.json'), 'utf-8')
      );
      expect(task2Json.version.Major).toBe(4);

      await writer.close();
      await reader.close();
    });

    it('should NOT write to incorrect path for partial prefix match', async () => {
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [{ path: 'compiled/task', packagePath: 'Task' }],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create TaskOther without packagePath mapping
      mkdirSync(join(testDir, 'TaskOther'), { recursive: true });
      writeFileSync(
        join(testDir, 'TaskOther', 'task.json'),
        JSON.stringify({
          id: 'task-other',
          name: 'TaskOther',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);

      // Update TaskOther
      const task = await reader.readTaskManifest('TaskOther');
      await editor.updateTaskVersion(task.name, '2.0.0', 'major');

      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify TaskOther was written to TaskOther (NOT compiled/taskOther)
      const taskJson = JSON.parse(readFileSync(join(testDir, 'TaskOther', 'task.json'), 'utf-8'));
      expect(taskJson.version.Major).toBe(2);

      // Ensure no file was created at compiled/taskOther
      expect(existsSync(join(testDir, 'compiled', 'taskOther', 'task.json'))).toBe(false);

      await writer.close();
      await reader.close();
    });

    it('should write to correct paths with similar prefix names', async () => {
      const extManifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [
          { path: 'build/cli', packagePath: 'CLI' },
          { path: 'build/cli-utils', packagePath: 'CLIUtils' },
        ],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'CLI' },
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'CLIUtils' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(extManifest));

      // Create CLI/v2
      mkdirSync(join(testDir, 'build', 'cli', 'v2'), { recursive: true });
      writeFileSync(
        join(testDir, 'build', 'cli', 'v2', 'task.json'),
        JSON.stringify({
          id: 'cli-v2',
          name: 'CLI-v2',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Create CLIUtils/v2
      mkdirSync(join(testDir, 'build', 'cli-utils', 'v2'), { recursive: true });
      writeFileSync(
        join(testDir, 'build', 'cli-utils', 'v2', 'task.json'),
        JSON.stringify({
          id: 'cli-utils-v2',
          name: 'CLIUtils-v2',
          version: { Major: 2, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const editor = ManifestEditor.fromReader(reader);

      // Update both tasks
      const taskCLI = await reader.readTaskManifest('CLI/v2');
      await editor.updateTaskVersion(taskCLI.name, '3.0.0', 'major');

      const taskCLIUtils = await reader.readTaskManifest('CLIUtils/v2');
      await editor.updateTaskVersion(taskCLIUtils.name, '4.0.0', 'major');

      const writer = await editor.toWriter();
      await writer.writeToFilesystem();

      // Verify CLI/v2 was written to build/cli/v2 (NOT build/cli-utils/v2)
      const cliJson = JSON.parse(
        readFileSync(join(testDir, 'build', 'cli', 'v2', 'task.json'), 'utf-8')
      );
      expect(cliJson.version.Major).toBe(3);

      // Verify CLIUtils/v2 was written to build/cli-utils/v2
      const cliUtilsJson = JSON.parse(
        readFileSync(join(testDir, 'build', 'cli-utils', 'v2', 'task.json'), 'utf-8')
      );
      expect(cliUtilsJson.version.Major).toBe(4);

      await writer.close();
      await reader.close();
    });
  });
});
