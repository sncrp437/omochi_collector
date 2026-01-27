import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Spin } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  OrderStatusEnum,
  OrderTypes,
  POLLING_INTERVAL_REFRESH_API,
  ROUTE_PATH,
  DATE_FORMAT_BASE,
  TIME_FORMAT_BASE,
  JP_TIME_SEPARATOR_BASE,
} from "@/utils/constants";
import {
  getListOrderByVenue,
  confirmMultipleOrderPickup,
  changeMultipleOrderStatus,
} from "@/api/order";
import {
  getReservationList,
  changeMultipleReservationStatus,
} from "@/api/reservation";
import { RootState } from "@/store";
import { useSelector } from "react-redux";
import {
  Order,
  Reservation,
  OrderStatusHistory,
  ReservationStatusHistory,
  PaymentMethodEnum,
  PaymentStatusEnum,
} from "@/generated/api";
import { format, parseISO } from "date-fns";
import CardOrderItemVenue from "@/components/card/venue/CardOrderItemVenue";
import { formatDate, getTokyoNow, isEmpty } from "@/utils/helper";
import CardReservationVenue from "@/components/card/venue/CardReservationVenue";
import { IconEdit, IconCheckedTeal, IconClose } from "@/assets/icons";
import BulkStatusConfirmationModal from "@/components/common/modal/venue/BulkStatusConfirmationModal";
import { toast } from "react-toastify";
import { PromiseWithMetadata } from "@/types/order";

type MergedItemWithReception = (Order | Reservation) & {
  reception_time?: string;
};

// Type guard to check if item is an Order
const isOrder = (item: Order | Reservation): item is Order => {
  return "order_type" in item;
};

// Handle reception time extraction
const getReceptionTime = (item: MergedItemWithReception): string => {
  const matchedHistory = item.status_history?.find(
    (history: OrderStatusHistory | ReservationStatusHistory) =>
      history.new_status === item.status
  );

  const fallbackTime = isOrder(item) ? item.order_date : item.created_at;
  const targetTime = matchedHistory?.changed_at || fallbackTime;

  return format(parseISO(targetTime), TIME_FORMAT_BASE)?.replace(
    /:/g,
    JP_TIME_SEPARATOR_BASE
  );
};

// Helper function to check if order should be filtered out
const shouldFilterOutOrder = (item: MergedItemWithReception): boolean => {
  // Filter out cancelled items
  if (
    item.status === OrderStatusEnum.Cancelled ||
    item.status === OrderStatusEnum.Completed
  ) {
    return true;
  }

  // Filter out orders with payment_method: ONLINE and payment_status !== Paid
  if (isOrder(item)) {
    return (
      item.payment_method === PaymentMethodEnum.Online &&
      item.payment_status !== PaymentStatusEnum.Paid
    );
  }

  return false;
};

// Helper function to merge orders and reservations
const mergeOrdersAndReservations = (
  ordersResult: PromiseSettledResult<Order[]>,
  reservationsResult: PromiseSettledResult<{ results: Reservation[] }>
): (Order | Reservation)[] => {
  const orders = ordersResult.status === "fulfilled" ? ordersResult.value : [];
  const reservations =
    reservationsResult.status === "fulfilled"
      ? reservationsResult.value.results
      : [];

  // Create set of reservation IDs that already have orders
  const orderReservationIds = new Set(
    orders.map((order) => order.reservation).filter(Boolean)
  );

  // Filter out reservations that already have orders
  const filteredReservations = reservations.filter(
    (reservation) => !orderReservationIds.has(reservation.id)
  );

  return [...orders, ...filteredReservations];
};

// Helper function to sort items by date (newest first)
const sortItemsByDate = (
  items: (Order | Reservation)[]
): (Order | Reservation)[] => {
  return items.sort((a, b) => {
    const dateA = isOrder(a) ? a.order_date : a.created_at;
    const dateB = isOrder(b) ? b.order_date : b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
};

// Helper function to add reception time to items
const addReceptionTimeToItems = (
  items: (Order | Reservation)[]
): MergedItemWithReception[] => {
  return items.map((item) => ({
    ...item,
    reception_time: getReceptionTime(item),
  }));
};

const VenueOrderListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const venueId = user?.venue_roles[0]?.venue_id || "";

  const [loadingFirst, setLoadingFirst] = useState(false);
  const [mergedOrders, setMergedOrders] = useState<MergedItemWithReception[]>(
    []
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkStatusLoading, setIsBulkStatusLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch all data with orders and reservations
  const fetchAllData = useCallback(async () => {
    try {
      setLoadingFirst(true);
      const currentDate = getTokyoNow().format(DATE_FORMAT_BASE);
      const statusFilter = [
        OrderStatusEnum.Pending,
        OrderStatusEnum.Confirmed,
        OrderStatusEnum.Preparing,
        OrderStatusEnum.Ready,
      ].join(",");

      const [ordersResult, reservationsResult] = await Promise.allSettled([
        getListOrderByVenue(venueId),
        getReservationList(currentDate, currentDate, statusFilter, venueId),
      ]);

      // Process data pipeline
      const mergedItems = mergeOrdersAndReservations(
        ordersResult,
        reservationsResult
      );
      const sortedItems = sortItemsByDate(mergedItems);
      const itemsWithReceptionTime = addReceptionTimeToItems(sortedItems);
      const filteredItems = itemsWithReceptionTime.filter(
        (item) => !shouldFilterOutOrder(item)
      );

      setMergedOrders(filteredItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoadingFirst(false);
    }
  }, [venueId]);

  // Scroll to specific item after data is loaded
  const scrollToItem = (itemId: string, itemType: string) => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        const element = document.getElementById(`${itemType}-${itemId}`);
        if (element && scrollContainerRef.current) {
          element.scrollIntoView({
            behavior: "instant",
            block: "center",
          });
        }
      });
    }, 100);
  };

  useEffect(() => {
    const cameFromDetail = location.state?.fromOrdersList;

    const handlePageLoad = async () => {
      await fetchAllData();

      // If coming from detail, scroll to the specific item AFTER data is loaded
      if (
        cameFromDetail &&
        location.state?.itemId &&
        location.state?.itemType
      ) {
        scrollToItem(location.state.itemId, location.state.itemType);
        navigate(location.pathname, { replace: true, state: null });
      }
    };

    handlePageLoad();

    const intervalId = setInterval(fetchAllData, POLLING_INTERVAL_REFRESH_API);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, fetchAllData]);

  useEffect(() => {
    if (location.state?.fromOrdersList) {
      window.history.replaceState({}, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle click on item
  const handleClickItem = (item: Order | Reservation) => {
    if (item.status === OrderStatusEnum.Cancelled) {
      return;
    }

    const itemType = isOrder(item) ? "order" : "reservation";
    const commonState = {
      fromOrdersList: true,
      itemId: item.id,
      itemType: itemType,
    };

    if (isOrder(item)) {
      navigate(
        `/${ROUTE_PATH.VENUE.DASHBOARD}/${ROUTE_PATH.VENUE.ORDERS}/${item.id}`,
        { state: commonState }
      );
    } else {
      navigate(
        `/${ROUTE_PATH.VENUE.DASHBOARD}/${ROUTE_PATH.VENUE.RESERVATION}/${item.id}`,
        { state: commonState }
      );
    }
  };

  // Handle back button click navigation
  const handleBack = () => {
    if (isEditMode) {
      // Exit edit mode, reset checked items and don't navigate
      setIsEditMode(false);
      setCheckedItems(new Set());
    } else {
      // Navigate to dashboard
      navigate(`/${ROUTE_PATH.VENUE.DASHBOARD}`);
    }
  };

  // Calculate disabled items in a single loop for better performance
  const disabledItemsSet = useMemo(() => {
    const disabledSet = new Set<string>();
    let hasReadyChecked = false;
    let hasNonReadyChecked = false;

    // Single pass: detect checked types and calculate disabled items
    mergedOrders.forEach((item) => {
      const isChecked = checkedItems.has(item.id);
      const isReady = item.status === OrderStatusEnum.Ready;

      if (isChecked) {
        // Track what types of items are checked
        if (isReady) {
          hasReadyChecked = true;
        } else {
          hasNonReadyChecked = true;
        }
      }
    });

    // Early return if no items checked or mixed selection (shouldn't happen due to disabled logic)
    if (
      (!hasReadyChecked && !hasNonReadyChecked) ||
      (hasReadyChecked && hasNonReadyChecked)
    ) {
      return disabledSet;
    }

    // Single pass: disable unchecked items of opposite type
    mergedOrders.forEach((item) => {
      const isChecked = checkedItems.has(item.id);
      const isReady = item.status === OrderStatusEnum.Ready;

      if (!isChecked) {
        if ((hasReadyChecked && !isReady) || (hasNonReadyChecked && isReady)) {
          disabledSet.add(item.id);
        }
      }
    });

    return disabledSet;
  }, [checkedItems, mergedOrders]);

  // Handler to toggle checked state
  const toggleChecked = useCallback((itemId: string) => {
    setCheckedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Get selected items based on checkedItems
  const selectedItems = useMemo(() => {
    return mergedOrders.filter((item) => checkedItems.has(item.id));
  }, [mergedOrders, checkedItems]);

  // Check if all selected items are in READY status
  const isAllSelectedReady = useMemo(() => {
    return (
      selectedItems.length > 0 &&
      selectedItems.every((item) => item.status === OrderStatusEnum.Ready)
    );
  }, [selectedItems]);

  // Separate orders and reservations from items
  const separateOrdersAndReservations = (items: MergedItemWithReception[]) => {
    const orders: Order[] = [];
    const reservations: Reservation[] = [];

    items.forEach((item) => {
      if (isOrder(item)) {
        orders.push(item);
      } else {
        reservations.push(item);
      }
    });

    return { orders, reservations };
  };

  // Helper: Create promise for orders based on target status
  const createOrderPromises = (
    orders: Order[],
    targetStatus: OrderStatusEnum
  ): PromiseWithMetadata[] => {
    if (isEmpty(orders)) return [];

    const orderIds = orders.map((order) => order.id);

    if (targetStatus === OrderStatusEnum.Completed) {
      return [
        {
          promise: confirmMultipleOrderPickup(orderIds),
          orderIds,
        },
      ];
    }

    return [
      {
        promise: changeMultipleOrderStatus(orderIds, targetStatus),
        orderIds,
      },
    ];
  };

  // Helper: Create promise for reservations based on target status
  const createReservationPromises = (
    reservations: Reservation[],
    targetStatus: OrderStatusEnum
  ): PromiseWithMetadata[] => {
    if (isEmpty(reservations)) return [];

    const reservationIds = reservations.map((reservation) => reservation.id);
    return [
      {
        promise: changeMultipleReservationStatus(reservationIds, targetStatus),
        reservationIds,
      },
    ];
  };

  // Helper: Build all promises with metadata based on current status
  const buildPromisesWithMetadata = (
    orders: Order[],
    reservations: Reservation[]
  ): PromiseWithMetadata[] => {
    const targetStatus = isAllSelectedReady
      ? OrderStatusEnum.Completed
      : OrderStatusEnum.Ready;

    const orderPromises = createOrderPromises(orders, targetStatus);
    const reservationPromises = createReservationPromises(
      reservations,
      targetStatus
    );

    return [...orderPromises, ...reservationPromises];
  };

  // Helper: Extract failed item IDs from promise results
  const extractFailedItemIds = (
    results: PromiseSettledResult<unknown>[],
    promisesWithMetadata: PromiseWithMetadata[]
  ): Set<string> => {
    const failedItemIds = new Set<string>();

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const metadata = promisesWithMetadata[index];
        metadata.orderIds?.forEach((id) => failedItemIds.add(id));
        metadata.reservationIds?.forEach((id) => failedItemIds.add(id));
      }
    });

    return failedItemIds;
  };

  // Helper: Handle success case - clear selections and show success toast
  const handleSuccessCase = () => {
    setIsBulkStatusModalOpen(false);
    setIsEditMode(false);
    setCheckedItems(new Set());
    toast.success(t("venue.bulk_status.toast.update_status_success"));
  };

  // Helper: Handle partial failure case - keep failed items checked for retry
  const handlePartialFailureCase = (failedItemIds: Set<string>) => {
    const currentItemIds = new Set(mergedOrders.map((item) => item.id));
    const newCheckedItems = new Set(
      Array.from(checkedItems).filter(
        (id) => failedItemIds.has(id) && currentItemIds.has(id)
      )
    );
    setCheckedItems(newCheckedItems);
    setIsBulkStatusModalOpen(false);
  };

  // Handle bulk status confirmation
  const handleBulkStatusConfirm = async () => {
    if (isEmpty(selectedItems)) {
      setIsBulkStatusModalOpen(false);
      setCheckedItems(new Set());
      return;
    }

    setIsBulkStatusLoading(true);

    try {
      const { orders, reservations } =
        separateOrdersAndReservations(selectedItems);

      const promisesWithMetadata = buildPromisesWithMetadata(
        orders,
        reservations
      );
      const promises = promisesWithMetadata.map((item) => item.promise);
      const results = await Promise.allSettled(promises);

      const failedItemIds = extractFailedItemIds(results, promisesWithMetadata);

      // Always refresh data to sync with DB
      await fetchAllData();

      if (failedItemIds.size > 0) {
        handlePartialFailureCase(failedItemIds);
      } else {
        handleSuccessCase();
      }
    } catch (error) {
      console.error("Error updating bulk status:", error);
      // Still refresh data to sync with any partial updates
      await fetchAllData();
    } finally {
      setIsBulkStatusLoading(false);
    }
  };

  // Handle click on checked teal icon
  const handleCheckedTealClick = () => {
    if (isEmpty(checkedItems)) {
      // If no items selected, just exit edit mode
      setIsEditMode(false);
      setCheckedItems(new Set());
      return;
    }
    setIsBulkStatusModalOpen(true);
  };

  // Helper function to render individual items
  const renderOrderItem = (item: MergedItemWithReception) => {
    const isChecked = checkedItems.has(item.id);
    const isDisabled = disabledItemsSet.has(item.id);

    if (isOrder(item)) {
      return (
        <div key={item.id} id={`order-${item.id}`}>
          <CardOrderItemVenue
            receptionTime={item.reception_time || ""}
            orderCode={item.order_code || ""}
            orderMethod={item.order_type}
            specifiedTimeStart={formatDate(item.start_time || "--")}
            specifiedTimeEnd={formatDate(item.end_time || "--")}
            orderStatus={item.status || ""}
            onClick={() => handleClickItem(item)}
            isEditMode={isEditMode}
            checked={isChecked}
            disabled={isDisabled}
            onCheckChange={() => toggleChecked(item.id)}
          />
        </div>
      );
    } else {
      return (
        <div key={item.id} id={`reservation-${item.id}`}>
          <CardReservationVenue
            reservationCode={item.reservation_code || ""}
            receptionTime={item.reception_time || ""}
            orderMethod={t(OrderTypes.DINE_IN)}
            specifiedTimeStart={formatDate(item.start_time || "--")}
            specifiedTimeEnd={formatDate(item.end_time || "--")}
            reservationStatus={item.status || ""}
            onClick={() => handleClickItem(item)}
            isEditMode={isEditMode}
            checked={isChecked}
            disabled={isDisabled}
            onCheckChange={() => toggleChecked(item.id)}
          />
        </div>
      );
    }
  };

  // memo check edit mode and merged orders
  const enableEditMode = useMemo(() => {
    return isEditMode && !isEmpty(mergedOrders);
  }, [isEditMode, mergedOrders]);

  return (
    <Spin
      spinning={loadingFirst || isBulkStatusLoading}
      size="large"
      wrapperClassName="[&_.ant-spin]:!max-h-[100dvh]"
      className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
    >
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t(
            enableEditMode
              ? "venue.bulk_status.title"
              : "venue.title.order_status_list_title"
          )}
          onBack={handleBack}
          hasRightIcons
          customBackIcon={
            enableEditMode ? (
              <IconClose className="base-icon-size !text-[var(--primary-color)]" />
            ) : undefined
          }
        >
          <Button
            type="text"
            className={
              "!p-1 !flex !items-center !justify-center !bg-transparent !border-none !outline-none !min-w-10 !h-full"
            }
            onClick={() => {
              if (enableEditMode) {
                handleCheckedTealClick();
              } else {
                setIsEditMode(true);
              }
            }}
          >
            {enableEditMode ? (
              <IconCheckedTeal className="base-icon-size !text-[var(--background-teal-color)]" />
            ) : (
              <IconEdit
                className={`base-icon-size ${
                  isEmpty(mergedOrders)
                    ? "!text-[var(--text-disabled-color)]"
                    : "!text-white"
                }`}
              />
            )}
          </Button>
        </TopNavigationBar>

        {/* Venue Order List Content */}
        <div
          ref={scrollContainerRef}
          className="flex flex-col w-full h-full px-4 mt-4 gap-2 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth"
        >
          {!loadingFirst && mergedOrders.length === 0 && (
            <div className="flex-grow flex items-center justify-center py-4">
              <p className="text-sm-white">{t("general.no_data")}</p>
            </div>
          )}

          {mergedOrders.map(renderOrderItem)}
        </div>
      </div>

      {/* Bulk Status Confirmation Modal */}
      <BulkStatusConfirmationModal
        isOpen={isBulkStatusModalOpen}
        onClose={() => setIsBulkStatusModalOpen(false)}
        handleConfirm={handleBulkStatusConfirm}
        items={selectedItems}
        loading={isBulkStatusLoading}
        isConfirmingReady={isAllSelectedReady}
      />
    </Spin>
  );
};

export default VenueOrderListPage;
