import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

export type LanguageCode = 'en' | 'hi' | 'bn' | 'te' | 'mr' | 'ta' | 'gu' | 'kn' | 'ml' | 'pa';

// Google Cloud Translation API language codes
export const LANGUAGES: { [key in LanguageCode]: { name: string; nativeName: string } } = {
  en: { name: 'English', nativeName: 'English' },
  hi: { name: 'Hindi', nativeName: 'हिंदी' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  mr: { name: 'Marathi', nativeName: 'मराठी' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
};

// In-memory cache for translations
const translationCache: Record<string, string> = {};

// MyMemory Translation API configuration
const MY_MEMORY_API = 'https://api.mymemory.translated.net/get';

// Language code mapping for MyMemory
const MY_MEMORY_LANGUAGE_MAP: Record<LanguageCode, string> = {
  en: 'en',
  hi: 'hi',
  mr: 'mr',
  ta: 'ta',
  te: 'te',
  kn: 'kn',
  gu: 'gu',
  bn: 'bn',
  ml: 'ml',
  pa: 'pa',
};

// Check if language is supported
const isLanguageSupported = (lang: LanguageCode): boolean => {
  return lang in MY_MEMORY_LANGUAGE_MAP;
};

/**
 * Translate text using LibreTranslate API
 */
export const translateText = async (
  text: string,
  targetLang: LanguageCode,
  sourceLang: LanguageCode = 'en'
): Promise<string> => {
  if (!text.trim() || targetLang === sourceLang) {
    return text;
  }

  // Check if target language is supported
  if (!isLanguageSupported(targetLang) || !isLanguageSupported(sourceLang)) {
    console.warn(`Unsupported language pair: ${sourceLang} -> ${targetLang}`);
    return text;
  }

  const cacheKey = `${sourceLang}-${targetLang}-${text}`;
  
  // Return cached translation if available
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    // MyMemory API uses GET requests with query parameters
    const params = new URLSearchParams({
      q: text,
      langpair: `${MY_MEMORY_LANGUAGE_MAP[sourceLang]}|${MY_MEMORY_LANGUAGE_MAP[targetLang]}`,
      de: 'caretrek@example.com' // Required for MyMemory API (use your email)
    });

    const response = await fetch(`${MY_MEMORY_API}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Translation API error:', response.statusText);
      return text;
    }

    const data = await response.json();
    
    // Check if we got a valid response
    if (!data || !data.responseData) {
      console.error('Invalid translation response:', data);
      return text;
    }

    const translatedText = data.responseData.translatedText || text;
    
    // Cache the translation
    if (translatedText !== text) {
      translationCache[cacheKey] = translatedText;
    }
    
    return translatedText;
  } catch (error) {
    console.error('Translation request failed:', error);
    return text; // Return original text on error
  }
};

/**
 * Save user's language preference
 */
export const saveLanguagePreference = async (lang: LanguageCode): Promise<void> => {
  try {
    await AsyncStorage.setItem('userLanguage', lang);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

/**
 * Load user's language preference
 */
export const loadLanguagePreference = async (): Promise<LanguageCode> => {
  try {
    const savedLang = await AsyncStorage.getItem('userLanguage') as LanguageCode | null;
    return savedLang || 'en';
  } catch (error) {
    console.error('Error loading language preference:', error);
    return 'en';
  }
};

/**
 * Get all available languages
 */
export const getAvailableLanguages = () => {
  return Object.entries(LANGUAGES).map(([code, { name, nativeName }]) => ({
    code: code as LanguageCode,
    name,
    nativeName,
  }));
};
