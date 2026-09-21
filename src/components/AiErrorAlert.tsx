import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { formatErrorMessage } from '../utils/errorMessages';
import type { SupportedLanguage } from '../types';

export interface AiErrorAlertProps {
  error: unknown;
  language: SupportedLanguage;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Accessible, senior-friendly error alert that clearly distinguishes between:
 * 1. Server-side 'AI_BUSY' (RESOURCE_EXHAUSTED / 429) states with a translated countdown timer
 *    keeping the 'Try again' button strictly disabled until cooldown finishes.
 * 2. Generic network failures (offline / connection dropped) with immediate retry capability
 *    and actionable Wi-Fi troubleshooting guidance.
 * 3. Generic service issues without exposing raw JSON or technical stack traces.
 */
export function AiErrorAlert({
  error,
  language,
  onRetry,
  isRetrying = false,
  className = '',
}: AiErrorAlertProps) {
  if (!error) return null;

  const formatted = formatErrorMessage(error, language);
  const totalSeconds = formatted.isAiBusy ? formatted.retryAfterSeconds : 0;
  const [countdown, setCountdown] = useState<number>(totalSeconds);

  // Synchronize countdown when error reference or code changes
  useEffect(() => {
    if (formatted.isAiBusy && formatted.retryAfterSeconds > 0) {
      setCountdown(formatted.retryAfterSeconds);
    } else {
      setCountdown(0);
    }
  }, [error]);

  // Tick down every second while countdown > 0
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Seamlessly auto-retry for the user once the cooldown expires
          setTimeout(() => {
            onRetry();
          }, 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onRetry]);

  const isBlockedByCooldown = formatted.isAiBusy && countdown > 0;
  const isNetworkFailure = formatted.errorCategory === 'network_error' || formatted.errorCategory === 'timeout';
  const isAiBusyState = formatted.isAiBusy;

  // Localized Labels
  const tryAgainLabel = language === 'hi' ? 'पुनः प्रयास करें' : 'Try again';
  const retryingLabel = language === 'hi' ? 'पुनः प्रयास हो रहा है...' : 'Retrying...';
  const pleaseWaitLabel =
    language === 'hi'
      ? `कृपया प्रतीक्षा करें (${countdown}s)`
      : `Please wait (${countdown}s)`;
  const readyToRetryLabel = language === 'hi' ? 'अब पुनः प्रयास करें' : 'Try again now';

  // State 1: Server-side AI Busy / Resource Exhausted / Rate Limit
  if (isAiBusyState) {
    const progressPercent =
      totalSeconds > 0 ? Math.max(0, Math.min(100, (countdown / totalSeconds) * 100)) : 0;

    return (
      <div
        id="ai-busy-error-alert"
        data-testid="ai-error-alert"
        data-error-category="ai_busy"
        role="alert"
        aria-live="assertive"
        className={`p-6 sm:p-7 bg-[#FFF9F2] border-2 border-[#D97706] rounded-3xl text-center space-y-5 shadow-sm ${className}`}
      >
        {/* Category Pill */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF3C7] border border-[#F59E0B] text-[#92400E] font-extrabold text-sm sm:text-base">
            <Clock className="w-4 h-4 text-[#D97706] animate-pulse" aria-hidden="true" />
            <span>{formatted.categoryLabel}</span>
          </span>
        </div>

        {/* Icon Circle */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#FEF3C7] border-2 border-[#D97706] flex items-center justify-center text-[#B45309] shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" aria-hidden="true" />
          </div>
        </div>

        {/* Title & Explanation */}
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-[#78350F]">{formatted.title}</h3>
          <p className="text-lg font-medium text-[#78350F] max-w-xl mx-auto leading-relaxed">
            {formatted.message}
          </p>
          {formatted.suggestion && (
            <p className="text-base text-[#92400E] max-w-lg mx-auto font-normal">
              {formatted.suggestion}
            </p>
          )}
        </div>

        {/* User-Friendly Translated Countdown Timer Display */}
        {countdown > 0 ? (
          <div
            id="ai-cooldown-timer-box"
            data-testid="countdown-timer"
            role="status"
            aria-live="polite"
            className="max-w-md mx-auto p-4 sm:p-5 bg-white border-2 border-[#F59E0B] rounded-2xl shadow-xs space-y-3"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF3C7] flex items-center justify-center text-[#B45309] shrink-0">
                <Clock className="w-6 h-6 animate-pulse" aria-hidden="true" />
              </div>
              <div className="text-left">
                <span className="block text-xs uppercase tracking-wider font-extrabold text-[#92400E]">
                  {language === 'hi' ? 'पुनः प्रयास प्रतीक्षा समय' : 'Retry Cooldown'}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#B45309] font-mono">
                  {countdown} {language === 'hi' ? 'सेकंड' : 'seconds'}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div
              className="w-full bg-[#FEF3C7] h-2.5 rounded-full overflow-hidden"
              aria-label={language === 'hi' ? 'प्रतीक्षा समय प्रगति' : 'Cooldown progress'}
              role="progressbar"
              aria-valuenow={countdown}
              aria-valuemin={0}
              aria-valuemax={totalSeconds || 15}
            >
              <div
                className="bg-[#D97706] h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="text-sm font-bold text-[#92400E]">
              {language === 'hi'
                ? `पुनः प्रयास करने से पहले कृपया ${countdown} सेकंड प्रतीक्षा करें...`
                : `Please wait ${countdown}s before trying again...`}
            </p>
          </div>
        ) : (
          <div
            id="ai-cooldown-finished"
            data-testid="cooldown-finished"
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ECFDF5] border border-[#10B981] rounded-2xl text-[#065F46] font-bold text-base shadow-2xs"
          >
            <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" aria-hidden="true" />
            <span>
              {language === 'hi'
                ? 'प्रतीक्षा समय समाप्त! अब आप पुनः प्रयास कर सकते हैं।'
                : 'Cooldown finished! You can try again now.'}
            </span>
          </div>
        )}

        {/* Try Again Button - Disabled until countdown expires */}
        <div>
          <Button
            id="ai-retry-button"
            data-testid="retry-button"
            type="button"
            variant={countdown > 0 ? 'secondary' : 'primary'}
            size="default"
            disabled={isRetrying || isBlockedByCooldown}
            onClick={onRetry}
            aria-disabled={isRetrying || isBlockedByCooldown}
            className={`min-h-[56px] px-8 font-bold text-lg transition-all ${
              countdown > 0
                ? 'bg-neutral-200 text-neutral-500 border-neutral-300 cursor-not-allowed opacity-75'
                : 'bg-[#D97706] hover:bg-[#B45309] text-white border-[#B45309]'
            }`}
          >
            {isRetrying ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>{retryingLabel}</span>
              </span>
            ) : countdown > 0 ? (
              pleaseWaitLabel
            ) : (
              readyToRetryLabel
            )}
          </Button>
        </div>
      </div>
    );
  }

  // State 2: Generic Network Failure (Connection loss / Offline / Timeout)
  if (isNetworkFailure) {
    return (
      <div
        id="network-error-alert"
        data-testid="ai-error-alert"
        data-error-category="network_error"
        role="alert"
        aria-live="assertive"
        className={`p-6 sm:p-7 bg-[#F0F7FF] border-2 border-[#2563EB] rounded-3xl text-center space-y-5 shadow-sm ${className}`}
      >
        {/* Category Pill */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#DBEAFE] border border-[#3B82F6] text-[#1E40AF] font-extrabold text-sm sm:text-base">
            <WifiOff className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
            <span>{formatted.categoryLabel}</span>
          </span>
        </div>

        {/* Icon Circle */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#DBEAFE] border-2 border-[#2563EB] flex items-center justify-center text-[#1D4ED8] shadow-inner">
            <WifiOff className="w-8 h-8" aria-hidden="true" />
          </div>
        </div>

        {/* Title & Explanation */}
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-[#1E3A8A]">{formatted.title}</h3>
          <p className="text-lg font-medium text-[#1E40AF] max-w-xl mx-auto leading-relaxed">
            {formatted.message}
          </p>
        </div>

        {/* Senior-Friendly Network Troubleshooting Advice */}
        <div className="max-w-md mx-auto p-4 bg-white border border-[#93C5FD] rounded-2xl text-left space-y-2 text-[#1E3A8A]">
          <p className="font-bold text-sm uppercase tracking-wide text-[#1D4ED8]">
            {language === 'hi' ? 'त्वरित समाधान:' : 'Quick checklist:'}
          </p>
          <ul className="text-base space-y-1.5 list-disc list-inside font-medium text-[#1E3A8A]">
            <li>
              {language === 'hi'
                ? 'जांचें कि आपके फोन में वाई-फ़ाई (Wi-Fi) या मोबाइल डेटा चालू है।'
                : 'Make sure Wi-Fi or mobile data is switched on.'}
            </li>
            <li>
              {language === 'hi'
                ? 'अगर सिग्नल कमज़ोर है, तो थोड़ा इंतज़ार करें या बेहतर जगह जाएं।'
                : 'If signal is weak, wait a moment or move closer to router.'}
            </li>
            <li>
              {language === 'hi'
                ? 'इंटरनेट शुरू होते ही तुरंत नीचे "पुनः प्रयास करें" दबाएं।'
                : 'Once reconnected, tap the "Try again" button below.'}
            </li>
          </ul>
        </div>

        {/* Try Again Button - Immediately enabled for network recovery */}
        <div>
          <Button
            id="network-retry-button"
            data-testid="retry-button"
            type="button"
            variant="primary"
            size="default"
            disabled={isRetrying}
            onClick={onRetry}
            aria-disabled={isRetrying}
            className="min-h-[56px] px-8 font-bold text-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-[#1E40AF]"
          >
            {isRetrying ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>{retryingLabel}</span>
              </span>
            ) : (
              tryAgainLabel
            )}
          </Button>
        </div>
      </div>
    );
  }

  // State 3: Generic Server / Technical Error
  return (
    <div
      id="generic-error-alert"
      data-testid="ai-error-alert"
      data-error-category="generic"
      role="alert"
      aria-live="assertive"
      className={`p-6 sm:p-7 bg-[#FDE8E8] border-2 border-[#C62828] rounded-3xl text-center space-y-5 shadow-sm ${className}`}
    >
      {/* Category Pill */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FCE8E6] border border-[#EF4444] text-[#991B1B] font-extrabold text-sm sm:text-base">
          <AlertCircle className="w-4 h-4 text-[#DC2626]" aria-hidden="true" />
          <span>{formatted.categoryLabel}</span>
        </span>
      </div>

      {/* Icon Circle */}
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-[#FCE8E6] border-2 border-[#C62828] flex items-center justify-center text-[#C62828] shadow-inner">
          <AlertCircle className="w-8 h-8 text-[#C62828]" aria-hidden="true" />
        </div>
      </div>

      {/* Title & Explanation */}
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-[#8B0000]">{formatted.title}</h3>
        <p className="text-lg font-medium text-[#8B0000] max-w-xl mx-auto leading-relaxed">
          {formatted.message}
        </p>
        {formatted.suggestion && (
          <p className="text-base text-[#991B1B] max-w-lg mx-auto font-normal">
            {formatted.suggestion}
          </p>
        )}
      </div>

      {/* Try Again Button - Immediately enabled */}
      <div>
        <Button
          id="generic-retry-button"
          data-testid="retry-button"
          type="button"
          variant="danger"
          size="default"
          disabled={isRetrying}
          onClick={onRetry}
          aria-disabled={isRetrying}
          className="min-h-[56px] px-8 font-bold text-lg"
        >
          {isRetrying ? (
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>{retryingLabel}</span>
            </span>
          ) : (
            tryAgainLabel
          )}
        </Button>
      </div>
    </div>
  );
}

