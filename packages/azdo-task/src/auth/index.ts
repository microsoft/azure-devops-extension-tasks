import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';
import { getPatAuth } from './pat-auth.js';
import { getBasicAuth } from './basic-auth.js';
import { getAzureRmAuth } from './azurerm-auth.js';

export type ConnectionType =
  | 'connectedService:VsTeam'
  | 'connectedService:AzureRM'
  | 'connectedService:Generic';

/**
 * Get authentication credentials based on connection type
 */
export async function getAuth(
  connectionType: ConnectionType,
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  switch (connectionType) {
    case 'connectedService:VsTeam':
      return getPatAuth(connectionName, platform);

    case 'connectedService:AzureRM':
      return getAzureRmAuth(connectionName, platform);

    case 'connectedService:Generic':
      return getBasicAuth(connectionName, platform);

    default:
      throw new Error(`Unsupported connection type: ${connectionType}`);
  }
}

export { getPatAuth, getBasicAuth, getAzureRmAuth };
