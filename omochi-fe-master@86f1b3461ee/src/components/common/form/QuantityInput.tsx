import { Button, Typography } from "antd";
import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { updateQuantity, addToCart } from "@/store/slices/cartSlice";
import { MenuItem } from "@/generated/api";
import { RootState } from "@/store";
import { CartSliceItem, OrderSummary } from "@/types/cart";

const { Text } = Typography;

interface QuantityInputProps {
  venueId: string;
  menuItem: MenuItem;
  onShowAlcoholicModal?: (confirmCallback: () => void) => void;
}

const QuantityInput: React.FC<QuantityInputProps> = ({
  venueId,
  menuItem,
  onShowAlcoholicModal,
}) => {
  const { id: itemId } = menuItem;
  const cartItem = useSelector((state: RootState) =>
    state.cart?.[venueId]?.items?.find(
      (i: CartSliceItem) =>
        (i.origin_id && i.origin_id === menuItem.origin_id) || i.id === itemId
    )
  );

  const hasAlcoholicInCart = useSelector((state: RootState) => {
    const items = state.cart?.[venueId]?.items;
    if (!items) return false;
    return items.some(
      (item: CartSliceItem) => item.is_alcoholic && item.quantity > 0
    );
  });

  const dispatch = useDispatch();

  const [quantity, setQuantity] = useState(cartItem?.quantity || 0);

  useEffect(() => {
    setQuantity(cartItem?.quantity || 0);
  }, [cartItem?.quantity]);

  // Memoized common function to handle cart update
  const updateCartItem = useCallback(
    (newQuantity: number) => {
      if (cartItem) {
        dispatch(
          updateQuantity({
            venueId,
            id: itemId,
            origin_id: menuItem?.origin_id,
            quantity: newQuantity,
          })
        );
      } else {
        dispatch(
          addToCart({
            venueId,
            item: { ...menuItem, quantity: newQuantity },
            orderSummary: {} as OrderSummary,
          })
        );
      }
      setQuantity(newQuantity);
    },
    [cartItem, dispatch, venueId, itemId, menuItem]
  );

  const handleChange = useCallback(
    (delta: number) => {
      const newQuantity = quantity + delta;

      if (newQuantity < 0) return;

      // Special logic for alcoholic items when increasing quantity
      if (delta > 0 && menuItem?.is_alcoholic && !hasAlcoholicInCart) {
        onShowAlcoholicModal?.(() => updateCartItem(newQuantity));
        return;
      }

      // Normal flow for non-alcoholic items or when decreasing
      updateCartItem(newQuantity);
    },
    [
      quantity,
      menuItem?.is_alcoholic,
      hasAlcoholicInCart,
      onShowAlcoholicModal,
      updateCartItem,
    ]
  );

  const handleStopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Memoized button classes to avoid recalculation
  const minusButtonClass = useMemo(
    () =>
      `!w-4 !min-w-4 !h-4 !min-h-4 !bg-[var(--background-gray-color)] !border-none !outline-none !text-white !rounded-[6px] ${
        !quantity ? "!opacity-50" : ""
      }`,
    [quantity]
  );

  return (
    <div
      className="flex items-center gap-1 px-2 h-7 bg-[var(--background-gray-color)] rounded-[6px] min-w-[85px]"
      onClick={handleStopPropagation}
    >
      <Button
        onClick={() => handleChange(-1)}
        icon={<MinusOutlined />}
        className={minusButtonClass}
        disabled={!quantity}
      />
      <Text className="min-w-5 !flex-1 text-center text-xs-white !font-bold">
        {quantity}
      </Text>
      <Button
        onClick={() => handleChange(1)}
        icon={<PlusOutlined />}
        className="!w-4 !min-w-4 !h-4 !min-h-4 !bg-[var(--background-gray-color)] !border-none !outline-none !text-white !rounded-[6px]"
      />
    </div>
  );
};

export default QuantityInput;
