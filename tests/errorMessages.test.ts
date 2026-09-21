import { describe, it, expect } from 'vitest';
import { formatErrorMessage } from '../src/utils/errorMessages';
import { ApiError } from '../src/services/apiClient';

describe('Error-to-Message Mapping (formatErrorMessage)', () => {
  it('maps AI_BUSY / 429 error to translated title, message, and countdown in English', () => {
    const error = new ApiError(
      'AI assistant is currently busy. Please wait a moment before trying again.',
      429,
      'साथी सहायक इस समय व्यस्त है। कृपया थोड़ी देर प्रतीक्षा करें।',
      'AI_BUSY',
      30
    );

    const formatted = formatErrorMessage(error, 'en');
    expect(formatted.isAiBusy).toBe(true);
    expect(formatted.retryAfterSeconds).toBe(30);
    expect(formatted.title).toBe('Sathi assistant is busy right now');
    expect(formatted.message).toContain('Please wait a moment and try again');
    // Ensure no raw JSON or developer stack leaks
    expect(formatted.message).not.toContain('{');
    expect(formatted.message).not.toContain('ApiError');
  });

  it('maps AI_BUSY / 429 error to friendly Hindi message and title', () => {
    const error = new ApiError(
      'Too many requests',
      429,
      'कृपया थोड़ी देर प्रतीक्षा करें',
      'AI_BUSY',
      20
    );

    const formatted = formatErrorMessage(error, 'hi');
    expect(formatted.isAiBusy).toBe(true);
    expect(formatted.retryAfterSeconds).toBe(20);
    expect(formatted.title).toBe('साथी सहायक इस समय व्यस्त है');
    expect(formatted.message).toContain('कृपया कुछ क्षण प्रतीक्षा करें');
  });

  it('defaults retryAfterSeconds to 15 when not provided on 429', () => {
    const error = new ApiError('Too many requests', 429, 'बहुत सारे अनुरोध', 'AI_BUSY');
    const formatted = formatErrorMessage(error, 'en');
    expect(formatted.isAiBusy).toBe(true);
    expect(formatted.retryAfterSeconds).toBe(15);
  });

  it('maps RATE_LIMIT_EXCEEDED to isAiBusy with translated text', () => {
    const error = new ApiError('Rate limit exceeded', 429, 'सीमा समाप्त', 'RATE_LIMIT_EXCEEDED');
    const formatted = formatErrorMessage(error, 'en');
    expect(formatted.isAiBusy).toBe(true);
    expect(formatted.title).toBe('Too many requests');
    expect(formatted.message).toContain('Too many requests. Please pause for a moment');
  });

  it('maps 504 Gateway Timeout / timeout error to friendly connection advice', () => {
    const error = new ApiError('Request timed out', 504);
    const formattedEn = formatErrorMessage(error, 'en');
    expect(formattedEn.isAiBusy).toBe(false);
    expect(formattedEn.title).toBe('Request timed out');
    expect(formattedEn.message).toContain('connection');

    const formattedHi = formatErrorMessage(error, 'hi');
    expect(formattedHi.title).toBe('अनुरोध में अधिक समय लगा');
  });

  it('maps 500 Server Error without exposing raw JSON or technical stack traces', () => {
    const error = new ApiError('Internal Server Error with stack trace: at server.ts:45', 500);
    const formatted = formatErrorMessage(error, 'en');
    expect(formatted.isAiBusy).toBe(false);
    expect(formatted.title).toBe('Unable to complete request');
    expect(formatted.message).toBeDefined();

    // Raw JSON or stack trace error
    const jsonError = new Error('{"error": "crash", "stack": "server.ts:45"}');
    const formattedJson = formatErrorMessage(jsonError, 'en');
    expect(formattedJson.message).not.toContain('{');
    expect(formattedJson.message).not.toContain('stack');
  });

  it('handles standard Error instances and unknown objects safely', () => {
    const standardError = new Error('Network request failed');
    const formatted = formatErrorMessage(standardError, 'en');
    expect(formatted.title).toBe('Connection problem');
    expect(formatted.message).toContain('Please check your internet');

    const unknownObj = { weird: 'object', status: 999 };
    const formattedUnknown = formatErrorMessage(unknownObj, 'en');
    expect(formattedUnknown.title).toBe('Unable to complete request');
    expect(formattedUnknown.message).not.toContain('weird');
  });

  it('clearly distinguishes generic network failure from server-side AI_BUSY state', () => {
    // 1. Generic Network Failure
    const networkError = new ApiError('Failed to fetch', 500, 'नेटवर्क त्रुटि', 'NETWORK_ERROR');
    const networkFormatted = formatErrorMessage(networkError, 'en');
    expect(networkFormatted.errorCategory).toBe('network_error');
    expect(networkFormatted.isAiBusy).toBe(false);
    expect(networkFormatted.retryAfterSeconds).toBe(0);
    expect(networkFormatted.categoryLabel).toContain('Network');
    expect(networkFormatted.suggestion).toContain('Wi-Fi');

    // 2. Server-side RESOURCE_EXHAUSTED / AI_BUSY state
    const aiBusyError = new ApiError(
      'RESOURCE_EXHAUSTED: quota exceeded for model',
      429,
      'साथी सहायक व्यस्त है',
      'AI_BUSY',
      20
    );
    const aiBusyFormatted = formatErrorMessage(aiBusyError, 'en');
    expect(aiBusyFormatted.errorCategory).toBe('ai_busy');
    expect(aiBusyFormatted.isAiBusy).toBe(true);
    expect(aiBusyFormatted.retryAfterSeconds).toBe(20);
    expect(aiBusyFormatted.categoryLabel).toContain('Busy');
    expect(aiBusyFormatted.suggestion).toContain('cooldown');
  });

  it('provides translated Hindi recovery suggestions for both network and AI_BUSY errors', () => {
    const networkError = new Error('Failed to fetch from backend');
    const netFormattedHi = formatErrorMessage(networkError, 'hi');
    expect(netFormattedHi.errorCategory).toBe('network_error');
    expect(netFormattedHi.title).toBe('इंटरनेट कनेक्शन समस्या');
    expect(netFormattedHi.suggestion).toContain('वाई-फ़ाई');

    const aiBusyError = new ApiError('AI_BUSY', 429, 'व्यस्त', 'AI_BUSY', 15);
    const aiBusyFormattedHi = formatErrorMessage(aiBusyError, 'hi');
    expect(aiBusyFormattedHi.errorCategory).toBe('ai_busy');
    expect(aiBusyFormattedHi.title).toBe('साथी सहायक इस समय व्यस्त है');
    expect(aiBusyFormattedHi.suggestion).toContain('उलटी गिनती');
  });
});

