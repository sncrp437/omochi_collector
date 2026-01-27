import { VenueAffiliate } from "@/generated/api";
import { useTranslation } from "react-i18next";
import CustomTag from "@/components/common/CustomTag";
import { useMemo } from "react";
import { IconRedirect, IconInstagramColorful } from "@/assets/icons";
import { Button, Typography } from "antd";
import { IconType } from "@/types/common";
import { ROUTE_PATH, ARTICLE_FROM_PARAM } from "@/utils/constants";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

interface VenueAffiliateBoxProps {
  venueAffiliate: VenueAffiliate;
  articleId?: string;
}

interface BaseAffilidateButtonProps {
  label: string;
  icon: IconType;
  link: string | null;
  venue_id?: string;
  articleId?: string;
}

const BaseAffilidateButton: React.FC<BaseAffilidateButtonProps> = ({
  label,
  icon,
  link,
  venue_id,
  articleId,
}) => {
  const IconComponent = icon as IconType;
  const navigate = useNavigate();
  const handleClickAffilicate = () => {
    if (link) {
      window.open(link, "_blank");
    } else if (venue_id) {
      const url = `/${
        ROUTE_PATH.STORE.ROOT_STORE
      }/${venue_id}?from=${ARTICLE_FROM_PARAM}${
        articleId ? `&articleId=${articleId}` : ""
      }`;
      navigate(url);
    }
  };

  return (
    <Button
      className="flex-row-center !flex-1 !border-none !h-8 !px-8 !py-1.5 !outline-none !rounded-[6px] !relative !bg-[var(--card-background-color)]"
      onClick={handleClickAffilicate}
    >
      <div className="flex-row-center !absolute !left-3">
        <IconComponent className="!w-5 !h-5 !text-white" />
      </div>

      <Text className="text-xs-white !font-bold">{label}</Text>
    </Button>
  );
};

const VenueAffiliateBox = (props: VenueAffiliateBoxProps) => {
  const { t } = useTranslation();

  const { venueAffiliate, articleId } = props;

  const {
    title = "",
    venue_id = "",
    social_link = "",
    menu_link = "",
  } = venueAffiliate;

  const actionAffiliateButtons = useMemo(() => {
    return [
      {
        label: t("article.social_link_label"),
        icon: IconInstagramColorful,
        link: social_link,
      },
      {
        label: t("article.menu_link_label"),
        icon: IconRedirect,
        link: menu_link,
      },
    ];
  }, [menu_link, social_link, t]);

  return (
    <div className="bg-[#716F6F1A] rounded-xl p-[10px] border border-[var(--border-color)]">
      <div className="flex flex-col gap-[10px]">
        <CustomTag
          label={title}
          color="#666666"
          className="text-xs-white !font-bold !w-fit !px-3 !py-1.5"
          borderRadius="!rounded-full"
        />
        <div className="flex-row-between gap-[10px]">
          {actionAffiliateButtons.map((button) => (
            <BaseAffilidateButton
              key={button.label}
              {...button}
              venue_id={venue_id}
              articleId={articleId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VenueAffiliateBox;
