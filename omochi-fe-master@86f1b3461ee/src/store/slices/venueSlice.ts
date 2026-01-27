import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Venue, MenuCategory } from '../../generated/api/api';

interface VenueState {
  venueDetail: Venue | null;
  loading: boolean;
  categories: MenuCategory[];
  error: string | null;
}

const initialState: VenueState = {
  venueDetail: null,
  loading: false,
  error: null,
  categories: []
};

const venueSlice = createSlice({
  name: 'venue',
  initialState,
  reducers: {
    setVenueDetail: (state, action: PayloadAction<Venue>) => {
      state.venueDetail = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    }
  }
});

export const {
  setVenueDetail,
  setLoading,
} = venueSlice.actions;

export default venueSlice.reducer;
