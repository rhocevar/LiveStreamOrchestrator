/**
 * Livestream Service - Orchestration layer
 * Coordinates between LiveKit and Database services to manage livestream lifecycle
 */

import { databaseService } from './database.service.js';
import { livekitService } from './livekit.service.js';
import { stateService } from './state.service.js';
import type {
  CreateLivestreamRequest,
  LivestreamResponse,
  Livestream,
  JoinLivestreamRequest,
  JoinLivestreamResponse,
  LeaveLivestreamRequest,
  ParticipantResponse,
  WebhookEvent
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

    // Create database record with SCHEDULED status
    const livestream = await databaseService.createLivestream({
      roomName: sanitizedRoomName,
      title: data.title,
      description: data.description,
      createdBy: data.createdBy,
      maxParticipants: data.maxParticipants ?? 100,
      emptyTimeout: data.emptyTimeout ?? 86400,
      metadata: (data.metadata ?? undefined) as any,
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
      const startedAt = new Date();
      const updatedLivestream = await databaseService.updateLivestream(livestream.id, {
        status: 'LIVE',
        startedAt,
      });

      // Initialize stream state in Redis
      await stateService.initializeState(
        updatedLivestream.id,
        {
          userId: data.createdBy,
          displayName: data.title, // Using title as display name for creator
        },
        startedAt
      );

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
   * Join a livestream
   * 1. Verify the livestream exists and is LIVE
   * 2. Validate the join request
   * 3. Check if user is already joined
   * 4. Create participant record
   * 5. Generate access token
   *
   * @param livestreamId The livestream ID
   * @param data Join request data
   */
  async joinLivestream(
    livestreamId: string,
    data: JoinLivestreamRequest
  ): Promise<JoinLivestreamResponse> {
    // Validate input
    this.validateJoinRequest(data);

    // Get the livestream
    const livestream = await databaseService.getLivestreamById(livestreamId);

    // Check if livestream is LIVE
    if (livestream.status !== 'LIVE') {
      throw new ValidationError(
        `Cannot join livestream with status ${livestream.status}. Livestream must be LIVE.`
      );
    }

    // Check if user is already an active participant
    const existingParticipant = await databaseService.getActiveParticipant(
      data.userId,
      livestreamId
    );

    if (existingParticipant) {
      throw new ConflictError(
        'User is already an active participant in this livestream'
      );
    }

    // Only the creator can join as HOST
    if (data.role === 'HOST' && livestream.createdBy !== data.userId) {
      throw new AuthorizationError(
        'Only the livestream creator can join as HOST'
      );
    }

    // Create participant record
    const participant = await databaseService.createParticipant({
      livestream: { connect: { id: livestreamId } },
      userId: data.userId,
      displayName: data.displayName,
      role: data.role,
      status: 'JOINED',
      metadata: (data.metadata || undefined) as any,
    });

    // Generate access token
    const token = await livekitService.generateAccessToken({
      roomName: livestream.roomName,
      participantIdentity: data.userId,
      participantName: data.displayName,
      role: data.role,
      metadata: JSON.stringify(data.metadata || {}),
    });

    return {
      token,
      url: livekitService.getLiveKitUrl(),
      participant: this.formatParticipantResponse(participant),
    };
  }

  /**
   * Leave a livestream
   * Updates participant status to LEFT
   *
   * @param livestreamId The livestream ID
   * @param data Leave request data
   */
  async leaveLivestream(
    livestreamId: string,
    data: LeaveLivestreamRequest
  ): Promise<void> {
    // Validate input
    if (!data.userId || data.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }

    // Verify livestream exists
    await databaseService.getLivestreamById(livestreamId);

    // Get active participant to retrieve LiveKit SID
    const participant = await databaseService.getActiveParticipant(
      data.userId,
      livestreamId
    );

    if (!participant) {
      // Already left or never joined - idempotent operation
      console.log(
        `[Service] Participant ${data.userId} not found or already left`
      );
      return;
    }

    // Use SID-based method for transaction safety
    if (participant.livekitParticipantSid) {
      await databaseService.markParticipantAsLeftBySid(
        participant.livekitParticipantSid
      );
    } else {
      // This shouldn't happen in normal flow, but log warning
      console.warn(
        `[Service] Participant ${data.userId} has no LiveKit SID - cannot mark as left safely`
      );
      throw new ValidationError('Participant missing LiveKit SID');
    }

    // Update stream state
    await stateService.handleParticipantLeft(livestreamId, data.userId);
  }

  /**
   * List participants for a livestream
   */
  async listParticipants(filters?: {
    livestreamId?: string;
    userId?: string;
    status?: 'JOINED' | 'LEFT';
    role?: 'HOST' | 'VIEWER';
    limit?: number;
    offset?: number;
  }): Promise<ParticipantResponse[]> {
    const participants = await databaseService.listParticipants(filters);
    return participants.map(p => this.formatParticipantResponse(p));
  }

  /**
   * Handle LiveKit webhook events
   * Updates participant status based on LiveKit events
   *
   * @param event Webhook event from LiveKit
   */
  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    console.log(`[Service] Processing webhook event: ${event.event}`);

    try {
      switch (event.event) {
        case 'participant_joined':
          // LiveKit confirmed participant joined - update participant record with LiveKit SIDs
          if (event.participant && event.room) {
            const livestream = await databaseService.getLivestreamByRoomName(
              event.room.name
            );

            if (livestream) {
              const updated = await databaseService.updateParticipantWithLiveKitSids(
                event.participant.identity, // userId
                livestream.id,
                event.participant.sid, // LiveKit participant SID
                event.room.sid // LiveKit room SID
              );

              if (updated) {
                console.log(
                  `[Service] Participant ${event.participant.identity} joined room ${event.room.name} (SID: ${event.participant.sid})`
                );

                // Update stream state (no SSE broadcast - internal state only)
                await stateService.handleParticipantJoined(
                  livestream.id,
                  event.participant.identity
                );
              } else {
                console.warn(
                  `[Service] Could not find participant record for ${event.participant.identity} in ${event.room.name}`
                );
              }
            } else {
              console.warn(
                `[Service] Received participant_joined for unknown room: ${event.room.name}`
              );
            }
          } else {
            console.warn(
              `[Service] Received participant_joined webhook with missing data`
            );
          }
          break;

        case 'participant_left':
          // LiveKit confirmed participant left - use SID-based method (TRANSACTION-SAFE)
          if (event.participant && event.room) {
            const updated = await databaseService.markParticipantAsLeftBySid(
              event.participant.sid
            );

            if (updated) {
              console.log(
                `[Service] Participant ${event.participant.identity} left room (SID: ${event.participant.sid})`
              );

              // Update stream state (no SSE broadcast - internal state only)
              const livestream = await databaseService.getLivestreamByRoomName(
                event.room.name
              );
              if (livestream) {
                await stateService.handleParticipantLeft(
                  livestream.id,
                  event.participant.identity
                );
              }
            } else {
              console.log(
                `[Service] Participant ${event.participant.identity} already marked as left or not found (SID: ${event.participant.sid})`
              );
            }
          } else {
            console.warn(
              `[Service] Received participant_left webhook with missing participant data`
            );
          }
          break;

        case 'room_started':
          // Broadcast room_started event via SSE
          if (event.room) {
            const livestream = await databaseService.getLivestreamByRoomName(
              event.room.name
            );

            if (livestream) {
              const state = await stateService.getState(livestream.id);
              if (state) {
                await stateService.broadcastStateEvent(
                  livestream.id,
                  'room_started',
                  state
                );
                console.log(`[Service] Room ${event.room.name} started - broadcast SSE event`);
              }
            }
          }
          break;

        case 'room_finished':
          // Room ended - mark all active participants as left
          if (event.room) {
            const livestream = await databaseService.getLivestreamByRoomName(
              event.room.name
            );

            if (livestream) {
              const activeParticipants = await databaseService.listParticipants({
                livestreamId: livestream.id,
                status: 'JOINED',
              });

              // Mark all active participants as left using SID-based method
              let updatedCount = 0;
              for (const participant of activeParticipants) {
                if (participant.livekitParticipantSid) {
                  const updated = await databaseService.markParticipantAsLeftBySid(
                    participant.livekitParticipantSid
                  );
                  if (updated) updatedCount++;
                } else {
                  // This shouldn't happen - log warning
                  console.warn(
                    `[Service] Participant ${participant.userId} has no LiveKit SID (room: ${event.room.name})`
                  );
                }
              }

              console.log(
                `[Service] Room ${event.room.name} finished, marked ${updatedCount} participants as left`
              );

              // Handle room ended - updates state and broadcasts SSE event
              await stateService.handleRoomEnded(livestream.id);
            }
          }
          break;

        default:
          console.log(`[Service] Unhandled webhook event: ${event.event}`);
      }
    } catch (error) {
      console.error('[Service] Error handling webhook event:', error);
      // Throw error so worker can retry
      throw error;
    }
  }

  /**
   * Validate join livestream request
   */
  private validateJoinRequest(data: JoinLivestreamRequest): void {
    if (!data.userId || data.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }

    if (!data.displayName || data.displayName.trim().length === 0) {
      throw new ValidationError('Display name is required');
    }

    if (!data.role || !['HOST', 'VIEWER'].includes(data.role)) {
      throw new ValidationError('Role must be either HOST or VIEWER');
    }
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

  /**
   * Format participant for API response
   */
  private formatParticipantResponse(participant: any): ParticipantResponse {
    return {
      id: participant.id,
      livestreamId: participant.livestreamId,
      userId: participant.userId,
      displayName: participant.displayName,
      role: participant.role,
      status: participant.status,
      metadata: participant.metadata as Record<string, unknown> | null,
      livekitParticipantSid: participant.livekitParticipantSid,
      livekitRoomSid: participant.livekitRoomSid,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
    };
  }
}

// Export singleton instance
export const livestreamService = new LivestreamService();
