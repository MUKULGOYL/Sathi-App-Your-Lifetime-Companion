import type { SupportedLanguage } from '../types';

export type ErrorCategory = 'ai_busy' | 'rate_limit' | 'network_error' | 'timeout' | 'generic';

export interface FormattedErrorMessage {
  title: string;
  message: string;
  isAiBusy: boolean;
  retryAfterSeconds: number;
  errorCategory: ErrorCategory;
  categoryLabel: string;
  suggestion?: string;
}

/**
 * Maps any server or client error to a friendly, translated message.
 * Strict safety rule: Never expose raw JSON strings, stack traces, or raw object strings to the user.
 * Explicitly distinguishes generic network failures from server-side AI_BUSY (RESOURCE_EXHAUSTED) states
 * with countdown seconds and helpful localized recovery instructions.
 */
export function formatErrorMessage(
  err: unknown,
  language: SupportedLanguage = 'en'
): FormattedErrorMessage {
  const anyErr = err as Record<string, unknown> | null;
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;
  const status = typeof anyErr?.status === 'number' ? anyErr.status : undefined;
  const retryAfterSec =
    typeof anyErr?.retryAfterSeconds === 'number' && anyErr.retryAfterSeconds > 0
      ? anyErr.retryAfterSeconds
      : 15;

  const rawMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const errorHi = typeof anyErr?.errorHi === 'string' ? anyErr.errorHi : undefined;

  // Check if rawMsg contains raw JSON or unformatted technical artifacts
  const isRawJson =
    (rawMsg.trim().startsWith('{') && rawMsg.trim().endsWith('}')) ||
    rawMsg.includes('"error"') ||
    rawMsg.includes('{"') ||
    rawMsg.includes('[object Object]') ||
    rawMsg.includes('SyntaxError');

  const upperRaw = rawMsg.toUpperCase();
  const lowerRaw = rawMsg.toLowerCase();

  // Case 1: Gemini upstream 429/RESOURCE_EXHAUSTED mapped to AI_BUSY
  const isExplicitAiBusy =
    code === 'AI_BUSY' ||
    code === 'RESOURCE_EXHAUSTED' ||
    upperRaw.includes('RESOURCE_EXHAUSTED') ||
    upperRaw.includes('AI_BUSY') ||
    upperRaw.includes('QUOTA') ||
    (status === 429 && upperRaw.includes('BUSY'));

  if (isExplicitAiBusy) {
    return {
      title: language === 'hi' ? 'साथी सहायक इस समय व्यस्त है' : 'Sathi assistant is busy right now',
      message:
        language === 'hi'
          ? 'इस समय कई लोग साथी से बात कर रहे हैं। कृपया कुछ क्षण प्रतीक्षा करें और पुनः प्रयास करें।'
          : 'Sathi assistant is busy right now. Please wait a moment and try again.',
      isAiBusy: true,
      retryAfterSeconds: retryAfterSec,
      errorCategory: 'ai_busy',
      categoryLabel: language === 'hi' ? 'साथी सहायक व्यस्त • प्रतीक्षा समय सक्रिय' : 'AI Assistant Busy • Cooldown Active',
      suggestion:
        language === 'hi'
          ? 'एआई सर्वर पर अधिक लोड है। कृपया उलटी गिनती समाप्त होने तक प्रतीक्षा करें।'
          : 'Our AI assistant is temporarily handling a high volume of requests. Please wait for the cooldown timer before trying again.',
    };
  }

  // Case 2: Server-side per-IP rate limit reached (429)
  const isRateLimit =
    code === 'RATE_LIMIT_EXCEEDED' ||
    status === 429 ||
    upperRaw.includes('RATE LIMIT') ||
    upperRaw.includes('TOO MANY REQUESTS');

  if (isRateLimit) {
    return {
      title: language === 'hi' ? 'कृपया थोड़ी देर प्रतीक्षा करें' : 'Too many requests',
      message:
        language === 'hi'
          ? 'बहुत सारे अनुरोध। कृपया थोड़ी देर प्रतीक्षा करें और पुनः प्रयास करें।'
          : 'Too many requests. Please pause for a moment and try again.',
      isAiBusy: true,
      retryAfterSeconds: retryAfterSec,
      errorCategory: 'rate_limit',
      categoryLabel: language === 'hi' ? 'अनुरोध सीमा • प्रतीक्षा समय सक्रिय' : 'Request Limit • Cooldown Active',
      suggestion:
        language === 'hi'
          ? 'बहुत जल्दी-जल्दी अनुरोध भेजे गए हैं। कृपया टाइमर समाप्त होने तक प्रतीक्षा करें।'
          : 'Too many actions were attempted quickly. Please wait for the cooldown timer.',
    };
  }

  // Case 3: Request timeout (504)
  if (
    status === 504 ||
    lowerRaw.includes('timeout') ||
    lowerRaw.includes('longer than expected')
  ) {
    return {
      title: language === 'hi' ? 'अनुरोध में अधिक समय लगा' : 'Request timed out',
      message:
        language === 'hi'
          ? 'अनुरोध में अधिक समय लगा। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
          : 'The request took longer than expected. Please check your connection and try again.',
      isAiBusy: false,
      retryAfterSeconds: 0,
      errorCategory: 'timeout',
      categoryLabel: language === 'hi' ? 'समय सीमा समाप्त' : 'Request Timed Out',
      suggestion:
        language === 'hi'
          ? 'धीमे इंटरनेट कनेक्शन की वजह से देरी हो सकती है। फिर से भेजने के लिए पुनः प्रयास करें।'
          : 'A slow network connection may have delayed the response. Tap Try again to retry.',
    };
  }

  // Case 4: Generic Network connection / fetch error
  const isNetworkFailure =
    code === 'NETWORK_ERROR' ||
    lowerRaw.includes('failed to fetch') ||
    lowerRaw.includes('network') ||
    lowerRaw.includes('connect') ||
    lowerRaw.includes('offline') ||
    lowerRaw.includes('econnrefused') ||
    lowerRaw.includes('net::err') ||
    (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && !window.navigator.onLine);

  if (isNetworkFailure) {
    return {
      title: language === 'hi' ? 'इंटरनेट कनेक्शन समस्या' : 'Connection problem',
      message:
        language === 'hi'
          ? 'साथी सहायक से संपर्क नहीं हो पाया। कृपया अपना इंटरनेट जांचें।'
          : 'Unable to connect to Sathi assistant. Please check your internet connection.',
      isAiBusy: false,
      retryAfterSeconds: 0,
      errorCategory: 'network_error',
      categoryLabel: language === 'hi' ? 'इंटरनेट कनेक्शन समस्या' : 'Network Connection Problem',
      suggestion:
        language === 'hi'
          ? 'कृपया जांचें कि आपके फोन में वाई-फ़ाई या मोबाइल डेटा चालू है। इंटरनेट वापस आने पर आप तुरंत पुनः प्रयास कर सकते हैं।'
          : 'Please check if Wi-Fi or mobile data is turned on. You can try again whenever your connection is restored.',
    };
  }

  // Case 5: Translated Hindi error message available and valid
  if (language === 'hi' && errorHi && !isRawJson) {
    return {
      title: 'समस्या आई',
      message: errorHi,
      isAiBusy: false,
      retryAfterSeconds: 0,
      errorCategory: 'generic',
      categoryLabel: 'तकनीकी समस्या',
      suggestion: 'कृपया कुछ क्षणों बाद पुनः प्रयास करें।',
    };
  }

  // Case 6: Clean English error message available
  if (language === 'en' && rawMsg && !isRawJson && !lowerRaw.includes('unknown')) {
    return {
      title: 'Unable to complete request',
      message: rawMsg,
      isAiBusy: false,
      retryAfterSeconds: 0,
      errorCategory: 'generic',
      categoryLabel: 'Technical Issue',
      suggestion: 'Please tap Try again in a moment.',
    };
  }

  // Fallback: Safe generic translated text without exposing technical internals
  return {
    title: language === 'hi' ? 'अनुरोध पूरा नहीं हो सका' : 'Unable to complete request',
    message:
      language === 'hi'
        ? 'इस समय अनुरोध पूरा करने में असमर्थ। कृपया कुछ क्षणों में पुनः प्रयास करें।'
        : 'Unable to complete request at this time. Please try again in a moment.',
    isAiBusy: false,
    retryAfterSeconds: 0,
    errorCategory: 'generic',
    categoryLabel: language === 'hi' ? 'तकनीकी समस्या' : 'Technical Issue',
    suggestion: language === 'hi' ? 'कृपया कुछ क्षणों बाद पुनः प्रयास करें।' : 'Please tap Try again in a moment.',
  };
}

