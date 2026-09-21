/**
 * Simple deterministic string hashing for briefing caching
 */
export interface BriefingHashParams {
  date: string;
  language: string;
  profile: {
    name?: string;
    city?: string;
    medicines?: string;
    healthNotes?: string;
  };
  mood: string;
  reminders: Array<{ id: string; title: string; time?: string; completed?: boolean }>;
}

export function computeBriefingHash(
  dateOrParams: string | BriefingHashParams,
  language?: string,
  profileName?: string,
  medicines?: string,
  mood?: string,
  remindersCount?: number
): string {
  let combined: string;
  if (typeof dateOrParams === 'object') {
    const p = dateOrParams;
    const profileStr = `${p.profile.name || ''}:${p.profile.city || ''}:${p.profile.medicines || ''}:${p.profile.healthNotes || ''}`;
    const remindersStr = p.reminders.map((r) => `${r.id}:${r.title}:${r.time || ''}:${Boolean(r.completed)}`).join(';');
    combined = `${p.date}|${p.language}|${profileStr}|${p.mood}|${remindersStr}`;
  } else {
    combined = `${dateOrParams}|${language || ''}|${profileName || ''}|${medicines || ''}|${mood || ''}|${remindersCount || 0}`;
  }

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `briefing_${Math.abs(hash)}`;
}
