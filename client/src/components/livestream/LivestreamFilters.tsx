/**
 * LivestreamFilters Component
 * Filter buttons for livestream status
 */

import React from 'react';
import { LivestreamStatus } from '../../types/api.types';

interface LivestreamFiltersProps {
  activeFilter: LivestreamStatus | undefined;
  onFilterChange: (status: LivestreamStatus | undefined) => void;
}

interface FilterOption {
  label: string;
  value: LivestreamStatus | undefined;
  count?: number;
}

const filterOptions: FilterOption[] = [
  { label: 'All', value: undefined },
  { label: 'Live', value: LivestreamStatus.LIVE },
  { label: 'Ended', value: LivestreamStatus.ENDED },
  { label: 'Scheduled', value: LivestreamStatus.SCHEDULED },
  { label: 'Error', value: LivestreamStatus.ERROR },
];

export const LivestreamFilters: React.FC<LivestreamFiltersProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filterOptions.map((option) => {
        const isActive = activeFilter === option.value;

        return (
          <button
            key={option.label}
            onClick={() => onFilterChange(option.value)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default LivestreamFilters;
