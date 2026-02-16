/**
 * Utilities for normalizing Azure DevOps organization identifiers.
 */

/**
 * Normalize a single organization identifier.
 *
 * Supports:
 * - Plain organization names: ORG
 * - https://dev.azure.com/ORG
 * - https://ORG.visualstudio.com
 */
export function normalizeOrganizationIdentifier(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error('Organization identifier cannot be empty');
  }

  const maybeUrl = /^https?:\/\//i.test(value);
  if (!maybeUrl) {
    return value;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `Invalid organization URL: ${value}. Supported formats are https://dev.azure.com/ORG and https://ORG.visualstudio.com`
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'dev.azure.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    const org = segments[0];
    if (!org) {
      throw new Error(
        `Invalid organization URL: ${value}. Expected format https://dev.azure.com/ORG`
      );
    }
    return org;
  }

  if (host.endsWith('.visualstudio.com')) {
    const org = parsed.hostname.split('.')[0];
    if (!org) {
      throw new Error(
        `Invalid organization URL: ${value}. Expected format https://ORG.visualstudio.com`
      );
    }
    return org;
  }

  throw new Error(
    `Unsupported organization URL: ${value}. Supported formats are https://dev.azure.com/ORG and https://ORG.visualstudio.com`
  );
}

/**
 * Normalize a list of organization identifiers while preserving order.
 */
export function normalizeOrganizationIdentifiers(values: string[]): string[] {
  return values.map((value) => normalizeOrganizationIdentifier(value));
}

/**
 * Normalize an Azure DevOps account identifier to a service URL.
 *
 * Supports:
 * - Plain organization names: ORG -> https://dev.azure.com/ORG
 * - Full URLs (including Azure DevOps Services and Server): returned as-is
 */
export function normalizeAccountToServiceUrl(input: string): string {
  const value = input.trim();
  if (!value) {
    throw new Error('Account identifier cannot be empty');
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/\s/.test(value) || /[/\\]/.test(value)) {
    throw new Error(
      `Invalid organization name: ${value}. Use a plain organization name like ORG or a full URL like https://dev.azure.com/ORG`
    );
  }

  return `https://dev.azure.com/${value}`;
}

/**
 * Normalize a list of account identifiers to service URLs while preserving order.
 */
export function normalizeAccountsToServiceUrls(values: string[]): string[] {
  return values.map((value) => normalizeAccountToServiceUrl(value));
}
