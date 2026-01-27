import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Order } from '../../generated/api/api';
import { Reservation } from '../../generated/api/api';

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  mergedOrders: (Order | Reservation)[];
}

const initialState: OrderState = {
  orders: [],
  loading: false,
  error: null,
  mergedOrders: []
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setMergedOrders: (state, action: PayloadAction<(Order | Reservation)[]>) => {
      state.mergedOrders = action.payload;
    }
  }
});

export const {
  setOrders,
  setLoading,
  setError,
  setMergedOrders
} = orderSlice.actions;

export default orderSlice.reducer;
