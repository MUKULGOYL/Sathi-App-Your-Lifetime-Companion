import { z } from 'zod';
import type {
  UserProfile,
  ReminderItem,
  CheckinEntry,
  AskMessage,
  BriefingData,
} from '../types';

export const STORAGE_KEY = 'sathi_app_v1';

const UserProfileSchema = z.object({
  name: z.string().default(''),
  city: z.string().default(''),
  familyContactName: z.string().default(''),
  familyContactPhone: z.string().default(''),
  medicines: z.string().default(''),
  healthNotes: z.string().default(''),
  textSize: z.enum(['normal', 'large', 'xlarge']).default('normal'),
  theme: z.enum(['light', 'dark']).default('light'),
  speechSpeed: z.union([z.literal(0.8), z.literal(1.0), z.literal(1.2)]).default(1.0),
  language: z.enum(['en', 'hi']).default('en'),
  notificationsEnabled: z.boolean().default(false),
  isOnboarded: z.boolean().default(false),
});

const ReminderItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  time: z.string(),
  category: z.enum(['medicine', 'appointment', 'bill', 'other']),
  repeat: z.enum(['none', 'daily', 'weekly']),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  snoozedUntil: z.string().optional(),
  source: z.enum(['manual', 'simplify', 'ask']).optional(),
});

const CheckinEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  timestamp: z.string(),
  mood: z.enum(['good', 'okay', 'not_well']),
  symptoms: z.array(z.string()),
  notes: z.string(),
  guidance: z.string().optional(),
  aiResponse: z.string().optional(),
});

const AskMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  timestamp: z.string(),
  stepByStep: z.array(z.string()).optional(),
  simplifiedSummary: z.string().optional(),
  suggestedFollowUps: z.array(z.string()).optional(),
  canSaveAsReminder: z.boolean().optional(),
  reminderSuggestion: z.object({
    title: z.string(),
    suggestedTime: z.string().optional(),
    category: z.enum(['medicine', 'appointment', 'bill', 'other']),
  }).optional(),
});

const BriefingDataSchema = z.object({
  greeting: z.string(),
  priorities: z.array(z.string()),
  wellbeingNudge: z.string(),
  safetyTip: z.string(),
  learnTip: z.string(),
  generatedAt: z.string(),
  hash: z.string(),
});

export const AppStateSchema = z.object({
  version: z.literal(1),
  profile: UserProfileSchema,
  reminders: z.array(ReminderItemSchema).default([]),
  checkins: z.array(CheckinEntrySchema).default([]),
  askHistory: z.array(AskMessageSchema).default([]),
  cachedBriefing: BriefingDataSchema.nullable().default(null),
});

export type AppState = z.infer<typeof AppStateSchema>;

export const DEFAULT_APP_STATE: AppState = {
  version: 1,
  profile: {
    name: '',
    city: '',
    familyContactName: '',
    familyContactPhone: '',
    medicines: '',
    healthNotes: '',
    textSize: 'normal',
    theme: 'light',
    speechSpeed: 1.0,
    language: 'en',
    notificationsEnabled: false,
    isOnboarded: false,
  },
  reminders: [],
  checkins: [],
  askHistory: [],
  cachedBriefing: null,
};

export class StorageService {
  /**
   * Safe load with Zod validation. Resets to default if corrupted.
   */
  static load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_APP_STATE };
      }

      const parsed = JSON.parse(raw);
      const result = AppStateSchema.safeParse(parsed);
      if (result.success) {
        return result.data as AppState;
      }

      console.warn('[StorageService] Stored state schema mismatch. Resetting safely.', result.error);
      this.save(DEFAULT_APP_STATE);
      return { ...DEFAULT_APP_STATE };
    } catch (err) {
      console.error('[StorageService] Error loading localStorage:', err);
      return { ...DEFAULT_APP_STATE };
    }
  }

  /**
   * Save app state to localStorage
   */
  static save(state: AppState): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error('[StorageService] Failed to save state to localStorage:', err);
      return false;
    }
  }

  /**
   * Clears all stored app data from localStorage.
   */
  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[StorageService] Error clearing data:', err);
    }
  }

  /**
   * Alias for clear() to reset all application state.
   */
  static clearAll(): void {
    this.clear();
  }

  /**
   * Retrieves the current user profile from storage.
   */
  static getProfile(): UserProfile {
    return this.load().profile;
  }

  /**
   * Persists updated user profile into storage.
   */
  static saveProfile(profile: UserProfile): void {
    const current = this.load();
    this.save({ ...current, profile });
  }

  /**
   * Retrieves all scheduled reminders from storage.
   */
  static getReminders(): ReminderItem[] {
    return this.load().reminders;
  }

  /**
   * Persists the full list of reminders into storage.
   */
  static saveReminders(reminders: ReminderItem[]): void {
    const current = this.load();
    this.save({ ...current, reminders });
  }

  /**
   * Retrieves daily wellbeing check-in records from storage.
   */
  static getCheckins(): CheckinEntry[] {
    return this.load().checkins;
  }

  /**
   * Persists daily check-in entries into storage.
   */
  static saveCheckins(checkins: CheckinEntry[]): void {
    const current = this.load();
    this.save({ ...current, checkins });
  }

  /**
   * Retrieves the conversation message history for Ask Sathi.
   */
  static getAskHistory(): AskMessage[] {
    return this.load().askHistory;
  }

  /**
   * Persists Ask Sathi conversation history into storage.
   */
  static saveAskHistory(askHistory: AskMessage[]): void {
    const current = this.load();
    this.save({ ...current, askHistory });
  }

  /**
   * Retrieves the cached morning briefing if available.
   */
  static getBriefing(): BriefingData | null {
    return this.load().cachedBriefing;
  }

  /**
   * Persists or invalidates the cached morning briefing.
   */
  static saveBriefing(cachedBriefing: BriefingData | null): void {
    const current = this.load();
    this.save({ ...current, cachedBriefing });
  }
}
