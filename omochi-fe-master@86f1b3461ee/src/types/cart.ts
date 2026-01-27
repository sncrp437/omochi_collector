import {
  CouponTypeEnum,
  OrderTypeEnum,
  PaymentMethodEnum,
} from "@/generated/api";
import { PaymentStripeStatusEnum, TypeCheckboxEnum } from "@/utils/constants";

export interface CartSliceItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  image?: string | null;
  supportedOrderTypes?: OrderTypeEnum[];
  take_out_price?: string | null;
  is_alcoholic?: boolean;
  is_priority_pass?: boolean;
  addType?: TypeCheckboxEnum;
  hasShownNotRequiredNotice?: boolean;
  previousAddType?: TypeCheckboxEnum;
  origin_id?: string;
}

export interface OrderSummary {
  storeName: string;
  orderType: OrderTypeEnum;
  timeSlot: string;
  timeSlotLabel: string;
  guestCount?: number;
  timeSlotStart: string;
  timeSlotEnd: string;
  paymentMethod?: PaymentMethodEnum;
  orderId?: string;
  paymentStatus?: PaymentStripeStatusEnum;
  supportedPaymentMethods?: PaymentMethodEnum[];
  serviceFee?: number | null;
  disable_eatin_preorder?: boolean;
  disable_eatin_reservation?: boolean;
  enable_order_questions?: boolean;
  coupon?: {
    id: string;
    amount: string;
    type?: CouponTypeEnum;
  };
}

export type OpeningHours = {
  [key: string]: {
    opening_time: string;
    closing_time: string;
  } | null;
};

export interface MenuItemTable {
  key: string;
  name: string;
  quantity: number;
  subtotal: number;
}

export interface PriceMapMenuItem {
  id?: string;
  origin_id?: string;
  price?: string;
  take_out_price?: string;
  is_out_of_stock?: boolean;
  name: string;
}


export interface SessionStorageData {
  dontShow: boolean;
  persistedAt: number;
}