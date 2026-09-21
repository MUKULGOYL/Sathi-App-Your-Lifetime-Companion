import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './i18n';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toast, type ToastMessage } from './components/Toast';
import { OnboardingModal } from './features/onboarding/OnboardingModal';
import { HomeBriefingView } from './features/home-briefing/HomeBriefingView';
import { AskView } from './features/ask/AskView';
import { SimplifyView } from './features/simplify/SimplifyView';
import { RemindersView } from './features/reminders/RemindersView';
import { ScamShieldView } from './features/scam-shield/ScamShieldView';
import { CheckinView } from './features/checkin/CheckinView';
import { SosView } from './features/sos/SosView';
import { SettingsView } from './features/settings/SettingsView';
import { StorageService } from './services/storageService';
import { NotificationService } from './services/notificationService';
import { isReminderDue, getSnoozeTimestamp } from './utils/dates';
import { APP_LIMITS } from './constants';
import type {
  UserProfile,
  ReminderItem,
  CheckinEntry,
  AskMessage,
  BriefingData,
  ActiveTab,
  SupportedLanguage,
} from './types';

function SathiApp() {
  const { language, setLanguage, t } = useI18n();

  // Application Persistent State
  const [profile, setProfile] = useState<UserProfile>(() => StorageService.getProfile());
  const [reminders, setReminders] = useState<ReminderItem[]>(() => StorageService.getReminders());
  const [checkinHistory, setCheckinHistory] = useState<CheckinEntry[]>(() => StorageService.getCheckins());
  const [askHistory, setAskHistory] = useState<AskMessage[]>(() => StorageService.getAskHistory());
  const [cachedBriefing, setCachedBriefing] = useState<BriefingData | null>(() => StorageService.getBriefing());

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(!profile.isOnboarded);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Apply visual settings (Theme & Text size) to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', profile.theme || 'light');
    document.documentElement.setAttribute('data-text-size', profile.textSize || 'normal');
  }, [profile.theme, profile.textSize]);

  // Synchronize profile state when language is switched in I18nContext
  useEffect(() => {
    if (profile.language !== language) {
      setProfile((prev) => {
        const updated = { ...prev, language };
        StorageService.saveProfile(updated);
        return updated;
      });
    }
  }, [language, profile.language]);

  // Toast Helper
  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, APP_LIMITS.TOAST_AUTO_DISMISS_MS);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  // Background reminder notification loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (profile.notificationsEnabled && NotificationService.getPermission() === 'granted') {
        const dueList = reminders.filter((r) => !r.completed && isReminderDue(r));
        if (dueList.length > 0) {
          const first = dueList[0];
          NotificationService.send(
            language === 'hi' ? 'साथी: दवाई या काम का समय!' : 'Sathi: Time for your reminder!',
            first.title
          );
        }
      }
    }, APP_LIMITS.NOTIFICATION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [reminders, profile.notificationsEnabled, language]);

  // Handlers for Profile Updates
  const handleUpdateProfile = (updated: UserProfile) => {
    setProfile(updated);
    StorageService.saveProfile(updated);
    if (updated.language && updated.language !== language) {
      setLanguage(updated.language);
    }
  };

  const handleOnboardingComplete = (completedProfile: UserProfile) => {
    handleUpdateProfile(completedProfile);
    setShowOnboarding(false);
    addToast('success', t.common.success);
  };

  const handleOnboardingSkip = () => {
    const skippedProfile: UserProfile = { ...profile, isOnboarded: true };
    handleUpdateProfile(skippedProfile);
    setShowOnboarding(false);
  };

  // Reminders Management
  const handleAddReminder = (item: Omit<ReminderItem, 'id' | 'completed'>) => {
    const newItem: ReminderItem = {
      ...item,
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      completed: false,
    };
    const updated = [newItem, ...reminders];
    setReminders(updated);
    StorageService.saveReminders(updated);
    addToast('success', t.common.success);
  };

  const handleMarkReminderDone = (id: string) => {
    const updated = reminders.map((r) => (r.id === id ? { ...r, completed: true } : r));
    setReminders(updated);
    StorageService.saveReminders(updated);
    addToast('success', language === 'hi' ? 'काम पूरा चिह्नित किया गया' : 'Marked as completed');
  };

  const handleSnoozeReminder = (id: string) => {
    const snoozeTime = getSnoozeTimestamp(APP_LIMITS.SNOOZE_DEFAULT_MINUTES);
    const updated = reminders.map((r) => (r.id === id ? { ...r, snoozedUntil: snoozeTime } : r));
    setReminders(updated);
    StorageService.saveReminders(updated);
    addToast('info', language === 'hi' ? '10 मिनट के लिए स्नूज़ किया गया' : 'Snoozed for 10 minutes');
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    StorageService.saveReminders(updated);
    addToast('info', language === 'hi' ? 'रिमाइंडर हटा दिया गया' : 'Reminder removed');
  };

  // Check-in Management
  const handleSaveCheckin = (entry: CheckinEntry) => {
    const updated = [entry, ...checkinHistory];
    setCheckinHistory(updated);
    StorageService.saveCheckins(updated);
    addToast('success', t.common.success);
  };

  // Ask History Management
  const handleUpdateAskHistory = (newHistory: AskMessage[]) => {
    setAskHistory(newHistory);
    StorageService.saveAskHistory(newHistory);
  };

  // Briefing Cache
  const handleSaveBriefing = (briefing: BriefingData) => {
    setCachedBriefing(briefing);
    StorageService.saveBriefing(briefing);
  };

  // Clear All Data
  const handleClearAllData = () => {
    StorageService.clearAll();
    const freshProfile = StorageService.getProfile();
    setProfile(freshProfile);
    setReminders([]);
    setCheckinHistory([]);
    setAskHistory([]);
    setCachedBriefing(null);
    setActiveTab('home');
    setShowOnboarding(true);
    addToast('info', language === 'hi' ? 'सारा डेटा साफ़ कर दिया गया' : 'All data cleared');
  };

  const dueRemindersCount = reminders.filter((r) => !r.completed && isReminderDue(r)).length;
  const latestCheckin = checkinHistory[0] || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF9] text-[#0F2A33] font-sans antialiased transition-colors selection:bg-[#0E7C86] selection:text-white">
      {/* Skip to Main Content Link for Keyboard Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-[#0E7C86] focus:text-white focus:font-black focus:rounded-2xl focus:shadow-2xl focus:ring-4 focus:ring-white"
      >
        {t.nav.skipToContent}
      </a>

      {/* Top Bar */}
      <TopBar
        onOpenSettings={() => setActiveTab('settings')}
        onOpenSos={() => setActiveTab('sos')}
        activeTab={activeTab}
      />

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6 pb-28 focus-visible:outline-none"
      >
        <ErrorBoundary language={language}>
          {activeTab === 'home' && (
            <HomeBriefingView
              profile={profile}
              reminders={reminders}
              latestCheckin={latestCheckin}
              cachedBriefing={cachedBriefing}
              onSaveBriefing={handleSaveBriefing}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'ask' && (
            <AskView
              profile={profile}
              latestCheckin={latestCheckin}
              history={askHistory}
              onUpdateHistory={handleUpdateAskHistory}
              onAddReminder={handleAddReminder}
            />
          )}

          {activeTab === 'simplify' && (
            <SimplifyView onAddReminder={handleAddReminder} />
          )}

          {activeTab === 'reminders' && (
            <RemindersView
              reminders={reminders}
              onAddReminder={handleAddReminder}
              onMarkDone={handleMarkReminderDone}
              onSnooze={handleSnoozeReminder}
              onDelete={handleDeleteReminder}
            />
          )}

          {activeTab === 'scam_shield' && (
            <ScamShieldView profile={profile} />
          )}

          {activeTab === 'checkin' && (
            <CheckinView
              checkinHistory={checkinHistory}
              onSaveCheckin={handleSaveCheckin}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'sos' && (
            <SosView profile={profile} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onClearAllData={handleClearAllData}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Bottom Navigation with 5 main tabs */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        dueRemindersCount={dueRemindersCount}
      />

      {/* Onboarding Modal for First Time Users */}
      <OnboardingModal
        isOpen={showOnboarding}
        initialProfile={profile}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      {/* Accessible Toast Notification System */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  const initialLang = StorageService.getProfile().language || 'en';

  return (
    <I18nProvider
      initialLanguage={initialLang}
      onLanguageChange={(lang: SupportedLanguage) => {
        const p = StorageService.getProfile();
        StorageService.saveProfile({ ...p, language: lang });
      }}
    >
      <SathiApp />
    </I18nProvider>
  );
}
