import React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  isLoading = false,
  ...props
}) => {
  const baseStyles = 'w-full p-3 rounded font-bold transition-all disabled:opacity-50';
  
  const variants = {
    // Primary (dark in light mode, white in dark mode)
    primary: 'bg-night text-pure-white hover:bg-grey-dark dark:bg-pure-white dark:text-pure-black dark:hover:bg-grey-light',
    // Secondary (light grey in light mode, dark grey in dark mode)
    secondary: 'bg-grey-mid/20 text-night hover:bg-grey-mid/40 dark:bg-grey-dark dark:text-grey-light dark:hover:bg-grey-mid',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? '...' : children}
    </button>
  );
};