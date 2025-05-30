import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  message = '로딩 중...', 
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center py-12';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]} mb-4`}></div>
      {message && (
        <p className="text-gray-500 text-sm">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner; 