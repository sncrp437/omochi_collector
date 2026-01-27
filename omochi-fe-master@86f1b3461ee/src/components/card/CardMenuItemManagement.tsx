import { Typography, Tag, Button } from "antd";
import { useTranslation } from "react-i18next";
import BaseCardVertical from "./BaseCardVertical";
import { MenuItem } from "@/generated/api";
import defaultImage from "@/assets/images/default-image.png";
import { IconCurrencyYen, IconEdit, IconDelete } from "@/assets/icons";
import { formatAndRoundAmount, formatYen } from "@/utils/helper";

const { Text } = Typography;

interface CardMenuItemManagementProps {
  menuItemDetails: MenuItem;
  onClick?: () => void;
  openDeleteModal?: (e: React.MouseEvent) => void;
  openEditModal?: () => void;
}

const CardMenuItemManagement: React.FC<CardMenuItemManagementProps> = ({
  menuItemDetails,
  onClick,
  openDeleteModal,
  openEditModal,
}) => {
  const { t } = useTranslation();

  const {
    name = "",
    description = "",
    image = "",
    category_name = "",
    price = "",
    take_out_price = "",
  } = menuItemDetails;
  const formattedPrice = formatYen(formatAndRoundAmount(price));
  const hiddenTakeOutPrice =
    take_out_price == null || take_out_price === undefined;
  const formattedTakeOutPrice = formatYen(
    formatAndRoundAmount(take_out_price || "0")
  );

  return (
    <BaseCardVertical srcImg={image || defaultImage} onClick={onClick}>
      <div className="flex flex-col gap-2 w-full">
        <div className="flex-row-between">
          <Text className="text-base-white !font-bold !line-clamp-1">
            {name}
          </Text>
          {category_name && (
            <Tag
              color="var(--tag-color)"
              className="!rounded-xl text-xs-white !font-bold !h-[19px] !me-[0px] flex-row-center !px-3"
            >
              {category_name}
            </Tag>
          )}
        </div>
        <Text className="!text-[12px] !text-white !font-['Noto_Sans_JP'] !leading-[normal] !line-clamp-2 !whitespace-pre-wrap">
          {description}
        </Text>
      </div>

      <div className="flex-row-between flex-wrap gap-2 !min-h-7">
        <div className="flex-row-between gap-2 flex-5">
          <Button className="!px-3 !h-7 !border-none !outline-none !bg-[var(--primary-color)] flex-row-center !gap-1 !rounded-[6px] !flex-1">
            <IconCurrencyYen className="!w-5 !h-5 !min-w-5 !min-h-5 !flex-shrink-0 !text-white" />
            <Text className="text-sm-white !font-bold whitespace-nowrap">
              {formattedPrice}
            </Text>
          </Button>

          {!hiddenTakeOutPrice && (
            <Button className="!h-7 !border-none !outline-none !bg-[var(--background-teal-color)] flex-row-center !gap-1 !rounded-[6px] !flex-1">
              <IconCurrencyYen className="!w-5 !h-5 !min-w-5 !min-h-5 !flex-shrink-0 !text-white" />
              <Text className="text-sm-white !font-bold whitespace-nowrap">
                {formattedTakeOutPrice}
              </Text>
            </Button>
          )}
        </div>

        <div className="flex-row-between gap-2 flex-1">
          <Button
            className="!h-7 !border !border-white !px-2 !outline-none !bg-transparent flex-row-center !gap-1 !rounded-[6px] flex-shrink-0"
            onClick={openEditModal}
          >
            <IconEdit className="!w-5 !h-5 !min-w-5 !min-h-5 !flex-shrink-0 !text-white" />
            <Text className="text-sm-white">{t("venue.label.edit_label")}</Text>
          </Button>

          <Button
            className="!h-7 !border !border-white !px-2 !outline-none !bg-transparent flex-row-center !gap-1 !rounded-[6px] flex-shrink-0"
            onClick={openDeleteModal}
          >
            <IconDelete className="!w-5 !h-5 !min-w-5 !min-h-5 !flex-shrink-0 !text-white" />
          </Button>
        </div>
      </div>
    </BaseCardVertical>
  );
};

export default CardMenuItemManagement;
