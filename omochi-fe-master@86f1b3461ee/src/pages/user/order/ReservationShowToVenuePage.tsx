import { Spin } from "antd";
import { useState, useLayoutEffect, useCallback } from "react";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OrderTypeEnum, PaymentStatusEnum, Reservation } from "@/generated/api";
import { getReservationDetail } from "@/api/reservation";
import {
  formatTimeSlotLabel,
  getLabelFromOptions,
  isEmpty,
} from "@/utils/helper";
import NotFoundPage from "@/pages/NotFoundPage";
import { BaseShowToVenueContent } from "@/components/common/BaseShowToVenueContent";
import {
  ORDER_TYPE_OPTIONS,
  OrderStatusEnum,
  POLLING_INTERVAL_REFRESH_API,
} from "@/utils/constants";
import { ROUTE_PATH } from "@/utils/constants";
import dayjs from "dayjs";
import { useStatusConstants } from "@/hooks/useStatusConstants";

const ReservationShowToVenuePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reservationId = "" } = useParams<{ reservationId: string }>();
  const { paymentStatusMapping } = useStatusConstants();
  const [reservationDetail, setReservationDetail] = useState<Reservation>(
    {} as Reservation
  );
  const [loading, setLoading] = useState(true);

  const fetchReservationDetail = useCallback(async () => {
    try {
      setLoading(true);
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

  const paymentInfo = paymentStatusMapping[PaymentStatusEnum.Pending];

  const timeSlotLabel = formatTimeSlotLabel(
    reservationDetail.start_time,
    reservationDetail.end_time
  );

  // Tìm thời gian confirmed từ status_history
  const confirmedTime = reservationDetail.status_history?.find(
    (history) => history.new_status === OrderStatusEnum.Confirmed
  )?.changed_at;

  const formattedConfirmedTime = confirmedTime
    ? dayjs(confirmedTime).format("YYYY/MM/DD - HH:mm")
    : "--";

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
        title={t("order.title.show_to_venue_title")}
        onBack={() =>
          navigate(
            `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.RESERVATION}/${reservationId}`
          )
        }
      />
      {/* Show to Venue Content */}

      <div className="flex flex-col items-center w-full px-4 mt-4 gap-4">
        <BaseShowToVenueContent
          label={t("order.label.store_name_label")}
          value={reservationDetail.venue_name}
        />
        <BaseShowToVenueContent
          label={t("order.label.order_number_label")}
          value={`#${reservationDetail.reservation_code}`}
        />
        <BaseShowToVenueContent
          label={t("order.label.time_specification_label")}
          value={timeSlotLabel}
        />
        <BaseShowToVenueContent
          label={t("order.label.order_time_confirmation_label")}
          value={formattedConfirmedTime}
        />
        <BaseShowToVenueContent
          label={t("order.label.order_method_label")}
          value={t(
            getLabelFromOptions(ORDER_TYPE_OPTIONS, OrderTypeEnum.DineIn) || ""
          )}
        />
        <BaseShowToVenueContent
          label={t("order.label.pre_order_label")}
          value={t("order.content.pre_order_no_content")}
        />
        <BaseShowToVenueContent
          label={t("order.label.payment_info_label")}
          value={paymentInfo.value}
          color={paymentInfo.color}
        />
      </div>
    </div>
  );
};

export default ReservationShowToVenuePage;
