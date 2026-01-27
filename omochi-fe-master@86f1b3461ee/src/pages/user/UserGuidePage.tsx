import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useLocation } from "react-router-dom";
import UserGuideContent from "@/components/common/UserGuideContent";
import { useTranslation } from "react-i18next";
import { Button, Typography } from "antd";
import { useEffect } from "react";
import { LINK_SOCIAL_MEDIA_OMOCHI } from "@/utils/constants";
import { useCustomCookies } from "@/hooks/useCustomCookies";

const { Text } = Typography;

const UserGuidePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const redirectUri = new URLSearchParams(location.search).get("redirect_uri");

  // Remove the cookie for first visit
  const [, setCookie] = useCustomCookies(["is-first-visit"]);
  useEffect(() => {
    setCookie("is-first-visit", "true");
  }, []);

  const handleNavigateButtonBottom = () => {
    if (redirectUri) {
      navigate(decodeURIComponent(redirectUri));
    } else {
      window.open(LINK_SOCIAL_MEDIA_OMOCHI.YOUTUBE, "_blank");
    }
  };

  const buttonBottomLabel = redirectUri
    ? t("order.label.back_to_order_label")
    : t("policy.social_link_label");

  return (
    <div className="!flex !flex-col !items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      {!redirectUri && (
        <TopNavigationBar
          title={t("policy.manual_title")}
          onBack={() => navigate(-1)}
        />
      )}

      {/* User Guide Content */}
      <div className="flex flex-col !w-full px-6 mt-2 gap-4 pb-[45px]">
        <UserGuideContent />
        <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            type="text"
            style={{ height: "unset" }}
            className="!flex-1 !h-10 !min-h-10 !max-h-10 !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={handleNavigateButtonBottom}
          >
            <Text className="text-sm-white !font-bold">
              {buttonBottomLabel}
            </Text>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserGuidePage;
