/**
 * Client-side type definitions for Livestream API
 * Adapted from server types - dates are strings (ISO 8601) as they come from JSON
 */

// Enums
export const LivestreamStatus = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  ENDED: 'ENDED',
  ERROR: 'ERROR',
} as const;

export type LivestreamStatus = (typeof LivestreamStatus)[keyof typeof LivestreamStatus];

export const ParticipantRole = {
  HOST: 'HOST',
  VIEWER: 'VIEWER',
} as const;

export type ParticipantRole = (typeof ParticipantRole)[keyof typeof ParticipantRole];

export const ParticipantStatus = {
  JOINED: 'JOINED',
  LEFT: 'LEFT',
} as const;

export type ParticipantStatus = (typeof ParticipantStatus)[keyof typeof ParticipantStatus];

// Livestream types
export interface Livestream {
  id: string;
  roomName: string;
  title: string;
  description: string | null;
  status: LivestreamStatus;
  createdBy: string;
  maxParticipants: number;
  emptyTimeout: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

// Participant types
export interface Participant {
  id: string;
  livestreamId: string;
  userId: string;
  displayName: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  metadata: Record<string, unknown> | null;
  livekitParticipantSid: string | null;
  livekitRoomSid: string | null;
  joinedAt: string;
  leftAt: string | null;
}

// API Response wrappers
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  count?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Stream State types (for SSE)
export interface HostInfo {
  userId: string;
  displayName: string;
}

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

export type StateEventType = 'state' | 'room_started' | 'room_ended' | 'viewer_count_update';

export interface StreamStateEvent {
  type: StateEventType;
  data: StreamState;
  timestamp?: string;
}

// Request types
export interface CreateLivestreamRequest {
  roomName: string;
  title: string;
  description?: string;
  createdBy: string;
  maxParticipants?: number;
  emptyTimeout?: number;
  metadata?: Record<string, unknown>;
}

export interface JoinLivestreamRequest {
  userId: string;
  displayName: string;
  role: ParticipantRole;
  metadata?: Record<string, unknown>;
}

export interface JoinLivestreamResponse {
  token: string;
  url: string;
  participant: Participant;
}

export interface LeaveLivestreamRequest {
  userId: string;
}

// Query parameters
export interface GetLivestreamsParams {
  status?: LivestreamStatus;
  limit?: number;
  offset?: number;
}

export interface GetParticipantsParams {
  status?: ParticipantStatus;
  role?: ParticipantRole;
  limit?: number;
  offset?: number;
}
