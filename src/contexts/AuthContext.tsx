import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

// User type
type UserRole = 'family' | 'senior' | null;

type User = {
  id: string;
  uid?: string; // Make uid optional for backward compatibility
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  role: UserRole;
  isAnonymous?: boolean;
  photoURL?: string | null;
  phoneNumber?: string | null;
} | null;

// Auth context type
type SignInResult = {
  user: User;
  session: Session | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, role: UserRole) => Promise<SignInResult>;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: { displayName?: string; photoURL?: string | null }) => Promise<void>;
  reloadUser: () => Promise<User | null>;
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
};

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check user session on mount
  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            uid: session.user.id, // Map id to uid for compatibility
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || null,
            emailVerified: session.user.confirmed_at !== null,
            photoURL: session.user.user_metadata?.avatar_url || null,
            phoneNumber: session.user.phone || null,
            role: role, // Include the role from state
          });
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            uid: session.user.id, // Map id to uid for compatibility
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || null,
            emailVerified: session.user.confirmed_at !== null,
            photoURL: session.user.user_metadata?.avatar_url || null,
            phoneNumber: session.user.phone || null,
            role: role, // Include the role from state
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, userRole: UserRole): Promise<SignInResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const userData: User = {
          id: data.user.id,
          uid: data.user.id, // Map id to uid for compatibility
          email: data.user.email || null,
          displayName: data.user.user_metadata?.full_name || null,
          emailVerified: data.user.confirmed_at !== null,
          photoURL: data.user.user_metadata?.avatar_url || null,
          phoneNumber: data.user.phone || null,
          role: userRole,
        };
        
        setUser(userData);
        setRole(userRole);
        
        return { 
          user: userData, 
          session: data.session 
        };
      }
      
      throw new Error('No user data returned from sign in');
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string, userRole: UserRole): Promise<SignInResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
            role: userRole,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const userData: User = {
          id: data.user.id,
          uid: data.user.id, // Map id to uid for compatibility
          email: data.user.email || null,
          displayName,
          emailVerified: data.user.confirmed_at !== null,
          photoURL: data.user.user_metadata?.avatar_url || null,
          phoneNumber: data.user.phone || null,
          role: userRole,
        };
        
        setUser(userData);
        setRole(userRole);
        
        return { 
          user: userData, 
          session: data.session 
        };
      }
      
      throw new Error('No user data returned from sign up');
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const deleteAccount = async (): Promise<void> => {
    try {
      setLoading(true);
      
      if (!user) throw new Error('No user is signed in');
      
      // Call the Supabase function to delete the user
      const { error } = await supabase.functions.invoke('delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (error) {
        console.error('Error deleting account:', error);
        throw new Error(error.message || 'Failed to delete account');
      }
      
      // Sign out the user after successful deletion
      await signOut();
      
      // Clear local state
      setUser(null);
      setRole(null);
      
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  const confirmPasswordReset = async (code: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error confirming password reset:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: { 
    displayName?: string; 
    photoURL?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  }) => {
    try {
      if (!user) throw new Error('No user is signed in');
      
      // Prepare update data for user metadata
      const updateData: any = {};
      
      // Update displayName and photoURL in the user metadata
      if (updates.displayName !== undefined) {
        updateData.displayName = updates.displayName;
      }
      if (updates.photoURL !== undefined) {
        updateData.photoURL = updates.photoURL;
      }
      
      // Update email if provided
      if (updates.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: updates.email
        });
        if (emailError) throw emailError;
      }
      
      // Update phone number if provided - store in user metadata instead of phone auth
      if (updates.phoneNumber !== undefined) {
        // Store phone number in user metadata
        updateData.phoneNumber = updates.phoneNumber;
      }
      
      // Update user metadata
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: updateData
        });
        if (updateError) throw updateError;
      }
      
      // Update local state
      setUser({
        ...user,
        displayName: updates.displayName !== undefined ? updates.displayName : user.displayName,
        email: updates.email || user.email,
        phoneNumber: updates.phoneNumber !== undefined ? updates.phoneNumber : user.phoneNumber,
        ...updateData
      });
      
      // Update the user's profile in the database
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            display_name: updates.displayName !== undefined ? updates.displayName : user.displayName,
            phone_number: updates.phoneNumber !== undefined ? updates.phoneNumber : user.phoneNumber,
            updated_at: new Date().toISOString(),
          });
        
        if (profileError) {
          console.error('Error updating profile in database:', profileError);
          // Continue even if there's an error with the profiles table
        }
      } catch (error) {
        console.error('Error in profile update transaction:', error);
        // Continue even if there's an error
      }
      
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const reloadUser = async (): Promise<User | null> => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (currentUser) {
        const userData: User = {
          id: currentUser.id,
          email: currentUser.email || null,
          displayName: currentUser.user_metadata?.full_name || null,
          emailVerified: currentUser.confirmed_at !== null,
          photoURL: currentUser.user_metadata?.avatar_url || null,
          phoneNumber: currentUser.phone || null,
          role: role || null,
        };
        setUser(userData);
        return userData;
      }
      
      setUser(null);
      return null;
    } catch (error) {
      console.error('Error reloading user:', error);
      throw error;
    }
  };

  // Show loading indicator while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const authContextValue: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    sendPasswordResetEmail,
    confirmPasswordReset,
    updateProfile,
    reloadUser,
    role,
    setRole,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;