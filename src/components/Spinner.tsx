import React from 'react';

export interface SpinnerProps {
  message?: string;
  size?: 'default' | 'large';
  ariaLabel?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  message = "Take your time, I'm reading it carefully...",
  size = 'default',
  ariaLabel,
}) => {
  const spinnerSizeClass = size === 'large' ? 'w-16 h-16 border-4' : 'w-12 h-12 border-3';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel || message}
      className="flex flex-col items-center justify-center p-8 sm:p-12 text-center gap-4"
    >
      <div
        className={`${spinnerSizeClass} rounded-full border-[#0E7C86] border-t-transparent animate-spin`}
        aria-hidden="true"
      />
      {message && (
        <p className="text-xl sm:text-2xl font-semibold text-[#0F2A33] max-w-md animate-pulse leading-relaxed">
          {message}
        </p>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );
};
