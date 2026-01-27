import { useNavigate } from "react-router-dom";
import { Typography, Button } from "antd";
import LogoutButton from "@/components/common/LogoutButton";
import {
  CAMPAIGN_MODAL_SHOWN_KEY,
  ROUTE_PATH,
  STOCK_STORE_STATE,
  USER_ROLE,
} from "@/utils/constants";
import {
  IconQRCode,
  IconSetting,
  IconNotificationWhite,
  IconShare,
  IconInfoCircle,
  IconClockComponent,
  IconStockVenue,
  IconOrderList,
  IconLightning,
} from "@/assets/icons";
import { Trans, useTranslation } from "react-i18next";
import { useCustomCookies } from "@/hooks/useCustomCookies";
import { useEffect, useState, useCallback } from "react";
import { useNotificationChecker } from "@/hooks/useNotificationChecker";
import BaseModalConfirm from "@/components/common/modal/BaseModalConfirm";
import { fcmService } from "@/services/fcmService";
import ActivateInteractModal from "@/components/common/modal/ActivateInteractModal";
import {
  preloadNotificationSounds,
  shouldShowAudioUnlockModal,
  unlockAudioForMobile,
} from "@/utils/notificationSound";
import { useCookies } from "react-cookie";
import CampaignModal from "@/components/common/modal/CampaignModal";
import { getListCampaigns } from "@/api/campaign";
import { Campaign } from "@/generated/api";
import { getItem, setItem } from "@/utils/storage";
import LanguageSwitcher from "@/components/common/language/LanguageSwitcher";

const { Text } = Typography;

const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [cookies, setCookie] = useCustomCookies(["is-first-visit"]);
  const [notificationCookies, setNotificationCookie] = useCookies([
    "notification-permission-asked",
  ]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [showSoundModal, setShowSoundModal] = useState(false);
  const [soundLoading, setSoundLoading] = useState(false);

  // Campaign modal states
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [listCampaigns, setListCampaigns] = useState<Campaign[]>([]);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Track notification state
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  const {
    unreadCount,
    hasUnread,
    requestPermission,
    hasRecentNotificationTrigger,
  } = useNotificationChecker({
    enabled: true,
    typeNotification: USER_ROLE,
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

  // Check if campaign modal should be shown
  const shouldShowCampaignModal = useCallback(() => {
    const hasShown = getItem(CAMPAIGN_MODAL_SHOWN_KEY);
    return !hasShown;
  }, []);

  // Load campaigns and show modal if needed
  const loadCampaignsAndShowModal = useCallback(async () => {
    if (!shouldShowCampaignModal()) {
      return;
    }

    try {
      const campaigns = await getListCampaigns();
      if (campaigns?.length > 0) {
        setListCampaigns(campaigns);
        setShowCampaignModal(true);
        // Mark as shown for this session
        setItem(CAMPAIGN_MODAL_SHOWN_KEY, "true");
      }
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  }, [shouldShowCampaignModal]);

  // Handle campaign modal close
  const handleCampaignModalClose = useCallback(() => {
    setShowCampaignModal(false);
  }, []);

  // Check if other modals are showing
  const isOtherModalShowing = useCallback(() => {
    return showPermissionModal || showSoundModal;
  }, [showPermissionModal, showSoundModal]);

  // Check and show campaign modal if conditions are met
  const checkAndShowCampaignModal = useCallback(() => {
    if (
      initialCheckDone &&
      !isOtherModalShowing() &&
      shouldShowCampaignModal()
    ) {
      const timer = setTimeout(() => {
        loadCampaignsAndShowModal();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    initialCheckDone,
    isOtherModalShowing,
    shouldShowCampaignModal,
    loadCampaignsAndShowModal,
  ]);

  useEffect(() => {
    if (!cookies["is-first-visit"]) {
      setCookie("is-first-visit", "true");
    }
  }, []);

  // Process pending notifications when component mounts or becomes visible
  useEffect(() => {
    const processPendingNotifications = () => {
      fcmService.processPendingNotifications();
    };

    // Process immediately when component mounts
    processPendingNotifications();

    // Also process when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        processPendingNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Check and request permission if not asked before
  useEffect(() => {
    // If already asked before, don't show modal again
    if (notificationCookies["notification-permission-asked"]) {
      setInitialCheckDone(true);
      return;
    }

    const checkPermission = async () => {
      if (!isNotificationSupported()) {
        console.warn("Notification API not supported");
        setInitialCheckDone(true);
        return;
      }

      const permission = getNotificationPermission();

      if (permission === "default") {
        const timer = setTimeout(() => {
          setShowPermissionModal(true);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        await requestPermission();
        setInitialCheckDone(true);
      }
    };

    checkPermission();
  }, [notificationCookies]);

  // Function to check and show audio modal when conditions are met
  const checkAndShowAudioModal = useCallback(() => {
    if (audioNeedsUnlock && hasRecentNotificationTrigger) {
      setShowSoundModal(true);
    }
  }, [audioNeedsUnlock, hasRecentNotificationTrigger]);

  // Check if audio needs unlock initially
  useEffect(() => {
    const shouldShow = shouldShowAudioUnlockModal();
    setAudioNeedsUnlock(shouldShow);

    if (!shouldShow) {
      // Audio doesn't need unlock, preload directly
      preloadNotificationSounds(USER_ROLE).catch((error) => {
        console.warn("Audio preload failed:", error);
      });
    }
  }, []);

  // Monitor for notifications being triggered (now handled by the hook)
  useEffect(() => {
    if (hasRecentNotificationTrigger) {
      checkAndShowAudioModal();
    }
  }, [hasRecentNotificationTrigger, checkAndShowAudioModal]);

  // Trigger audio modal check when conditions change
  useEffect(() => {
    checkAndShowAudioModal();
  }, [checkAndShowAudioModal]);

  // Show campaign modal after other modals are closed
  useEffect(() => {
    checkAndShowCampaignModal();
  }, [checkAndShowCampaignModal]);

  // Handle permission request confirm
  const handlePermissionConfirm = async () => {
    setPermissionLoading(true);
    try {
      await requestPermission();
      setShowPermissionModal(false);
      // Mark as asked
      setNotificationCookie("notification-permission-asked", "true");
      setInitialCheckDone(true);
    } catch (error) {
      console.error("Error requesting permission:", error);
    } finally {
      setPermissionLoading(false);
      setShowPermissionModal(false);
    }
  };

  // Handle permission request cancel (No)
  const handlePermissionCancel = () => {
    setShowPermissionModal(false);
    // Mark as asked even if declined
    setNotificationCookie("notification-permission-asked", "true");
    setInitialCheckDone(true);
  };

  const handleSoundConfirm = async () => {
    setSoundLoading(true);
    try {
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
      <div className="!w-full flex-row-between !px-4 !py-2 relative text-center">
        <LanguageSwitcher />
        <div className="flex-row-center flex-1">
          <Text className="text-home-label-base">{t("home.home_title")}</Text>
        </div>
        <div className="flex-row-center gap-1">
          <Button
            type="text"
            className="!outline-none !h-10 !w-10 !p-0 !flex !items-center !justify-center !bg-transparent !border-none"
            onClick={() => {
              // Request permission in background
              requestPermission().catch((error) => {
                console.error(
                  "Error requesting notification permission:",
                  error
                );
              });

              navigate(
                `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.NOTIFICATIONS}`
              );
            }}
          >
            <IconNotificationWhite className="!w-5 !h-5 !min-w-5 !min-h-5 !text-white" />
            {/* Notification Badge with Animation */}
            {hasUnread && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] flex-row-center">
                <span className="text-xs-white !font-semibold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="!flex-1 !flex !item-center !justify-center !px-6 pt-4 !pb-[55px] scrollbar-hidden overflow-y-auto">
        <div className="!w-full !flex !flex-col !gap-4 !flex-1 scrollbar-hidden overflow-y-auto scroll-smooth m-[auto]">
          {/* QR Scan */}
          <div
            className="!w-full !bg-[#FFCC00] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
            onClick={() =>
              navigate(
                `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.QR_SCAN}`
              )
            }
          >
            <IconQRCode className="!w-12 !h-12 !text-white" />
            <Text className="text-home-label-base">
              {t("order.title.qr_scan_title")}
            </Text>
          </div>

          {/* Order History and Stock Management */}
          <div className="!w-full !flex !gap-4">
            <div
              className="!w-[100px] !bg-[#1E8E3E] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
              onClick={() =>
                navigate(
                  `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.ORDERS}`
                )
              }
            >
              <IconClockComponent className="!w-12 !h-12 !text-white" />
              <Text className="text-home-label-base">
                {t("venue.title.order_logs_title")}
              </Text>
            </div>
            <div
              className="!flex-1 !bg-[var(--dark-blue-color)] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
              onClick={() => {
                sessionStorage.removeItem(
                  STOCK_STORE_STATE.SESSION_STORAGE_KEY
                );
                navigate(
                  `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.STOCK_STORE}`
                );
              }}
            >
              <IconStockVenue className="!w-12 !h-12 !text-white" />
              <Text className="text-home-label-base">
                {t("share.stock_store_title")}
              </Text>
            </div>
          </div>

          {/* Share and Settings */}
          <div className="!w-full !flex !gap-4">
            <div
              className="!flex-1 !bg-[var(--tag-color)] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
              onClick={() =>
                navigate(
                  `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.SHARE}`
                )
              }
            >
              <img src={IconShare} alt="Share" className="!w-12 !h-12" />
              <Text className="text-home-label-base">
                {t("share.btn_share")}
              </Text>
            </div>
            <div
              className="!w-[100px] !bg-[#E46962] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
              onClick={() =>
                navigate(
                  `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.SETTINGS}`
                )
              }
            >
              <IconSetting className="!w-12 !h-12 !text-white" />
              <Text className="text-home-label-base">
                {t("setting.user_setting_title")}
              </Text>
            </div>
          </div>

          {/* Blogs */}
          <div
            className="!w-full !bg-[var(--background-dark-blue-color)] !rounded-[16px] !p-3 !flex !flex-col !items-center !justify-center !gap-1 !cursor-pointer"
            onClick={() => navigate(`/${ROUTE_PATH.ARTICLE}`)}
          >
            <IconLightning className="!w-12 !h-12 !text-white" />
            <Text className="text-home-label-base">{t("article.title")} !</Text>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-6 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-6 flex-wrap">
        {/* Logout Button */}
        <LogoutButton urlRedirect={`/${ROUTE_PATH.USER.LOGIN}`} />

        {/* User Manual Button */}
        <Button
          type="text"
          className="!flex-1 !border-none !bg-[var(--background-teal-color)] !rounded-xl !flex !items-center !justify-center !p-3 !px-6 !outline-none"
          style={{ height: "unset" }}
          onClick={() =>
            navigate(
              `/${ROUTE_PATH.POLICY.ROOT_POLICY}/${ROUTE_PATH.POLICY.MANUAL}`
            )
          }
        >
          <div className="!flex !items-center justify-center !gap-2 w-full">
            <img
              src={IconInfoCircle}
              alt="Info Icon"
              className="!w-[22px] !h-[22px] min-w-[22px] min-h-[22px] object-contain"
            />
            <Text className="!flex-1 text-sm-white !font-bold !text-center">
              {t("home.home_manual_label")}
            </Text>
          </div>
        </Button>
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
            i18nKey="general.enable_notifications_user"
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

      {/* Campaign Modal */}
      <CampaignModal
        isModalOpen={showCampaignModal}
        onClose={handleCampaignModalClose}
        listCampaigns={listCampaigns}
        fromParam=""
      />
    </div>
  );
};

export default Home;
