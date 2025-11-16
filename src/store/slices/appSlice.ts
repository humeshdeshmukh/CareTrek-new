// src/store/slices/appSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '../store';

interface AppState {
  isAppInitialized: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AppState = {
  isAppInitialized: false,
  loading: false,
  error: null,
};

export const loadInitialData = createAsyncThunk(
  'app/loadInitialData',
  async (_, { dispatch }) => {
    try {
      // Add any initial data loading logic here
      // For example:
      // const data = await someApiCall();
      // dispatch(someAction(data));
      
      // Add a small delay to ensure UI has time to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // No need to return anything, we'll handle state in the reducers
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // We'll handle the error in the rejected case
      throw error;
    }
  },
  {
    condition: (_, { getState }) => {
      const { app } = getState() as { app: AppState };
      // Don't run if we're already initialized
      return !app.isAppInitialized;
    },
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setAppInitialized: (state, action: PayloadAction<boolean>) => {
      state.isAppInitialized = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadInitialData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadInitialData.fulfilled, (state) => {
        state.loading = false;
        state.isAppInitialized = true;
        state.error = null;
      })
      .addCase(loadInitialData.rejected, (state, action) => {
        state.loading = false;
        state.isAppInitialized = true; // Ensure we don't get stuck in loading state
        state.error = action.error.message || 'Failed to load initial data';
      });
  },
});

export const { setAppInitialized } = appSlice.actions;
export default appSlice.reducer;