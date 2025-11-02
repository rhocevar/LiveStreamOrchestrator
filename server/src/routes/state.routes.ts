/**
 * Stream State API Routes
 * Handles HTTP endpoints for real-time stream state tracking
 */

import { Router, Request, Response, NextFunction } from 'express';
import { stateService } from '../services/state.service.js';

const router = Router();

/**
 * GET /api/v1/livestreams/:id/state
 * Get current state snapshot for a livestream
 */
router.get(
  '/:id/state',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Livestream ID is required',
          statusCode: 400,
        });
        return;
      }

      const state = await stateService.getState(id);

      if (!state) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: 'Stream state not found',
          statusCode: 404,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: state,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/livestreams/:id/events
 * Subscribe to real-time state updates via Server-Sent Events (SSE)
 *
 * This endpoint establishes a long-lived HTTP connection and streams
 * state updates as they occur. Events are sent in SSE format.
 *
 * Broadcasted events:
 * - room_started: Stream goes live
 * - room_ended: Stream finishes
 * - viewer_count_update: Periodic viewer count changes
 *
 * Example client usage:
 * ```javascript
 * const eventSource = new EventSource('/api/v1/livestreams/abc123/events');
 *
 * eventSource.addEventListener('state', (e) => {
 *   const state = JSON.parse(e.data);
 *   console.log('Current state:', state);
 * });
 *
 * eventSource.addEventListener('room_started', (e) => {
 *   const state = JSON.parse(e.data);
 *   console.log('Stream started:', state);
 * });
 *
 * eventSource.addEventListener('viewer_count_update', (e) => {
 *   const state = JSON.parse(e.data);
 *   console.log('Viewer count:', state.viewerCount);
 * });
 *
 * eventSource.addEventListener('room_ended', (e) => {
 *   const state = JSON.parse(e.data);
 *   console.log('Stream ended:', state);
 *   eventSource.close();
 * });
 * ```
 */
router.get(
  '/:id/events',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Livestream ID is required',
          statusCode: 400,
        });
        return;
      }

      // Check if state exists
      const state = await stateService.getState(id);
      if (!state) {
        res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: 'Stream state not found',
          statusCode: 404,
        });
        return;
      }

      // Subscribe to SSE events
      // This will keep the connection open and stream events
      await stateService.subscribeToStateEvents(id, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
