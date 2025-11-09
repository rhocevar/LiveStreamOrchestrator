/**
 * Jest Test Setup
 *
 * This file runs before all tests to configure the test environment.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.LIVEKIT_URL = 'wss://test.livekit.cloud';
process.env.LIVEKIT_API_KEY = 'test-api-key';
process.env.LIVEKIT_API_SECRET = 'test-api-secret';
process.env.TOKEN_EXPIRATION_HOURS = '24';
process.env.WEBHOOK_QUEUE_CONCURRENCY = '10';
process.env.RECONCILIATION_INTERVAL_MINUTES = '10';

// Suppress console output during tests (optional - comment out for debugging)
// Uncomment the lines below to suppress console output
// global.console = {
//   ...console,
//   log: jest.fn(), // Suppress console.log
//   debug: jest.fn(), // Suppress console.debug
//   info: jest.fn(), // Suppress console.info
//   // Keep error and warn for debugging
//   error: console.error,
//   warn: console.warn,
// };

// Mock timers helper
export const setupMockTimers = () => {
  jest.useFakeTimers();
};

export const teardownMockTimers = () => {
  jest.useRealTimers();
};
