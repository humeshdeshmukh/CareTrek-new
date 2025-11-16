import { useState, useEffect } from 'react';
import { translateText } from '../services/TranslationService';

const translationCache: Record<string, string> = {};

export const useCachedTranslation = (text: string, language: string) => {
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const translate = async () => {
      if (!text || language === 'en') {
        setTranslatedText(text);
        return;
      }

      const cacheKey = `${language}:${text}`;
      
      if (translationCache[cacheKey]) {
        setTranslatedText(translationCache[cacheKey]);
        return;
      }

      setIsLoading(true);
      try {
        const result = await translateText(text, language as any, 'en');
        translationCache[cacheKey] = result;
        setTranslatedText(result);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedText(text);
      } finally {
        setIsLoading(false);
      }
    };

    translate();
  }, [text, language]);

  return { translatedText, isLoading };
};
