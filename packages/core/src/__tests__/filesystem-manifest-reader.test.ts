/**
 * Tests for FilesystemManifestReader
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FilesystemManifestReader } from '../filesystem-manifest-reader.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FilesystemManifestReader', () => {
  let testDir: string;
  let mockPlatform: MockPlatformAdapter;

  beforeEach(() => {
    mockPlatform = new MockPlatformAdapter();
    
    // Create a test directory
    testDir = join(tmpdir(), `manifest-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
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
        categories: ['Azure Pipelines']
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(manifest, null, 2)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        manifestGlobs: ['vss-extension.json'],
        platform: mockPlatform
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
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(manifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
        platform: mockPlatform
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
              name: 'Task1'
            }
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: {
              name: 'Task2'
            }
          }
        ]
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(manifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      const taskPaths = await reader.findTaskPaths();
      
      expect(taskPaths).toEqual(['Task1', 'Task2']);
      
      await reader.close();
    });

    it('should return empty array if no tasks found', async () => {
      const manifest = {
        id: 'test-ext',
        publisher: 'test-pub',
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(manifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
            properties: { name: 'Task1' }
          }
        ]
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(extManifest)
      );
      
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
          Patch: 3
        }
      };
      
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify(taskManifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
        version: '1.0.0'
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(manifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
        description: 'Test Description'
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(manifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
      
      // Create tasks
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          friendlyName: 'First Task',
          version: { Major: 1, Minor: 0, Patch: 0 }
        })
      );
      
      mkdirSync(join(testDir, 'Task2'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'task.json'),
        JSON.stringify({
          id: 'id2',
          name: 'Task2',
          friendlyName: 'Second Task',
          version: { Major: 2, Minor: 1, Patch: 3 }
        })
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
          { path: 'tasks/terraform-installer/.dist', packagePath: 'TerraformInstaller' }
        ],
        contributions: [
          {
            id: 'task1',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'TerraformCLI' }
          },
          {
            id: 'task2',
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'TerraformInstaller' }
          }
        ]
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(manifest)
      );
      
      // Create task in actual source directory (not packagePath)
      mkdirSync(join(testDir, 'tasks', 'terraform-cli', '.dist'), { recursive: true });
      const taskManifest = {
        id: 'task-id-123',
        name: 'TerraformCLI',
        friendlyName: 'Terraform CLI',
        version: { Major: 1, Minor: 0, Patch: 0 }
      };
      
      writeFileSync(
        join(testDir, 'tasks', 'terraform-cli', '.dist', 'task.json'),
        JSON.stringify(taskManifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
            properties: { name: 'Task1' }
          }
        ]
      };
      
      writeFileSync(
        join(testDir, 'vss-extension.json'),
        JSON.stringify(manifest)
      );
      
      // Create task without packagePath (direct path matches contribution name)
      mkdirSync(join(testDir, 'Task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 }
        })
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
          { path: 'compiled/task1', packagePath: 'Task1' }
          // Task2 has no packagePath, uses direct path
        ],
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
        JSON.stringify(manifest)
      );
      
      // Task1 with packagePath - source is in 'compiled/task1', not 'Task1'
      mkdirSync(join(testDir, 'compiled', 'task1'), { recursive: true });
      writeFileSync(
        join(testDir, 'compiled', 'task1', 'task.json'),
        JSON.stringify({
          id: 'id1',
          name: 'Task1',
          version: { Major: 1, Minor: 0, Patch: 0 }
        })
      );
      
      // Task2 without packagePath - source is directly in 'Task2'
      mkdirSync(join(testDir, 'Task2'), { recursive: true });
      writeFileSync(
        join(testDir, 'Task2', 'task.json'),
        JSON.stringify({
          id: 'id2',
          name: 'Task2',
          version: { Major: 2, Minor: 0, Patch: 0 }
        })
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
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
        files: [
          { path: 'nonexistent/path', packagePath: 'Task1' }
        ],
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
        JSON.stringify(manifest)
      );
      
      const reader = new FilesystemManifestReader({
        rootFolder: testDir,
        platform: mockPlatform
      });
      
      // Should try to read from 'nonexistent/path' and fail
      await expect(reader.readTaskManifest('Task1')).rejects.toThrow(/not found/);
      
      await reader.close();
    });
  });
});
