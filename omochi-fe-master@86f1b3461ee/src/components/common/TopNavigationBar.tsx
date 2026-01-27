import { useState } from "react";
import { Button, Typography } from "antd";
import BackButton from "@/components/common/BackButton";
import { IconInfoCircle } from "@/assets/icons";
import UserGuideModal from "@/components/common/modal/UserGuideModal";
import LanguageSwitcher from "@/components/common/language/LanguageSwitcher";

const { Text } = Typography;

interface TopNavigationBarProps {
  title: string;
  onBack?: () => void;
  children?: React.ReactNode;
  hasRightIcons?: boolean;
  needUserGuide?: boolean;
  hasLanguageSwitcher?: boolean;
  hiddenBackButton?: boolean;
  customBackIcon?: React.ReactNode;
}

const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  title,
  onBack = () => {},
  children = null,
  hasRightIcons = false,
  needUserGuide = false,
  hasLanguageSwitcher = false,
  hiddenBackButton = false,
  customBackIcon,
}) => {
  const [openUserGuide, setOpenUserGuide] = useState(false);

  return (
    <>
      <div
        className={`z-10 !sticky top-0 !bg-[var(--background-color)] !w-full !flex !items-center !px-4 ${
          hasRightIcons ? "justify-between !py-0" : "!py-2"
        }`}
      >
        {!hiddenBackButton && (
          <div className={hasRightIcons ? "relative" : "!absolute !left-4"}>
            {customBackIcon ? (
            <Button
              type="text"
              className="flex-row-center !bg-[var(--background-color)] !rounded-full !border-none !outline-none !w-10 !h-10 !p-2.5"
              onClick={onBack}
            >
              {customBackIcon}
            </Button>
          ) : (
            <BackButton onClick={onBack} />
            )}
        </div>
        )}
        <div className="!w-full !flex !justify-center">
          <Text className="!text-white !text-[16px] !font-bold !font-['Noto_Sans_JP']">
            {title}
          </Text>
        </div>
        <div className="flex-row-center gap-4 h-full">
          <div className="flex-row-center h-full">
            {hasLanguageSwitcher && <LanguageSwitcher />}
            {needUserGuide && (
              <Button
                type="text"
                className="!p-1 !flex !items-center !justify-center !bg-transparent !border-none !outline-none !min-w-10 !h-full"
                onClick={() => setOpenUserGuide(true)}
              >
                <img
                  src={IconInfoCircle}
                  alt="Icon Info"
                  className="object-contain w-5 h-5 min-w-5 min-h-5"
                />
              </Button>
            )}
          </div>
          {children}
        </div>
      </div>

      {openUserGuide && (
        <UserGuideModal
          isOpen={openUserGuide}
          onClose={() => {
            setOpenUserGuide(false);
          }}
        />
      )}
    </>
  );
};

export default TopNavigationBar;
