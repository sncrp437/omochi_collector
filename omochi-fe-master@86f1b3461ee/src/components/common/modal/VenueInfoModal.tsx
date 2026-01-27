import { Modal, Button } from "antd";
import "@/components/common/ConfirmLogoutModal.css";
import { useTranslation } from "react-i18next";
import { VenueDetail } from "@/generated/api";
import VenueInfoContent from "@/components/common/VenueInfoContent";

interface VenueInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueInfo?: VenueDetail | null;
}

const VenueInfoModal: React.FC<VenueInfoModalProps> = ({
  isOpen,
  onClose,
  venueInfo = null,
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
          padding: "16px",
        },
        mask: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
      closeIcon={false}
      className="!w-full !max-w-[500px] !p-6"
      maskClosable={false}
    >
      <div className="flex-col-center gap-4">
        <VenueInfoContent venueInfo={venueInfo} headingLevel={2} />

        <div className="flex w-full">
          <Button
            className="!flex-1 !h-10 !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={onClose}
          >
            {t("general.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VenueInfoModal;
