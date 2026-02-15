import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { IPlatformAdapter } from '@extension-tasks/core';

const mockAzureRmEndpointCtor = jest.fn();

jest.unstable_mockModule('azure-pipelines-tasks-azure-arm-rest/azure-arm-endpoint.js', () => ({
  AzureRMEndpoint: mockAzureRmEndpointCtor,
}));

let getAzureRmAuth: typeof import('../../auth/azurerm-auth.js').getAzureRmAuth;

beforeEach(async () => {
  if (!getAzureRmAuth) {
    ({ getAzureRmAuth } = await import('../../auth/azurerm-auth.js'));
  }
});

describe('Azure RM Auth', () => {
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
    const connectionName = 'TestAzureRM';
    const expectedToken = 'azure-ad-token-12345';

    const mockEndpointInstance = {
      getEndpoint: async () => ({
        applicationTokenCredentials: {
          getToken: async () => expectedToken,
        },
      }),
    };

    mockAzureRmEndpointCtor.mockImplementation(() => mockEndpointInstance as never);

    const result = await getAzureRmAuth(connectionName, mockPlatform);

    expect(result).toEqual({
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: expectedToken,
    });
  });

  it('should mask token immediately after retrieval', async () => {
    const connectionName = 'TestAzureRM';
    const expectedToken = 'azure-ad-token-67890';

    const mockEndpointInstance = {
      getEndpoint: async () => ({
        applicationTokenCredentials: {
          getToken: async () => expectedToken,
        },
      }),
    };

    mockAzureRmEndpointCtor.mockImplementation(() => mockEndpointInstance as never);

    await getAzureRmAuth(connectionName, mockPlatform);

    expect(mockPlatform.setSecret).toHaveBeenCalledWith(expectedToken);
  });

  it('should call platform.setSecret before returning', async () => {
    const connectionName = 'TestAzureRM';
    const expectedToken = 'secret-token';
    const setSecretCalls: string[] = [];

    const mockEndpointInstance = {
      getEndpoint: async () => ({
        applicationTokenCredentials: {
          getToken: async () => expectedToken,
        },
      }),
    };

    mockAzureRmEndpointCtor.mockImplementation(() => mockEndpointInstance as never);

    mockPlatform.setSecret.mockImplementation((secret: string) => {
      setSecretCalls.push(secret);
    });

    const result = await getAzureRmAuth(connectionName, mockPlatform);

    expect(setSecretCalls.length).toBe(1);
    expect(setSecretCalls[0]).toBe(expectedToken);
    expect(result.token).toBe(expectedToken);
  });

  it('should create AzureRMEndpoint with correct connection name', async () => {
    const connectionName = 'MyAzureConnection';
    const expectedToken = 'test-token';

    const mockEndpointInstance = {
      getEndpoint: async () => ({
        applicationTokenCredentials: {
          getToken: async () => expectedToken,
        },
      }),
    };

    mockAzureRmEndpointCtor.mockImplementation(() => mockEndpointInstance as never);

    await getAzureRmAuth(connectionName, mockPlatform);

    expect(mockAzureRmEndpointCtor).toHaveBeenCalledWith(connectionName);
  });

  it('should throw error when token is null or undefined', async () => {
    const connectionName = 'TestAzureRM';

    const mockEndpointInstance = {
      getEndpoint: async () => ({
        applicationTokenCredentials: {
          getToken: async () => null,
        },
      }),
    };

    mockAzureRmEndpointCtor.mockImplementation(() => mockEndpointInstance as never);

    await expect(getAzureRmAuth(connectionName, mockPlatform)).rejects.toThrow(
      'Failed to get Azure RM authentication: Failed to get access token from Azure RM endpoint'
    );
  });

  it('should throw error when endpoint fails', async () => {
    const connectionName = 'TestAzureRM';

    const mockEndpointInstance = {
      getEndpoint: async () => {
        throw new Error('Endpoint error');
      },
    };

    mockAzureRmEndpointCtor.mockImplementation(() => mockEndpointInstance as never);

    await expect(getAzureRmAuth(connectionName, mockPlatform)).rejects.toThrow(
      'Failed to get Azure RM authentication: Endpoint error'
    );
  });

  it('should throw error when getToken fails', async () => {
    const connectionName = 'TestAzureRM';

    const mockEndpointInstance = {
      getEndpoint: async () => ({
        applicationTokenCredentials: {
          getToken: async () => {
            throw new Error('Token retrieval failed');
          },
        },
      }),
    };

    mockAzureRmEndpointCtor.mockImplementation(() => mockEndpointInstance as never);

    await expect(getAzureRmAuth(connectionName, mockPlatform)).rejects.toThrow(
      'Failed to get Azure RM authentication: Token retrieval failed'
    );
  });

  it('should use marketplace.visualstudio.com as service URL', async () => {
    const connectionName = 'TestAzureRM';
    const expectedToken = 'test-token';

    const mockEndpointInstance = {
      getEndpoint: async () => ({
        applicationTokenCredentials: {
          getToken: async () => expectedToken,
        },
      }),
    };

    mockAzureRmEndpointCtor.mockImplementation(() => mockEndpointInstance as never);

    const result = await getAzureRmAuth(connectionName, mockPlatform);

    expect(result.serviceUrl).toBe('https://marketplace.visualstudio.com');
    expect(result.authType).toBe('pat');
  });
});
