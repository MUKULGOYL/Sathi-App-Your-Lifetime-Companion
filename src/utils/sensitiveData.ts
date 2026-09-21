/**
 * Sensitive Data Detection and Masking for Sathi
 * Protects senior citizens from inadvertently exposing Aadhaar, Cards, PAN, OTP, or CVV.
 */

export interface SensitiveDetectionResult {
  hasSensitiveData: boolean;
  maskedText: string;
  foundTypes: Array<'aadhaar' | 'cardNumber' | 'pan' | 'otp' | 'cvv'>;
  types: string[];
}

export function containsSensitiveData(text: string): boolean {
  return detectAndMaskSensitiveData(text).hasSensitiveData;
}

export function detectAndMaskSensitiveData(rawText: string): SensitiveDetectionResult {
  if (!rawText || typeof rawText !== 'string') {
    return { hasSensitiveData: false, maskedText: rawText || '', foundTypes: [], types: [] };
  }

  let text = rawText;
  const foundTypes = new Set<'aadhaar' | 'cardNumber' | 'pan' | 'otp' | 'cvv'>();
  const types = new Set<string>();

  // 1. Check & Mask CVV (3 or 4 digits near cvv/cvc)
  const cvvRegex = /(?:cvv|cvc|cid|security\s*code|सुरक्षा\s*कोड)[^0-9\n]{0,15}?(\d{3,4})\b|\b(\d{3,4})[^0-9\n]{0,15}?(?:cvv|cvc|cid)\b/gi;
  if (cvvRegex.test(text)) {
    foundTypes.add('cvv');
    types.add('CVV');
    text = text.replace(cvvRegex, (match, p1, p2) => {
      const num = p1 || p2;
      return match.replace(num, '[CVV MASKED]');
    });
  }

  // 2. Check & Mask OTP / PIN (4-8 digits near OTP/PIN/verification context)
  const otpRegex = /(?:otp|pin|passcode|verification\s*code|one\s*time|password|ओटीपी|पिन|पासवर्ड|कोड)[^0-9\n]{0,40}?([0-9]{4,8})\b|\b([0-9]{4,8})[^a-zA-Z0-9\n]{0,40}?(?:is\s*your\s*otp|is\s*your\s*pin|otp|pin|ओटीपी|पिन)\b/gi;
  if (otpRegex.test(text)) {
    foundTypes.add('otp');
    types.add('OTP');
    text = text.replace(otpRegex, (match, p1, p2) => {
      const code = p1 || p2;
      return match.replace(code, '[OTP MASKED]');
    });
  }

  // 3. Check & Mask PAN (5 letters, 4 digits, 1 letter)
  const panRegex = /\b[A-Za-z]{5}\d{4}[A-Za-z]\b/g;
  if (panRegex.test(text)) {
    foundTypes.add('pan');
    types.add('PAN');
    text = text.replace(panRegex, '[PAN MASKED]');
  }

  // 4. Check & Mask Credit/Debit Cards (13 to 19 digits)
  const cardRegex = /\b(?:\d{4}[\s-]?){3,4}\d{1,4}\b|\b\d{13,19}\b/g;
  text = text.replace(cardRegex, (match) => {
    const digitsOnly = match.replace(/[\s-]/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      foundTypes.add('cardNumber');
      types.add('Card Number');
      return '[CARD NUMBER MASKED]';
    }
    return match;
  });

  // 5. Check & Mask Aadhaar (12 digits)
  const aadhaarRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
  text = text.replace(aadhaarRegex, (match) => {
    const digitsOnly = match.replace(/[\s-]/g, '');
    if (digitsOnly.length === 12) {
      foundTypes.add('aadhaar');
      types.add('Aadhaar');
      return '[AADHAAR MASKED]';
    }
    return match;
  });

  return {
    hasSensitiveData: foundTypes.size > 0,
    maskedText: text,
    foundTypes: Array.from(foundTypes),
    types: Array.from(types),
  };
}
