/**
 * LivestreamGrid Component
 * Grid container for livestream cards with infinite scroll
 */

import React, { useRef, useEffect, useCallback } from 'react';
import type { Livestream } from '../../types/api.types';
import { LivestreamCard } from './LivestreamCard';
import { Spinner } from '../ui/Spinner';

interface LivestreamGridProps {
  livestreams: Livestream[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onJoinLivestream?: (livestream: Livestream) => void;
  onDeleteLivestream?: (livestream: Livestream) => void;
  currentUserId?: string;
  error?: string | null;
}

export const LivestreamGrid: React.FC<LivestreamGridProps> = ({
  livestreams,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onJoinLivestream,
  onDeleteLivestream,
  currentUserId,
  error,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Intersection Observer callback for infinite scroll
   */
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, isLoading, onLoadMore]
  );

  /**
   * Setup Intersection Observer for infinite scroll
   */
  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '100px', // Trigger 100px before reaching the bottom
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver(handleObserver, option);

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Initial loading state
  if (isLoading && livestreams.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error && livestreams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <img
          src="/error-circle.svg"
          alt="Error"
          className="w-12 h-12 text-red-500 mb-4"
          style={{ filter: 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)' }}
        />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Failed to load livestreams
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  // Empty state
  if (livestreams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No livestreams found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {livestreams.map((livestream) => (
          <LivestreamCard
            key={livestream.id}
            livestream={livestream}
            onJoin={onJoinLivestream}
            onDelete={onDeleteLivestream}
            currentUserId={currentUserId}
          />
        ))}
      </div>

      {/* Load more trigger (invisible element for intersection observer) */}
      {hasMore && (
        <div ref={loadMoreTriggerRef} className="flex items-center justify-center py-8">
          {isLoadingMore && <Spinner size="md" />}
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && livestreams.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          You've reached the end of the list
        </div>
      )}
    </div>
  );
};

export default LivestreamGrid;
