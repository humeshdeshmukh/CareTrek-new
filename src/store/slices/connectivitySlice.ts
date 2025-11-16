// src/store/slices/connectivitySlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ConnectivityState {
  isOnline: boolean;
}

const initialState: ConnectivityState = {
  isOnline: true,
};

const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState,
  reducers: {
    onlineStateChanged: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
  },
});

export const { onlineStateChanged } = connectivitySlice.actions;
export default connectivitySlice.reducer;