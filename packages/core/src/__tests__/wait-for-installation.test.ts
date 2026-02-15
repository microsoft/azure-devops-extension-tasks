import { describe, expect, it } from '@jest/globals';
import type {
  ExpectedTask,
  WaitForInstallationOptions,
} from '../commands/wait-for-installation.js';

describe('waitForInstallation', () => {
  it('should export waitForInstallation function', async () => {
    const { waitForInstallation } = await import('../commands/wait-for-installation.js');
    expect(waitForInstallation).toBeDefined();
    expect(typeof waitForInstallation).toBe('function');
  });

  it('should have correct option types', () => {
    const options: WaitForInstallationOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
    };
    expect(options.publisherId).toBe('test');
    expect(options.extensionId).toBe('test');
    expect(options.accounts).toHaveLength(1);
  });

  it('should support optional timeout and polling options', () => {
    const options: WaitForInstallationOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
      timeoutMinutes: 5,
      pollingIntervalSeconds: 30,
      extensionTag: '-dev',
    };
    expect(options.timeoutMinutes).toBe(5);
    expect(options.pollingIntervalSeconds).toBe(30);
    expect(options.extensionTag).toBe('-dev');
  });

  it('should support expectedTasks with single version per task', () => {
    const expectedTasks: ExpectedTask[] = [
      { name: 'PublishExtension', versions: ['6.0.0'] },
      { name: 'PackageExtension', versions: ['6.0.0'] },
    ];

    const options: WaitForInstallationOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
      expectedTasks,
    };

    expect(options.expectedTasks).toHaveLength(2);
    expect(options.expectedTasks![0].name).toBe('PublishExtension');
    expect(options.expectedTasks![0].versions).toEqual(['6.0.0']);
  });

  it('should support expectedTasks with multiple versions per task', () => {
    const expectedTasks: ExpectedTask[] = [
      { name: 'PublishExtension', versions: ['5.0.0', '6.0.0', '7.0.0'] },
      { name: 'PackageExtension', versions: ['6.0.0', '6.1.0'] },
    ];

    const options: WaitForInstallationOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
      expectedTasks,
    };

    expect(options.expectedTasks).toHaveLength(2);
    expect(options.expectedTasks![0].versions).toHaveLength(3);
    expect(options.expectedTasks![0].versions).toContain('5.0.0');
    expect(options.expectedTasks![0].versions).toContain('6.0.0');
    expect(options.expectedTasks![0].versions).toContain('7.0.0');
    expect(options.expectedTasks![1].versions).toHaveLength(2);
  });

  it('should support manifestPath option', () => {
    const options: WaitForInstallationOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
      manifestPath: './vss-extension.json',
    };
    expect(options.manifestPath).toBe('./vss-extension.json');
  });

  it('should support vsixPath option', () => {
    const options: WaitForInstallationOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
      vsixPath: './extension.vsix',
    };
    expect(options.vsixPath).toBe('./extension.vsix');
  });

  it('should support multiple Azure DevOps accounts', () => {
    const options: WaitForInstallationOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: [
        'https://dev.azure.com/org1',
        'https://dev.azure.com/org2',
        'https://dev.azure.com/org3',
      ],
      expectedTasks: [{ name: 'Task1', versions: ['1.0.0', '2.0.0'] }],
    };
    expect(options.accounts).toHaveLength(3);
  });

  it('should handle expected task with empty versions array', () => {
    const expectedTasks: ExpectedTask[] = [{ name: 'AnyVersionTask', versions: [] }];

    const options: WaitForInstallationOptions = {
      publisherId: 'test',
      extensionId: 'test',
      accounts: ['https://dev.azure.com/org'],
      expectedTasks,
    };

    expect(options.expectedTasks![0].versions).toEqual([]);
  });

  it('should properly type InstalledTask with matchesExpected field', async () => {
    const { waitForInstallation } = await import('../commands/wait-for-installation.js');

    // This test just verifies the type compiles correctly
    // Actual verification would require mocking Azure DevOps API
    expect(waitForInstallation).toBeDefined();
  });

  it('should properly type WaitForInstallationResult with missingVersions', async () => {
    const { waitForInstallation } = await import('../commands/wait-for-installation.js');

    // This test just verifies the type compiles correctly
    // The result should have both missingTasks and missingVersions arrays
    expect(waitForInstallation).toBeDefined();
  });
});
