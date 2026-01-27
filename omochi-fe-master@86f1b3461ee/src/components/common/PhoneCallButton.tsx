import { Typography, Button } from "antd";
import { IconPhone } from "@/assets/icons";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface PhoneCallButtonProps {
  phoneNumber: string;
  className?: string;
  disabled?: boolean;
}

const PhoneCallButton: React.FC<PhoneCallButtonProps> = ({
  phoneNumber,
  className = "",
  disabled = false,
}) => {
  const { t } = useTranslation();
  // Format phone number for tel: link (remove formatting characters)
  const telPhoneNumber = phoneNumber.replace(/[-\s()]/g, "");

  const handleCall = () => {
    if (!disabled && phoneNumber) {
      window.location.href = `tel:${telPhoneNumber}`;
    }
  };

  return (
    <Button
      type="text"
      className={`w-full flex-1 !flex !items-center !justify-center !gap-2 !h-10 !max-h-10 !min-h-10 !border-none !rounded-xl !px-4 !outline-none ${
        disabled
          ? "button-disabled"
          : "!bg-[var(--background-teal-color)] !text-white"
      } ${className}`}
      style={{ height: "unset" }}
      onClick={handleCall}
      disabled={disabled}
    >
      <IconPhone
        className={`w-5 h-5 min-w-5 min-h-5 ${disabled ? "" : "!text-white"}`}
      />
      <Text className={`text-sm-white !m-0 ${disabled ? "" : "text-sm-white"}`}>
        {t("order.label.phone_reservation_label")}
      </Text>
    </Button>
  );
};

export default PhoneCallButton;
