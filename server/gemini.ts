import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  SHARED_SYSTEM_PROMPT,
  buildBriefingPrompt,
  buildAskPrompt,
  buildSimplifyPrompt,
  buildScamShieldPrompt,
  buildCheckinPrompt,
} from './prompts.js';
import {
  BriefingResponseSchema,
  AskResponseSchema,
  SimplifyResponseSchema,
  ScamShieldResponseSchema,
  CheckinResponseSchema,
} from './schemas.js';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

/**
 * Prioritized list of candidate models for robust execution.
 * When a specific model is experiencing high demand (503), per-model quota limits (429),
 * or temporary disruption, the client seamlessly cascades to the next candidate model.
 */
export function getCandidateModels(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const isEnvDeprecated =
    !envModel ||
    envModel.includes('gemini-2.5') ||
    envModel.includes('gemini-1.5') ||
    envModel.includes('gemini-2.0');

  // gemini-3.5-flash and gemini-flash-lite-latest provide immediate resilience
  // against temporary 503 high-demand spikes on gemini-3.8-flash and 429 quota limits on gemini-3.6-flash
  const defaultCascade = [
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
  ];

  if (envModel && !isEnvDeprecated) {
    return Array.from(new Set([envModel, ...defaultCascade]));
  }

  return defaultCascade;
}

/**
 * Checks if an upstream AI error is due to rate limits, quota exhaustion, or service unavailability (503).
 */
export function isQuotaOrRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as Record<string, unknown>;
  if (anyErr.status === 429 || anyErr.statusCode === 429 || anyErr.code === 429) return true;
  if (anyErr.status === 503 || anyErr.statusCode === 503 || anyErr.code === 503) return true;
  if (typeof anyErr.status === 'string' && (anyErr.status.toUpperCase().includes('RESOURCE_EXHAUSTED') || anyErr.status.toUpperCase().includes('UNAVAILABLE'))) return true;
  if (typeof anyErr.code === 'string' && (anyErr.code.toUpperCase().includes('RESOURCE_EXHAUSTED') || anyErr.code.toUpperCase().includes('UNAVAILABLE'))) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toUpperCase();
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('HIGH DEMAND') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('QUOTA EXCEEDED') ||
    msg.includes('TOO MANY REQUESTS') ||
    msg.includes('RATE LIMIT')
  );
}

/**
 * Extracts retry delay in seconds from error details or error message if provided by Google API.
 */
export function extractRetryDelay(err: unknown): number {
  if (!err) return 15;
  try {
    const anyErr = err as Record<string, unknown>;
    // Check details array for google.rpc.RetryInfo
    if (Array.isArray(anyErr.details)) {
      for (const item of anyErr.details) {
        if (item && typeof item === 'object' && 'retryDelay' in item) {
          const delayStr = String((item as { retryDelay: unknown }).retryDelay);
          const match = delayStr.match(/(\d+(?:\.\d+)?)/);
          if (match) {
            const sec = Math.ceil(parseFloat(match[1]));
            if (sec > 0 && sec <= 300) return sec;
          }
        }
      }
    }
    // Check message string for "Please retry in X.XXs"
    const msg = err instanceof Error ? err.message : String(err);
    const retryMatch = msg.match(/retry\s+in\s+([0-9]+(?:\.[0-9]+)?)\s*s/i);
    if (retryMatch) {
      const sec = Math.ceil(parseFloat(retryMatch[1]));
      if (sec > 0 && sec <= 300) return sec;
    }
  } catch {
    // Fall back to default
  }
  return 15;
}

// Gemini schemas
const briefingGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    greeting: { type: Type.STRING },
    priorities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '1 to 3 top priority items for today',
    },
    wellbeingNudge: { type: Type.STRING },
    safetyTip: { type: Type.STRING },
    learnTip: { type: Type.STRING },
  },
  required: ['greeting', 'priorities', 'wellbeingNudge', 'safetyTip', 'learnTip'],
};

const askGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    stepByStep: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Numbered steps if how-to question, else empty',
    },
    simplifiedSummary: { type: Type.STRING },
    suggestedFollowUps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    canSaveAsReminder: { type: Type.BOOLEAN },
    reminderSuggestion: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        suggestedTime: { type: Type.STRING },
        category: { type: Type.STRING, enum: ['medicine', 'appointment', 'bill', 'other'] },
      },
      required: ['title', 'category'],
    },
  },
  required: ['answer', 'stepByStep', 'simplifiedSummary', 'suggestedFollowUps', 'canSaveAsReminder'],
};

const simplifyGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    whatIsThis: { type: Type.STRING },
    actionSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    keyDatesAndAmounts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          isoDate: { type: Type.STRING },
          amount: { type: Type.STRING },
          note: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['bill', 'appointment', 'medicine', 'other'] },
        },
        required: ['label', 'isoDate', 'amount', 'note', 'category'],
      },
    },
    beCarefulAbout: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    contactOrHelpline: { type: Type.STRING },
  },
  required: ['whatIsThis', 'actionSteps', 'keyDatesAndAmounts', 'beCarefulAbout'],
};

const scamShieldGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verdict: {
      type: Type.STRING,
      enum: ['SAFE', 'SUSPICIOUS', 'LIKELY_SCAM'],
    },
    confidenceScore: { type: Type.INTEGER },
    summary: { type: Type.STRING },
    plainReasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    whatToDoNow: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    neverDoThis: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    helpline: { type: Type.STRING },
    helplineWebsite: { type: Type.STRING },
  },
  required: ['verdict', 'confidenceScore', 'summary', 'plainReasons', 'whatToDoNow', 'neverDoThis', 'helpline', 'helplineWebsite'],
};

const checkinGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    kindGuidance: { type: Type.STRING },
    recommendedActions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    shouldSeekHelp: { type: Type.BOOLEAN },
    gentleAffirmation: { type: Type.STRING },
  },
  required: ['kindGuidance', 'recommendedActions', 'shouldSeekHelp', 'gentleAffirmation'],
};

/**
 * Executes a structured Gemini call using Google GenAI SDK.
 * Configures system instructions, response MIME type, structured JSON schema,
 * and validates the resulting payload with Zod schemas.
 * Includes automatic retry on parse or validation failure.
 *
 * @param feature - The target functional feature to execute
 * @param language - Target locale language ('en' | 'hi')
 * @param payload - Request data containing prompts, context, or base64 images
 * @returns Strongly typed and validated response object
 */
export async function executeGeminiCall(
  feature: 'briefing' | 'ask' | 'simplify' | 'scam_shield' | 'checkin',
  language: 'en' | 'hi',
  payload: Record<string, unknown>
): Promise<unknown> {
  const ai = getAiClient();

  let promptText = '';
  let responseSchema: Schema;
  let zodValidator: { parse: (val: unknown) => unknown };
  let inlineImage: { data: string; mimeType: string } | null = null;

  switch (feature) {
    case 'briefing': {
      promptText = buildBriefingPrompt(payload as never, language);
      responseSchema = briefingGeminiSchema;
      zodValidator = BriefingResponseSchema;
      break;
    }
    case 'ask': {
      promptText = buildAskPrompt(payload as never, language);
      responseSchema = askGeminiSchema;
      zodValidator = AskResponseSchema;
      break;
    }
    case 'simplify': {
      const p = payload as { text?: string; imageBase64?: string; mimeType?: string; documentTypeHint?: string };
      if (p.imageBase64) {
        // Strip data:image/...;base64, prefix if present
        const cleanBase64 = p.imageBase64.replace(/^data:[^;]+;base64,/, '');
        inlineImage = {
          data: cleanBase64,
          mimeType: p.mimeType || 'image/jpeg',
        };
      }
      promptText = buildSimplifyPrompt({ text: p.text, hasImage: !!inlineImage, documentTypeHint: p.documentTypeHint }, language);
      responseSchema = simplifyGeminiSchema;
      zodValidator = SimplifyResponseSchema;
      break;
    }
    case 'scam_shield': {
      const p = payload as { text?: string; imageBase64?: string; mimeType?: string; channel: string };
      if (p.imageBase64) {
        const cleanBase64 = p.imageBase64.replace(/^data:[^;]+;base64,/, '');
        inlineImage = {
          data: cleanBase64,
          mimeType: p.mimeType || 'image/jpeg',
        };
      }
      promptText = buildScamShieldPrompt({ text: p.text, hasImage: !!inlineImage, channel: p.channel || 'other' }, language);
      responseSchema = scamShieldGeminiSchema;
      zodValidator = ScamShieldResponseSchema;
      break;
    }
    case 'checkin': {
      promptText = buildCheckinPrompt(payload as never, language);
      responseSchema = checkinGeminiSchema;
      zodValidator = CheckinResponseSchema;
      break;
    }
  }

  const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
  if (inlineImage) {
    parts.push({
      inlineData: {
        data: inlineImage.data,
        mimeType: inlineImage.mimeType,
      },
    });
  }
  parts.push({ text: promptText });

  // Function to call model and validate
  async function callAndValidate(modelName: string): Promise<unknown> {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: parts as never }],
      config: {
        systemInstruction: SHARED_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from AI model');
    }

    const parsedJson = JSON.parse(text);
    return zodValidator.parse(parsedJson);
  }

  // Attempt candidate models in cascade order
  const candidateModels = getCandidateModels();
  let lastError: unknown = null;
  let encounteredAiBusy = false;
  let maxRetryDelay = 15;

  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    try {
      return await callAndValidate(modelName);
    } catch (err: unknown) {
      lastError = err;
      const isBusy = isQuotaOrRateLimitError(err);
      if (isBusy) {
        encounteredAiBusy = true;
        const delay = extractRetryDelay(err);
        if (delay > maxRetryDelay) {
          maxRetryDelay = delay;
        }
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Gemini] Candidate model "${modelName}" (${i + 1}/${candidateModels.length}) failed for feature "${feature}": ${errMsg.slice(0, 160)}`
      );

      // If this was a 503 high demand spike and more models exist, pause briefly before next candidate
      if (i < candidateModels.length - 1 && (errMsg.includes('503') || errMsg.includes('high demand'))) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  // If all candidate models in cascade failed, provide a warm, resilient fallback for briefing and checkin
  if (feature === 'briefing') {
    console.warn('[Gemini] All candidate models failed or busy. Serving personalized fallback daily briefing.');
    return generateFallbackBriefing(language, payload);
  }

  if (feature === 'checkin') {
    console.warn('[Gemini] All candidate models failed or busy. Serving personalized fallback wellbeing check-in.');
    return generateFallbackCheckin(language, payload);
  }

  // If all candidate models in cascade failed for other features, attach busy metadata if any model was busy/rate-limited
  if (lastError && encounteredAiBusy) {
    try {
      (lastError as Record<string, unknown>).isAiBusy = true;
      (lastError as Record<string, unknown>).retryAfterSeconds = maxRetryDelay;
    } catch {
      // Ignore if error object is sealed
    }
  }
  throw lastError || new Error('All candidate AI models failed to respond.');
}

/**
 * Generates a compassionate, highly personalized fallback briefing when AI models are unavailable.
 */
function generateFallbackBriefing(
  language: 'en' | 'hi',
  payload: Record<string, unknown>
): Record<string, unknown> {
  const profile = (payload.profile || {}) as Record<string, unknown>;
  const name =
    typeof profile.name === 'string' && profile.name.trim()
      ? profile.name.trim()
      : language === 'hi'
      ? 'साथी'
      : 'Friend';
  const city = typeof profile.city === 'string' && profile.city.trim() ? profile.city.trim() : '';
  const medicines = typeof profile.medicines === 'string' && profile.medicines.trim() ? profile.medicines.trim() : '';
  const timeOfDay = typeof payload.timeOfDay === 'string' ? payload.timeOfDay : 'morning';
  const reminders = Array.isArray(payload.reminders) ? payload.reminders : [];

  if (language === 'hi') {
    const timeGreeting =
      timeOfDay === 'morning'
        ? 'शुभ प्रभात'
        : timeOfDay === 'afternoon'
        ? 'शुभ दोपहर'
        : timeOfDay === 'evening'
        ? 'शुभ संध्या'
        : 'शुभ रात्रि';

    const priorities: string[] = [];
    if (reminders.length > 0) {
      const firstRem = reminders[0] as { title?: string; time?: string };
      priorities.push(`आज का प्रमुख कार्य: ${firstRem.title || 'दवा/कार्य'} (${firstRem.time || 'समय पर'})।`);
    } else if (medicines) {
      priorities.push(`अपनी नियमित दवाएं (${medicines}) समय पर लेना याद रखें।`);
    } else {
      priorities.push('आज समय पर पौष्टिक भोजन करें और पर्याप्त पानी पीकर तरोताजा रहें।');
    }

    if (city) {
      priorities.push(`${city} में आज का दिन शांति और प्रसन्नता के साथ बिताएं।`);
    } else {
      priorities.push('दिन में थोड़ा समय खुली हवा या हल्की धूप में बिताएं।');
    }

    return {
      greeting: `प्रणाम ${name} जी, ${timeGreeting}! आशा है आपका दिन शांति और अच्छी सेहत से भरपूर हो।`,
      priorities: priorities.slice(0, 3),
      wellbeingNudge: 'हर 2 घंटे में एक गिलास पानी पिएं और थोड़ी देर हल्की स्ट्रेचिंग करें।',
      safetyTip: 'सुरक्षा नियम: बैंक, बिजली या पेंशन के नाम पर आने वाले फोन पर कभी अपना ओटीपी (OTP) या पिन किसी को न दें।',
      learnTip: 'स्मार्टफोन टिप: अक्षरों को बड़ा करने के लिए फोन की सेटिंग में जाकर डिस्प्ले और फॉन्ट साइज बढ़ा सकते हैं।',
    };
  }

  const timeGreeting =
    timeOfDay === 'morning'
      ? 'Good morning'
      : timeOfDay === 'afternoon'
      ? 'Good afternoon'
      : timeOfDay === 'evening'
      ? 'Good evening'
      : 'Good night';

  const priorities: string[] = [];
  if (reminders.length > 0) {
    const firstRem = reminders[0] as { title?: string; time?: string };
    priorities.push(`Priority for today: ${firstRem.title || 'Reminder'} at ${firstRem.time || 'scheduled time'}.`);
  } else if (medicines) {
    priorities.push(`Remember to take your scheduled medicines (${medicines}) on time.`);
  } else {
    priorities.push('Stay hydrated throughout the day and have wholesome meals on time.');
  }

  if (city) {
    priorities.push(`Wishing you a peaceful and pleasant day in ${city}.`);
  } else {
    priorities.push('Spend a few quiet moments outdoors or near natural morning sunlight.');
  }

  return {
    greeting: `Hello ${name}, ${timeGreeting}! Wishing you a serene and healthy day.`,
    priorities: priorities.slice(0, 3),
    wellbeingNudge: 'Remember to take slow deep breaths and keep a glass of fresh water nearby.',
    safetyTip: 'Safety tip: Never share bank OTP, PIN, or passwords with anyone over a phone call or SMS.',
    learnTip: 'Phone tip: You can make phone text larger and easier to read in Settings > Display > Font Size.',
  };
}

/**
 * Generates a compassionate fallback response for wellbeing check-in when AI models are unavailable.
 */
function generateFallbackCheckin(
  language: 'en' | 'hi',
  payload: Record<string, unknown>
): Record<string, unknown> {
  const mood = typeof payload.mood === 'string' ? payload.mood : 'okay';
  const symptoms = Array.isArray(payload.symptoms) ? (payload.symptoms as string[]) : [];

  if (language === 'hi') {
    const isNotWell = mood === 'not_well' || symptoms.length > 0;
    return {
      kindGuidance: isNotWell
        ? 'प्रणाम जी। हम समझते हैं कि आज आपकी तबीयत थोड़ी असहज लग रही है। कृपया ज्यादा भागदौड़ न करें, आराम करें और गुनगुना पानी पिएं। यदि तकलीफ अधिक हो तो परिवार के सदस्य या डॉक्टर से तुरंत संपर्क करें।'
        : 'प्रणाम जी! यह जानकर बहुत खुशी हुई कि आज आपका दिन अच्छा बीत रहा है। अपनी दिनचर्या इसी प्रकार सुखद रखें और समय पर भोजन करें।',
      recommendedActions: isNotWell
        ? ['थोड़ी देर शांत कमरे में विश्राम करें', 'पर्याप्त पानी या सूप पिएं', 'यदि आवश्यक हो तो अपने डॉक्टर से सलाह लें']
        : ['दिन में थोड़ा समय धूप में टहलें', 'समय पर अपनी दवाएं लें', 'अपनों से थोड़ी बातचीत करें'],
      shouldSeekHelp: isNotWell,
      gentleAffirmation: 'आपकी सेहत और मुस्कान सबसे अनमोल है। अपना पूरा ख्याल रखें।',
    };
  }

  const isNotWell = mood === 'not_well' || symptoms.length > 0;
  return {
    kindGuidance: isNotWell
      ? 'We hear that you are not feeling your best today. Please take restful breaks, drink warm water, and avoid exertion. If you feel unwell, do not hesitate to contact your doctor or family member.'
      : 'It is wonderful to hear that you are feeling well today! Keep your spirits high, stay hydrated, and enjoy your daily routine.',
    recommendedActions: isNotWell
      ? ['Rest comfortably in a calm room', 'Drink adequate water or warm tea', 'Notify a family member or doctor if needed']
      : ['Take a gentle stroll in fresh air', 'Take medications on time', 'Share a warm chat with family or friends'],
    shouldSeekHelp: isNotWell,
    gentleAffirmation: 'Your health and peace of mind are precious. Take gentle care of yourself.',
  };
}
