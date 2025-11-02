/**
 * Webhook Worker
 * Processes webhooks from the Redis queue with deduplication and transaction safety
 *
 * Features:
 * - Deduplication: Prevents processing same webhook multiple times
 * - Transaction safety: Uses database transactions for consistency
 * - Automatic retries: Failed jobs retry with exponential backoff
 * - Concurrency control: Processes multiple webhooks in parallel (configurable)
 */

import { queueService, type WebhookJob } from '../services/queue.service.js';
import { livestreamService } from '../services/livestream.service.js';
import { databaseService } from '../services/database.service.js';
import type { WebhookEvent } from '../types/livestream.types.js';

/**
 * Process a single webhook job
 * @param job - Webhook job data from queue
 */
async function processWebhook(job: WebhookJob): Promise<void> {
  const { webhookId, event, payload } = job;

  console.log(`[Worker] Processing webhook ${webhookId} (event: ${event})`);

  try {
    // Step 1: Check if webhook was already processed (deduplication)
    const alreadyProcessed = await databaseService.checkWebhookProcessed(webhookId);

    if (alreadyProcessed) {
      console.log(
        `[Worker] Webhook ${webhookId} already processed (deduplication skip)`
      );
      return; // Idempotent - don't process again
    }

    // Step 2: Record webhook as being processed (prevents race conditions)
    // This happens BEFORE processing to handle concurrent workers
    await databaseService.recordWebhookProcessed(webhookId, event);

    // Step 3: Process the webhook event via livestream service
    // This will handle all the business logic (updating participants, etc.)
    await livestreamService.handleWebhookEvent(payload as WebhookEvent);

    console.log(`[Worker] Successfully processed webhook ${webhookId}`);
  } catch (error) {
    console.error(`[Worker] Error processing webhook ${webhookId}:`, error);

    // Throw error to trigger BullMQ retry mechanism
    throw error;
  }
}

/**
 * Start the webhook worker
 * Call this function when server starts
 */
export function startWebhookWorker(): void {
  console.log('[Worker] Starting webhook worker...');

  // Start the worker with our processing function
  queueService.startWorker(processWebhook);

  console.log('[Worker] Webhook worker started successfully');
}

/**
 * Stop the webhook worker gracefully
 * Call this function when server shuts down
 */
export async function stopWebhookWorker(): Promise<void> {
  console.log('[Worker] Stopping webhook worker...');

  await queueService.shutdown();

  console.log('[Worker] Webhook worker stopped');
}
