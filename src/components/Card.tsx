import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'highlight' | 'warning' | 'danger' | 'interactive';
  elevation?: 'flat' | 'raised';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  elevation = 'raised',
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-2xl p-6 transition-all relative overflow-hidden';

  const elevationClasses = {
    flat: 'shadow-none border-2',
    raised: 'shadow-sm hover:shadow-md border-2',
  }[elevation];

  const variantClasses = {
    surface: 'bg-white text-[#0F2A33] border-[#E8DEC8]',
    highlight: 'bg-[#E6F4F5] text-[#0F2A33] border-[#0E7C86]',
    warning: 'bg-[#FFF4DC] text-[#0F2A33] border-[#F4A300]',
    danger: 'bg-[#FDE8E8] text-[#0F2A33] border-[#C62828]',
    interactive: 'bg-white text-[#0F2A33] border-[#E8DEC8] hover:border-[#0E7C86] hover:bg-[#FCF8EE] cursor-pointer active:scale-[0.99]',
  }[variant];

  return (
    <div className={`${baseClasses} ${elevationClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};
