import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';

/**
 * Get PAT authentication from GitHub Actions input
 */
export async function getPatAuth(
  token: string,
  serviceUrl: string | undefined,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  if (!token) {
    throw new Error('PAT token is required');
  }

  // Mask the secret immediately to prevent exposure in logs
  platform.setSecret(token);

  // Use provided service URL or default to marketplace
  const finalServiceUrl = serviceUrl || 'https://marketplace.visualstudio.com';

  return {
    authType: 'pat',
    serviceUrl: finalServiceUrl,
    token,
  };
}
