/**
 * Security tests for VSIX Reader
 * Tests protection against zip slip and other security vulnerabilities
 */

import { VsixReader } from '../vsix-reader.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import yazl from 'yazl';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';

const pipelineAsync = promisify(pipeline);

describe('VSIX Security Tests', () => {
  const testDir = '/tmp/vsix-security-tests';

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Zip Slip Protection', () => {
    it('should reject VSIX with absolute paths', async () => {
      // Note: yazl rejects absolute paths, so we test our validation directly
      // by attempting to read with malicious paths
      const safeVsix = join(testDir, 'safe-for-read-test.vsix');
      await createSafeVsix(safeVsix);

      const reader = await VsixReader.open(safeVsix);

      // Try to read with absolute path - should be rejected by our validation
      await expect(reader.readFile('/etc/passwd')).rejects.toThrow(/Security.*Absolute paths/);

      await reader.close();
    });

    it('should reject VSIX with parent directory traversal (..)', async () => {
      const safeVsix = join(testDir, 'safe-for-traversal-test.vsix');
      await createSafeVsix(safeVsix);

      const reader = await VsixReader.open(safeVsix);

      // Try to read with path traversal - should be rejected by our validation
      await expect(reader.readFile('../../../etc/passwd')).rejects.toThrow(
        /Security.*Path traversal/
      );

      await reader.close();
    });

    it('should reject VSIX with mixed traversal patterns', async () => {
      const safeVsix = join(testDir, 'safe-for-mixed-test.vsix');
      await createSafeVsix(safeVsix);

      const reader = await VsixReader.open(safeVsix);

      // Try various traversal patterns
      await expect(reader.readFile('legitimate/../../etc/passwd')).rejects.toThrow(/Security/);
      await expect(reader.readFile('./../../secret')).rejects.toThrow(/Security/);

      await reader.close();
    });

    it('should reject VSIX with Windows absolute paths', async () => {
      const safeVsix = join(testDir, 'safe-for-windows-test.vsix');
      await createSafeVsix(safeVsix);

      const reader = await VsixReader.open(safeVsix);

      // Try Windows absolute paths - should be rejected by our validation
      await expect(reader.readFile('C:\\Windows\\System32\\config\\sam')).rejects.toThrow(
        /Security/
      );
      await expect(reader.readFile('D:\\secrets\\data.txt')).rejects.toThrow(/Security/);

      await reader.close();
    });

    it('should reject VSIX with null bytes in paths', async () => {
      const maliciousVsix = join(testDir, 'null-byte.vsix');
      await createMaliciousVsix(maliciousVsix, 'file\0.txt');

      const reader = await VsixReader.open(maliciousVsix);
      await expect(reader.listFiles()).rejects.toThrow(/Security.*Null byte/);
      await reader.close();
    });

    it('should reject readFile with malicious paths', async () => {
      const safeVsix = join(testDir, 'safe.vsix');
      await createSafeVsix(safeVsix);

      const reader = await VsixReader.open(safeVsix);

      // Try to read with malicious paths
      await expect(reader.readFile('../../../etc/passwd')).rejects.toThrow(/Security/);
      await expect(reader.readFile('/etc/passwd')).rejects.toThrow(/Security/);
      await expect(reader.readFile('C:\\Windows\\System32\\config\\sam')).rejects.toThrow(
        /Security/
      );

      await reader.close();
    });

    it('should allow safe paths with subdirectories', async () => {
      const safeVsix = join(testDir, 'safe-subdirs.vsix');
      await createSafeVsix(safeVsix);

      const reader = await VsixReader.open(safeVsix);

      // These should all be safe
      const files = await reader.listFiles();
      expect(files.length).toBeGreaterThan(0);

      // Should be able to read legitimate nested files
      const manifest = await reader.readFile('extension.vsomanifest');
      expect(manifest).toBeDefined();

      await reader.close();
    });

    it('should handle edge cases safely', async () => {
      const edgeCaseVsix = join(testDir, 'edge-cases.vsix');
      await createVsixWithEdgeCases(edgeCaseVsix);

      const reader = await VsixReader.open(edgeCaseVsix);
      const files = await reader.listFiles();

      // Should successfully read legitimate files
      expect(files.length).toBeGreaterThan(0);

      await reader.close();
    });
  });

  describe('Additional Security Checks', () => {
    it('should not expose internal file system paths', async () => {
      const safeVsix = join(testDir, 'safe-2.vsix');
      await createSafeVsix(safeVsix);

      const reader = await VsixReader.open(safeVsix);
      const files = await reader.listFiles();

      // Verify no files contain absolute paths or escape sequences
      for (const file of files) {
        expect(file.path).not.toMatch(/^\//);
        expect(file.path).not.toMatch(/^[A-Z]:\\/);
        expect(file.path).not.toContain('..');
      }

      await reader.close();
    });

    it('should handle large file paths safely', async () => {
      const longPathVsix = join(testDir, 'long-path.vsix');

      // Create a path that's very long but legitimate
      const longPath = 'a/'.repeat(100) + 'file.txt';
      await createMaliciousVsix(longPathVsix, longPath);

      const reader = await VsixReader.open(longPathVsix);
      const files = await reader.listFiles();
      expect(files.some((f) => f.path === longPath)).toBe(true);

      await reader.close();
    });
  });
});

/**
 * Create a VSIX with a malicious file path
 */
async function createMaliciousVsix(outputPath: string, maliciousPath: string): Promise<void> {
  const zip = new yazl.ZipFile();
  const options = { compress: true };

  // Add a file with malicious path
  zip.addBuffer(Buffer.from('malicious content'), maliciousPath, options);

  zip.end();

  await pipelineAsync(zip.outputStream, createWriteStream(outputPath));
}

/**
 * Create a safe VSIX for testing legitimate operations
 */
async function createSafeVsix(outputPath: string): Promise<void> {
  const zip = new yazl.ZipFile();
  const options = { compress: true };

  const manifest = {
    id: 'safe-extension',
    publisher: 'test',
    version: '1.0.0',
  };

  zip.addBuffer(Buffer.from(JSON.stringify(manifest)), 'extension.vsomanifest', options);

  zip.addBuffer(Buffer.from('{}'), 'tasks/task1/task.json', options);

  zip.end();

  await pipelineAsync(zip.outputStream, createWriteStream(outputPath));
}

/**
 * Create a VSIX with edge case paths
 */
async function createVsixWithEdgeCases(outputPath: string): Promise<void> {
  const zip = new yazl.ZipFile();
  const options = { compress: true };

  const manifest = {
    id: 'edge-case-extension',
    publisher: 'test',
    version: '1.0.0',
  };

  // Legitimate edge cases
  zip.addBuffer(Buffer.from(JSON.stringify(manifest)), 'extension.vsomanifest', options);
  zip.addBuffer(Buffer.from('{}'), 'file-with-dash.txt', options);
  zip.addBuffer(Buffer.from('{}'), 'file_with_underscore.txt', options);
  zip.addBuffer(Buffer.from('{}'), 'file.with.dots.txt', options);
  zip.addBuffer(Buffer.from('{}'), 'deeply/nested/path/to/file.txt', options);

  zip.end();

  await pipelineAsync(zip.outputStream, createWriteStream(outputPath));
}
