import { describe, it, expect } from 'vitest';
import { en } from '../src/i18n/en';
import { hi } from '../src/i18n/hi';

function getDeepKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getDeepKeys(value as Record<string, unknown>, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys.sort();
}

describe('Internationalization (i18n) Key Parity & Quality', () => {
  it('enforces exact key parity between en.ts and hi.ts', () => {
    const enKeys = getDeepKeys(en as unknown as Record<string, unknown>);
    const hiKeys = getDeepKeys(hi as unknown as Record<string, unknown>);

    expect(enKeys).toEqual(hiKeys);
    expect(hiKeys.length).toBeGreaterThan(50);
  });

  it('ensures no empty translation strings in English or Hindi', () => {
    const checkNoEmpty = (obj: Record<string, unknown>, path = '') => {
      for (const [k, val] of Object.entries(obj)) {
        const currentPath = `${path}.${k}`;
        if (typeof val === 'string') {
          expect(val.trim().length, `Empty string at ${currentPath}`).toBeGreaterThan(0);
        } else if (typeof val === 'object' && val !== null) {
          checkNoEmpty(val as Record<string, unknown>, currentPath);
        }
      }
    };

    checkNoEmpty(en as unknown as Record<string, unknown>, 'en');
    checkNoEmpty(hi as unknown as Record<string, unknown>, 'hi');
  });

  it('uses respectful, natural Hindi (uses आप instead of informal forms)', () => {
    // Verify loading message and common prompts use respectful tone
    expect(hi.common.loadingMessage).toContain('आप');
    expect(hi.onboarding.step1Title).toContain('अपनी');
    expect(hi.onboarding.step3Title).toContain('आप');
  });
});
