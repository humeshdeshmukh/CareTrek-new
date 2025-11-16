import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translateText, loadLanguagePreference, saveLanguagePreference, LanguageCode, LANGUAGES } from '../../services/TranslationService';

type TranslationContextType = {
  // Translate a single text
  t: (text: string) => Promise<string>;
  // Current language code
  currentLanguage: LanguageCode;
  // Set current language
  setLanguage: (lang: LanguageCode) => Promise<void>;
  // Available languages
  availableLanguages: { code: LanguageCode; name: string; nativeName: string }[];
  // Whether a translation is in progress
  isTranslating: boolean;
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language on mount
  useEffect(() => {
    const initialize = async () => {
      const lang = await loadLanguagePreference();
      setCurrentLanguage(lang);
      setIsInitialized(true);
    };
    initialize();
  }, []);

  // Translate function with loading state
  const translate = useCallback(async (text: string): Promise<string> => {
    if (!text.trim() || currentLanguage === 'en') {
      return text;
    }

    setIsTranslating(true);
    try {
      return await translateText(text, currentLanguage, 'en');
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage]);

  // Change language
  const setLanguage = useCallback(async (lang: LanguageCode) => {
    if (LANGUAGES[lang] && lang !== currentLanguage) {
      setCurrentLanguage(lang);
      await saveLanguagePreference(lang);
    }
  }, [currentLanguage]);

  // Get available languages
  const availableLanguages = React.useMemo(() => {
    return Object.entries(LANGUAGES).map(([code, { name, nativeName }]) => ({
      code: code as LanguageCode,
      name,
      nativeName,
    }));
  }, []);

  // Don't render children until language is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <TranslationContext.Provider
      value={{
        t: translate,
        currentLanguage,
        setLanguage,
        availableLanguages,
        isTranslating,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
