import { z } from 'zod';

// Base request schema
export const GenerateRequestSchema = z.object({
  feature: z.enum(['briefing', 'ask', 'simplify', 'scam_shield', 'checkin']),
  language: z.enum(['en', 'hi']),
  payload: z.record(z.string(), z.unknown()),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// Feature 1: Briefing
export const BriefingPayloadSchema = z.object({
  profile: z.object({
    name: z.string().max(100).optional().default(''),
    city: z.string().max(100).optional().default(''),
    medicines: z.union([z.string(), z.array(z.string())]).transform((val) => Array.isArray(val) ? val.join(', ') : (val || '')).optional().default(''),
    healthNotes: z.string().max(500).optional().default(''),
  }).optional().default({ name: '', city: '', medicines: '', healthNotes: '' }),
  mood: z.union([z.enum(['good', 'okay', 'not_well']), z.string()]).transform((val) => {
    if (val === 'good' || val === 'okay' || val === 'not_well') return val;
    return undefined;
  }).optional(),
  symptoms: z.array(z.string().max(100)).max(10).optional().default([]),
  reminders: z.array(z.object({
    title: z.string().max(200),
    time: z.string().max(50),
    category: z.string().max(50),
  })).max(20).optional().default([]),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).default('morning'),
});

export const BriefingResponseSchema = z.object({
  greeting: z.string().min(1),
  priorities: z.array(z.string()).min(1).max(3),
  wellbeingNudge: z.string().min(1),
  safetyTip: z.string().min(1),
  learnTip: z.string().min(1),
});

export type BriefingResponse = z.infer<typeof BriefingResponseSchema>;

// Feature 2: Ask
export const AskPayloadSchema = z.object({
  query: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().max(2000),
  })).max(10).optional().default([]),
  profile: z.object({
    name: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
  }).optional(),
  mood: z.enum(['good', 'okay', 'not_well']).optional(),
  simplifyFurther: z.boolean().optional().default(false),
});

export const AskResponseSchema = z.object({
  answer: z.string().min(1),
  stepByStep: z.array(z.string()).default([]),
  simplifiedSummary: z.string().min(1),
  suggestedFollowUps: z.array(z.string()).max(4).default([]),
  canSaveAsReminder: z.boolean().default(false),
  reminderSuggestion: z.object({
    title: z.string(),
    suggestedTime: z.string().optional(),
    category: z.enum(['medicine', 'appointment', 'bill', 'other']).default('other'),
  }).optional(),
});

export type AskResponse = z.infer<typeof AskResponseSchema>;

// Feature 3: Simplify
export const SimplifyPayloadSchema = z.object({
  text: z.string().max(15000).optional().default(''),
  imageBase64: z.string().max(10 * 1024 * 1024).optional(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).optional().default('image/jpeg'),
  image: z.object({
    base64: z.string().max(10 * 1024 * 1024),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).default('image/jpeg'),
  }).optional(),
  documentTypeHint: z.string().max(100).optional(),
}).transform(data => {
  const base64 = data.imageBase64 || data.image?.base64;
  const mime = data.mimeType || data.image?.mimeType || 'image/jpeg';
  return {
    text: data.text || '',
    imageBase64: base64,
    mimeType: mime,
    documentTypeHint: data.documentTypeHint,
  };
}).refine(data => !!data.text || !!data.imageBase64, {
  message: 'Either text or imageBase64 must be provided',
});

export const SimplifyResponseSchema = z.object({
  whatIsThis: z.string().min(1),
  actionSteps: z.array(z.string()).min(1),
  keyDatesAndAmounts: z.array(z.object({
    label: z.string(),
    isoDate: z.string().optional().default(''),
    amount: z.string().optional().default(''),
    note: z.string().optional().default(''),
    category: z.enum(['bill', 'appointment', 'medicine', 'other']).default('other'),
  })).default([]),
  beCarefulAbout: z.array(z.string()).default([]),
  contactOrHelpline: z.string().optional().default(''),
});

export type SimplifyResponse = z.infer<typeof SimplifyResponseSchema>;

// Feature 4: Scam Shield
export const ScamShieldPayloadSchema = z.object({
  text: z.string().max(10000).optional().default(''),
  messageText: z.string().max(10000).optional(),
  imageBase64: z.string().max(10 * 1024 * 1024).optional(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional().default('image/jpeg'),
  image: z.object({
    base64: z.string().max(10 * 1024 * 1024),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  }).optional(),
  channel: z.enum(['sms', 'whatsapp', 'call', 'email', 'link', 'other']).default('other'),
}).transform(data => {
  const txt = data.text || data.messageText || '';
  const base64 = data.imageBase64 || data.image?.base64;
  const mime = data.mimeType || data.image?.mimeType || 'image/jpeg';
  return {
    text: txt,
    imageBase64: base64,
    mimeType: mime,
    channel: data.channel,
  };
}).refine(data => !!data.text || !!data.imageBase64, {
  message: 'Either text or imageBase64 must be provided',
});

export const ScamShieldResponseSchema = z.object({
  verdict: z.enum(['SAFE', 'SUSPICIOUS', 'LIKELY_SCAM']),
  confidenceScore: z.number().min(0).max(100).default(90),
  summary: z.string().min(1),
  plainReasons: z.array(z.string()).min(1),
  whatToDoNow: z.array(z.string()).min(1),
  neverDoThis: z.array(z.string()).default([]),
  helpline: z.string().default('1930'),
  helplineWebsite: z.string().default('cybercrime.gov.in'),
});

export type ScamShieldResponse = z.infer<typeof ScamShieldResponseSchema>;

// Feature 5: Check-in
export const CheckinPayloadSchema = z.object({
  mood: z.enum(['good', 'okay', 'not_well']),
  symptoms: z.array(z.string().max(100)).max(10).default([]),
  notes: z.string().max(1000).optional().default(''),
  profile: z.object({
    name: z.string().max(100).optional(),
    medicines: z.string().max(500).optional(),
  }).optional(),
});

export const CheckinResponseSchema = z.object({
  kindGuidance: z.string().min(1),
  recommendedActions: z.array(z.string()).min(1),
  shouldSeekHelp: z.boolean().default(false),
  gentleAffirmation: z.string().min(1),
});

export type CheckinResponse = z.infer<typeof CheckinResponseSchema>;
