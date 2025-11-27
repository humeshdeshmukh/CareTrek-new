// src/store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { signIn, signUp, signOut, checkSession } from './authActions';

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

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

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
    // Check Session
    builder.addCase(checkSession.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(checkSession.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.loading = false;
    });
    builder.addCase(checkSession.rejected, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
    });

    // Sign Up
    builder.addCase(signUp.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signUp.fulfilled, (state, action) => {
      // Check if email confirmation is required
      // If so, do NOT mark user as authenticated
      const requiresConfirmation = (action.payload as any)?.requiresConfirmation;

      if (requiresConfirmation) {
        // Email verification required - don't log the user in
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      } else {
        // Normal signup without email verification
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      }
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