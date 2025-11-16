import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'caretrek_theme_preference';

export const resetThemeToLight = async () => {
  try {
    // For web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    
    // For mobile - save the preference
    await SecureStore.setItemAsync(THEME_KEY, 'light');
    
    // Force reload to apply theme changes on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting theme:', error);
    return false;
  }
};
