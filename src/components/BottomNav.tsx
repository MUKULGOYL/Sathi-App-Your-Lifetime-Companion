import React from 'react';
import { Home, MessageCircleQuestion, FileText, BellRing, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import type { ActiveTab } from '../types';

export interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  dueRemindersCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  dueRemindersCount = 0,
}) => {
  const { t } = useI18n();

  const tabs: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: 'true' | 'false' }>;
    badge?: number;
  }> = [
    { id: 'home', label: t.nav.home, icon: Home },
    { id: 'ask', label: t.nav.ask, icon: MessageCircleQuestion },
    { id: 'simplify', label: t.nav.simplify, icon: FileText },
    { id: 'reminders', label: t.nav.reminders, icon: BellRing, badge: dueRemindersCount },
    { id: 'scam_shield', label: t.nav.safety, icon: ShieldCheck },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t-2 border-[#E8DEC8] shadow-2xl z-40 transition-colors"
    >
      <div className="max-w-4xl mx-auto px-2 sm:px-4 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-h-[72px] sm:min-h-[80px] py-2 px-1 flex flex-col items-center justify-center gap-1.5 transition-all relative cursor-pointer focus-visible:ring-3 focus-visible:ring-[#0E7C86] focus-visible:outline-none ${
                isActive
                  ? 'text-[#064E56] font-black'
                  : 'text-[#243C45] hover:text-[#0F2A33] font-semibold'
              }`}
            >
              {/* Active top indicator pill */}
              {isActive && (
                <div
                  className="absolute top-0 w-12 sm:w-16 h-1.5 bg-[#0E7C86] rounded-b-full shadow-xs"
                  aria-hidden="true"
                />
              )}

              <div className="relative">
                <Icon
                  className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                  aria-hidden="true"
                />
                {tab.badge && tab.badge > 0 ? (
                  <span
                    aria-label={`${tab.badge} due reminders`}
                    className="absolute -top-1.5 -right-2.5 min-w-[20px] h-[20px] px-1 bg-[#8B0000] text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white"
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </div>

              <span className="text-xs sm:text-sm font-bold leading-tight sm:leading-normal text-center whitespace-nowrap px-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
