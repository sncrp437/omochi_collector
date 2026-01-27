import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  CART,
  PaymentStripeStatusEnum,
  CART_EXPIRY_DURATION_MS,
  TypeCheckboxEnum,
  STORAGE_ANNOUNCEMENT_KEY,
} from "../../utils/constants";
import { CartSliceItem, OrderSummary, PriceMapMenuItem } from "@/types/cart";
import {
  OrderItem,
  Order,
  OrderTypeEnum,
  ApplicationFee,
} from "@/generated/api";
import { calculateTotalAmountByType } from "@/utils/cart";
import { formatDate } from "@/utils/helper";
import { removeSessionStorage } from "@/utils/storage";

interface StoreCart {
  items: CartSliceItem[];
  totalAmountByType: {
    [OrderTypeEnum.DineIn]: number;
    [OrderTypeEnum.Takeout]: number;
  };
  orderSummary: OrderSummary;
  persistedAt: number;
  applicationFee?: ApplicationFee;
  orderQuestionAnswers?: Record<string, string>;
}

interface CartState {
  [venueId: string]: StoreCart;
}

// Load cart from localStorage if available
const loadCartFromStorage = (): CartState => {
  try {
    const cartData = localStorage.getItem(CART);
    if (cartData) {
      const parsed: CartState = JSON.parse(cartData);
      const now = Date.now();

      const validState: CartState = {};
      for (const venueId in parsed) {
        const store = parsed[venueId];
        if (
          store?.persistedAt &&
          now - store.persistedAt <= CART_EXPIRY_DURATION_MS
        ) {
          store.items = store.items.map((item) => ({
            ...item,
            supportedOrderTypes: item.supportedOrderTypes ?? [
              OrderTypeEnum.DineIn,
              OrderTypeEnum.Takeout,
            ],
          }));
          validState[venueId] = store;
        }
      }

      if (!Object.keys(validState).length) {
        localStorage.removeItem(CART);
      }

      return validState;
    }
  } catch (error) {
    console.error("Error loading cart data from localStorage:", error);
  }
  return {};
};

// Helper function to save cart to localStorage
const saveCartToStorage = (state: CartState) => {
  try {
    localStorage.setItem(CART, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving cart data to localStorage:", error);
  }
};

// Initialize state from localStorage
const initialState: CartState = loadCartFromStorage();

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{
        venueId: string;
        item: CartSliceItem;
        orderSummary: OrderSummary;
      }>
    ) => {
      const { venueId, item, orderSummary } = action.payload;

      const supportedOrderTypes = [
        item.price ? OrderTypeEnum.DineIn : null,
        item.take_out_price ? OrderTypeEnum.Takeout : null,
      ].filter(Boolean) as OrderTypeEnum[];

      const itemToAdd = {
        ...item,
        supportedOrderTypes,
      };

      if (!state[venueId]) {
        state[venueId] = {
          items: [],
          totalAmountByType: {
            [OrderTypeEnum.DineIn]: 0,
            [OrderTypeEnum.Takeout]: 0,
          },
          orderSummary,
          persistedAt: Date.now(),
          applicationFee: undefined,
        };
      }
      const store = state[venueId];

      // Find existing item by checking origin_id first, then id
      const existingItem = store.items.find((i) => {
        if (item.origin_id && i.origin_id) {
          return i.origin_id === item.origin_id;
        }
        return i.id === item.id;
      });

      if (existingItem) {
        existingItem.quantity = item.quantity;
        if (item.addType) {
          existingItem.addType = item.addType;
        }
      } else {
        store.items.push({
          ...itemToAdd,
          previousAddType: undefined,
        });
      }

      store.totalAmountByType = calculateTotalAmountByType(store.items);

      saveCartToStorage(state);
    },
    removeFromCart: (
      state,
      action: PayloadAction<{ venueId: string; id: string; origin_id?: string }>
    ) => {
      const { venueId, id, origin_id } = action.payload;
      const store = state[venueId];
      if (!store) return;

      store.items = store.items.filter((i) => {
        if (origin_id && i.origin_id) {
          return i.origin_id !== origin_id;
        }
        return i.id !== id;
      });

      store.totalAmountByType = calculateTotalAmountByType(store.items);

      saveCartToStorage(state);
    },
    updateQuantity: (
      state,
      action: PayloadAction<{
        venueId: string;
        id: string;
        origin_id?: string;
        quantity: number;
      }>
    ) => {
      const { venueId, id, origin_id, quantity } = action.payload;
      const store = state[venueId];
      if (!store) return;

      if (quantity <= 0) {
        state[venueId].items = state[venueId].items.filter((item) => {
          if (origin_id && item.origin_id) {
            return item.origin_id !== origin_id;
          }
          return item.id !== id;
        });
      } else {
        const item = state[venueId].items.find((item) => {
          if (origin_id && item.origin_id) {
            return item.origin_id === origin_id;
          }
          return item.id === id;
        });
        if (item) {
          item.quantity = quantity;
        }
      }

      store.totalAmountByType = calculateTotalAmountByType(store.items);

      saveCartToStorage(state);
    },
    updatePriorityPassNoticeStatus: (
      state,
      action: PayloadAction<{
        venueId: string;
        id: string;
        hasShownNotRequiredNotice: boolean;
      }>
    ) => {
      const { venueId, id, hasShownNotRequiredNotice } = action.payload;
      const store = state[venueId];
      if (!store) return;

      const item = store.items.find(
        (item) => item.origin_id === id || item.id === id
      );
      if (item) {
        item.hasShownNotRequiredNotice = hasShownNotRequiredNotice;
      }

      saveCartToStorage(state);
    },
    updatePriorityPassAddType: (
      state,
      action: PayloadAction<{
        venueId: string;
        id: string;
        addType: TypeCheckboxEnum;
      }>
    ) => {
      const { venueId, id, addType } = action.payload;
      const store = state[venueId];
      if (!store) return;

      const item = store.items.find(
        (item) => item.origin_id === id || item.id === id
      );
      if (item) {
        // Store current addType as previousAddType before updating
        item.previousAddType = item.addType;
        item.addType = addType;
      }

      saveCartToStorage(state);
    },
    setOrderSummary: (
      state,
      action: PayloadAction<{ venueId: string; orderSummary: OrderSummary }>
    ) => {
      const { venueId, orderSummary } = action.payload;
      if (!state[venueId]) {
        state[venueId] = {
          items: [],
          totalAmountByType: {
            [OrderTypeEnum.DineIn]: 0,
            [OrderTypeEnum.Takeout]: 0,
          },
          orderSummary,
          persistedAt: Date.now(),
          applicationFee: undefined,
        };
      } else {
        state[venueId].orderSummary = orderSummary;
      }

      saveCartToStorage(state);
    },
    updateCartDetailFromOrder: (
      state,
      action: PayloadAction<{ venueId: string; orderDetail: Order }>
    ) => {
      const { venueId, orderDetail } = action.payload;

      const items = orderDetail.items.map((item: OrderItem) => {
        const details = item.menu_item_details;
        const quantityNumber = Number(item.quantity) || 0;

        const supportedOrderTypes: OrderTypeEnum[] = [];
        if (details.price) supportedOrderTypes.push(OrderTypeEnum.DineIn);
        if (details.take_out_price)
          supportedOrderTypes.push(OrderTypeEnum.Takeout);

        return {
          ...details,
          quantity: quantityNumber,
          supportedOrderTypes: supportedOrderTypes,
        };
      });

      const totalAmountByType = calculateTotalAmountByType(items);
      const startTimeDetail = formatDate(orderDetail?.start_time) || "--";
      const endTimeDetail = formatDate(orderDetail?.end_time) || "--";

      const orderSummary: OrderSummary = {
        ...state[venueId]?.orderSummary,
        storeName: orderDetail.venue_name,
        orderType: orderDetail.order_type,
        guestCount: orderDetail.party_size,
        timeSlot: orderDetail.time_slot || "",
        timeSlotLabel: `${startTimeDetail} ～ ${endTimeDetail}`,
        timeSlotStart: startTimeDetail,
        timeSlotEnd: endTimeDetail,
        orderId: orderDetail.id,
        coupon: undefined,
      };

      state[venueId] = {
        items,
        totalAmountByType,
        orderSummary,
        persistedAt: state[venueId]?.persistedAt || Date.now(),
        applicationFee: state[venueId]?.applicationFee,
        orderQuestionAnswers: state[venueId]?.orderQuestionAnswers,
      };

      saveCartToStorage(state);
    },
    updatePaymentStatus: (
      state,
      action: PayloadAction<{
        venueId: string;
        status?: PaymentStripeStatusEnum;
      }>
    ) => {
      const { venueId, status } = action.payload;
      const store = state?.[venueId];
      if (!store) return;
      const orderSummary = store.orderSummary;
      if (orderSummary) {
        orderSummary.paymentStatus = status;
      }
      saveCartToStorage(state);
    },
    updateCartInfoFromMenu: (
      state,
      action: PayloadAction<{
        venueId: string;
        priceMap: Record<string, PriceMapMenuItem>;
      }>
    ) => {
      const { venueId, priceMap } = action.payload;
      const store = state[venueId];
      if (!store) return;

      store.items = store.items
        .filter((item) => {
          // Find price info by checking origin_id first, then id
          const priceInfo = item.origin_id
            ? priceMap[item.origin_id] || priceMap[item.id]
            : priceMap[item.id];

          if (!priceInfo) return false;
          if (priceInfo.is_out_of_stock) return false;

          const orderType = store.orderSummary?.orderType;
          const validForOrderType =
            (orderType === OrderTypeEnum.DineIn && priceInfo.price) ||
            (orderType === OrderTypeEnum.Takeout && priceInfo.take_out_price);

          return validForOrderType;
        })
        .map((item) => {
          // Find price info by checking origin_id first, then id
          const priceInfo = item.origin_id
            ? priceMap[item.origin_id] || priceMap[item.id]
            : priceMap[item.id];

          const supportedOrderTypes = [
            priceInfo.price ? OrderTypeEnum.DineIn : null,
            priceInfo?.take_out_price ? OrderTypeEnum.Takeout : null,
          ].filter(Boolean) as OrderTypeEnum[];

          return {
            ...item,
            id: priceInfo?.id ?? item.id,
            origin_id: priceInfo?.origin_id ?? item.origin_id,
            price: priceInfo?.price ?? item.price,
            take_out_price: priceInfo?.take_out_price ?? item.take_out_price,
            name: priceInfo?.name ?? item.name,
            supportedOrderTypes,
          };
        });

      store.totalAmountByType = calculateTotalAmountByType(store.items);
      saveCartToStorage(state);
    },
    clearCart: (state, action: PayloadAction<string>) => {
      const venueId = action.payload;
      delete state[venueId];
      removeSessionStorage(`${STORAGE_ANNOUNCEMENT_KEY}_${venueId}`);
      saveCartToStorage(state);
    },
    clearCartItems: (state, action: PayloadAction<string>) => {
      const venueId = action.payload;
      const store = state[venueId];
      if (!store) return;

      store.items = [];
      store.totalAmountByType = {
        [OrderTypeEnum.DineIn]: 0,
        [OrderTypeEnum.Takeout]: 0,
      };
      saveCartToStorage(state);
    },
    setOrderQuestionAnswers: (
      state,
      action: PayloadAction<{
        venueId: string;
        answers: Record<string, string>;
      }>
    ) => {
      const { venueId, answers } = action.payload;
      if (state[venueId]) {
        state[venueId].orderQuestionAnswers = answers;
        saveCartToStorage(state);
      }
    },
    setApplicationFeeCart: (
      state,
      action: PayloadAction<{ venueId: string; applicationFee: ApplicationFee }>
    ) => {
      const { venueId, applicationFee } = action.payload;
      if (!state[venueId]) {
        state[venueId] = {
          items: [],
          totalAmountByType: {
            [OrderTypeEnum.DineIn]: 0,
            [OrderTypeEnum.Takeout]: 0,
          },
          orderSummary: {
            storeName: "",
            orderType: OrderTypeEnum.DineIn,
            timeSlot: "",
            timeSlotLabel: "",
            timeSlotStart: "",
            timeSlotEnd: "",
          },
          persistedAt: Date.now(),
          applicationFee,
        };
      } else {
        state[venueId].applicationFee = applicationFee;
      }
      saveCartToStorage(state);
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  setOrderSummary,
  updateCartDetailFromOrder,
  updatePaymentStatus,
  updateCartInfoFromMenu,
  setApplicationFeeCart,
  setOrderQuestionAnswers,
  clearCartItems,
  updatePriorityPassNoticeStatus,
  updatePriorityPassAddType,
} = cartSlice.actions;

export default cartSlice.reducer;
