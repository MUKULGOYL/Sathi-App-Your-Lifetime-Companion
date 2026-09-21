import type { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute per IP for /api/generate

const ipStore = new Map<string, RateLimitRecord>();

// Periodically clean up expired entries to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipStore.entries()) {
    if (now > record.resetTime) {
      ipStore.delete(ip);
    }
  }
}, 30 * 1000);

/**
 * In-memory sliding-window IP rate limiter middleware for Sathi API endpoints.
 * Protects server-side Gemini endpoints from excessive or abusive requests.
 * Exempts health checks (/api/health) and applies 60 requests/minute per real IP.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  // Allow health checks without rate limiting
  if (req.path === '/api/health' || req.originalUrl?.startsWith('/api/health')) {
    next();
    return;
  }

  // Real client IP resolution (respects app.set('trust proxy', 1))
  const clientIp =
    req.ip ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown-ip';

  const now = Date.now();
  const existing = ipStore.get(clientIp);

  if (!existing || now > existing.resetTime) {
    ipStore.set(clientIp, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
    res.setHeader('X-RateLimit-Remaining', String(MAX_REQUESTS_PER_WINDOW - 1));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + WINDOW_MS) / 1000)));
    next();
    return;
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(existing.resetTime / 1000)));
    res.status(429).json({
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Too many requests. Please pause for a moment and try again.',
      errorHi: 'बहुत सारे अनुरोध। कृपया थोड़ी देर प्रतीक्षा करें और पुनः प्रयास करें।',
      retryAfterSeconds,
    });
    return;
  }

  existing.count += 1;
  res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
  res.setHeader('X-RateLimit-Remaining', String(MAX_REQUESTS_PER_WINDOW - existing.count));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(existing.resetTime / 1000)));
  next();
}
