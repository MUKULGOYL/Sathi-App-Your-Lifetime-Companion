import type { SupportedLanguage, SpeechSpeed } from '../types';

// Declare types for Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    cachedVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        cachedVoices = window.speechSynthesis.getVoices();
      } catch {
        // ignore
      }
    };
  } catch {
    // ignore
  }
}

export class SpeechService {
  /**
   * Check if speech recognition is available in current browser
   */
  static isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Check if speech synthesis is available
   */
  static isSynthesisSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
  }

  /**
   * Start microphone speech recognition
   */
  static startListening(
    language: SupportedLanguage,
    onResult: (text: string) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ): (() => void) | null {
    if (!this.isRecognitionSupported()) {
      onError('Speech recognition is not supported in this browser.');
      return null;
    }

    const SpeechRecConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecConstructor) return null;

    const recognition = new SpeechRecConstructor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[Speech Recognition Error]:', event.error);
      onError(event.error);
    };

    recognition.onend = () => {
      onEnd();
    };

    try {
      recognition.start();
      return () => {
        try {
          recognition.abort();
        } catch {
          // ignore abort error
        }
      };
    } catch (err) {
      console.error('[Speech Recognition Start Error]:', err);
      onError('Unable to start microphone.');
      return null;
    }
  }

  /**
   * Speak text out loud with matching voice and speed
   */
  static speak(
    text: string,
    language: SupportedLanguage,
    speed: SpeechSpeed = 1.0,
    onStart?: () => void,
    onEnd?: () => void
  ): { hasNativeHindiVoice: boolean } {
    if (!this.isSynthesisSupported()) {
      return { hasNativeHindiVoice: false };
    }

    this.stopSpeaking();

    // Clean text of markdown artifacts
    const cleanedText = text
      .replace(/\*\*/g, '')
      .replace(/[*_#]/g, '')
      .replace(/```[^`]*```/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = speed;
    utterance.pitch = 1.0;
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

    // Find best available voice
    let hasNativeHindiVoice = true;
    const voices = (cachedVoices && cachedVoices.length > 0) ? cachedVoices : window.speechSynthesis.getVoices();
    if (language === 'hi') {
      const hindiVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.lang.toLowerCase().includes('hi-in') ||
          v.lang.toLowerCase().includes('hi_in') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.includes('हिन्दी')
      );
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      } else {
        hasNativeHindiVoice = false;
      }
    } else {
      const indianEnglish = voices.find((v) => v.lang === 'en-IN' || v.lang.toLowerCase().includes('en-in'));
      if (indianEnglish) {
        utterance.voice = indianEnglish;
      }
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
    return { hasNativeHindiVoice };
  }

  /**
   * Stop current speech playback
   */
  static stopSpeaking(): void {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Check if speech synthesis is currently speaking
   */
  static isSpeaking(): boolean {
    if (this.isSynthesisSupported()) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }
}
