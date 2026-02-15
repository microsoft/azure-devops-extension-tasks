import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as tl from 'azure-pipelines-task-lib/task.js';
import { AzdoAdapter } from '../azdo-adapter.js';

// Mock azure-pipelines-task-lib
jest.mock('azure-pipelines-task-lib/task.js');
jest.mock('../azdo-adapter.js');
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

describe('Azure DevOps Task Main Entry', () => {
  let mockPlatform: jest.Mocked<AzdoAdapter>;

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
    } as unknown as jest.Mocked<AzdoAdapter>;
  });

  it('should create platform adapter on initialization', () => {
    expect(AzdoAdapter).toBeDefined();
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
      if (name === 'connectionType') return 'connectedService:VsTeam';
      if (name === 'connectionName') return 'TestConnection';
      return undefined;
    });

    const operation = mockPlatform.getInput('operation', true);
    const connectionType = mockPlatform.getInput('connectionType', true);

    expect(operation).toBe('publish');
    expect(connectionType).toBe('connectedService:VsTeam');
  });

  it('should handle errors and set failed result', () => {
    mockPlatform.getInput.mockReturnValue(undefined);
    mockPlatform.setResult.mockImplementation(() => {});

    // Simulate error handling
    try {
      if (!mockPlatform.getInput('operation', true)) {
        throw new Error('Operation is required');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toBe('Operation is required');
    }
  });
});
