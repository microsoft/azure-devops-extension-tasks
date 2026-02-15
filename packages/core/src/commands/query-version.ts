import type { IPlatformAdapter } from '../platform.js';
import type { TfxManager } from '../tfx-manager.js';
import type { AuthCredentials } from '../auth.js';
import { showExtension } from './show.js';

export type VersionAction = 'None' | 'Major' | 'Minor' | 'Patch';

export interface QueryVersionOptions {
  publisherId: string;
  extensionId: string;
  extensionTag?: string;
  versionAction?: VersionAction;
  extensionVersionOverrideVariable?: string;
  outputVariable?: string;
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
    platform.debug(`Override variable '${options.extensionVersionOverrideVariable}' specified, checking for value.`);
    const overrideVersion = platform.getVariable(options.extensionVersionOverrideVariable);
    if (overrideVersion) {
      platform.info(`Ignoring marketplace version and using supplied override: ${overrideVersion}.`);
      platform.setVariable('Extension.Version', overrideVersion, false, false);
      platform.setVariable('Extension.Version', overrideVersion, false, true);
      if (options.outputVariable) {
        platform.setVariable(options.outputVariable, overrideVersion, false, true);
      }
      return {
        currentVersion: overrideVersion,
        proposedVersion: overrideVersion,
        version: overrideVersion,
        source: 'override',
      };
    }
  }

  const showResult = await showExtension(
    {
      publisherId: options.publisherId,
      extensionId: options.extensionId,
      extensionTag: options.extensionTag,
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

  platform.setVariable('Extension.Version', updatedVersion, false, false);
  platform.setVariable('Extension.Version', updatedVersion, false, true);
  if (options.outputVariable) {
    platform.setVariable(options.outputVariable, updatedVersion, false, true);
  }

  return {
    currentVersion: marketplaceVersion,
    proposedVersion: updatedVersion,
    version: updatedVersion,
    source: 'marketplace',
  };
}
