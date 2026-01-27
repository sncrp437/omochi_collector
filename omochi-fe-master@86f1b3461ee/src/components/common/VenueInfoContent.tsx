import { Typography, Tag } from "antd";
import "@/components/common/ConfirmLogoutModal.css";
import { useTranslation } from "react-i18next";
import { IconBooking, IconLocation, IconPhone } from "@/assets/icons";
import { VenueDetail } from "@/generated/api";
import {
  getEnabledOrderTypeOptions,
  isEmpty,
  formatDate,
  formatPhoneNumberJP,
} from "@/utils/helper";
import defaultImage from "@/assets/images/default-image.png";
import { ASPECT_RATIO_IMAGE } from "@/utils/constants";

const { Title, Text } = Typography;

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const BaseContactContent = ({
  icon,
  content = "",
}: {
  icon: IconType;
  content?: string;
}) => {
  const IconComponent = icon;
  return (
    <div className="flex gap-2">
      <IconComponent className="!text-white w-4 h-4 min-w-4 min-h-4" />

      <Text className="text-xs-white">{content}</Text>
    </div>
  );
};

const TagStoreInfo = ({ label }: { label: string }) => {
  return (
    <Tag
      color="#383838"
      className="!h-[26px] !rounded-lg text-xs-white !flex items-center !me-[0px]"
    >
      {label}
    </Tag>
  );
};

interface VenueInfoContentProps {
  venueInfo?: VenueDetail | null;
  headingLevel?: 1 | 2; // Allow control of heading level for SEO (H1 for main page, H2 for modal)
}

const VenueInfoContent: React.FC<VenueInfoContentProps> = ({
  venueInfo = null,
  headingLevel = 1, // Default to H1 for main page usage
}) => {
  const { t } = useTranslation();
  if (isEmpty(venueInfo)) return null;

  const {
    name = "",
    address = "",
    description = "",
    phone_number = "",
    opening_time = "",
    closing_time = "",
    enable_eat_in = false,
    enable_take_out = false,
    enable_reservation = false,
    logo = "",
    genre = "",
    additional_info = "",
  } = venueInfo || {};

  const hasEatIn = enable_eat_in || enable_reservation || false;

  const orderTypesEnabled = getEnabledOrderTypeOptions({
    enable_eat_in: hasEatIn,
    enable_take_out,
  });
  const openingTimeConverted = opening_time ? formatDate(opening_time) : "--";
  const closingTimeConverted = closing_time ? formatDate(closing_time) : "--";
  const additionalInfoConverted = additional_info
    ? additional_info.split(",")
    : [];
  return (
    <div className="flex-col-center gap-4">
      <img
        src={logo || defaultImage}
        alt={`${name || "Venue"} logo`}
        title={`${name || "Venue"} logo`}
        className="w-full object-cover rounded-[9px]"
        style={{ aspectRatio: ASPECT_RATIO_IMAGE.VENUE }}
        fetchPriority="high"
        onError={(e) => {
          const target = e.currentTarget;
          target.onerror = null;
          target.src = defaultImage;
        }}
      />

      <div className="flex flex-col gap-[10px] w-full">
        <div className="flex items-center justify-between gap-2">
          <Title level={headingLevel} className="text-base-white !font-bold">
            {name}
          </Title>
          {genre && (
            <Tag
              color="#32ADE6"
              className="!rounded-xl text-xs-white !font-bold !h-[19px] !me-[0px] !flex items-center"
            >
              {genre}
            </Tag>
          )}
        </div>
        <div
          className="text-xs-white !whitespace-pre-wrap word-break"
          dangerouslySetInnerHTML={{ __html: description }}
        />
        <BaseContactContent icon={IconLocation} content={address} />
        <BaseContactContent
          icon={IconPhone}
          content={formatPhoneNumberJP(phone_number || "")}
        />
        <BaseContactContent
          icon={IconBooking}
          content={`${openingTimeConverted} ～ ${closingTimeConverted}`}
        />

        <div className="flex flex-col gap-[10px]">
          <Title level={2} className="text-xs-white !m-0 !mb-0 !font-normal">
            {t("order.label.order_method_label_other")}
          </Title>
          <div className="flex items-center flex-wrap gap-2">
            {orderTypesEnabled?.map((method) => {
              return <TagStoreInfo key={method.flag} label={t(method.label)} />;
            })}
          </div>
        </div>

        {!isEmpty(additionalInfoConverted) && (
          <div className="flex flex-col gap-[10px]">
            <Title level={2} className="text-xs-white !m-0 !mb-0 !font-normal">
              {t("order.label.additional_info_label")}
            </Title>

            <div className="flex items-center flex-wrap gap-2">
              {additionalInfoConverted?.map((method: string, index: number) => (
                <TagStoreInfo key={index} label={method} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueInfoContent;
