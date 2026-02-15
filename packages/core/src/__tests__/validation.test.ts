import { jest } from '@jest/globals';
import {
  validateExtensionId,
  validatePublisherId,
  validateAccountUrl,
  validateVersion,
  validateBinaryAvailable,
  validateNodeAvailable,
  validateNpmAvailable,
  validateTfxAvailable,
  validateAzureCliAvailable,
} from '../validation.js';
import { MockPlatformAdapter } from './helpers/mock-platform.js';

describe('validation', () => {
  describe('validateExtensionId', () => {
    it('should accept valid extension IDs', () => {
      expect(() => validateExtensionId('my-extension')).not.toThrow();
      expect(() => validateExtensionId('MyExtension')).not.toThrow();
      expect(() => validateExtensionId('my.extension')).not.toThrow();
      expect(() => validateExtensionId('my_extension')).not.toThrow();
      expect(() => validateExtensionId('extension-1.0')).not.toThrow();
      expect(() => validateExtensionId('a')).not.toThrow();
    });

    it('should reject empty extension ID', () => {
      expect(() => validateExtensionId('')).toThrow(
        'Extension ID is required and must be a string'
      );
    });

    it('should reject non-string extension ID', () => {
      expect(() => validateExtensionId(null as any)).toThrow(
        'Extension ID is required and must be a string'
      );
      expect(() => validateExtensionId(undefined as any)).toThrow(
        'Extension ID is required and must be a string'
      );
      expect(() => validateExtensionId(123 as any)).toThrow(
        'Extension ID is required and must be a string'
      );
    });

    it('should reject extension ID with whitespace', () => {
      expect(() => validateExtensionId(' my-extension')).toThrow(
        'Extension ID cannot have leading or trailing whitespace'
      );
      expect(() => validateExtensionId('my-extension ')).toThrow(
        'Extension ID cannot have leading or trailing whitespace'
      );
    });

    it('should reject extension ID with invalid characters', () => {
      expect(() => validateExtensionId('my extension')).toThrow(
        'Extension ID can only contain letters, numbers'
      );
      expect(() => validateExtensionId('my@extension')).toThrow(
        'Extension ID can only contain letters, numbers'
      );
      expect(() => validateExtensionId('my/extension')).toThrow(
        'Extension ID can only contain letters, numbers'
      );
    });

    it('should reject extension ID that is too long', () => {
      const longId = 'a'.repeat(201);
      expect(() => validateExtensionId(longId)).toThrow(
        'Extension ID cannot exceed 200 characters'
      );
    });
  });

  describe('validatePublisherId', () => {
    it('should accept valid publisher IDs', () => {
      expect(() => validatePublisherId('my-publisher')).not.toThrow();
      expect(() => validatePublisherId('MyPublisher')).not.toThrow();
      expect(() => validatePublisherId('my.publisher')).not.toThrow();
      expect(() => validatePublisherId('my_publisher')).not.toThrow();
    });

    it('should reject empty publisher ID', () => {
      expect(() => validatePublisherId('')).toThrow(
        'Publisher ID is required and must be a string'
      );
    });

    it('should reject publisher ID with invalid characters', () => {
      expect(() => validatePublisherId('my publisher')).toThrow(
        'Publisher ID can only contain letters, numbers'
      );
      expect(() => validatePublisherId('my#publisher')).toThrow(
        'Publisher ID can only contain letters, numbers'
      );
    });

    it('should reject publisher ID that is too long', () => {
      const longId = 'a'.repeat(201);
      expect(() => validatePublisherId(longId)).toThrow(
        'Publisher ID cannot exceed 200 characters'
      );
    });
  });

  describe('validateAccountUrl', () => {
    it('should accept valid Azure DevOps URLs', () => {
      expect(() => validateAccountUrl('https://dev.azure.com/myorg')).not.toThrow();
      expect(() => validateAccountUrl('https://myorg.visualstudio.com')).not.toThrow();
      expect(() => validateAccountUrl('https://marketplace.visualstudio.com')).not.toThrow();
    });

    it('should reject empty URL', () => {
      expect(() => validateAccountUrl('')).toThrow('Account URL is required and must be a string');
    });

    it('should reject non-string URL', () => {
      expect(() => validateAccountUrl(null as any)).toThrow(
        'Account URL is required and must be a string'
      );
    });

    it('should reject invalid URL format', () => {
      expect(() => validateAccountUrl('not-a-url')).toThrow('Account URL must be a valid URL');
      expect(() => validateAccountUrl('ftp://dev.azure.com')).toThrow(
        'Account URL must use HTTPS protocol'
      );
    });

    it('should reject non-HTTPS URLs', () => {
      expect(() => validateAccountUrl('http://dev.azure.com/myorg')).toThrow(
        'Account URL must use HTTPS protocol'
      );
    });

    it('should reject non-Azure DevOps domains', () => {
      expect(() => validateAccountUrl('https://github.com/myorg')).toThrow(
        'Account URL must be an Azure DevOps URL'
      );
      expect(() => validateAccountUrl('https://google.com')).toThrow(
        'Account URL must be an Azure DevOps URL'
      );
    });
  });

  describe('validateVersion', () => {
    it('should accept valid version strings', () => {
      expect(() => validateVersion('1.0.0')).not.toThrow();
      expect(() => validateVersion('1.0')).not.toThrow();
      expect(() => validateVersion('1.0.0.0')).not.toThrow();
      expect(() => validateVersion('0.1.2')).not.toThrow();
      expect(() => validateVersion('123.456.789')).not.toThrow();
    });

    it('should reject empty version', () => {
      expect(() => validateVersion('')).toThrow('Version is required and must be a string');
    });

    it('should reject non-string version', () => {
      expect(() => validateVersion(null as any)).toThrow(
        'Version is required and must be a string'
      );
    });

    it('should reject version with invalid format', () => {
      expect(() => validateVersion('v1.0.0')).toThrow('Version must follow semantic versioning');
      expect(() => validateVersion('1.0.0-beta')).toThrow(
        'Version must follow semantic versioning'
      );
      expect(() => validateVersion('1.a.0')).toThrow('Version must follow semantic versioning');
    });

    it('should reject version with out-of-range numbers', () => {
      expect(() => validateVersion('1.1000000.0')).toThrow(
        'Version numbers must be between 0 and 999999'
      );
      expect(() => validateVersion('-1.0.0')).toThrow('Version must follow semantic versioning');
    });
  });

  describe('validateBinaryAvailable', () => {
    it('should succeed when binary is available', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/node');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);

      await expect(validateBinaryAvailable('node', platform)).resolves.not.toThrow();
      expect(platform.which).toHaveBeenCalledWith('node', true);
    });

    it('should log version in debug mode when available', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/node');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);
      const debugSpy = jest.spyOn(platform, 'debug');

      await validateBinaryAvailable('node', platform, true);

      expect(debugSpy).toHaveBeenCalledWith('Checking for required binary: node');
      expect(debugSpy).toHaveBeenCalledWith('Found node at: /usr/bin/node');
      expect(debugSpy).toHaveBeenCalledWith('node version: available');
    });

    it('should not log version when logVersion is false', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/node');
      const execSpy = jest.spyOn(platform, 'exec');

      await validateBinaryAvailable('node', platform, false);

      expect(execSpy).not.toHaveBeenCalled();
    });

    it('should handle version check failure gracefully', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/custom-tool');
      jest.spyOn(platform, 'exec').mockRejectedValue(new Error('exec failed'));
      const debugSpy = jest.spyOn(platform, 'debug');

      await validateBinaryAvailable('custom-tool', platform, true);

      expect(debugSpy).toHaveBeenCalledWith('custom-tool version: Unable to determine');
    });

    it('should fail when binary is not available', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockRejectedValue(new Error('not found'));

      await expect(validateBinaryAvailable('missing-binary', platform)).rejects.toThrow(
        "Required binary 'missing-binary' is not available"
      );
    });

    it('should reject invalid binary name', async () => {
      const platform = new MockPlatformAdapter();

      await expect(validateBinaryAvailable('', platform)).rejects.toThrow(
        'Binary name is required and must be a string'
      );

      await expect(validateBinaryAvailable(null as any, platform)).rejects.toThrow(
        'Binary name is required and must be a string'
      );
    });
  });

  describe('validateNodeAvailable', () => {
    it('should validate node availability', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/node');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);

      await expect(validateNodeAvailable(platform)).resolves.not.toThrow();
      expect(platform.which).toHaveBeenCalledWith('node', true);
    });

    it('should log node version in debug mode', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/node');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);
      const debugSpy = jest.spyOn(platform, 'debug');

      await validateNodeAvailable(platform, true);

      expect(debugSpy).toHaveBeenCalledWith('node version: available');
    });
  });

  describe('validateNpmAvailable', () => {
    it('should validate npm availability', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/npm');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);

      await expect(validateNpmAvailable(platform)).resolves.not.toThrow();
      expect(platform.which).toHaveBeenCalledWith('npm', true);
    });

    it('should log npm version in debug mode', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/npm');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);
      const debugSpy = jest.spyOn(platform, 'debug');

      await validateNpmAvailable(platform, true);

      expect(debugSpy).toHaveBeenCalledWith('npm version: available');
    });
  });

  describe('validateTfxAvailable', () => {
    it('should validate tfx availability', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/tfx');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);

      await expect(validateTfxAvailable(platform)).resolves.not.toThrow();
      expect(platform.which).toHaveBeenCalledWith('tfx', true);
    });

    it('should log tfx version in debug mode', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/tfx');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);
      const debugSpy = jest.spyOn(platform, 'debug');

      await validateTfxAvailable(platform, true);

      expect(debugSpy).toHaveBeenCalledWith('tfx version: available');
    });
  });

  describe('validateAzureCliAvailable', () => {
    it('should validate Azure CLI availability', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/az');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);

      await expect(validateAzureCliAvailable(platform)).resolves.not.toThrow();
      expect(platform.which).toHaveBeenCalledWith('az', true);
    });

    it('should log Azure CLI version in debug mode', async () => {
      const platform = new MockPlatformAdapter();
      jest.spyOn(platform, 'which').mockResolvedValue('/usr/bin/az');
      jest.spyOn(platform, 'exec').mockResolvedValue(0);
      const debugSpy = jest.spyOn(platform, 'debug');

      await validateAzureCliAvailable(platform, true);

      expect(debugSpy).toHaveBeenCalledWith('az version: available');
    });
  });
});
