import { SVGProps } from "react";
import { Typography } from "antd";
import { OrderTypes } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { OrderTypeEnum } from "@/generated/api";
import { IconEatInVenue, IconTakeOutVenue } from "@/assets/icons";
import BaseCardVenue from "./BaseCardVenue";
import { formatYenWithCurrency } from "@/utils/helper";
import dayjs from "dayjs";

const { Text } = Typography;

interface CardOrderLogItemVenueProps {
  orderCode?: string;
  orderMethod: string;
  onClick?: () => void;
  completionTime?: string | null;
  price: string;
}

const CardOrderLogItemVenue: React.FC<CardOrderLogItemVenueProps> = ({
  orderCode,
  orderMethod,
  onClick,
  completionTime,
  price,
}) => {
  const { t } = useTranslation();

  const iconMap: Record<OrderTypeEnum, React.FC<SVGProps<SVGSVGElement>>> = {
    [OrderTypeEnum.DineIn]: IconEatInVenue,
    [OrderTypeEnum.Takeout]: IconTakeOutVenue,
  };
  const completionTimeFormatted = completionTime
    ? dayjs(completionTime).format("YYYY/MM/DD　HH：mm")
    : "";

  const IconComponent = iconMap[orderMethod as OrderTypeEnum] ?? IconEatInVenue;

  return (
    <BaseCardVenue
      image={
        <IconComponent className="!object-contain !w-10 !h-10 !min-w-10 !min-h-10" />
      }
      onClick={onClick}
      hideReceptionTime
    >
      <div className="flex flex-col gap-1 flex-1 justify-center cursor-pointer">
        <Text className="text-xs-white">
          {t("order.label.order_number_label")}：＃{orderCode}
        </Text>
        <Text className="text-xs-white">
          {t("order.label.completion_date_time_label")}：
          {completionTimeFormatted}
        </Text>
        <Text className="text-xs-white">
          {t("order.label.order_method_label")}：
          {t(OrderTypes[orderMethod as keyof typeof OrderTypes])}
        </Text>
        <Text className="text-xs-white">
          {t("order.label.price_label")}：
          {price ? formatYenWithCurrency(Number(price)) : ""}
        </Text>
      </div>
    </BaseCardVenue>
  );
};

export default CardOrderLogItemVenue;
