import { Redis } from 'ioredis';
import type { Response } from 'express';
import type {
  StreamState,
  StreamStateEvent,
  StateEventType,
  HostInfo,
} from '../types/livestream.types.js';

/**
 * State Service for managing real-time stream state
 *
 * Architecture:
 * - Stream state stored in Redis (ephemeral, 24h TTL)
 * - Redis Pub/Sub for broadcasting state changes
 * - Server-Sent Events (SSE) for client subscriptions
 * - Viewer count throttling to prevent excessive broadcasts
 */

interface SSEConnection {
  res: Response;
  livestreamId: string;
  connectedAt: Date;
}

interface ViewerCountThrottle {
  lastBroadcastCount: number;
  lastBroadcastTime: number;
}

class StateService {
  private redisClient: Redis;
  private redisPubClient: Redis;
  private redisSubClient: Redis;
  private sseConnections: Map<string, SSEConnection[]> = new Map();
  private viewerCountThrottles: Map<string, ViewerCountThrottle> = new Map();
  private subscribedChannels: Set<string> = new Set(); // Track Redis Pub/Sub subscriptions

  // Configuration
  private readonly STATE_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly VIEWER_COUNT_THROTTLE_MS = 5000; // 5 seconds
  private readonly VIEWER_COUNT_THRESHOLD_PERCENT = 0.1; // 10%
  private readonly VIEWER_COUNT_THRESHOLD_ABSOLUTE = 5; // 5 viewers

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Main Redis client for state operations
    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Separate clients for Pub/Sub (required by Redis)
    this.redisPubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.redisSubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Set up global message handler (single handler for all channels)
    this.redisSubClient.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message);
    });

    console.log('[State Service] Initialized Redis connections');
  }

  /**
   * Global message handler for all Redis Pub/Sub channels
   * Routes messages to appropriate SSE clients based on channel name
   */
  private handleRedisMessage(channel: string, message: string): void {
    try {
      // Extract livestreamId from channel name (format: stream:events:{livestreamId})
      const livestreamId = this.extractLivestreamIdFromChannel(channel);
      if (!livestreamId) {
        console.warn(`[State Service] Invalid channel format: ${channel}`);
        return;
      }

      // Parse and broadcast event
      const event: StreamStateEvent = JSON.parse(message);
      this.broadcastToSSEClients(livestreamId, event);
    } catch (error) {
      console.error('[State Service] Error handling Redis message:', error);
    }
  }

  /**
   * Extract livestreamId from Redis channel name
   * Channel format: stream:events:{livestreamId}
   */
  private extractLivestreamIdFromChannel(channel: string): string | null {
    const prefix = 'stream:events:';
    if (!channel.startsWith(prefix)) {
      return null;
    }
    return channel.substring(prefix.length);
  }

  /**
   * Initialize stream state when room starts
   */
  async initializeState(
    livestreamId: string,
    hostInfo: HostInfo,
    startedAt: Date = new Date()
  ): Promise<StreamState> {
    const state: StreamState = {
      streamId: livestreamId,
      status: 'LIVE',
      participants: [],
      startedAt: startedAt.toISOString(),
      viewerCount: 0,
      totalViewers: 0,
      peakViewerCount: 0,
      hostInfo,
    };

    await this.setState(livestreamId, state);
    console.log(`[State Service] Initialized state for stream ${livestreamId}`);

    return state;
  }

  /**
   * Get current state for a livestream
   */
  async getState(livestreamId: string): Promise<StreamState | null> {
    try {
      const key = this.getStateKey(livestreamId);
      const stateJson = await this.redisClient.get(key);

      if (!stateJson) {
        return null;
      }

      return JSON.parse(stateJson) as StreamState;
    } catch (error) {
      console.error(
        `[State Service] Error getting state for ${livestreamId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Set state for a livestream
   */
  private async setState(
    livestreamId: string,
    state: StreamState
  ): Promise<void> {
    const key = this.getStateKey(livestreamId);
    const stateJson = JSON.stringify(state);

    await this.redisClient.setex(key, this.STATE_TTL, stateJson);
  }

  /**
   * Update state when participant joins
   */
  async handleParticipantJoined(
    livestreamId: string,
    userId: string
  ): Promise<void> {
    const state = await this.getState(livestreamId);
    if (!state) {
      console.warn(
        `[State Service] State not found for ${livestreamId}, skipping participant join`
      );
      return;
    }

    // Add participant if not already in list
    if (!state.participants.includes(userId)) {
      state.participants.push(userId);
      state.viewerCount = state.participants.length;
      state.totalViewers += 1;

      // Update peak if necessary
      if (state.viewerCount > state.peakViewerCount) {
        state.peakViewerCount = state.viewerCount;
      }

      await this.setState(livestreamId, state);
      console.log(
        `[State Service] Participant ${userId} joined ${livestreamId}, viewer count: ${state.viewerCount}`
      );

      // Check if we should broadcast viewer count update
      await this.checkAndBroadcastViewerCount(livestreamId, state);
    }
  }

  /**
   * Update state when participant leaves
   */
  async handleParticipantLeft(
    livestreamId: string,
    userId: string
  ): Promise<void> {
    const state = await this.getState(livestreamId);
    if (!state) {
      console.warn(
        `[State Service] State not found for ${livestreamId}, skipping participant leave`
      );
      return;
    }

    // Remove participant from list
    const index = state.participants.indexOf(userId);
    if (index > -1) {
      state.participants.splice(index, 1);
      state.viewerCount = state.participants.length;

      await this.setState(livestreamId, state);
      console.log(
        `[State Service] Participant ${userId} left ${livestreamId}, viewer count: ${state.viewerCount}`
      );

      // Check if we should broadcast viewer count update
      await this.checkAndBroadcastViewerCount(livestreamId, state);
    }
  }

  /**
   * Mark stream as ended
   */
  async handleRoomEnded(livestreamId: string): Promise<void> {
    const state = await this.getState(livestreamId);
    if (!state) {
      console.warn(
        `[State Service] State not found for ${livestreamId}, skipping room end`
      );
      return;
    }

    state.status = 'ENDED';
    await this.setState(livestreamId, state);
    console.log(`[State Service] Stream ${livestreamId} ended`);

    // Broadcast room_ended event
    await this.broadcastStateEvent(livestreamId, 'room_ended', state);

    // Close all SSE connections for this stream
    this.closeConnectionsForStream(livestreamId);
  }

  /**
   * Check if viewer count update should be broadcast based on throttling rules
   */
  private async checkAndBroadcastViewerCount(
    livestreamId: string,
    state: StreamState
  ): Promise<void> {
    const throttle = this.viewerCountThrottles.get(livestreamId);
    const now = Date.now();
    const currentCount = state.viewerCount;

    // First broadcast - always send
    if (!throttle) {
      this.viewerCountThrottles.set(livestreamId, {
        lastBroadcastCount: currentCount,
        lastBroadcastTime: now,
      });
      await this.broadcastStateEvent(
        livestreamId,
        'viewer_count_update',
        state
      );
      return;
    }

    // Check throttle rules
    const timeSinceLastBroadcast = now - throttle.lastBroadcastTime;
    const countDelta = Math.abs(currentCount - throttle.lastBroadcastCount);
    const percentChange =
      throttle.lastBroadcastCount > 0
        ? countDelta / throttle.lastBroadcastCount
        : 1;

    // Broadcast if:
    // 1. Enough time has passed (5 seconds)
    // 2. Count changed by >= 10% OR >= 5 viewers
    const shouldBroadcast =
      timeSinceLastBroadcast >= this.VIEWER_COUNT_THROTTLE_MS &&
      (percentChange >= this.VIEWER_COUNT_THRESHOLD_PERCENT ||
        countDelta >= this.VIEWER_COUNT_THRESHOLD_ABSOLUTE);

    if (shouldBroadcast) {
      this.viewerCountThrottles.set(livestreamId, {
        lastBroadcastCount: currentCount,
        lastBroadcastTime: now,
      });
      await this.broadcastStateEvent(
        livestreamId,
        'viewer_count_update',
        state
      );
      console.log(
        `[State Service] Broadcast viewer count update for ${livestreamId}: ${currentCount}`
      );
    }
  }

  /**
   * Broadcast state event via Redis Pub/Sub
   */
  async broadcastStateEvent(
    livestreamId: string,
    eventType: StateEventType,
    state: StreamState
  ): Promise<void> {
    const event: StreamStateEvent = {
      type: eventType,
      data: state,
      timestamp: new Date().toISOString(),
    };

    const channel = this.getPubSubChannel(livestreamId);
    await this.redisPubClient.publish(channel, JSON.stringify(event));

    console.log(
      `[State Service] Broadcast ${eventType} event for ${livestreamId}`
    );
  }

  /**
   * Subscribe to state events for a livestream (SSE)
   */
  async subscribeToStateEvents(
    livestreamId: string,
    res: Response
  ): Promise<void> {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial comment to establish connection
    res.write(': connected\n\n');
    res.flushHeaders();

    // Store connection
    const connection: SSEConnection = {
      res,
      livestreamId,
      connectedAt: new Date(),
    };

    if (!this.sseConnections.has(livestreamId)) {
      this.sseConnections.set(livestreamId, []);
    }
    this.sseConnections.get(livestreamId)!.push(connection);

    const connectionCount = this.sseConnections.get(livestreamId)!.length;
    console.log(
      `[State Service] SSE connection established for ${livestreamId} (total: ${connectionCount})`
    );

    // Subscribe to Redis channel if this is the first connection for this stream
    if (connectionCount === 1) {
      await this.subscribeToRedisChannel(livestreamId);
    }

    // Send current state immediately
    const currentState = await this.getState(livestreamId);
    if (currentState) {
      this.sendSSEEvent(res, 'state', currentState);
    }

    // Handle client disconnect
    res.on('close', () => {
      this.removeSSEConnection(livestreamId, connection);
    });
  }

  /**
   * Subscribe to Redis Pub/Sub channel for a livestream
   * Only subscribes if not already subscribed (prevents duplicate handlers)
   */
  private async subscribeToRedisChannel(livestreamId: string): Promise<void> {
    const channel = this.getPubSubChannel(livestreamId);

    // Check if already subscribed
    if (this.subscribedChannels.has(channel)) {
      console.log(
        `[State Service] Already subscribed to channel: ${channel}`
      );
      return;
    }

    // Subscribe to channel
    await this.redisSubClient.subscribe(channel);
    this.subscribedChannels.add(channel);
    console.log(`[State Service] Subscribed to Redis channel: ${channel}`);
  }

  /**
   * Broadcast event to all SSE clients for a livestream
   */
  private broadcastToSSEClients(
    livestreamId: string,
    event: StreamStateEvent
  ): void {
    const connections = this.sseConnections.get(livestreamId);
    if (!connections || connections.length === 0) {
      return;
    }

    connections.forEach((connection) => {
      this.sendSSEEvent(connection.res, event.type, event.data);
    });

    console.log(
      `[State Service] Broadcast ${event.type} to ${connections.length} SSE clients for ${livestreamId}`
    );
  }

  /**
   * Send SSE event to a client
   */
  private sendSSEEvent(res: Response, event: string, data: any): void {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('[State Service] Error sending SSE event:', error);
    }
  }

  /**
   * Remove an SSE connection
   */
  private removeSSEConnection(
    livestreamId: string,
    connection: SSEConnection
  ): void {
    const connections = this.sseConnections.get(livestreamId);
    if (!connections) {
      return;
    }

    const index = connections.indexOf(connection);
    if (index > -1) {
      connections.splice(index, 1);
      console.log(
        `[State Service] SSE connection closed for ${livestreamId} (remaining: ${connections.length})`
      );

      // Unsubscribe from Redis if no more connections
      if (connections.length === 0) {
        this.sseConnections.delete(livestreamId);
        this.unsubscribeFromRedisChannel(livestreamId);
      }
    }
  }

  /**
   * Close all SSE connections for a stream
   */
  private closeConnectionsForStream(livestreamId: string): void {
    const connections = this.sseConnections.get(livestreamId);
    if (!connections) {
      return;
    }

    connections.forEach((connection) => {
      try {
        connection.res.end();
      } catch (error) {
        console.error('[State Service] Error closing SSE connection:', error);
      }
    });

    this.sseConnections.delete(livestreamId);
    this.unsubscribeFromRedisChannel(livestreamId);
    console.log(
      `[State Service] Closed ${connections.length} SSE connections for ${livestreamId}`
    );
  }

  /**
   * Unsubscribe from Redis Pub/Sub channel
   */
  private async unsubscribeFromRedisChannel(
    livestreamId: string
  ): Promise<void> {
    const channel = this.getPubSubChannel(livestreamId);

    // Only unsubscribe if currently subscribed
    if (this.subscribedChannels.has(channel)) {
      await this.redisSubClient.unsubscribe(channel);
      this.subscribedChannels.delete(channel);
      console.log(`[State Service] Unsubscribed from Redis channel: ${channel}`);
    }
  }

  /**
   * Get Redis key for stream state
   */
  private getStateKey(livestreamId: string): string {
    return `stream:state:${livestreamId}`;
  }

  /**
   * Get Redis Pub/Sub channel for stream events
   */
  private getPubSubChannel(livestreamId: string): string {
    return `stream:events:${livestreamId}`;
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    activeConnections: number;
    subscribedStreams: number;
  }> {
    try {
      await this.redisClient.ping();

      const activeConnections = Array.from(this.sseConnections.values()).reduce(
        (sum, connections) => sum + connections.length,
        0
      );

      return {
        isHealthy: true,
        activeConnections,
        subscribedStreams: this.sseConnections.size,
      };
    } catch (error) {
      console.error('[State Service] Health check failed:', error);
      return {
        isHealthy: false,
        activeConnections: 0,
        subscribedStreams: 0,
      };
    }
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[State Service] Shutting down gracefully...');

    // Close all SSE connections
    for (const [livestreamId] of this.sseConnections) {
      this.closeConnectionsForStream(livestreamId);
    }

    // Clear subscribed channels tracking
    this.subscribedChannels.clear();

    // Remove global message handler
    this.redisSubClient.removeAllListeners('message');

    // Close Redis connections
    await this.redisClient.quit();
    await this.redisPubClient.quit();
    await this.redisSubClient.quit();

    console.log('[State Service] Shutdown complete');
  }
}

// Singleton instance
export const stateService = new StateService();
