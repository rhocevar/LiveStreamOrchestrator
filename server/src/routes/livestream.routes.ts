/**
 * Livestream API Routes
 * Handles HTTP endpoints for livestream management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { livestreamService } from '../services/livestream.service.js';
import type { CreateLivestreamRequest } from '../types/livestream.types.js';

const router = Router();

/**
 * POST /api/v1/livestreams
 * Create a new livestream
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestData: CreateLivestreamRequest = req.body;
    const livestream = await livestreamService.createLivestream(requestData);

    res.status(201).json({
      success: true,
      data: livestream,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/livestreams
 * List all livestreams with optional filters
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, createdBy, limit, offset } = req.query;

    const filters = {
      status: status as 'SCHEDULED' | 'LIVE' | 'ENDED' | 'ERROR' | undefined,
      createdBy: createdBy as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    };

    const livestreams = await livestreamService.listLivestreams(filters);

    res.status(200).json({
      success: true,
      data: livestreams,
      count: livestreams.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/livestreams/:id
 * Get a specific livestream by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const livestream = await livestreamService.getLivestreamById(id);

    res.status(200).json({
      success: true,
      data: livestream,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/livestreams/:id
 * Delete a livestream (soft delete - sets status to ENDED)
 *
 * Authorization: Only the creator can delete their livestream
 *
 * Request body:
 * {
 *   "requestingUserId": "user-id-123"
 * }
 *
 * Note: In a production app, requestingUserId would come from
 * authentication middleware (JWT token, session, etc.)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { requestingUserId } = req.body;

    // Validate requestingUserId is provided
    if (!requestingUserId || typeof requestingUserId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'requestingUserId is required in request body',
        statusCode: 400,
      });
      return;
    }

    const livestream = await livestreamService.deleteLivestream(id, requestingUserId as string);

    res.status(200).json({
      success: true,
      message: 'Livestream deleted successfully',
      data: livestream,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
