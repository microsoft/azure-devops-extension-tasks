import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import type { IPlatformAdapter, AuthCredentials } from '@extension-tasks/core';

const getPatAuthMock = jest.fn<() => Promise<AuthCredentials>>();
const getAzureRmAuthMock = jest.fn<() => Promise<AuthCredentials>>();
const getBasicAuthMock = jest.fn<() => Promise<AuthCredentials>>();

jest.unstable_mockModule('../../auth/pat-auth.js', () => ({
  getPatAuth: getPatAuthMock,
}));

jest.unstable_mockModule('../../auth/azurerm-auth.js', () => ({
  getAzureRmAuth: getAzureRmAuthMock,
}));

jest.unstable_mockModule('../../auth/basic-auth.js', () => ({
  getBasicAuth: getBasicAuthMock,
}));

let getAuth: (typeof import('../../auth/index.js'))['getAuth'];

describe('Azure Pipelines getAuth router', () => {
  const platform = {} as IPlatformAdapter;

  beforeAll(async () => {
    ({ getAuth } = await import('../../auth/index.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes VsTeam connections to PAT auth', async () => {
    getPatAuthMock.mockResolvedValue({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'pat-token',
    });

    const result = await getAuth('connectedService:VsTeam', 'MyConn', platform);

    expect(getPatAuthMock).toHaveBeenCalledWith('MyConn', platform);
    expect(result.authType).toBe('pat');
  });

  it('routes AzureRM connections to AzureRM auth', async () => {
    getAzureRmAuthMock.mockResolvedValue({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'aad-token',
    });

    const result = await getAuth('connectedService:AzureRM', 'ArmConn', platform);

    expect(getAzureRmAuthMock).toHaveBeenCalledWith('ArmConn', platform);
    expect(result.token).toBe('aad-token');
  });

  it('routes Generic connections to Basic auth', async () => {
    getBasicAuthMock.mockResolvedValue({
      authType: 'basic',
      serviceUrl: 'https://marketplace.visualstudio.com',
      username: 'user',
      password: 'pass',
    });

    const result = await getAuth('connectedService:Generic', 'GenericConn', platform);

    expect(getBasicAuthMock).toHaveBeenCalledWith('GenericConn', platform);
    expect(result.authType).toBe('basic');
  });

  it('throws on unsupported connection type', async () => {
    await expect(getAuth('unsupported:type' as any, 'BadConn', platform)).rejects.toThrow(
      'Unsupported connection type: unsupported:type'
    );
  });
});
