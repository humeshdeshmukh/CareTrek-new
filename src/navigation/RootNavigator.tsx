import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/theme/ThemeContext';

// Import auth screens and navigator
import { AuthNavigator } from './AuthNavigator';
import FamilySignInScreen from '../screens/auth/FamilySignInScreen';
import SeniorAuthScreen from '../screens/auth/SeniorAuthScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';

// Import initial flow screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LanguageScreen from '../screens/LanguageScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';

// Import main app screens
import SeniorDashboard from '../screens/Senior/HomeScreen';
import HealthScreen from '../screens/Senior/HealthScreen';
import MapScreen from '../screens/Senior/MapScreen';
import RemindersScreen from '../screens/Senior/RemindersScreen';
import IdShareScreen from '../screens/Senior/IdShareScreen';
import SOSContactsScreen from '../screens/Senior/SOSContactsScreen';

// Import family screens
import HomeScreenFamily from '../screens/family/HomeScreenFamily';
import AddSeniorScreen from '../screens/family/AddSeniorScreen';
import SeniorDetailScreen from '../screens/family/SeniorDetailScreen';
import AlertsScreen from '../screens/family/AlertsScreen';
import FamilySettingsScreen from '../screens/family/FamilySettingsScreen';
import SeniorsListScreen from '../screens/family/SeniorsListScreen';
import HomeLocationScreen from '../screens/Senior/HomeLocationScreen';

// Import navigators
import FamilyNavigator from './FamilyNavigator';
import { SeniorTabs } from './SeniorTabs';

export type RootStackParamList = {
  // Auth Stack
  Auth: {
    screen: keyof AuthStackParamList;
    params?: any;
  };
  // Role selection screen
  RoleSelection: undefined;
  FamilySignIn: { email?: string };
  SeniorAuth: { role?: UserRole };
  SignIn: { role?: UserRole };
  SeniorTabs: undefined;
  SignUp: { role?: UserRole };
  ForgotPassword: undefined;
  OTPVerification: { 
    phoneNumber: string;
    verificationId: string;
    role: UserRole;
    isSignUp?: boolean;
  };
  Emergency: { role: UserRole };
  
  // Initial flow
  Welcome: undefined;
  Language: undefined;
  Onboarding: undefined;
  
  // Main App
  Main: undefined;
  
  // Family Stack
  FamilyNavigator: undefined;
  HomeScreenFamily: undefined;
  
  // Shared Screens
  HealthHistory: { seniorId?: string };
  MedicationReminder: undefined;
  ActivityTracker: undefined;
  Settings: undefined;
  Messages: { recipientId: string };
  TrackSenior: { seniorId: string };
  AddSenior: undefined;
  HomeLocationScreen: undefined;
  ScanQRCode: undefined;
  AddFamilyMember: undefined;
  ConnectSenior: undefined;
  
  // Family Screens
  SeniorDetail: { seniorId: string };
  SeniorsList: undefined;
  Alerts: undefined;
  FamilySettings: undefined;
  
  // Id Share Screen
  IdShare: undefined;
  Reminders: undefined;
  SOSContacts: undefined;
  Health: undefined;
  HealthScreen: undefined;
  RemindersScreen: undefined;
  MapScreen: undefined;
  IdShareScreen: undefined;
  Appointments: undefined;
  Map: undefined;
  HomeLocation: undefined;
};

// Import AuthStackParamList from types
import { AuthStackParamList, UserRole } from './types';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { colors, isDark } = useTheme();

  return (
          <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: isDark ? '#1A202C' : '#FFFFFF' },
        }}
      >
        {/* Initial screens */}
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Language" 
          component={LanguageScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        
        {/* Role Selection Screen */}
        <Stack.Screen 
          name="RoleSelection" 
          component={RoleSelectionScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        
        {/* Auth Stack */}
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator}
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        
        {/* Individual auth screens (kept for direct navigation if needed) */}
        <Stack.Screen 
          name="FamilySignIn" 
          component={FamilySignInScreen}
          options={{
            title: 'Family Member Sign In',
            headerShown: true,
            headerTintColor: isDark ? '#E2E8F0' : '#1A202C',
          }}
        />
        
        <Stack.Screen 
          name="SeniorAuth" 
          component={SeniorAuthScreen}
          options={{
            title: 'Senior',
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: isDark ? '#E2E8F0' : '#1A202C',
          }}
        />
        
        <Stack.Screen 
          name="OTPVerification" 
          component={OTPVerificationScreen}
          options={{
            title: 'Verify Phone',
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: isDark ? '#E2E8F0' : '#1A202C',
          }}
        />

        {/* Map Screen */}
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="HomeLocation"
          component={HomeLocationScreen}
          options={{ title: 'Set Home Location' }}
        />

        {/* IdShare Screen */}
        <Stack.Screen
          name="IdShareScreen"
          component={IdShareScreen}
          options={{
            headerShown: false
          }}
        />

        {/* Health Screen */}
        <Stack.Screen
          name="Health"
          component={HealthScreen}
          options={{
            headerShown: false
          }}
        />

        {/* Appointments Screen */}
        <Stack.Screen
          name="Appointments"
          component={require('../screens/Senior/AppointmentScreen').default}
          options={{
            headerShown: false
          }}
        />
        
        {/* Sign Up Screen */}
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen}
          options={{
            title: 'Create Account',
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: isDark ? '#E2E8F0' : '#1A202C',
          }}
        />
        
        {/* Sign In Screen - Using FamilySignInScreen as the main sign-in screen */}
        <Stack.Screen 
          name="SignIn" 
          component={FamilySignInScreen}
          options={{
            title: 'Sign In',
            headerShown: true,
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: isDark ? '#E2E8F0' : '#1A202C',
          }}
        />
        
        {/* SOSContacts Screen */}
        <Stack.Screen name="SOSContacts" component={SOSContactsScreen} />
      
      {/* Senior Tabs Navigator */}
      <Stack.Screen 
        name="SeniorTabs" 
        component={SeniorTabs}
        options={{ 
          headerShown: false,
          gestureEnabled: false 
        }}
      />
      
      {/* Family Navigator */}
      <Stack.Screen 
        name="FamilyNavigator" 
        component={FamilyNavigator}
        options={{ headerShown: false }}
      />
      
      {/* Settings Screen */}
      <Stack.Screen 
        name="Settings" 
        component={require('../screens/family/FamilySettingsScreen').default}
        options={{ 
          title: 'Settings',
          headerShown: true,
          headerStyle: {
            backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: isDark ? '#E2E8F0' : '#1A202C',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      
      {/* Individual Family Screens - These can be navigated to directly */}
      <Stack.Screen 
        name="HomeScreenFamily" 
        component={HomeScreenFamily} 
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="IdShare" 
        component={IdShareScreen}
        options={{ 
          headerShown: false
        }}
      />
      
      <Stack.Screen 
        name="ConnectSenior" 
        component={AddSeniorScreen}
        options={{
          headerShown: true,
          title: 'Add Senior'
        }}
      />
      
      <Stack.Screen 
        name="SeniorDetail" 
        component={SeniorDetailScreen}
        options={{
          headerShown: true,
          title: 'Senior Details'
        }}
      />
      
      <Stack.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{
          headerShown: true,
          title: 'Alerts'
        }}
      />
      
      <Stack.Screen 
        name="FamilySettings" 
        component={FamilySettingsScreen}
        options={{
          headerShown: true,
          title: 'Settings'
        }}
      />
      
      <Stack.Screen 
        name="TrackSenior" 
        component={MapScreen} // Using MapScreen for tracking
        options={{
          headerShown: true,
          title: 'Track Senior',
          headerBackTitle: 'Back',
          headerTintColor: isDark ? '#FFFFFF' : '#2D3748',
          headerStyle: {
            backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
    );
};

export default RootNavigator;
