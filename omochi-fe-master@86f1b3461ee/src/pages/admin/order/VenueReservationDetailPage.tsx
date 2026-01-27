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
import { IconPhoneCall } from "@/assets/icons";
import BaseCardInfo from "@/components/card/BaseCardInfo";
import {
  isEmpty,
  formatTimeSlotLabel,
  formatPhoneNumberJP,
  getDisplayStatusList,
} from "@/utils/helper";
import { Reservation } from "@/generated/api";
import { format } from "date-fns";
import IconChecked from "@/assets/icons/checked-icon.svg";
import IconPreparing from "@/assets/icons/preparing-icon.svg";
import NotFoundPage from "@/pages/NotFoundPage";
import { useStatusConstants } from "@/hooks/useStatusConstants";
import {
  getReservationDetail,
  updateReservationStatus,
} from "@/api/reservation";
import ContactModal from "@/components/ContactModal";
import { StatusDisplayItem } from "@/types/order";
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

const VenueReservationDetailPage = () => {
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
  const [loading, setLoading] = useState(true);
  const isFirstFetchRef = useRef(false);
  const [isLoadingChangeStatus, setIsLoadingChangeStatus] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

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

  const orderInfoMap = [
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
      id: 1,
      label: t("order.label.date_label"),
      value: reservationDetail.date
        ? format(new Date(reservationDetail.date), "yyyy/MM/dd")
        : "",
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

  const changeStatus = async (status: StatusDisplayItem) => {
    if (isLoadingChangeStatus) {
      return;
    }
    setIsLoadingChangeStatus(true);
    try {
      await updateReservationStatus(reservationDetail.id, {
        status: status.status,
      });
    } catch (error) {
      console.error("Error updating order status:", error);
    } finally {
      fetchReservationDetail();
      setIsLoadingChangeStatus(false);
    }
  };

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
        onBack={() =>
          navigate(
            `/${ROUTE_PATH.VENUE.DASHBOARD}/${ROUTE_PATH.VENUE.ORDERS}`,
            {
              state: location.state,
            }
          )
        }
        hasRightIcons
      >
        <div className="flex items-center gap-4">
          <Button
            type="text"
            className="!p-1 !flex !items-center !justify-center !bg-transparent !border-none !outline-none"
            onClick={() => setIsContactModalOpen(true)}
          >
            <IconPhoneCall />
          </Button>
        </div>
      </TopNavigationBar>

      {/* Reservation Detail Content */}
      <div className="flex flex-col w-full px-4 mt-2 gap-3">
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
                      {keyIcon === "preparing" ? (
                        <Button
                          onClick={() => changeStatus(status)}
                          className={`!flex !h-[100%] !outline-none !flex-row !justify-center !items-center !px-2 !py-0 !rounded-[20px] !border-none ${
                            status.status === OrderStatusEnum.Completed
                              ? "!bg-[var(--success-color)]"
                              : "!bg-[var(--primary-color)]"
                          }`}
                        >
                          <span className="text-white !text-[10px] font-bold">
                            {t("general.next_button")}
                          </span>
                        </Button>
                      ) : (
                        <img src={src} alt="Icon Order Status" />
                      )}
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
      <ContactModal
        isOpen={isContactModalOpen}
        onClick={() => setIsContactModalOpen(false)}
        title={t("order.contact.title")}
        data={[
          {
            label: t("order.contact.name"),
            value:
              reservationDetail.user_first_name +
              " " +
              reservationDetail.user_last_name,
          },
          {
            label: t("order.contact.phone"),
            value: formatPhoneNumberJP(
              reservationDetail.user_phone_number || ""
            ),
          },
          {
            label: t("order.contact.email"),
            value: reservationDetail.user_email || "",
          },
        ]}
        btnText={t("general.back")}
      />
    </div>
  );
};

export default VenueReservationDetailPage;
