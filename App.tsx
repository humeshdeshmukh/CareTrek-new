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
import { permissionService } from './src/services/permissionService';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const App: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleError = (error: any) => {
      console.error('[App] Unhandled error:', error);
    };

    const handlePromiseRejection = (reason: any) => {
      console.error('[App] Unhandled promise rejection:', reason);
    };

    // Listen for unhandled errors
    const errorListener = require('react-native').AppState.addEventListener?.('memoryWarning', handleError);
    
    return () => {
      if (errorListener?.remove) {
        errorListener.remove();
      }
    };
  }, []);

  useEffect(() => {
    try {
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
    } catch (err) {
      console.error('[App] Navigation error:', err);
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
    // Initialize app - request permissions and prepare
    const initializeApp = async () => {
      try {
        // Request necessary permissions on app startup
        await permissionService.requestAllPermissions();
        
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsReady(true);
      }
    };

    initializeApp();
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
