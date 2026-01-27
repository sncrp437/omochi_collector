import { Modal, Button, Typography } from "antd";
import { useTranslation } from "react-i18next";
import TermsOfServiceContent from "@/components/common/TermsOfServiceContent";

const { Text } = Typography;

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose,
}) => {
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
          padding: "16px",
        },
        mask: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
      className="!w-full !max-w-[500px] !p-6"
      zIndex={9999}
      maskClosable={false}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <Text className="text-base-white !font-bold !text-center">
          {t("policy.terms_title")}
        </Text>

        <div className="flex flex-col w-full gap-6">
          <TermsOfServiceContent />
        </div>

        {/* Bottom Button */}
        <div className="z-10 !flex !justify-center !sticky !bottom-0 !left-0 !right-0 !mx-auto !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            type="text"
            style={{ height: "unset" }}
            className="!flex-1 !h-10 !min-h-10 !max-h-10 !bg-transparent !hover:text-white !outline-none !border !border-white !rounded-xl flex-row-center"
            onClick={onClose}
          >
            <Text className="text-sm-white !font-bold">
              {t("general.close")}
            </Text>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TermsOfServiceModal;
