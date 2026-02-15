import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import type { IPlatformAdapter, AuthCredentials } from '@extension-tasks/core';

const getPatAuthMock = jest.fn<
  (token: string, serviceUrl: string | undefined, platform: IPlatformAdapter) => Promise<AuthCredentials>
>();
const getBasicAuthMock = jest.fn<
  (
    username: string,
    password: string,
    serviceUrl: string | undefined,
    platform: IPlatformAdapter
  ) => Promise<AuthCredentials>
>();
const getOidcAuthMock = jest.fn<
  (serviceUrl: string | undefined, platform: IPlatformAdapter) => Promise<AuthCredentials>
>();

jest.unstable_mockModule('../../auth/pat-auth.js', () => ({
  getPatAuth: getPatAuthMock,
}));

jest.unstable_mockModule('../../auth/basic-auth.js', () => ({
  getBasicAuth: getBasicAuthMock,
}));

jest.unstable_mockModule('../../auth/oidc-auth.js', () => ({
  getOidcAuth: getOidcAuthMock,
}));

let getAuth: (typeof import('../../auth/index.js'))['getAuth'];

describe('GitHub Action getAuth router', () => {
  const platform = {} as IPlatformAdapter;

  beforeAll(async () => {
    ({ getAuth } = await import('../../auth/index.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes PAT auth and prefers serviceUrl', async () => {
    getPatAuthMock.mockResolvedValue({
      authType: 'pat',
      serviceUrl: 'https://custom.marketplace',
      token: 'pat-token',
    });

    const result = await getAuth('pat', platform, {
      token: 'pat-token',
      serviceUrl: 'https://custom.marketplace',
      marketplaceUrl: 'https://fallback.marketplace',
    });

    expect(getPatAuthMock).toHaveBeenCalledWith(
      'pat-token',
      'https://custom.marketplace',
      platform
    );
    expect(result.serviceUrl).toBe('https://custom.marketplace');
  });

  it('routes basic auth and uses marketplaceUrl fallback', async () => {
    getBasicAuthMock.mockResolvedValue({
      authType: 'basic',
      serviceUrl: 'https://fallback.marketplace',
      username: 'user',
      password: 'pass',
    });

    const result = await getAuth('basic', platform, {
      username: 'user',
      password: 'pass',
      marketplaceUrl: 'https://fallback.marketplace',
    });

    expect(getBasicAuthMock).toHaveBeenCalledWith(
      'user',
      'pass',
      'https://fallback.marketplace',
      platform
    );
    expect(result.authType).toBe('basic');
  });

  it('throws when PAT token is missing', async () => {
    await expect(getAuth('pat', platform, {})).rejects.toThrow(
      'Token is required for PAT authentication'
    );
  });

  it('throws when basic credentials are missing', async () => {
    await expect(getAuth('basic', platform, { username: 'user' })).rejects.toThrow(
      'Username and password are required for basic authentication'
    );
  });

  it('routes oidc auth', async () => {
    getOidcAuthMock.mockResolvedValue({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'oidc-token',
    });

    const result = await getAuth('oidc', platform, {
      marketplaceUrl: 'https://marketplace.visualstudio.com',
    });

    expect(getOidcAuthMock).toHaveBeenCalledWith('https://marketplace.visualstudio.com', platform);
    expect(result.token).toBe('oidc-token');
  });

  it('throws on unsupported auth type', async () => {
    await expect(getAuth('unsupported' as any, platform, {})).rejects.toThrow(
      'Unsupported auth type: unsupported'
    );
  });
});
