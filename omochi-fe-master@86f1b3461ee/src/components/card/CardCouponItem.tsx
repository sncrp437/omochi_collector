import Card from "antd/es/card/Card";
import { Typography } from "antd";
import { CardProps } from "antd/es/card/Card";
import { Coupon } from "@/generated/api";
import { IconCoupon } from "@/assets/icons";
import { formatAndRoundAmount, formatYen } from "@/utils/helper";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

const { Text } = Typography;

interface CardCouponItemProps extends CardProps {
  coupon: Coupon;
  onClick?: () => void;
  isUsed?: boolean;
  selected?: boolean;
  expiryDate?: string | null;
}

const CardCouponItem: React.FC<CardCouponItemProps> = ({
  coupon,
  onClick,
  isUsed = false,
  selected = false,
  expiryDate = "",
  ...rest
}) => {
  const { t } = useTranslation();

  const { amount = "", is_active = true, type = "" } = coupon;

  if (!is_active || isUsed) {
    return <></>;
  }

  return (
    <Card
      hoverable
      variant="borderless"
      className="!bg-[var(--card-background-color)] !rounded-2xl hover:!bg-[#404040]"
      styles={{
        body: {
          padding: "10px",
          height: "105px",
        },
      }}
      {...rest}
      onClick={onClick}
    >
      <div className="flex-row-between gap-2 w-full h-full">
        <div className="min-h-[85px] w-[35%] min-w-[100px] max-w-[150px] rounded-[9px] flex-row-center bg-[var(--primary-color)]">
          <IconCoupon className="!w-10 !h-10 !min-w-10 !min-h-10 !max-w-10 !max-h-10 !text-white" />
        </div>

        <div className="flex-1 flex flex-col justify-around items-center h-full">
          <Text className="!text-white !text-[24px] !font-['Noto_Sans_JP'] !leading-[1.2em] !font-bold">
            {formatYen(formatAndRoundAmount(amount))}
            {t("ui.currency.yen_symbol")}
          </Text>
          <div className="w-full flex flex-col items-start gap-1 px-2">
            <Text className="text-xs-white">
              {t("general.type_label")}：{type}
            </Text>
            <Text className="text-xs-white">
              {t("general.expiration_date_label")}：
              {expiryDate
                ? format(new Date(expiryDate), "yyyy/MM/dd") +
                  " " +
                  t("ui.currency.until_suffix")
                : t("ui.currency.six_months")}
            </Text>
          </div>
        </div>
        <div>
          <div className="w-4 h-4 min-w-4 min-h-4 border-[2px] border-white rounded-full flex-row-center">
            {selected && (
              <span className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-white" />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CardCouponItem;
