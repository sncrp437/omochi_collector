import { Typography } from "antd";
import BaseModalNotice from "@/components/common/modal/BaseModalNotice";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface ActivateInteractModalProps {
  isModalOpen: boolean;
  loading?: boolean;
  onClose: () => void;
}

const ActivateInteractModal: React.FC<ActivateInteractModalProps> = ({
  isModalOpen,
  onClose,
  loading = false,
}) => {
  const { t } = useTranslation();
  return (
    <BaseModalNotice
      isModalOpen={isModalOpen}
      onClose={onClose}
      message={
        <Text className="text-sm-white">
          {t("general.activate_interact_modal")}
        </Text>
      }
      loading={loading}
    />
  );
};

export default ActivateInteractModal;
