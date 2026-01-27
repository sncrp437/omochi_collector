import { Modal, Button } from "antd";
import { useTranslation } from "react-i18next";

interface BaseModalConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  handleConfirm: () => void;
  icon?: React.ReactNode;
  message?: string | React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  fixedWidthButton?: boolean;
  classNameButtonContainer?: string;
  loading?: boolean;
}

const BaseModalConfirm: React.FC<BaseModalConfirmProps> = (props) => {
  const { t } = useTranslation();

  const {
    isOpen,
    onClose,
    handleConfirm,
    icon,
    message = "",
    cancelText = t("general.no"),
    confirmText = t("general.yes"),
    fixedWidthButton = false,
    classNameButtonContainer = "",
    loading = false,
  } = props;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width={327}
      className="!w-full !max-w-[500px] !p-6"
      closeIcon={false}
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
      zIndex={9999}
      maskClosable={false}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        {icon}

        <div className="w-full text-center text-sm-white !font-bold flex-col-center gap-1">
          {message}
        </div>

        <div className={`flex w-full gap-[22px] ${classNameButtonContainer}`}>
          <Button
            className="!flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmText}
          </Button>
          <Button
            className={`!h-[40px] !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center ${
              !fixedWidthButton ? "!flex-1" : ""
            }`}
            onClick={onClose}
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BaseModalConfirm;
