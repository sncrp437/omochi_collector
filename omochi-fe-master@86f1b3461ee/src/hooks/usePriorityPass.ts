import { useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MenuItem, OrderTypeEnum } from "@/generated/api";
import { RootState } from "@/store";
import { TypeCheckboxEnum } from "@/utils/constants";
import {
  updateQuantity,
  updatePriorityPassNoticeStatus,
  updatePriorityPassAddType,
  addToCart,
  removeFromCart,
} from "@/store/slices/cartSlice";

export const usePriorityPass = (
  venueId: string,
  orderType: OrderTypeEnum | undefined,
  guestCount: number | undefined
) => {
  const dispatch = useDispatch();
  const cartInfo = useSelector((state: RootState) => state.cart?.[venueId]);

  // State for priority pass UI control
  const [openModalPriorityPass, setOpenModalPriorityPass] = useState(false);
  const [isPriorityPassModalRequired, setIsPriorityPassModalRequired] =
    useState(true);
  const [priorityPassItem, setPriorityPassItem] = useState<MenuItem | null>(
    null
  );
  const [priorityPassRequired, setPriorityPassRequired] = useState(false);

  // Current priority pass in cart
  const priorityPassInCart = useMemo(
    () => cartInfo?.items?.find((item) => item.is_priority_pass),
    [cartInfo?.items]
  );

  // Check if there are priority pass items in the cart
  const hasPriorityPassInCart = useMemo(() => {
    return !!priorityPassInCart && priorityPassInCart.quantity > 0;
  }, [priorityPassInCart]);

  // Find priority pass item for current order type
  const findPriorityPassItem = useCallback(
    (allItems: MenuItem[]) => {
      return (
        allItems.find((item) => {
          // Check if the item is a priority pass and supports the current order type
          if (!item.is_priority_pass) return false;

          // For DineIn, check if the item has a regular price
          if (orderType === OrderTypeEnum.DineIn && item.price) return true;

          // For Takeout, check if the item has a take_out_price
          if (orderType === OrderTypeEnum.Takeout && item.take_out_price)
            return true;

          return false;
        }) || null
      );
    },
    [orderType]
  );

  // Add priority pass item to cart
  const addPriorityPassToCart = useCallback(
    (item: MenuItem, addType: TypeCheckboxEnum = TypeCheckboxEnum.MANUAL) => {
      if (!item) return;

      // Check if the item supports the current order type
      const supportsOrderType =
        (orderType === OrderTypeEnum.DineIn && item.price) ||
        (orderType === OrderTypeEnum.Takeout && item.take_out_price);

      if (!supportsOrderType) return;

      // Set quantity based on order type and party size
      const quantity = orderType === OrderTypeEnum.DineIn ? guestCount || 1 : 1;

      dispatch(
        addToCart({
          venueId,
          item: { ...item, quantity, addType },
          orderSummary: cartInfo?.orderSummary || {},
        })
      );
    },
    [dispatch, venueId, cartInfo?.orderSummary, orderType, guestCount]
  );

  // Remove priority pass item from cart
  const removePriorityPassFromCart = useCallback(
    (item: MenuItem) => {
      if (!item) return;

      const cartItem = cartInfo?.items?.find(
        (i) =>
          (i.origin_id && i.origin_id === item.origin_id) ||
          (i.id && i.id === item.id)
      );

      if (cartItem?.addType === TypeCheckboxEnum.AUTO) {
        dispatch(
          removeFromCart({
            venueId,
            id: item.id,
            origin_id: item.origin_id,
          })
        );
      }
    },
    [dispatch, venueId, cartInfo]
  );

  // Update priority pass notice status
  const updatePriorityPassItemNoticeStatus = useCallback(
    (itemId: string, status: boolean) => {
      dispatch(
        updatePriorityPassNoticeStatus({
          venueId,
          id: itemId,
          hasShownNotRequiredNotice: status,
        })
      );
    },
    [dispatch, venueId]
  );

  // Update priority pass add type
  const updatePriorityPassItemAddType = useCallback(
    (itemId: string, addType: TypeCheckboxEnum) => {
      dispatch(
        updatePriorityPassAddType({
          venueId,
          id: itemId,
          addType,
        })
      );
    },
    [dispatch, venueId]
  );

  // Modal handlers
  const priorityPassModalHandlers = useMemo(() => {
    return {
      // Show modal for manual selection
      showModal: () => {
        setOpenModalPriorityPass(true);
        setIsPriorityPassModalRequired(false);
      },

      // Close modal and handle status updates
      closeModal: () => {
        setOpenModalPriorityPass(false);

        // Update hasShownNotRequiredNotice when closing not required notice modal
        if (!isPriorityPassModalRequired && priorityPassItem) {
          if (
            priorityPassInCart &&
            priorityPassInCart.addType === TypeCheckboxEnum.MANUAL
          ) {
            const itemId =
              priorityPassInCart?.origin_id || priorityPassInCart.id;
            updatePriorityPassItemNoticeStatus(itemId, true);
          }
        }
      },
    };
  }, [
    isPriorityPassModalRequired,
    priorityPassItem,
    priorityPassInCart,
    updatePriorityPassItemNoticeStatus,
  ]);

  // Update priority pass quantity
  const updatePriorityPassQuantity = useCallback(() => {
    if (!priorityPassInCart) return;

    // Calculate correct quantity based on order type
    const targetQuantity =
      orderType === OrderTypeEnum.DineIn ? guestCount || 1 : 1;

    if (priorityPassInCart.quantity !== targetQuantity) {
      dispatch(
        updateQuantity({
          venueId,
          id: priorityPassInCart.id,
          origin_id: priorityPassInCart.origin_id,
          quantity: targetQuantity,
        })
      );
    }
  }, [dispatch, venueId, priorityPassInCart, orderType, guestCount]);

  return {
    // State
    openModalPriorityPass,
    setOpenModalPriorityPass,
    isPriorityPassModalRequired,
    setIsPriorityPassModalRequired,
    priorityPassItem,
    setPriorityPassItem,
    priorityPassRequired,
    setPriorityPassRequired,
    priorityPassInCart,
    hasPriorityPassInCart,

    // Functions
    findPriorityPassItem,
    addPriorityPassToCart,
    removePriorityPassFromCart,
    updatePriorityPassQuantity,
    updatePriorityPassItemNoticeStatus,
    updatePriorityPassItemAddType,

    // Modal handlers
    showPriorityPassModal: priorityPassModalHandlers.showModal,
    closePriorityPassModal: priorityPassModalHandlers.closeModal,
  };
};
