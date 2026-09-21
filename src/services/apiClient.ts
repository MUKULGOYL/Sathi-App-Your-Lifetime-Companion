import type { SupportedLanguage } from '../types';
import { APP_LIMITS } from '../constants';

export interface ApiClientOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Custom error class for Sathi API communication failures,
 * carrying both English and Hindi user-friendly error messages,
 * error code (e.g. 'AI_BUSY', 'RATE_LIMIT_EXCEEDED'), and retry-after guidance.
 */
export class ApiError extends Error {
  public status?: number;
  public errorHi?: string;
  public code?: string;
  public retryAfterSeconds?: number;

  constructor(
    message: string,
    status?: number,
    errorHi?: string,
    code?: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorHi = errorHi;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Concurrency queue that limits concurrent AI requests to a maximum count.
 */
export class RequestQueue {
  private maxConcurrent: number;
  private currentRunning = 0;
  private queue: Array<() => void> = [];

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.currentRunning >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }
    this.currentRunning++;
    try {
      return await task();
    } finally {
      this.currentRunning--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.();
      }
    }
  }

  get activeCount(): number {
    return this.currentRunning;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.currentRunning = 0;
  }
}

export const aiRequestQueue = new RequestQueue(2);

/**
 * Deterministic stringify for request de-duplication hashing
 */
export function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${stableStringify((obj as Record<string, unknown>)[k])}`);
  return `{${pairs.join(',')}}`;
}

export function computeRequestKey(
  feature: string,
  language: string,
  payload: Record<string, unknown>
): string {
  return `${feature}|${language}|${stableStringify(payload)}`;
}

// In-flight identical request deduplication map
export const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Executes a single fetch call with timeout and retries only for 5xx/network errors.
 * Never retries on 429 or any 4xx error. Respects Retry-After header.
 */
async function executeFetchWithRetry<T>(
  feature: 'briefing' | 'ask' | 'simplify' | 'scam_shield' | 'checkin',
  language: SupportedLanguage,
  payload: Record<string, unknown>,
  options: ApiClientOptions = {}
): Promise<T> {
  const { signal, timeoutMs = APP_LIMITS.API_TIMEOUT_MS } = options;

  let attempts = 0;
  const maxAttempts = 2; // Initial attempt + at most 1 retry for 5xx/network

  while (attempts < maxAttempts) {
    attempts++;

    // Create timeout controller linked with optional caller signal
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    const abortHandler = () => timeoutController.abort();
    if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
      if (signal.aborted) {
        clearTimeout(timeoutId);
        throw new ApiError('Request cancelled', 499, 'अनुरोध रद्द कर दिया गया');
      }
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature,
          language,
          payload,
        }),
        signal: timeoutController.signal,
      });

      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }

      if (!response.ok) {
        let errorData: { error?: string; errorHi?: string; code?: string; retryAfterSeconds?: number } = {};
        try {
          errorData = await response.json();
        } catch {
          // Response was not JSON
        }

        const retryAfterHeader = response.headers?.get ? response.headers.get('Retry-After') : null;
        const parsedHeaderSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        const retryAfterSeconds =
          typeof errorData.retryAfterSeconds === 'number' && !isNaN(errorData.retryAfterSeconds)
            ? errorData.retryAfterSeconds
            : parsedHeaderSec && !isNaN(parsedHeaderSec)
            ? parsedHeaderSec
            : response.status === 429
            ? 15
            : undefined;

        const code = errorData.code || (response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : undefined);
        const msgEn =
          errorData.error ||
          (response.status === 429
            ? 'Too many requests. Please pause for a moment and try again.'
            : `Server responded with status ${response.status}`);
        const msgHi =
          errorData.errorHi ||
          (response.status === 429
            ? 'बहुत सारे अनुरोध। कृपया थोड़ी देर प्रतीक्षा करें और पुनः प्रयास करें।'
            : 'सर्वर से संपर्क करने में समस्या हुई। कृपया पुनः प्रयास करें।');

        // Rule 1: NEVER retry on 429 or 4xx
        if (response.status >= 400 && response.status < 500) {
          throw new ApiError(msgEn, response.status, msgHi, code, retryAfterSeconds);
        }

        // Rule 2: 5xx error will retry at most once
        if (attempts >= maxAttempts) {
          throw new ApiError(msgEn, response.status, msgHi, code, retryAfterSeconds);
        }
      } else {
        const json = await response.json();
        if (!json.success || !json.data) {
          throw new ApiError('Unexpected response format from server', 500, 'सर्वर से अप्रत्याशित उत्तर मिला।');
        }
        return json.data as T;
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }

      // If already an ApiError with 4xx, rethrow immediately without retrying
      if (err instanceof ApiError && err.status && err.status >= 400 && err.status < 500) {
        throw err;
      }

      if (signal?.aborted) {
        throw new ApiError('Request cancelled', 499, 'अनुरोध रद्द कर दिया गया');
      }

      const isTimeout = timeoutController.signal.aborted;
      if (isTimeout) {
        if (attempts >= maxAttempts) {
          throw new ApiError(
            'The request took longer than expected. Please check your internet connection and try again.',
            504,
            'अनुरोध में अधिक समय लगा। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
          );
        }
      }

      if (attempts >= maxAttempts) {
        const errorMsg = err instanceof Error ? err.message : 'Network error';
        throw new ApiError(
          errorMsg || 'Unable to connect to Sathi assistant. Please check your internet.',
          500,
          'साथी सहायक से संपर्क नहीं हो पाया। कृपया अपना इंटरनेट जांचें।',
          'NETWORK_ERROR'
        );
      }

      // Exponential backoff with jitter before retry: base 500ms * 2^(attempts-1) + jitter
      const baseDelay = APP_LIMITS.API_RETRY_BACKOFF_MS * Math.pow(2, attempts - 1);
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }

  throw new ApiError('Failed after retry', 500, 'पुनः प्रयास के बाद भी विफल रहा');
}

/**
 * Sends a request to the backend `/api/generate` endpoint with:
 * - Request queue limiting concurrent calls to at most 2
 * - In-flight deduplication of identical requests (same feature + payload hash)
 * - Never retries on 429 or 4xx
 * - Retries at most once for 5xx or network errors with exponential backoff & jitter
 * - Respects Retry-After header and returns rich ApiError
 *
 * @param feature - The backend feature route ('briefing' | 'ask' | 'simplify' | 'scam_shield' | 'checkin')
 * @param language - The target language for the output ('en' | 'hi')
 * @param payload - Structured parameters for the AI prompt
 * @param options - Optional timeout and AbortSignal configuration
 * @returns The parsed and typed data response from the server
 * @throws {ApiError} On client timeout, HTTP error status, or network failure
 */
export async function callGenerateApi<T>(
  feature: 'briefing' | 'ask' | 'simplify' | 'scam_shield' | 'checkin',
  language: SupportedLanguage,
  payload: Record<string, unknown>,
  options: ApiClientOptions = {}
): Promise<T> {
  const requestKey = computeRequestKey(feature, language, payload);

  // Check if identical request is already in flight
  const existing = inFlightRequests.get(requestKey);
  if (existing) {
    return existing as Promise<T>;
  }

  // Queue with max 2 concurrent AI calls and de-duplicate in-flight
  const taskPromise = aiRequestQueue
    .run(() => executeFetchWithRetry<T>(feature, language, payload, options))
    .finally(() => {
      inFlightRequests.delete(requestKey);
    });

  inFlightRequests.set(requestKey, taskPromise);
  return taskPromise as Promise<T>;
}
