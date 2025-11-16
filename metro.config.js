// Get the default Metro config for Expo projects
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default configuration
const config = getDefaultConfig(__dirname);
const { resolver } = config;
const { sourceExts } = resolver;

// Update the resolver configuration
config.resolver = {
  ...resolver,
  sourceExts: [...sourceExts, 'mjs', 'cjs']
};

// Ensure we're watching the necessary directories
config.watchFolders = [
  ...new Set([
    ...(config.watchFolders || []),
    path.resolve(__dirname, './')
  ])
];

// Disable minification for better debugging
config.transformer.minifierConfig = {
  ...(config.transformer.minifierConfig || {}),
  compress: {
    ...(config.transformer.minifierConfig?.compress || {}),
    drop_console: false,
  },
};

module.exports = config;