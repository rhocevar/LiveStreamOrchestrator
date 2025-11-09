/**
 * LiveKit SDK Mock
 *
 * Provides mock implementations for LiveKit SDK classes and functions.
 */

import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import type { RoomServiceClient, AccessToken, WebhookReceiver } from 'livekit-server-sdk';

// Mock RoomServiceClient
export const mockRoomServiceClient = mockDeep<RoomServiceClient>();

// Mock AccessToken
export class MockAccessToken {
  private grants: any = {};
  private identity: string = '';
  private metadata: string = '';
  private ttl: string | number = '24h';

  addGrant(grant: any) {
    this.grants = grant;
    return this;
  }

  setIdentity(identity: string) {
    this.identity = identity;
    return this;
  }

  setMetadata(metadata: string) {
    this.metadata = metadata;
    return this;
  }

  setTTL(ttl: string | number) {
    this.ttl = ttl;
    return this;
  }

  toJwt(): string {
    return `mock-jwt-token-${this.identity}`;
  }
}

// Mock WebhookReceiver
export class MockWebhookReceiver {
  receive(body: string, authHeader: string, skipAuth?: boolean): any {
    // For testing, just parse the body
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error('Invalid webhook body');
    }
  }
}

// Reset mocks before each test
beforeEach(() => {
  mockReset(mockRoomServiceClient);
});

// Mock the livekit-server-sdk module
jest.mock('livekit-server-sdk', () => ({
  RoomServiceClient: jest.fn(() => mockRoomServiceClient),
  AccessToken: MockAccessToken,
  WebhookReceiver: MockWebhookReceiver,
  RoomOptions: {},
  VideoGrant: {},
}));

export { mockRoomServiceClient as roomServiceClientMock };
