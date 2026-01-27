import { Checkbox } from "antd";
import Card from "antd/es/card/Card";
import { useMemo } from "react";
import defaultImage from "@/assets/images/default-image.png";
import { useTranslation } from "react-i18next";
import { ASPECT_RATIO_IMAGE } from "@/utils/constants";
import { getOrderTypeLabel } from "@/utils/translationHelpers";
interface CardStockStoreProps {
  srcImg: string;
  storeName: string;
  enableEatIn?: boolean;
  enableTakeOut?: boolean;
  genre?: string | null;
  nearestStation?: string | null;
  address?: string | null;
  isChecked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

const CardStockStore: React.FC<CardStockStoreProps> = ({
  srcImg,
  storeName,
  enableEatIn,
  enableTakeOut,
  genre,
  nearestStation,
  address,
  isChecked = false,
  onCheckChange,
}) => {
  const { t } = useTranslation();
  const orderType = useMemo(() => {
    return getOrderTypeLabel(enableEatIn, enableTakeOut);
  }, [enableEatIn, enableTakeOut]);

  const handleCardClick = () => {
    onCheckChange?.(!isChecked);
  };

  return (
    <Card
      hoverable
      variant="borderless"
      className="!bg-[var(--card-background-color)] !rounded-2xl hover:!bg-[#404040] cursor-pointer"
      styles={{
        body: {
          padding: "10px",
        },
      }}
      onClick={handleCardClick}
    >
      <div className="flex flex-col gap-4">
        <div className="w-full rounded-lg">
          <img
            src={srcImg}
            alt="Store Image"
            className="!object-cover rounded-lg w-full"
            style={{ aspectRatio: ASPECT_RATIO_IMAGE.VENUE }}
            fetchPriority="high"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = defaultImage;
            }}
          />
        </div>

        <div className="flex justify-between items-center gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex flex-row gap-2">
              <p className="text-xs-white !font-bold !leading-[normal] !break-keep">
                {t("order.label.store_name_label")}
              </p>
              <p className="text-xs-white !font-bold !leading-[normal] !break-keep">
                :
              </p>

              <p className="text-xs-white !font-bold !leading-[normal] !break-all">
                {storeName}
              </p>
            </div>

            <div className="flex flex-row gap-2">
              <p className="text-xs-white !leading-[normal] !break-keep">
                {t("venue.label.order_type_label")}
              </p>
              <p className="text-xs-white !font-bold !leading-[normal] !break-keep">
                :
              </p>

              <p className="text-xs-white !leading-[normal] !break-all">
                {orderType}
              </p>
            </div>

            <div className="flex flex-row gap-2">
              <p className="text-xs-white !leading-[normal] !break-keep">
                {t("venue.label.genre_label")}
              </p>
              <p className="text-xs-white !font-bold !leading-[normal] !break-keep">
                :
              </p>
              <p className="text-xs-white !leading-[normal] !break-all">
                {genre}
              </p>
            </div>

            <div className="flex flex-row gap-2">
              <p className="text-xs-white !leading-[normal] !break-keep">
                {t("venue.label.neartest_station_label")}
              </p>
              <p className="text-xs-white !font-bold !leading-[normal] !break-keep">
                :
              </p>
              <p className="text-xs-white !leading-[normal] !break-all">
                {nearestStation}
              </p>
            </div>

            <div className="flex flex-row gap-2">
              <p className="text-xs-white !leading-[normal] !break-keep">
                {t("venue.label.address_label")}
              </p>
              <p className="text-xs-white !font-bold !leading-[normal] !break-keep">
                :
              </p>
              <p className="text-xs-white !leading-[normal] !break-all">
                {address}
              </p>
            </div>
          </div>
          <div
            className="flex-row-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isChecked}
              onChange={(e) => onCheckChange?.(e.target.checked)}
              className="[&_.ant-checkbox-inner]:!bg-transparent [&_.ant-checkbox-inner]:!border-white [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-[var(--primary-color)] [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-[var(--primary-color)]"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CardStockStore;
