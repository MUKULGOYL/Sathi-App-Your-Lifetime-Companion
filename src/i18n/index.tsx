import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SupportedLanguage } from '../types';
import { en, type TranslationDictionary } from './en';
import { hi } from './hi';

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;
}

const I18nContext = createContext<I18nContextType | null>(null);

interface I18nProviderProps {
  initialLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  initialLanguage = 'en',
  onLanguageChange,
  children,
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  useEffect(() => {
    // Keep html lang in sync
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.title = language === 'hi' 
        ? 'साथी (Sathi) - वरिष्ठ नागरिक दैनिक साथी'
        : 'Sathi (साथी) - Senior Citizen Daily Companion';
    }
  }, [language]);

  const t = language === 'hi' ? hi : en;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
