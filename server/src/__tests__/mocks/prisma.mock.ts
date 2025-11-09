/**
 * Prisma Client Mock
 *
 * Provides a mock implementation of the Prisma Client for testing.
 */

import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>();

// Type for the mock
export type MockPrismaClient = DeepMockProxy<PrismaClient>;

// Reset the mock before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Mock the Prisma Client module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

export default prismaMock;
