/**
 * Webhook API Routes
 * Handles webhooks from external services like LiveKit
 */

import { Router, Request, Response } from 'express';
import { livekitService } from '../services/livekit.service.js';
import { livestreamService } from '../services/livestream.service.js';

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
 */
router.post('/livekit', async (req: Request, res: Response) => {
  try {
    // Get the raw body as string for signature verification
    const rawBody = JSON.stringify(req.body);
    const authHeader = req.headers.authorization || '';

    // Verify webhook signature
    const event = livekitService.verifyWebhook(rawBody, authHeader);

    if (!event) {
      // Invalid signature
      console.warn('Received webhook with invalid signature');
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
      });
      return;
    }

    // Process the webhook event
    await livestreamService.handleWebhookEvent(event);

    // Respond immediately to LiveKit (they expect a 200 response)
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('Error processing webhook:', error);

    // Still return 200 to prevent LiveKit from retrying
    // We've already logged the error for investigation
    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  }
});

export default router;
