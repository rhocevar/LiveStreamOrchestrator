/**
 * Test Data Factories
 *
 * Provides factory functions for generating test data.
 */

import { Livestream, Participant, LivestreamStatus, ParticipantStatus, ParticipantRole } from '@prisma/client';

/**
 * Generate a mock Livestream object
 */
export function createMockLivestream(overrides?: Partial<Livestream>): Livestream {
  const now = new Date();
  return {
    id: 'test-livestream-id',
    roomName: 'test-room',
    title: 'Test Livestream',
    description: 'A test livestream',
    status: LivestreamStatus.LIVE,
    createdBy: 'user-123',
    maxParticipants: 100,
    emptyTimeout: 600,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    endedAt: null,
    ...overrides,
  };
}

/**
 * Generate a mock Participant object
 */
export function createMockParticipant(overrides?: Partial<Participant>): Participant {
  const now = new Date();
  return {
    id: 'test-participant-id',
    livestreamId: 'test-livestream-id',
    userId: 'user-456',
    displayName: 'Test User',
    role: ParticipantRole.VIEWER,
    status: ParticipantStatus.JOINED,
    metadata: null,
    livekitParticipantSid: 'PA_test123',
    livekitRoomSid: 'RM_test123',
    joinedAt: now,
    leftAt: null,
    ...overrides,
  };
}

/**
 * Generate a mock LiveKit room object
 */
export function createMockLivekitRoom(overrides?: any) {
  return {
    sid: 'RM_test123',
    name: 'test-room',
    emptyTimeout: 600,
    maxParticipants: 100,
    creationTime: Date.now(),
    metadata: '',
    numParticipants: 0,
    numPublishers: 0,
    activeRecording: false,
    ...overrides,
  };
}

/**
 * Generate a mock LiveKit participant object
 */
export function createMockLivekitParticipant(overrides?: any) {
  return {
    sid: 'PA_test123',
    identity: 'user-456',
    name: 'Test User',
    state: 'ACTIVE',
    tracks: [],
    metadata: '',
    joinedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Generate a mock webhook event
 */
export function createMockWebhookEvent(eventType: string, overrides?: any) {
  const baseEvent = {
    id: `webhook-${Date.now()}`,
    event: eventType,
    createdAt: Date.now(),
  };

  switch (eventType) {
    case 'participant_joined':
      return {
        ...baseEvent,
        room: {
          sid: 'RM_test123',
          name: 'test-room',
        },
        participant: {
          sid: 'PA_test123',
          identity: 'user-456',
          name: 'Test User',
        },
        ...overrides,
      };

    case 'participant_left':
      return {
        ...baseEvent,
        room: {
          sid: 'RM_test123',
          name: 'test-room',
        },
        participant: {
          sid: 'PA_test123',
          identity: 'user-456',
          name: 'Test User',
        },
        ...overrides,
      };

    case 'room_started':
      return {
        ...baseEvent,
        room: {
          sid: 'RM_test123',
          name: 'test-room',
        },
        ...overrides,
      };

    case 'room_finished':
      return {
        ...baseEvent,
        room: {
          sid: 'RM_test123',
          name: 'test-room',
        },
        ...overrides,
      };

    default:
      return {
        ...baseEvent,
        ...overrides,
      };
  }
}

/**
 * Generate mock stream state
 */
export function createMockStreamState(overrides?: any) {
  return {
    streamId: 'test-livestream-id',
    status: 'LIVE' as const,
    participants: ['user-456'],
    startedAt: new Date().toISOString(),
    viewerCount: 1,
    totalViewers: 1,
    peakViewerCount: 1,
    hostInfo: {
      userId: 'user-123',
      displayName: 'Test Host',
    },
    ...overrides,
  };
}

/**
 * Generate mock join livestream request data
 */
export function createMockJoinRequest(overrides?: any) {
  return {
    userId: 'user-456',
    displayName: 'Test User',
    role: 'VIEWER',
    metadata: null,
    ...overrides,
  };
}

/**
 * Generate mock create livestream request data
 */
export function createMockCreateRequest(overrides?: any) {
  return {
    roomName: 'test-room',
    title: 'Test Livestream',
    description: 'A test livestream',
    createdBy: 'user-123',
    maxParticipants: 100,
    emptyTimeout: 600,
    metadata: null,
    ...overrides,
  };
}
