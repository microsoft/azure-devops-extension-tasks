import { cwd } from 'process';
import { FilesystemManifestReader } from './filesystem-manifest-reader.js';
import type { IPlatformAdapter } from './platform.js';
import { VsixReader } from './vsix-reader.js';

export interface ExtensionIdentityOptions {
  publisherId?: string;
  extensionId?: string;
  vsixPath?: string;
  rootFolder?: string;
  manifestGlobs?: string[];
}

export async function resolveExtensionIdentity(
  options: ExtensionIdentityOptions,
  platform: IPlatformAdapter,
  operationName: string
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

  if (
    (!publisherId || !extensionId) &&
    options.manifestGlobs !== undefined &&
    options.manifestGlobs.length > 0
  ) {
    const rootFolder = options.rootFolder ?? cwd();
    platform.debug(
      `Reading extension identity from manifest (rootFolder: ${rootFolder}, globs: ${options.manifestGlobs.join(', ')}).`
    );

    const reader = new FilesystemManifestReader({
      rootFolder,
      manifestGlobs: options.manifestGlobs,
      platform,
    });
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
      `publisherId and extensionId are required for ${operationName}. Provide them directly, or provide vsixPath/manifestGlobs so they can be inferred from VSIX or manifest metadata.`
    );
  }

  return { publisherId, extensionId };
}
