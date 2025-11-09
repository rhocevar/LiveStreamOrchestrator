/**
 * LivestreamCard Component
 * Displays a single livestream with real-time participant count via SSE
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LivestreamStatus } from '../../types/api.types';
import type { Livestream, StreamState } from '../../types/api.types';
import { useSSE } from '../../hooks/useSSE';

interface LivestreamCardProps {
  livestream: Livestream;
}

/**
 * Format date to readable string
 */
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Truncate description if too long
 */
const truncateText = (text: string | null, maxLength: number = 100): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const LivestreamCard: React.FC<LivestreamCardProps> = ({ livestream }) => {
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  // Only connect to SSE for LIVE streams
  const isLive = livestream.status === LivestreamStatus.LIVE;

  const { state: streamState } = useSSE({
    livestreamId: livestream.id,
    enabled: isLive,
    onStateUpdate: (state: StreamState) => {
      setViewerCount(state.viewerCount);
    },
  });

  // Update viewer count when stream state changes
  useEffect(() => {
    if (streamState) {
      setViewerCount(streamState.viewerCount);
    }
  }, [streamState]);

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 flex-1">
            {livestream.title}
          </h3>
          <Badge status={livestream.status} />
        </div>

        {livestream.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {truncateText(livestream.description, 120)}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1">
        <div className="space-y-2">
          {/* Participant Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Participants:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isLive && viewerCount !== null ? (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  {viewerCount}
                </span>
              ) : (
                '—'
              )}
            </span>
          </div>

          {/* Started At */}
          {livestream.startedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Started:</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {formatDate(livestream.startedAt)}
              </span>
            </div>
          )}

          {/* Ended At (only if ended) */}
          {livestream.status === LivestreamStatus.ENDED && livestream.endedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Ended:</span>
              <span className="text-sm text-gray-900 dark:text-white">
                {formatDate(livestream.endedAt)}
              </span>
            </div>
          )}

          {/* Room Name */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-500">Room:</span>
            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
              {livestream.roomName}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LivestreamCard;
