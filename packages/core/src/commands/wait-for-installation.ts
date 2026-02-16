import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import type { ITaskAgentApi } from 'azure-devops-node-api/TaskAgentApi.js';
import type { TaskDefinition } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces.js';
import type { AuthCredentials } from '../auth.js';
import { readManifest, resolveTaskManifestPaths } from '../manifest-utils.js';
import { normalizeAccountsToServiceUrls } from '../organization-utils.js';
import type { IPlatformAdapter } from '../platform.js';
import { VsixReader } from '../vsix-reader.js';

export interface ExpectedTask {
  name: string;
  versions: string[]; // Expected versions (major.minor.patch)
}

export interface WaitForInstallationOptions {
  publisherId?: string;
  extensionId?: string;
  accounts: string[]; // Target organization names or URLs
  expectedTasks?: ExpectedTask[]; // Tasks with expected versions
  manifestPath?: string; // Path to extension manifest (vss-extension.json) to read task versions
  vsixPath?: string; // Path to VSIX file to read task versions from
  timeoutMinutes?: number; // Default: 10
  pollingIntervalSeconds?: number; // Default: 30
}

async function resolveExtensionIdentity(
  options: WaitForInstallationOptions,
  platform: IPlatformAdapter
): Promise<{ publisherId: string; extensionId: string }> {
  let publisherId = options.publisherId;
  let extensionId = options.extensionId;

  if ((!publisherId || !extensionId) && options.vsixPath) {
    platform.debug(`Reading extension identity from VSIX: ${options.vsixPath}`);

    const reader = await VsixReader.open(options.vsixPath);
    try {
      const metadata = await reader.getMetadata();
      publisherId = publisherId || metadata.publisher;
      extensionId = extensionId || metadata.extensionId;
    } finally {
      await reader.close();
    }
  }

  if (!publisherId || !extensionId) {
    throw new Error(
      'publisherId and extensionId are required for wait-for-installation. Provide them directly, or provide vsixPath so they can be inferred from VSIX metadata.'
    );
  }

  return { publisherId, extensionId };
}

export interface InstalledTask {
  name: string;
  id: string;
  version: string;
  friendlyName: string;
  matchesExpected: boolean; // True if this version is one of the expected versions
}

export interface WaitForInstallationResult {
  success: boolean;
  accountResults: {
    accountUrl: string;
    available: boolean;
    installedTasks: InstalledTask[];
    missingTasks: string[]; // Task names that are completely missing
    missingVersions: string[]; // Task/version combinations that are missing (e.g., "TaskName@1.0.0")
    error?: string;
  }[];
  allTasksAvailable: boolean;
}

/**
 * Resolve expected tasks from various sources
 */
async function resolveExpectedTasks(
  options: WaitForInstallationOptions,
  platform: IPlatformAdapter
): Promise<ExpectedTask[]> {
  // If expectedTasks is provided directly, use it
  if (options.expectedTasks && options.expectedTasks.length > 0) {
    platform.debug(`Using ${options.expectedTasks.length} expected tasks from options`);
    return options.expectedTasks;
  }

  // If manifestPath is provided, read task versions from manifest
  if (options.manifestPath) {
    try {
      platform.debug(`Reading task versions from manifest: ${options.manifestPath}`);
      const manifest = await readManifest(options.manifestPath, platform);
      const taskPaths = resolveTaskManifestPaths(manifest, options.manifestPath, platform);

      const tasks: ExpectedTask[] = [];
      for (const taskPath of taskPaths) {
        try {
          const taskManifest = (await readManifest(taskPath, platform)) as any;
          if (taskManifest.name && taskManifest.version) {
            const version = `${taskManifest.version.Major}.${taskManifest.version.Minor}.${taskManifest.version.Patch}`;
            tasks.push({
              name: taskManifest.name as string,
              versions: [version],
            });
            platform.debug(`Found task ${taskManifest.name} v${version}`);
          }
        } catch (error) {
          platform.warning(
            `Failed to read task manifest ${taskPath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (tasks.length > 0) {
        platform.debug(`Resolved ${tasks.length} tasks from manifest`);
        return tasks;
      }
    } catch (error) {
      platform.warning(
        `Failed to read manifest ${options.manifestPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // If vsixPath is provided, read task versions from VSIX
  if (options.vsixPath) {
    try {
      platform.debug(`Reading task versions from VSIX: ${options.vsixPath}`);
      const reader = await VsixReader.open(options.vsixPath);

      try {
        const tasksInfo = await reader.getTasksInfo();
        const tasks: ExpectedTask[] = tasksInfo.map((task) => ({
          name: task.name,
          versions: [task.version],
        }));

        platform.debug(`Resolved ${tasks.length} tasks from VSIX`);
        return tasks;
      } finally {
        await reader.close();
      }
    } catch (error) {
      platform.warning(
        `Failed to read VSIX ${options.vsixPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // No expected tasks specified
  return [];
}

/**
 * Verify that an extension's tasks are installed and available in Azure DevOps organizations.
 * Uses Azure DevOps REST API to poll for task availability.
 */
export async function waitForInstallation(
  options: WaitForInstallationOptions,
  auth: AuthCredentials,
  platform: IPlatformAdapter
): Promise<WaitForInstallationResult> {
  const identity = await resolveExtensionIdentity(options, platform);
  const accountUrls = normalizeAccountsToServiceUrls(options.accounts);

  const timeoutMs = (options.timeoutMinutes ?? 10) * 60_000;
  const pollingIntervalMs = (options.pollingIntervalSeconds ?? 30) * 1000;

  platform.debug(
    `Verifying installation of ${identity.publisherId}.${identity.extensionId} in ${accountUrls.length} account(s)`
  );

  // Resolve expected tasks with versions
  const expectedTasks = await resolveExpectedTasks(options, platform);

  const accountResults: WaitForInstallationResult['accountResults'] = [];

  for (const accountUrl of accountUrls) {
    platform.debug(`Checking account: ${accountUrl}`);
    platform.info(
      `Polling for task availability (timeout: ${options.timeoutMinutes ?? 10} minutes, interval: ${options.pollingIntervalSeconds ?? 30} seconds)`
    );

    try {
      // Create Azure DevOps API connection
      if (!auth.token) {
        throw new Error('PAT token is required for waitForInstallation command');
      }

      const handler = getPersonalAccessTokenHandler(auth.token);
      const connection = new WebApi(accountUrl, handler);
      const taskAgentApi: ITaskAgentApi = await connection.getTaskAgentApi();

      // Poll until tasks appear or timeout
      const deadline = Date.now() + timeoutMs;
      let lastError: Error | undefined;
      let found = false;
      let finalInstalledTasks: InstalledTask[] = [];
      let finalMissingTasks: string[] = [];
      let finalMissingVersions: string[] = [];
      let pollCount = 0;

      while (Date.now() < deadline && !found) {
        pollCount++;
        const remainingMs = deadline - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60_000);

        platform.debug(`Poll attempt ${pollCount} (${remainingMinutes} minute(s) remaining)`);

        try {
          const taskDefinitions: TaskDefinition[] = await taskAgentApi.getTaskDefinitions();

          // Find tasks matching the extension
          const installedTasks: InstalledTask[] = [];
          const missingTasks: string[] = [];
          const missingVersions: string[] = [];

          // If we have expected tasks, check for them specifically
          if (expectedTasks.length > 0) {
            for (const expectedTask of expectedTasks) {
              // Find all installed versions of this task
              const installedTaskVersions = taskDefinitions.filter(
                (t) =>
                  t.name?.toLowerCase() === expectedTask.name.toLowerCase() && t.id && t.version
              );

              if (installedTaskVersions.length === 0) {
                // Task name not found at all
                missingTasks.push(expectedTask.name);
                // Also track specific versions that are missing
                for (const ver of expectedTask.versions) {
                  missingVersions.push(`${expectedTask.name}@${ver}`);
                }
                continue;
              }

              // Check each installed version of this task
              for (const installedTask of installedTaskVersions) {
                const installedVersion = `${installedTask.version.major}.${installedTask.version.minor}.${installedTask.version.patch}`;

                // Check if this version matches any expected version
                const matchesExpected = expectedTask.versions.includes(installedVersion);

                installedTasks.push({
                  name: installedTask.name,
                  id: installedTask.id,
                  version: installedVersion,
                  friendlyName: installedTask.friendlyName || installedTask.name,
                  matchesExpected,
                });
              }

              // Check if all required versions are present
              const installedVersionStrings = installedTaskVersions.map(
                (t) => `${t.version.major}.${t.version.minor}.${t.version.patch}`
              );

              for (const expectedVer of expectedTask.versions) {
                if (!installedVersionStrings.includes(expectedVer)) {
                  missingVersions.push(`${expectedTask.name}@${expectedVer}`);
                  platform.debug(`Missing version ${expectedVer} for task ${expectedTask.name}`);
                }
              }
            }

            // Success if all tasks found and all required versions present
            if (missingTasks.length === 0 && missingVersions.length === 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalMissingVersions = missingVersions;

              // Count unique task names and total expected versions
              const uniqueTasks = new Set(expectedTasks.map((t) => t.name));
              const totalExpectedVersions = expectedTasks.reduce((sum, t) => {
                return sum + t.versions.length;
              }, 0);

              platform.info(
                `✓ All ${uniqueTasks.size} expected task(s) with ${totalExpectedVersions} version(s) found in ${accountUrl}`
              );
            } else if (missingTasks.length > 0) {
              platform.debug(`Missing ${missingTasks.length} task(s): ${missingTasks.join(', ')}`);
            } else if (missingVersions.length > 0) {
              platform.debug(
                `Missing ${missingVersions.length} version(s): ${missingVersions.join(', ')}`
              );
            }
          } else {
            // No expected tasks - collect all tasks
            for (const task of taskDefinitions) {
              if (task.name && task.id && task.version) {
                installedTasks.push({
                  name: task.name,
                  id: task.id,
                  version: `${task.version.major}.${task.version.minor}.${task.version.patch}`,
                  friendlyName: task.friendlyName || task.name,
                  matchesExpected: true, // No expectations, so all match
                });
              }
            }

            if (installedTasks.length > 0) {
              found = true;
              finalInstalledTasks = installedTasks;
              finalMissingTasks = missingTasks;
              finalMissingVersions = missingVersions;
              platform.info(
                `✓ Found ${installedTasks.length} task(s) from extension in ${accountUrl}`
              );
            }
          }

          if (!found && Date.now() < deadline) {
            // Wait before next poll
            platform.debug(`Waiting ${pollingIntervalMs / 1000}s before next poll...`);
            await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          platform.debug(`Error polling for tasks: ${lastError.message}. Retrying...`);

          if (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
          }
        }
      }

      if (found) {
        accountResults.push({
          accountUrl,
          available: true,
          installedTasks: finalInstalledTasks,
          missingTasks: finalMissingTasks,
          missingVersions: finalMissingVersions,
        });
      } else {
        const errorMsg = lastError
          ? `Timeout waiting for tasks. Last error: ${lastError.message}`
          : `Timeout waiting for tasks after ${options.timeoutMinutes ?? 10} minutes`;

        platform.warning(errorMsg);

        // Calculate all missing versions for expected tasks
        const allMissingVersions: string[] = [];
        for (const task of expectedTasks) {
          for (const ver of task.versions) {
            allMissingVersions.push(`${task.name}@${ver}`);
          }
        }

        accountResults.push({
          accountUrl,
          available: false,
          installedTasks: [],
          missingTasks: expectedTasks.map((t) => t.name),
          missingVersions: allMissingVersions,
          error: errorMsg,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      platform.error(`Failed to verify installation in ${accountUrl}: ${errorMsg}`);

      // Calculate all missing versions for expected tasks
      const allMissingVersions: string[] = [];
      for (const task of expectedTasks) {
        for (const ver of task.versions) {
          allMissingVersions.push(`${task.name}@${ver}`);
        }
      }

      accountResults.push({
        accountUrl,
        available: false,
        installedTasks: [],
        missingTasks: expectedTasks.map((t) => t.name),
        missingVersions: allMissingVersions,
        error: errorMsg,
      });
    }
  }

  const allTasksAvailable = accountResults.every(
    (r) => r.available && r.missingVersions.length === 0
  );

  // Log summary
  if (allTasksAvailable) {
    platform.info(
      `✅ All tasks verified successfully across ${options.accounts.length} account(s)`
    );
  } else {
    const failedAccounts = accountResults.filter((r) => !r.available);
    const missingVersionAccounts = accountResults.filter(
      (r) => r.available && r.missingVersions.length > 0
    );

    if (failedAccounts.length > 0) {
      platform.warning(`❌ Failed to verify tasks in ${failedAccounts.length} account(s)`);
    }
    if (missingVersionAccounts.length > 0) {
      platform.warning(`⚠️ Missing versions found in ${missingVersionAccounts.length} account(s)`);
    }
  }

  return {
    success: allTasksAvailable,
    accountResults,
    allTasksAvailable,
  };
}
