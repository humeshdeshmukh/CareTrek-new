// App.tsx
import React, { useEffect, useState } from 'react';
import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';
import { ThemeProvider, useTheme } from './src/contexts/theme/ThemeContext';
import { TranslationProvider } from './src/contexts/translation/TranslationContext';
import { AuthProvider } from './src/contexts/auth/AuthContext';
import { View, StyleSheet, ActivityIndicator, StatusBar as RNStatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { navigationRef, resetNavigation } from './src/services/navigation';
import linking from './src/navigation/linking';
import ErrorBoundary, { DefaultFallback } from './src/components/ErrorBoundary';
import type { RootStackParamList } from './src/navigation/RootNavigator';
import { useAppSelector } from './src/store/hooks';
import RootNavigator from './src/navigation/RootNavigator';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const App: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    if (isNavigationReady && !loading) {
      // Only navigate to authenticated screens if user is authenticated AND has valid data
      if (isAuthenticated && user && user.id && user.role) {
        if (user.role === 'senior') {
          resetNavigation('SeniorTabs');
        } else if (user.role === 'family') {
          resetNavigation('FamilyNavigator');
        }
      } else {
        // For unauthenticated users, start with Welcome screen
        // The flow is: Welcome -> Language -> Onboarding -> RoleSelection -> Auth
        resetNavigation('Welcome');
      }
    }
  }, [isAuthenticated, user, loading, isNavigationReady]);

  if (loading && !isNavigationReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ErrorBoundary FallbackComponent={DefaultFallback}>
        <NavigationContainer
          ref={navigationRef as React.Ref<NavigationContainerRef<RootStackParamList>>}
          onReady={() => setIsNavigationReady(true)}
          linking={linking}
          fallback={
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          }
        >
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </View>
  );
};

export default function AppWrapper() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Clear persisted auth state on app startup to ensure clean slate
    // This prevents stale user data from being loaded
    const clearPersistedAuth = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        // Clear the persisted root state which includes auth
        await AsyncStorage.removeItem('persist:root');
        setIsReady(true);
      } catch (error) {
        console.error('Error clearing persisted state:', error);
        setIsReady(true);
      }
    };

    clearPersistedAuth();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary FallbackComponent={DefaultFallback}>
      <ReduxProvider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider initialMetrics={initialWindowMetrics}>
              <AuthProvider>
                <ThemeProvider>
                  <TranslationProvider>
                    <App />
                  </TranslationProvider>
                </ThemeProvider>
              </AuthProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </PersistGate>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
