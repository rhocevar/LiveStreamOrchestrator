/**
 * Webhook Cleanup Job
 * Periodically removes expired webhook records from the database
 *
 * Purpose: Prevent unbounded growth of webhook_events table
 * Frequency: Runs every hour
 * Retention: Keeps webhooks for 24 hours (configurable via expiresAt)
 */

import { databaseService } from '../services/database.service.js';

// Cleanup interval in milliseconds (1 hour)
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Run cleanup once
 * @returns Number of webhooks deleted
 */
export async function runCleanup(): Promise<number> {
  try {
    const deletedCount = await databaseService.cleanupOldWebhooks();

    if (deletedCount > 0) {
      console.log(`[Cleanup] Removed ${deletedCount} expired webhook records`);
    }

    return deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error during webhook cleanup:', error);
    return 0;
  }
}

/**
 * Start the periodic cleanup job
 */
export function startCleanupJob(): void {
  console.log('[Cleanup] Starting periodic webhook cleanup job...');

  // Run immediately on startup
  runCleanup();

  // Schedule periodic cleanup
  cleanupTimer = setInterval(() => {
    runCleanup();
  }, CLEANUP_INTERVAL_MS);

  console.log(`[Cleanup] Webhook cleanup job started (runs every ${CLEANUP_INTERVAL_MS / 1000 / 60} minutes)`);
}

/**
 * Stop the cleanup job gracefully
 */
export function stopCleanupJob(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('[Cleanup] Webhook cleanup job stopped');
  }
}
