import { createWriteStream, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import yazl from 'yazl';
import { VsixReader } from '../vsix-reader.js';

describe('VsixReader', () => {
  const testDir = '/tmp/vsix-reader-tests';
  const testVsixPath = join(testDir, 'test-extension.vsix');

  beforeAll(async () => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });

    // Create a test VSIX file
    await createTestVsix(testVsixPath);
  });

  afterAll(() => {
    // Clean up
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('open and close', () => {
    it('should open a VSIX file', async () => {
      const reader = await VsixReader.open(testVsixPath);
      expect(reader).toBeInstanceOf(VsixReader);
      expect(reader.getPath()).toBe(testVsixPath);
      await reader.close();
    });

    it('should throw error for non-existent file', async () => {
      await expect(VsixReader.open('/nonexistent/file.vsix')).rejects.toThrow();
    });

    it('should allow closing multiple times', async () => {
      const reader = await VsixReader.open(testVsixPath);
      await reader.close();
      await reader.close(); // Should not throw
    });
  });

  describe('listFiles', () => {
    it('should list all files in the VSIX', async () => {
      const reader = await VsixReader.open(testVsixPath);
      const files = await reader.listFiles();

      expect(files.length).toBeGreaterThan(0);
      expect(files).toContainEqual(
        expect.objectContaining({
          path: 'extension.vsomanifest',
          size: expect.any(Number),
          compressedSize: expect.any(Number),
        })
      );

      await reader.close();
    });

    it('should not include directories', async () => {
      const reader = await VsixReader.open(testVsixPath);
      const files = await reader.listFiles();

      expect(files.every((f) => !f.path.endsWith('/'))).toBe(true);

      await reader.close();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing files', async () => {
      const reader = await VsixReader.open(testVsixPath);

      expect(await reader.fileExists('extension.vsomanifest')).toBe(true);
      expect(await reader.fileExists('PublishTask/task.json')).toBe(true);

      await reader.close();
    });

    it('should return false for non-existent files', async () => {
      const reader = await VsixReader.open(testVsixPath);

      expect(await reader.fileExists('nonexistent.txt')).toBe(false);

      await reader.close();
    });

    it('should handle backslash paths', async () => {
      const reader = await VsixReader.open(testVsixPath);

      expect(await reader.fileExists('PublishTask\\task.json')).toBe(true);

      await reader.close();
    });
  });

  describe('readFile', () => {
    it('should read file contents', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const buffer = await reader.readFile('extension.vsomanifest');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      const content = JSON.parse(buffer.toString('utf-8'));
      expect(content.id).toBe('test-extension');

      await reader.close();
    });

    it('should cache file contents', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const buffer1 = await reader.readFile('extension.vsomanifest');
      const buffer2 = await reader.readFile('extension.vsomanifest');

      expect(buffer1).toBe(buffer2); // Same instance

      await reader.close();
    });

    it('should throw error for non-existent file', async () => {
      const reader = await VsixReader.open(testVsixPath);

      await expect(reader.readFile('nonexistent.txt')).rejects.toThrow('File not found');

      await reader.close();
    });
  });

  describe('readExtensionManifest', () => {
    it('should read extension manifest', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const manifest = await reader.readExtensionManifest();
      expect(manifest.id).toBe('test-extension');
      expect(manifest.publisher).toBe('test-publisher');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.name).toBe('Test Extension');

      await reader.close();
    });

    it('should parse contributions', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const manifest = await reader.readExtensionManifest();
      expect(manifest.contributions).toBeDefined();
      expect(manifest.contributions!.length).toBeGreaterThan(0);
      expect(manifest.contributions![0].type).toBe('ms.vss-distributed-task.task');

      await reader.close();
    });
  });

  describe('findTaskPaths', () => {
    it('should find task directories', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const paths = await reader.findTaskPaths();
      expect(paths).toContain('PublishTask');
      expect(paths).toContain('PackageTask');

      await reader.close();
    });
  });

  describe('readTaskManifest', () => {
    it('should read task manifest', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const manifest = await reader.readTaskManifest('PublishTask');
      expect(manifest.id).toBeDefined();
      expect(manifest.name).toBe('PublishExtension');
      expect(manifest.friendlyName).toBe('Publish Extension');
      expect(manifest.version).toEqual({
        Major: 6,
        Minor: 0,
        Patch: 0,
      });

      await reader.close();
    });

    it('should throw error for invalid task path', async () => {
      const reader = await VsixReader.open(testVsixPath);

      await expect(reader.readTaskManifest('NonExistentTask')).rejects.toThrow();

      await reader.close();
    });
  });

  describe('readTaskManifests', () => {
    it('should read all task manifests', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const tasks = await reader.readTaskManifests();
      expect(tasks.length).toBe(2);
      expect(tasks.map((t) => t.manifest.name)).toContain('PublishExtension');
      expect(tasks.map((t) => t.manifest.name)).toContain('PackageExtension');

      await reader.close();
    });
  });

  describe('getMetadata', () => {
    it('should get quick metadata', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const metadata = await reader.getMetadata();
      expect(metadata).toEqual({
        publisher: 'test-publisher',
        extensionId: 'test-extension',
        version: '1.0.0',
        name: 'Test Extension',
        description: 'A test extension for unit tests',
      });

      await reader.close();
    });
  });

  describe('getTasksInfo', () => {
    it('should get tasks information', async () => {
      const reader = await VsixReader.open(testVsixPath);

      const tasks = await reader.getTasksInfo();
      expect(tasks.length).toBe(2);
      expect(tasks).toContainEqual({
        name: 'PublishExtension',
        friendlyName: 'Publish Extension',
        version: '6.0.0',
        path: 'PublishTask',
      });
      expect(tasks).toContainEqual({
        name: 'PackageExtension',
        friendlyName: 'Package Extension',
        version: '6.0.0',
        path: 'PackageTask',
      });

      await reader.close();
    });
  });

  describe('chainable API', () => {
    it('should cache file reads for repeated calls', async () => {
      const reader = await VsixReader.open(testVsixPath);

      // Call twice - should use cached buffer
      const buffer1 = await reader.readFile('extension.vsomanifest');
      const buffer2 = await reader.readFile('extension.vsomanifest');

      expect(buffer1).toBe(buffer2); // Same buffer instance due to caching

      await reader.close();
    });
  });
});

/**
 * Create a test VSIX file for testing
 */
async function createTestVsix(outputPath: string): Promise<void> {
  const zip = new yazl.ZipFile();

  // Extension manifest
  const extensionManifest = {
    manifestVersion: 1,
    id: 'test-extension',
    publisher: 'test-publisher',
    version: '1.0.0',
    name: 'Test Extension',
    description: 'A test extension for unit tests',
    categories: ['Azure Pipelines'],
    targets: [{ id: 'Microsoft.VisualStudio.Services' }],
    contributions: [
      {
        id: 'publish-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: {
          name: 'PublishTask',
        },
      },
      {
        id: 'package-task',
        type: 'ms.vss-distributed-task.task',
        targets: ['ms.vss-distributed-task.tasks'],
        properties: {
          name: 'PackageTask',
        },
      },
    ],
    files: [{ path: 'PublishTask' }, { path: 'PackageTask' }],
  };

  // Task manifests
  const publishTask = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'PublishExtension',
    friendlyName: 'Publish Extension',
    description: 'Publish an extension to the marketplace',
    version: { Major: 6, Minor: 0, Patch: 0 },
    instanceNameFormat: 'Publish $(extensionId)',
    inputs: [
      {
        name: 'extensionId',
        type: 'string',
        label: 'Extension ID',
        required: true,
      },
    ],
  };

  const packageTask = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'PackageExtension',
    friendlyName: 'Package Extension',
    description: 'Package an extension as VSIX',
    version: { Major: 6, Minor: 0, Patch: 0 },
    instanceNameFormat: 'Package $(manifestPath)',
    inputs: [
      {
        name: 'manifestPath',
        type: 'filePath',
        label: 'Manifest Path',
        required: true,
      },
    ],
  };

  // Add files to ZIP with no extra metadata
  const options = { compress: true };

  zip.addBuffer(
    Buffer.from(JSON.stringify(extensionManifest, null, 2)),
    'extension.vsomanifest',
    options
  );

  zip.addBuffer(
    Buffer.from(JSON.stringify(publishTask, null, 2)),
    'PublishTask/task.json',
    options
  );

  zip.addBuffer(
    Buffer.from(JSON.stringify(packageTask, null, 2)),
    'PackageTask/task.json',
    options
  );

  zip.end();

  // Write to file
  await new Promise<void>((resolve, reject) => {
    (zip.outputStream as any)
      .pipe(createWriteStream(outputPath) as any)
      .on('finish', resolve)
      .on('error', reject);
  });
}
