// This file contains environment-specific configuration
// For production, use app.config.js to set these values

import Constants from 'expo-constants';

// Get the manifest extra config
export const ENV = {
  // Development environment variables (defaults)
  GOOGLE_TRANSLATE_API_KEY: '',
  ...(Constants.expoConfig?.extra || {})
};

// Validate required environment variables
if (!ENV.GOOGLE_TRANSLATE_API_KEY && !__DEV__) {
  console.warn('Google Cloud Translation API key is not set. Translations will not work.');
}
