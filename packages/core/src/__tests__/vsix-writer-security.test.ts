/**
 * Security tests for VsixWriter
 * 
 * Verifies zip slip protection and path validation in the writer
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { VsixReader } from '../vsix-reader.js';
import { ManifestEditor } from '../manifest-editor.js';
import { mkdirSync, writeFileSync, createWriteStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import yazl from 'yazl';

describe('VsixWriter Security Tests', () => {
  let testVsixPath: string;
  let outputVsixPath: string;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `vsix-security-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testVsixPath = join(testDir, 'input.vsix');
    outputVsixPath = join(testDir, 'output.vsix');
    
    // Create a minimal test VSIX
    const zipFile = new yazl.ZipFile();
    
    const manifest = {
      manifestVersion: 1,
      id: 'test',
      publisher: 'test',
      version: '1.0.0'
    };
    
    zipFile.addBuffer(
      Buffer.from(JSON.stringify(manifest)),
      'vss-extension.json'
    );
    
    await new Promise<void>((resolve, reject) => {
      zipFile.outputStream
        .pipe(createWriteStream(testVsixPath))
        .on('finish', resolve)
        .on('error', reject);
      zipFile.end();
    });
  });

  it('should reject absolute paths in setFile', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    await expect(async () => {
      const writer = await ManifestEditor.fromReader(reader)
        
        .setFile('/etc/passwd', 'malicious')
        .toWriter();
      
      await writer.writeToFile(outputVsixPath);
    }).rejects.toThrow(/Security.*[Aa]bsolute/);
    
    await reader.close();
  });

  it('should reject paths with parent directory traversal in setFile', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    await expect(async () => {
      const writer = await ManifestEditor.fromReader(reader)
        
        .setFile('../../../etc/passwd', 'malicious')
        .toWriter();
      
      await writer.writeToFile(outputVsixPath);
    }).rejects.toThrow(/Security.*[Pp]ath traversal/);
    
    await reader.close();
  });

  it('should reject Windows absolute paths in setFile', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    await expect(async () => {
      const writer = await ManifestEditor.fromReader(reader)
        
        .setFile('C:\\Windows\\System32\\evil.dll', 'malicious')
        .toWriter();
      
      await writer.writeToFile(outputVsixPath);
    }).rejects.toThrow(/Security.*[Aa]bsolute/);
    
    await reader.close();
  });

  it('should reject paths with null bytes in setFile', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    await expect(async () => {
      const writer = await ManifestEditor.fromReader(reader)
        
        .setFile('file\0name.txt', 'malicious')
        .toWriter();
      
      await writer.writeToFile(outputVsixPath);
    }).rejects.toThrow(/Security.*[Nn]ull byte/);
    
    await reader.close();
  });

  it('should reject sneaky parent traversal patterns in setFile', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    const sneakyPaths = [
      '..\\..\\etc\\passwd',
      'folder/../../etc/passwd',
      './../../etc/passwd',
      'a/../../../etc/passwd'
    ];
    
    for (const path of sneakyPaths) {
      await expect(async () => {
        const writer = await ManifestEditor.fromReader(reader)
          .setFile(path, 'malicious')
          .toWriter();
        
        await writer.writeToFile(outputVsixPath);
      }).rejects.toThrow(/Security/);
    }
    
    await reader.close();
  });

  it('should accept safe relative paths in setFile', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    const safePaths = [
      'folder/file.txt',
      'deeply/nested/folder/file.json',
      'file.txt',
      'folder\\file.txt',  // Windows style but still relative
      'a/b/c/d/e/file.txt'
    ];
    
    const editor = ManifestEditor.fromReader(reader);
    for (const path of safePaths) {
      editor.setFile(path, 'safe content');
    }
    
    const writer = await editor.toWriter();
    
    // Should not throw
    await expect(writer.writeToFile(outputVsixPath)).resolves.not.toThrow();
    
    await writer.close();
    await reader.close();
  });

  it('should validate paths when writing', async () => {
    const reader = await VsixReader.open(testVsixPath);
    
    // Create editor with malicious path
    const editor = ManifestEditor.fromReader(reader);
    
    // Bypass the editor's setFile and directly modify the internal state
    // This simulates if someone tried to hack around the API
    const modifications = (editor as any).modifications as Map<string, any>;
    modifications.set('../../../etc/passwd', {
      type: 'modify',
      path: '../../../etc/passwd',
      content: Buffer.from('malicious')
    });
    
    const writer = await editor.toWriter();
    
    // Writer should still catch the invalid path
    await expect(writer.writeToFile(outputVsixPath)).rejects.toThrow(/Security/);
    
    await reader.close();
  });
});
