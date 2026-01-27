import { Typography } from "antd";
import { OrderTypes } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { IconEatInVenue } from "@/assets/icons";
import BaseCardVenue from "./BaseCardVenue";
import dayjs from "dayjs";

const { Text } = Typography;

interface CardReservationLogItemVenueProps {
  reservationCode?: string;
  onClick?: () => void;
  completionTime?: string | null;
}

const CardReservationLogItemVenue: React.FC<
  CardReservationLogItemVenueProps
> = ({ reservationCode, onClick, completionTime }) => {
  const { t } = useTranslation();

  const completionTimeFormatted = completionTime
    ? dayjs(completionTime).format("YYYY/MM/DD　HH：mm")
    : "";

  return (
    <BaseCardVenue
      image={
        <IconEatInVenue className="!object-contain !w-10 !h-10 !min-w-10 !min-h-10" />
      }
      onClick={onClick}
      hideReceptionTime
    >
      <div className="flex flex-col gap-1 flex-1 justify-center cursor-pointer">
        <Text className="text-xs-white">
          {t("order.label.order_number_label")}：＃{reservationCode}
        </Text>
        <Text className="text-xs-white">
          {t("order.label.completion_date_time_label")}：
          {completionTimeFormatted}
        </Text>
        <Text className="text-xs-white">
          {t("order.label.order_method_label")}：{t(OrderTypes.DINE_IN)}
        </Text>
        <Text className="text-xs-white">
          {t("order.label.price_label")}：{t("order.label.no_preorder_label")}
        </Text>
      </div>
    </BaseCardVenue>
  );
};

export default CardReservationLogItemVenue;
