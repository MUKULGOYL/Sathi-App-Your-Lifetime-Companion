import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BigTileProps {
  id?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'default' | 'alert' | 'success';
  onClick: () => void;
  iconBgColor?: string;
  className?: string;
}

export const BigTile: React.FC<BigTileProps> = ({
  id,
  icon,
  title,
  description,
  badge,
  badgeVariant = 'default',
  onClick,
  iconBgColor = 'bg-[#E6F4F5] text-[#0E7C86]',
  className = '',
}) => {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl p-6 border-2 border-[#E8DEC8] hover:border-[#0E7C86] hover:bg-[#FCF8EE] shadow-sm hover:shadow-md transition-all active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-[#0E7C86] focus-visible:outline-none flex items-center justify-between gap-4 group cursor-pointer ${className}`}
    >
      <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
        <div
          className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-xs ${iconBgColor}`}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F2A33] group-hover:text-[#0E7C86] transition-colors leading-snug sm:leading-normal">
              {title}
            </h2>
            {badge && (
              <span
                className={`text-sm font-bold px-3 py-0.5 rounded-full border whitespace-nowrap ${
                  badgeVariant === 'alert'
                    ? 'bg-[#FDE8E8] text-[#8B0000] border-[#C62828]'
                    : badgeVariant === 'success'
                    ? 'bg-[#E6F4F5] text-[#064E56] border-[#0E7C86]'
                    : 'bg-[#FFF4DC] text-[#6B4300] border-[#F4A300]'
                }`}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-base sm:text-lg text-[#243C45] leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>
      <div
        className="shrink-0 w-12 h-12 rounded-xl bg-[#FFF9EF] border border-[#E8DEC8] flex items-center justify-center text-[#0E7C86] group-hover:bg-[#0E7C86] group-hover:text-white transition-colors"
        aria-hidden="true"
      >
        <ChevronRight className="w-6 h-6" />
      </div>
    </button>
  );
};
