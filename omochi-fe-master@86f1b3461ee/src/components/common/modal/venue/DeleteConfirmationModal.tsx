import { Modal, Button, Typography } from "antd";
import "@/components/common/ConfirmLogoutModal.css";
import { IconDelete } from "@/assets/icons";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  confirmationText: string;
  onClose: () => void;
  handleConfirm: () => void;
  loading?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  confirmationText,
  onClose,
  handleConfirm,
  loading = false,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width={327}
      styles={{
        content: {
          background: "#272525",
          borderRadius: "16px",
          padding: "24px",
        },
        mask: {
          backgroundColor: "#000000B2",
        },
      }}
      closeIcon={false}
      className="!w-full !max-w-[500px] !p-6"
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <IconDelete className="!w-24 !h-24 !min-w-24 !min-h-24 !flex-shrink-0 !text-white" />

        <div className="w-full text-center">
          <Text className="text-sm-white !font-bold">{confirmationText}</Text>
        </div>

        <div className="flex w-full gap-[22px]">
          <Button
            className="!flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={onClose}
            loading={loading}
            disabled={loading}
          >
            {t("general.no")}
          </Button>
          <Button
            className="!flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            {t("general.yes")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;
