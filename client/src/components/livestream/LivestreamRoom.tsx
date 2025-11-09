/**
 * LivestreamRoom Component
 * Connects to a LiveKit room and displays video/audio streams
 */

import { useEffect, useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';
import type { Livestream } from '../../types/api.types';
import { apiService } from '../../services/api.service';
import { Spinner } from '../ui/Spinner';

interface LivestreamRoomProps {
  livestream: Livestream;
  onLeave: () => void;
}

interface JoinData {
  token: string;
  url: string;
}

/**
 * LivestreamRoom component
 * Handles joining a LiveKit room and displaying participants
 */
export const LivestreamRoom: React.FC<LivestreamRoomProps> = ({
  livestream,
  onLeave,
}) => {
  const [joinData, setJoinData] = useState<JoinData | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const [displayName, setDisplayName] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Join the livestream when component mounts
  useEffect(() => {
    if (isReady && displayName) {
      joinLivestream();
    }
  }, [isReady, displayName]);

  /**
   * Join the livestream via API
   */
  const joinLivestream = async () => {
    try {
      setIsJoining(true);
      setError(null);

      const response = await apiService.joinLivestream(livestream.id, {
        userId,
        displayName: displayName || 'Anonymous',
        role: 'VIEWER',
      });

      setJoinData({
        token: response.data.token,
        url: response.data.url,
      });
    } catch (err) {
      console.error('Failed to join livestream:', err);
      setError(err instanceof Error ? err.message : 'Failed to join livestream');
    } finally {
      setIsJoining(false);
    }
  };

  /**
   * Leave the livestream
   */
  const handleLeave = async () => {
    try {
      await apiService.leaveLivestream(livestream.id, userId);
    } catch (err) {
      console.error('Failed to leave livestream:', err);
    }
    onLeave();
  };

  /**
   * Handle display name submission
   */
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      setIsReady(true);
    }
  };

  // Show name input form
  if (!isReady) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Join Livestream
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {livestream.title}
          </p>

          <form onSubmit={handleJoin}>
            <div className="mb-4">
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!displayName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Join
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isJoining || !joinData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-white mt-4">Joining livestream...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
            Connection Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={onLeave}
            className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show LiveKit room
  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header with leave button */}
      <div className="top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="items-center">
          <div className="text-white">
            <h2 className="text-xl font-bold">Room: {livestream.title}</h2>
            <p className="text-sm text-gray-300">Description: {livestream.description}</p>
            <p className="text-sm text-gray-300">Participant name: {displayName}</p>
          </div>
          <div>
            <button
              onClick={handleLeave}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* LiveKit Room */}
      <LiveKitRoom
        video={false}
        audio={false}
        token={joinData.token}
        serverUrl={joinData.url}
        connect={true}
        onDisconnected={handleLeave}
        className="h-full"
      >
      </LiveKitRoom>
    </div>
  );
};

export default LivestreamRoom;
