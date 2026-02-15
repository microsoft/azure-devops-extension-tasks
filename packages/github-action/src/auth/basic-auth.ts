import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';

/**
 * Get basic authentication from GitHub Actions inputs
 */
export async function getBasicAuth(
  username: string,
  password: string,
  serviceUrl: string | undefined,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  if (!username) {
    throw new Error('Username is required for basic authentication');
  }
  
  if (password === undefined || password === null) {
    throw new Error('Password is required for basic authentication');
  }

  // Mask the password immediately to prevent exposure in logs
  // Note: username is typically not sensitive, but password definitely is
  // We mask even empty passwords for consistency
  platform.setSecret(password);

  // Use provided service URL or default to marketplace
  const finalServiceUrl = serviceUrl || 'https://marketplace.visualstudio.com';

  return {
    authType: 'basic',
    serviceUrl: finalServiceUrl,
    username,
    password,
  };
}
