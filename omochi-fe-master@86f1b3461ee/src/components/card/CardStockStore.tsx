import { Button, Typography } from "antd";
import Card from "antd/es/card/Card";
import { IconStar, IconFillStar, IconRedirect } from "@/assets/icons";
import { useMemo, useState } from "react";
import defaultImage from "@/assets/images/default-image.png";
import { useTranslation } from "react-i18next";
import { ASPECT_RATIO_IMAGE } from "@/utils/constants";
import { getOrderTypeLabel } from "@/utils/translationHelpers";
import { Campaign } from "@/generated/api";
import ButtonShowCampaign from "../common/ButtonShowCampaign";
import CampaignModal from "../common/modal/CampaignModal";

const { Text, Title } = Typography;

interface CardStockStoreProps {
  srcImg: string;
  storeName: string;
  enableEatIn?: boolean;
  enableTakeOut?: boolean;
  genre?: string | null;
  nearestStation?: string | null;
  address?: string | null;
  isFavorite?: boolean;
  onClick?: () => void;
  onFavoriteClick?: () => void;
  onShareClick?: () => void;
  listCampaigns: Campaign[];
  onSaveState: () => void;
}

const CardStockStore: React.FC<CardStockStoreProps> = ({
  srcImg,
  storeName,
  enableEatIn,
  enableTakeOut,
  genre,
  nearestStation,
  address,
  isFavorite = false,
  onClick,
  onFavoriteClick,
  onShareClick,
  listCampaigns = [],
  onSaveState,
}) => {
  const { t } = useTranslation();
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const orderType = useMemo(() => {
    return getOrderTypeLabel(enableEatIn, enableTakeOut);
  }, [enableEatIn, enableTakeOut]);

  const storeInfoData = useMemo(
    () => [
      {
        key: "storeName",
        label: t("order.label.store_name_label"),
        value: storeName,
        isBold: true,
      },
      {
        key: "orderType",
        label: t("venue.label.order_type_label"),
        value: orderType,
        isBold: false,
      },
      {
        key: "genre",
        label: t("venue.label.genre_label"),
        value: genre,
        isBold: false,
      },
      {
        key: "nearestStation",
        label: t("venue.label.neartest_station_label"),
        value: nearestStation,
        isBold: false,
      },
      {
        key: "address",
        label: t("venue.label.address_label"),
        value: address,
        isBold: false,
      },
    ],
    [t, storeName, orderType, genre, nearestStation, address]
  );

  // check campaign is active
  const hasCampaign = useMemo(() => {
    return !!listCampaigns?.length;
  }, [listCampaigns]);

  const handleShowCampaign = (e: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    setIsCampaignModalOpen(true);
  };

  const handleCloseCampaignModal = () => {
    setIsCampaignModalOpen(false);
  };

  return (
    <>
      <Card
        hoverable
        variant="borderless"
        className="!bg-[var(--card-background-color)] !rounded-2xl hover:!bg-[#404040]"
        styles={{
          body: {
            padding: "10px",
          },
        }}
        onClick={onClick}
      >
        <div className="flex flex-col gap-[10px]">
          <div className="w-full rounded-lg">
            <img
              src={srcImg}
              alt="Store Image"
              title={storeName}
              className="!object-cover rounded-lg w-full "
              style={{ aspectRatio: ASPECT_RATIO_IMAGE.VENUE }}
              fetchPriority="high"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = defaultImage;
              }}
            />
          </div>

          {hasCampaign && (
            <div>
              <ButtonShowCampaign onClick={handleShowCampaign} />
            </div>
          )}

          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-col gap-1">
              {storeInfoData.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-row items-baseline text-xs-white"
                >
                  {item.key === "storeName" ? (
                    <>
                      <p className="text-xs-white !leading-[normal] !break-keep">
                        {item.label}
                      </p>
                      ：
                      <Title
                        level={2}
                        className="text-xs-white !leading-[normal] !break-all !font-bold !m-0 !mb-0"
                      >
                        {item.value}
                      </Title>
                    </>
                  ) : (
                    <>
                      <p
                        className={`text-xs-white !leading-[normal] !break-keep ${
                          item.isBold ? "!font-bold" : ""
                        }`}
                      >
                        {item.label}
                      </p>
                      ：
                      <p
                        className={`text-xs-white !leading-[normal] !break-all ${
                          item.isBold ? "!font-bold" : ""
                        }`}
                      >
                        {item.value}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div
              className={`!flex flex-col !items-center !justify-center gap-1`}
            >
              <Button
                type="text"
                className={`!p-[6px] !max-h-[32px] w-[52px] !flex !items-center !justify-center !border-white !border !outline-none ${
                  isFavorite ? "!bg-[#FFCC00] !border-none" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteClick?.();
                }}
              >
                <img
                  src={isFavorite ? IconFillStar : IconStar}
                  alt="Icon Favorite"
                  className="object-contain w-5 h-5 min-w-5 min-h-5 max-h-5"
                />
              </Button>
              <div
                className="flex flex-col items-center justify-center gap-1 bg-[var(--primary-color)] !w-[50px] !h-[50px] rounded-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onShareClick?.();
                }}
              >
                <IconRedirect className=" !w-5 !h-5 !min-w-5 !min-h-5 !text-white" />
                <Text className="text-xs-white !font-bold">
                  {t("share.share_store_title")}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <CampaignModal
        isModalOpen={isCampaignModalOpen}
        onClose={handleCloseCampaignModal}
        listCampaigns={listCampaigns}
        onSaveState={onSaveState}
      />
    </>
  );
};

export default CardStockStore;
