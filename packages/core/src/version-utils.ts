/**
 * Version utilities for parsing and manipulating extension versions
 */

export interface Version {
  major: number;
  minor: number;
  patch: number;
  revision?: number;
}

/**
 * Parse a version string into components
 * Supports formats: ##.##.## or ##.##.##.##
 */
export function parseVersion(str: string): Version {
  const match = str.match(/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid version format: ${str}`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    revision: match[4] ? parseInt(match[4], 10) : undefined,
  };
}

/**
 * Increment a version by type
 */
export function incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
  const v = parseVersion(version);

  switch (type) {
    case 'major':
      v.major += 1;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor += 1;
      v.patch = 0;
      break;
    case 'patch':
      v.patch += 1;
      break;
  }

  return v.revision !== undefined
    ? `${v.major}.${v.minor}.${v.patch}.${v.revision}`
    : `${v.major}.${v.minor}.${v.patch}`;
}

/**
 * Format a version object as a string
 */
export function formatVersion(version: Version): string {
  return version.revision !== undefined
    ? `${version.major}.${version.minor}.${version.patch}.${version.revision}`
    : `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Update task version in a task manifest
 * This will be used to patch task.json files with new versions
 */
export function updateTaskVersion(
  manifest: any,
  extensionVersion: string,
  versionType: 'major' | 'minor' | 'patch'
): any {
  void extensionVersion;
  void versionType;
  // Implementation will be added in Phase 2
  // For now, return unchanged manifest
  return manifest;
}

/**
 * Generate a deterministic task ID using UUID v5
 * Based on publisher, extension ID, and task name
 */
export function generateTaskId(
  publisher: string,
  extensionId: string,
  taskName: string
): string {
  void publisher;
  void extensionId;
  void taskName;
  // Implementation will be added in Phase 2
  // For now, return a placeholder
  return 'placeholder-task-id';
}
