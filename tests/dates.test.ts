import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, getTimeOfDay, isReminderDue } from '../src/utils/dates';
import type { ReminderItem } from '../src/types';

describe('Date and Time Bilingual Utilities', () => {
  it('formats dates in English with full month', () => {
    const formatted = formatDate('2026-10-15', 'en');
    expect(formatted).toContain('October');
    expect(formatted).toContain('2026');
  });

  it('formats dates in Hindi with Devanagari numerals or Hindi locale', () => {
    const formatted = formatDate('2026-10-15', 'hi');
    expect(formatted).toBeDefined();
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('formats times cleanly in 12-hour AM/PM format', () => {
    const enMorning = formatTime('09:30', 'en');
    const enEvening = formatTime('21:45', 'en');

    expect(enMorning).toMatch(/9:30\s*AM/i);
    expect(enEvening).toMatch(/9:45\s*PM/i);
  });

  it('correctly categorizes time of day', () => {
    const morning = getTimeOfDay(new Date('2026-05-10T08:00:00'));
    const afternoon = getTimeOfDay(new Date('2026-05-10T14:00:00'));
    const evening = getTimeOfDay(new Date('2026-05-10T19:00:00'));
    const night = getTimeOfDay(new Date('2026-05-10T23:00:00'));

    expect(morning).toBe('morning');
    expect(afternoon).toBe('afternoon');
    expect(evening).toBe('evening');
    expect(night).toBe('night');
  });

  it('calculates reminder due status accurately', () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 1 hour ago -> DUE
    const pastHours = String(Math.max(0, now.getHours() - 1)).padStart(2, '0');
    const dueReminder: ReminderItem = {
      id: 'rem_1',
      title: 'Blood Pressure pill',
      category: 'medicine',
      date: todayStr,
      time: `${pastHours}:00`,
      repeat: 'daily',
      completed: false,
    };

    expect(isReminderDue(dueReminder, now)).toBe(true);

    // Completed reminder -> NOT DUE
    expect(isReminderDue({ ...dueReminder, completed: true }, now)).toBe(false);

    // Snoozed for 10 minutes in the future -> NOT DUE
    const futureSnooze = new Date(now.getTime() + 10 * 60000).toISOString();
    expect(isReminderDue({ ...dueReminder, snoozedUntil: futureSnooze }, now)).toBe(false);

    // Expired snooze -> DUE
    const pastSnooze = new Date(now.getTime() - 2 * 60000).toISOString();
    expect(isReminderDue({ ...dueReminder, snoozedUntil: pastSnooze }, now)).toBe(true);
  });
});
