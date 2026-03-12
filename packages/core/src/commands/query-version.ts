import { cwd } from 'process';
import type { AuthCredentials } from '../auth.js';
import { FilesystemManifestReader } from '../filesystem-manifest-reader.js';
import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import { VsixReader } from '../vsix-reader.js';
import { showExtension } from './show.js';

export type VersionAction = 'None' | 'Major' | 'Minor' | 'Patch';

/** The source that produced the winning version. */
export type VersionSource = 'marketplace' | 'manifest' | 'vsix' | 'literal';

export interface QueryVersionOptions {
  publisherId?: string;
  extensionId?: string;
  /** Action to apply to the marketplace version only. */
  marketplaceVersionAction?: VersionAction;
  /**
   * Ordered list of version sources. Each entry is one of:
   * - `marketplace` – query the marketplace (applies marketplaceVersionAction)
   * - `manifest` – read version from manifest file(s)
   * - `vsix` – read version from a VSIX file
   * - A semver literal (e.g. `1.0.0`)
   * - Anything else is skipped (handles empty strings, unresolved variables)
   *
   * The highest valid semver across all sources wins.
   * Defaults to `['marketplace']` if empty/undefined.
   */
  versionSource?: string[];

  // --- Legacy fields (deprecated, use versionSource instead) ---
  /** @deprecated Use marketplaceVersionAction instead */
  versionAction?: VersionAction;
  /** @deprecated Use versionSource with a literal version instead */
  extensionVersionOverrideVariable?: string;

  /** 'vsix' to read identity from a VSIX file; 'manifest' (default) to read from manifest files. */
  use?: 'manifest' | 'vsix';
  vsixFile?: string;
  manifestGlobs?: string[];
  rootFolder?: string;
}

export interface QueryVersionResult {
  currentVersion: string;
  proposedVersion: string;
  version: string;
  source: VersionSource;
}

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Parse a version string into its numeric parts.
 * Returns undefined if the string is not valid semver (major.minor.patch).
 */
function parseSemver(version: string): [number, number, number] | undefined {
  if (!SEMVER_REGEX.test(version)) {
    return undefined;
  }
  const parts = version.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return undefined;
  }
  return parts as [number, number, number];
}

/**
 * Compare two semver strings. Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) {
    return 0;
  }
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i];
    }
  }
  return 0;
}

function applyVersionAction(version: string, versionAction: VersionAction): string {
  if (versionAction === 'None') {
    return version;
  }

  const parts = parseSemver(version);
  if (!parts) {
    throw new Error(`Version '${version}' is not a valid semantic version (major.minor.patch)`);
  }

  switch (versionAction) {
    case 'Major':
      return `${parts[0] + 1}.0.0`;
    case 'Minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'Patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      return version;
  }
}

/**
 * Resolve publisher/extension identity from manifest or VSIX sources.
 */
async function resolveIdentity(
  options: QueryVersionOptions,
  platform: IPlatformAdapter
): Promise<{ publisherId: string; extensionId: string }> {
  let publisherId = options.publisherId;
  let extensionId = options.extensionId;

  if (!publisherId || !extensionId) {
    if (options.use === 'vsix') {
      if (!options.vsixFile) {
        throw new Error('vsix-file is required when use is "vsix".');
      }
      platform.debug(
        `Publisher ID or Extension ID not specified, reading from VSIX: ${options.vsixFile}.`
      );
      const reader = await VsixReader.open(options.vsixFile);
      try {
        const metadata = await reader.getMetadata();
        if (!publisherId) {
          publisherId = metadata.publisher;
          platform.debug(`Using publisher ID from VSIX: ${publisherId}`);
        }
        if (!extensionId) {
          extensionId = metadata.extensionId;
          platform.debug(`Using extension ID from VSIX: ${extensionId}`);
        }
      } finally {
        await reader.close();
      }
    } else {
      const manifestGlobs =
        options.manifestGlobs && options.manifestGlobs.length > 0
          ? options.manifestGlobs
          : ['vss-extension.json'];
      const rootFolder = options.rootFolder || cwd();

      platform.debug(
        `Publisher ID or Extension ID not specified, reading from manifest (rootFolder: ${rootFolder}, globs: ${manifestGlobs.join(', ')}).`
      );

      const reader = new FilesystemManifestReader({ rootFolder, manifestGlobs, platform });
      try {
        const metadata = await reader.getMetadata();
        if (!publisherId) {
          publisherId = metadata.publisher;
          platform.debug(`Using publisher ID from manifest: ${publisherId}`);
        }
        if (!extensionId) {
          extensionId = metadata.extensionId;
          platform.debug(`Using extension ID from manifest: ${extensionId}`);
        }
      } finally {
        await reader.close();
      }
    }
  }

  if (!publisherId) {
    throw new Error(
      'Publisher ID is required. Provide it explicitly or via manifest-file/vsix-file.'
    );
  }
  if (!extensionId) {
    throw new Error(
      'Extension ID is required. Provide it explicitly or via manifest-file/vsix-file.'
    );
  }

  return { publisherId, extensionId };
}

/**
 * Check whether any version-source entry contains the 'marketplace' keyword.
 */
export function versionSourceNeedsMarketplace(versionSource: string[] | undefined): boolean {
  if (!versionSource || versionSource.length === 0) {
    return true; // defaults to ['marketplace']
  }
  return versionSource.some((s) => s.trim().toLowerCase() === 'marketplace');
}

export async function queryVersion(
  options: QueryVersionOptions,
  auth: AuthCredentials | undefined,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<QueryVersionResult> {
  // Resolve effective marketplaceVersionAction (new field takes precedence over legacy)
  const marketplaceVersionAction =
    options.marketplaceVersionAction ?? options.versionAction ?? 'None';

  // --- Legacy: extensionVersionOverrideVariable support ---
  if (options.extensionVersionOverrideVariable) {
    platform.debug(
      `Override variable '${options.extensionVersionOverrideVariable}' specified, checking for value.`
    );
    const overrideVersion = platform.getVariable(options.extensionVersionOverrideVariable);
    if (overrideVersion) {
      platform.info(
        `Ignoring marketplace version and using supplied override: ${overrideVersion}.`
      );
      platform.setVariable('currentVersion', overrideVersion, false, true);
      platform.setVariable('proposedVersion', overrideVersion, false, true);
      return {
        currentVersion: overrideVersion,
        proposedVersion: overrideVersion,
        version: overrideVersion,
        source: 'literal',
      };
    }
  }

  // Determine effective version sources
  const rawSources =
    options.versionSource && options.versionSource.length > 0
      ? options.versionSource
      : ['marketplace'];

  // Normalize: trim, skip empty
  const sources = rawSources.map((s) => s.trim()).filter((s) => s.length > 0);

  if (sources.length === 0) {
    throw new Error('No version sources specified. Provide at least one entry in version-source.');
  }

  // Collect version candidates
  const candidates: Array<{ version: string; source: VersionSource }> = [];
  let marketplaceVersion: string | undefined;

  for (const entry of sources) {
    const keyword = entry.toLowerCase();

    if (keyword === 'marketplace') {
      // Requires auth
      if (!auth) {
        throw new Error(
          'Authentication is required when "marketplace" is listed in version-source. Provide auth credentials or remove "marketplace" from version-source.'
        );
      }

      const { publisherId, extensionId } = await resolveIdentity(options, platform);

      try {
        const showResult = await showExtension({ publisherId, extensionId }, auth, tfx, platform);

        const version = showResult.metadata.version;
        if (!version) {
          platform.warning('Marketplace returned no version; skipping marketplace source.');
        } else {
          marketplaceVersion = version;
          const incrementedVersion = applyVersionAction(version, marketplaceVersionAction);

          platform.info(`Marketplace version : ${version}`);
          if (incrementedVersion !== version) {
            platform.info(`After ${marketplaceVersionAction}   : ${incrementedVersion}`);
          }

          if (parseSemver(incrementedVersion)) {
            candidates.push({ version: incrementedVersion, source: 'marketplace' });
          } else {
            platform.warning(
              `Marketplace version '${incrementedVersion}' is not valid semver; skipping.`
            );
          }
        }
      } catch (error) {
        // Extension not found (first publish) — skip marketplace source
        const message = error instanceof Error ? error.message : String(error);
        platform.warning(
          `Could not query marketplace version: ${message}. Skipping marketplace source.`
        );
      }
    } else if (keyword === 'manifest') {
      const manifestGlobs =
        options.manifestGlobs && options.manifestGlobs.length > 0
          ? options.manifestGlobs
          : ['vss-extension.json'];
      const rootFolder = options.rootFolder || cwd();

      try {
        const reader = new FilesystemManifestReader({ rootFolder, manifestGlobs, platform });
        try {
          const metadata = await reader.getMetadata();
          if (metadata.version && parseSemver(metadata.version)) {
            platform.info(`Manifest version    : ${metadata.version}`);
            candidates.push({ version: metadata.version, source: 'manifest' });
          } else {
            platform.debug(
              `Manifest version '${metadata.version ?? ''}' is not valid semver; skipping.`
            );
          }
        } finally {
          await reader.close();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        platform.warning(`Could not read manifest version: ${message}. Skipping manifest source.`);
      }
    } else if (keyword === 'vsix') {
      if (!options.vsixFile) {
        platform.warning('vsix-file is required for "vsix" version source; skipping.');
      } else {
        try {
          const reader = await VsixReader.open(options.vsixFile);
          try {
            const metadata = await reader.getMetadata();
            if (metadata.version && parseSemver(metadata.version)) {
              platform.info(`VSIX version        : ${metadata.version}`);
              candidates.push({ version: metadata.version, source: 'vsix' });
            } else {
              platform.debug(
                `VSIX version '${metadata.version ?? ''}' is not valid semver; skipping.`
              );
            }
          } finally {
            await reader.close();
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          platform.warning(`Could not read VSIX version: ${message}. Skipping vsix source.`);
        }
      }
    } else if (parseSemver(entry)) {
      // Valid semver literal
      platform.info(`Literal version     : ${entry}`);
      candidates.push({ version: entry, source: 'literal' });
    } else {
      // Not a recognized keyword and not valid semver — skip silently (debug only)
      platform.debug(`Skipping unrecognized version source: '${entry}'`);
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      'No valid version candidates found from the specified version sources. ' +
        'Ensure at least one source provides a valid semver version (major.minor.patch).'
    );
  }

  // Select highest version
  let winner = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (compareSemver(candidates[i].version, winner.version) > 0) {
      winner = candidates[i];
    }
  }

  platform.info(`Resolved version    : ${winner.version} (from ${winner.source})`);

  // Set outputs
  const currentVersion = marketplaceVersion ?? winner.version;
  platform.setVariable('currentVersion', currentVersion, false, true);
  platform.setVariable('proposedVersion', winner.version, false, true);

  return {
    currentVersion,
    proposedVersion: winner.version,
    version: winner.version,
    source: winner.source,
  };
}
