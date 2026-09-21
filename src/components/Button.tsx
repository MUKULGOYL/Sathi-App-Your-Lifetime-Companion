import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'danger' | 'secondary' | 'ghost';
  size?: 'default' | 'large' | 'icon';
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  loadingText,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all select-none cursor-pointer focus-visible:ring-3 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  // Sizing: Senior-friendly touch targets (min 56px, standard 64px)
  const sizeClasses = {
    default: 'min-h-[64px] px-6 py-3 text-lg sm:text-xl gap-3',
    large: 'min-h-[72px] px-8 py-4 text-xl sm:text-2xl gap-4',
    icon: 'min-h-[56px] min-w-[56px] p-3 text-lg',
  }[size];

  // Colors honoring WCAG AAA
  const variantClasses = {
    primary: 'bg-[#0E7C86] hover:bg-[#095D65] text-white shadow-md border-2 border-[#095D65] focus-visible:ring-[#0E7C86]',
    accent: 'bg-[#F4A300] hover:bg-[#D98F00] text-[#0F2A33] shadow-md border-2 border-[#D98F00] font-bold focus-visible:ring-[#F4A300]',
    danger: 'bg-[#C62828] hover:bg-[#A31F1F] text-white shadow-md border-2 border-[#A31F1F] font-bold focus-visible:ring-[#C62828]',
    secondary: 'bg-white hover:bg-[#FCF8EE] text-[#0F2A33] border-2 border-[#E8DEC8] shadow-sm hover:border-[#0E7C86] focus-visible:ring-[#0E7C86]',
    ghost: 'bg-transparent hover:bg-[#0E7C86]/10 text-[#0F2A33] border-2 border-transparent focus-visible:ring-[#0E7C86]',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-6 w-6 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0 flex items-center justify-center text-xl">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
