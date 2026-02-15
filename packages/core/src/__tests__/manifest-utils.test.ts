import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  resolveManifestPaths,
  readManifest,
  writeManifest,
  resolveTaskManifestPaths,
  updateContributionReferences,
} from '../manifest-utils.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

function normalizePathSlashes(path: string): string {
  return path.replace(/\\/g, '/');
}

describe('manifest-utils', () => {
  let platform: MockPlatformAdapter;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
  });

  describe('resolveManifestPaths', () => {
    it('should find manifests matching patterns', () => {
      platform.setFiles({
        '/root/vss-extension.json': '{}',
        '/root/extension.json': '{}',
        '/root/package.json': '{}',
      });

      const paths = resolveManifestPaths('/root', ['vss-extension.json'], platform);
      expect(paths).toEqual(['/root/vss-extension.json']);
    });

    it('should return empty array for no patterns', () => {
      const paths = resolveManifestPaths('/root', [], platform);
      expect(paths).toEqual([]);
    });

    it('should handle wildcard patterns', () => {
      platform.setFiles({
        '/root/vss-extension.json': '{}',
        '/root/extension.json': '{}',
      });

      const paths = resolveManifestPaths('/root', ['*.json'], platform);
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('readManifest', () => {
    it('should read and parse JSON manifest', async () => {
      const manifest = { name: 'test-extension', version: '1.0.0' };
      platform.setFileContent('/test/manifest.json', JSON.stringify(manifest));

      const result = await readManifest('/test/manifest.json', platform);
      expect(result).toEqual(manifest);
    });

    it('should throw if file does not exist', async () => {
      await expect(readManifest('/nonexistent.json', platform)).rejects.toThrow('ENOENT');
    });

    it('should throw if JSON is invalid', async () => {
      platform.setFileContent('/test/invalid.json', '{invalid json}');

      await expect(readManifest('/test/invalid.json', platform)).rejects.toThrow();
    });
  });

  describe('writeManifest', () => {
    it('should serialize and write manifest', async () => {
      const manifest = { name: 'test-extension', version: '1.0.0' };

      await writeManifest(manifest, '/test/output.json', platform);

      const written = await platform.readFile('/test/output.json');
      expect(JSON.parse(written)).toEqual(manifest);
    });

    it('should format JSON with indentation', async () => {
      const manifest = { name: 'test', version: '1.0.0' };

      await writeManifest(manifest, '/test/output.json', platform);

      const written = await platform.readFile('/test/output.json');
      expect(written).toContain('\n');
      expect(written).toContain('  '); // Indentation
    });
  });

  describe('resolveTaskManifestPaths', () => {
    it('should resolve task paths from extension manifest', () => {
      const manifest = {
        contributions: [
          {
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'PackageTask' },
          },
          {
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'PublishTask' },
          },
        ],
      };

      const paths = resolveTaskManifestPaths(manifest, '/root/vss-extension.json', platform);

      expect(paths.map(normalizePathSlashes)).toEqual([
        '/root/PackageTask/task.json',
        '/root/PublishTask/task.json',
      ]);
    });

    it('should return empty array if no contributions', () => {
      const manifest = {};
      const paths = resolveTaskManifestPaths(manifest, '/root/vss-extension.json', platform);
      expect(paths).toEqual([]);
    });

    it('should ignore non-task contributions', () => {
      const manifest = {
        contributions: [
          {
            type: 'ms.vss-distributed-task.task',
            properties: { name: 'MyTask' },
          },
          {
            type: 'ms.vss-web.hub',
            properties: { name: 'MyHub' },
          },
        ],
      };

      const paths = resolveTaskManifestPaths(manifest, '/root/vss-extension.json', platform);

      expect(paths.map(normalizePathSlashes)).toEqual(['/root/MyTask/task.json']);
    });

    it('should handle contributions without name property', () => {
      const manifest = {
        contributions: [
          {
            type: 'ms.vss-distributed-task.task',
            properties: {},
          },
        ],
      };

      const paths = resolveTaskManifestPaths(manifest, '/root/vss-extension.json', platform);
      expect(paths).toEqual([]);
    });
  });

  describe('updateContributionReferences', () => {
    it('should update contribution IDs', () => {
      const manifest = {
        contributions: [
          { id: 'old-extension.my-contribution', type: 'test' },
          { id: 'old-extension.another', type: 'test' },
        ],
      };

      const updated = updateContributionReferences(manifest, 'old-extension', 'new-extension');

      expect(updated.contributions[0].id).toBe('new-extension.my-contribution');
      expect(updated.contributions[1].id).toBe('new-extension.another');
    });

    it('should update contribution targets', () => {
      const manifest = {
        contributions: [
          {
            id: 'my-contribution',
            targets: ['old-extension.some-target', 'old-extension.another-target'],
          },
        ],
      };

      const updated = updateContributionReferences(manifest, 'old-extension', 'new-extension');

      expect(updated.contributions[0].targets).toEqual([
        'new-extension.some-target',
        'new-extension.another-target',
      ]);
    });

    it('should update contribution type IDs', () => {
      const manifest = {
        contributionTypes: [{ id: 'old-extension.my-type' }, { id: 'old-extension.another-type' }],
      };

      const updated = updateContributionReferences(manifest, 'old-extension', 'new-extension');

      expect(updated.contributionTypes[0].id).toBe('new-extension.my-type');
      expect(updated.contributionTypes[1].id).toBe('new-extension.another-type');
    });

    it('should not modify if IDs are the same', () => {
      const manifest = {
        contributions: [{ id: 'my-extension.contribution', type: 'test' }],
      };

      const updated = updateContributionReferences(manifest, 'my-extension', 'my-extension');

      expect(updated).toEqual(manifest);
    });

    it('should not modify IDs that do not match the pattern', () => {
      const manifest = {
        contributions: [
          { id: 'my-extension.contribution', type: 'test' },
          { id: 'other-extension.contribution', type: 'test' },
        ],
      };

      const updated = updateContributionReferences(manifest, 'my-extension', 'new-extension');

      expect(updated.contributions[0].id).toBe('new-extension.contribution');
      expect(updated.contributions[1].id).toBe('other-extension.contribution');
    });

    it('should handle manifest without contributions', () => {
      const manifest = { name: 'test' };

      const updated = updateContributionReferences(manifest, 'old', 'new');

      expect(updated).toEqual(manifest);
    });

    it('should deep clone the manifest', () => {
      const manifest = {
        contributions: [{ id: 'old-extension.contribution' }],
      };

      const updated = updateContributionReferences(manifest, 'old-extension', 'new-extension');

      // Modifying updated should not affect original
      updated.contributions[0].id = 'modified';
      expect(manifest.contributions[0].id).toBe('old-extension.contribution');
    });
  });
});
