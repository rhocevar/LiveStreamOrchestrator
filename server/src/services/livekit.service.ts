/**
 * LiveKit Service - Handles all LiveKit API interactions
 * Manages room creation, deletion, and listing with the LiveKit server
 */

import { RoomServiceClient } from 'livekit-server-sdk';
import type { LiveKitRoomOptions } from '../types/livestream.types.js';
import { LiveKitError } from '../utils/errors.js';

class LiveKitService {
  private client: RoomServiceClient;

  constructor() {
    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !apiKey || !apiSecret) {
      throw new Error(
        'LiveKit credentials not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env file'
      );
    }

    this.client = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
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
}

// Export singleton instance
export const livekitService = new LiveKitService();
