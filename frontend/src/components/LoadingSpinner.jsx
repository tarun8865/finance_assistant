import React from 'react';
import { FiLoader } from 'react-icons/fi';

const LoadingSpinner = ({ size = 'md', text = 'Loading...', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 animate-pulse ${className}`}>
      <FiLoader className={`${sizeClasses[size]} animate-spin text-primary-500 animate-pulse-slow`} />
      {text && (
        <p className="text-sm text-gray-600 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner; 