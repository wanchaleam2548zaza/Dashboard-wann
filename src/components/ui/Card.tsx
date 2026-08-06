import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ children, className = '', glass = false, ...props }: CardProps) {
  const baseClass = glass ? 'glass-card' : 'card';
  
  return (
    <div className={`${baseClass} ${className}`} {...props}>
      {children}
    </div>
  );
}
