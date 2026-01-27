import { Typography } from "antd";
import BaseCardHorizontal from "@/components/card/BaseCardHorizontal";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATH } from "@/utils/constants";
import defaultImage from "@/assets/images/default-image.png";
import { NotificationTypeEnum } from "@/generated/api";

const { Text } = Typography;

interface CardNotificationProps {
  srcImg: string;
  storeName: string;
  message: string;
  referenceType: string;
  referenceId: string;
  typeNoti?: NotificationTypeEnum;
  time: string;
  onClick?: () => void;
}

const CardNotification: React.FC<CardNotificationProps> = ({
  srcImg,
  storeName,
  message,
  referenceType,
  referenceId,
  typeNoti,
  time,
  onClick,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const typeRedirect =
    referenceType.toLowerCase() === "order"
      ? ROUTE_PATH.USER.ORDERS
      : ROUTE_PATH.USER.RESERVATION;

  const handleRedirect = () => {
    if (typeNoti === NotificationTypeEnum.System) {
      return;
    }
    navigate(`/${ROUTE_PATH.USER.DASHBOARD}/${typeRedirect}/${referenceId}`);
  };

  const handleClick = onClick || handleRedirect;

  return (
    <BaseCardHorizontal
      srcImg={srcImg || defaultImage}
      onClick={handleClick}
    >
      <div className="flex flex-1 flex-col gap-1 pt-2">
        <Text className="text-xs-white !font-bold">{storeName}</Text>
        <Text className="text-xs-white !whitespace-pre-wrap word-break">{message}</Text>
        <Text className="text-xs-white">
          {t("general.time_label")}：{time}
        </Text>
      </div>
    </BaseCardHorizontal>
  );
};

export default CardNotification;
