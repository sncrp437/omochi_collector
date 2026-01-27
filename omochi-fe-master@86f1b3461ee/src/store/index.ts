import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import cartReducer from "./slices/cartSlice";
import orderReducer from "./slices/orderSlice";
import reservationReducer from "./slices/reservationSlice";
import venueReducer from "./slices/venueSlice";
import refReducer from "./slices/refSlice";
import areasReducer from "./slices/areaSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    order: orderReducer,
    reservation: reservationReducer,
    venue: venueReducer,
    ref: refReducer,
    areas: areasReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
