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
        return rejectWithValue(error.message || 'Failed to sign in');
      }

      if (!data.user) {
        return rejectWithValue('No user data returned from Supabase');
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
          },
        },
      });

      if (error) {
        return rejectWithValue(error.message || 'Failed to sign up');
      }

      if (!data.user) {
        return rejectWithValue('No user data returned from Supabase');
      }

      // Create user profile in database
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
        console.warn('Could not create profile:', profileError);
      }

      const user = {
        id: data.user.id, // Use actual Supabase user ID
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
