/**
 * Card Component
 * Reusable card container with Tailwind styling
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden';
  const interactiveClasses = onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : '';
  const combinedClasses = `${baseClasses} ${interactiveClasses} ${className}`.trim();

  return (
    <div className={combinedClasses} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;
