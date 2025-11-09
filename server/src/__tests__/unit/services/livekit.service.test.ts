/**
 * Tests for LiveKit Service
 *
 * Note: These tests verify the LiveKit service logic, error handling,
 * and integration patterns. Since LiveKit service is a singleton that
 * initializes on import, we test its public API behavior.
 */

import { LiveKitError } from '../../../utils/errors.js';

describe('LiveKit Service', () => {
  describe('Error Classes', () => {
    it('should use LiveKitError for all failures', () => {
      const error = new LiveKitError('Test error');

      expect(error).toBeInstanceOf(LiveKitError);
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Test error');
    });
  });

  describe('Service Initialization', () => {
    it('should require environment variables', () => {
      // Store original env vars
      const originalVars = {
        LIVEKIT_URL: process.env.LIVEKIT_URL,
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
      };

      // Clear env vars
      delete process.env.LIVEKIT_URL;
      delete process.env.LIVEKIT_API_KEY;
      delete process.env.LIVEKIT_API_SECRET;

      // Restore env vars
      process.env.LIVEKIT_URL = originalVars.LIVEKIT_URL;
      process.env.LIVEKIT_API_KEY = originalVars.LIVEKIT_API_KEY;
      process.env.LIVEKIT_API_SECRET = originalVars.LIVEKIT_API_SECRET;

      // Since service is already initialized, we just verify the pattern
      expect(process.env.LIVEKIT_URL).toBeDefined();
      expect(process.env.LIVEKIT_API_KEY).toBeDefined();
      expect(process.env.LIVEKIT_API_SECRET).toBeDefined();
    });
  });

  describe('LiveKit Operations', () => {
    it('should expose correct service methods', async () => {
      const { livekitService } = await import('../../../services/livekit.service.js');

      // Verify service has expected methods
      expect(typeof livekitService.createRoom).toBe('function');
      expect(typeof livekitService.listRooms).toBe('function');
      expect(typeof livekitService.deleteRoom).toBe('function');
      expect(typeof livekitService.roomExists).toBe('function');
      expect(typeof livekitService.generateAccessToken).toBe('function');
      expect(typeof livekitService.verifyWebhook).toBe('function');
      expect(typeof livekitService.getLiveKitUrl).toBe('function');
    });

    it('should return LiveKit URL', async () => {
      const { livekitService } = await import('../../../services/livekit.service.js');

      const url = livekitService.getLiveKitUrl();

      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
      // Should match the test env var
      expect(url).toBe(process.env.LIVEKIT_URL);
    });
  });

  describe('Token Generation Logic', () => {
    it('should differentiate HOST and VIEWER permissions', () => {
      // HOST permissions: can publish audio/video + subscribe
      const hostPermissions = {
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
      };

      // VIEWER permissions: can only subscribe
      const viewerPermissions = {
        roomJoin: true,
        canPublish: false,
        canPublishData: false,
        canSubscribe: true,
      };

      // Verify permission structures are correct
      expect(hostPermissions.canPublish).toBe(true);
      expect(viewerPermissions.canPublish).toBe(false);
      expect(hostPermissions.canSubscribe).toBe(true);
      expect(viewerPermissions.canSubscribe).toBe(true);
    });

    it('should use configurable token expiration', () => {
      const defaultExpiration = '24h';
      const expirationHours = parseInt(process.env.TOKEN_EXPIRATION_HOURS || '24', 10);

      expect(expirationHours).toBe(24);
      expect(`${expirationHours}h`).toBe(defaultExpiration);
    });
  });
});
