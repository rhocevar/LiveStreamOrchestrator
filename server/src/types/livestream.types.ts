/**
 * Type definitions for Livestream API
 */

import type { Livestream, LivestreamStatus } from '@prisma/client';

// Re-export Prisma types
export type { Livestream, LivestreamStatus };

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
