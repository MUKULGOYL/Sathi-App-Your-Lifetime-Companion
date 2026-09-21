import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '../i18n';

export interface SosButtonProps {
  onClick: () => void;
  className?: string;
}

export const SosButton: React.FC<SosButtonProps> = ({ onClick, className = '' }) => {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onClick}
      id="persistent-sos-button"
      aria-label={`${t.nav.sos} - Emergency Assistance`}
      className={`min-h-[64px] px-5 sm:px-7 py-3 bg-[#C62828] hover:bg-[#A31F1F] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl border-3 border-white flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 focus-visible:ring-4 focus-visible:ring-[#C62828] focus-visible:outline-none ${className}`}
    >
      <div className="w-8 h-8 rounded-full bg-white text-[#C62828] flex items-center justify-center shrink-0">
        <ShieldAlert className="w-6 h-6" aria-hidden="true" />
      </div>
      <span className="text-xl sm:text-2xl font-black tracking-wide whitespace-nowrap">
        {t.nav.sos}
      </span>
    </button>
  );
};
