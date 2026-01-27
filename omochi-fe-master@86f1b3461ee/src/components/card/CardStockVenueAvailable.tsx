import { Typography, Button } from "antd";
import BaseCardHorizontal from "@/components/card/BaseCardHorizontal";
import { useTranslation } from "react-i18next";
import defaultImage from "@/assets/images/default-image.png";
import { OrderTypeEnum, TimeSlot, VenueDetail } from "@/generated/api";
import { IconUser } from "@/assets/icons";
import { useMemo } from "react";
import { MAX_ALMOST_FULL_SLOT } from "@/utils/constants";
import { formatTimeSlotLabel } from "@/utils/helper";

const { Text, Title } = Typography;

interface CardStockVenueAvailableProps {
  venueDetail: VenueDetail;
  timeSlot?: TimeSlot;
  onClick?: () => void;
  orderType?: OrderTypeEnum;
}

const CardStockVenueAvailable: React.FC<CardStockVenueAvailableProps> = ({
  venueDetail,
  timeSlot,
  onClick,
  orderType = OrderTypeEnum.Takeout,
}) => {
  const { t } = useTranslation();

  const { name, description = "", logo } = venueDetail;
  const {
    remaining_slots = 0,
    start_time = "",
    end_time = "",
  } = timeSlot || {};

  const timeSlotLabel = useMemo(() => {
    return formatTimeSlotLabel(start_time, end_time);
  }, [start_time, end_time]);

  const almostFullSlot = useMemo(() => {
    return remaining_slots <= MAX_ALMOST_FULL_SLOT;
  }, [remaining_slots]);

  const labelTimeSlot = useMemo(() => {
    const isTakeout = orderType === OrderTypeEnum.Takeout;

    return {
      unit: isTakeout
        ? t("venue.label.party_size_table_label_take_out_unit")
        : t("venue.label.party_size_table_label_eat_in_unit"),
      deadlineLabel: isTakeout
        ? t("order.label.deadline_order_take_out_label")
        : t("order.label.deadline_order_eat_in_label"),
    };
  }, [orderType, t]);

  if (!timeSlot || !remaining_slots) {
    return <></>;
  }

  return (
    <BaseCardHorizontal srcImg={logo || defaultImage} onClick={onClick}>
      <div className="flex flex-1 flex-col gap-2 justify-between">
        <div className="flex flex-col gap-1">
          <Title level={2} className="text-sm-white !font-bold !m-0 !mb-0">
            {name}
          </Title>
          <span className="flex items-baseline gap-1">
            <Text className="!text-[10px] font-family-base !leading-[1.2em] !text-[var(--tag-color)] !font-bold">
              | {timeSlotLabel} |
            </Text>
            <Text className="!text-[10px] font-family-base !leading-[1.2em] !text-white !font-bold">
              {labelTimeSlot.deadlineLabel}
            </Text>
          </span>
          <div
            className="text-xs-white !line-clamp-2 !whitespace-pre-wrap word-break"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>

        <div className="flex-row-between gap-2">
          <div className="flex-row-center gap-2">
            <IconUser
              className={`!w-5 !h-5 ${
                almostFullSlot ? "!text-[var(--primary-color)]" : "!text-white"
              }`}
            />
            <Text
              className={`!text-[12px] !leading-[1.2em] font-family-base !font-normal ${
                almostFullSlot ? "!text-[var(--primary-color)]" : "!text-white"
              }`}
            >
              {t("share.remaining_slots_prefix")}{" "}
              <span className="!font-bold">{remaining_slots}</span>{" "}
              {labelTimeSlot.unit}
            </Text>
          </div>
          <Button
            type="primary"
            className={`!h-[22px] !max-h-[22px] !min-h-[22px] !px-2 !w-[80px] !max-w-[80px] !border-none !rounded-2xl flex-row-center !outline-none ${
              almostFullSlot
                ? "!bg-[var(--primary-color)]"
                : "!bg-[var(--background-gray-color)]"
            }`}
          >
            <Text className="!tracking-[normal] text-xs-white">
              {t("general.choice")}
            </Text>
          </Button>
        </div>
      </div>
    </BaseCardHorizontal>
  );
};

export default CardStockVenueAvailable;
