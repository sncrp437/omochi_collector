import { Modal, Button, Typography, Tag } from "antd";
import "@/components/common/ConfirmLogoutModal.css";
import { useTranslation } from "react-i18next";
import defaultImage from "@/assets/images/default-image.png";
import { MenuItem } from "@/generated/api";
import { ASPECT_RATIO_IMAGE } from "@/utils/constants";

const { Text } = Typography;

interface MenuItemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItemInfo?: MenuItem | null;
}

const MenuItemInfoModal: React.FC<MenuItemInfoModalProps> = ({
  isOpen,
  onClose,
  menuItemInfo = null,
}) => {
  const { t } = useTranslation();
  const {
    name = "",
    description = "",
    category_name = "",
    image = "",
  } = menuItemInfo || {};

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
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <img
          src={image || defaultImage}
          alt="Image Menu Item"
          title={`${name || "Menu Item"} image`}
          className="w-full object-cover rounded-[9px]"
          style={{ aspectRatio: ASPECT_RATIO_IMAGE.MENU_ITEM }}
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = defaultImage;
          }}
        />
        <div className="flex flex-col gap-[10px] w-full">
          <div className="flex items-center justify-between">
            <Text className="text-base-white !font-bold">{name}</Text>
            {category_name && (
              <Tag
                color="var(--tag-color)"
                className="!rounded-xl text-xs-white !font-bold !h-[19px] !me-[0px] !flex items-center"
              >
                {category_name}
              </Tag>
            )}
          </div>
          <Text className="text-xs-white !whitespace-pre-wrap">
            {description}
          </Text>
        </div>

        <div className="flex w-full">
          <Button
            className="!flex-1 !h-[40px] !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={onClose}
          >
            {t("general.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MenuItemInfoModal;
