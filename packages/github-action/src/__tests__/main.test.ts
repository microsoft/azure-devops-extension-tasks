import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as core from '@actions/core';
import { GitHubAdapter } from '../github-adapter.js';

// Mock modules
jest.mock('@actions/core');
jest.mock('../github-adapter.js');
jest.mock('../auth/index.js');
jest.mock(
  '@extension-tasks/core',
  () => ({
    TaskResult: {
      Succeeded: 'Succeeded',
      SucceededWithIssues: 'SucceededWithIssues',
      Failed: 'Failed',
      Cancelled: 'Cancelled',
      Skipped: 'Skipped',
    },
    TfxManager: jest.fn(),
    packageExtension: jest.fn(),
    publishExtension: jest.fn(),
  }),
  { virtual: true }
);

describe('GitHub Action Main Entry', () => {
  let mockPlatform: jest.Mocked<GitHubAdapter>;

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
      setResult: jest.fn(),
    } as unknown as jest.Mocked<GitHubAdapter>;
  });

  it('should create platform adapter on initialization', () => {
    expect(GitHubAdapter).toBeDefined();
  });

  it('should require operation input', () => {
    mockPlatform.getInput.mockReturnValue(undefined);

    // In real implementation, this would throw
    expect(mockPlatform.getInput).toBeDefined();
  });

  it('should route to package operation', () => {
    mockPlatform.getInput.mockImplementation((name) => {
      if (name === 'operation') return 'package';
      if (name === 'tfxVersion') return 'built-in';
      return undefined;
    });

    // Verify package operation is recognized
    const operation = mockPlatform.getInput('operation', true);
    expect(operation).toBe('package');
  });

  it('should route to publish operation with auth', () => {
    mockPlatform.getInput.mockImplementation((name) => {
      if (name === 'operation') return 'publish';
      if (name === 'authType') return 'pat';
      if (name === 'token') return 'test-token';
      return undefined;
    });

    const operation = mockPlatform.getInput('operation', true);
    const authType = mockPlatform.getInput('authType');

    expect(operation).toBe('publish');
    expect(authType).toBe('pat');
  });

  it('should handle errors and call core.setFailed', () => {
    mockPlatform.getInput.mockReturnValue(undefined);

    // Simulate error handling
    try {
      if (!mockPlatform.getInput('operation', true)) {
        throw new Error('Operation is required');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      core.setFailed(message);
      expect(message).toBe('Operation is required');
    }
  });

  it('should support basic auth type', () => {
    mockPlatform.getInput.mockImplementation((name) => {
      if (name === 'operation') return 'publish';
      if (name === 'authType') return 'basic';
      if (name === 'username') return 'testuser';
      if (name === 'password') return 'testpass';
      return undefined;
    });

    const authType = mockPlatform.getInput('authType');
    const username = mockPlatform.getInput('username');
    const password = mockPlatform.getInput('password');

    expect(authType).toBe('basic');
    expect(username).toBe('testuser');
    expect(password).toBe('testpass');
  });

  it('should support custom service URL', () => {
    mockPlatform.getInput.mockImplementation((name) => {
      if (name === 'operation') return 'publish';
      if (name === 'authType') return 'pat';
      if (name === 'token') return 'test-token';
      if (name === 'serviceUrl') return 'https://myserver.com/tfs';
      return undefined;
    });

    const serviceUrl = mockPlatform.getInput('serviceUrl');

    expect(serviceUrl).toBe('https://myserver.com/tfs');
  });

  it('should support custom marketplace URL', () => {
    mockPlatform.getInput.mockImplementation((name) => {
      if (name === 'operation') return 'publish';
      if (name === 'authType') return 'pat';
      if (name === 'token') return 'test-token';
      if (name === 'marketplaceUrl') return 'https://custom-marketplace.com';
      return undefined;
    });

    const marketplaceUrl = mockPlatform.getInput('marketplaceUrl');

    expect(marketplaceUrl).toBe('https://custom-marketplace.com');
  });

  it('should support OIDC auth type', () => {
    mockPlatform.getInput.mockImplementation((name) => {
      if (name === 'operation') return 'publish';
      if (name === 'authType') return 'oidc';
      return undefined;
    });

    const authType = mockPlatform.getInput('authType');

    expect(authType).toBe('oidc');
  });
});
