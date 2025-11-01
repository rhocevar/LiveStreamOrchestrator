/**
 * Livestream Service - Orchestration layer
 * Coordinates between LiveKit and Database services to manage livestream lifecycle
 */

import { databaseService } from './database.service.js';
import { livekitService } from './livekit.service.js';
import type {
  CreateLivestreamRequest,
  LivestreamResponse,
  Livestream
} from '../types/livestream.types.js';
import { ValidationError, ConflictError, AuthorizationError } from '../utils/errors.js';

class LivestreamService {
  /**
   * Create a new livestream
   * 1. Validate input
   * 2. Create database record
   * 3. Create LiveKit room
   * 4. Update database with LIVE status
   */
  async createLivestream(data: CreateLivestreamRequest): Promise<LivestreamResponse> {
    // Validate input
    this.validateCreateRequest(data);

    // Sanitize room name (LiveKit compatible: alphanumeric, hyphens, underscores)
    const sanitizedRoomName = this.sanitizeRoomName(data.roomName);

    // Check if livestream with this room name already exists
    const existingLivestream = await databaseService.getLivestreamByRoomName(
      sanitizedRoomName
    );

    if (existingLivestream) {
      throw new ConflictError(`Livestream with room name "${sanitizedRoomName}" already exists`);
    }

    // Create database record with SCHEDULED status
    const livestream = await databaseService.createLivestream({
      roomName: sanitizedRoomName,
      title: data.title,
      description: data.description,
      createdBy: data.createdBy,
      maxParticipants: data.maxParticipants ?? 100,
      emptyTimeout: data.emptyTimeout ?? 600,
      metadata: data.metadata ?? undefined,
      status: 'SCHEDULED',
    });

    try {
      // Create LiveKit room
      await livekitService.createRoom({
        name: sanitizedRoomName,
        emptyTimeout: livestream.emptyTimeout,
        maxParticipants: livestream.maxParticipants,
      });

      // Update database with LIVE status and startedAt timestamp
      const updatedLivestream = await databaseService.updateLivestream(livestream.id, {
        status: 'LIVE',
        startedAt: new Date(),
      });

      return this.formatLivestreamResponse(updatedLivestream);
    } catch (error) {
      // If LiveKit room creation fails, update database to ERROR status
      await databaseService.updateLivestream(livestream.id, {
        status: 'ERROR',
      });

      throw error;
    }
  }

  /**
   * Get a livestream by ID
   */
  async getLivestreamById(id: string): Promise<LivestreamResponse> {
    const livestream = await databaseService.getLivestreamById(id);
    return this.formatLivestreamResponse(livestream);
  }

  /**
   * List all livestreams
   */
  async listLivestreams(filters?: {
    status?: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'ERROR';
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<LivestreamResponse[]> {
    const livestreams = await databaseService.listLivestreams(filters);
    return livestreams.map(ls => this.formatLivestreamResponse(ls));
  }

  /**
   * Delete a livestream (soft delete)
   * 1. Verify the livestream exists
   * 2. Check authorization (only creator can delete)
   * 3. Delete the LiveKit room (disconnects all participants)
   * 4. Update database status to ENDED
   *
   * @param id Livestream ID
   * @param requestingUserId User ID making the delete request
   */
  async deleteLivestream(id: string, requestingUserId: string): Promise<LivestreamResponse> {
    // Get the livestream
    const livestream = await databaseService.getLivestreamById(id);

    // Check if already ended
    if (livestream.status === 'ENDED') {
      // Idempotent operation - return success if already ended
      return this.formatLivestreamResponse(livestream);
    }

    // Authorization check: only creator can delete
    if (livestream.createdBy !== requestingUserId) {
      throw new AuthorizationError(
        'Only the creator of the livestream can delete it'
      );
    }

    // Delete the LiveKit room (this will disconnect all participants)
    try {
      await livekitService.deleteRoom(livestream.roomName);
    } catch (error) {
      // Log error but continue with database update
      // The room might already be deleted or not exist in LiveKit
      console.warn(`Failed to delete LiveKit room ${livestream.roomName}:`, error);
    }

    // Update database with ENDED status and endedAt timestamp
    const updatedLivestream = await databaseService.updateLivestream(id, {
      status: 'ENDED',
      endedAt: new Date(),
    });

    return this.formatLivestreamResponse(updatedLivestream);
  }

  /**
   * Validate create livestream request
   */
  private validateCreateRequest(data: CreateLivestreamRequest): void {
    if (!data.roomName || data.roomName.trim().length === 0) {
      throw new ValidationError('Room name is required');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }

    if (!data.createdBy || data.createdBy.trim().length === 0) {
      throw new ValidationError('Creator ID (createdBy) is required');
    }

    if (data.maxParticipants !== undefined && data.maxParticipants < 1) {
      throw new ValidationError('Max participants must be at least 1');
    }

    if (data.emptyTimeout !== undefined && data.emptyTimeout < 0) {
      throw new ValidationError('Empty timeout cannot be negative');
    }
  }

  /**
   * Sanitize room name to be LiveKit compatible
   * Allows: alphanumeric, hyphens, underscores
   */
  private sanitizeRoomName(roomName: string): string {
    return roomName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Format livestream for API response
   */
  private formatLivestreamResponse(livestream: Livestream): LivestreamResponse {
    return {
      id: livestream.id,
      roomName: livestream.roomName,
      title: livestream.title,
      description: livestream.description,
      status: livestream.status,
      createdBy: livestream.createdBy,
      maxParticipants: livestream.maxParticipants,
      emptyTimeout: livestream.emptyTimeout,
      metadata: livestream.metadata as Record<string, unknown> | null,
      createdAt: livestream.createdAt,
      updatedAt: livestream.updatedAt,
      startedAt: livestream.startedAt,
      endedAt: livestream.endedAt,
    };
  }
}

// Export singleton instance
export const livestreamService = new LivestreamService();
