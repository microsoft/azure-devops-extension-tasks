import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import type { AuthCredentials, IPlatformAdapter } from '@extension-tasks/core';

const coreMock = {
  info: jest.fn<(message: string) => void>(),
  setSecret: jest.fn<(value: string) => void>(),
};

const execMock = {
  exec: jest.fn(),
};

jest.unstable_mockModule('@actions/core', () => coreMock);
jest.unstable_mockModule('@actions/exec', () => execMock);

let getOidcAuth: (
  serviceUrl: string | undefined,
  platform: IPlatformAdapter
) => Promise<AuthCredentials>;

describe('GitHub OIDC Auth', () => {
  let mockPlatform: jest.Mocked<IPlatformAdapter>;

  beforeAll(async () => {
    ({ getOidcAuth } = await import('../../auth/oidc-auth.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlatform = {
      getInput: jest.fn(),
      getBoolInput: jest.fn(),
      getDelimitedInput: jest.fn(),
      setSecret: jest.fn(),
      setVariable: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      exec: jest.fn(),
      which: jest.fn(),
      getVariable: jest.fn(),
      setOutput: jest.fn(),
      findMatch: jest.fn(),
      fileExists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      mkdirP: jest.fn(),
      rmRF: jest.fn(),
      getTempDir: jest.fn(),
      cacheDir: jest.fn(),
      findCachedTool: jest.fn(),
      downloadTool: jest.fn(),
      setResult: jest.fn(),
    } as unknown as jest.Mocked<IPlatformAdapter>;
  });

  it('returns expected credentials when Azure CLI succeeds', async () => {
    const expectedToken = 'test-token';

    execMock.exec.mockImplementation(async (_command: string, _args: string[], options: any) => {
      options.listeners.stdout(Buffer.from(JSON.stringify({ accessToken: expectedToken })));
      return 0;
    });

    const result = await getOidcAuth(undefined, mockPlatform);

    expect(result).toEqual({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: expectedToken,
    });
    expect(coreMock.setSecret).toHaveBeenCalledWith(expectedToken);
    expect(mockPlatform.setSecret).toHaveBeenCalledWith(expectedToken);
  });

  it('uses custom resource when serviceUrl is provided', async () => {
    execMock.exec.mockImplementation(async (_command: string, _args: string[], options: any) => {
      options.listeners.stdout(Buffer.from(JSON.stringify({ accessToken: 'token' })));
      return 0;
    });

    await getOidcAuth('https://custom.resource.com', mockPlatform);

    expect(execMock.exec).toHaveBeenCalledWith(
      'az',
      [
        'account',
        'get-access-token',
        '--resource',
        'https://custom.resource.com',
        '--output',
        'json',
      ],
      expect.objectContaining({ silent: true })
    );
  });

  it('throws when Azure CLI returns non-zero exit code', async () => {
    execMock.exec.mockImplementation(async (_command: string, _args: string[], options: any) => {
      options.listeners.stderr(Buffer.from('Azure CLI error'));
      return 1;
    });

    await expect(getOidcAuth(undefined, mockPlatform)).rejects.toThrow(
      'Azure CLI exited with code 1'
    );
  });

  it('throws when response is missing accessToken', async () => {
    execMock.exec.mockImplementation(async (_command: string, _args: string[], options: any) => {
      options.listeners.stdout(Buffer.from(JSON.stringify({ foo: 'bar' })));
      return 0;
    });

    await expect(getOidcAuth(undefined, mockPlatform)).rejects.toThrow(
      'No accessToken in Azure CLI response'
    );
  });

  it('logs start and success messages', async () => {
    execMock.exec.mockImplementation(async (_command: string, _args: string[], options: any) => {
      options.listeners.stdout(Buffer.from(JSON.stringify({ accessToken: 'token' })));
      return 0;
    });

    await getOidcAuth(undefined, mockPlatform);

    expect(coreMock.info).toHaveBeenCalledWith(
      'Getting Azure AD token via Azure CLI (requires azure/login action)...'
    );
    expect(coreMock.info).toHaveBeenCalledWith(
      'Successfully obtained Azure AD token via Azure CLI'
    );
  });
});
