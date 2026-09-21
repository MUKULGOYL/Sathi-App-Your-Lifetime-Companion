import { describe, it, expect } from 'vitest';
import { detectAndMaskSensitiveData, containsSensitiveData } from '../src/utils/sensitiveData';

describe('Sensitive Data Detection & Masking', () => {
  it('masks 12-digit Indian Aadhaar numbers with spaces', () => {
    const input = 'My Aadhaar is 2345 6789 0123 please verify.';
    const result = detectAndMaskSensitiveData(input);
    expect(result.hasSensitiveData).toBe(true);
    expect(result.types).toContain('Aadhaar');
    expect(result.maskedText).toContain('[AADHAAR MASKED]');
    expect(result.maskedText).not.toContain('2345 6789 0123');
  });

  it('masks 12-digit continuous Aadhaar numbers', () => {
    const input = 'Aadhaar: 987654321098';
    const result = detectAndMaskSensitiveData(input);
    expect(result.hasSensitiveData).toBe(true);
    expect(result.types).toContain('Aadhaar');
    expect(result.maskedText).toBe('Aadhaar: [AADHAAR MASKED]');
  });

  it('masks 10-character Indian PAN numbers', () => {
    const input = 'Here is my PAN ABCDE1234F for IT filing';
    const result = detectAndMaskSensitiveData(input);
    expect(result.hasSensitiveData).toBe(true);
    expect(result.types).toContain('PAN');
    expect(result.maskedText).toContain('[PAN MASKED]');
    expect(result.maskedText).not.toContain('ABCDE1234F');
  });

  it('masks 16-digit payment card numbers', () => {
    const input = 'Card 4111 2222 3333 4444 exp 12/28';
    const result = detectAndMaskSensitiveData(input);
    expect(result.hasSensitiveData).toBe(true);
    expect(result.types).toContain('Card Number');
    expect(result.maskedText).toContain('[CARD NUMBER MASKED]');
    expect(result.maskedText).not.toContain('4111 2222 3333 4444');
  });

  it('masks OTP verification codes in SMS', () => {
    const input = 'Your secret OTP for SBI netbanking is 849201. Do not share.';
    const result = detectAndMaskSensitiveData(input);
    expect(result.hasSensitiveData).toBe(true);
    expect(result.types).toContain('OTP');
    expect(result.maskedText).toContain('[OTP MASKED]');
    expect(result.maskedText).not.toContain('849201');
  });

  it('preserves clean text without sensitive numbers', () => {
    const input = 'How do I pay my electricity bill through UPI?';
    const result = detectAndMaskSensitiveData(input);
    expect(result.hasSensitiveData).toBe(false);
    expect(result.maskedText).toBe(input);
    expect(containsSensitiveData(input)).toBe(false);
  });
});
