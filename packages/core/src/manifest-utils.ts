/**
 * Manifest utilities for reading, writing, and manipulating extension manifests
 */

import path from 'path';
import type { IPlatformAdapter } from './platform.js';

/**
 * Resolve manifest file paths from root folder and glob patterns
 * @param rootFolder Root directory to search from
 * @param patterns Glob patterns to match (e.g., ["vss-extension.json", "*.json"])
 * @param platform Platform adapter for filesystem operations
 * @returns Array of resolved manifest file paths
 */
export function resolveManifestPaths(
  rootFolder: string,
  patterns: string[],
  platform: IPlatformAdapter
): string[] {
  if (!patterns || patterns.length === 0) {
    return [];
  }

  const matches = platform.findMatch(rootFolder, patterns);
  return matches;
}

/**
 * Read and parse a manifest file
 * @param manifestPath Path to manifest file
 * @param platform Platform adapter for filesystem operations
 * @returns Parsed manifest object
 */
export async function readManifest(
  manifestPath: string,
  platform: IPlatformAdapter
): Promise<unknown> {
  const content = await platform.readFile(manifestPath);
  return JSON.parse(content);
}

/**
 * Write a manifest object to file
 * @param manifest Manifest object to serialize
 * @param manifestPath Path to write to
 * @param platform Platform adapter for filesystem operations
 */
export async function writeManifest(
  manifest: unknown,
  manifestPath: string,
  platform: IPlatformAdapter
): Promise<void> {
  const content = JSON.stringify(manifest, null, 2);
  await platform.writeFile(manifestPath, content);
}

/**
 * Resolve task manifest paths from extension manifest
 * Issue #188: Honor package path mappings when resolving task manifests
 *
 * @param extensionManifest Parsed extension manifest
 * @param extensionManifestPath Path to the extension manifest file
 * @param _platform Platform adapter for filesystem operations (reserved for future use)
 * @returns Array of task manifest file paths
 */
export function resolveTaskManifestPaths(
  extensionManifest: any,
  extensionManifestPath: string,
  _platform: IPlatformAdapter
): string[] {
  void _platform;
  // Get task contributions from manifest
  const taskContributions = getTaskContributions(extensionManifest);

  if (taskContributions.length === 0) {
    return [];
  }

  const manifestDir = path.dirname(extensionManifestPath);
  const taskPaths: string[] = [];

  for (const contrib of taskContributions) {
    const taskName = contrib.properties?.name;
    if (!taskName) {
      continue;
    }

    // Construct path to task.json
    const taskManifestPath = path.join(manifestDir, taskName, 'task.json');
    taskPaths.push(taskManifestPath);
  }

  return taskPaths;
}

/**
 * Get task contributions from extension manifest
 */
function getTaskContributions(manifest: any): any[] {
  if (!manifest.contributions) {
    return [];
  }

  return manifest.contributions.filter(
    (c: any) => c.type === 'ms.vss-distributed-task.task' && c.properties && c.properties.name
  );
}

/**
 * Update contribution references in manifest when extension ID changes
 * Issue #172: Update internal contribution references when extension ID changes
 *
 * @param manifest Extension manifest to update
 * @param originalExtensionId Original extension ID
 * @param newExtensionId New extension ID
 * @returns Updated manifest
 */
export function updateContributionReferences(
  manifest: any,
  originalExtensionId: string,
  newExtensionId: string
): any {
  if (!manifest || originalExtensionId === newExtensionId) {
    return manifest;
  }

  const updated = JSON.parse(JSON.stringify(manifest)); // Deep clone

  // Update contribution IDs
  if (updated.contributions) {
    updated.contributions = updated.contributions.map((contribution: any) => {
      if (contribution.id && typeof contribution.id === 'string') {
        // Replace extension ID in contribution ID
        contribution.id = contribution.id.replace(
          new RegExp(`^${escapeRegex(originalExtensionId)}\\.`),
          `${newExtensionId}.`
        );
      }
      return contribution;
    });
  }

  // Update contribution targets in contribution points
  if (updated.contributionTypes) {
    updated.contributionTypes = updated.contributionTypes.map((type: any) => {
      if (type.id && typeof type.id === 'string') {
        type.id = type.id.replace(
          new RegExp(`^${escapeRegex(originalExtensionId)}\\.`),
          `${newExtensionId}.`
        );
      }
      return type;
    });
  }

  // Update targets in contributions that reference other contributions
  if (updated.contributions) {
    updated.contributions = updated.contributions.map((contribution: any) => {
      if (contribution.targets && Array.isArray(contribution.targets)) {
        contribution.targets = contribution.targets.map((target: string) => {
          if (typeof target === 'string') {
            return target.replace(
              new RegExp(`^${escapeRegex(originalExtensionId)}\\.`),
              `${newExtensionId}.`
            );
          }
          return target;
        });
      }
      return contribution;
    });
  }

  return updated;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
