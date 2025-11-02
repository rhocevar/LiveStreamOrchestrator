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
   * Create a new participant record
   */
  async createParticipant(data: Prisma.ParticipantCreateInput): Promise<any> {
    try {
      return await this.prisma.participant.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundError('Livestream not found');
        }
      }
      throw new DatabaseError('Failed to create participant record');
    }
  }

  /**
   * Get a participant by ID
   */
  async getParticipantById(id: string): Promise<any> {
    try {
      const participant = await this.prisma.participant.findUnique({
        where: { id },
        include: { livestream: true },
      });

      if (!participant) {
        throw new NotFoundError(`Participant with ID ${id} not found`);
      }

      return participant;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch participant');
    }
  }

  /**
   * Get active participant by user ID and livestream ID
   */
  async getActiveParticipant(
    userId: string,
    livestreamId: string
  ): Promise<any | null> {
    try {
      return await this.prisma.participant.findFirst({
        where: {
          userId,
          livestreamId,
          status: 'JOINED',
        },
      });
    } catch (error) {
      throw new DatabaseError('Failed to fetch participant');
    }
  }

  /**
   * List participants for a livestream with optional filters
   */
  async listParticipants(filters?: {
    livestreamId?: string;
    userId?: string;
    status?: 'JOINED' | 'LEFT';
    role?: 'HOST' | 'VIEWER';
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const where: Prisma.ParticipantWhereInput = {};

      if (filters?.livestreamId) {
        where.livestreamId = filters.livestreamId;
      }

      if (filters?.userId) {
        where.userId = filters.userId;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.role) {
        where.role = filters.role;
      }

      return await this.prisma.participant.findMany({
        where,
        take: filters?.limit,
        skip: filters?.offset,
        orderBy: { joinedAt: 'desc' },
        include: { livestream: true },
      });
    } catch (error) {
      throw new DatabaseError('Failed to list participants');
    }
  }

  /**
   * Update a participant
   */
  async updateParticipant(
    id: string,
    data: Prisma.ParticipantUpdateInput
  ): Promise<any> {
    try {
      return await this.prisma.participant.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundError(`Participant with ID ${id} not found`);
        }
      }
      throw new DatabaseError('Failed to update participant');
    }
  }

  /**
   * Mark participant as left by userId and livestreamId
   * Returns the number of participants updated (0 if already LEFT, making this idempotent)
   */
  async markParticipantAsLeft(
    userId: string,
    livestreamId: string
  ): Promise<number> {
    try {
      const result = await this.prisma.participant.updateMany({
        where: {
          userId,
          livestreamId,
          status: 'JOINED',
        },
        data: {
          status: 'LEFT',
          leftAt: new Date(),
        },
      });
      return result.count;
    } catch (error) {
      throw new DatabaseError('Failed to update participant status');
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
