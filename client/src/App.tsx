/**
 * App Component
 * Main application component with livestream listing
 */

import { useState } from 'react';
import { useLivestreams } from './hooks/useLivestreams';
import { LivestreamFilters } from './components/livestream/LivestreamFilters';
import { LivestreamGrid } from './components/livestream/LivestreamGrid';
import { LivestreamRoom } from './components/livestream/LivestreamRoom';
import { LivestreamStatus } from './types/api.types';
import type { Livestream } from './types/api.types';

function App() {
  const [selectedLivestream, setSelectedLivestream] = useState<Livestream | null>(null);

  const {
    livestreams,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    statusFilter,
    loadMore,
    setStatusFilter,
  } = useLivestreams({
    initialLimit: 12,
    pollInterval: 30000, // Poll every 30 seconds
  });

  /**
   * Handle joining a livestream
   */
  const handleJoinLivestream = (livestream: Livestream) => {
    setSelectedLivestream(livestream);
  };

  /**
   * Handle leaving a livestream
   */
  const handleLeaveLivestream = () => {
    setSelectedLivestream(null);
  };

  // Show room view if a livestream is selected
  if (selectedLivestream) {
    return (
      <LivestreamRoom
        livestream={selectedLivestream}
        onLeave={handleLeaveLivestream}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Livestreams
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Browse and discover livestreams
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <LivestreamFilters
          activeFilter={statusFilter}
          onFilterChange={(status: LivestreamStatus | undefined) => setStatusFilter(status)}
        />

        {/* Grid */}
        <LivestreamGrid
          livestreams={livestreams}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onJoinLivestream={handleJoinLivestream}
          error={error}
        />
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Favorited Livestream Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
