import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  isAuthLoading: boolean;
}

const initialState: UIState = {
  isAuthLoading: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isAuthLoading = action.payload;
    },
  },
});

export const { setAuthLoading } = uiSlice.actions;
export default uiSlice.reducer;
