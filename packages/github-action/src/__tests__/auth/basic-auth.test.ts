import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { getBasicAuth } from '../../auth/basic-auth.js';
import type { IPlatformAdapter } from '@extension-tasks/core';

describe('GitHub Actions Basic Auth', () => {
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

  it('should return correct AuthCredentials with username and password', async () => {
    const expectedUsername = 'testuser';
    const expectedPassword = 'testpassword123';
    const expectedUrl = 'https://marketplace.visualstudio.com';

    const result = await getBasicAuth(expectedUsername, expectedPassword, undefined, mockPlatform);

    expect(result).toEqual({
      authType: 'basic',
      serviceUrl: expectedUrl,
      username: expectedUsername,
      password: expectedPassword,
    });
  });

  it('should mask password via platform.setSecret() immediately (security critical)', async () => {
    const username = 'testuser';
    const secretPassword = 'my-secret-password';

    await getBasicAuth(username, secretPassword, undefined, mockPlatform);

    expect(mockPlatform.setSecret).toHaveBeenCalledWith(secretPassword);
    expect(mockPlatform.setSecret).toHaveBeenCalledTimes(1);
  });

  it('should throw error for missing username', async () => {
    await expect(getBasicAuth('', 'password', undefined, mockPlatform)).rejects.toThrow(
      'Username is required for basic authentication'
    );
  });

  it('should throw error for missing password', async () => {
    await expect(getBasicAuth('username', '', undefined, mockPlatform)).rejects.toThrow(
      'Password is required for basic authentication'
    );
  });

  it('should use authType "basic"', async () => {
    const result = await getBasicAuth('user', 'pass', undefined, mockPlatform);

    expect(result.authType).toBe('basic');
  });

  it('should use default marketplace URL as serviceUrl', async () => {
    const result = await getBasicAuth('user', 'pass', undefined, mockPlatform);

    expect(result.serviceUrl).toBe('https://marketplace.visualstudio.com');
  });

  it('should use custom serviceUrl when provided', async () => {
    const customUrl = 'https://myserver.com/tfs';
    const result = await getBasicAuth('user', 'pass', customUrl, mockPlatform);

    expect(result.serviceUrl).toBe(customUrl);
  });

  it('should call setSecret before returning (timing security test)', async () => {
    let setSecretCalled = false;
    const username = 'testuser';
    const password = 'timing-test-password';

    mockPlatform.setSecret.mockImplementation(() => {
      setSecretCalled = true;
    });

    const result = await getBasicAuth(username, password, undefined, mockPlatform);

    // setSecret should have been called before we got the result
    expect(setSecretCalled).toBe(true);
    expect(result.password).toBe(password);
  });

  it('should handle empty password and still mask it', async () => {
    const username = 'user';
    const password = '';

    const result = await getBasicAuth(username, password, undefined, mockPlatform);

    expect(result.password).toBe('');
    expect(mockPlatform.setSecret).toHaveBeenCalledWith('');
  });
});
