import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useLocation } from "react-router-dom";
import CardOrderItem from "@/components/card/CardOrderItem";
import defaultImage from "@/assets/images/default-image.png";
import { useTranslation } from "react-i18next";
import { useEffect, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getMyOrderList } from "@/api/order";
import { getMyReservationList } from "@/api/reservation";
import {
  setOrders,
  setLoading,
  setMergedOrders,
} from "@/store/slices/orderSlice";
import {
  setReservations,
  setLoading as setReservationLoading,
} from "@/store/slices/reservationSlice";
import { RootState } from "@/store";
import CardReservation from "@/components/card/CardReservation";
import { formatDate } from "@/utils/helper";
import {
  OrderTypes,
  ROUTE_PATH,
  POLLING_INTERVAL_REFRESH_API,
  OrderStatusEnum,
} from "@/utils/constants";
import { Spin } from "antd";
import {
  Order,
  Reservation,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "@/generated/api";
import AddToHomeScreenModal from "@/components/common/modal/AddToHomeScreenModal";
import { useCustomCookies } from "@/hooks/useCustomCookies";

const OrderListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading, mergedOrders } = useSelector(
    (state: RootState) => state.order
  );
  const { loading: reservationLoading } = useSelector(
    (state: RootState) => state.reservation
  );
  const [cookies, setCookie] = useCustomCookies(["hideAddToHomeScreen"]);

  // Add state for preserving data when navigating to detail
  const [localMergedOrders, setLocalMergedOrders] = useState<
    (Order | Reservation)[]
  >([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [openAddToHomeScreenModal, setOpenAddToHomeScreenModal] =
    useState(false);

  const isOrder = (item: Order | Reservation): item is Order => {
    return "order_type" in item;
  };

  // Function to check if should show add to home screen modal
  const shouldShowAddToHomeScreenModal = useCallback(
    (orders: Order[], reservations: Reservation[]) => {
      // If cookie exists, don't show modal
      if (cookies.hideAddToHomeScreen) {
        return false;
      }

      // Check if there's at least one valid order for showing modal
      const hasValidOrder = orders.some((order) => {
        return (
          order.payment_method === PaymentMethodEnum.Cash ||
          (order.payment_method === PaymentMethodEnum.Online &&
            order.payment_status === PaymentStatusEnum.Paid)
        );
      });

      // Check if there's at least one valid reservation (status not cancelled)
      const hasValidReservation = reservations.some((reservation) => {
        return reservation.status !== OrderStatusEnum.Cancelled;
      });

      return hasValidOrder || hasValidReservation;
    },
    [cookies.hideAddToHomeScreen]
  );

  const fetchData = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setReservationLoading(true));

      const [ordersResult, reservationsResult] = await Promise.allSettled([
        getMyOrderList(),
        getMyReservationList(),
      ]);

      if (ordersResult.status === "fulfilled") {
        dispatch(setOrders(ordersResult.value));
      }

      if (reservationsResult.status === "fulfilled") {
        dispatch(setReservations(reservationsResult.value));
      }

      // Merge and sort orders and reservations
      const orderReservationIds =
        ordersResult.status === "fulfilled"
          ? new Set(
              ordersResult.value
                ?.map((order) => order.reservation)
                .filter(Boolean)
            )
          : new Set();

      const allItems = [
        ...(ordersResult.status === "fulfilled" ? ordersResult.value : []),
        ...(reservationsResult.status === "fulfilled"
          ? reservationsResult.value.filter(
              (reservation) => !orderReservationIds.has(reservation.id)
            )
          : []),
      ].sort((a, b) => {
        const dateA = "order_date" in a ? a.order_date : a.created_at;
        const dateB = "order_date" in b ? b.order_date : b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      dispatch(setMergedOrders(allItems));
      setLocalMergedOrders(allItems);
    } catch (err) {
      console.error(err);
    } finally {
      dispatch(setLoading(false));
      dispatch(setReservationLoading(false));
    }
  }, [dispatch]);

  // Separate effect to check and show modal when orders change
  useEffect(() => {
    const orders = mergedOrders.filter((item): item is Order => isOrder(item));
    const reservations = mergedOrders.filter(
      (item): item is Reservation => !isOrder(item)
    );

    if (orders.length > 0 || reservations.length > 0) {
      const shouldShow = shouldShowAddToHomeScreenModal(orders, reservations);
      setOpenAddToHomeScreenModal(shouldShow);
    }
  }, [mergedOrders, shouldShowAddToHomeScreenModal]);

  useEffect(() => {
    const cameFromDetail = location.state?.fromOrdersList;

    if (cameFromDetail) {
      // Restore preserved state from detail page
      setLocalMergedOrders(location.state.mergedOrders || []);
      // Restore scroll position
      setTimeout(() => {
        requestAnimationFrame(() => {
          scrollContainerRef.current?.scrollTo({
            top: location.state.scrollY || 0,
            behavior: "instant",
          });
        });
      }, 100);
      navigate(location.pathname, { replace: true, state: null });
    } else {
      fetchData();
    }

    // Set up polling only if not coming from detail
    if (!cameFromDetail) {
      const intervalId = setInterval(fetchData, POLLING_INTERVAL_REFRESH_API);
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [fetchData, location.state, navigate, location.pathname]);

  // Clear history state effect
  useEffect(() => {
    if (location.state?.fromOrdersList) {
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Sync localMergedOrders with Redux state when not coming from detail
  useEffect(() => {
    if (!location.state?.fromOrdersList) {
      setLocalMergedOrders(mergedOrders);
    }
  }, [mergedOrders, location.state]);

  const handleClickItem = (item: Order | Reservation) => {
    if (item.status === OrderStatusEnum.Cancelled) {
      return;
    }

    // Prepare state to preserve current page state
    const commonState = {
      fromOrdersList: true,
      mergedOrders: localMergedOrders,
      scrollY: scrollContainerRef.current?.scrollTop || 0,
    };

    if (isOrder(item)) {
      // This is an Order
      navigate(
        `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.ORDERS}/${item.id}`,
        { state: commonState }
      );
    } else {
      // This is a Reservation
      navigate(
        `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.RESERVATION}/${item.id}`,
        { state: commonState }
      );
    }
  };

  // Use localMergedOrders for display
  const displayOrders =
    localMergedOrders.length > 0 ? localMergedOrders : mergedOrders;

  return (
    <Spin
      spinning={loading || reservationLoading}
      size="large"
      wrapperClassName="[&_.ant-spin]:!max-h-[100dvh]"
      className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
    >
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("order.title.order_list_title")}
          onBack={() => navigate(`/${ROUTE_PATH.USER.DASHBOARD}`)}
        />

        {/* Order List Content */}
        <div
          ref={scrollContainerRef}
          className="flex flex-col w-full h-full px-4 mt-4 gap-2 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth"
        >
          {!loading && !reservationLoading && displayOrders.length === 0 && (
            <div className="flex-grow flex items-center justify-center">
              <p className="text-white">{t("general.no_data")}</p>
            </div>
          )}
          {displayOrders.map((item) => {
            if (isOrder(item)) {
              // This is an Order
              return (
                <CardOrderItem
                  key={item.id}
                  srcImg={item.venue_logo || defaultImage}
                  storeName={item.venue_name}
                  orderMethod={item.order_type}
                  specifiedTimeStart={formatDate(item.start_time || "--")}
                  specifiedTimeEnd={formatDate(item.end_time || "--")}
                  orderStatus={item.status || ""}
                  onClick={() => {
                    handleClickItem(item);
                  }}
                />
              );
            } else {
              // This is a Reservation
              return (
                <CardReservation
                  key={item.id}
                  srcImg={item.venue_logo || defaultImage}
                  storeName={item.venue_name}
                  orderMethod={t(OrderTypes.DINE_IN)}
                  specifiedTimeStart={formatDate(item.start_time || "--")}
                  specifiedTimeEnd={formatDate(item.end_time || "--")}
                  reservationStatus={item.status || ""}
                  onClick={() => {
                    handleClickItem(item);
                  }}
                />
              );
            }
          })}
        </div>
      </div>
      <AddToHomeScreenModal
        isModalOpen={openAddToHomeScreenModal}
        onClose={() => {
          setOpenAddToHomeScreenModal(false);
          setCookie("hideAddToHomeScreen", "true");
        }}
      />
    </Spin>
  );
};

export default OrderListPage;
