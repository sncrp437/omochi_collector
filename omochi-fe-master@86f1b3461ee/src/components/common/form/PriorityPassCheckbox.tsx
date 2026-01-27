import { Checkbox } from "antd";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, updateQuantity } from "@/store/slices/cartSlice";
import { MenuItem } from "@/generated/api";
import { RootState } from "@/store";
import { OrderSummary } from "@/types/cart";
import { OrderTypeEnum } from "@/generated/api";
import { TypeCheckboxEnum } from "@/utils/constants";

interface PriorityPassCheckboxProps {
  venueId: string;
  menuItem: MenuItem;
  isRequired?: boolean;
  onShowPriorityPassModal?: () => void;
}

const PriorityPassCheckbox: React.FC<PriorityPassCheckboxProps> = ({
  venueId,
  menuItem,
  isRequired = false,
  onShowPriorityPassModal,
}) => {
  const dispatch = useDispatch();
  const cartInfo = useSelector((state: RootState) => state.cart?.[venueId]);
  const orderSummary = cartInfo?.orderSummary;

  const isChecked = !!cartInfo?.items?.find((i) => i.id === menuItem.id)
    ?.quantity;

  const handleChange = useCallback(
    (e: { target: { checked: boolean } }) => {
      if (e.target.checked) {
        // Set quantity based on order type and party size
        let quantity = 1;
        const orderType = orderSummary?.orderType;
        const guestCount = orderSummary?.guestCount;

        if (orderType === OrderTypeEnum.DineIn && guestCount) {
          quantity = guestCount;
        }

        onShowPriorityPassModal?.();

        dispatch(
          addToCart({
            venueId,
            item: { ...menuItem, quantity, addType: TypeCheckboxEnum.MANUAL },
            orderSummary: orderSummary || ({} as OrderSummary),
          })
        );
      } else {
        dispatch(
          updateQuantity({
            venueId,
            id: menuItem.id,
            origin_id: menuItem?.origin_id,
            quantity: 0,
          })
        );
      }
    },
    [dispatch, venueId, menuItem, orderSummary]
  );

  const handleStopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="flex items-center justify-end gap-2 px-2 h-7 min-h-7 min-w-[96px]"
      onClick={handleStopPropagation}
    >
      <Checkbox
        checked={isChecked || isRequired}
        onChange={handleChange}
        className="checkbox-base-custom checkbox-disabled"
        disabled={isRequired}
      />
    </div>
  );
};

export default PriorityPassCheckbox;
