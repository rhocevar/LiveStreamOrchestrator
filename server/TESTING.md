# Testing Guide

## Overview

This document provides comprehensive guidance on testing the Favorited server application. The test suite is built using Jest and provides unit tests, integration tests, and testing utilities.

## Table of Contents

- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Mocking](#mocking)
- [Best Practices](#best-practices)
- [Continuous Integration](#continuous-integration)

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL (for integration tests)
- Redis (for integration tests)

### Installation

Tests dependencies are already installed with the project dependencies:

```bash
npm install
```

The test suite includes:
- **Jest** (v30+): Test runner and framework
- **ts-jest**: TypeScript support for Jest
- **supertest**: HTTP assertion library
- **jest-mock-extended**: Enhanced mocking utilities

## Running Tests

### All Tests

Run the entire test suite:

```bash
npm test
```

### Watch Mode

Run tests in watch mode (re-runs on file changes):

```bash
npm run test:watch
```

### Coverage Report

Generate a coverage report:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

### Specific Tests

Run tests matching a pattern:

```bash
# Run tests in a specific file
npm test -- errors.test.ts

# Run tests matching a pattern
npm test -- --testPathPattern=services

# Run a specific test suite
npm test -- --testNamePattern="Database Service"
```

### Unit Tests Only

Run only unit tests:

```bash
npm run test:unit
```

### Integration Tests Only

Run only integration tests:

```bash
npm run test:integration
```

## Test Structure

The test suite is organized as follows:

```
server/src/__tests__/
├── setup.ts                    # Global test setup
├── mocks/                      # Mock implementations
│   ├── prisma.mock.ts         # Prisma Client mock
│   ├── livekit.mock.ts        # LiveKit SDK mock
│   ├── redis.mock.ts          # Redis mock
│   └── bullmq.mock.ts         # BullMQ mock
├── fixtures/                   # Test data factories
│   └── test-data.ts           # Factory functions for test data
├── helpers/                    # Test utilities
│   └── test-utils.ts          # Helper functions
├── unit/                       # Unit tests
│   ├── services/              # Service layer tests
│   ├── routes/                # Route handler tests
│   ├── workers/               # Worker tests
│   ├── jobs/                  # Job tests
│   └── utils/                 # Utility tests
└── integration/                # Integration tests
    └── workflows/             # End-to-end workflow tests
```

## Writing Tests

### Unit Tests

Unit tests focus on testing individual functions or classes in isolation.

#### Example: Testing a Service Method

```typescript
import { createMockLivestream } from '../../fixtures/test-data.js';
import { NotFoundError } from '../../../utils/errors.js';

describe('DatabaseService', () => {
  describe('getLivestreamById', () => {
    it('should return a livestream if found', async () => {
      const mockLivestream = createMockLivestream();

      // Mock the database call
      prismaMock.livestream.findUnique.mockResolvedValue(mockLivestream);

      const result = await databaseService.getLivestreamById('test-id');

      expect(result).toEqual(mockLivestream);
      expect(prismaMock.livestream.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
    });

    it('should throw NotFoundError if not found', async () => {
      prismaMock.livestream.findUnique.mockResolvedValue(null);

      await expect(
        databaseService.getLivestreamById('nonexistent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
```

#### Example: Testing Route Handlers

```typescript
import request from 'supertest';
import express from 'express';
import { livestreamRoutes } from '../../../routes/livestream.routes.js';

describe('Livestream Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/livestreams', livestreamRoutes);

  describe('POST /api/v1/livestreams', () => {
    it('should create a new livestream', async () => {
      const requestData = {
        roomName: 'test-room',
        title: 'Test Livestream',
        createdBy: 'user-123',
      };

      const response = await request(app)
        .post('/api/v1/livestreams')
        .send(requestData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.roomName).toBe('test-room');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/livestreams')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

#### Example: End-to-End Workflow

```typescript
describe('Livestream Creation Workflow', () => {
  it('should create livestream, join, and leave successfully', async () => {
    // 1. Create livestream
    const createResponse = await request(app)
      .post('/api/v1/livestreams')
      .send({
        roomName: 'integration-test',
        title: 'Integration Test',
        createdBy: 'user-123',
      })
      .expect(201);

    const livestreamId = createResponse.body.data.id;

    // 2. Join livestream
    const joinResponse = await request(app)
      .post(`/api/v1/livestreams/${livestreamId}/join`)
      .send({
        userId: 'user-456',
        displayName: 'Test User',
        role: 'VIEWER',
      })
      .expect(200);

    expect(joinResponse.body.data.token).toBeDefined();

    // 3. Leave livestream
    await request(app)
      .post(`/api/v1/livestreams/${livestreamId}/leave`)
      .send({
        userId: 'user-456',
      })
      .expect(200);

    // 4. Verify participant status
    const participants = await request(app)
      .get(`/api/v1/livestreams/${livestreamId}/participants`)
      .expect(200);

    expect(participants.body.data[0].status).toBe('LEFT');
  });
});
```

## Test Utilities

### Test Data Factories

Located in `__tests__/fixtures/test-data.ts`, these factory functions create mock data:

```typescript
import {
  createMockLivestream,
  createMockParticipant,
  createMockWebhookEvent,
  createMockStreamState,
} from '../fixtures/test-data.js';

// Create a mock livestream with default values
const livestream = createMockLivestream();

// Override specific fields
const customLivestream = createMockLivestream({
  roomName: 'custom-room',
  status: 'ENDED',
});
```

### Helper Functions

Located in `__tests__/helpers/test-utils.ts`:

```typescript
import {
  wait,
  waitFor,
  createMockRequest,
  createMockResponse,
  createMockNext,
  parseSSEData,
} from '../helpers/test-utils.js';

// Wait for a condition
await waitFor(
  () => callCount > 0,
  { timeout: 5000, interval: 100 }
);

// Create Express mocks
const req = createMockRequest({ body: { key: 'value' } });
const res = createMockResponse();
const next = createMockNext();

// Parse SSE events
const events = parseSSEData(mockResponse);
```

## Mocking

### Prisma Client

The Prisma Client is mocked globally for all tests:

```typescript
import { prismaMock } from '../../mocks/prisma.mock.js';

// Mock a query
prismaMock.livestream.findUnique.mockResolvedValue(mockLivestream);

// Mock a mutation
prismaMock.livestream.create.mockResolvedValue(mockLivestream);

// Verify calls
expect(prismaMock.livestream.findUnique).toHaveBeenCalledWith({
  where: { id: 'test-id' }
});
```

### Redis

Redis is mocked with an in-memory store:

```typescript
import mockRedis from '../../mocks/redis.mock.js';

// Redis operations work like the real client
await mockRedis.set('key', 'value');
const value = await mockRedis.get('key');

// Verify calls
expect(mockRedis.set).toHaveBeenCalledWith('key', 'value');
```

### LiveKit SDK

LiveKit SDK is mocked for testing:

```typescript
import { mockRoomServiceClient } from '../../mocks/livekit.mock.js';

// Mock room creation
mockRoomServiceClient.createRoom.mockResolvedValue({
  sid: 'RM_123',
  name: 'test-room',
});

// Mock access token generation
MockAccessToken.prototype.toJwt.mockResolvedValue('mock-jwt-token');
```

### BullMQ

BullMQ queues and workers are mocked:

```typescript
import { MockQueue, MockWorker } from '../../mocks/bullmq.mock.js';

// Create mock queue
const queue = new MockQueue('webhook-queue');

// Add job
await queue.add('process-webhook', { data: 'test' });

// Create mock worker
const worker = new MockWorker('webhook-queue', async (job) => {
  // Process job
});
```

## Best Practices

### 1. Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain the expected behavior
- Follow the Arrange-Act-Assert (AAA) pattern

```typescript
describe('Feature', () => {
  describe('Method', () => {
    it('should do something when condition is met', () => {
      // Arrange: Set up test data and mocks
      const input = 'test';

      // Act: Execute the code being tested
      const result = methodUnderTest(input);

      // Assert: Verify the expected outcome
      expect(result).toBe('expected');
    });
  });
});
```

### 2. Isolation

- Each test should be independent and not rely on other tests
- Use `beforeEach` and `afterEach` to reset state
- Clear mocks between tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});
```

### 3. Mock Only What You Need

- Mock external dependencies (databases, APIs, etc.)
- Don't mock the code you're testing
- Keep mocks simple and focused

### 4. Test Edge Cases

- Test happy paths and error paths
- Test boundary conditions
- Test null/undefined values

```typescript
describe('validateInput', () => {
  it('should accept valid input', () => { /* ... */ });
  it('should reject null input', () => { /* ... */ });
  it('should reject empty string', () => { /* ... */ });
  it('should reject input too long', () => { /* ... */ });
});
```

### 5. Use Meaningful Assertions

- Use specific matchers (`toBe`, `toEqual`, `toThrow`, etc.)
- Test both positive and negative cases
- Provide helpful error messages

```typescript
// Good
expect(result.status).toBe(200);
expect(result.body).toEqual({ success: true });

// Better with custom message
expect(result.status, 'Response should be OK').toBe(200);
```

### 6. Avoid Test Interdependence

```typescript
// Bad: Tests depend on execution order
let sharedState;
it('test 1', () => { sharedState = 'value'; });
it('test 2', () => { expect(sharedState).toBe('value'); }); // Fragile!

// Good: Each test is independent
it('test 1', () => {
  const state = 'value';
  expect(state).toBe('value');
});

it('test 2', () => {
  const state = 'value';
  expect(state).toBe('value');
});
```

### 7. Test Asynchronous Code Properly

```typescript
// Using async/await
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// Testing rejections
it('should handle errors', async () => {
  await expect(failingFunction()).rejects.toThrow(Error);
});
```

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install
        working-directory: ./server

      - name: Run tests
        run: npm test
        working-directory: ./server
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./server/coverage/lcov.info
```

## Coverage Goals

Aim for these coverage targets:

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View coverage report:

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Debugging Tests

### Run Tests in Debug Mode

```bash
# VS Code / Cursor
# Add a breakpoint in your test file
# Use the "Attach to Node Process" debug configuration
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Enable Verbose Logging

```typescript
// In your test file
console.log = jest.fn(); // Disable
console.log.mockRestore(); // Enable
```

### Run Single Test

```typescript
// Use .only to run a single test
it.only('should run only this test', () => {
  // Test code
});

// Or .skip to skip a test
it.skip('should skip this test', () => {
  // Test code
});
```

## Common Issues

### Tests Timeout

Increase timeout in jest.config.js or individual tests:

```typescript
jest.setTimeout(10000); // Global

it('long running test', async () => {
  // Test code
}, 10000); // Per test
```

### Module Resolution Errors

Ensure `.js` extensions in imports for ES modules:

```typescript
// Correct
import { service } from './service.js';

// Incorrect (will fail)
import { service } from './service';
```

### Mock Not Working

Reset mocks between tests:

```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear call history
  jest.resetAllMocks(); // Reset implementations
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this guide if needed

## Support

For questions or issues with tests:

1. Check this guide first
2. Review existing tests for examples
3. Open an issue on GitHub
