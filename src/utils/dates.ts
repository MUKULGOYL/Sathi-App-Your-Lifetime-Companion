/**
 * Date and Time utilities formatted for en-IN and hi-IN
 */

import type { SupportedLanguage, ReminderItem } from '../types';

/** Maximum past minutes for which a scheduled reminder remains active/due */
export const REMINDER_LOOKBACK_MINUTES = 180;

/** Early minutes before scheduled time to treat reminder as upcoming/due */
export const REMINDER_EARLY_TRIGGER_MINUTES = -5;

/** Default snooze duration in minutes */
export const DEFAULT_SNOOZE_MINUTES = 10;

/** Milliseconds in one minute */
const MS_PER_MINUTE = 60 * 1000;

/**
 * Formats an ISO date string into a localized human-readable date.
 * @param isoDate - The ISO date string (e.g. "2026-09-18")
 * @param language - Active locale ('en' or 'hi')
 * @returns Localized date string
 */
export function formatDate(isoDate: string, language: SupportedLanguage = 'en'): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;

  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a 24-hour time string ("HH:mm") into a localized 12-hour formatted time with AM/PM.
 * @param timeStr - Time string in HH:mm format
 * @param language - Active locale ('en' or 'hi')
 * @returns Localized time string
 */
export function formatTime(timeStr: string, language: SupportedLanguage = 'en'): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats a full ISO timestamp into a localized short date and time string.
 * @param isoString - Full ISO timestamp
 * @param language - Active locale ('en' or 'hi')
 * @returns Localized date and time string
 */
export function formatDateTime(isoString: string, language: SupportedLanguage = 'en'): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Returns today's date formatted as "YYYY-MM-DD" in local time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the current time formatted as "HH:mm" in local time.
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Categorizes the given date into a time-of-day period.
 * @param date - Optional date instance, defaults to current time
 * @returns 'morning' | 'afternoon' | 'evening' | 'night'
 */
export function getTimeOfDay(date: Date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Checks if a reminder is currently due (within past lookback window or snoozed until now).
 * @param reminder - Reminder item to inspect
 * @param now - Reference date, defaults to current date/time
 * @returns Boolean indicating whether reminder is due
 */
export function isReminderDue(reminder: ReminderItem, now: Date = new Date()): boolean {
  if (reminder.completed) return false;

  // If snoozed, check snooze timestamp
  if (reminder.snoozedUntil) {
    const snoozeTime = new Date(reminder.snoozedUntil);
    if (!isNaN(snoozeTime.getTime()) && snoozeTime <= now) {
      return true;
    }
    if (snoozeTime > now) {
      return false;
    }
  }

  const todayStr = getTodayDateString();

  // For daily reminders, compare time of day
  if (reminder.repeat === 'daily') {
    const [remH, remM] = reminder.time.split(':').map(Number);
    const scheduled = new Date();
    scheduled.setHours(remH, remM, 0, 0);

    const diffMinutes = (now.getTime() - scheduled.getTime()) / MS_PER_MINUTE;
    return diffMinutes >= REMINDER_EARLY_TRIGGER_MINUTES && diffMinutes <= REMINDER_LOOKBACK_MINUTES;
  }

  // If reminder is for today
  if (reminder.date === todayStr) {
    const [remH, remM] = reminder.time.split(':').map(Number);
    const scheduled = new Date();
    scheduled.setHours(remH, remM, 0, 0);

    const diffMinutes = (now.getTime() - scheduled.getTime()) / MS_PER_MINUTE;
    return diffMinutes >= REMINDER_EARLY_TRIGGER_MINUTES && diffMinutes <= REMINDER_LOOKBACK_MINUTES;
  }

  // If date was in the past and still not completed
  if (reminder.date < todayStr) {
    return true;
  }

  return false;
}

/**
 * Calculates a snooze timestamp ISO string for the specified number of minutes from now.
 * @param minutes - Number of minutes to snooze, defaults to DEFAULT_SNOOZE_MINUTES (10)
 * @returns ISO 8601 string
 */
export function getSnoozeTimestamp(minutes = DEFAULT_SNOOZE_MINUTES): string {
  const date = new Date(Date.now() + minutes * MS_PER_MINUTE);
  return date.toISOString();
}
