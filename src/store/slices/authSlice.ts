// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'family' | 'senior' | null;

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  token: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface Credentials {
  email: string;
  password: string;
  displayName?: string;
  role: UserRole;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

// Mock user database
const mockUsers: Record<string, User> = {};

// Mock authentication service
const authService = {
  async signUp(email: string, password: string, displayName: string, role: UserRole): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (mockUsers[email]) {
      throw new Error('User already exists');
    }

    const user: User = {
      id: `user_${Date.now()}`,
      email,
      displayName,
      role,
      token: `token_${Math.random().toString(36).substr(2, 9)}`,
    };

    mockUsers[email] = user;
    await AsyncStorage.setItem('@user', JSON.stringify(user));
    return user;
  },

  async signIn(email: string, password: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers[email];
    if (!user) {
      throw new Error('User not found');
    }

    await AsyncStorage.setItem('@user', JSON.stringify(user));
    return user;
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem('@user');
  },

  async getCurrentUser(): Promise<User | null> {
    const userJson = await AsyncStorage.getItem('@user');
    return userJson ? JSON.parse(userJson) : null;
  },
};

// Async thunks
export const initializeAuth = createAsyncThunk('auth/initialize', async () => {
  return await authService.getCurrentUser();
});

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, displayName, role }: Required<Credentials>) => {
    return await authService.signUp(email, password, displayName, role);
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: Credentials) => {
    return await authService.signIn(email, password);
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await authService.signOut();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Initialize Auth
    builder.addCase(initializeAuth.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(initializeAuth.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.loading = false;
    });
    builder.addCase(initializeAuth.rejected, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
    });

    // Sign Up
    builder.addCase(signUp.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signUp.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
    });
    builder.addCase(signUp.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Sign up failed';
    });

    // Sign In
    builder.addCase(signIn.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signIn.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
    });
    builder.addCase(signIn.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Invalid credentials';
    });

    // Sign Out
    builder.addCase(signOut.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });
  },
});

export const { setUser, clearError, setLoading } = authSlice.actions;
export default authSlice.reducer;