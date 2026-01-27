import Card from "antd/es/card/Card";
import { CardProps } from "antd/es/card/Card";
import defaultImage from "@/assets/images/default-image.png";
import { ASPECT_RATIO_IMAGE } from "@/utils/constants";

interface BaseCardHorizontalProps extends CardProps {
  srcImg?: string | null;
  title?: string | null;
  children: React.ReactNode;
  defaultImg?: string | null;
  onClick?: () => void;
  aspectRatio?: number;
}

const BaseCardHorizontal: React.FC<BaseCardHorizontalProps> = ({
  srcImg,
  title,
  children,
  defaultImg = defaultImage,
  onClick,
  aspectRatio = ASPECT_RATIO_IMAGE.VENUE,
  ...rest
}) => {
  return (
    <Card
      hoverable
      variant="borderless"
      className="!bg-[var(--card-background-color)] !rounded-2xl hover:!bg-[#404040]"
      styles={{
        body: {
          padding: "10px",
          overflowX: "hidden",
        },
      }}
      {...rest}
      onClick={onClick}
    >
      <div className="flex gap-2 w-full">
        {srcImg && (
          <div className="w-[35%] min-w-[35%] max-w-[180px] rounded-lg flex items-center justify-center">
            <img
              src={srcImg}
              alt="Store Image"
              title={title || ""}
              className="!object-cover rounded-lg w-full"
              style={{ aspectRatio }}
              fetchPriority="high"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                if (defaultImg) {
                  target.src = defaultImg;
                }
              }}
            />
          </div>
        )}
        {children}
      </div>
    </Card>
  );
};

export default BaseCardHorizontal;
