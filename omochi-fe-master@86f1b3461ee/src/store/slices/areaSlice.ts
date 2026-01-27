import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AreasState, Prefecture } from "@/types/areas";

const initialState: AreasState = {
  prefectures: [],
  loading: false,
};

const areasSlice = createSlice({
  name: "areas",
  initialState,
  reducers: {
    setPrefectures: (state, action: PayloadAction<Prefecture[]>) => {
      state.prefectures = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setPrefectures, setLoading } = areasSlice.actions;

export default areasSlice.reducer;
