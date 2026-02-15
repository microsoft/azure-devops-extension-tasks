/**
 * Tests for FilesystemManifestReader
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FilesystemManifestReader } from '../filesystem-manifest-reader.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FilesystemManifestReader', () => {
  let testDir: string;
  let mockPlatform: MockPlatformAdapter;

  beforeEach(() => {
    mockPlatform = new MockPlatformAdapter();

    // Create a test directory
    testDir = mkdtempSync(join(tmpdir(), 'manifest-test-'));
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('readExtensionManifest', () => {
    it('should read extension manifest from filesystem', async () => {
      // Create test manifest
      const manifest = {
        manifestVersion: 1,
        id: 'test-extension',
        publisher: 'test-publisher',
        version: '1.0.0',
        name: 'Test Extension',
        description: 'Test Description',
        categories: ['Azure Pipelines'],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest, null, 2));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        manifestGlobs: ['vss-extension.json'],
        platform: mockPlatform,
      });

      const result = await reader.readExtensionManifest();

      expect(result.id).toBe('test-extension');
      expect(result.publisher).toBe('test-publisher');
      expect(result.version).toBe('1.0.0');

      await reader.close();
    });

    it('should cache extension manifest on subsequent reads', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const result1 = await reader.readExtensionManifest();
      const result2 = await reader.readExtensionManifest();

      // Should return the same cached object
      expect(result1).toBe(result2);

      await reader.close();
    });

    it('should throw error if manifest not found', async () => {
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        manifestGlobs: ['nonexistent.json'],
        platform: mockPlatform,
      });

      await expect(reader.readExtensionManifest()).rejects.toThrow(/not found/);

      await reader.close();
    });
  });

  describe('findTaskPaths', () => {
    it('should find tasks from contributions', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: {
              name: 'Task1',
            },
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: {
              name: 'Task2',
            },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const taskPaths = await reader.findTaskPaths();

      expect(taskPaths).toEqual(['Task1', 'Task2']);

      await reader.close();
    });

    it('should return empty array if no tasks found', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const taskPaths = await reader.findTaskPaths();

      expect(taskPaths).toEqual([]);

      await reader.close();
    });
  });

  describe('readTaskManifest', () => {
    it('should read task manifest from filesystem', async () => {
      // Create extension manifest
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

      // Create task directory and manifest
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      const taskManifest = {
        id: 'task-id-123',
        name: 'Task1',
        friendlyName: 'Test Task',
        description: 'A test task',
        version: {
          Major: 1,
          Minor: 2,
          Patch: 3,
        },
      };

      writeFileSync(join(testDir, 'Task1', 'task.json'), JSON.stringify(taskManifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const result = await reader.readTaskManifest('Task1');

      expect(result.id).toBe('task-id-123');
      expect(result.name).toBe('Task1');
      expect(result.version.Major).toBe(1);
      expect(result.version.Minor).toBe(2);
      expect(result.version.Patch).toBe(3);

      await reader.close();
    });

    it('should throw error if task manifest not found', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      await expect(reader.readTaskManifest('NonexistentTask')).rejects.toThrow(/not found/);

      await reader.close();
    });
  });

  describe('getMetadata', () => {
    it('should return quick metadata from extension manifest', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '2.5.1',
        name: 'Test Extension',
        description: 'Test Description',
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const metadata = await reader.getMetadata();

      expect(metadata.publisher).toBe('test-pub');
      expect(metadata.extensionId).toBe('test-ext');
      expect(metadata.version).toBe('2.5.1');
      expect(metadata.name).toBe('Test Extension');
      expect(metadata.description).toBe('Test Description');

      await reader.close();
    });
  });

  describe('getTasksInfo', () => {
    it('should return information about all tasks', async () => {
      // Create extension manifest
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

      // Create tasks
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          friendlyName: 'First Task',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      mkdirSync(join(testDir, 'Task2'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'task.json'),
        JSON.stringify({
          id: 'id2',
          name: 'Task2',
          friendlyName: 'Second Task',
          version: { Major: 2, Minor: 1, Patch: 3 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const tasksInfo = await reader.getTasksInfo();

      expect(tasksInfo).toHaveLength(2);
      expect(tasksInfo[0].name).toBe('Task1');
      expect(tasksInfo[0].friendlyName).toBe('First Task');
      expect(tasksInfo[0].version).toBe('1.0.0');
      expect(tasksInfo[1].name).toBe('Task2');
      expect(tasksInfo[1].friendlyName).toBe('Second Task');
      expect(tasksInfo[1].version).toBe('2.1.3');

      await reader.close();
    });
  });

  describe('packagePath support', () => {
    it('should handle packagePath mapping from files array', async () => {
      // Create extension manifest with files array including packagePath
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [
          { path: 'tasks/terraform-cli/.dist', packagePath: 'TerraformCLI' },
          { path: 'tasks/terraform-installer/.dist', packagePath: 'TerraformInstaller' },
        ],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'TerraformCLI' },
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'TerraformInstaller' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      // Create task in actual source directory (not packagePath)
      mkdirSync(join(testDir, 'tasks', 'terraform-cli', '.dist'), { recursive: true });
      const taskManifest = {
        id: 'task-id-123',
        name: 'TerraformCLI',
        friendlyName: 'Terraform CLI',
        version: { Major: 1, Minor: 0, Patch: 0 },
      };

      writeFileSync(
        join(testDir, 'tasks', 'terraform-cli', '.dist', 'task.json'),
        JSON.stringify(taskManifest)
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      // Should read from actual source path (tasks/terraform-cli/.dist), not packagePath (TerraformCLI)
      const result = await reader.readTaskManifest('TerraformCLI');

      expect(result.id).toBe('task-id-123');
      expect(result.name).toBe('TerraformCLI');

      await reader.close();
    });

    it('should fall back to direct path if no packagePath mapping exists', async () => {
      const manifest = {
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

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      // Create task without packagePath (direct path matches contribution name)
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      const result = await reader.readTaskManifest('Task1');

      expect(result.name).toBe('Task1');

      await reader.close();
    });

    it('should handle mixed packagePath and direct paths', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [
          { path: 'compiled/task1', packagePath: 'Task1' },
          // Task2 has no packagePath, uses direct path
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

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      // Task1 with packagePath - source is in 'compiled/task1', not 'Task1'
      mkdirSync(join(testDir, 'compiled', 'task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'compiled', 'task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Task2 without packagePath - source is directly in 'Task2'
      mkdirSync(join(testDir, 'Task2'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'task.json'),
        JSON.stringify({
          id: 'id2',
          name: 'Task2',
          version: { Major: 2, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      // Task1 should resolve through packagePath to 'compiled/task1'
      const task1 = await reader.readTaskManifest('Task1');
      // Task2 should use direct path 'Task2'
      const task2 = await reader.readTaskManifest('Task2');

      expect(task1.name).toBe('Task1');
      expect(task2.name).toBe('Task2');

      await reader.close();
    });

    it('should throw error if packagePath mapped file does not exist', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [{ path: 'nonexistent/path', packagePath: 'Task1' }],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Task1' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      // Should try to read from 'nonexistent/path' and fail
      await expect(reader.readTaskManifest('Task1')).rejects.toThrow(/not found/);

      await reader.close();
    });

    it('should support packagePath prefix matching for subdirectories', async () => {
      const manifest = {
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

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      // Create task in subdirectory: compiled/cli/v2/task.json
      mkdirSync(join(testDir, 'compiled', 'cli', 'v2'), { recursive: true });
      writeFileSync(
        join(testDir, 'compiled', 'cli', 'v2', 'task.json'),
        JSON.stringify({
          id: 'cli-v2',
          name: 'CLI-v2',
          version: { Major: 2, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      // When reading 'CLI/v2', should map to 'compiled/cli/v2'
      const task = await reader.readTaskManifest('CLI/v2');
      expect(task.name).toBe('CLI-v2');
      expect(task.version.Major).toBe(2);

      await reader.close();
    });

    it('should support packagePath prefix matching for nested subdirectories', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [{ path: 'build/tasks', packagePath: 'Tasks' }],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'Tasks' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      // Create task in nested subdirectory: build/tasks/installer/v3/task.json
      mkdirSync(join(testDir, 'build', 'tasks', 'installer', 'v3'), { recursive: true });
      writeFileSync(
        join(testDir, 'build', 'tasks', 'installer', 'v3', 'task.json'),
        JSON.stringify({
          id: 'installer-v3',
          name: 'Installer-v3',
          version: { Major: 3, Minor: 5, Patch: 1 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      // When reading 'Tasks/installer/v3', should map to 'build/tasks/installer/v3'
      const task = await reader.readTaskManifest('Tasks/installer/v3');
      expect(task.name).toBe('Installer-v3');
      expect(task.version).toEqual({ Major: 3, Minor: 5, Patch: 1 });

      await reader.close();
    });

    it('should handle mix of packagePath prefix and direct paths', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [
          { path: 'compiled/task1', packagePath: 'Task1' },
          { path: 'Task2' }, // No packagePath - direct
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

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      // Task1 with subdirectory using packagePath
      mkdirSync(join(testDir, 'compiled', 'task1', 'v2'), { recursive: true });
      writeFileSync(
        join(testDir, 'compiled', 'task1', 'v2', 'task.json'),
        JSON.stringify({
          id: 't1-v2',
          name: 'Task1-v2',
          version: { Major: 2, Minor: 0, Patch: 0 },
        })
      );

      // Task2 with subdirectory using direct path
      mkdirSync(join(testDir, 'Task2', 'v3'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'v3', 'task.json'),
        JSON.stringify({
          id: 't2-v3',
          name: 'Task2-v3',
          version: { Major: 3, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      // Task1/v2 should map through packagePath to compiled/task1/v2
      const task1 = await reader.readTaskManifest('Task1/v2');
      expect(task1.name).toBe('Task1-v2');

      // Task2/v3 should use direct path Task2/v3
      const task2 = await reader.readTaskManifest('Task2/v3');
      expect(task2.name).toBe('Task2-v3');

      await reader.close();
    });

    it('should NOT match partial prefix without path separator', async () => {
      const manifest = {
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

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      // Create a task that starts with CLI but is not CLI/*
      // This should NOT use the packagePath mapping
      mkdirSync(join(testDir, 'CLIOther'), { recursive: true });
      writeFileSync(
        join(testDir, 'CLIOther', 'task.json'),
        JSON.stringify({
          id: 'cli-other',
          name: 'CLIOther',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      // CLIOther should NOT map to compiled/cliOther
      // It should look for CLIOther directly (and find it)
      const task = await reader.readTaskManifest('CLIOther');
      expect(task.name).toBe('CLIOther');

      await reader.close();
    });

    it('should correctly handle similar prefixes with path separators', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0',
        files: [
          { path: 'build/x', packagePath: 'X' },
          { path: 'build/xother', packagePath: 'XOther' },
        ],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'X' },
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'XOther' },
          },
        ],
      };

      writeFileSync(join(testDir, 'vss-extension.json'), JSON.stringify(manifest));

      // Create X/subdir task
      mkdirSync(join(testDir, 'build', 'x', 'subdir'), { recursive: true });
      writeFileSync(
        join(testDir, 'build', 'x', 'subdir', 'task.json'),
        JSON.stringify({
          id: 'x-sub',
          name: 'X-Sub',
          version: { Major: 1, Minor: 0, Patch: 0 },
        })
      );

      // Create XOther/subdir task
      mkdirSync(join(testDir, 'build', 'xother', 'subdir'), { recursive: true });
      writeFileSync(
        join(testDir, 'build', 'xother', 'subdir', 'task.json'),
        JSON.stringify({
          id: 'xother-sub',
          name: 'XOther-Sub',
          version: { Major: 2, Minor: 0, Patch: 0 },
        })
      );

      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform,
      });

      // X/subdir should map to build/x/subdir (NOT build/xother/subdir)
      const taskX = await reader.readTaskManifest('X/subdir');
      expect(taskX.name).toBe('X-Sub');
      expect(taskX.version.Major).toBe(1);

      // XOther/subdir should map to build/xother/subdir
      const taskXOther = await reader.readTaskManifest('XOther/subdir');
      expect(taskXOther.name).toBe('XOther-Sub');
      expect(taskXOther.version.Major).toBe(2);

      await reader.close();
    });
  });
});
