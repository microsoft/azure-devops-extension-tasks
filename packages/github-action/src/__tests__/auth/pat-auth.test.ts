import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getPatAuth } from '../../auth/pat-auth.js';
import type { IPlatformAdapter } from '@extension-tasks/core';

describe('GitHub Actions PAT Auth', () => {
  let mockPlatform: jest.Mocked<IPlatformAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlatform = {
      getInput: jest.fn(),
      getBoolInput: jest.fn(),
      getPathInput: jest.fn(),
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
    } as unknown as jest.Mocked<IPlatformAdapter>;
  });

  it('should return correct AuthCredentials structure', async () => {
    const expectedToken = 'github-pat-token-12345';

    const result = await getPatAuth(expectedToken, undefined, mockPlatform);

    expect(result).toEqual({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: expectedToken,
    });
  });

  it('should mask token via platform.setSecret() immediately (security critical)', async () => {
    const secretToken = 'secret-github-pat-67890';

    await getPatAuth(secretToken, undefined, mockPlatform);

    expect(mockPlatform.setSecret).toHaveBeenCalledWith(secretToken);
    expect(mockPlatform.setSecret).toHaveBeenCalledTimes(1);
  });

  it('should throw error for missing token', async () => {
    await expect(getPatAuth('', undefined, mockPlatform)).rejects.toThrow('PAT token is required');
  });

  it('should use authType "pat"', async () => {
    const result = await getPatAuth('test-token', undefined, mockPlatform);

    expect(result.authType).toBe('pat');
  });

  it('should use marketplace URL as serviceUrl', async () => {
    const result = await getPatAuth('test-token', undefined, mockPlatform);

    expect(result.serviceUrl).toBe('https://marketplace.visualstudio.com');
  });

  it('should use custom serviceUrl when provided', async () => {
    const customUrl = 'https://myserver.com/tfs';
    const result = await getPatAuth('test-token', customUrl, mockPlatform);

    expect(result.serviceUrl).toBe(customUrl);
  });

  it('should call setSecret before returning (timing security test)', async () => {
    let setSecretCalled = false;
    const token = 'timing-test-token';

    mockPlatform.setSecret.mockImplementation(() => {
      setSecretCalled = true;
    });

    const result = await getPatAuth(token, undefined, mockPlatform);

    // setSecret should have been called before we got the result
    expect(setSecretCalled).toBe(true);
    expect(result.token).toBe(token);
  });
});
