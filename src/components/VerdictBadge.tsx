import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useI18n } from '../i18n';

export interface VerdictBadgeProps {
  verdict: 'SAFE' | 'SUSPICIOUS' | 'LIKELY_SCAM';
  className?: string;
  size?: 'default' | 'large';
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  verdict,
  className = '',
  size = 'default',
}) => {
  const { t } = useI18n();

  const isLarge = size === 'large';
  const paddingClass = isLarge ? 'px-6 py-4 text-2xl gap-3' : 'px-4 py-2 text-lg gap-2';
  const iconSizeClass = isLarge ? 'w-8 h-8' : 'w-6 h-6';

  if (verdict === 'SAFE') {
    return (
      <div
        data-testid="verdict-safe"
        className={`inline-flex items-center font-black rounded-2xl bg-[#E6F4F5] text-[#064E56] border-2 border-[#0E7C86] shadow-xs ${paddingClass} ${className}`}
      >
        <CheckCircle2 className={`${iconSizeClass} shrink-0`} aria-hidden="true" />
        <span>{t.scam.verdictSafe} ✔</span>
      </div>
    );
  }

  if (verdict === 'SUSPICIOUS') {
    return (
      <div
        data-testid="verdict-suspicious"
        className={`inline-flex items-center font-black rounded-2xl bg-[#FFF4DC] text-[#6B4300] border-2 border-[#F4A300] shadow-xs ${paddingClass} ${className}`}
      >
        <AlertTriangle className={`${iconSizeClass} shrink-0`} aria-hidden="true" />
        <span>{t.scam.verdictSuspicious} ⚠</span>
      </div>
    );
  }

  return (
    <div
      data-testid="verdict-scam"
      className={`inline-flex items-center font-black rounded-2xl bg-[#FDE8E8] text-[#8B0000] border-2 border-[#C62828] shadow-xs ${paddingClass} ${className}`}
    >
      <XCircle className={`${iconSizeClass} shrink-0`} aria-hidden="true" />
      <span>{t.scam.verdictScam} ✖</span>
    </div>
  );
};
