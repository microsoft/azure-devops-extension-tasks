import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import type { IPlatformAdapter } from '@extension-tasks/core';

const taskLibMock = {
  getEndpointAuthorization: jest.fn(),
};

jest.unstable_mockModule('azure-pipelines-task-lib/task.js', () => taskLibMock);

let getPatAuth: (
  connectionName: string,
  platform: IPlatformAdapter
) => Promise<{ authType: string; serviceUrl: string; token?: string }>;

describe('Azure Pipelines PAT Auth', () => {
  let mockPlatform: jest.Mocked<IPlatformAdapter>;

  beforeAll(async () => {
    ({ getPatAuth } = await import('../../auth/pat-auth.js'));
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

  it('returns PAT credentials and masks token', async () => {
    taskLibMock.getEndpointAuthorization.mockReturnValue({ parameters: { apitoken: 'token' } });

    const result = await getPatAuth('MyConnection', mockPlatform);

    expect(taskLibMock.getEndpointAuthorization).toHaveBeenCalledWith('MyConnection', false);
    expect(result).toEqual({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'token',
    });
    expect(mockPlatform.setSecret).toHaveBeenCalledWith('token');
  });

  it('falls back to password parameter when apitoken is missing', async () => {
    taskLibMock.getEndpointAuthorization.mockReturnValue({ parameters: { password: 'pwd-token' } });

    const result = await getPatAuth('MyConnection', mockPlatform);

    expect(result.token).toBe('pwd-token');
    expect(mockPlatform.setSecret).toHaveBeenCalledWith('pwd-token');
  });

  it('throws when service connection is not found', async () => {
    taskLibMock.getEndpointAuthorization.mockReturnValue(undefined);

    await expect(getPatAuth('MissingConnection', mockPlatform)).rejects.toThrow(
      "Service connection 'MissingConnection' not found"
    );
  });

  it('throws when PAT is missing', async () => {
    taskLibMock.getEndpointAuthorization.mockReturnValue({ parameters: {} });

    await expect(getPatAuth('MyConnection', mockPlatform)).rejects.toThrow(
      "PAT not found in service connection 'MyConnection'"
    );
  });
});
