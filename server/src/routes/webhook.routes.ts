/**
 * Webhook API Routes
 * Handles webhooks from external services like LiveKit
 *
 * Architecture:
 * 1. Verify webhook signature
 * 2. Add to Redis queue for async processing
 * 3. Return 200 immediately
 * 4. Worker processes webhook from queue
 */

import { Router, Request, Response } from 'express';
import { livekitService } from '../services/livekit.service.js';
import { queueService } from '../services/queue.service.js';

const router = Router();

/**
 * POST /api/v1/webhooks/livekit
 * Handle LiveKit webhook events
 *
 * This endpoint is called by LiveKit when events occur (participant joined/left, room started/finished, etc.)
 * LiveKit signs the webhook payload, which we verify before processing
 *
 * Events handled:
 * - participant_joined: Participant connected to room
 * - participant_left: Participant disconnected from room
 * - room_started: Room became active
 * - room_finished: Room was closed
 *
 * IMPORTANT: Raw body parsing is handled at the app level (index.ts) for all /api/v1/webhooks routes
 *
 * Flow:
 * 1. Signature verification (security)
 * 2. Add to queue (asynchronous, non-blocking)
 * 3. Return 200 immediately (LiveKit requirement)
 * 4. Worker processes webhook from queue with deduplication and transaction safety
 */
router.post('/livekit', async (req: Request, res: Response) => {
    try {
      // Ensure we have a Buffer body
      if (!Buffer.isBuffer(req.body)) {
        console.error('[Webhook] Body is not a Buffer:', typeof req.body);
        res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: 'Invalid webhook body format',
        });
        return;
      }

      // Get the raw body (Buffer) and convert to string for signature verification
      const rawBody = req.body.toString('utf-8');
      const authHeader = req.headers.authorization || '';

      // Verify webhook signature (CRITICAL: Do this before queueing)
      const event = livekitService.verifyWebhook(rawBody, authHeader);

      if (!event) {
        // Invalid signature - reject immediately
        console.warn('[Webhook] Received webhook with invalid signature');
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid webhook signature',
        });
        return;
      }

      // Webhook is valid - add to queue for processing
      console.log(`[Webhook] Received ${event.event} event (webhook ID: ${event.id})`);

      await queueService.addWebhookJob({
        webhookId: event.id,
        event: event.event,
        payload: event,
        receivedAt: new Date().toISOString(),
      });

      // Respond immediately to LiveKit (they expect a 200 response)
      // Processing will happen asynchronously via the queue worker
      res.status(200).json({
        success: true,
        message: 'Webhook queued for processing',
      });
    } catch (error) {
      console.error('[Webhook] Error handling webhook:', error);

      // Still return 200 to prevent LiveKit from retrying
      // Worker will handle failed jobs with exponential backoff
      res.status(200).json({
        success: true,
        message: 'Webhook received',
      });
    }
  }
);

export default router;
