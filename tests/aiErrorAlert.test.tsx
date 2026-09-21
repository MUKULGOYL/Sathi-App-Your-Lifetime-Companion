import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AiErrorAlert } from '../src/components/AiErrorAlert';
import { ApiError } from '../src/services/apiClient';

describe('AiErrorAlert Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders generic network failure with immediate active retry button and network checklist', () => {
    const onRetry = vi.fn();
    const networkError = new ApiError('Failed to fetch', 500, 'नेटवर्क त्रुटि', 'NETWORK_ERROR');

    render(
      <AiErrorAlert
        error={networkError}
        language="en"
        onRetry={onRetry}
      />
    );

    // Shows network error indicator
    const alertBox = screen.getByTestId('ai-error-alert');
    expect(alertBox.getAttribute('data-error-category')).toBe('network_error');
    expect(screen.getAllByText(/Network Connection Problem/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Unable to connect to Sathi assistant/i)).toBeDefined();
    expect(screen.getByText(/Make sure Wi-Fi or mobile data is switched on/i)).toBeDefined();

    // No countdown timer is rendered for generic network failure
    expect(screen.queryByTestId('countdown-timer')).toBeNull();

    // Try again button is IMMEDIATELY ENABLED
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).not.toBeDisabled();
    expect(retryButton.textContent).toContain('Try again');

    // Clicking calls onRetry
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders AI_BUSY state with translated countdown timer and keeps Try again button disabled until expired', () => {
    const onRetry = vi.fn();
    const aiBusyError = new ApiError(
      'AI assistant is busy. RESOURCE_EXHAUSTED',
      429,
      'साथी सहायक व्यस्त है',
      'AI_BUSY',
      10 // 10 seconds countdown
    );

    render(
      <AiErrorAlert
        error={aiBusyError}
        language="en"
        onRetry={onRetry}
      />
    );

    const alertBox = screen.getByTestId('ai-error-alert');
    expect(alertBox.getAttribute('data-error-category')).toBe('ai_busy');
    expect(screen.getByText(/AI Assistant Busy • Cooldown Active/i)).toBeDefined();
    expect(screen.getAllByText(/Sathi assistant is busy right now/i).length).toBeGreaterThanOrEqual(1);

    // Countdown timer is visible
    const timerBox = screen.getByTestId('countdown-timer');
    expect(timerBox).toBeDefined();
    expect(timerBox.textContent).toContain('10 seconds');

    // The Try again button MUST be DISABLED
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toBeDisabled();
    expect(retryButton.textContent).toContain('Please wait (10s)');

    // Attempting to click should NOT trigger onRetry
    fireEvent.click(retryButton);
    expect(onRetry).not.toHaveBeenCalled();

    // Advance timer by 4 seconds -> 6s remaining
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId('countdown-timer').textContent).toContain('6 seconds');
    expect(retryButton).toBeDisabled();
    expect(retryButton.textContent).toContain('Please wait (6s)');

    // Advance timer by remaining 6 seconds -> cooldown expired (0s)
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Cooldown finished banner should appear
    expect(screen.getByTestId('cooldown-finished')).toBeDefined();
    expect(screen.getByText(/Cooldown finished! You can try again now/i)).toBeDefined();

    // The Try again button MUST now be ENABLED
    expect(retryButton).not.toBeDisabled();
    expect(retryButton.textContent).toContain('Try again now');

    // Clicking enabled button triggers onRetry
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders translated Hindi countdown and message for AI_BUSY state', () => {
    const onRetry = vi.fn();
    const aiBusyError = new ApiError(
      'RESOURCE_EXHAUSTED',
      429,
      'साथी सहायक इस समय व्यस्त है',
      'AI_BUSY',
      5
    );

    render(
      <AiErrorAlert
        error={aiBusyError}
        language="hi"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/साथी सहायक व्यस्त • प्रतीक्षा समय सक्रिय/i)).toBeDefined();
    expect(screen.getByText(/साथी सहायक इस समय व्यस्त है/i)).toBeDefined();

    const timerBox = screen.getByTestId('countdown-timer');
    expect(timerBox.textContent).toContain('5 सेकंड');
    expect(timerBox.textContent).toContain('पुनः प्रयास करने से पहले कृपया 5 सेकंड प्रतीक्षा करें');

    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toBeDisabled();
    expect(retryButton.textContent).toContain('कृपया प्रतीक्षा करें (5s)');

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(retryButton).not.toBeDisabled();
    expect(retryButton.textContent).toContain('अब पुनः प्रयास करें');
  });

  it('renders translated Hindi network error without blocking countdown', () => {
    const onRetry = vi.fn();
    const networkError = new Error('Failed to fetch');

    render(
      <AiErrorAlert
        error={networkError}
        language="hi"
        onRetry={onRetry}
      />
    );

    expect(screen.getAllByText(/इंटरनेट कनेक्शन समस्या/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/साथी सहायक से संपर्क नहीं हो पाया/i)).toBeDefined();
    expect(screen.getByText(/जांचें कि आपके फोन में वाई-फ़ाई/i)).toBeDefined();

    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).not.toBeDisabled();
    expect(retryButton.textContent).toContain('पुनः प्रयास करें');
  });
});
