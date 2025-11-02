import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div
      // Theme-aware spinner
      className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-night/20 border-r-night dark:border-pure-white/20 dark:border-r-pure-white align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
      role="status"
    >
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
};