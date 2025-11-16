import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Senior {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'alert';
  lastActive: string;
  avatar: string;
  heartRate: number;
  oxygen: number;
  steps: number;
  battery: number;
  location: string;
  relationship?: string;
  email?: string;
  phone?: string;
}

interface SeniorState {
  activeSenior: Senior | null;
}

const initialState: SeniorState = {
  activeSenior: null,
};

const seniorSlice = createSlice({
  name: 'senior',
  initialState,
  reducers: {
    setActiveSenior: (state, action: PayloadAction<Senior>) => {
      state.activeSenior = action.payload;
    },
    clearActiveSenior: (state) => {
      state.activeSenior = null;
    },
    updateActiveSenior: (state, action: PayloadAction<Partial<Senior>>) => {
      if (state.activeSenior) {
        state.activeSenior = { ...state.activeSenior, ...action.payload };
      }
    },
  },
});

export const { setActiveSenior, clearActiveSenior, updateActiveSenior } = seniorSlice.actions;
export default seniorSlice.reducer;
