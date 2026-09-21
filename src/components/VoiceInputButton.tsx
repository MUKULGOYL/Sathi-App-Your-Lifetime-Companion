import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { SpeechService } from '../services/speechService';
import type { SupportedLanguage } from '../types';

export interface VoiceInputButtonProps {
  language: SupportedLanguage;
  onTranscript: (text: string) => void;
  onError?: (err: string) => void;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  language,
  onTranscript,
  onError,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const isSupported = SpeechService.isRecognitionSupported();

  const handleToggleListening = () => {
    if (isListening) {
      SpeechService.stopSpeaking();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const stopFn = SpeechService.startListening(
      language,
      (text) => {
        onTranscript(text);
        setIsListening(false);
      },
      (err) => {
        setIsListening(false);
        if (onError) onError(err);
      },
      () => {
        setIsListening(false);
      }
    );

    if (!stopFn) {
      setIsListening(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleToggleListening}
      aria-label={isListening ? 'Stop listening' : 'Speak using microphone'}
      aria-pressed={isListening}
      className={`min-h-[56px] min-w-[56px] p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer border-2 focus-visible:ring-3 focus-visible:ring-[#0E7C86] ${
        isListening
          ? 'bg-[#C62828] text-white border-[#A31F1F] animate-pulse shadow-lg scale-105'
          : 'bg-[#FFF9EF] text-[#0E7C86] border-[#0E7C86] hover:bg-[#E6F4F5]'
      } ${className}`}
    >
      {isListening ? (
        <MicOff className="w-7 h-7" aria-hidden="true" />
      ) : (
        <Mic className="w-7 h-7" aria-hidden="true" />
      )}
    </button>
  );
};
