import React from 'react';
import { useI18n } from '../i18n';

export interface LanguageToggleProps {
  className?: string;
  size?: 'default' | 'large';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className = '',
  size = 'default',
}) => {
  const { language, setLanguage } = useI18n();

  const isHindi = language === 'hi';

  const containerPadding = size === 'large' ? 'p-2' : 'p-1.5';
  const buttonPadding = size === 'large' ? 'px-6 py-3 text-xl' : 'px-4 py-2 text-lg';

  return (
    <div
      role="group"
      aria-label="Language selection / भाषा चयन"
      className={`inline-flex items-center bg-[#FFF9EF] border-2 border-[#0E7C86] rounded-2xl shadow-xs ${containerPadding} ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={!isHindi}
        className={`${buttonPadding} font-bold rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0E7C86] ${
          !isHindi
            ? 'bg-[#0E7C86] text-white shadow-xs'
            : 'text-[#0F2A33] hover:text-[#0E7C86] hover:bg-[#E6F4F5]'
        }`}
      >
        English
      </button>
      <span className="text-[#0E7C86] px-1 font-bold select-none" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        aria-pressed={isHindi}
        className={`${buttonPadding} font-bold rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0E7C86] ${
          isHindi
            ? 'bg-[#0E7C86] text-white shadow-xs'
            : 'text-[#0F2A33] hover:text-[#0E7C86] hover:bg-[#E6F4F5]'
        }`}
      >
        हिंदी
      </button>
    </div>
  );
};
