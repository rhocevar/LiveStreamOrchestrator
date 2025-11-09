/**
 * Badge Component
 * Displays status badges with color coding
 */

import React from 'react';
import { LivestreamStatus } from '../../types/api.types';

interface BadgeProps {
  status: LivestreamStatus;
  className?: string;
}

const statusColors: Record<LivestreamStatus, string> = {
  [LivestreamStatus.LIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [LivestreamStatus.ENDED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  [LivestreamStatus.SCHEDULED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [LivestreamStatus.ERROR]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels: Record<LivestreamStatus, string> = {
  [LivestreamStatus.LIVE]: 'Live',
  [LivestreamStatus.ENDED]: 'Ended',
  [LivestreamStatus.SCHEDULED]: 'Scheduled',
  [LivestreamStatus.ERROR]: 'Error',
};

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const colorClasses = statusColors[status];
  const label = statusLabels[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses} ${className}`}
    >
      {status === LivestreamStatus.LIVE && (
        <span className="mr-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      )}
      {label}
    </span>
  );
};

export default Badge;
