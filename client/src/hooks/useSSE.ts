/**
 * useSSE Hook
 * Manages Server-Sent Events (SSE) connections for real-time livestream updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { StreamState, StateEventType } from '../types/api.types';

interface UseSSEOptions {
  livestreamId: string;
  enabled?: boolean; // Allow disabling the connection
  onStateUpdate?: (state: StreamState) => void;
  onEvent?: (type: StateEventType, state: StreamState) => void;
  onError?: (error: Event) => void;
}

interface UseSSEReturn {
  state: StreamState | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

/**
 * Custom hook to subscribe to SSE events for a livestream
 */
export const useSSE = (options: UseSSEOptions): UseSSEReturn => {
  const { livestreamId, enabled = true, onStateUpdate, onEvent, onError } = options;

  const [state, setState] = useState<StreamState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);

  // Use refs for callbacks to prevent reconnections when they change
  const onStateUpdateRef = useRef(onStateUpdate);
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate;
    onEventRef.current = onEvent;
    onErrorRef.current = onError;
  }, [onStateUpdate, onEvent, onError]);

  /**
   * Create and manage SSE connection
   */
  const connect = useCallback(() => {
    if (!enabled || !livestreamId) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Create new EventSource connection
      const eventSource = new EventSource(`/api/v1/livestreams/${livestreamId}/events`);
      eventSourceRef.current = eventSource;

      // Handle connection open
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      // Handle initial state event (sent immediately on connection)
      eventSource.addEventListener('state', (e: MessageEvent) => {
        try {
          const streamState: StreamState = JSON.parse(e.data);
          setState(streamState);
          onStateUpdateRef.current?.(streamState);
          onEventRef.current?.('state', streamState);
        } catch (err) {
          console.error('Failed to parse state event:', err);
        }
      });

      // Handle room_started event
      eventSource.addEventListener('room_started', (e: MessageEvent) => {
        try {
          const streamState: StreamState = JSON.parse(e.data);
          setState(streamState);
          onStateUpdateRef.current?.(streamState);
          onEventRef.current?.('room_started', streamState);
        } catch (err) {
          console.error('Failed to parse room_started event:', err);
        }
      });

      // Handle viewer_count_update event
      eventSource.addEventListener('viewer_count_update', (e: MessageEvent) => {
        try {
          const streamState: StreamState = JSON.parse(e.data);
          setState(streamState);
          onStateUpdateRef.current?.(streamState);
          onEventRef.current?.('viewer_count_update', streamState);
        } catch (err) {
          console.error('Failed to parse viewer_count_update event:', err);
        }
      });

      // Handle room_ended event
      eventSource.addEventListener('room_ended', (e: MessageEvent) => {
        try {
          const streamState: StreamState = JSON.parse(e.data);
          setState(streamState);
          onStateUpdateRef.current?.(streamState);
          onEventRef.current?.('room_ended', streamState);

          // Close connection after stream ends
          eventSource.close();
          setIsConnected(false);
          shouldReconnectRef.current = false;
        } catch (err) {
          console.error('Failed to parse room_ended event:', err);
        }
      });

      // Handle errors
      eventSource.onerror = (e: Event) => {
        const readyState = eventSource.readyState;

        // EventSource.CLOSED (2) means connection permanently failed (e.g., 404, stream ended)
        // EventSource.CONNECTING (0) means temporary network issue
        // EventSource.OPEN (1) shouldn't happen in onerror

        if (readyState === EventSource.CLOSED) {
          // Permanent failure - don't retry (stream likely deleted or ended)
          console.log('SSE connection closed permanently (stream may have ended)');
          setIsConnected(false);
          setError(null); // Don't show error for graceful closures
          shouldReconnectRef.current = false;
          onErrorRef.current?.(e);
        } else {
          // Temporary connection issue - retry
          console.error('SSE connection error (temporary):', e);
          setIsConnected(false);
          setError('Connection error');
          onErrorRef.current?.(e);

          // Attempt to reconnect after 5 seconds (if not ended)
          if (shouldReconnectRef.current && enabled) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 5000);
          }
        }

        // Close the connection
        eventSource.close();
      };
    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setError('Failed to connect');
      setIsConnected(false);
    }
  }, [livestreamId, enabled]);

  /**
   * Manual reconnect function
   */
  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    connect();
  }, [connect]);

  /**
   * Setup connection on mount and cleanup on unmount
   */
  useEffect(() => {
    if (enabled && livestreamId) {
      shouldReconnectRef.current = true;
      connect();
    }

    // Cleanup function
    return () => {
      shouldReconnectRef.current = false;

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close EventSource connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsConnected(false);
    };
  }, [livestreamId, enabled, connect]); // connect is stable now (only depends on livestreamId and enabled)

  return {
    state,
    isConnected,
    error,
    reconnect,
  };
};

export default useSSE;
