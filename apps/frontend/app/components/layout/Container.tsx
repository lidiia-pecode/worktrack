import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className = '' }: ContainerProps) => {
  return (
    <div
      className={`max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full ${className}`}
    >
      {children}
    </div>
  );
};

export default Container;
