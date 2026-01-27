import { OrderTypeEnum } from "@/generated/api";
import { CartSliceItem, PriceMapMenuItem } from "@/types/cart";
import { isEmpty } from "./helper";

export const calculateTotalAmountByType = (
  items: CartSliceItem[]
): Record<OrderTypeEnum, number> => {
  return {
    [OrderTypeEnum.DineIn]: items.reduce((total, item) => {
      if (item.supportedOrderTypes?.includes(OrderTypeEnum.DineIn)) {
        return total + Number(item.price || 0) * item.quantity;
      }
      return total;
    }, 0),

    [OrderTypeEnum.Takeout]: items.reduce((total, item) => {
      if (item.supportedOrderTypes?.includes(OrderTypeEnum.Takeout)) {
        const takeoutPrice = item.take_out_price ?? item.price;
        return total + Number(takeoutPrice || 0) * item.quantity;
      }
      return total;
    }, 0),
  };
};

export const hasCartItemChanged = (
  cartItem: CartSliceItem,
  latestItem: PriceMapMenuItem | undefined,
  orderType: OrderTypeEnum
): boolean => {
  if (!latestItem || isEmpty(latestItem)) return true;

  if (cartItem.name !== latestItem.name) return true;

  const latestPrice =
    orderType === OrderTypeEnum.DineIn
      ? latestItem.price
      : latestItem.take_out_price;

  const cartPrice =
    orderType === OrderTypeEnum.DineIn
      ? cartItem.price
      : cartItem.take_out_price;

  return cartPrice !== latestPrice;
};
