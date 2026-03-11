import { cwd } from 'process';
import type { AuthCredentials } from '../auth.js';
import { FilesystemManifestReader } from '../filesystem-manifest-reader.js';
import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import { VsixReader } from '../vsix-reader.js';
import { showExtension } from './show.js';

export type VersionAction = 'None' | 'Major' | 'Minor' | 'Patch';

export interface QueryVersionOptions {
  publisherId?: string;
  extensionId?: string;
  versionAction?: VersionAction;
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
  source: 'override' | 'marketplace';
}

function applyVersionAction(version: string, versionAction: VersionAction): string {
  if (versionAction === 'None') {
    return version;
  }

  const versionParts = version.split('.').map((part) => Number.parseInt(part, 10));
  if (
    versionParts.length !== 3 ||
    Number.isNaN(versionParts[0]) ||
    Number.isNaN(versionParts[1]) ||
    Number.isNaN(versionParts[2])
  ) {
    throw new Error(`Version '${version}' is not a valid semantic version (major.minor.patch)`);
  }

  switch (versionAction) {
    case 'Major':
      return `${versionParts[0] + 1}.0.0`;
    case 'Minor':
      return `${versionParts[0]}.${versionParts[1] + 1}.0`;
    case 'Patch':
      return `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
    default:
      return version;
  }
}

export async function queryVersion(
  options: QueryVersionOptions,
  auth: AuthCredentials,
  tfx: TfxManager,
  platform: IPlatformAdapter
): Promise<QueryVersionResult> {
  const versionAction = options.versionAction ?? 'None';

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
        source: 'override',
      };
    }
  }

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

  const showResult = await showExtension(
    {
      publisherId,
      extensionId,
    },
    auth,
    tfx,
    platform
  );

  const marketplaceVersion = showResult.metadata.version;
  if (!marketplaceVersion) {
    throw new Error('Could not determine extension version from marketplace response');
  }

  platform.info(`Latest version   : ${marketplaceVersion}.`);
  platform.info(`Requested action : ${versionAction}.`);

  const updatedVersion = applyVersionAction(marketplaceVersion, versionAction);
  if (updatedVersion !== marketplaceVersion) {
    platform.info(`Updated to       : ${updatedVersion}.`);
  }

  platform.setVariable('currentVersion', marketplaceVersion, false, true);
  platform.setVariable('proposedVersion', updatedVersion, false, true);

  return {
    currentVersion: marketplaceVersion,
    proposedVersion: updatedVersion,
    version: updatedVersion,
    source: 'marketplace',
  };
}
