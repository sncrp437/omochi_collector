import React from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";

interface QrModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm?: (hasQR: boolean) => void;
}

const QrModal: React.FC<QrModalProps> = ({ isVisible, onClose, onConfirm }) => {
  const { t } = useTranslation();

  const handleResponse = (hasQR: boolean) => {
    if (onConfirm) {
      onConfirm(hasQR);
    }
    onClose();
  };

  return (
    <Modal
      open={isVisible}
      onCancel={onClose}
      footer={null}
      centered
      width={327}
      className="qr-modal"
      styles={{
        body: { padding: 0 },
        content: { backgroundColor: "#272525", borderRadius: "16px" },
      }}
      maskClosable={false}
      closable={false}
    >
      <div className="!bg-[#272525] !rounded-2xl !p-6 !flex !flex-col !items-center !gap-6">
        {/* QR Code Icon */}
        <div className="!flex !items-center !justify-center">
          <div className="!w-[120px] !h-[120px] !rounded-lg !flex !items-center !justify-center">
            <svg
              width="97"
              height="97"
              viewBox="0 0 97 97"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M52.5 16.5C52.5 14.2909 50.7091 12.5 48.5 12.5C46.2909 12.5 44.5 14.2909 44.5 16.5H52.5ZM44.5 20.5C44.5 22.7091 46.2909 24.5 48.5 24.5C50.7091 24.5 52.5 22.7091 52.5 20.5H44.5ZM72.5 60.5C70.2909 60.5 68.5 62.2909 68.5 64.5C68.5 66.7091 70.2909 68.5 72.5 68.5V60.5ZM80.5 68.5C82.7091 68.5 84.5 66.7091 84.5 64.5C84.5 62.2909 82.7091 60.5 80.5 60.5V68.5ZM48.5 64.5V60.5C46.2909 60.5 44.5 62.2909 44.5 64.5H48.5ZM56.5 68.5C58.7091 68.5 60.5 66.7091 60.5 64.5C60.5 62.2909 58.7091 60.5 56.5 60.5V68.5ZM44.5 80.5C44.5 82.7091 46.2909 84.5 48.5 84.5C50.7091 84.5 52.5 82.7091 52.5 80.5H44.5ZM52.5 36.5C52.5 34.2909 50.7091 32.5 48.5 32.5C46.2909 32.5 44.5 34.2909 44.5 36.5H52.5ZM48.5 48.5H44.5C44.5 50.7091 46.2909 52.5 48.5 52.5V48.5ZM64.5 76.5C62.2909 76.5 60.5 78.2909 60.5 80.5C60.5 82.7091 62.2909 84.5 64.5 84.5V76.5ZM80.5 84.5C82.7091 84.5 84.5 82.7091 84.5 80.5C84.5 78.2909 82.7091 76.5 80.5 76.5V84.5ZM16.5 44.5C14.2909 44.5 12.5 46.2909 12.5 48.5C12.5 50.7091 14.2909 52.5 16.5 52.5V44.5ZM32.5 52.5C34.7091 52.5 36.5 50.7091 36.5 48.5C36.5 46.2909 34.7091 44.5 32.5 44.5V52.5ZM48.54 52.5C50.7491 52.5 52.54 50.7091 52.54 48.5C52.54 46.2909 50.7491 44.5 48.54 44.5V52.5ZM64.54 52.5C66.7491 52.5 68.54 50.7091 68.54 48.5C68.54 46.2909 66.7491 44.5 64.54 44.5V52.5ZM80.5 44.5C78.2909 44.5 76.5 46.2909 76.5 48.5C76.5 50.7091 78.2909 52.5 80.5 52.5V44.5ZM80.54 52.5C82.7491 52.5 84.54 50.7091 84.54 48.5C84.54 46.2909 82.7491 44.5 80.54 44.5V52.5ZM20.5 16.5V20.5H28.5V16.5V12.5H20.5V16.5ZM32.5 20.5H28.5V28.5H32.5H36.5V20.5H32.5ZM28.5 32.5V28.5H20.5V32.5V36.5H28.5V32.5ZM16.5 28.5H20.5V20.5H16.5H12.5V28.5H16.5ZM20.5 32.5V28.5H16.5H12.5C12.5 32.9183 16.0817 36.5 20.5 36.5V32.5ZM32.5 28.5H28.5V32.5V36.5C32.9183 36.5 36.5 32.9183 36.5 28.5H32.5ZM28.5 16.5V20.5H32.5H36.5C36.5 16.0817 32.9183 12.5 28.5 12.5V16.5ZM20.5 16.5V12.5C16.0817 12.5 12.5 16.0817 12.5 20.5H16.5H20.5V16.5ZM68.5 16.5V20.5H76.5V16.5V12.5H68.5V16.5ZM80.5 20.5H76.5V28.5H80.5H84.5V20.5H80.5ZM76.5 32.5V28.5H68.5V32.5V36.5H76.5V32.5ZM64.5 28.5H68.5V20.5H64.5H60.5V28.5H64.5ZM68.5 32.5V28.5H64.5H60.5C60.5 32.9183 64.0817 36.5 68.5 36.5V32.5ZM80.5 28.5H76.5V32.5V36.5C80.9183 36.5 84.5 32.9183 84.5 28.5H80.5ZM76.5 16.5V20.5H80.5H84.5C84.5 16.0817 80.9183 12.5 76.5 12.5V16.5ZM68.5 16.5V12.5C64.0817 12.5 60.5 16.0817 60.5 20.5H64.5H68.5V16.5ZM20.5 64.5V68.5H28.5V64.5V60.5H20.5V64.5ZM32.5 68.5H28.5V76.5H32.5H36.5V68.5H32.5ZM28.5 80.5V76.5H20.5V80.5V84.5H28.5V80.5ZM16.5 76.5H20.5V68.5H16.5H12.5V76.5H16.5ZM20.5 80.5V76.5H16.5H12.5C12.5 80.9183 16.0817 84.5 20.5 84.5V80.5ZM32.5 76.5H28.5V80.5V84.5C32.9183 84.5 36.5 80.9183 36.5 76.5H32.5ZM28.5 64.5V68.5H32.5H36.5C36.5 64.0817 32.9183 60.5 28.5 60.5V64.5ZM20.5 64.5V60.5C16.0817 60.5 12.5 64.0817 12.5 68.5H16.5H20.5V64.5ZM48.5 16.5H44.5V20.5H48.5H52.5V16.5H48.5ZM72.5 64.5V68.5H80.5V64.5V60.5H72.5V64.5ZM48.5 64.5V68.5H56.5V64.5V60.5H48.5V64.5ZM48.5 64.5H44.5V80.5H48.5H52.5V64.5H48.5ZM48.5 36.5H44.5V48.5H48.5H52.5V36.5H48.5ZM64.5 80.5V84.5H80.5V80.5V76.5H64.5V80.5ZM16.5 48.5V52.5H32.5V48.5V44.5H16.5V48.5ZM48.5 48.5V52.5H48.54V48.5V44.5H48.5V48.5ZM80.5 48.5V52.5H80.54V48.5V44.5H80.5V48.5ZM48.5 48.5V52.5H64.54V48.5V44.5H48.5V48.5Z"
                fill="white"
              />
            </svg>
          </div>
        </div>

        {/* Text Content */}
        <div className="!w-[279px]">
          <p className="!text-white !text-sm !font-bold !leading-[1.2] !text-left !m-0">
            {t("qr_modal.title")}
            <br />
            <br />
            <span className="text-[var(--primary-color)]">#omochi</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="!w-[279px] !h-[40px] !flex !gap-[22px]">
          <button
            onClick={() => handleResponse(false)}
            className="!flex-1 !h-full !border !border-white !rounded-xl !bg-transparent hover:!bg-transparent !text-white !text-sm !font-bold !cursor-pointer !flex !items-center !justify-center !transition-colors hover:!text-[#272525]"
          >
            <span className="!text-white">{t("qr_modal.no")}</span>
          </button>
          <button
            onClick={() => handleResponse(true)}
            className="!flex-1 !h-full !border !border-white !rounded-xl !bg-transparent hover:!bg-transparent !text-white !text-sm !font-bold !cursor-pointer !flex !items-center !justify-center !transition-colors hover:!text-[#272525]"
          >
            <span className="!text-white">{t("qr_modal.yes")}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default QrModal;
