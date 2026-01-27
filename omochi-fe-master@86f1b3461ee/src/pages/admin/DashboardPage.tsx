import { Typography } from "antd";
import { useNavigate } from "react-router-dom";

import LogoutButton from "../../components/common/LogoutButton";
import { ROUTE_PATH, VENUE_ROLE } from "../../utils/constants";
import { Trans, useTranslation } from "react-i18next";
import {
  IconOrderList,
  IconCapacityControl,
  IconMenuManagement,
  IconClockComponent,
  IconVenueSetting,
} from "@/assets/icons";
import { useEffect, useState } from "react";
import { useNotificationChecker } from "@/hooks/useNotificationChecker";
import { useCookies } from "react-cookie";
import BaseModalConfirm from "@/components/common/modal/BaseModalConfirm";
import {
  unlockAudioForMobile,
  shouldShowAudioUnlockModal,
  preloadNotificationSounds,
} from "@/utils/notificationSound";
import ActivateInteractModal from "@/components/common/modal/ActivateInteractModal";

const { Text } = Typography;

const DashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [notificationCookies, setNotificationCookie] = useCookies([
    "notification-permission-asked",
  ]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showSoundModal, setShowSoundModal] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [soundLoading, setSoundLoading] = useState(false);

  const { requestPermission } = useNotificationChecker({
    enabled: true,
    typeNotification: VENUE_ROLE,
  });

  // Check if Notification API is available
  const isNotificationSupported = () => {
    return typeof window !== "undefined" && "Notification" in window;
  };

  // Get current notification permission
  const getNotificationPermission = () => {
    if (!isNotificationSupported()) return "unsupported";
    return Notification.permission;
  };

  // Check and request permission if not asked before
  useEffect(() => {
    // If already asked before, don't show modal again
    if (notificationCookies["notification-permission-asked"]) return;

    // If push notifications are not supported, don't ask for permission
    // But toast and audio will still work
    if (!isNotificationSupported()) {
      console.warn(
        "Push notifications not supported on this device, but toast and audio will work normally"
      );
      return;
    }

    const checkPermission = async () => {
      const permission = getNotificationPermission();

      if (permission === "default") {
        const timer = setTimeout(() => {
          setShowPermissionModal(true);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        await requestPermission();
      }
    };

    checkPermission();
  }, [notificationCookies]);

  // Check and request sound permission for Mobile
  useEffect(() => {
    const checkAudioUnlockNeeded = async () => {
      // Simple check: if shouldShowAudioUnlockModal returns true, show modal
      const shouldShow = shouldShowAudioUnlockModal();

      if (shouldShow) {
        setShowSoundModal(true);
      } else {
        // Preload audio files when modal not needed (likely already unlocked)
        try {
          await preloadNotificationSounds(VENUE_ROLE);
        } catch (error) {
          console.warn("Audio preload failed:", error);
        }
      }
    };

    checkAudioUnlockNeeded();
  }, []);

  // Handle notification permission request confirm
  const handlePermissionConfirm = async () => {
    setPermissionLoading(true);
    try {
      await requestPermission();
      setShowPermissionModal(false);
      // Mark as asked
      setNotificationCookie("notification-permission-asked", "true", {
        path: "/",
      });
    } catch (error) {
      console.error("Error requesting push notification permission:", error);
    } finally {
      setPermissionLoading(false);
      setShowPermissionModal(false);
    }
  };

  // Handle permission request cancel (No)
  const handlePermissionCancel = () => {
    setShowPermissionModal(false);
    // Mark as asked even if declined
    setNotificationCookie("notification-permission-asked", "true", {
      path: "/",
    });
  };

  const handleNavigateVenue = (path: string) => {
    navigate(`/${ROUTE_PATH.VENUE.DASHBOARD}/${path}`);
  };

  // Handle sound permission request confirm (Yes)
  const handleSoundConfirm = async () => {
    setSoundLoading(true);

    try {
      // Simple direct call - no multiple strategies
      await unlockAudioForMobile();
      setShowSoundModal(false);
    } catch (error) {
      console.error("Error enabling sound:", error);
      setShowSoundModal(false);
    } finally {
      setSoundLoading(false);
    }
  };

  return (
    <div className="!flex !flex-col !h-[100dvh] max-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <div className="!w-full !flex !items-center !justify-center !px-4 !py-2 relative text-center">
        <Text className="text-home-label-base">{t("home.home_title")}</Text>
      </div>

      {/* Main Content */}
      <div className="!flex-1 !flex !item-center !justify-center !px-6 pt-4 !pb-[55px] scrollbar-hidden overflow-y-auto">
        <div className="!w-full !flex !flex-col !gap-4 !flex-1 scrollbar-hidden overflow-y-auto scroll-smooth m-[auto]">
          {/* Order status list */}
          <div
            className="!w-full !bg-[#FFCC00] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
            onClick={() => {
              // Request permission in background
              requestPermission().catch((error) => {
                console.error(
                  "Error requesting notification permission:",
                  error
                );
              });

              handleNavigateVenue(ROUTE_PATH.VENUE.ORDERS);
            }}
          >
            <IconOrderList className="!w-12 !h-12 !text-white" />
            <div className="!w-full !flex !items-center !justify-center">
              <Text className="text-home-label-base">
                {t("venue.title.order_status_list_title")}
              </Text>
            </div>
          </div>

          {/* Capacity control and Venue setting */}
          <div className="!w-full !flex !gap-4">
            <div
              className="!flex-1 !bg-[var(--dark-blue-color)] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
              onClick={() =>
                handleNavigateVenue(ROUTE_PATH.VENUE.CAPACITY_CONTROL)
              }
            >
              <IconCapacityControl className="!w-12 !h-12 !text-white" />
              <div className="!w-full !flex !items-center !justify-center">
                <Text className="text-home-label-base">
                  {t("venue.title.capacity_control_title")}
                </Text>
              </div>
            </div>
            <div
              className=" !w-[100px] !bg-[var(--tag-color)] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
              onClick={() =>
                handleNavigateVenue(ROUTE_PATH.VENUE.SETTINGS_VENUE)
              }
            >
              <IconVenueSetting className="!w-12 !h-12 !text-white" />
              <div className="!w-full !flex !items-center !justify-center">
                <Text className="text-home-label-base">
                  {t("venue.title.venue_setting_title")}
                </Text>
              </div>
            </div>
          </div>

          {/* Order logs and Reserved button */}
          <div className="!w-full !flex !gap-4">
            <div
              className=" !w-[100px] !bg-[#1E8E3E] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
              onClick={() => handleNavigateVenue(ROUTE_PATH.VENUE.ORDER_LOGS)}
            >
              <IconClockComponent className="!w-12 !h-12 !text-white" />{" "}
              <div className="!w-full !flex !items-center !justify-center">
                <Text className="text-home-label-base">
                  {t("venue.title.order_logs_title")}
                </Text>
              </div>
            </div>
            <div
              className="!flex-1 !bg-[#E46962] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
              onClick={() =>
                handleNavigateVenue(ROUTE_PATH.VENUE.MENU_MANAGEMENT)
              }
            >
              <IconMenuManagement className="!w-12 !h-12 !text-white" />
              <div className="!w-full !flex !items-center !justify-center">
                <Text className="text-home-label-base">
                  {t("venue.title.menu_management_title")}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button at bottom */}
      <div className="z-10 !flex !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-6 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-6 flex-wrap">
        <LogoutButton urlRedirect={`/${ROUTE_PATH.VENUE.LOGIN}`} />
      </div>

      {/* Notification Permission Request Modal */}
      <BaseModalConfirm
        isOpen={showPermissionModal}
        onClose={handlePermissionCancel}
        handleConfirm={handlePermissionConfirm}
        icon={
          <IconOrderList className="!w-[96px] !h-[96px] object-contain !text-white" />
        }
        message={
          <Trans
            i18nKey="general.enable_notifications_venue"
            components={[
              <Text className="text-sm-white !font-bold" />,
              <Text className="text-sm-white !font-bold" />,
            ]}
          />
        }
        confirmText={t("general.yes")}
        cancelText={t("general.no")}
        loading={permissionLoading}
        classNameButtonContainer="!flex-row-reverse"
      />

      {/* Sound Permission Modal*/}
      <ActivateInteractModal
        isModalOpen={showSoundModal}
        onClose={handleSoundConfirm}
        loading={soundLoading}
      />
    </div>
  );
};

export default DashboardPage;
