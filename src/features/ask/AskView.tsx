import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  HelpCircle,
  BookmarkPlus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { VoiceInputButton } from '../../components/VoiceInputButton';
import { ReadAloudButton } from '../../components/ReadAloudButton';
import { Spinner } from '../../components/Spinner';
import { AiErrorAlert } from '../../components/AiErrorAlert';
import { useI18n } from '../../i18n';
import { callGenerateApi, ApiError } from '../../services/apiClient';
import { detectAndMaskSensitiveData } from '../../utils/sensitiveData';
import { SUGGESTED_ASK_QUESTIONS } from '../../constants';
import type { UserProfile, CheckinEntry, AskMessage, ReminderItem } from '../../types';

export interface AskViewProps {
  profile: UserProfile;
  latestCheckin: CheckinEntry | null;
  history: AskMessage[];
  onUpdateHistory: (history: AskMessage[]) => void;
  onAddReminder: (reminder: Omit<ReminderItem, 'id' | 'completed'>) => void;
}

export const AskView: React.FC<AskViewProps> = ({
  profile,
  latestCheckin,
  history,
  onUpdateHistory,
  onAddReminder,
}) => {
  const { language, t } = useI18n();

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [sensitiveWarning, setSensitiveWarning] = useState(false);
  const [savedReminderId, setSavedReminderId] = useState<string | null>(null);

  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAsk = async (queryToSubmit: string, simplifyFurther = false) => {
    const rawQuery = queryToSubmit.trim();
    if (!rawQuery || loading) return;

    // Detect and mask sensitive data
    const detection = detectAndMaskSensitiveData(rawQuery);
    if (detection.hasSensitiveData) {
      setSensitiveWarning(true);
      setTimeout(() => setSensitiveWarning(false), 6000);
    }

    const cleanQuery = detection.maskedText;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setSavedReminderId(null);

    // Append user message immediately
    const userMsg: AskMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: cleanQuery,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...history, userMsg];
    onUpdateHistory(newHistory);
    setInputQuery('');

    try {
      const payload = {
        query: cleanQuery,
        history: history.slice(-10).map((h) => ({
          role: h.role,
          text: h.text,
        })),
        profile: {
          name: profile.name,
          city: profile.city,
        },
        mood: latestCheckin?.mood,
        simplifyFurther,
      };

      const data = await callGenerateApi<{
        answer: string;
        stepByStep: string[];
        simplifiedSummary: string;
        suggestedFollowUps: string[];
        canSaveAsReminder: boolean;
        reminderSuggestion?: {
          title: string;
          suggestedTime?: string;
          category: 'medicine' | 'appointment' | 'bill' | 'other';
        };
      }>('ask', language, payload, { signal: abortControllerRef.current.signal });

      const assistantMsg: AskMessage = {
        id: `assist_${Date.now()}`,
        role: 'assistant',
        text: data.answer,
        timestamp: new Date().toISOString(),
        stepByStep: data.stepByStep,
        simplifiedSummary: data.simplifiedSummary,
        suggestedFollowUps: data.suggestedFollowUps,
        canSaveAsReminder: data.canSaveAsReminder,
        reminderSuggestion: data.reminderSuggestion,
      };

      onUpdateHistory([...newHistory, assistantMsg]);

      // Move focus to result heading for accessibility
      setTimeout(() => {
        if (resultHeadingRef.current) {
          resultHeadingRef.current.focus();
        }
      }, 100);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 499) return;
      console.error('[AskView Error]:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsReminder = (msg: AskMessage) => {
    const suggestion = msg.reminderSuggestion;
    const title = suggestion?.title || msg.text.slice(0, 50);
    const category = suggestion?.category || 'other';
    const now = new Date();
    const time = suggestion?.suggestedTime || `${String(now.getHours() + 1).padStart(2, '0')}:00`;
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    onAddReminder({
      title,
      category,
      time,
      date,
      repeat: 'none',
      source: 'ask',
    });

    setSavedReminderId(msg.id);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Heading */}
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0F2A33] tracking-tight">
          {t.ask.title}
        </h1>
        <p className="text-xl sm:text-2xl text-[#243C45]">{t.ask.whatThisDoes}</p>
      </header>

      {/* Sensitive data warning banner */}
      {sensitiveWarning && (
        <div
          role="alert"
          className="p-4 bg-[#FFF4DC] border-2 border-[#F4A300] rounded-2xl flex items-center gap-3 text-[#6B4300]"
        >
          <AlertCircle className="w-7 h-7 shrink-0" aria-hidden="true" />
          <p className="text-lg font-semibold">{t.securityAlert.sensitiveWarning}</p>
        </div>
      )}

      {/* Suggested Questions Chips */}
      <section aria-labelledby="suggested-chips-heading" className="space-y-3">
        <h2 id="suggested-chips-heading" className="text-lg sm:text-xl font-bold text-[#0F2A33]">
          {t.ask.suggestedTitle}
        </h2>
        <div className="flex flex-wrap gap-2.5">
          {SUGGESTED_ASK_QUESTIONS.map((q, idx) => {
            const label = language === 'hi' ? q.hi : q.en;
            return (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => {
                  setInputQuery(label);
                  handleAsk(label);
                }}
                className={`px-4 py-2.5 rounded-2xl bg-white border-2 border-[#E8DEC8] hover:border-[#0E7C86] hover:bg-[#E6F4F5] text-[#0F2A33] text-base sm:text-lg font-semibold transition-all cursor-pointer text-left shadow-2xs active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-[#0E7C86] ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Input area */}
      <section aria-labelledby="ask-input-heading" className="space-y-3">
        <label id="ask-input-heading" htmlFor="ask-input" className="sr-only">
          {t.ask.inputPlaceholder}
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              id="ask-input"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAsk(inputQuery);
                }
              }}
              placeholder={t.ask.inputPlaceholder}
              disabled={loading}
              maxLength={2000}
              className="w-full min-h-[64px] px-6 text-xl rounded-2xl border-2 border-[#E8DEC8] focus:border-[#0E7C86] focus-visible:ring-3 focus-visible:ring-[#0E7C86] bg-white outline-none shadow-xs text-[#0F2A33]"
            />
          </div>

          {/* Voice Input Button */}
          <VoiceInputButton
            language={language}
            onTranscript={(text) => {
              setInputQuery(text);
              handleAsk(text);
            }}
          />

          {/* Send Button */}
          <Button
            type="button"
            variant="primary"
            disabled={!inputQuery.trim() || loading}
            onClick={() => handleAsk(inputQuery)}
            aria-label={t.common.send}
            className="min-h-[64px] min-w-[64px] px-6"
          >
            <Send className="w-6 h-6" aria-hidden="true" />
          </Button>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <Card variant="surface">
          <Spinner message={t.common.loadingMessage} size="large" />
        </Card>
      )}

      {/* Error State */}
      {error ? (
        <AiErrorAlert
          error={error}
          language={language}
          onRetry={() => {
            const lastUserMsg = [...history].reverse().find((h) => h.role === 'user');
            if (lastUserMsg) handleAsk(lastUserMsg.text);
          }}
          isRetrying={loading}
        />
      ) : null}

      {/* Conversation Thread */}
      <section aria-label="Conversation history" className="space-y-6">
        {history.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLatestAssistant = !isUser && idx === history.length - 1;

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-2xl bg-[#0E7C86] text-white p-5 sm:p-6 rounded-3xl rounded-br-sm shadow-sm space-y-1">
                  <p className="text-xl sm:text-2xl font-bold">{msg.text}</p>
                </div>
              </div>
            );
          }

          // Assistant message
          const speechText = `${msg.text} ${msg.stepByStep?.join('. ') || ''}`;

          return (
            <div key={msg.id} className="flex justify-start">
              <Card
                variant="surface"
                className="max-w-3xl w-full p-6 sm:p-8 space-y-6 border-2 border-[#E8DEC8]"
              >
                {/* Header with icon & read aloud */}
                <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[#E8DEC8] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E6F4F5] text-[#0E7C86] flex items-center justify-center font-bold">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h2
                      ref={isLatestAssistant ? resultHeadingRef : null}
                      tabIndex={isLatestAssistant ? -1 : undefined}
                      className="text-2xl font-black text-[#0F2A33] focus-visible:outline-none"
                    >
                      {t.app.name}
                    </h2>
                  </div>

                  <ReadAloudButton text={speechText} language={language} />
                </div>

                {/* Direct Answer */}
                <div className="text-xl sm:text-2xl text-[#0F2A33] font-medium leading-relaxed">
                  {msg.text}
                </div>

                {/* Numbered Steps if present */}
                {msg.stepByStep && msg.stepByStep.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xl font-bold text-[#0E7C86] flex items-center gap-2">
                      <HelpCircle className="w-6 h-6" aria-hidden="true" />
                      <span>{t.ask.stepsHeading}</span>
                    </h3>
                    <ol className="space-y-3">
                      {msg.stepByStep.map((step, sIdx) => (
                        <li
                          key={sIdx}
                          className="p-4 bg-[#FFF9EF] rounded-2xl border border-[#E8DEC8] flex items-start gap-4"
                        >
                          <span className="w-9 h-9 rounded-xl bg-[#0E7C86] text-white flex items-center justify-center font-black text-lg shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className="text-lg sm:text-xl font-semibold text-[#0F2A33] leading-relaxed">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Simplified Summary */}
                {msg.simplifiedSummary && (
                  <div className="p-4 bg-[#FFF4DC] border border-[#F4A300] rounded-2xl">
                    <span className="font-bold text-[#9A6700] text-sm uppercase tracking-wider block mb-1">
                      {t.ask.summaryHeading}
                    </span>
                    <p className="text-lg sm:text-xl text-[#0F2A33] font-medium">
                      {msg.simplifiedSummary}
                    </p>
                  </div>
                )}

                {/* Action Buttons: Explain Simpler & Save as Reminder */}
                <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[#E8DEC8]">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const lastUser = [...history.slice(0, idx)].reverse().find((h) => h.role === 'user');
                      if (lastUser) {
                        handleAsk(lastUser.text, true);
                      }
                    }}
                    icon={<RotateCcw className="w-5 h-5" />}
                    className="text-base"
                  >
                    {t.ask.explainSimpler}
                  </Button>

                  <Button
                    type="button"
                    variant={savedReminderId === msg.id ? 'secondary' : 'accent'}
                    disabled={savedReminderId === msg.id}
                    onClick={() => handleSaveAsReminder(msg)}
                    icon={
                      savedReminderId === msg.id ? (
                        <CheckCircle2 className="w-5 h-5 text-[#0E7C86]" />
                      ) : (
                        <BookmarkPlus className="w-5 h-5" />
                      )
                    }
                    className="text-base"
                  >
                    {savedReminderId === msg.id ? t.ask.savedToReminders : t.ask.saveAsReminder}
                  </Button>
                </div>

                {/* Suggested Follow-Ups */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-sm font-bold text-[#4A636C] uppercase tracking-wider">
                      {t.ask.followUpsHeading}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.suggestedFollowUps.map((fUp, fIdx) => (
                        <button
                          key={fIdx}
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setInputQuery(fUp);
                            handleAsk(fUp);
                          }}
                          className={`px-3.5 py-2 rounded-xl bg-[#FFF9EF] border border-[#E8DEC8] hover:border-[#0E7C86] text-[#0F2A33] text-base font-semibold transition-colors cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {fUp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </section>
    </div>
  );
};
