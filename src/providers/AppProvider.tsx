// src/providers/AppProvider.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider, useTheme } from '../contexts/theme/ThemeContext';
import { TranslationProvider } from '../contexts/translation/TranslationContext';
import * as Font from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';

type AppProviderProps = {
  children: React.ReactNode;
};

const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <TranslationProvider>{children}</TranslationProvider>;
};

const FontLoadingFallback = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Inter-Regular': Inter_400Regular,
          'Inter-Medium': Inter_500Medium,
          'Inter-SemiBold': Inter_600SemiBold,
          'Inter-Bold': Inter_700Bold,
          'SpaceMono-Regular': SpaceMono_400Regular,
        });
      } catch (error) {
        console.warn('Error loading fonts:', error);
      } finally {
        // Always set fonts as loaded, even if there was an error
        setFontsLoaded(true);
      }
    };

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return <FontLoadingFallback />;
  }

  return (
    <ThemeProvider>
      <AppContent>{children}</AppContent>
    </ThemeProvider>
  );
};