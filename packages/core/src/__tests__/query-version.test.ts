import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuthCredentials } from '../auth.js';
import { queryVersion, versionSourceNeedsMarketplace } from '../commands/query-version.js';
import { TfxManager } from '../tfx-manager.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('queryVersion', () => {
  let platform: MockPlatformAdapter;
  let tfxManager: TfxManager;
  let auth: AuthCredentials;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
    platform.registerTool('tfx', '/usr/bin/tfx');
    tfxManager = new TfxManager({ tfxVersion: 'built-in', platform });
    auth = {
      authType: 'pat',
      serviceUrl: 'https://marketplace.visualstudio.com',
      token: 'test-token',
    };
  });

  describe('marketplace source with marketplaceVersionAction', () => {
    it('returns marketplace version when action is None', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          marketplaceVersionAction: 'None',
          versionSource: ['marketplace'],
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.version).toBe('1.2.3');
      expect(result.source).toBe('marketplace');
    });

    it('increments major version', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          marketplaceVersionAction: 'Major',
          versionSource: ['marketplace'],
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.version).toBe('2.0.0');
    });

    it('increments minor version', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          marketplaceVersionAction: 'Minor',
          versionSource: ['marketplace'],
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.version).toBe('1.3.0');
    });

    it('increments patch version', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          marketplaceVersionAction: 'Patch',
          versionSource: ['marketplace'],
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.version).toBe('1.2.4');
    });

    it('sets currentVersion and proposedVersion outputs', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
        stdout: '',
        stderr: '',
      });

      await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          marketplaceVersionAction: 'Patch',
          versionSource: ['marketplace'],
        },
        auth,
        tfxManager,
        platform
      );

      const outputs = platform.getOutputs();
      expect(outputs.get('currentVersion')).toBe('1.2.3');
      expect(outputs.get('proposedVersion')).toBe('1.2.4');
    });

    it('skips marketplace when version is not valid semver and no fallback exists', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: 'invalid' },
        stdout: '',
        stderr: '',
      });

      await expect(
        queryVersion(
          {
            publisherId: 'pub',
            extensionId: 'ext',
            marketplaceVersionAction: 'Major',
            versionSource: ['marketplace'],
          },
          auth,
          tfxManager,
          platform
        )
      ).rejects.toThrow('No valid version candidates found');
    });
  });

  describe('legacy support', () => {
    it('uses override variable when provided (legacy extensionVersionOverrideVariable)', async () => {
      const executeSpy = jest.spyOn(tfxManager, 'execute');
      platform.setVariableValue('OVERRIDE_VERSION', '9.9.9');

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          extensionVersionOverrideVariable: 'OVERRIDE_VERSION',
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.version).toBe('9.9.9');
      expect(result.source).toBe('literal');
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('sets currentVersion and proposedVersion outputs when override variable is used', async () => {
      platform.setVariableValue('OVERRIDE_VERSION', '9.9.9');

      await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          extensionVersionOverrideVariable: 'OVERRIDE_VERSION',
        },
        auth,
        tfxManager,
        platform
      );

      const outputs = platform.getOutputs();
      expect(outputs.get('currentVersion')).toBe('9.9.9');
      expect(outputs.get('proposedVersion')).toBe('9.9.9');
    });

    it('supports legacy versionAction field', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '1.2.3' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          versionAction: 'Patch',
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.version).toBe('1.2.4');
      expect(result.source).toBe('marketplace');
    });
  });

  describe('defaults to marketplace when no versionSource specified', () => {
    it('queries marketplace by default', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '1.0.0' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.version).toBe('1.0.0');
      expect(result.source).toBe('marketplace');
    });
  });

  describe('literal version source', () => {
    it('uses a semver literal as version', async () => {
      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          versionSource: ['3.0.0'],
        },
        undefined,
        tfxManager,
        platform
      );

      expect(result.version).toBe('3.0.0');
      expect(result.source).toBe('literal');
    });

    it('skips non-semver strings silently', async () => {
      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          versionSource: ['$(UNRESOLVED_VARIABLE)', '', '2.0.0'],
        },
        undefined,
        tfxManager,
        platform
      );

      expect(result.version).toBe('2.0.0');
      expect(result.source).toBe('literal');
    });
  });

  describe('highest wins resolution', () => {
    it('picks the highest version across sources', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '2.5.7' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          marketplaceVersionAction: 'Patch',
          versionSource: ['3.1.0', 'marketplace'],
        },
        auth,
        tfxManager,
        platform
      );

      // 3.1.0 (literal) > 2.5.8 (marketplace+Patch) → literal wins
      expect(result.version).toBe('3.1.0');
      expect(result.source).toBe('literal');
    });

    it('marketplace wins when its version is higher', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '5.0.0' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          marketplaceVersionAction: 'Patch',
          versionSource: ['2.0.0', 'marketplace'],
        },
        auth,
        tfxManager,
        platform
      );

      // 5.0.1 (marketplace+Patch) > 2.0.0 (literal) → marketplace wins
      expect(result.version).toBe('5.0.1');
      expect(result.source).toBe('marketplace');
    });

    it('currentVersion reflects marketplace version when marketplace is queried', async () => {
      jest.spyOn(tfxManager, 'execute').mockResolvedValue({
        exitCode: 0,
        json: { extensionId: 'ext', publisher: 'pub', version: '2.5.7' },
        stdout: '',
        stderr: '',
      });

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          marketplaceVersionAction: 'Patch',
          versionSource: ['3.1.0', 'marketplace'],
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.currentVersion).toBe('2.5.7');
      expect(result.proposedVersion).toBe('3.1.0');
    });
  });

  describe('auth requirements', () => {
    it('does not require auth when marketplace is not in versionSource', async () => {
      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          versionSource: ['1.0.0'],
        },
        undefined,
        tfxManager,
        platform
      );

      expect(result.version).toBe('1.0.0');
    });

    it('throws when marketplace is in versionSource but auth is undefined', async () => {
      await expect(
        queryVersion(
          {
            publisherId: 'pub',
            extensionId: 'ext',
            versionSource: ['marketplace'],
          },
          undefined,
          tfxManager,
          platform
        )
      ).rejects.toThrow(
        'Authentication is required when "marketplace" is listed in version-source'
      );
    });
  });

  describe('marketplace failure handling', () => {
    it('skips marketplace when extension not found and uses fallback', async () => {
      jest.spyOn(tfxManager, 'execute').mockRejectedValue(new Error('Extension not found'));

      const result = await queryVersion(
        {
          publisherId: 'pub',
          extensionId: 'ext',
          versionSource: ['marketplace', '1.0.0'],
        },
        auth,
        tfxManager,
        platform
      );

      expect(result.version).toBe('1.0.0');
      expect(result.source).toBe('literal');
    });

    it('throws when marketplace fails and no fallback available', async () => {
      jest.spyOn(tfxManager, 'execute').mockRejectedValue(new Error('Extension not found'));

      await expect(
        queryVersion(
          {
            publisherId: 'pub',
            extensionId: 'ext',
            versionSource: ['marketplace'],
          },
          auth,
          tfxManager,
          platform
        )
      ).rejects.toThrow('No valid version candidates found');
    });
  });

  describe('versionSourceNeedsMarketplace', () => {
    it('returns true when versionSource is undefined', () => {
      expect(versionSourceNeedsMarketplace(undefined)).toBe(true);
    });

    it('returns true when versionSource is empty', () => {
      expect(versionSourceNeedsMarketplace([])).toBe(true);
    });

    it('returns true when marketplace is in the list', () => {
      expect(versionSourceNeedsMarketplace(['marketplace', '1.0.0'])).toBe(true);
    });

    it('returns false when marketplace is not in the list', () => {
      expect(versionSourceNeedsMarketplace(['1.0.0', 'manifest'])).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(versionSourceNeedsMarketplace(['Marketplace'])).toBe(true);
      expect(versionSourceNeedsMarketplace(['MARKETPLACE'])).toBe(true);
    });
  });
});
