/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useLayoutEffect, useCallback, useRef } from "react";
import { Button, Typography, Spin } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ROUTE_PATH,
  ORDER_STATUS_MAPPING,
  OrderStatusEnum,
  POLLING_INTERVAL_REFRESH_API,
} from "@/utils/constants";
import { IconCheckList } from "@/assets/icons";
import BaseCardInfo from "@/components/card/BaseCardInfo";
import {
  isEmpty,
  formatTimeSlotLabel,
  getDisplayStatusList,
} from "@/utils/helper";
import { Reservation } from "@/generated/api";
import IconChecked from "@/assets/icons/checked-icon.svg";
import IconPreparing from "@/assets/icons/preparing-icon.svg";
import NotFoundPage from "@/pages/NotFoundPage";
import { useStatusConstants } from "@/hooks/useStatusConstants";
import { getReservationDetail } from "@/api/reservation";
import OrderQuestionsCard from "@/components/card/OrderQuestionsCard";

const { Text } = Typography;

const ORDER_STATUS_ICON_MAP = {
  preparing: {
    src: IconPreparing,
  },
  done: {
    src: IconChecked,
  },
};

type OrderStatusIconKey = keyof typeof ORDER_STATUS_ICON_MAP;

const ReservationDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { orderStatus } = useStatusConstants();
  const { reservationId = "" } = useParams<{
    reservationId: string;
  }>();
  const [reservationDetail, setReservationDetail] = useState<Reservation>(
    {} as Reservation
  );
  const isFirstFetchRef = useRef(false);

  const [loading, setLoading] = useState(true);

  const fetchReservationDetail = useCallback(async () => {
    try {
      if (!isFirstFetchRef.current) {
        setLoading(true);
        isFirstFetchRef.current = true;
      }
      const response = await getReservationDetail(reservationId);
      if (!isEmpty(response)) {
        setReservationDetail(response);
      }
    } catch (error) {
      console.error("Error fetching reservation detail:", error);
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useLayoutEffect(() => {
    fetchReservationDetail();
    const intervalId = setInterval(
      fetchReservationDetail,
      POLLING_INTERVAL_REFRESH_API
    );
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchReservationDetail]);

  const isDisabledButton = isEmpty(reservationDetail);

  const orderInfoMap = [
    {
      id: 1,
      label: t("order.label.store_name_label"),
      value: reservationDetail.venue_name,
    },
    {
      id: 2,
      label: t("order.label.order_number_label"),
      value: `#${reservationDetail.reservation_code}`,
    },
    {
      id: 3,
      label: t("order.label.order_method_label"),
      value: t("order.label.dine_in_label"),
    },
    {
      id: 4,
      label: t("order.label.time_specification_label"),
      value: formatTimeSlotLabel(
        reservationDetail.start_time,
        reservationDetail.end_time
      ),
    },
    {
      id: 5,
      label: t("order.label.guest_count_label"),
      value: `${reservationDetail.party_size}${t(
        "venue.label.party_size_table_label_eat_in_unit"
      )}`,
    },
    {
      id: 6,
      label: t("order.label.order_status_label_other"),
      value:
        orderStatus[
          (reservationDetail.status ||
            OrderStatusEnum.Pending) as keyof typeof orderStatus
        ]?.label || "",
    },
  ];

  const statusHistory = getDisplayStatusList(
    reservationDetail.status_history || [],
    ORDER_STATUS_MAPPING,
    reservationDetail?.status as OrderStatusEnum
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full ">
        <Spin
          spinning={loading}
          size="large"
          className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
        />
      </div>
    );
  }

  if (
    isEmpty(reservationDetail) ||
    reservationDetail.status === OrderStatusEnum.Cancelled
  ) {
    return <NotFoundPage />;
  }

  return (
    <div className="flex flex-col items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <TopNavigationBar
        title={t("order.title.order_detail_title")}
        onBack={() => {
          // Check URL params first, then fallback to state
          const searchParams = new URLSearchParams(location.search);
          const fromNotifications =
            searchParams.get("from") === "notifications" ||
            location.state?.fromNotificationsList;

          if (fromNotifications) {
            navigate(
              `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.NOTIFICATIONS}`,
              {
                state: location.state,
              }
            );
          } else {
            // Default behavior for OrderListPage
            navigate(
              `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.ORDERS}`,
              {
                state: location.state,
              }
            );
          }
        }}
        hasRightIcons
        needUserGuide
      />

      {/* Reservation Detail Content */}
      <div className="flex flex-col w-full px-4 mt-2 gap-3 pb-[70px]">
        <BaseCardInfo>
          <div className="flex flex-col w-full gap-2">
            {orderInfoMap.map((info) => {
              const { label, value } = info;
              return (
                <div key={info.id} className="grid grid-cols-2">
                  <Text className="text-sm-white">{label}</Text>
                  <Text className="text-sm-white !font-bold">{value}</Text>
                </div>
              );
            })}
          </div>
        </BaseCardInfo>

        <BaseCardInfo>
          <div className="flex flex-col w-full gap-2">
            {statusHistory.map((status) => {
              const { label, completedAt = "--", keyIcon = "" } = status;

              const iconConfig =
                ORDER_STATUS_ICON_MAP[keyIcon as OrderStatusIconKey] || {};

              const { src = "" } = iconConfig;
              return (
                <div key={status.status} className="grid grid-cols-3">
                  <Text className="text-sm-white !font-bold">{t(label)}</Text>
                  <Text className="text-sm-white text-center">
                    {completedAt || "--"}
                  </Text>
                  {src && (
                    <div className="flex items-center justify-end">
                      <img
                        src={src}
                        alt="Icon Order Status"
                        className={`object-contain w-5 h-5 min-w-5 min-h-5 ${
                          keyIcon === "preparing" ? "animate-spin-reverse" : ""
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </BaseCardInfo>

        {/* Reservation Questions */}
        {reservationDetail.reservation_questions &&
          reservationDetail.reservation_questions.length > 0 && (
            <div className="flex flex-col gap-2">
              <Text className="text-xs-white !font-bold !py-1">
                {t("order.label.order_confirmation_questions_label")}
              </Text>
              <OrderQuestionsCard
                orderQuestions={reservationDetail.reservation_questions || []}
              />
            </div>
          )}
      </div>

      {/* Button Bottom */}
      <div className="z-10 !flex !flex-col !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-2 flex-wrap">
        <Text className="!text-white !text-[10px] !font-['Noto_Sans_JP'] !leading-[1.2em]">
          {t("order.label.show_to_venue_guide_label")}
        </Text>
        <Button
          type="text"
          className={`!w-full !flex-1 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
            isDisabledButton
              ? "!bg-[#FFC2B3] !text-white/50 !cursor-not-allowed"
              : " !bg-[var(--primary-color)] !text-white"
          }`}
          style={{ height: "unset" }}
          disabled={isDisabledButton}
          onClick={() => {
            navigate(
              `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.RESERVATION}/${reservationId}/${ROUTE_PATH.USER.SHOW_TO_VENUE}`
            );
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <img
              src={IconCheckList}
              alt="Icon Check List"
              className="object-contain w-5 h-5 min-w-5 min-h-5"
            />
            <Text className="text-sm-white">
              {t("order.label.show_to_venue_label")}
            </Text>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default ReservationDetailPage;
