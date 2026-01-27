import { Modal, Button } from "antd";
import { useTranslation } from "react-i18next";

interface BaseModalNoticeProps {
  message: string | React.ReactNode;
  isModalOpen: boolean;
  onClose: () => void;
  loading?: boolean;
  variant?: "primary" | "transparent";
}

const BaseModalNotice: React.FC<BaseModalNoticeProps> = ({
  message,
  isModalOpen,
  onClose,
  loading = false,
  variant = "primary",
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={isModalOpen}
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
      maskClosable={false}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="w-full text-sm-white !font-bold flex flex-col gap-1">
          {message}
        </div>
        <div className="flex w-full">
          <Button
            className={`!flex-1 !h-[40px] !outline-none !rounded-xl text-sm-white !font-bold flex items-center justify-center ${
              variant === "primary"
                ? "!bg-[var(--primary-color)] !border-none"
                : "!bg-transparent !border !border-white"
            }`}
            onClick={onClose}
            loading={loading}
          >
            {t("general.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BaseModalNotice;
