/**
 * Livestream Reconciliation Job
 * Periodically reconciles database livestream state with LiveKit room state
 *
 * Purpose: Handle edge cases where webhooks are missed or fail
 * Frequency: Runs every 10 minutes (configurable via RECONCILIATION_INTERVAL_MINUTES)
 * Action: Marks stale LIVE livestreams as ENDED when LiveKit room no longer exists
 *
 * Edge Cases Handled:
 * - Missed room_finished webhooks (server downtime, network issues)
 * - Rooms manually deleted from LiveKit dashboard
 * - Webhook delivery failures
 * - Race conditions during room cleanup
 */

import { livekitService } from '../services/livekit.service.js';
import { databaseService } from '../services/database.service.js';
import { stateService } from '../services/state.service.js';

// Reconciliation interval in minutes (default: 10 minutes)
const RECONCILIATION_INTERVAL_MINUTES =
  parseInt(process.env.RECONCILIATION_INTERVAL_MINUTES || '10', 10);
const RECONCILIATION_INTERVAL_MS = RECONCILIATION_INTERVAL_MINUTES * 60 * 1000;

let reconciliationTimer: NodeJS.Timeout | null = null;

/**
 * Reconciliation statistics
 */
interface ReconciliationStats {
  totalLiveLivestreams: number;
  staleLivestreams: number;
  participantsUpdated: number;
  errors: number;
}

/**
 * Run reconciliation once
 * @returns Reconciliation statistics
 */
export async function runReconciliation(): Promise<ReconciliationStats> {
  const stats: ReconciliationStats = {
    totalLiveLivestreams: 0,
    staleLivestreams: 0,
    participantsUpdated: 0,
    errors: 0,
  };

  try {
    console.log('[Reconciliation] Starting livestream reconciliation...');

    // 1. Get all LIVE livestreams from database
    const liveLivestreams = await databaseService.listLivestreams({
      status: 'LIVE',
    });
    stats.totalLiveLivestreams = liveLivestreams.length;

    if (liveLivestreams.length === 0) {
      console.log('[Reconciliation] No LIVE livestreams found in database');
      return stats;
    }

    console.log(
      `[Reconciliation] Found ${liveLivestreams.length} LIVE livestreams in database`
    );

    // 2. Get all active rooms from LiveKit
    const liveKitRooms = await livekitService.listRooms();
    const liveKitRoomNames = new Set(liveKitRooms.map((room) => room.name));

    console.log(
      `[Reconciliation] Found ${liveKitRooms.length} active rooms in LiveKit`
    );

    // 3. Find stale livestreams (marked LIVE but room doesn't exist in LiveKit)
    const staleLivestreams = liveLivestreams.filter(
      (livestream) => !liveKitRoomNames.has(livestream.roomName)
    );
    stats.staleLivestreams = staleLivestreams.length;

    if (staleLivestreams.length === 0) {
      console.log('[Reconciliation] No stale livestreams detected. All in sync.');
      return stats;
    }

    console.log(
      `[Reconciliation] Found ${staleLivestreams.length} stale livestreams to reconcile`
    );

    // 4. Reconcile each stale livestream
    for (const livestream of staleLivestreams) {
      try {
        console.log(
          `[Reconciliation] Reconciling livestream ${livestream.id} (room: ${livestream.roomName})`
        );

        // Get all active participants
        const activeParticipants = await databaseService.listParticipants({
          livestreamId: livestream.id,
          status: 'JOINED',
        });

        console.log(
          `[Reconciliation] Found ${activeParticipants.length} active participants to mark as LEFT`
        );

        // Mark each participant as LEFT using SID-based method (transaction-safe)
        let participantUpdateCount = 0;
        for (const participant of activeParticipants) {
          if (participant.livekitParticipantSid) {
            const updated = await databaseService.markParticipantAsLeftBySid(
              participant.livekitParticipantSid
            );
            if (updated) {
              participantUpdateCount++;
            }
          } else {
            // Fallback for participants without LiveKit SID (shouldn't happen in normal flow)
            console.warn(
              `[Reconciliation] Participant ${participant.id} missing livekitParticipantSid`
            );
          }
        }

        stats.participantsUpdated += participantUpdateCount;
        console.log(
          `[Reconciliation] Marked ${participantUpdateCount} participants as LEFT`
        );

        // Update livestream status to ENDED
        await databaseService.updateLivestream(livestream.id, {
          status: 'ENDED',
          endedAt: new Date(),
        });
        console.log(
          `[Reconciliation] Updated livestream ${livestream.id} status to ENDED`
        );

        // Cleanup state and broadcast SSE event (closes connections, updates Redis)
        await stateService.handleRoomEnded(livestream.id);
        console.log(
          `[Reconciliation] Cleaned up state for livestream ${livestream.id}`
        );

        console.log(
          `[Reconciliation] Successfully reconciled livestream ${livestream.id}`
        );
      } catch (error) {
        stats.errors++;
        console.error(
          `[Reconciliation] Error reconciling livestream ${livestream.id}:`,
          error
        );
        // Continue with next livestream (don't let one error stop entire job)
      }
    }

    // Log final summary
    console.log(
      `[Reconciliation] Completed. Stats: ${stats.staleLivestreams} stale livestreams reconciled, ${stats.participantsUpdated} participants updated, ${stats.errors} errors`
    );

    return stats;
  } catch (error) {
    console.error('[Reconciliation] Fatal error during reconciliation:', error);
    stats.errors++;
    return stats;
  }
}

/**
 * Start the periodic reconciliation job
 */
export function startReconciliationJob(): void {
  console.log('[Reconciliation] Starting periodic livestream reconciliation job...');

  // Run immediately on startup
  runReconciliation();

  // Schedule periodic reconciliation
  reconciliationTimer = setInterval(() => {
    runReconciliation();
  }, RECONCILIATION_INTERVAL_MS);

  console.log(
    `[Reconciliation] Job started (runs every ${RECONCILIATION_INTERVAL_MINUTES} minutes)`
  );
}

/**
 * Stop the reconciliation job gracefully
 */
export function stopReconciliationJob(): void {
  if (reconciliationTimer) {
    clearInterval(reconciliationTimer);
    reconciliationTimer = null;
    console.log('[Reconciliation] Livestream reconciliation job stopped');
  }
}
