import TopNavigationBar from "./common/TopNavigationBar";
import { useTranslation } from "react-i18next";
import { IconBadgeCheck } from "@/assets/icons";
import { Button, Typography } from "antd";

const { Text } = Typography;

interface UpdatePasswordSuccessfulProps {
  onButtonClick: () => void;
}

const UpdatePasswordSuccessful: React.FC<UpdatePasswordSuccessfulProps> = (
  props
) => {
  const { onButtonClick } = props;
  const { t } = useTranslation();

  return (
    <div className="!flex !flex-col !items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <TopNavigationBar
        title={t("setting.change_password_label")}
        hiddenBackButton
      />
      <div className="relative flex flex-col gap-6 w-full px-6 mt-4 flex-1 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth pb-[45px]">
        <div className="flex-col-center gap-6 h-full">
          <IconBadgeCheck className="!w-[96px] !h-[96px] !text-white" />
          <Text className="!text-xl !font-bold !text-center !text-white font-family-base !leading-[1.2em]">
            {t("setting.update_password_success")}
          </Text>
        </div>
      </div>

      <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
        <Button
          type="text"
          className="!w-full !border-none !h-10 !max-h-10 !min-h-10 !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none !bg-[var(--primary-color)] !text-white"
          style={{ height: "unset" }}
          onClick={onButtonClick}
        >
          <Text className="text-sm-white">
            {t("auth.login.redirect_login_label")}
          </Text>
        </Button>
      </div>
    </div>
  );
};

export default UpdatePasswordSuccessful;
