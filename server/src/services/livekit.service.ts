/**
 * LiveKit Service - Handles all LiveKit API interactions
 * Manages room creation, deletion, and listing with the LiveKit server
 */

import { RoomServiceClient, AccessToken, WebhookReceiver } from 'livekit-server-sdk';
import type { LiveKitRoomOptions } from '../types/livestream.types.js';
import { LiveKitError } from '../utils/errors.js';

class LiveKitService {
  private client: RoomServiceClient;
  private livekitUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private webhookReceiver: WebhookReceiver;

  constructor() {
    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
      throw new Error(
        'LiveKit credentials not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env file'
      );
    }

    this.livekitUrl = livekitUrl;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.client = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    this.webhookReceiver = new WebhookReceiver(apiKey, apiSecret);
  }

  /**
   * Create a new room in LiveKit
   * @param options Room creation options
   * @returns Created room information
   */
  async createRoom(options: LiveKitRoomOptions) {
    try {
      const room = await this.client.createRoom({
        name: options.name,
        emptyTimeout: options.emptyTimeout,
        maxParticipants: options.maxParticipants,
      });

      return room;
    } catch (error) {
      if (error instanceof Error) {
        throw new LiveKitError(`Failed to create LiveKit room: ${error.message}`);
      }
      throw new LiveKitError('Failed to create LiveKit room');
    }
  }

  /**
   * List all active rooms in LiveKit
   * @returns Array of active rooms
   */
  async listRooms() {
    try {
      const rooms = await this.client.listRooms();
      return rooms;
    } catch (error) {
      if (error instanceof Error) {
        throw new LiveKitError(`Failed to list LiveKit rooms: ${error.message}`);
      }
      throw new LiveKitError('Failed to list LiveKit rooms');
    }
  }

  /**
   * Delete a room from LiveKit
   * @param roomName Name of the room to delete
   */
  async deleteRoom(roomName: string) {
    try {
      await this.client.deleteRoom(roomName);
    } catch (error) {
      if (error instanceof Error) {
        throw new LiveKitError(`Failed to delete LiveKit room: ${error.message}`);
      }
      throw new LiveKitError('Failed to delete LiveKit room');
    }
  }

  /**
   * Check if a room exists in LiveKit
   * @param roomName Name of the room to check
   * @returns True if room exists, false otherwise
   */
  async roomExists(roomName: string): Promise<boolean> {
    try {
      const rooms = await this.listRooms();
      return rooms.some(room => room.name === roomName);
    } catch (error) {
      // If we can't list rooms, assume the room doesn't exist
      return false;
    }
  }

  /**
   * Generate an access token for a participant to join a room
   * @param options Token generation options
   * @returns JWT token string
   */
  async generateAccessToken(options: {
    roomName: string;
    participantIdentity: string;
    participantName: string;
    role: 'HOST' | 'VIEWER';
    metadata?: string;
  }): Promise<string> {
    try {
      const expirationHours = parseInt(process.env.TOKEN_EXPIRATION_HOURS || '24', 10);
      const token = new AccessToken(this.apiKey, this.apiSecret, {
        identity: options.participantIdentity,
        name: options.participantName,
        metadata: options.metadata,
        ttl: `${expirationHours}h`, // Set expiration as time span string (e.g., "24h")
      });

      // Grant permissions based on role
      if (options.role === 'HOST') {
        // Host can publish audio/video and subscribe to others
        token.addGrant({
          roomJoin: true,
          room: options.roomName,
          canPublish: true,
          canPublishData: true,
          canSubscribe: true,
        });
      } else {
        // Viewer can only subscribe (watch/listen)
        token.addGrant({
          roomJoin: true,
          room: options.roomName,
          canPublish: false,
          canPublishData: false,
          canSubscribe: true,
        });
      }

      return await token.toJwt();
    } catch (error) {
      if (error instanceof Error) {
        throw new LiveKitError(`Failed to generate access token: ${error.message}`);
      }
      throw new LiveKitError('Failed to generate access token');
    }
  }

  /**
   * Verify webhook signature from LiveKit
   * @param body Raw request body
   * @param authHeader Authorization header from the request
   * @returns Webhook event object if valid, null if invalid
   */
  verifyWebhook(body: string, authHeader: string): any {
    try {
      // Verify the webhook signature
      const verified = this.webhookReceiver.receive(body, authHeader);

      // If verification succeeded, parse the body as JSON
      // The receive() method validates the signature but may not return the parsed body
      if (verified !== null && verified !== undefined) {
        // If receive() returned the parsed event, use it
        if (typeof verified === 'object' && Object.keys(verified).length > 0) {
          return verified;
        }
        // Otherwise, parse the body ourselves
        return JSON.parse(body);
      }

      return null;
    } catch (error) {
      console.error('Webhook verification error:', error);
      // Invalid signature or malformed webhook
      return null;
    }
  }

  /**
   * Get LiveKit server URL for client connections
   */
  getLiveKitUrl(): string {
    return this.livekitUrl;
  }
}

// Export singleton instance
export const livekitService = new LiveKitService();
