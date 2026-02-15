import * as tl from 'azure-pipelines-task-lib/task.js';
import { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';

/**
 * Get basic authentication from service connection
 */
export async function getBasicAuth(
  connectionName: string,
  platform: IPlatformAdapter
): Promise<AuthCredentials> {
  const endpoint = tl.getEndpointAuthorization(connectionName, false);
  if (!endpoint) {
    throw new Error(`Service connection '${connectionName}' not found`);
  }

  const username = endpoint.parameters['username'];
  const password = endpoint.parameters['password'];

  if (!username || !password) {
    throw new Error(`Username or password not found in service connection '${connectionName}'`);
  }

  // Mask the password immediately to prevent exposure in logs
  // Note: username is typically not sensitive, but password definitely is
  platform.setSecret(password);

  // For marketplace operations, use the marketplace URL
  const serviceUrl = 'https://marketplace.visualstudio.com';

  return {
    authType: 'basic',
    serviceUrl,
    username,
    password,
  };
}
