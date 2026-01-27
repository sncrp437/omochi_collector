import { CardProps } from "antd/es/card/Card";
import defaultImage from "@/assets/images/default-image.png";
import BaseCardInfo from "./BaseCardInfo";

interface BaseCardVerticalProps extends CardProps {
  srcImg?: string | null;
  children: React.ReactNode;
  defaultImg?: string | null;
  onClick?: () => void;
  aspectRatio?: string;
}

const BaseCardVertical: React.FC<BaseCardVerticalProps> = ({
  srcImg,
  children,
  defaultImg = defaultImage,
  onClick,
  aspectRatio = "aspect-[3/2]",
  ...rest
}) => {
  return (
    <BaseCardInfo {...rest} onClick={onClick}>
      <div className="flex flex-col gap-4 w-full">
        {srcImg && (
          <div className="w-full rounded-[9px] flex-row-center">
            <img
              src={srcImg}
              alt="Menu Item Image"
              className={`!object-cover rounded-[9px] w-full ${aspectRatio}`}
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
    </BaseCardInfo>
  );
};

export default BaseCardVertical;
