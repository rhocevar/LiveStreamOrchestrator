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
  onJoin?: (livestream: Livestream) => void;
  onDelete?: (livestream: Livestream) => void;
  currentUserId?: string; // For checking if user can delete
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

export const LivestreamCard: React.FC<LivestreamCardProps> = ({
  livestream,
  onJoin,
  onDelete,
  currentUserId,
}) => {
  const [viewerCount, setViewerCount] = useState<number | null>(null);

  // Only connect to SSE for LIVE streams
  const isLive = livestream.status === LivestreamStatus.LIVE;

  // Check if current user is the creator
  const canDelete = currentUserId && livestream.createdBy === currentUserId;

  const { state: streamState } = useSSE({
    livestreamId: livestream.id,
    enabled: isLive,
  });

  // Update viewer count when stream state changes
  useEffect(() => {
    if (streamState) {
      setViewerCount(streamState.viewerCount);
    }
  }, [streamState]);

  return (
    <Card className="h-full flex flex-col group cursor-pointer hover:shadow-lg transition-shadow">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-200 dark:border-gray-700"
        onClick={() => isLive && onJoin?.(livestream)}
      >
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
      <div
        className="p-4 flex-1"
        onClick={() => isLive && onJoin?.(livestream)}
      >
        <div className="space-y-2">
          {/* Participant Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Participants:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isLive && viewerCount !== null ? (
                <span className="flex items-center gap-1">
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

          {/* Creator Info */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0">Creator:</span>
            <div className="flex items-center justify-end gap-1 flex-1 min-w-0">
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate" title={livestream.createdBy}>
                {livestream.createdBy}
              </span>
              {canDelete && (
                <span
                  className="text-xs text-green-600 dark:text-green-400 flex-shrink-0"
                  title="You created this stream"
                >
                  (you)
                </span>
              )}
            </div>
          </div>

          {/* Join Button (only show for LIVE streams) */}
          {isLive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoin?.(livestream);
              }}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              Join Stream
            </button>
          )}

          {/* Delete Button (only show for creator) */}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this livestream?')) {
                  onDelete?.(livestream);
                }
              }}
              className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              Delete Livestream
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default LivestreamCard;
