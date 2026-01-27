import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useLocation } from "react-router-dom";
import CardNotification from "@/components/card/CardNotification";
import {
  MAX_SIZE_FETCH_ORDERS,
  NOTIFICATION_FROM_PARAM,
  POLLING_INTERVAL_REFRESH_API,
  ROUTE_PATH,
  NOTIFICATION_SCROLL_KEY,
} from "@/utils/constants";
import { getUserNotification, readAllNotification } from "@/api/notification";
import { getListCampaigns } from "@/api/campaign";
import { useState, useEffect, useRef } from "react";
import { Notification, Campaign } from "@/generated/api";
import SkeletonCardNotification from "@/components/skeleton/SkeletonCardNotification";
import { useTranslation } from "react-i18next";
import { Button, Spin, Typography } from "antd";
import dayjs from "dayjs";
import CampaignModal from "@/components/common/modal/CampaignModal";

const { Text } = Typography;

const NotificationPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const initConfigLoadMore = {
    hasLoadMore: true,
    currentPage: 1,
    loadingLoadMore: false,
  };
  const [configLoadMore, setConfigLoadMore] = useState(initConfigLoadMore);
  const [loadingFirst, setLoadingFirst] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [listCampaigns, setListCampaigns] = useState<Campaign[]>([]);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const currentPageRef = useRef(configLoadMore.currentPage);

  const fetchNotifications = async (isLoadMore = false, page?: number) => {
    const targetPage = page ?? currentPageRef.current;
    try {
      if (isLoadMore) {
        setConfigLoadMore((prevConfig) => ({
          ...prevConfig,
          hasLoadMore: true,
          loadingLoadMore: true,
        }));
      } else {
        setLoadingFirst(true);
      }

      const response = await getUserNotification(
        targetPage,
        MAX_SIZE_FETCH_ORDERS
      );

      const results = response?.results || [];
      const totalLoaded = targetPage * MAX_SIZE_FETCH_ORDERS;
      setConfigLoadMore((prevConfig) => ({
        ...prevConfig,
        hasLoadMore: totalLoaded < response.count,
      }));

      setNotifications((prevNotifications) => {
        const newNotifications = [...prevNotifications, ...results];

        // Remove duplicates based on id
        const uniqueNotifications = Array.from(
          new Map(newNotifications.map((item) => [item.id, item])).values()
        );

        return uniqueNotifications;
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setConfigLoadMore({
        hasLoadMore: false,
        currentPage: 1,
        loadingLoadMore: false,
      });
    } finally {
      if (isLoadMore) {
        setConfigLoadMore((prevConfig) => ({
          ...prevConfig,
          loadingLoadMore: false,
        }));
      }
      setLoadingFirst(false);
    }
  };

  const fetchCampaigns = async (needLoading = false) => {
    try {
      if (needLoading) {
        setLoadingFirst(true);
      }

      const response = await getListCampaigns();
      setListCampaigns(response || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      setListCampaigns([]);
    } finally {
      if (needLoading) {
        setLoadingFirst(false);
      }
    }
  };

  useEffect(() => {
    currentPageRef.current = configLoadMore.currentPage;
  }, [configLoadMore.currentPage]);

  useEffect(() => {
    const cameFromDetail = location.state?.fromNotificationsList;

    if (cameFromDetail) {
      setNotifications(location.state.notifications || []);
      setConfigLoadMore(location.state.configLoadMore || initConfigLoadMore);

      // Check sessionStorage for scroll position
      const storedScrollY = sessionStorage.getItem(NOTIFICATION_SCROLL_KEY);
      const scrollY = storedScrollY
        ? parseInt(storedScrollY, 10)
        : location.state.scrollY;

      if (scrollY) {
        setTimeout(() => {
          requestAnimationFrame(() => {
            scrollContainerRef.current?.scrollTo({
              top: scrollY,
              behavior: "instant",
            });
          });
        }, 100);
        // Clear sessionStorage after use
        sessionStorage.removeItem(NOTIFICATION_SCROLL_KEY);
      }

      navigate(location.pathname, { replace: true, state: null });

      // Fetch campaigns
      fetchCampaigns(true);
    } else {
      setConfigLoadMore(initConfigLoadMore);
      setNotifications([]);
      // Fetch notifications and campaigns in parallel using allSettled
      Promise.allSettled([fetchNotifications(false, 1), fetchCampaigns()]);
    }

    // Set interval for notifications refresh
    const intervalId = setInterval(
      () => fetchNotifications(false, 1),
      POLLING_INTERVAL_REFRESH_API
    );

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    // Read all notification every time
    readAllNotification();

    if (location.state?.fromNotificationsList) {
      window.history.replaceState({}, "");
    }
  }, []);

  // Handle load more notifications
  const handleLoadMore = () => {
    const nextPage = configLoadMore.currentPage + 1;
    setConfigLoadMore((prevConfig) => ({
      ...prevConfig,
      currentPage: nextPage,
    }));

    fetchNotifications(true, nextPage);
  };

  const handleShowCampaign = () => {
    setIsCampaignModalOpen(true);
  };

  return (
    <Spin
      spinning={loadingFirst}
      size="large"
      wrapperClassName="[&_.ant-spin]:!max-h-[100dvh]"
      className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
    >
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("order.title.notification_title")}
          onBack={() => {
            navigate(`/${ROUTE_PATH.USER.DASHBOARD}`);
          }}
        />
        <div className="!w-full px-4 !mt-4">
          <Button
            type="text"
            style={{ height: "unset" }}
            className="!w-full !h-10 !min-h-10 !max-h-10 !bg-[var(--background-teal-color)] !outline-none !border-none !rounded-lg text-sm-white !font-bold flex-row-center"
            aria-label="View campaign"
            role="button"
            onClick={handleShowCampaign}
            loading={loadingFirst}
            disabled={loadingFirst}
          >
            <Text className="text-sm-white !font-bold">
              {t("campaign.button_show_campaign_label_notification")}
            </Text>
          </Button>
        </div>

        {/* Notification Content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex flex-col w-full px-4 mt-2 gap-2 scrollbar-hidden overflow-y-auto scroll-smooth"
        >
          {!loadingFirst && notifications.length === 0 ? (
            <div className="flex-grow flex items-center justify-center py-4">
              <p className="text-sm-white">{t("general.no_data")}</p>
            </div>
          ) : (
            <>
              {notifications?.map((noti) => {
                const formattedDate = noti.created_at
                  ? dayjs(noti.created_at).format("YYYY/MM/DD - HH:mm")
                  : "--";

                return (
                  <CardNotification
                    srcImg={noti.image_url || ""}
                    storeName={noti.title}
                    message={noti.message}
                    referenceType={noti.reference_type || ""}
                    referenceId={noti.reference_id || ""}
                    typeNoti={noti.type}
                    time={formattedDate}
                    onClick={() => {
                      if (!noti.reference_id) {
                        return;
                      }

                      // Store current scroll position for when we come back
                      const scrollY =
                        scrollContainerRef.current?.scrollTop || 0;
                      sessionStorage.setItem(
                        NOTIFICATION_SCROLL_KEY,
                        scrollY.toString()
                      );

                      const commonState = {
                        fromNotificationsList: true,
                        notifications,
                        configLoadMore,
                      };

                      const newUrl = new URL(noti.click_action || "");
                      if (newUrl) {
                        const searchParams = newUrl.searchParams;
                        searchParams.set("from", NOTIFICATION_FROM_PARAM);
                        const internalPath =
                          newUrl.pathname + "?" + searchParams + newUrl.hash;
                        navigate(internalPath, {
                          state: commonState,
                        });
                        return;
                      }

                      const typeRedirect =
                        noti.reference_type?.toLowerCase() === "order"
                          ? ROUTE_PATH.USER.ORDERS
                          : ROUTE_PATH.USER.RESERVATION;

                      navigate(
                        `/${ROUTE_PATH.USER.DASHBOARD}/${typeRedirect}/${noti.reference_id}?from=${NOTIFICATION_FROM_PARAM}`,
                        {
                          state: commonState,
                        }
                      );
                    }}
                  />
                );
              })}
              {!loadingFirst &&
                notifications.length > 0 &&
                configLoadMore.hasLoadMore && (
                  <>
                    {configLoadMore.loadingLoadMore ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <SkeletonCardNotification key={index} />
                      ))
                    ) : (
                      <div className="flex-col-center !w-full">
                        <Button
                          className="!w-[80px] !min-w-[80px] !h-[26px] !min-h-[26px] !max-h-[26px] !bg-[var(--card-background-color)] !border-none !rounded-lg !outline-none hover:!bg-[#404040]"
                          onClick={handleLoadMore}
                          loading={configLoadMore.loadingLoadMore}
                          disabled={
                            !configLoadMore.hasLoadMore ||
                            configLoadMore.loadingLoadMore
                          }
                        >
                          <Text className="text-xs-white">
                            {t("general.show_more_label")}
                          </Text>
                        </Button>
                      </div>
                    )}
                  </>
                )}
            </>
          )}
        </div>

        {/* Campaign Modal */}
        <CampaignModal
          isModalOpen={isCampaignModalOpen}
          onClose={() => setIsCampaignModalOpen(false)}
          listCampaigns={listCampaigns}
          fromParam={NOTIFICATION_FROM_PARAM}
        />
      </div>
    </Spin>
  );
};

export default NotificationPage;
