import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { rateLimiter } from './rateLimiter.js';
import {
  GenerateRequestSchema,
  BriefingPayloadSchema,
  AskPayloadSchema,
  SimplifyPayloadSchema,
  ScamShieldPayloadSchema,
  CheckinPayloadSchema,
} from './schemas.js';
import { executeGeminiCall, isQuotaOrRateLimitError, extractRetryDelay } from './gemini.js';

/**
 * Creates and configures the Express application with security headers,
 * CORS, body parsing limits, rate limiting, health check, and /api/generate route.
 *
 * @returns Configured Express Application
 */
export function createExpressApp(): express.Application {
  const app = express();

  // Enable trust proxy so per-IP limits accurately use the real client IP behind Cloud Run/reverse proxy
  app.set('trust proxy', 1);

  // Security headers middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Content Security Policy permitting fonts from Google and images data/blob
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; media-src 'self' blob:;"
    );
    next();
  });

  // CORS middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Request body size limit: 8MB for image payloads
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true, limit: '8mb' }));

  // Rate Limiter
  app.use(rateLimiter);

  // Request timeout helper (30s)
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(30000, () => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'The request took too long. Please check your internet connection and try again.',
          errorHi: 'अनुरोध में बहुत अधिक समय लगा। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।',
        });
      }
    });
    next();
  });

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'sathi-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Main generation endpoint
  app.post('/api/generate', async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate outer request structure
      const parsedRequest = GenerateRequestSchema.safeParse(req.body);
      if (!parsedRequest.success) {
        res.status(400).json({
          error: 'Invalid request structure',
          details: parsedRequest.error.flatten(),
        });
        return;
      }

      const { feature, language, payload } = parsedRequest.data;

      // Validate feature-specific payload
      let validatedPayload: Record<string, unknown>;
      switch (feature) {
        case 'briefing': {
          const result = BriefingPayloadSchema.safeParse(payload);
          if (!result.success) {
            res.status(400).json({ error: 'Invalid briefing payload', details: result.error.flatten() });
            return;
          }
          validatedPayload = result.data;
          break;
        }
        case 'ask': {
          const result = AskPayloadSchema.safeParse(payload);
          if (!result.success) {
            res.status(400).json({ error: 'Invalid ask payload', details: result.error.flatten() });
            return;
          }
          validatedPayload = result.data;
          break;
        }
        case 'simplify': {
          const result = SimplifyPayloadSchema.safeParse(payload);
          if (!result.success) {
            res.status(400).json({ error: 'Invalid simplify payload', details: result.error.flatten() });
            return;
          }
          validatedPayload = result.data;
          break;
        }
        case 'scam_shield': {
          const result = ScamShieldPayloadSchema.safeParse(payload);
          if (!result.success) {
            res.status(400).json({ error: 'Invalid scam_shield payload', details: result.error.flatten() });
            return;
          }
          validatedPayload = result.data;
          break;
        }
        case 'checkin': {
          const result = CheckinPayloadSchema.safeParse(payload);
          if (!result.success) {
            res.status(400).json({ error: 'Invalid checkin payload', details: result.error.flatten() });
            return;
          }
          validatedPayload = result.data;
          break;
        }
      }

      // Execute live call
      const data = await executeGeminiCall(feature, language, validatedPayload);
      res.json({
        success: true,
        feature,
        language,
        data,
      });
    } catch (err: unknown) {
      console.error('[API Error in /api/generate]:', err);

      // Distinguish upstream Gemini 429 / 503 / RESOURCE_EXHAUSTED / AI_BUSY errors
      if (isQuotaOrRateLimitError(err) || (Boolean(err) && Boolean((err as Record<string, unknown>).isAiBusy))) {
        const retryAfterSeconds =
          Number((err as Record<string, unknown>)?.retryAfterSeconds) ||
          extractRetryDelay(err) ||
          15;

        res.setHeader('Retry-After', String(retryAfterSeconds));
        res.status(429).json({
          code: 'AI_BUSY',
          error: 'Sathi assistant is busy right now. Please wait a moment and try again.',
          errorHi: 'साथी सहायक इस समय व्यस्त है। कृपया कुछ क्षण प्रतीक्षा करें और पुनः प्रयास करें।',
          retryAfterSeconds,
        });
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
      res.status(500).json({
        error: 'Unable to complete request at this time. Please try again in a moment.',
        errorHi: 'इस समय अनुरोध पूरा करने में असमर्थ। कृपया कुछ क्षणों में पुनः प्रयास करें।',
        technicalMessage: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  });

  return app;
}
