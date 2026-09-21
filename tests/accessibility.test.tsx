import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { VerdictBadge } from '../src/components/VerdictBadge';
import { Button } from '../src/components/Button';
import { I18nProvider } from '../src/i18n';

describe('Accessibility Standards & WCAG AAA Patterns', () => {
  it('VerdictBadge includes icon, text and symbol (never relies on color alone)', () => {
    const { getByTestId } = render(
      <I18nProvider initialLanguage="en">
        <VerdictBadge verdict="SAFE" />
        <VerdictBadge verdict="SUSPICIOUS" />
        <VerdictBadge verdict="LIKELY_SCAM" />
      </I18nProvider>
    );

    const safeBadge = getByTestId('verdict-safe');
    const suspBadge = getByTestId('verdict-suspicious');
    const scamBadge = getByTestId('verdict-scam');

    expect(safeBadge.textContent).toContain('✔');
    expect(suspBadge.textContent).toContain('⚠');
    expect(scamBadge.textContent).toContain('✖');
  });

  it('Button includes min-height of at least 56px/64px for elder touch targets', () => {
    const { getByRole } = render(
      <Button variant="primary" size="default">
        Confirm Action
      </Button>
    );

    const button = getByRole('button', { name: /confirm action/i });
    expect(button.className).toContain('min-h-[64px]');
  });

  it('Button sets aria-busy when in loading state', () => {
    const { getByRole } = render(
      <Button variant="primary" loading={true} loadingText="Please wait...">
        Submit
      </Button>
    );

    const button = getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button.textContent).toContain('Please wait...');
  });
});
