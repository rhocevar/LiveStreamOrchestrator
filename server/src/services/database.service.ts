/**
 * Database Service - Handles all Prisma database interactions
 * Provides type-safe CRUD operations for Livestream records
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type { Livestream, LivestreamStatus } from '../types/livestream.types.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  /**
   * Create a new livestream record
   */
  async createLivestream(data: Prisma.LivestreamCreateInput): Promise<Livestream> {
    try {
      return await this.prisma.livestream.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new DatabaseError('A livestream with this room name already exists');
        }
      }
      throw new DatabaseError('Failed to create livestream record');
    }
  }

  /**
   * Get a livestream by ID
   */
  async getLivestreamById(id: string): Promise<Livestream> {
    try {
      const livestream = await this.prisma.livestream.findUnique({
        where: { id },
      });

      if (!livestream) {
        throw new NotFoundError(`Livestream with ID ${id} not found`);
      }

      return livestream;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch livestream');
    }
  }

  /**
   * Get a livestream by room name
   */
  async getLivestreamByRoomName(roomName: string): Promise<Livestream | null> {
    try {
      return await this.prisma.livestream.findUnique({
        where: { roomName },
      });
    } catch (error) {
      throw new DatabaseError('Failed to fetch livestream by room name');
    }
  }

  /**
   * List all livestreams with optional filters
   */
  async listLivestreams(filters?: {
    status?: LivestreamStatus;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<Livestream[]> {
    try {
      const where: Prisma.LivestreamWhereInput = {};

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.createdBy) {
        where.createdBy = filters.createdBy;
      }

      return await this.prisma.livestream.findMany({
        where,
        take: filters?.limit,
        skip: filters?.offset,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new DatabaseError('Failed to list livestreams');
    }
  }

  /**
   * Update a livestream
   */
  async updateLivestream(
    id: string,
    data: Prisma.LivestreamUpdateInput
  ): Promise<Livestream> {
    try {
      return await this.prisma.livestream.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError(`Livestream with ID ${id} not found`);
        }
      }
      throw new DatabaseError('Failed to update livestream');
    }
  }

  /**
   * Delete a livestream
   */
  async deleteLivestream(id: string): Promise<void> {
    try {
      await this.prisma.livestream.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError(`Livestream with ID ${id} not found`);
        }
      }
      throw new DatabaseError('Failed to delete livestream');
    }
  }

  /**
   * Disconnect from database (for graceful shutdown)
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Connect to database (useful for testing connection)
   */
  async connect(): Promise<void> {
    await this.prisma.$connect();
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
