import { Checkbox, Typography } from "antd";
import BaseModalNotice from "./BaseModalNotice";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { setSessionStorageWithExpiry } from "@/utils/storage";
import { STORAGE_ANNOUNCEMENT_KEY } from "@/utils/constants";

const { Text } = Typography;

interface VenueAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  venueId: string;
}

const VenueAnnouncementModal: React.FC<VenueAnnouncementModalProps> = ({
  isOpen,
  onClose,
  message = "",
  venueId,
}) => {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);

  if (!message) return null;

  const handleClose = () => {
    if (checked) {
      setSessionStorageWithExpiry(`${STORAGE_ANNOUNCEMENT_KEY}_${venueId}`, {
        dontShow: true,
      });
    }
    onClose();
  };

  return (
    <BaseModalNotice
      message={
        <div className="flex flex-col gap-6">
          <div
            className="text-sm-white !font-normal !whitespace-pre-wrap word-break"
            dangerouslySetInnerHTML={{ __html: message }}
          />
          <div
            className="flex items-center gap-2 w-fit"
            onClick={() => setChecked(!checked)}
          >
            <Checkbox
              checked={checked}
              className="flex-row-between !flex-row-reverse !m-0 [&_.ant-checkbox-wrapper]:!w-full [&_.ant-checkbox-label]:!w-full [&_.ant-checkbox-label]:!p-0 checkbox-base-custom"
            />
            <Text className="text-sm-white !font-bold !whitespace-pre-wrap">
              {t("general.dont_show_again")}
            </Text>
          </div>
        </div>
      }
      isModalOpen={isOpen}
      onClose={handleClose}
      variant="transparent"
    />
  );
};

export default VenueAnnouncementModal;
