/**
 * Integration tests for VSIX Reader and Writer
 * These tests actually read and write VSIX files to ensure correct behavior
 */

import { VsixReader } from '../vsix-reader.js';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yazl from 'yazl';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';

const pipelineAsync = promisify(pipeline);

describe('VSIX Integration Tests', () => {
  const testDir = '/tmp/vsix-integration-tests';
  const realWorldVsixPath = join(testDir, 'real-extension.vsix');

  beforeAll(async () => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });

    // Create a realistic VSIX file
    await createRealWorldVsix(realWorldVsixPath);
  });

  afterAll(() => {
    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Reading real-world VSIX structure', () => {
    it('should read a complete extension manifest', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      const manifest = await reader.readExtensionManifest();

      // Verify all key fields are present
      expect(manifest.id).toBe('vsts-developer-tools-build-tasks');
      expect(manifest.publisher).toBe('jessehouwing');
      expect(manifest.version).toBe('6.0.0');
      expect(manifest.name).toBe('Azure DevOps Extension Tasks');
      expect(manifest.description).toBeDefined();
      expect(manifest.categories).toContain('Azure Pipelines');
      expect(manifest.targets).toBeDefined();
      expect(manifest.contributions).toBeDefined();
      expect(manifest.files).toBeDefined();

      await reader.close();
    });

    it('should discover all tasks from contributions', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      const taskPaths = await reader.findTaskPaths();

      expect(taskPaths).toHaveLength(9);
      expect(taskPaths).toContain('PublishTask');
      expect(taskPaths).toContain('PackageTask');
      expect(taskPaths).toContain('UnpublishTask');
      expect(taskPaths).toContain('ShareTask');
      expect(taskPaths).toContain('UnshareTask');
      expect(taskPaths).toContain('InstallTask');
      expect(taskPaths).toContain('ShowTask');
      expect(taskPaths).toContain('IsValidTask');
      expect(taskPaths).toContain('VerifyInstallTask');

      await reader.close();
    });

    it('should read all task manifests with correct versions', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      const tasks = await reader.readTaskManifests();

      expect(tasks).toHaveLength(9);

      // Verify each task has required fields
      for (const { path, manifest } of tasks) {
        expect(manifest.id).toBeDefined();
        expect(manifest.name).toBeDefined();
        expect(manifest.friendlyName).toBeDefined();
        expect(manifest.version).toBeDefined();
        expect(manifest.version.Major).toBe(6);
        expect(manifest.version.Minor).toBe(0);
        expect(manifest.version.Patch).toBe(0);
      }

      await reader.close();
    });

    it('should get tasks info for verifyInstall integration', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      const tasksInfo = await reader.getTasksInfo();

      expect(tasksInfo).toHaveLength(9);

      // Verify structure needed for verifyInstall
      const publishTask = tasksInfo.find((t) => t.name === 'PublishExtension');
      expect(publishTask).toBeDefined();
      expect(publishTask!.friendlyName).toBe('Publish Extension');
      expect(publishTask!.version).toBe('6.0.0');
      expect(publishTask!.path).toBe('PublishTask');

      await reader.close();
    });

    it('should handle multiple readers on same file', async () => {
      // Open multiple readers simultaneously
      const reader1 = await VsixReader.open(realWorldVsixPath);
      const reader2 = await VsixReader.open(realWorldVsixPath);
      const reader3 = await VsixReader.open(realWorldVsixPath);

      // Read concurrently
      const [manifest1, manifest2, manifest3] = await Promise.all([
        reader1.readExtensionManifest(),
        reader2.readExtensionManifest(),
        reader3.readExtensionManifest(),
      ]);

      // All should get the same data
      expect(manifest1.id).toBe(manifest2.id);
      expect(manifest2.id).toBe(manifest3.id);

      await Promise.all([reader1.close(), reader2.close(), reader3.close()]);
    });

    it('should read specific files by path', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      // Read task manifest directly
      const taskJsonBuffer = await reader.readFile('PublishTask/task.json');
      const taskJson = JSON.parse(taskJsonBuffer.toString('utf-8'));

      expect(taskJson.name).toBe('PublishExtension');
      expect(taskJson.version.Major).toBe(6);

      await reader.close();
    });

    it('should list all files including nested paths', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      const files = await reader.listFiles();

      // Should have extension manifest
      expect(files.some((f) => f.path === 'extension.vsomanifest')).toBe(true);

      // Should have task manifests
      expect(files.some((f) => f.path === 'PublishTask/task.json')).toBe(true);
      expect(files.some((f) => f.path === 'PackageTask/task.json')).toBe(true);

      // All files should have size info
      for (const file of files) {
        expect(file.size).toBeGreaterThan(0);
        expect(file.compressedSize).toBeGreaterThanOrEqual(0);
      }

      await reader.close();
    });

    it('should get metadata quickly without reading all files', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      const metadata = await reader.getMetadata();

      expect(metadata.publisher).toBe('jessehouwing');
      expect(metadata.extensionId).toBe('vsts-developer-tools-build-tasks');
      expect(metadata.version).toBe('6.0.0');
      expect(metadata.name).toBe('Azure DevOps Extension Tasks');

      await reader.close();
    });
  });

  describe('Error handling', () => {
    it('should handle corrupted VSIX gracefully', async () => {
      const corruptedPath = join(testDir, 'corrupted.vsix');
      writeFileSync(corruptedPath, 'not a zip file');

      await expect(VsixReader.open(corruptedPath)).rejects.toThrow();
    });

    it('should handle missing files gracefully', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      await expect(reader.readFile('nonexistent/file.txt')).rejects.toThrow('File not found');

      await reader.close();
    });

    it('should handle operations after close', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);
      await reader.close();

      // Operations after close should still work by reopening internally or fail gracefully
      // For now, we expect them to fail
      await expect(reader.readExtensionManifest()).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should cache file reads efficiently', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      // First read
      const start1 = Date.now();
      const manifest1 = await reader.readExtensionManifest();
      const time1 = Date.now() - start1;

      // Second read (should be cached)
      const start2 = Date.now();
      const manifest2 = await reader.readExtensionManifest();
      const time2 = Date.now() - start2;

      // Cached read should be significantly faster (or at least not slower)
      expect(time2).toBeLessThanOrEqual(time1 + 5); // Allow 5ms margin

      await reader.close();
    });

    it('should handle large number of sequential reads', async () => {
      const reader = await VsixReader.open(realWorldVsixPath);

      // Read all tasks multiple times
      for (let i = 0; i < 3; i++) {
        const tasks = await reader.readTaskManifests();
        expect(tasks).toHaveLength(9);
      }

      await reader.close();
    });
  });
});

/**
 * Create a realistic VSIX file for integration testing
 */
async function createRealWorldVsix(outputPath: string): Promise<void> {
  const zip = new yazl.ZipFile();

  // Realistic extension manifest
  const extensionManifest = {
    manifestVersion: 1,
    id: 'vsts-developer-tools-build-tasks',
    publisher: 'jessehouwing',
    version: '6.0.0',
    name: 'Azure DevOps Extension Tasks',
    description: 'Tasks to package, publish, and manage Azure DevOps extensions',
    categories: ['Azure Pipelines'],
    tags: ['Extension', 'Marketplace', 'VSIX', 'Publishing'],
    targets: [{ id: 'Microsoft.VisualStudio.Services' }],
    icons: {
      default: 'extension-icon.png',
    },
    contributions: [
      {
        id: 'publish-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'PublishTask' },
      },
      {
        id: 'package-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'PackageTask' },
      },
      {
        id: 'unpublish-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'UnpublishTask' },
      },
      {
        id: 'share-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'ShareTask' },
      },
      {
        id: 'unshare-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'UnshareTask' },
      },
      {
        id: 'install-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'InstallTask' },
      },
      {
        id: 'show-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'ShowTask' },
      },
      {
        id: 'isvalid-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'IsValidTask' },
      },
      {
        id: 'verifyinstall-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: { name: 'VerifyInstallTask' },
      },
    ],
    files: [
      { path: 'PublishTask' },
      { path: 'PackageTask' },
      { path: 'UnpublishTask' },
      { path: 'ShareTask' },
      { path: 'UnshareTask' },
      { path: 'InstallTask' },
      { path: 'ShowTask' },
      { path: 'IsValidTask' },
      { path: 'VerifyInstallTask' },
    ],
  };

  // Create task manifests for all 9 tasks
  const tasks = [
    {
      name: 'PublishExtension',
      friendlyName: 'Publish Extension',
      description: 'Publish an extension to the marketplace',
      folder: 'PublishTask',
    },
    {
      name: 'PackageExtension',
      friendlyName: 'Package Extension',
      description: 'Package an extension as VSIX',
      folder: 'PackageTask',
    },
    {
      name: 'UnpublishExtension',
      friendlyName: 'Unpublish Extension',
      description: 'Remove an extension from marketplace',
      folder: 'UnpublishTask',
    },
    {
      name: 'ShareExtension',
      friendlyName: 'Share Extension',
      description: 'Share extension with organizations',
      folder: 'ShareTask',
    },
    {
      name: 'UnshareExtension',
      friendlyName: 'Unshare Extension',
      description: 'Unshare extension from organizations',
      folder: 'UnshareTask',
    },
    {
      name: 'InstallExtension',
      friendlyName: 'Install Extension',
      description: 'Install extension to organizations',
      folder: 'InstallTask',
    },
    {
      name: 'ShowExtension',
      friendlyName: 'Show Extension',
      description: 'Query extension metadata',
      folder: 'ShowTask',
    },
    {
      name: 'IsValidExtension',
      friendlyName: 'Validate Extension',
      description: 'Validate extension status',
      folder: 'IsValidTask',
    },
    {
      name: 'VerifyInstallExtension',
      friendlyName: 'Verify Install',
      description: 'Verify tasks are installed',
      folder: 'VerifyInstallTask',
    },
  ];

  const options = { compress: true };

  // Add extension manifest
  zip.addBuffer(
    Buffer.from(JSON.stringify(extensionManifest, null, 2)),
    'extension.vsomanifest',
    options
  );

  // Add all task manifests
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskManifest = {
      id: `${i + 1}${i + 1}${i + 1}${i + 1}${i + 1}${i + 1}${i + 1}${i + 1}-1111-1111-1111-111111111111`,
      name: task.name,
      friendlyName: task.friendlyName,
      description: task.description,
      version: { Major: 6, Minor: 0, Patch: 0 },
      instanceNameFormat: `${task.friendlyName} $(extensionId)`,
      inputs: [
        {
          name: 'extensionId',
          type: 'string',
          label: 'Extension ID',
          required: true,
        },
      ],
    };

    zip.addBuffer(
      Buffer.from(JSON.stringify(taskManifest, null, 2)),
      `${task.folder}/task.json`,
      options
    );
  }

  zip.end();

  // Write to file
  await pipelineAsync(zip.outputStream, createWriteStream(outputPath));
}
