'use client';

import React from 'react';
import Button from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'There was an error connecting to the server. Please try again.',
  onRetry,
}) => {
  return (
    <div className='p-12 text-center bg-red-50 rounded-2xl border border-red-100 max-w-2xl mx-auto'>
      <div className='text-4xl mb-4'>⚠️</div>
      <h3 className='text-xl font-bold text-red-800 mb-2'>{title}</h3>
      <p className='text-red-600 mb-6'>{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant='danger'>
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
