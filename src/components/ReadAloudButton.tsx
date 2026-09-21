import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { SpeechService } from '../services/speechService';
import type { SupportedLanguage, SpeechSpeed } from '../types';
import { useI18n } from '../i18n';

export interface ReadAloudButtonProps {
  text: string;
  language: SupportedLanguage;
  className?: string;
}

export const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  text,
  language,
  className = '',
}) => {
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeechSpeed>(1.0);
  const [showVoiceWarning, setShowVoiceWarning] = useState(false);

  const isSupported = SpeechService.isSynthesisSupported();

  useEffect(() => {
    return () => {
      // Stop reading on unmount
      SpeechService.stopSpeaking();
    };
  }, []);

  if (!isSupported) {
    return null;
  }

  const handleTogglePlay = () => {
    if (isPlaying) {
      SpeechService.stopSpeaking();
      setIsPlaying(false);
      return;
    }

    const { hasNativeHindiVoice } = SpeechService.speak(
      text,
      language,
      speed,
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    );

    if (language === 'hi' && !hasNativeHindiVoice) {
      setShowVoiceWarning(true);
      setTimeout(() => setShowVoiceWarning(false), 5000);
    }
  };

  const handleSpeedCycle = () => {
    const nextSpeed: SpeechSpeed = speed === 0.8 ? 1.0 : speed === 1.0 ? 1.2 : 0.8;
    setSpeed(nextSpeed);
    if (isPlaying) {
      SpeechService.stopSpeaking();
      SpeechService.speak(
        text,
        language,
        nextSpeed,
        () => setIsPlaying(true),
        () => setIsPlaying(false)
      );
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? t.common.stopReading : t.common.readAloud}
          aria-pressed={isPlaying}
          className={`min-h-[56px] px-5 py-2.5 rounded-2xl font-bold flex items-center gap-3 transition-all border-2 cursor-pointer focus-visible:ring-3 focus-visible:ring-[#0E7C86] ${
            isPlaying
              ? 'bg-[#8B0000] text-white border-[#8B0000]'
              : 'bg-[#E6F4F5] text-[#064E56] border-[#0E7C86] hover:bg-[#0E7C86] hover:text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <VolumeX className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>{t.common.stopReading}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span>{t.common.readAloud}</span>
            </>
          )}
        </button>

        {/* Speed button */}
        <button
          type="button"
          onClick={handleSpeedCycle}
          aria-label={`${t.common.voiceSpeed}: ${speed}x`}
          title={t.common.voiceSpeed}
          className="min-h-[56px] px-4 py-2.5 rounded-2xl font-bold bg-white text-[#0F2A33] border-2 border-[#E8DEC8] hover:border-[#0E7C86] flex items-center justify-center text-base focus-visible:ring-3 focus-visible:ring-[#0E7C86] cursor-pointer"
        >
          <span>{speed}x</span>
        </button>
      </div>

      {showVoiceWarning && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-[#5E3A00] bg-[#FFF4DC] border border-[#F4A300] p-2.5 rounded-xl mt-1"
        >
          {t.common.noHindiVoiceNote}
        </p>
      )}
    </div>
  );
};
