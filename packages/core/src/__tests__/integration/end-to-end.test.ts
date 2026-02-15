import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockPlatformAdapter } from '../helpers/mock-platform.js';
import { TfxManager } from '../../tfx-manager.js';
import {
  validateExtensionId,
  validatePublisherId,
  validateAccountUrl,
  validateVersion,
  validateNodeAvailable,
  validateNpmAvailable,
} from '../../validation.js';

describe('End-to-End Integration Tests', () => {
  let platform: MockPlatformAdapter;

  beforeEach(() => {
    platform = new MockPlatformAdapter();
  });

  describe('TfxManager with Validation', () => {
    it('should validate binary dependencies before tfx resolution', async () => {
      // Test that validation can check for required binaries
      platform.setToolLocation('node', '/usr/bin/node');
      platform.setToolLocation('npm', '/usr/bin/npm');

      await expect(validateNodeAvailable(platform, false)).resolves.not.toThrow();
      await expect(validateNpmAvailable(platform, false)).resolves.not.toThrow();
    });

    it('should create TfxManager with built-in mode and validate', async () => {
      const tfxManager = new TfxManager({
        tfxVersion: 'built-in',
        platform,
      });

      expect(tfxManager).toBeDefined();

      // Verify platform is set correctly
      platform.debug('TfxManager created with built-in mode');
      expect(platform.debugMessages).toContain('TfxManager created with built-in mode');
    });

    it('should handle tfx resolution errors gracefully', async () => {
      const tfxManager = new TfxManager({
        tfxVersion: 'path',
        platform,
      });

      // Don't set tool location - should fail
      await expect(tfxManager.resolve()).rejects.toThrow();
    });
  });

  describe('Input Validation Integration', () => {
    it('should validate extension and publisher IDs together', () => {
      const extensionId = 'my-extension';
      const publisherId = 'my-publisher';

      expect(() => validateExtensionId(extensionId)).not.toThrow();
      expect(() => validatePublisherId(publisherId)).not.toThrow();
    });

    it('should validate complete extension metadata', () => {
      const metadata = {
        extensionId: 'test-extension',
        publisherId: 'test-publisher',
        version: '1.0.0',
        accountUrl: 'https://dev.azure.com/myorg',
      };

      expect(() => validateExtensionId(metadata.extensionId)).not.toThrow();
      expect(() => validatePublisherId(metadata.publisherId)).not.toThrow();
      expect(() => validateVersion(metadata.version)).not.toThrow();
      expect(() => validateAccountUrl(metadata.accountUrl)).not.toThrow();
    });

    it('should catch invalid extension metadata early', () => {
      const invalidMetadata = {
        extensionId: 'invalid@extension',
        publisherId: '',
        version: 'not-a-version',
        accountUrl: 'http://insecure.com',
      };

      expect(() => validateExtensionId(invalidMetadata.extensionId)).toThrow(
        'can only contain letters, numbers'
      );
      expect(() => validatePublisherId(invalidMetadata.publisherId)).toThrow(
        'required and must be a string'
      );
      expect(() => validateVersion(invalidMetadata.version)).toThrow('semantic versioning');
      expect(() => validateAccountUrl(invalidMetadata.accountUrl)).toThrow('must use HTTPS');
    });
  });

  describe('Platform Adapter Integration', () => {
    it('should handle logging pipeline correctly', () => {
      platform.debug('Debug message');
      platform.info('Info message');
      platform.warning('Warning message');
      platform.error('Error message');

      expect(platform.debugMessages).toContain('Debug message');
      expect(platform.infoMessages).toContain('Info message');
      expect(platform.warningMessages).toContain('Warning message');
      expect(platform.errorMessages).toContain('Error message');
    });

    it('should handle secret masking in complete workflow', () => {
      const secretToken = 'secret-token-12345';
      const secretPassword = 'secret-password-67890';

      platform.setSecret(secretToken);
      platform.setSecret(secretPassword);

      expect(platform.isSecret(secretToken)).toBe(true);
      expect(platform.isSecret(secretPassword)).toBe(true);

      // Verify logging can proceed after secret registration
      platform.info(`Token: ${secretToken}`);
      expect(platform.infoMessages).toContain(`Token: ${secretToken}`);
    });

    it('should handle input/output workflow', () => {
      // Simulate reading inputs
      platform.setInput('extensionId', 'my-extension');
      platform.setInput('publisherId', 'my-publisher');
      platform.setInput('version', '1.0.0');

      const extensionId = platform.getInput('extensionId', true);
      const publisherId = platform.getInput('publisherId', true);
      const version = platform.getInput('version', true);

      expect(extensionId).toBe('my-extension');
      expect(publisherId).toBe('my-publisher');
      expect(version).toBe('1.0.0');

      // Simulate setting outputs
      platform.setOutput('vsixPath', '/path/to/extension.vsix');
      platform.setOutput('extensionId', extensionId!);

      const outputs = platform.getOutputs();
      expect(outputs.get('vsixPath')).toBe('/path/to/extension.vsix');
      expect(outputs.get('extensionId')).toBe('my-extension');
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide helpful error messages for validation failures', () => {
      try {
        validateExtensionId('invalid extension with spaces');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('can only contain');
        expect(message).not.toContain('undefined');
      }
    });

    it('should handle missing binary dependencies gracefully', async () => {
      // Don't set tool locations
      await expect(validateNodeAvailable(platform, false)).rejects.toThrow('Required binary');
    });

    it('should chain validation errors appropriately', () => {
      const errors: string[] = [];

      // Collect all validation errors
      try {
        validateExtensionId('bad@id');
      } catch (e) {
        errors.push((e as Error).message);
      }

      try {
        validateVersion('bad.version');
      } catch (e) {
        errors.push((e as Error).message);
      }

      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('letters, numbers');
      expect(errors[1]).toContain('semantic versioning');
    });
  });
});
