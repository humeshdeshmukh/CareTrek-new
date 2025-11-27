import { createAsyncThunk } from '@reduxjs/toolkit';
import { UserRole } from './authSlice';
import { supabase } from '../../lib/supabase';

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password, role }: { email: string; password: string; role: UserRole }, { rejectWithValue }) => {
    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if error is related to email confirmation
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          return rejectWithValue('Please verify your email address before signing in. Check your inbox for the verification link.');
        }
        return rejectWithValue(error.message || 'Failed to sign in');
      }

      if (!data.user) {
        return rejectWithValue('No user data returned from Supabase');
      }

      // Additional check: verify email is confirmed
      if (!data.user.email_confirmed_at && data.user.confirmed_at === null) {
        return rejectWithValue('Please verify your email address before signing in. Check your inbox for the verification link.');
      }

      // Get user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.warn('Could not fetch profile:', profileError);
      }

      const user = {
        id: data.user.id, // Use actual Supabase user ID
        email: data.user.email || email,
        displayName: profileData?.display_name || email.split('@')[0],
        role: (profileData?.role as UserRole) || role,
        token: data.session?.access_token || '',
      };

      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign in');
    }
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async (
    { email, password, displayName, role }:
      { email: string; password: string; displayName: string; role: UserRole },
    { rejectWithValue }
  ) => {
    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            role: role,
          },
        },
      });

      if (error) {
        return rejectWithValue(error.message || 'Failed to sign up');
      }

      if (!data.user) {
        return rejectWithValue('No user data returned from Supabase');
      }

      // Try to create user profile in database
      // Note: This may fail due to RLS policies, which is OK
      // The profile will be created after email verification via database trigger or manually
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            display_name: displayName,
            role: role,
            email: email,
          },
        ]);

      if (profileError) {
        // This is expected if RLS policies require email confirmation
        // Log it but don't fail the signup
        console.log('Profile will be created after email verification:', profileError.message);
      }

      // Check if email confirmation is required
      // If session is null, it means email confirmation is required
      const requiresEmailConfirmation = !data.session;

      // Return a special object indicating email confirmation is needed
      // We return this as a "successful" result, not a rejection
      if (requiresEmailConfirmation) {
        return {
          id: data.user.id,
          email: data.user.email || email,
          displayName,
          role,
          token: '',
          requiresConfirmation: true,
          message: 'Please check your email to verify your account before signing in.',
        } as any;
      }

      const user = {
        id: data.user.id,
        email: data.user.email || email,
        displayName,
        role,
        token: data.session?.access_token || '',
      };

      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign up');
    }
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  // Clear token from AsyncStorage in a real app
  // await AsyncStorage.removeItem('userToken');
  return null;
});

export const checkSession = createAsyncThunk('auth/checkSession', async () => {
  // In a real app, check for existing session/token
  // const token = await AsyncStorage.getItem('userToken');
  // if (!token) return null;

  // Verify token and get user data
  // ...

  // For now, return null to simulate no active session
  return null;
});
