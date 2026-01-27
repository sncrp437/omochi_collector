import { Spin } from "antd";
import { useState, useLayoutEffect, useCallback } from "react";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useParams } from "react-router-dom";
import {
  ORDER_TYPE_OPTIONS,
  OrderStatusEnum,
  POLLING_INTERVAL_REFRESH_API,
} from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { Order, OrderTypeEnum, PaymentStatusEnum } from "@/generated/api";
import { getDetailOrder } from "@/api/order";
import {
  isEmpty,
  getLabelFromOptions,
  formatTimeSlotLabel,
} from "@/utils/helper";
import NotFoundPage from "@/pages/NotFoundPage";
import { BaseShowToVenueContent } from "@/components/common/BaseShowToVenueContent";
import { useStatusConstants } from "@/hooks/useStatusConstants";
import dayjs from "dayjs";

const ShowToVenuePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId = "" } = useParams<{ orderId: string }>();
  const { paymentStatusMapping } = useStatusConstants();
  const [orderDetail, setOrderDetail] = useState<Order>({} as Order);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getDetailOrder(orderId);
      if (!isEmpty(response)) {
        setOrderDetail(response);
      }
    } catch (error) {
      console.error("Error fetching order detail:", error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useLayoutEffect(() => {
    fetchOrderDetail();
    const intervalId = setInterval(
      fetchOrderDetail,
      POLLING_INTERVAL_REFRESH_API
    );

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchOrderDetail]);

  const paymentInfo =
    paymentStatusMapping[
      orderDetail.payment_status || PaymentStatusEnum.Pending
    ];

  const preOrderContent = isEmpty(orderDetail.items)
    ? t("order.content.pre_order_no_content")
    : t("order.content.pre_order_yes_content");

  const timeSlotLabel = formatTimeSlotLabel(
    orderDetail.start_time,
    orderDetail.end_time
  );

  // Find the time when the order was confirmed
  const confirmedTime = orderDetail.status_history?.find(
    (history) => history.new_status === OrderStatusEnum.Confirmed
  )?.changed_at;

  const formattedConfirmedTime = confirmedTime
    ? dayjs(confirmedTime).format("YYYY/MM/DD - HH:mm")
    : "--";

  // Check for priority pass items
  const priorityPassItems =
    orderDetail.items?.filter(
      (item) => item.menu_item_details?.is_priority_pass
    ) || [];
  const hasPriorityPass = priorityPassItems.length > 0;
  const priorityPassQuantity = hasPriorityPass
    ? priorityPassItems.reduce((total, item) => total + (item.quantity || 0), 0)
    : 0;

  // Determine the unit based on order type
  const unitKey =
    orderDetail.order_type === OrderTypeEnum.DineIn
      ? "venue.label.party_size_table_label_eat_in_unit"
      : "venue.label.party_size_table_label_take_out_unit";

  const priorityPassText = t("priority_pass.content.has_priority_pass", {
    count: priorityPassQuantity,
    unit: t(unitKey),
  });

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
    isEmpty(orderDetail) ||
    orderDetail.status === OrderStatusEnum.Cancelled
  ) {
    return <NotFoundPage />;
  }

  return (
    <div className="flex flex-col items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <TopNavigationBar
        title={t("order.title.show_to_venue_title")}
        onBack={() => navigate(-1)}
      />
      {/* Show to Venue Content */}

      <div className="flex flex-col items-center w-full px-4 mt-4 gap-4">
        <BaseShowToVenueContent
          label={t("order.label.store_name_label")}
          value={orderDetail.venue_name}
        />
        <BaseShowToVenueContent
          label={t("order.label.order_number_label")}
          value={`＃${orderDetail.order_code}`}
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
            getLabelFromOptions(ORDER_TYPE_OPTIONS, orderDetail.order_type) ||
              ""
          )}
        />
        {orderDetail.order_type === OrderTypeEnum.DineIn && (
          <BaseShowToVenueContent
            label={t("order.label.pre_order_label")}
            value={preOrderContent}
          />
        )}
        <BaseShowToVenueContent
          label={t("order.label.payment_info_label")}
          value={paymentInfo.value}
          color={paymentInfo.color}
        />
        {hasPriorityPass && (
          <BaseShowToVenueContent
            label={t("venue.label.priority_pass_table_label")}
            value={priorityPassText}
            color="#34C759"
          />
        )}
      </div>
    </div>
  );
};

export default ShowToVenuePage;
