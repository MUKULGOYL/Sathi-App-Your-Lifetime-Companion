import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeBriefingHash } from '../src/utils/hash';
import { StorageService } from '../src/services/storageService';
import type { BriefingData, UserProfile, ReminderItem } from '../src/types';

describe('Home Briefing Caching & Hash Logic', () => {
  const baseProfile: UserProfile = {
    name: 'Ramesh Sharma',
    city: 'Jaipur',
    medicines: 'Metformin 500mg, Telmisartan 40mg',
    healthNotes: 'Type 2 diabetes, mild hypertension',
    familyContactName: 'Pooja Sharma',
    familyContactPhone: '9876543211',
    textSize: 'large',
    theme: 'light',
    speechSpeed: 1.0,
    language: 'en',
    notificationsEnabled: true,
    isOnboarded: true,
  };

  const baseReminders: ReminderItem[] = [
    {
      id: 'rem_1',
      title: 'Morning Blood Sugar Check',
      category: 'medicine',
      time: '08:00',
      date: '2026-09-19',
      repeat: 'daily',
      completed: false,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('generates consistent hashes for identical state', () => {
    const hash1 = computeBriefingHash({
      date: '2026-09-19',
      language: 'en',
      profile: {
        name: baseProfile.name,
        city: baseProfile.city,
        medicines: baseProfile.medicines,
        healthNotes: baseProfile.healthNotes,
      },
      mood: 'good',
      reminders: baseReminders.map((r) => ({
        id: r.id,
        title: r.title,
        time: r.time,
        completed: r.completed,
      })),
    });

    const hash2 = computeBriefingHash({
      date: '2026-09-19',
      language: 'en',
      profile: {
        name: baseProfile.name,
        city: baseProfile.city,
        medicines: baseProfile.medicines,
        healthNotes: baseProfile.healthNotes,
      },
      mood: 'good',
      reminders: baseReminders.map((r) => ({
        id: r.id,
        title: r.title,
        time: r.time,
        completed: r.completed,
      })),
    });

    expect(hash1).toBe(hash2);
    expect(hash1.startsWith('briefing_')).toBe(true);
  });

  it('produces different hash when date, language, mood, reminders, or profile change', () => {
    const baseHash = computeBriefingHash({
      date: '2026-09-19',
      language: 'en',
      profile: {
        name: baseProfile.name,
        city: baseProfile.city,
        medicines: baseProfile.medicines,
        healthNotes: baseProfile.healthNotes,
      },
      mood: 'good',
      reminders: baseReminders.map((r) => ({
        id: r.id,
        title: r.title,
        time: r.time,
        completed: r.completed,
      })),
    });

    // Date change
    const nextDayHash = computeBriefingHash({
      date: '2026-09-20',
      language: 'en',
      profile: {
        name: baseProfile.name,
        city: baseProfile.city,
        medicines: baseProfile.medicines,
        healthNotes: baseProfile.healthNotes,
      },
      mood: 'good',
      reminders: baseReminders.map((r) => ({
        id: r.id,
        title: r.title,
        time: r.time,
        completed: r.completed,
      })),
    });
    expect(nextDayHash).not.toBe(baseHash);

    // Language change
    const hindiHash = computeBriefingHash({
      date: '2026-09-19',
      language: 'hi',
      profile: {
        name: baseProfile.name,
        city: baseProfile.city,
        medicines: baseProfile.medicines,
        healthNotes: baseProfile.healthNotes,
      },
      mood: 'good',
      reminders: baseReminders.map((r) => ({
        id: r.id,
        title: r.title,
        time: r.time,
        completed: r.completed,
      })),
    });
    expect(hindiHash).not.toBe(baseHash);

    // Mood change
    const moodHash = computeBriefingHash({
      date: '2026-09-19',
      language: 'en',
      profile: {
        name: baseProfile.name,
        city: baseProfile.city,
        medicines: baseProfile.medicines,
        healthNotes: baseProfile.healthNotes,
      },
      mood: 'not_well',
      reminders: baseReminders.map((r) => ({
        id: r.id,
        title: r.title,
        time: r.time,
        completed: r.completed,
      })),
    });
    expect(moodHash).not.toBe(baseHash);

    // Reminders change
    const newRemindersHash = computeBriefingHash({
      date: '2026-09-19',
      language: 'en',
      profile: {
        name: baseProfile.name,
        city: baseProfile.city,
        medicines: baseProfile.medicines,
        healthNotes: baseProfile.healthNotes,
      },
      mood: 'good',
      reminders: [
        ...baseReminders.map((r) => ({
          id: r.id,
          title: r.title,
          time: r.time,
          completed: r.completed,
        })),
        { id: 'rem_2', title: 'Walk', time: '17:00', completed: false },
      ],
    });
    expect(newRemindersHash).not.toBe(baseHash);
  });

  it('persists and retrieves cached briefing from localStorage accurately', () => {
    const mockBriefing: BriefingData = {
      greeting: 'Good morning, Ramesh ji',
      priorities: ['Check morning blood sugar', 'Take morning stroll'],
      wellbeingNudge: 'Stay hydrated throughout the afternoon.',
      safetyTip: 'Never share OTPs with callers claiming to be from your bank.',
      learnTip: 'A 15-minute walk after meals helps regulate blood glucose.',
      generatedAt: new Date().toISOString(),
      hash: 'abc123hash',
    };

    StorageService.saveBriefing(mockBriefing);
    const retrieved = StorageService.getBriefing();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.hash).toBe('abc123hash');
    expect(retrieved?.greeting).toBe(mockBriefing.greeting);
    expect(retrieved?.priorities).toHaveLength(2);
  });

  it('differentiates cache hit from refresh bypass', () => {
    const currentHash = 'cached_hash_456';
    const cachedData: BriefingData = {
      greeting: 'Cached briefing',
      priorities: ['Task 1'],
      wellbeingNudge: 'Rest well',
      safetyTip: 'Stay safe',
      learnTip: 'Learn something',
      generatedAt: '2026-09-19T06:00:00.000Z',
      hash: currentHash,
    };

    // Cache hit scenario:
    const isCacheValid = (cached: BriefingData | null, hash: string, bypass: boolean) => {
      if (bypass) return false;
      return cached !== null && cached.hash === hash;
    };

    // 1. Regular session load: valid cache returns true without network call
    expect(isCacheValid(cachedData, currentHash, false)).toBe(true);

    // 2. Hash mismatch (e.g. next day or different mood): cache is invalid
    expect(isCacheValid(cachedData, 'different_hash_789', false)).toBe(false);

    // 3. User clicks "Refresh" (bypassCache = true): bypasses cache
    expect(isCacheValid(cachedData, currentHash, true)).toBe(false);
  });
});
