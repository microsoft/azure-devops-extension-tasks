import { describe, expect, it, beforeEach, beforeAll, afterAll, jest } from '@jest/globals';
import type { AuthCredentials } from '../auth.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

const getTaskDefinitionsMock = jest.fn<() => Promise<any[]>>();
const getTaskAgentApiMock = jest.fn(async () => ({
  getTaskDefinitions: getTaskDefinitionsMock,
}));
const webApiCtorMock = jest.fn().mockImplementation(() => ({
  getTaskAgentApi: getTaskAgentApiMock,
}));
const getPersonalAccessTokenHandlerMock = jest.fn(() => ({ kind: 'pat-handler' }));

const readManifestMock = jest.fn<() => Promise<any>>();
const resolveTaskManifestPathsMock = jest.fn<() => string[]>();

const vsixReaderCloseMock = jest.fn<() => Promise<void>>();
const vsixReaderGetTasksInfoMock =
  jest.fn<() => Promise<Array<{ name: string; version: string }>>>();
const vsixReaderOpenMock = jest.fn<() => Promise<any>>();

jest.unstable_mockModule('azure-devops-node-api', () => ({
  WebApi: webApiCtorMock,
  getPersonalAccessTokenHandler: getPersonalAccessTokenHandlerMock,
}));

jest.unstable_mockModule('../manifest-utils.js', () => ({
  readManifest: readManifestMock,
  resolveTaskManifestPaths: resolveTaskManifestPathsMock,
}));

jest.unstable_mockModule('../vsix-reader.js', () => ({
  VsixReader: {
    open: vsixReaderOpenMock,
  },
}));

let waitForInstallation: (typeof import('../commands/wait-for-installation.js'))['waitForInstallation'];

describe('waitForInstallation', () => {
  let platform: MockPlatformAdapter;
  let auth: AuthCredentials;

  beforeAll(async () => {
    ({ waitForInstallation } = await import('../commands/wait-for-installation.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    platform = new MockPlatformAdapter();
    auth = {
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'test-token',
    };

    vsixReaderOpenMock.mockResolvedValue({
      getTasksInfo: vsixReaderGetTasksInfoMock,
      close: vsixReaderCloseMock,
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns success when all expected task versions are installed', async () => {
    getTaskDefinitionsMock.mockResolvedValue([
      {
        name: 'PublishExtension',
        id: 'task-id-1',
        version: { major: 6, minor: 0, patch: 0 },
        friendlyName: 'Publish Extension',
      },
    ]);

    const result = await waitForInstallation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
        expectedTasks: [{ name: 'PublishExtension', versions: ['6.0.0'] }],
      },
      auth,
      platform
    );

    expect(result.success).toBe(true);
    expect(result.allTasksAvailable).toBe(true);
    expect(result.accountResults[0].available).toBe(true);
    expect(result.accountResults[0].missingTasks).toEqual([]);
    expect(result.accountResults[0].missingVersions).toEqual([]);
    expect(result.accountResults[0].installedTasks[0].matchesExpected).toBe(true);
    expect(getPersonalAccessTokenHandlerMock).toHaveBeenCalledWith('test-token');
    expect(webApiCtorMock).toHaveBeenCalled();
  });

  it('resolves expected tasks from manifestPath and verifies versions', async () => {
    readManifestMock
      .mockResolvedValueOnce({
        contributes: [{ type: 'ms.vss-distributed-task.task', properties: { name: 'Task1' } }],
      })
      .mockResolvedValueOnce({
        name: 'Task1',
        version: { Major: 1, Minor: 2, Patch: 3 },
      });
    resolveTaskManifestPathsMock.mockReturnValue(['tasks/task1/task.json']);

    getTaskDefinitionsMock.mockResolvedValue([
      {
        name: 'Task1',
        id: 'task-1',
        version: { major: 1, minor: 2, patch: 3 },
        friendlyName: 'Task 1',
      },
    ]);

    const result = await waitForInstallation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
        manifestPath: 'vss-extension.json',
      },
      auth,
      platform
    );

    expect(result.success).toBe(true);
    expect(resolveTaskManifestPathsMock).toHaveBeenCalled();
    expect(readManifestMock).toHaveBeenCalledTimes(2);
  });

  it('resolves expected tasks from vsixPath and closes reader', async () => {
    vsixReaderGetTasksInfoMock.mockResolvedValue([{ name: 'TaskFromVsix', version: '2.1.0' }]);
    getTaskDefinitionsMock.mockResolvedValue([
      {
        name: 'TaskFromVsix',
        id: 'task-vsix',
        version: { major: 2, minor: 1, patch: 0 },
      },
    ]);

    const result = await waitForInstallation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
        vsixPath: 'extension.vsix',
      },
      auth,
      platform
    );

    expect(result.success).toBe(true);
    expect(vsixReaderOpenMock).toHaveBeenCalledWith('extension.vsix');
    expect(vsixReaderCloseMock).toHaveBeenCalled();
  });

  it('returns unavailable when token is missing', async () => {
    const result = await waitForInstallation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
        expectedTasks: [{ name: 'Task1', versions: ['1.0.0'] }],
      },
      {
        authType: 'pat',
        serviceUrl: 'https://marketplace.visualstudio.com',
        token: '',
      },
      platform
    );

    expect(result.success).toBe(false);
    expect(result.accountResults[0].available).toBe(false);
    expect(result.accountResults[0].error).toContain('PAT token is required');
    expect(result.accountResults[0].missingVersions).toContain('Task1@1.0.0');
  });

  it('handles missing versions and timeout result', async () => {
    let now = 1000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

    getTaskDefinitionsMock.mockImplementation(async () => {
      now = 70_000;
      return [
        {
          name: 'Task1',
          id: 'task-1',
          version: { major: 1, minor: 0, patch: 0 },
        },
      ];
    });

    const result = await waitForInstallation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
        expectedTasks: [{ name: 'Task1', versions: ['1.2.0'] }],
        timeoutMinutes: 1,
        pollingIntervalSeconds: 0,
      },
      auth,
      platform
    );

    expect(result.success).toBe(false);
    expect(result.accountResults[0].available).toBe(false);
    expect(result.accountResults[0].missingVersions).toContain('Task1@1.2.0');

    nowSpy.mockRestore();
  });

  it('returns success with discovered tasks when no expected tasks are provided', async () => {
    getTaskDefinitionsMock.mockResolvedValue([
      {
        name: 'DiscoveredTask',
        id: 'task-id-discovered',
        version: { major: 3, minor: 4, patch: 5 },
        friendlyName: 'Discovered Task',
      },
    ]);

    const result = await waitForInstallation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
      },
      auth,
      platform
    );

    expect(result.success).toBe(true);
    expect(result.accountResults[0].available).toBe(true);
    expect(result.accountResults[0].installedTasks).toHaveLength(1);
    expect(result.accountResults[0].installedTasks[0].matchesExpected).toBe(true);
    expect(result.accountResults[0].missingTasks).toEqual([]);
    expect(result.accountResults[0].missingVersions).toEqual([]);
  });

  it('includes last polling error in timeout message', async () => {
    let now = 0;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);

    getTaskDefinitionsMock.mockImplementation(async () => {
      now = 120_000;
      throw new Error('Task API temporarily unavailable');
    });

    const result = await waitForInstallation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
        expectedTasks: [{ name: 'Task1', versions: ['1.0.0'] }],
        timeoutMinutes: 1,
        pollingIntervalSeconds: 0,
      },
      auth,
      platform
    );

    expect(result.success).toBe(false);
    expect(result.accountResults[0].available).toBe(false);
    expect(result.accountResults[0].error).toContain(
      'Last error: Task API temporarily unavailable'
    );

    nowSpy.mockRestore();
  });

  it('falls back when individual task manifest read fails', async () => {
    readManifestMock
      .mockResolvedValueOnce({
        contributes: [{ type: 'ms.vss-distributed-task.task', properties: { name: 'Task1' } }],
      })
      .mockRejectedValueOnce(new Error('task manifest unreadable'));
    resolveTaskManifestPathsMock.mockReturnValue(['tasks/task1/task.json']);

    getTaskDefinitionsMock.mockResolvedValue([
      {
        name: 'TaskFromServer',
        id: 'task-server',
        version: { major: 1, minor: 0, patch: 0 },
      },
    ]);

    const result = await waitForInstallation(
      {
        publisherId: 'pub',
        extensionId: 'ext',
        accounts: ['https://dev.azure.com/org1'],
        manifestPath: 'vss-extension.json',
      },
      auth,
      platform
    );

    expect(result.success).toBe(true);
    expect(platform.warningMessages.some((m) => m.includes('Failed to read task manifest'))).toBe(
      true
    );
  });
});
