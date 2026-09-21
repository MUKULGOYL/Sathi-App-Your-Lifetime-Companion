import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Sun,
  ShieldCheck,
  Lightbulb,
  HeartHandshake,
  BellRing,
  MessageCircleQuestion,
  FileText,
  Smile,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { BigTile } from '../../components/BigTile';
import { Spinner } from '../../components/Spinner';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { AiErrorAlert } from '../../components/AiErrorAlert';
import { useI18n } from '../../i18n';
import { callGenerateApi, ApiError } from '../../services/apiClient';
import { StorageService } from '../../services/storageService';
import { getTimeOfDay, getTodayDateString } from '../../utils/dates';
import { computeBriefingHash } from '../../utils/hash';
import type {
  UserProfile,
  ReminderItem,
  CheckinEntry,
  BriefingData,
  ActiveTab,
} from '../../types';

export interface HomeBriefingViewProps {
  profile: UserProfile;
  reminders: ReminderItem[];
  latestCheckin: CheckinEntry | null;
  cachedBriefing: BriefingData | null;
  onSaveBriefing: (briefing: BriefingData) => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const HomeBriefingView: React.FC<HomeBriefingViewProps> = ({
  profile,
  reminders,
  latestCheckin,
  cachedBriefing,
  onSaveBriefing,
  onNavigate,
}) => {
  const { language, t } = useI18n();

  const [briefing, setBriefing] = useState<BriefingData | null>(cachedBriefing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [refreshCooldown, setRefreshCooldown] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  // Guard against React StrictMode double invocation on initial mount
  const sessionLoadRanRef = useRef(false);

  // Store latest props in refs so fetchBriefing can access them without forcing re-renders
  const propsRef = useRef({
    profile,
    reminders,
    latestCheckin,
    cachedBriefing,
    language,
    onSaveBriefing,
  });

  useEffect(() => {
    propsRef.current = {
      profile,
      reminders,
      latestCheckin,
      cachedBriefing,
      language,
      onSaveBriefing,
    };
  });

  // Calculate current briefing hash
  const getCurrentHash = (): string => {
    const p = propsRef.current;
    const todayStr = getTodayDateString();
    return computeBriefingHash({
      date: todayStr,
      language: p.language,
      profile: {
        name: p.profile.name,
        city: p.profile.city,
        medicines: p.profile.medicines,
        healthNotes: p.profile.healthNotes,
      },
      mood: p.latestCheckin?.mood || 'none',
      reminders: p.reminders.map((r) => ({
        id: r.id,
        title: r.title,
        time: r.time,
        completed: r.completed,
      })),
    });
  };

  // Fetch or retrieve briefing
  const fetchBriefing = async (bypassCache = false) => {
    const currentHash = getCurrentHash();
    const p = propsRef.current;

    // Check cached briefing in state or localStorage if not bypassing
    if (!bypassCache) {
      const stored = StorageService.getBriefing();
      const candidate =
        p.cachedBriefing && p.cachedBriefing.hash === currentHash
          ? p.cachedBriefing
          : stored && stored.hash === currentHash
          ? stored
          : null;

      if (candidate) {
        setBriefing(candidate);
        setLoading(false);
        setError(null);
        return;
      }
    }

    // Cancel any previous in-flight call
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const sanitizedMood =
        p.latestCheckin?.mood === 'good' || p.latestCheckin?.mood === 'okay' || p.latestCheckin?.mood === 'not_well'
          ? p.latestCheckin.mood
          : undefined;

      const payload = {
        profile: {
          name: p.profile.name,
          city: p.profile.city,
          medicines: p.profile.medicines,
          healthNotes: p.profile.healthNotes,
        },
        mood: sanitizedMood,
        symptoms: p.latestCheckin?.symptoms || [],
        reminders: p.reminders.map((r) => ({
          title: r.title,
          time: r.time,
          category: r.category,
        })),
        timeOfDay: getTimeOfDay(),
      };

      const result = await callGenerateApi<{
        greeting: string;
        priorities: string[];
        wellbeingNudge: string;
        safetyTip: string;
        learnTip: string;
      }>('briefing', p.language, payload, { signal: abortControllerRef.current.signal });

      const newBriefing: BriefingData = {
        ...result,
        generatedAt: new Date().toISOString(),
        hash: currentHash,
      };

      setBriefing(newBriefing);
      StorageService.saveBriefing(newBriefing);
      p.onSaveBriefing(newBriefing);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 499) {
        // Request aborted, do nothing
        return;
      }
      console.error('[HomeBriefingView] Error fetching briefing:', err);
      setError(err);

      // If we don't have an active briefing in state, attempt to recover with previously stored briefing
      if (!briefing) {
        const stored = StorageService.getBriefing();
        if (stored) {
          setBriefing(stored);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Only call ONCE per session load. Guard against React StrictMode double effects with a ref.
  // Do NOT auto-regenerate when unrelated state changes.
  useEffect(() => {
    if (sessionLoadRanRef.current) {
      return;
    }
    sessionLoadRanRef.current = true;
    fetchBriefing(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Re-fetch or retrieve cached briefing whenever the user switches language
  const prevLangRef = useRef(language);
  useEffect(() => {
    if (prevLangRef.current !== language) {
      prevLangRef.current = language;
      fetchBriefing(false);
    }
  }, [language]);

  // Handle Refresh with 10-second cooldown
  const handleRefresh = () => {
    if (loading || refreshCooldown > 0) return;
    setRefreshCooldown(10);
    fetchBriefing(true);
  };

  // Refresh cooldown timer
  useEffect(() => {
    if (refreshCooldown <= 0) return;
    const interval = setInterval(() => {
      setRefreshCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshCooldown]);

  // Check if any reminders are due right now
  const dueReminders = reminders.filter((r) => !r.completed);

  // Time of day greeting
  const timeOfDay = getTimeOfDay();
  const timeGreeting =
    timeOfDay === 'morning'
      ? t.home.greetingMorning
      : timeOfDay === 'afternoon'
      ? t.home.greetingAfternoon
      : timeOfDay === 'evening'
      ? t.home.greetingEvening
      : t.home.greetingNight;

  const displayName = profile.name ? profile.name : (language === 'hi' ? 'साथी' : 'Friend');

  // Build full briefing read-aloud string
  const briefingFullText = briefing
    ? `${briefing.greeting}. ${t.home.prioritiesTitle}: ${briefing.priorities.join('. ')}. ${t.home.wellbeingTitle}: ${briefing.wellbeingNudge}. ${t.home.safetyTipTitle}: ${briefing.safetyTip}. ${t.home.learnTipTitle}: ${briefing.learnTip}`
    : '';

  return (
    <div className="space-y-8 pb-12">
      {/* Friendly Welcoming Hero */}
      <section aria-labelledby="welcome-heading" className="space-y-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl bg-[#FFEAD0] text-[#D96B27] flex items-center justify-center font-bold"
            aria-hidden="true"
          >
            <Sun className="w-6 h-6" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#4A636C]">{timeGreeting}</span>
        </div>
        <h1 id="welcome-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F2A33] tracking-tight">
          {displayName}
        </h1>
        {profile.city && (
          <p className="text-lg sm:text-xl text-[#4A636C]">
            {language === 'hi' ? `${profile.city} में आपका दिन सुखद हो` : `Have a peaceful day in ${profile.city}`}
          </p>
        )}
      </section>

      {/* Due Today Quick Alert Banner (if pending reminders exist) */}
      {dueReminders.length > 0 && (
        <div
          role="region"
          aria-label={t.home.dueRemindersAlert}
          className="p-5 sm:p-6 bg-[#FFEAD0] border-2 border-[#D96B27] rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl bg-white text-[#D96B27] flex items-center justify-center shrink-0 shadow-2xs"
              aria-hidden="true"
            >
              <BellRing className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-[#0F2A33]">
                {t.home.dueRemindersAlert}
              </p>
              <p className="text-lg text-[#0F2A33] font-medium">
                {dueReminders.length} {language === 'hi' ? 'दवा या काम आज निर्धारित हैं' : 'scheduled for today'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="accent"
            onClick={() => onNavigate('reminders')}
            className="w-full sm:w-auto"
          >
            {t.home.viewDueNow}
          </Button>
        </div>
      )}

      {/* Today For You - Live Gemini Briefing Card */}
      <section aria-labelledby="today-briefing-heading">
        <Card variant="surface" className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#E8DEC8] pb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl bg-[#E6F4F5] text-[#0E7C86] flex items-center justify-center text-2xl font-bold"
                aria-hidden="true"
              >
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 id="today-briefing-heading" className="text-2xl sm:text-3xl font-black text-[#0F2A33]">
                {t.home.todayForYou}
              </h2>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {briefing && (
                <ReadAloudButton text={briefingFullText} language={language} />
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={loading || refreshCooldown > 0}
                onClick={handleRefresh}
                aria-label={
                  refreshCooldown > 0
                    ? `${t.home.refreshBriefing} (${refreshCooldown}s)`
                    : t.home.refreshBriefing
                }
                title={
                  refreshCooldown > 0
                    ? `${t.home.refreshBriefing} (${refreshCooldown}s)`
                    : t.home.refreshBriefing
                }
                className="min-h-[56px] min-w-[56px] relative"
              >
                <RefreshCw className={`w-6 h-6 text-[#0E7C86] ${loading ? 'animate-spin' : ''}`} />
                {refreshCooldown > 0 && !loading && (
                  <span className="absolute -bottom-1 -right-1 bg-[#0E7C86] text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                    {refreshCooldown}s
                  </span>
                )}
              </Button>
            </div>
          </div>

          {loading ? (
            <Spinner message={t.common.loadingMessage} size="large" />
          ) : briefing ? (
            <div className="space-y-6">
              {Boolean(error) && (
                <div className="p-4 bg-[#FFF9F2] border border-[#F59E0B] rounded-2xl flex items-center justify-between gap-3 text-[#92400E]">
                  <p className="text-base font-medium">
                    {language === 'hi'
                      ? 'नवीनतम जानकारी अपडेट नहीं हो सकी (सहायक व्यस्त है)। पूर्व सारांश दिखाया जा रहा है।'
                      : 'Could not update with live changes (assistant busy). Showing current briefing.'}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="default"
                    onClick={() => fetchBriefing(true)}
                    className="shrink-0"
                  >
                    {language === 'hi' ? 'पुनः प्रयास' : 'Retry'}
                  </Button>
                </div>
              )}

              {/* Greeting */}
              <div className="p-5 bg-[#FFF9EF] rounded-2xl border border-[#E8DEC8]">
                <p className="text-xl sm:text-2xl text-[#0F2A33] font-medium leading-relaxed">
                  {briefing.greeting}
                </p>
              </div>

              {/* Priorities */}
              {briefing.priorities && briefing.priorities.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-[#0E7C86] flex items-center gap-2">
                    <Sun className="w-6 h-6 text-[#0E7C86]" aria-hidden="true" />
                    <span>{t.home.prioritiesTitle}</span>
                  </h3>
                  <ul className="space-y-2.5">
                    {briefing.priorities.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-[#E8DEC8] text-lg text-[#0F2A33] shadow-2xs"
                      >
                        <span className="w-7 h-7 rounded-full bg-[#E6F4F5] text-[#0E7C86] font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="flex-1 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Wellbeing & Safety Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Wellbeing Nudge */}
                <div className="p-5 rounded-2xl bg-[#E6F4F5] border border-[#BCE3E6] space-y-2">
                  <div className="flex items-center gap-2.5 text-[#0E7C86]">
                    <HeartHandshake className="w-6 h-6 shrink-0" aria-hidden="true" />
                    <h3 className="text-lg font-bold">{t.home.wellbeingTitle}</h3>
                  </div>
                  <p className="text-lg text-[#0F2A33] leading-relaxed">
                    {briefing.wellbeingNudge}
                  </p>
                </div>

                {/* Safety Tip */}
                <div className="p-5 rounded-2xl bg-[#FFF4DC] border border-[#FAD896] space-y-2">
                  <div className="flex items-center gap-2.5 text-[#9A6700]">
                    <ShieldCheck className="w-6 h-6 shrink-0" aria-hidden="true" />
                    <h3 className="text-lg font-bold">{t.home.safetyTipTitle}</h3>
                  </div>
                  <p className="text-lg text-[#0F2A33] leading-relaxed">
                    {briefing.safetyTip}
                  </p>
                </div>
              </div>

              {/* Learning Tip */}
              {briefing.learnTip && (
                <div className="p-5 rounded-2xl bg-[#FFF9EF] border border-[#E8DEC8] space-y-2">
                  <div className="flex items-center gap-2.5 text-[#0F2A33]">
                    <Lightbulb className="w-6 h-6 text-[#D96B27] shrink-0" aria-hidden="true" />
                    <h3 className="text-lg font-bold">{t.home.learnTipTitle}</h3>
                  </div>
                  <p className="text-lg text-[#0F2A33] leading-relaxed">
                    {briefing.learnTip}
                  </p>
                </div>
              )}
            </div>
          ) : error ? (
            <AiErrorAlert
              error={error}
              language={language}
              onRetry={() => fetchBriefing(true)}
              isRetrying={loading}
            />
          ) : null}
        </Card>
      </section>

      {/* Primary Action Tiles for Elders (Large, Accessible Touch Targets) */}
      <section aria-labelledby="quick-actions-heading" className="space-y-4">
        <h2 id="quick-actions-heading" className="text-2xl sm:text-3xl font-black text-[#0F2A33]">
          {language === 'hi' ? 'आज आप क्या करना चाहेंगे?' : 'What would you like to do?'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <BigTile
            title={t.home.tileAskTitle}
            description={t.home.tileAskDesc}
            icon={<MessageCircleQuestion className="w-10 h-10" />}
            iconBgColor="bg-[#E6F4F5] text-[#0E7C86]"
            badge={language === 'hi' ? 'बोलें या लिखें' : 'Speak or type'}
            onClick={() => onNavigate('ask')}
          />

          <BigTile
            title={t.home.tileSimplifyTitle}
            description={t.home.tileSimplifyDesc}
            icon={<FileText className="w-10 h-10" />}
            iconBgColor="bg-[#FFEAD0] text-[#D96B27]"
            badge={language === 'hi' ? 'फोटो या पाठ' : 'Photo or text'}
            onClick={() => onNavigate('simplify')}
          />

          <BigTile
            title={t.home.checkinBanner}
            description={t.home.takeCheckin}
            icon={<Smile className="w-10 h-10" />}
            iconBgColor="bg-[#FFF4DC] text-[#9A6700]"
            badge={latestCheckin ? (language === 'hi' ? 'आज दर्ज हुआ' : 'Done today') : undefined}
            onClick={() => onNavigate('checkin')}
          />

          <BigTile
            title={t.home.tileScamTitle}
            description={t.home.tileScamDesc}
            icon={<ShieldCheck className="w-10 h-10" />}
            iconBgColor="bg-[#E6F4F5] text-[#0E7C86]"
            badge={language === 'hi' ? 'सुरक्षा जांच' : 'Security check'}
            onClick={() => onNavigate('scam_shield')}
          />
        </div>
      </section>
    </div>
  );
};
