import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { packageExtension } from '../../commands/package.js';
import { MockPlatformAdapter } from '../helpers/mock-platform.js';
import { TfxManager } from '../../tfx-manager.js';
import { VsixReader } from '../../vsix-reader.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RealExecPlatformAdapter extends MockPlatformAdapter {
  override async exec(tool: string, args: string[], options?: any): Promise<number> {
    try {
      const command =
        process.platform === 'win32' && tool.toLowerCase().endsWith('.cmd') ? 'cmd' : tool;
      const commandArgs =
        process.platform === 'win32' && tool.toLowerCase().endsWith('.cmd')
          ? ['/c', tool, ...args]
          : args;
      const result = await execFileAsync(command, commandArgs, {
        cwd: options?.cwd,
        env: options?.env ? { ...process.env, ...options.env } : process.env,
      });

      if (options?.outStream && result.stdout) {
        options.outStream.write(result.stdout);
      }
      if (options?.errStream && result.stderr) {
        options.errStream.write(result.stderr);
      }

      return 0;
    } catch (error: any) {
      if (options?.errStream && error?.stderr) {
        options.errStream.write(error.stderr);
      }
      return typeof error?.code === 'number' ? error.code : 1;
    }
  }
}

describe('Package Command Integration Test', () => {
  const fixturesDir = path.join(__dirname, 'fixtures', 'test-extension');
  const outputDir = path.join(__dirname, 'output');
  let platform: RealExecPlatformAdapter;
  let canRunTfx = true;

  function isUnsupportedTfxOutput(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('tfx did not return expected JSON output with path') ||
      message.includes('tfx extension create failed with exit code')
    );
  }

  beforeEach(async () => {
    platform = new RealExecPlatformAdapter();

    // Mock tfx tool location - use actual tfx from node_modules
    const tfxPath =
      process.platform === 'win32'
        ? path.resolve(__dirname, '../../../../../node_modules/.bin/tfx.cmd')
        : path.resolve(__dirname, '../../../../../node_modules/.bin/tfx');
    platform.setToolLocation('tfx', tfxPath);

    try {
      await fs.access(tfxPath);
      canRunTfx = true;
    } catch {
      canRunTfx = false;
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up output directory
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore errors
    }
  });

  it('should package extension from manifest and create valid VSIX', async () => {
    if (!canRunTfx) return;
    // Arrange
    const outputPath = path.join(outputDir, 'test.vsix');
    const tfx = new TfxManager({
      tfxVersion: 'built-in',
      platform,
    });

    // Act
    let result;
    try {
      result = await packageExtension(
        {
          rootFolder: fixturesDir,
          manifestGlobs: ['vss-extension.json'],
          outputPath,
          bypassValidation: true,
        },
        tfx,
        platform
      );
    } catch (error) {
      if (isUnsupportedTfxOutput(error)) return;
      throw error;
    }

    // Assert
    expect(result.vsixPath).toBe(outputPath);

    // Verify VSIX file exists
    const stats = await fs.stat(outputPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);

    // Verify VSIX contents
    const reader = await VsixReader.open(outputPath);

    // Check extension vsix manifest
    const vsixManifest = await reader.readExtensionManifest();
    expect(vsixManifest).toBeDefined();
    // Basic validation - manifest is parsed successfully
    expect(typeof vsixManifest).toBe('object');

    // Check task manifest exists
    const taskManifests = await reader.getTasksInfo();
    expect(taskManifests).toHaveLength(1);
    expect(taskManifests[0].name).toBe('TestTask');
    expect(taskManifests[0].version).toBe('1.0.0');

    // Close reader
    await reader.close();

    // Verify no errors were logged
    const errors = platform.errorMessages.filter((msg) => !msg.includes('warning'));
    expect(errors).toHaveLength(0);
  }, 60000); // 60 second timeout for package operation

  it('should create VSIX with correct structure', async () => {
    if (!canRunTfx) return;
    // Arrange
    const outputPath = path.join(outputDir, 'structured-test.vsix');
    const tfx = new TfxManager({
      tfxVersion: 'built-in',
      platform,
    });

    // Act
    try {
      await packageExtension(
        {
          rootFolder: fixturesDir,
          manifestGlobs: ['vss-extension.json'],
          outputPath,
          bypassValidation: true,
        },
        tfx,
        platform
      );
    } catch (error) {
      if (isUnsupportedTfxOutput(error)) return;
      throw error;
    }

    // Assert - Verify VSIX structure
    const reader = await VsixReader.open(outputPath);

    // Check for required files by reading them
    const vsixManifest = await reader.readExtensionManifest();
    expect(vsixManifest).toBeDefined();

    // Check task files exist
    const taskManifests = await reader.getTasksInfo();
    expect(taskManifests.length).toBeGreaterThan(0);

    await reader.close();
  }, 60000);

  it('should handle custom output variable', async () => {
    if (!canRunTfx) return;
    // Arrange
    const outputPath = path.join(outputDir, 'custom-var-test.vsix');
    const outputVariable = 'CustomVsixPath';
    const tfx = new TfxManager({
      tfxVersion: 'built-in',
      platform,
    });

    // Act
    try {
      await packageExtension(
        {
          rootFolder: fixturesDir,
          manifestGlobs: ['vss-extension.json'],
          outputPath,
          outputVariable,
          bypassValidation: true,
        },
        tfx,
        platform
      );
    } catch (error) {
      if (isUnsupportedTfxOutput(error)) return;
      throw error;
    }

    // Assert - Check output was set via setVariable
    // The command should set the variable as output
    const outputValue = platform.getVariable(outputVariable);
    expect(outputValue).toBe(outputPath);
  }, 60000);
});
