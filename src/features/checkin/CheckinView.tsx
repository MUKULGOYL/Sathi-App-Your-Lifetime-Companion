import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Meh,
  Frown,
  Heart,
  ShieldAlert,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { AiErrorAlert } from '../../components/AiErrorAlert';
import { useI18n } from '../../i18n';
import { callGenerateApi, ApiError } from '../../services/apiClient';
import { getTodayDateString, formatDate } from '../../utils/dates';
import { CHECKIN_SYMPTOMS } from '../../constants';
import type { CheckinMood, CheckinEntry, ActiveTab } from '../../types';

export interface CheckinResult {
  kindGuidance: string;
  gentleActions: string[];
  affirmation: string;
  recommendedActions?: string[];
  gentleAffirmation?: string;
  shouldSeekHelp?: boolean;
}

export interface CheckinViewProps {
  checkinHistory: CheckinEntry[];
  onSaveCheckin: (entry: CheckinEntry) => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const CheckinView: React.FC<CheckinViewProps> = ({
  checkinHistory,
  onSaveCheckin,
  onNavigate,
}) => {
  const { language, t } = useI18n();

  const [selectedMood, setSelectedMood] = useState<CheckinMood>('good');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);

  const resultRef = useRef<HTMLHeadingElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const todayStr = getTodayDateString();

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId) ? prev.filter((s) => s !== symptomId) : [...prev, symptomId]
    );
  };

  const handleSubmitCheckin = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const payload = {
        mood: selectedMood,
        symptoms: selectedSymptoms,
        notes: notes.trim(),
      };

      const data = await callGenerateApi<any>('checkin', language, payload, {
        signal: abortControllerRef.current.signal,
      });

      const normalizedResult: CheckinResult = {
        kindGuidance: data.kindGuidance || '',
        gentleActions: data.gentleActions || data.recommendedActions || [],
        affirmation: data.affirmation || data.gentleAffirmation || '',
        shouldSeekHelp: data.shouldSeekHelp,
      };

      setResult(normalizedResult);

      // Save into checkin history
      const newEntry: CheckinEntry = {
        id: `checkin_${Date.now()}`,
        date: todayStr,
        mood: selectedMood,
        symptoms: selectedSymptoms,
        notes: notes.trim(),
        aiResponse: normalizedResult.kindGuidance,
        timestamp: new Date().toISOString(),
      };

      onSaveCheckin(newEntry);

      setTimeout(() => {
        if (resultRef.current) {
          resultRef.current.focus();
        }
      }, 100);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 499) return;
      console.error('[CheckinView Error]:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const resultSpeech = result
    ? `${result.kindGuidance}. ${t.checkin.actionsTitle}: ${result.gentleActions.join('. ')}. ${result.affirmation}`
    : '';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F2A33] tracking-tight">
          {t.checkin.title}
        </h1>
        <p className="text-xl sm:text-2xl text-[#243C45]">{t.checkin.whatThisDoes}</p>
      </header>

      {/* Mood Selection Card */}
      <Card variant="surface" className="p-6 sm:p-8 space-y-6">
        <div className="space-y-3">
          <label className="block text-2xl font-black text-[#0F2A33]">
            {t.checkin.question}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'good', label: t.checkin.moodGood, icon: Smile, color: 'text-[#064E56]', border: 'border-[#0E7C86]', bg: 'bg-[#E6F4F5]' },
              { id: 'okay', label: t.checkin.moodOkay, icon: Meh, color: 'text-[#6B4300]', border: 'border-[#F4A300]', bg: 'bg-[#FFF4DC]' },
              { id: 'not_well', label: t.checkin.moodNotWell, icon: Frown, color: 'text-[#8B0000]', border: 'border-[#C62828]', bg: 'bg-[#FDE8E8]' },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setSelectedMood(m.id as CheckinMood)}
                  className={`min-h-[80px] p-4 rounded-2xl border-3 font-bold flex items-center justify-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? `${m.bg} ${m.border} ${m.color} shadow-md scale-[1.02]`
                      : 'bg-white border-[#E8DEC8] text-[#0F2A33] hover:bg-[#FFF9EF]'
                  } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Icon className="w-8 h-8 shrink-0" />
                  <span className="text-xl">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Symptoms Chips */}
        <div className="space-y-3 pt-2">
          <label className="block text-xl font-bold text-[#0F2A33]">
            {t.checkin.symptomsQuestion}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {CHECKIN_SYMPTOMS.map((s: { id: string; en: string; hi: string }) => {
              const isSelected = selectedSymptoms.includes(s.id);
              const label = language === 'hi' ? s.hi : s.en;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={loading}
                  onClick={() => toggleSymptom(s.id)}
                  aria-pressed={isSelected}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0E7C86] text-white border-[#0E7C86] shadow-2xs'
                      : 'bg-white text-[#0F2A33] border-[#E8DEC8] hover:border-[#0E7C86]'
                  } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Notes */}
        <div className="space-y-2">
          <label htmlFor="checkin-notes" className="block text-lg font-bold text-[#243C45]">
            {t.checkin.notesPlaceholder}
          </label>
          <input
            id="checkin-notes"
            type="text"
            value={notes}
            disabled={loading}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.checkin.notesPlaceholder}
            maxLength={1000}
            className="w-full min-h-[64px] px-5 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] bg-white outline-none text-[#0F2A33] disabled:opacity-60"
          />
        </div>

        {/* Submit */}
        <Button
          type="button"
          variant="primary"
          size="large"
          loading={loading}
          disabled={loading}
          onClick={handleSubmitCheckin}
          icon={<Heart className="w-7 h-7 fill-current" />}
          className="w-full"
        >
          {t.checkin.submitButton}
        </Button>
      </Card>

      {/* Loading */}
      {loading && (
        <Card variant="surface">
          <Spinner message={t.common.loadingMessage} size="large" />
        </Card>
      )}

      {/* Error */}
      {error ? (
        <AiErrorAlert
          error={error}
          language={language}
          onRetry={handleSubmitCheckin}
          isRetrying={loading}
        />
      ) : null}

      {/* AI Guidance Result */}
      {result && (
        <section aria-labelledby="checkin-result-heading" className="space-y-6">
          <Card variant="surface" className="p-6 sm:p-8 space-y-6 border-2 border-[#0E7C86]">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#E8DEC8] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E6F4F5] text-[#0E7C86] flex items-center justify-center text-2xl font-bold">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h2
                  ref={resultRef}
                  tabIndex={-1}
                  id="checkin-result-heading"
                  className="text-2xl sm:text-3xl font-black text-[#0F2A33] focus-visible:outline-none"
                >
                  {t.checkin.kindGuidanceTitle}
                </h2>
              </div>
              <ReadAloudButton text={resultSpeech} language={language} />
            </div>

            {/* Kind Guidance */}
            <div className="p-5 bg-[#FFF9EF] rounded-2xl border border-[#E8DEC8] text-xl sm:text-2xl text-[#0F2A33] font-medium leading-relaxed">
              {result.kindGuidance}
            </div>

            {/* Gentle Actions */}
            {result.gentleActions && result.gentleActions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-[#0E7C86]">{t.checkin.actionsTitle}</h3>
                <div className="space-y-2">
                  {result.gentleActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-2xl border-2 border-[#E8DEC8] flex items-start gap-3"
                    >
                      <span className="w-8 h-8 rounded-xl bg-[#0E7C86] text-white flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-lg sm:text-xl font-semibold text-[#0F2A33] leading-relaxed">
                        {action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affirmation */}
            {result.affirmation && (
              <div className="p-4 bg-[#E6F4F5] rounded-2xl border border-[#0E7C86] text-center font-bold text-xl text-[#0E7C86]">
                "{result.affirmation}"
              </div>
            )}

            {/* If 'Not Well' -> Link to SOS & Emergency */}
            {selectedMood === 'not_well' && (
              <div className="p-6 bg-[#FDE8E8] border-2 border-[#C62828] rounded-3xl space-y-4">
                <div className="flex items-center gap-3 text-[#C62828]">
                  <ShieldAlert className="w-8 h-8 shrink-0" />
                  <p className="text-xl font-bold">{t.checkin.needDoctorHelp}</p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="large"
                  onClick={() => onNavigate('sos')}
                  className="w-full"
                >
                  {t.checkin.goToSos}
                </Button>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Past 7 Days Mood History */}
      {checkinHistory.length > 0 && (
        <section aria-labelledby="mood-history-heading" className="space-y-4">
          <h2 id="mood-history-heading" className="text-2xl font-black text-[#0F2A33]">
            {t.checkin.historyTitle}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {checkinHistory.slice(-7).map((entry) => {
              const isGood = entry.mood === 'good';
              const isOkay = entry.mood === 'okay';
              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-2xl border-2 text-center space-y-2 ${
                    isGood
                      ? 'bg-[#E6F4F5] border-[#0E7C86]'
                      : isOkay
                      ? 'bg-[#FFF4DC] border-[#F4A300]'
                      : 'bg-[#FDE8E8] border-[#C62828]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#4A636C] block">
                    {formatDate(entry.date, language)}
                  </span>
                  <div className="text-2xl flex justify-center">
                    {isGood ? (
                      <Smile className="w-8 h-8 text-[#0E7C86]" />
                    ) : isOkay ? (
                      <Meh className="w-8 h-8 text-[#F4A300]" />
                    ) : (
                      <Frown className="w-8 h-8 text-[#C62828]" />
                    )}
                  </div>
                  <span className="text-sm font-bold block capitalize text-[#0F2A33]">
                    {isGood ? t.checkin.moodGood : isOkay ? t.checkin.moodOkay : t.checkin.moodNotWell}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
