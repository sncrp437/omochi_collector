import { Modal, Button, Typography } from "antd";
import { Trans, useTranslation } from "react-i18next";

const { Text } = Typography;

interface AlcoholConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  loading?: boolean;
}

const AlcoholConfirmationModal: React.FC<AlcoholConfirmationModalProps> = (
  props
) => {
  const { t } = useTranslation();

  const {
    isOpen,
    onClose,
    handleConfirm,
    cancelText = t("general.no"),
    confirmText = t("general.yes"),
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
        <div className="flex flex-col gap-4">
          <Text className="text-sm-white !font-bold">
            {t("order.label.alcohol_confirmation_label")}
          </Text>

          <div>
            <Text className="text-sm-white">
              {t("order.label.alcohol_confirmation_sublabel")}
            </Text>

            <div className="flex flex-col gap-4">
              <Trans
                i18nKey="order.content.alcohol_confirmation_content"
                components={[
                  <Text className="text-sm-white" />,
                  <Text className="text-sm-white" />,
                  <Text className="text-sm-white" />,
                ]}
              />
            </div>
          </div>

          <Text className="!text-[14px] !font-bold !font-['Noto_Sans_JP'] !text-[var(--primary-color)] !leading-[1.2em]">
            {t("order.content.alcohol_confirmation_age")}
          </Text>
        </div>

        <div className="flex w-full gap-[22px]">
          <Button
            className={`!flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center`}
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            className="!flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AlcoholConfirmationModal;
