import { useState } from "react";
import { Button } from "antd";
import ConfirmLogoutModal from "./ConfirmLogoutModal";
import { IconLogout } from "@/assets/icons";

interface LogoutButtonProps {
  className?: string;
  buttonText?: string;
  urlRedirect: string;
}

const LogoutButton = ({ className, urlRedirect }: LogoutButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const hideModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        type="text"
        className={`!w-[46px] !h-[46px] !min-w-[46px] !min-h-[46px] !outline-none !flex !items-center !justify-center !bg-[#757575] !border-none !rounded-lg ${className}`}
        style={{ height: "unset" }}
        onClick={showModal}
      >
        <IconLogout className="!w-[22px] !h-[22px] min-w-[22px] min-h-[22px] object-contain !text-white" />
      </Button>

      <ConfirmLogoutModal
        isOpen={isModalOpen}
        onClose={hideModal}
        urlRedirect={urlRedirect}
      />
    </>
  );
};

export default LogoutButton;
