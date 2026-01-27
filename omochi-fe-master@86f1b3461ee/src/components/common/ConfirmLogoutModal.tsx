import { Modal, Button, Typography } from "antd";
import { useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { IconLogout } from "@/assets/icons";
import "./ConfirmLogoutModal.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  urlRedirect: string;
}

const ConfirmLogoutModal = ({
  isOpen,
  onClose,
  urlRedirect,
}: ConfirmLogoutModalProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    dispatch(logout());
    onClose();
    navigate(urlRedirect);
  };

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
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <IconLogout className="!w-[96px] !h-[96px] !min-w-[96px] !min-h-[96px] !text-white" />

        <div className="w-full text-center">
          <p className="text-sm-white !font-bold !text-center">
            {t("auth.logout.confirm_logout")}
          </p>
        </div>

        <div className="flex w-full gap-[22px]">
          <Button
            className="!flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none !border !border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={onClose}
          >
            <Text className="text-sm-white !font-bold">{t("general.no")}</Text>
          </Button>
          <Button
            className="!flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none !border !border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={handleLogout}
          >
            <Text className="text-sm-white !font-bold">{t("general.yes")}</Text>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmLogoutModal;
