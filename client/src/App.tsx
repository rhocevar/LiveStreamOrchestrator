/**
 * App Component
 * Main application component with livestream listing
 */

import { useState } from 'react';
import { useLivestreams } from './hooks/useLivestreams';
import { LivestreamFilters } from './components/livestream/LivestreamFilters';
import { LivestreamGrid } from './components/livestream/LivestreamGrid';
import { LivestreamRoom } from './components/livestream/LivestreamRoom';
import {
  CreateLivestreamForm,
  type CreateLivestreamFormData,
} from './components/livestream/CreateLivestreamForm';
import { LivestreamStatus } from './types/api.types';
import type { Livestream } from './types/api.types';
import { apiService } from './services/api.service';

function App() {
  const [selectedLivestream, setSelectedLivestream] = useState<Livestream | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUserId] = useState(() => {
    // Check localStorage for existing user ID
    const storedUserId = localStorage.getItem('favorited_user_id');
    if (storedUserId) {
      return storedUserId;
    }

    // Generate new user ID and store it
    const newUserId = `user-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('favorited_user_id', newUserId);
    return newUserId;
  });

  const {
    livestreams,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    statusFilter,
    loadMore,
    setStatusFilter,
    refresh,
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

  /**
   * Handle creating a livestream
   */
  const handleCreateLivestream = async (data: CreateLivestreamFormData) => {
    await apiService.createLivestream(data);
    await refresh(); // Refresh the list to show the new livestream
  };

  /**
   * Handle deleting a livestream
   */
  const handleDeleteLivestream = async (livestream: Livestream) => {
    try {
      await apiService.deleteLivestream(livestream.id, currentUserId);
      await refresh(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete livestream:', error);
      alert('Failed to delete livestream: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Livestreams
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Browse and discover livestreams
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Your ID: <span className="font-mono">{currentUserId}</span>
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Livestream
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Form - Inline */}
        {showCreateModal && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Livestream
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CreateLivestreamForm
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreateLivestream}
              currentUserId={currentUserId}
            />
          </div>
        )}

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
          onDeleteLivestream={handleDeleteLivestream}
          currentUserId={currentUserId}
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
