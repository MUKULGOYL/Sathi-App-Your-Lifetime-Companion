import React from 'react';
import { Settings as SettingsIcon, Heart } from 'lucide-react';
import { LanguageToggle } from './LanguageToggle';
import { SosButton } from './SosButton';
import { useI18n } from '../i18n';
import type { ActiveTab } from '../types';

export interface TopBarProps {
  onOpenSettings: () => void;
  onOpenSos: () => void;
  activeTab: ActiveTab;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSettings, onOpenSos, activeTab }) => {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 bg-[#FFF9EF]/95 backdrop-blur-md border-b-2 border-[#E8DEC8] px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* App Branding */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl bg-[#0E7C86] text-white flex items-center justify-center shadow-sm"
            aria-hidden="true"
          >
            <Heart className="w-7 h-7 fill-current" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-[#0F2A33] tracking-tight block leading-snug">
              {t.app.nameWithDevanagari}
            </span>
            <span className="text-xs sm:text-sm text-[#243C45] hidden sm:block font-medium">
              {t.app.tagline}
            </span>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language toggle on every screen */}
          <LanguageToggle />

          {/* Persistent SOS button (only hidden if currently on SOS screen) */}
          {activeTab !== 'sos' && (
            <SosButton onClick={onOpenSos} className="hidden sm:inline-flex" />
          )}

          {/* Settings button */}
          <button
            type="button"
            id="open-settings-button"
            onClick={onOpenSettings}
            aria-label={t.topBar.settings}
            className="min-h-[56px] min-w-[56px] p-3 rounded-2xl bg-white border-2 border-[#E8DEC8] text-[#0F2A33] hover:border-[#0E7C86] hover:bg-[#FCF8EE] flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-3 focus-visible:ring-[#0E7C86]"
          >
            <SettingsIcon className="w-7 h-7" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile SOS button bar */}
      {activeTab !== 'sos' && (
        <div className="sm:hidden pt-2.5">
          <SosButton onClick={onOpenSos} className="w-full" />
        </div>
      )}
    </header>
  );
};
