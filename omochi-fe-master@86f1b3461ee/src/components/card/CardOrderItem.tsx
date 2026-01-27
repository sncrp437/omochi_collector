import { Typography } from "antd";
import { OrderTypes } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import BaseCardHorizontal from "@/components/card/BaseCardHorizontal";
import { useStatusConstants } from "@/hooks/useStatusConstants";
const { Text } = Typography;

interface CardOrderItemProps {
  srcImg: string;
  storeName: string;
  orderMethod: string;
  specifiedTimeStart: string;
  specifiedTimeEnd: string;
  orderStatus: string;
  reservationId?: string;
  onClick?: () => void;
}

const CardOrderItem: React.FC<CardOrderItemProps> = ({
  srcImg,
  storeName,
  orderMethod,
  specifiedTimeStart,
  specifiedTimeEnd,
  orderStatus,
  onClick,
}) => {
  const { t } = useTranslation();
  const { orderStatus: dynamicOrderStatus } = useStatusConstants();

  const { label: statusLabel, color: statusColor } =
    dynamicOrderStatus[orderStatus as keyof typeof dynamicOrderStatus] ||
    dynamicOrderStatus.PREPARING;

  return (
    <BaseCardHorizontal srcImg={srcImg} onClick={onClick}>
      <div className="flex flex-col gap-1 pt-2 flex-1 justify-center cursor-pointer">
        <Text className="text-xs-white !font-bold">
          {t("order.label.store_name_label")}：{storeName}
        </Text>
        <Text className="text-xs-white">
          {t("order.label.order_method_label")}：
          {t(OrderTypes[orderMethod as keyof typeof OrderTypes])}
        </Text>
        <Text className="text-xs-white">
          {t("order.label.time_specification_label")}：{specifiedTimeStart} ～{" "}
          {specifiedTimeEnd}
        </Text>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Text className="text-xs-white">
            {t("order.label.order_status_label")}：
            <span
              style={{
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </Text>
        </div>
      </div>
    </BaseCardHorizontal>
  );
};

export default CardOrderItem;
