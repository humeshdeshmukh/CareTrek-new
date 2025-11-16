import React, { createContext, useContext, useState } from 'react';

type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
};

const MockAuthContext = createContext<AuthContextType | undefined>(undefined);

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({
    uid: 'mock-user-id',
    email: 'guest@caretrek.app',
    displayName: 'Guest User',
    isGuest: true
  });
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser({
      uid: 'mock-user-id',
      email,
      displayName: email.split('@')[0],
      isGuest: false
    });
    setLoading(false);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser({
      uid: 'mock-user-id',
      email,
      displayName,
      isGuest: false
    });
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    // Simulate sign out
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    setLoading(false);
  };

  return (
    <MockAuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        signUp,
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(MockAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
