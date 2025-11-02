import React from 'react';
import clsx from 'clsx';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={clsx(
        // Default light mode styles
        'w-full p-3 bg-pure-white text-night rounded border border-grey-mid/30',
        'placeholder:text-grey-mid/70',
        // Dark mode overrides
        'dark:bg-grey-dark dark:text-grey-light dark:border-grey-dark dark:placeholder:text-grey-mid',
        // Focus styles
        'focus:outline-none focus:ring-1 focus:ring-night/50 dark:focus:ring-pure-white',
        className
      )}
      {...props}
    />
  );
};