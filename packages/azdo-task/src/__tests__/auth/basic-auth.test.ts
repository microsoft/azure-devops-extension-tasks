import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import type { IPlatformAdapter } from '@extension-tasks/core';

const taskLibMock = {
  getEndpointAuthorization: jest.fn(),
};

jest.unstable_mockModule('azure-pipelines-task-lib/task.js', () => taskLibMock);

let getBasicAuth: (
  connectionName: string,
  platform: IPlatformAdapter
) => Promise<{ authType: string; serviceUrl: string; username?: string; password?: string }>;

describe('Azure Pipelines Basic Auth', () => {
  let mockPlatform: jest.Mocked<IPlatformAdapter>;

  beforeAll(async () => {
    ({ getBasicAuth } = await import('../../auth/basic-auth.js'));
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

  it('returns basic credentials and masks password', async () => {
    taskLibMock.getEndpointAuthorization.mockReturnValue({
      parameters: { username: 'user', password: 'secret' },
    });

    const result = await getBasicAuth('MyConnection', mockPlatform);

    expect(taskLibMock.getEndpointAuthorization).toHaveBeenCalledWith('MyConnection', false);
    expect(result).toEqual({
      authType: 'basic',
      serviceUrl: 'https://marketplace.visualstudio.com',
      username: 'user',
      password: 'secret',
    });
    expect(mockPlatform.setSecret).toHaveBeenCalledWith('secret');
  });

  it('throws when service connection is not found', async () => {
    taskLibMock.getEndpointAuthorization.mockReturnValue(undefined);

    await expect(getBasicAuth('MissingConnection', mockPlatform)).rejects.toThrow(
      "Service connection 'MissingConnection' not found"
    );
  });

  it('throws when username or password is missing', async () => {
    taskLibMock.getEndpointAuthorization.mockReturnValue({ parameters: { username: 'user' } });

    await expect(getBasicAuth('MyConnection', mockPlatform)).rejects.toThrow(
      "Username or password not found in service connection 'MyConnection'"
    );
  });
});
