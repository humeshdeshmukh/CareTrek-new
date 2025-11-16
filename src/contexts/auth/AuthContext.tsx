import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

// Define user roles
export type UserRole = 'senior' | 'family' | 'guest';

// Extend the User type from Supabase
interface AppUser extends User {
  id: string;
  role: UserRole;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

// Auth context type
interface AuthContextType {
  user: AppUser | null;
  userRole: UserRole | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<{ user: AppUser | null; session: Session | null }>;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<{ user: AppUser | null; session: Session | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phoneNumber: string, token: string) => Promise<{ session: Session | null; user: AppUser | null; error: Error | null }>;
  guestSignIn: () => Promise<void>;
  checkAuthState: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check authentication state
  const checkAuthState = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { 
        data: { session: currentSession }, 
        error: sessionError 
      } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      if (currentSession?.user) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (userError) throw userError;

        setUser(prevUser => {
          const newUser = {
            ...currentSession.user,
            role: userData?.role || 'guest',
            displayName: userData?.display_name || null,
            phoneNumber: userData?.phone_number || null,
            photoURL: userData?.avatar_url || null,
            isAnonymous: false,
          } as AppUser;

          return JSON.stringify(prevUser) === JSON.stringify(newUser) 
            ? prevUser 
            : newUser;
        });
        
        setSession(prevSession => 
          JSON.stringify(prevSession) === JSON.stringify(currentSession) 
            ? prevSession 
            : currentSession
        );
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    let mounted = true;
    
    // Initial check
    checkAuthState().finally(() => {
      if (mounted) {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        try {
          setIsLoading(true);
          
          if (currentSession?.user) {
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentSession.user.id)
              .single();

            if (!userError && userData) {
              // Only update if the user data has actually changed
              setUser(prevUser => {
                const newUser = {
                  ...currentSession.user,
                  role: userData.role || 'guest',
                  displayName: userData.display_name || null,
                  phoneNumber: userData.phone_number || null,
                  photoURL: userData.avatar_url || null,
                  isAnonymous: false,
                } as AppUser;

                // Only update if the user data has changed
                if (JSON.stringify(prevUser) !== JSON.stringify(newUser)) {
                  return newUser;
                }
                return prevUser;
              });
              
              setSession(prevSession => 
                JSON.stringify(prevSession) === JSON.stringify(currentSession) 
                  ? prevSession 
                  : currentSession
              );
            }
          } else {
            setUser(null);
            setSession(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session?.user) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) throw userError;

        const user = {
          ...data.user,
          role: userData.role,
          displayName: userData.display_name,
          phoneNumber: userData.phone_number,
          photoURL: userData.avatar_url,
          isAnonymous: false,
        } as AppUser;

        setUser(user);
        setSession(data.session);
        return { user, session: data.session };
      }

      return { user: null, session: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName: string, role: UserRole) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile in the database
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              display_name: displayName,
              role,
              created_at: new Date().toISOString(),
            },
          ]);

        if (profileError) throw profileError;

        const user = {
          ...data.user,
          role,
          displayName,
          phoneNumber: null,
          photoURL: null,
          isAnonymous: false,
        } as AppUser;

        setUser(user);
        return { user, session: data.session };
      }

      return { user: null, session: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign up';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      router.replace('/welcome');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      setError(errorMessage);
      return { error: new Error(errorMessage) };
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setIsLoading(true);
      setError(null);

      const updatesToApply: {
        display_name?: string;
        avatar_url?: string;
        updated_at: string;
      } = {
        updated_at: new Date().toISOString(),
      };

      if (updates.displayName) updatesToApply.display_name = updates.displayName;
      if (updates.photoURL) updatesToApply.avatar_url = updates.photoURL;

      const { error } = await supabase
        .from('profiles')
        .update(updatesToApply)
        .eq('id', user.id);

      if (error) throw error;

      // Update local user state
      setUser({
        ...user,
        displayName: updates.displayName || user.displayName,
        photoURL: updates.photoURL || user.photoURL,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in with phone number (OTP)
  const signInWithPhone = async (phoneNumber: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
      setError(errorMessage);
      return { error: new Error(errorMessage) };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const verifyOtp = async (phoneNumber: string, token: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token,
        type: 'sms',
      });

      if (error) throw error;

      if (data.session?.user && data.user) {
        // Check if user exists in profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // If no profile exists, create one
        if (profileError || !profileData) {
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                phone_number: phoneNumber,
                role: 'senior', // Default role for phone sign-in
                created_at: new Date().toISOString(),
              },
            ]);

          if (createProfileError) throw createProfileError;
        }

        const user = {
          ...data.user,
          role: profileData?.role || 'senior',
          displayName: profileData?.display_name || null,
          phoneNumber: phoneNumber,
          photoURL: profileData?.avatar_url || null,
          isAnonymous: false,
        } as AppUser;

        setUser(user);
        setSession(data.session);
        return { user, session: data.session, error: null };
      }

      return { user: null, session: null, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
      setError(errorMessage);
      return { user: null, session: null, error: new Error(errorMessage) };
    } finally {
      setIsLoading(false);
    }
  };

  // Guest sign in
  const guestSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create an anonymous user
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      if (data.user) {
        const guestUser = {
          ...data.user,
          role: 'guest' as UserRole,
          displayName: 'Guest User',
          phoneNumber: null,
          photoURL: null,
          isAnonymous: true,
        } as AppUser;

        setUser(guestUser);
        setSession(data.session);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in as guest';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete user account
  const deleteAccount = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('No user is currently signed in');
      }

      // Delete user data from the database first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Then delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) {
        throw authError;
      }

      // Sign out the user
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    userRole: user?.role || null,
    session,
    isLoading,
    error,
    role: user?.role || null,
    isAuthenticated: !!user && !user.isAnonymous,
    isGuest: user?.isAnonymous || false,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    resetPassword,
    updateProfile,
    signInWithPhone,
    verifyOtp,
    guestSignIn,
    checkAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;