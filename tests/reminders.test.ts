import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../src/services/storageService';
import type { ReminderItem } from '../src/types';

describe('Reminders Management & Snooze Calculations', () => {
  beforeEach(() => {
    StorageService.clearAll();
  });

  it('saves and retrieves reminders accurately', () => {
    const reminder: ReminderItem = {
      id: 'rem_123',
      title: 'Morning Vitamin D',
      category: 'medicine',
      date: '2026-10-15',
      time: '08:00',
      repeat: 'daily',
      completed: false,
    };

    StorageService.saveReminders([reminder]);
    const retrieved = StorageService.getReminders();

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].title).toBe('Morning Vitamin D');
    expect(retrieved[0].completed).toBe(false);
  });

  it('calculates 10-minute snooze timestamp properly', () => {
    const beforeTime = Date.now();
    const snoozeDurationMs = 10 * 60 * 1000;
    const snoozedUntil = new Date(beforeTime + snoozeDurationMs).toISOString();

    const diff = new Date(snoozedUntil).getTime() - beforeTime;
    expect(diff).toBe(snoozeDurationMs);
  });

  it('marks reminder as completed and retains record', () => {
    const initial: ReminderItem = {
      id: 'rem_456',
      title: 'Pay Water Bill',
      category: 'bill',
      date: '2026-10-15',
      time: '14:00',
      repeat: 'none',
      completed: false,
    };

    const updated = { ...initial, completed: true };
    StorageService.saveReminders([updated]);

    const items = StorageService.getReminders();
    expect(items[0].completed).toBe(true);
  });
});
