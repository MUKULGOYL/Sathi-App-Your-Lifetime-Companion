export type SupportedLanguage = 'en' | 'hi';
export type TextSize = 'normal' | 'large' | 'xlarge';
export type AppTheme = 'light' | 'dark';
export type SpeechSpeed = 0.8 | 1.0 | 1.2;

export interface UserProfile {
  name: string;
  city: string;
  familyContactName: string;
  familyContactPhone: string;
  medicines: string;
  healthNotes: string;
  textSize: TextSize;
  theme: AppTheme;
  speechSpeed: SpeechSpeed;
  language: SupportedLanguage;
  notificationsEnabled: boolean;
  isOnboarded: boolean;
}

export type ReminderCategory = 'medicine' | 'appointment' | 'bill' | 'other';
export type ReminderRepeat = 'none' | 'daily' | 'weekly';

export interface ReminderItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: ReminderCategory;
  repeat: ReminderRepeat;
  completed: boolean;
  completedAt?: string;
  snoozedUntil?: string; // ISO string
  source?: 'manual' | 'simplify' | 'ask';
}

export type CheckinMood = 'good' | 'okay' | 'not_well';

export interface CheckinEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  mood: CheckinMood;
  symptoms: string[];
  notes: string;
  guidance?: string;
  aiResponse?: string;
}

export interface BriefingData {
  greeting: string;
  priorities: string[];
  wellbeingNudge: string;
  safetyTip: string;
  learnTip: string;
  generatedAt: string;
  hash: string;
}

export interface SimplifyResult {
  whatIsThis: string;
  actionSteps: string[];
  keyDatesAndAmounts: Array<{
    label: string;
    isoDate?: string;
    amount?: string;
    note?: string;
    category: ReminderCategory;
  }>;
  beCarefulAbout: string[];
  contactOrHelpline?: string;
}

export type ScamVerdictStatus = 'SAFE' | 'SUSPICIOUS' | 'LIKELY_SCAM';
export type ScamChannel = 'sms' | 'whatsapp' | 'call' | 'email' | 'link' | 'other';

export interface ScamVerdict {
  verdict: ScamVerdictStatus;
  confidenceScore?: number;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  summary?: string;
  plainReasons?: string[];
  whyThisVerdict?: string[];
  whatToDoNow: string[];
  neverDoThis: string[];
  helpline?: string;
  helplineWebsite?: string;
}

export interface AskMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  stepByStep?: string[];
  simplifiedSummary?: string;
  suggestedFollowUps?: string[];
  canSaveAsReminder?: boolean;
  reminderSuggestion?: {
    title: string;
    suggestedTime?: string;
    category: ReminderCategory;
  };
}

export type ActiveTab = 'home' | 'ask' | 'simplify' | 'reminders' | 'scam_shield' | 'checkin' | 'sos' | 'settings';
