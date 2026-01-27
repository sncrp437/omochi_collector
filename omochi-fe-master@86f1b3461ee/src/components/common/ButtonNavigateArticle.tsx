import { Button, Typography } from "antd";
import { Trans } from "react-i18next";
import { IconStockVenue, IconArrowRight } from "@/assets/icons";
import { ROUTE_PATH } from "@/utils/constants";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const ButtonNavigateArticle: React.FC = () => {
  const navigate = useNavigate();
  const handleNavigateArticle = () => {
    navigate(`/${ROUTE_PATH.ARTICLE}`);
  };

  return (
    <Button
      className="!w-[250px] !rounded-xl !h-12 !border-none flex-row-between !outline-none !bg-[var(--background-dark-blue-color)]"
      onClick={handleNavigateArticle}
    >
      <div className="flex-row-center">
        <IconStockVenue className="!w-6 !h-6 !text-white" />
      </div>
      <div className="flex-col-center">
        <Trans
          i18nKey="introduction.venue_recommended_label"
          components={[
            <Text className="text-xs-white !font-bold" />,
            <Text className="text-xs-white !font-bold" />,
          ]}
        />
      </div>
      <div className="flex-row-center">
        <IconArrowRight className="!w-6 !h-6 !text-white" />
      </div>
    </Button>
  );
};

export default ButtonNavigateArticle;
