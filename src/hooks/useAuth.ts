import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signIn, signUp, signOut as signOutAction, checkSession } from '../store/slices/authActions';
import { UserRole } from '../store/slices/authSlice';
import { supabase } from '../lib/supabase';

type RootStackParamList = {
  Auth: undefined;
  Family: undefined;
  Senior: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Welcome: undefined;
  SeniorTabs: undefined;
  FamilyNavigator: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const user = useAppSelector((state) => state.auth.user);
  const loading = useAppSelector((state) => state.auth.loading);
  const error = useAppSelector((state) => state.auth.error);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  // Check user session on mount
  const checkUserSession = async () => {
    try {
      await dispatch(checkSession()).unwrap();
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  // Sign in with email and password
  const signInUser = async (email: string, password: string, userRole: UserRole) => {
    try {
      const result = await dispatch(signIn({ email, password, role: userRole })).unwrap();
      return { user: result, error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { user: null, error: error.message || 'Failed to sign in' };
    }
  };

  // Sign up with email and password
  const signUpUser = async (email: string, password: string, displayName: string, userRole: UserRole) => {
    try {
      const result = await dispatch(signUp({ email, password, displayName, role: userRole })).unwrap();
      return { user: result, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { user: null, error: error.message || 'Failed to sign up' };
    }
  };

  // Sign out
  const signOutUser = async () => {
    try {
      await dispatch(signOutAction()).unwrap();
      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { error: error.message || 'Failed to sign out' };
    }
  };

  // Send password reset email
  const sendPasswordResetEmail = async (email: string) => {
    try {
      console.log('Sending password reset email to:', email);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { error: null };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { error: error.message || 'Failed to send password reset email' };
    }
  };

  // Update user profile
  const updateProfile = async (updates: any) => {
    try {
      if (!user) {
        throw new Error('No user is logged in');
      }
      
      // In a real app, this would update the user's profile in your backend
      console.log('Updating profile with:', updates);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return updated user data
      const updatedUser = { ...user, ...updates };
      return { user: updatedUser, error: null };
    } catch (error: any) {
      console.error('Profile update error:', error);
      return { user: null, error: error.message || 'Failed to update profile' };
    }
  };

  return {
    user,
    role: user?.role || null,
    isAuthenticated,
    loading,
    error,
    signIn: signInUser,
    signUp: signUpUser,
    signOut: signOutUser,
    sendPasswordResetEmail,
    updateProfile,
    checkSession: checkUserSession,
  };
};

