import { SVGProps } from "react";
import { Typography } from "antd";
import { OrderTypes } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { OrderTypeEnum } from "@/generated/api";
import { IconEatInVenue, IconTakeOutVenue } from "@/assets/icons";
import BaseCardVenue from "./BaseCardVenue";
import { useStatusConstants } from "@/hooks/useStatusConstants";

const { Text } = Typography;

interface CardOrderItemVenueProps {
  orderCode?: string;
  orderMethod: string;
  specifiedTimeStart: string;
  specifiedTimeEnd: string;
  orderStatus: string;
  onClick?: () => void;
  receptionTime?: string;
  isEditMode?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

const CardOrderItemVenue: React.FC<CardOrderItemVenueProps> = ({
  orderCode,
  orderMethod,
  specifiedTimeStart,
  specifiedTimeEnd,
  orderStatus,
  onClick,
  receptionTime,
  isEditMode = false,
  checked = false,
  disabled = false,
  onCheckChange,
}) => {
  const { t } = useTranslation();
  const { orderStatus: dynamicOrderStatus } = useStatusConstants();

  const { label: statusLabel, color: statusColor } =
    dynamicOrderStatus[orderStatus as keyof typeof dynamicOrderStatus] ||
    dynamicOrderStatus.PREPARING;

  const iconMap: Record<OrderTypeEnum, React.FC<SVGProps<SVGSVGElement>>> = {
    [OrderTypeEnum.DineIn]: IconEatInVenue,
    [OrderTypeEnum.Takeout]: IconTakeOutVenue,
  };

  const IconComponent = iconMap[orderMethod as OrderTypeEnum] ?? IconEatInVenue;

  return (
    <BaseCardVenue
      image={
        <IconComponent className="!object-contain !w-10 !h-10 !min-w-10 !min-h-10" />
      }
      onClick={onClick}
      receptionTime={receptionTime}
      isEditMode={isEditMode}
      checked={checked}
      disabled={disabled}
      onCheckChange={onCheckChange}
    >
      <div className="flex flex-col gap-1 flex-1 justify-center cursor-pointer">
        <Text className="text-xs-white">
          {t("order.label.order_number_label")}：＃{orderCode}
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
    </BaseCardVenue>
  );
};

export default CardOrderItemVenue;
