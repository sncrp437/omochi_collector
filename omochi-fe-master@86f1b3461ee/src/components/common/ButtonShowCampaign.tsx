import { Button, Typography } from "antd";
import { IconSparkle } from "@/assets/icons";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface ButtonShowCampaignProps {
  className?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ButtonShowCampaign = ({
  className,
  onClick,
  ...props
}: ButtonShowCampaignProps) => {
  const { t } = useTranslation();

  return (
    <Button
      className={`!border !border-[var(--background-teal-color)] !outline-none !px-[10px] flex-row-center !bg-[var(--background-teal-color)] !h-6 !min-h-6 !rounded-[50px] !gap-[6px] ${className}`}
      onClick={onClick}
      {...props}
    >
      <IconSparkle className="!w-4 !h-4 !min-w-4 !min-h-4 !fill-white !text-white" />
      <Text className="!text-[10px] font-family-base !font-bold !text-white !leading-[1.2em]">
        {t("campaign.button_show_campaign_label")}
      </Text>
    </Button>
  );
};

export default ButtonShowCampaign;
