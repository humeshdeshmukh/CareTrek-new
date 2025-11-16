// Simplified babel configuration for Firebase database only
module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            // Add your path aliases here if needed
          },
        },
      ],
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: false,
          allowUndefined: true,
          allowlist: [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'EXPO_PUBLIC_SUPABASE_URL',
            'EXPO_PUBLIC_SUPABASE_ANON_KEY'
          ],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};