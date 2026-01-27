import { Modal, Button } from "antd";
import "./ConfirmLogoutModal.css";
import { IconSave } from "@/assets/icons";
import { useTranslation } from "react-i18next";

interface ConfirmSaveInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleConfirm: () => Promise<void>;
  loading?: boolean;
}

const ConfirmSaveInfoModal = ({
  isOpen,
  onClose,
  handleConfirm,
  loading = false,
}: ConfirmSaveInfoModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closeIcon={false}
      centered
      width={327}
      styles={{
        content: {
          background: "#272525",
          borderRadius: "16px",
          padding: "24px",
        },
        mask: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
      className="!w-full !max-w-[500px] !p-6"
      zIndex={9999}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <IconSave className="w-[96px] h-[96px] !text-white" />
        <div className="w-full text-center">
          <p className="text-white text-[14px] font-bold font-['Noto_Sans_JP']">
            {t("general.confirm_save_message")}
          </p>
        </div>

        <div className="flex w-full gap-[22px]">
          <Button
            className="!flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={onClose}
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

export default ConfirmSaveInfoModal;
