import { useState, useLayoutEffect, useCallback, useRef } from "react";
import { Button, Typography, Spin } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ROUTE_PATH,
  ORDER_TYPE_OPTIONS,
  DUMMY_MENU_ITEM_TABLE,
  ORDER_STATUS_MAPPING,
  OrderStatusEnum,
  POLLING_INTERVAL_REFRESH_API,
} from "@/utils/constants";
import { IconPhoneCall } from "@/assets/icons";
import BaseCardInfo from "@/components/card/BaseCardInfo";
import {
  getLabelFromOptions,
  isEmpty,
  formatTimeSlotLabel,
  formatPhoneNumberJP,
  getDisplayStatusList,
} from "@/utils/helper";
import { OrderTypeEnum, Order, PaymentStatusEnum } from "@/generated/api";
import { format } from "date-fns";
import IconChecked from "@/assets/icons/checked-icon.svg";
import IconPreparing from "@/assets/icons/preparing-icon.svg";
import NotFoundPage from "@/pages/NotFoundPage";
import { getDetailOrder } from "@/api/order";
import ContactModal from "@/components/ContactModal";
import OrderAmountDetails from "@/components/card/OrderAmountDetails";
import OrderQuestionsCard from "@/components/card/OrderQuestionsCard";
import { useStatusConstants } from "@/hooks/useStatusConstants";

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

const VenueOrderLogDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { orderStatus, paymentStatusMapping } = useStatusConstants();
  const { orderId = "" } = useParams<{
    orderId: string;
  }>();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState<Order>({} as Order);
  const [loading, setLoading] = useState(true);

  const isFirstFetchRef = useRef(false);

  const rawItems = orderDetail?.items || [];

  const fetchOrderDetail = useCallback(async () => {
    try {
      if (!isFirstFetchRef.current) {
        setLoading(true);
        isFirstFetchRef.current = true;
      }
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

  const menuItemsTable = !isEmpty(rawItems)
    ? rawItems.map((item) => ({
        key: item.id,
        name: item.menu_item_details.name,
        quantity: item.quantity || 0,
        subtotal: parseFloat(item.subtotal),
      }))
    : DUMMY_MENU_ITEM_TABLE;

  const orderInfoMap = [
    {
      id: 2,
      label: t("order.label.order_number_label"),
      value: `#${orderDetail.order_code}`,
      style: "text-sm-white",
    },
    {
      id: 3,
      label: t("order.label.order_method_label"),
      value: t(
        getLabelFromOptions(ORDER_TYPE_OPTIONS, orderDetail.order_type) || ""
      ),
      style: "text-sm-white",
    },
    {
      id: 1,
      label: t("order.label.date_label"),
      value: orderDetail.order_date
        ? format(new Date(orderDetail.order_date), "yyyy/MM/dd")
        : "",
      style: "text-sm-white",
    },
    {
      id: 4,
      label: t("order.label.time_specification_label"),
      value: formatTimeSlotLabel(orderDetail.start_time, orderDetail.end_time),
      style: "text-sm-white",
    },
  ];
  if (orderDetail.order_type === OrderTypeEnum.DineIn) {
    orderInfoMap.push({
      id: 5,
      label: t("order.label.guest_count_label"),
      value: `${orderDetail.party_size}${t(
        "venue.label.party_size_table_label_eat_in_unit"
      )}`,
      style: "text-sm-white",
    });
  }
  orderInfoMap.push({
    id: 6,
    label: t("order.label.order_status_label_other"),
    value:
      orderStatus[
        (orderDetail.status ||
          OrderStatusEnum.Pending) as keyof typeof orderStatus
      ]?.label || "",
    style: "text-sm-white",
  });
  orderInfoMap.push({
    id: 7,
    label: t("order.label.payment_status_label"),
    value: `${
      paymentStatusMapping[
        orderDetail.payment_status ||
          (PaymentStatusEnum.Pending as PaymentStatusEnum)
      ].value
    }`,
    style: `${
      orderDetail.payment_status === PaymentStatusEnum.Pending
        ? "text-sm !text-[#FF3B30]"
        : orderDetail.payment_status === PaymentStatusEnum.Paid
        ? "text-sm !text-[#34C759]"
        : "text-sm !text-[#FF3B30]"
    }`,
  });

  const statusHistory = getDisplayStatusList(
    orderDetail?.status_history || [],
    ORDER_STATUS_MAPPING,
    orderDetail?.status as OrderStatusEnum
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
    isEmpty(orderDetail) ||
    orderDetail.status === OrderStatusEnum.Cancelled
  ) {
    return <NotFoundPage />;
  }

  return (
    <div className="flex flex-col items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <TopNavigationBar
        title={t("venue.title.order_logs_detail_title")}
        onBack={() => {
          navigate(
            `/${ROUTE_PATH.VENUE.DASHBOARD}/${ROUTE_PATH.VENUE.ORDER_LOGS}`,
            {
              state: location.state,
            }
          );
        }}
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

      {/* Order Detail Content */}
      <div className="flex flex-col w-full px-4 mt-2 gap-3">
        <BaseCardInfo>
          <div className="flex flex-col w-full gap-2">
            {orderInfoMap.map((info) => {
              const { label, value, style } = info;
              return (
                <div key={info.id} className="grid grid-cols-2">
                  <Text className={`text-sm-white`}>{label}</Text>
                  <Text className={`!font-bold ${style}`}>{value}</Text>
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

        <div className="flex flex-col gap-2">
          <Text className="text-xs-white !font-bold !py-1">
            {t("order.label.order_detail_label")}
          </Text>
          <OrderAmountDetails
            menuItemsTable={menuItemsTable}
            orderDetail={orderDetail}
          />
        </div>

        {/* Order Questions */}
        {orderDetail.order_questions &&
          orderDetail.order_questions.length > 0 && (
            <div className="flex flex-col gap-2">
              <Text className="text-xs-white !font-bold !py-1">
                {t("order.label.order_confirmation_questions_label")}
              </Text>
              <OrderQuestionsCard
                orderQuestions={orderDetail.order_questions || []}
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
              orderDetail.user_first_name + " " + orderDetail.user_last_name,
          },
          {
            label: t("order.contact.phone"),
            value: formatPhoneNumberJP(orderDetail.user_phone_number || ""),
          },
          {
            label: t("order.contact.email"),
            value: orderDetail.user_email || "",
          },
        ]}
        btnText={t("general.back")}
      />
    </div>
  );
};

export default VenueOrderLogDetailPage;
