/**
 * Type definitions for Livestream API
 */

import type {
  Livestream,
  LivestreamStatus,
  Participant,
  ParticipantRole,
  ParticipantStatus
} from '@prisma/client';

// Re-export Prisma types
export type {
  Livestream,
  LivestreamStatus,
  Participant,
  ParticipantRole,
  ParticipantStatus
};

/**
 * Request body for creating a new livestream
 */
export interface CreateLivestreamRequest {
  roomName: string;
  title: string;
  description?: string;
  createdBy: string;
  maxParticipants?: number;
  emptyTimeout?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Response format for livestream endpoints
 */
export interface LivestreamResponse {
  id: string;
  roomName: string;
  title: string;
  description: string | null;
  status: LivestreamStatus;
  createdBy: string;
  maxParticipants: number;
  emptyTimeout: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
}

/**
 * LiveKit room creation options
 */
export interface LiveKitRoomOptions {
  name: string;
  emptyTimeout: number;
  maxParticipants: number;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Request body for joining a livestream
 */
export interface JoinLivestreamRequest {
  userId: string;
  displayName: string;
  role: ParticipantRole;
  metadata?: Record<string, unknown>;
}

/**
 * Response format for join livestream endpoint
 */
export interface JoinLivestreamResponse {
  token: string;
  url: string;
  participant: ParticipantResponse;
}

/**
 * Request body for leaving a livestream
 */
export interface LeaveLivestreamRequest {
  userId: string;
}

/**
 * Response format for participant endpoints
 */
export interface ParticipantResponse {
  id: string;
  livestreamId: string;
  userId: string;
  displayName: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  metadata: Record<string, unknown> | null;
  livekitParticipantSid: string | null;
  livekitRoomSid: string | null;
  joinedAt: Date;
  leftAt: Date | null;
}

/**
 * LiveKit webhook event types
 */
export interface WebhookEvent {
  id: string; // Unique webhook ID from LiveKit (for deduplication)
  event: string;
  room?: {
    sid: string;
    name: string;
  };
  participant?: {
    sid: string;
    identity: string;
    name: string;
  };
  createdAt: number;
}

/**
 * Webhook deduplication check result
 */
export interface WebhookDeduplicationResult {
  isDuplicate: boolean;
  previouslyProcessedAt?: Date;
}

/**
 * Stream state event types (SSE broadcasts)
 */
export type StateEventType = 'room_started' | 'room_ended' | 'viewer_count_update';

/**
 * Host information in stream state
 */
export interface HostInfo {
  userId: string;
  displayName: string;
}

/**
 * Real-time stream state (stored in Redis)
 */
export interface StreamState {
  streamId: string;
  status: 'LIVE' | 'ENDED';
  participants: string[]; // Array of user IDs
  startedAt: string;
  viewerCount: number; // Current viewers
  totalViewers: number; // All-time total
  peakViewerCount: number; // Highest concurrent
  hostInfo: HostInfo;
}

/**
 * Stream state event (SSE format)
 */
export interface StreamStateEvent {
  type: StateEventType;
  data: StreamState;
  timestamp: string;
}
