/**
 * Input validation functions for extension tasks
 */

import type { IPlatformAdapter } from './platform.js';

/**
 * Validates an extension ID
 * @param id Extension ID to validate
 * @throws Error if invalid
 */
export function validateExtensionId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw new Error('Extension ID is required and must be a string');
  }

  if (id.trim() !== id) {
    throw new Error('Extension ID cannot have leading or trailing whitespace');
  }

  if (id.length === 0) {
    throw new Error('Extension ID cannot be empty');
  }

  if (id.length > 200) {
    throw new Error('Extension ID cannot exceed 200 characters');
  }

  // Azure DevOps extension IDs can contain letters, numbers, dots, underscores, and hyphens
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(id)) {
    throw new Error(
      'Extension ID can only contain letters, numbers, dots (.), underscores (_), and hyphens (-)'
    );
  }
}

/**
 * Validates a publisher ID
 * @param id Publisher ID to validate
 * @throws Error if invalid
 */
export function validatePublisherId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw new Error('Publisher ID is required and must be a string');
  }

  if (id.trim() !== id) {
    throw new Error('Publisher ID cannot have leading or trailing whitespace');
  }

  if (id.length === 0) {
    throw new Error('Publisher ID cannot be empty');
  }

  if (id.length > 200) {
    throw new Error('Publisher ID cannot exceed 200 characters');
  }

  // Publisher IDs have same constraints as extension IDs
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(id)) {
    throw new Error(
      'Publisher ID can only contain letters, numbers, dots (.), underscores (_), and hyphens (-)'
    );
  }
}

/**
 * Validates an Azure DevOps account URL
 * @param url Account URL to validate
 * @throws Error if invalid
 */
export function validateAccountUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new Error('Account URL is required and must be a string');
  }

  if (url.trim() !== url) {
    throw new Error('Account URL cannot have leading or trailing whitespace');
  }

  if (url.length === 0) {
    throw new Error('Account URL cannot be empty');
  }

  // Basic URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Account URL must be a valid URL');
  }

  // Must use HTTPS
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Account URL must use HTTPS protocol');
  }

  // Check for Azure DevOps domains
  const validDomains = ['dev.azure.com', 'visualstudio.com', 'azure.com'];

  const hostname = parsedUrl.hostname.toLowerCase();
  const isValidDomain = validDomains.some(
    (domain) => hostname === domain || hostname.endsWith('.' + domain)
  );

  if (!isValidDomain) {
    throw new Error(
      'Account URL must be an Azure DevOps URL (dev.azure.com, *.visualstudio.com, or *.azure.com)'
    );
  }
}

/**
 * Validates a version string
 * @param version Version string to validate
 * @throws Error if invalid
 */
export function validateVersion(version: string): void {
  if (!version || typeof version !== 'string') {
    throw new Error('Version is required and must be a string');
  }

  if (version.trim() !== version) {
    throw new Error('Version cannot have leading or trailing whitespace');
  }

  if (version.length === 0) {
    throw new Error('Version cannot be empty');
  }

  // Semantic versioning pattern (simplified)
  // Supports: 1.0.0, 1.0.0.0, 1.0, etc.
  const semverPattern = /^\d+(\.\d+){0,3}$/;

  if (!semverPattern.test(version)) {
    throw new Error('Version must follow semantic versioning (e.g., 1.0.0, 1.0.0.0)');
  }

  // Validate each part is within valid range
  const parts = version.split('.');
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 999999) {
      throw new Error('Version numbers must be between 0 and 999999');
    }
  }
}

/**
 * Gets the version of a binary by executing it with --version
 * @param binary Binary name
 * @param platform Platform adapter for executing commands
 * @returns Version string or null if unable to determine
 */
async function getBinaryVersion(
  binary: string,
  platform: IPlatformAdapter
): Promise<string | null> {
  try {
    // Different binaries use different flags for version info
    const versionArgs: { [key: string]: string[] } = {
      node: ['--version'],
      npm: ['--version'],
      az: ['--version'],
      tfx: ['version', '--no-prompt', '--no-color'], // tfx version command with clean output
    };

    const args = versionArgs[binary] || ['--version'];

    // Execute binary to check if it's available
    const exitCode = await platform.exec(binary, args, {
      silent: true,
      ignoreReturnCode: true,
    } as any);

    // If exec succeeds, binary is available
    if (exitCode === 0) {
      return 'available';
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validates that a required binary is available
 * @param binary Binary name to check (e.g., 'az', 'tfx', 'npm', 'node')
 * @param platform Platform adapter for executing commands
 * @param logVersion If true, logs the version in debug mode (default: true)
 * @throws Error if binary is not available
 */
export async function validateBinaryAvailable(
  binary: string,
  platform: IPlatformAdapter,
  logVersion: boolean = true
): Promise<void> {
  if (!binary || typeof binary !== 'string') {
    throw new Error('Binary name is required and must be a string');
  }

  platform.debug(`Checking for required binary: ${binary}`);

  try {
    const binaryPath = await platform.which(binary, true);
    platform.debug(`Found ${binary} at: ${binaryPath}`);

    // Log version in debug mode
    if (logVersion) {
      const version = await getBinaryVersion(binary, platform);
      if (version) {
        platform.debug(`${binary} version: ${version}`);
      } else {
        platform.debug(`${binary} version: Unable to determine`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Required binary '${binary}' is not available. ` +
        `Please ensure ${binary} is installed and in your PATH. ` +
        `Error: ${errorMessage}`
    );
  }
}

/**
 * Validates that Node.js is available and logs version in debug mode
 * @param platform Platform adapter for executing commands
 * @param logVersion If true, logs the version in debug mode (default: true)
 * @throws Error if Node.js is not available
 */
export async function validateNodeAvailable(
  platform: IPlatformAdapter,
  logVersion: boolean = true
): Promise<void> {
  await validateBinaryAvailable('node', platform, logVersion);
}

/**
 * Validates that npm is available and logs version in debug mode
 * @param platform Platform adapter for executing commands
 * @param logVersion If true, logs the version in debug mode (default: true)
 * @throws Error if npm is not available
 */
export async function validateNpmAvailable(
  platform: IPlatformAdapter,
  logVersion: boolean = true
): Promise<void> {
  await validateBinaryAvailable('npm', platform, logVersion);
}

/**
 * Validates that tfx is available (for path mode) and logs version in debug mode
 * @param platform Platform adapter for executing commands
 * @param logVersion If true, logs the version in debug mode (default: true)
 * @throws Error if tfx is not available
 */
export async function validateTfxAvailable(
  platform: IPlatformAdapter,
  logVersion: boolean = true
): Promise<void> {
  await validateBinaryAvailable('tfx', platform, logVersion);
}

/**
 * Validates that Azure CLI is available (for OIDC authentication) and logs version in debug mode
 * @param platform Platform adapter for executing commands
 * @param logVersion If true, logs the version in debug mode (default: true)
 * @throws Error if Azure CLI is not available
 */
export async function validateAzureCliAvailable(
  platform: IPlatformAdapter,
  logVersion: boolean = true
): Promise<void> {
  await validateBinaryAvailable('az', platform, logVersion);
}
