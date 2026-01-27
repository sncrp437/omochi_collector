import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Reservation } from '../../generated/api/api';

interface ReservationState {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
}

const initialState: ReservationState = {
  reservations: [],
  loading: false,
  error: null
};

const reservationSlice = createSlice({
  name: 'reservation',
  initialState,
  reducers: {
    setReservations: (state, action: PayloadAction<Reservation[]>) => {
      state.reservations = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const {
  setReservations,
  setLoading,
  setError
} = reservationSlice.actions;

export default reservationSlice.reducer;
