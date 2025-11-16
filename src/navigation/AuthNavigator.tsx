import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../contexts/theme/ThemeContext';
import { AuthStackParamList, UserRole } from './types';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import FamilySignInScreen from '../screens/auth/FamilySignInScreen';
import SeniorAuthScreen from '../screens/auth/SeniorAuthScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import EditProfileScreen from '../screens/Senior/EditProfileScreen';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  const { colors, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.text,
        },
        cardStyle: { backgroundColor: colors.background },
      }}
      initialRouteName="Welcome"
    >
      {/* Welcome Screen */}
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />

      {/* Family Auth Flow - Using FamilySignInScreen */}
      <Stack.Screen 
        name="FamilySignIn" 
        component={FamilySignInScreen}
        options={({ navigation }) => ({
          title: 'Family Member',
          headerBackTitle: 'Back',
          headerBackTitleVisible: true,
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
            color: colors.text,
          },
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: colors.primary,
          headerLeft: (props) => (
            <TouchableOpacity 
              onPress={navigation.goBack}
              style={{ marginLeft: 10, padding: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon 
                name="arrow-left" 
                size={24} 
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        })}
      />

      {/* Senior Authentication */}
      <Stack.Screen 
        name="SeniorAuth" 
        component={SeniorAuthScreen}
        options={{ 
          title: 'Senior Sign In',
          headerBackTitle: 'Back',
        }}
      />

      {/* Shared Auth Screens */}
      <Stack.Screen 
        name="SignIn" 
        component={FamilySignInScreen}
        options={{ 
          title: 'Sign In',
          headerBackTitle: 'Back',
          headerShown: true,
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: colors.primary,
        }}
      />

      <Stack.Screen 
        name="SignUp" 
        component={SignUpScreen}
        options={{ 
          title: 'Create Account',
          headerBackTitle: 'Back',
        }}
      />

<Stack.Screen 
        name="OTPVerification" 
        component={OTPVerificationScreen}
        options={{ title: 'Verify OTP' }}
      />

      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />

      {/* Emergency Screen - Accessible from senior auth
      <Stack.Screen 
        name="Emergency" 
        component={EmergencyScreen}
        options={{ 
          title: 'Emergency SOS',
          headerShown: false,
          gestureEnabled: false,
        }} */}
      
    </Stack.Navigator>
  );
};
