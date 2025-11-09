/**
 * Redis (IORedis) Mock
 *
 * Provides a mock implementation of Redis client for testing.
 */

import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import type Redis from 'ioredis';

// In-memory store for Redis mock
const store = new Map<string, string>();
const expirations = new Map<string, number>();

// Create a mock Redis client with basic functionality
export const mockRedis = {
  // Basic commands
  get: jest.fn(async (key: string) => {
    // Check if key expired
    const expiration = expirations.get(key);
    if (expiration && Date.now() > expiration) {
      store.delete(key);
      expirations.delete(key);
      return null;
    }
    return store.get(key) || null;
  }),

  set: jest.fn(async (key: string, value: string, ...args: any[]) => {
    store.set(key, value);

    // Handle EX (expire in seconds)
    if (args[0] === 'EX' && typeof args[1] === 'number') {
      expirations.set(key, Date.now() + args[1] * 1000);
    }

    return 'OK';
  }),

  del: jest.fn(async (...keys: string[]) => {
    let deleted = 0;
    for (const key of keys) {
      if (store.delete(key)) {
        deleted++;
      }
      expirations.delete(key);
    }
    return deleted;
  }),

  exists: jest.fn(async (...keys: string[]) => {
    let count = 0;
    for (const key of keys) {
      const expiration = expirations.get(key);
      if (expiration && Date.now() > expiration) {
        store.delete(key);
        expirations.delete(key);
      } else if (store.has(key)) {
        count++;
      }
    }
    return count;
  }),

  // Hash commands
  hgetall: jest.fn(async (key: string) => {
    const value = store.get(key);
    return value ? JSON.parse(value) : {};
  }),

  hset: jest.fn(async (key: string, ...args: any[]) => {
    const obj: Record<string, any> = {};
    for (let i = 0; i < args.length; i += 2) {
      obj[args[i]] = args[i + 1];
    }
    store.set(key, JSON.stringify(obj));
    return Object.keys(obj).length;
  }),

  // Pub/Sub commands
  publish: jest.fn(async (channel: string, message: string) => {
    // Return number of subscribers (mock value)
    return 1;
  }),

  subscribe: jest.fn(async (...channels: string[]) => {
    return channels.length;
  }),

  unsubscribe: jest.fn(async (...channels: string[]) => {
    return channels.length;
  }),

  on: jest.fn((event: string, handler: (...args: any[]) => void) => {
    // Store event handlers if needed
    return mockRedis;
  }),

  // Connection commands
  ping: jest.fn(async () => 'PONG'),

  quit: jest.fn(async () => 'OK'),

  disconnect: jest.fn(() => {
    // Mock disconnect
  }),

  duplicate: jest.fn(() => {
    // Return a new instance with same methods
    return { ...mockRedis };
  }),
};

// Reset store and mocks before each test
beforeEach(() => {
  store.clear();
  expirations.clear();
  jest.clearAllMocks();
});

// Mock the ioredis module
jest.mock('ioredis', () => {
  return jest.fn(() => mockRedis);
});

export default mockRedis;
