import { AzureRMEndpoint } from 'azure-pipelines-tasks-azure-arm-rest/azure-arm-endpoint.js';
import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';

/**
 * Get Azure RM authentication using workload identity federation (OIDC)
 * Note: This is a simplified implementation. Full OIDC support for marketplace
 * requires additional Azure configuration and token exchange.
 *
 * For now, we get the endpoint and use the token from it.
 * In a real implementation, you'd need to exchange the OIDC token for a marketplace token.
 */
export async function getAzureRmAuth(
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  try {
    const endpoint = new AzureRMEndpoint(connectionName);
    const azureEndpoint = await endpoint.getEndpoint();

    // Get the token from the application token credentials
    const token = await azureEndpoint.applicationTokenCredentials.getToken();

    if (!token) {
      throw new Error('Failed to get access token from Azure RM endpoint');
    }

    // Mask the token immediately to prevent exposure in logs
    platform.setSecret(token);

    // For marketplace operations, use the marketplace URL
    const serviceUrl = 'https://marketplace.visualstudio.com';

    return {
      authType: 'pat',
      serviceUrl,
      token: token,
    };
  } catch (error) {
    throw new Error(
      `Failed to get Azure RM authentication: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
