// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackNavigationOptions } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import SeniorAuthScreen from '../screens/auth/SeniorAuthScreen';
import FamilySignInScreen from '../screens/auth/FamilySignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SeniorHomeScreen from '../screens/senior/SeniorHomeScreen';
import FamilyHomeScreen from '../screens/family/FamilyHomeScreen';
import UnauthorizedScreen from '../screens/UnauthorizedScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Define the parameter list for the auth stack
type AuthStackParamList = {
  SignIn: { role?: 'senior' | 'family' };
  SignUp: {
    role: 'senior' | 'family';
    email?: string;
    name?: string;
    phoneNumber?: string;
    onSuccess?: () => void;
  };
  ForgotPassword: { email?: string };
  FamilyAuth: { role?: 'family' };
  SeniorAuth: { role?: 'senior' };
};

// Define the parameter list for the root stack
export type RootStackParamList = {
  // Auth Flow
  Splash: undefined;
  Onboarding: undefined;
  RoleSelection: undefined;
  SeniorAuth: { role?: 'senior' };
  FamilySignIn: { email?: string };
  SignUp: {
    role: 'senior' | 'family';
    email?: string;
    name?: string;
    phoneNumber?: string;
    onSuccess?: () => void;
  };
  ForgotPassword: { email?: string };
  
  // Main App
  SeniorHome: undefined;
  FamilyHome: undefined;
  
  // Common
  Unauthorized: undefined;
  Auth: {
    screen: keyof AuthStackParamList;
    params?: AuthStackParamList[keyof AuthStackParamList];
  };
  
  // Add index signature to allow any string key
  [key: string]: object | undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Navigation options for the auth flow screens
const authScreenOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: '#fff' },
  animationEnabled: true,
};

const AppNavigator = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={authScreenOptions}>
        {isAuthenticated ? (
          // Authenticated user flow
          user?.role === 'senior' ? (
            <Stack.Screen 
              name="SeniorHome" 
              component={SeniorHomeScreen} 
              options={{ headerShown: false }}
            />
          ) : (
            <Stack.Screen 
              name="FamilyHome" 
              component={FamilyHomeScreen} 
              options={{ headerShown: false }}
            />
          )
        ) : (
          // Unauthenticated user flow
          <>
            <Stack.Screen 
              name="Onboarding" 
              component={OnboardingScreen} 
            />
            <Stack.Screen 
              name="RoleSelection" 
              component={RoleSelectionScreen} 
            />
            <Stack.Screen 
              name="SeniorAuth" 
              component={SeniorAuthScreen}
              initialParams={{ role: 'senior' }}
            />
            <Stack.Screen 
              name="FamilySignIn" 
              component={FamilySignInScreen}
              options={{ title: 'Family Sign In' }}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={{
                ...authScreenOptions,
                title: 'Create Account',
                headerShown: true,
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPasswordScreen}
              options={{
                ...authScreenOptions,
                title: 'Reset Password',
                headerShown: true,
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Unauthorized" 
              component={UnauthorizedScreen} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;