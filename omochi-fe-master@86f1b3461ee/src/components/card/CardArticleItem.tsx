import BaseCardVertical from "@/components/card/BaseCardVertical";
import { ArticleList } from "@/generated/api";
import { ROUTE_PATH } from "@/utils/constants";
import defaultImage from "@/assets/images/default-image.png";
import { useNavigate } from "react-router-dom";
import { Button, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { memo, useCallback } from "react";

const { Text } = Typography;

interface CardArticleItemProps extends ArticleList {
  onSaveState?: () => void;
}

const CardArticleItem: React.FC<CardArticleItemProps> = memo((props) => {
  const { title, description, seo_image_url, id, onSaveState } = props;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleOpenArticleDetail = useCallback(() => {
    if (!id) {
      console.error("Article ID is required");
      return;
    }
    // Save state before navigation
    if (onSaveState) {
      onSaveState();
    }
    navigate(`/${ROUTE_PATH.ARTICLE}/${id}`);
  }, [id, onSaveState, navigate]);

  return (
    <BaseCardVertical
      srcImg={seo_image_url || defaultImage}
      onClick={handleOpenArticleDetail}
      aspectRatio="aspect-[4/3]"
      styles={{
        body: {
          padding: "10px",
        },
      }}
    >
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-[10px] w-full">
          <Text className="text-base-white !font-bold">{title}</Text>
          <div
            className="text-xs-white !whitespace-pre-wrap word-break"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>

        <Button
          type="text"
          style={{ height: "unset" }}
          className="!flex-1 !h-10 !min-h-10 !max-h-10 !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex-row-center"
          aria-label="View detail"
          role="button"
        >
          <Text className="text-sm-white !font-bold">
            {t("general.learn_more")}
          </Text>
        </Button>
      </div>
    </BaseCardVertical>
  );
});

export default CardArticleItem;
