import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Spin, Form, Button, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import {
  POLLING_INTERVAL_REFRESH_API,
  ROUTE_PATH,
  OrderStatusEnum,
  ORDER_TYPE_OPTIONS,
  MAX_SIZE_FETCH_ORDERS,
} from "@/utils/constants";
import { getOrderList } from "@/api/order";
import { getReservationList } from "@/api/reservation";
import { RootState } from "@/store";
import { useSelector } from "react-redux";
import {
  OrderList,
  OrderTypeEnum,
  Reservation,
  PaginatedReservationList,
  PaginatedOrderListList,
} from "@/generated/api";
import { format } from "date-fns";
import CardOrderLogItemVenue from "@/components/card/venue/CardOrderLogItemVenue";
import SelectInput from "@/components/common/form/SelectInput";
import CardReservationLogItemVenue from "@/components/card/venue/CardReservationLogItemVenue";
import SkeletonCardOrderItem from "@/components/skeleton/SkeletonCardOrderItem";
import { getSortTimeOrder } from "@/utils/helper";
import CustomDateRangePicker from "@/components/common/form/CustomDateRangePicker";

const { Text } = Typography;

type MergedItemWithReception = (OrderList | Reservation) & {
  reception_time?: string;
};

const VenueOrderLogListPage = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const venueId = user?.venue_roles[0]?.venue_id || "";
  const initConfigLoadMore = {
    hasLoadMore: true,
    currentPage: 1,
    loadingLoadMore: false,
  };
  const [configLoadMore, setConfigLoadMore] = useState(initConfigLoadMore);
  const [loadingFirst, setLoadingFirst] = useState(false);
  const [mergedOrders, setMergedOrders] = useState<MergedItemWithReception[]>(
    []
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const orderType = Form.useWatch("orderType", form) || "";
  const completionDate = Form.useWatch("completionDate", form) || [];
  const currentPageRef = useRef(configLoadMore.currentPage);

  const orderTypeOptions = [
    ...ORDER_TYPE_OPTIONS,
    {
      value: "reservation",
      label: "order.label.only_reservation_label",
    },
  ].map((option) => ({
    label: t(option.label),
    value: option.value,
  }));

  const fetchDataLogs = async (isLoadMore = false, page?: number) => {
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
      const completionDateFormated = completionDate?.map((dateStr: Date) =>
        dateStr ? format(dateStr, "yyyy-MM-dd") : null
      );

      const startDate = completionDateFormated?.[0] || "";
      const endDate = completionDateFormated?.[1] || "";

      let response: PaginatedOrderListList | PaginatedReservationList;

      if (orderType === "reservation") {
        // Fetch reservation list
        response = await getReservationList(
          startDate,
          endDate,
          OrderStatusEnum.Completed,
          venueId,
          targetPage,
          MAX_SIZE_FETCH_ORDERS
        );
        response.results =
          response?.results?.filter((item) => !item.order_id) || [];
      } else {
        // Fetch order list
        response = await getOrderList(
          startDate,
          orderType,
          endDate,
          OrderStatusEnum.Completed,
          "",
          venueId,
          targetPage,
          MAX_SIZE_FETCH_ORDERS
        );
      }

      const results = response?.results || [];
      const totalLoaded = targetPage * MAX_SIZE_FETCH_ORDERS;
      setConfigLoadMore((prevConfig) => ({
        ...prevConfig,
        hasLoadMore: totalLoaded < response.count,
      }));

      // Sort by time in descending order
      const sortedResults = results.sort(
        (a, b) => getSortTimeOrder(b) - getSortTimeOrder(a)
      );

      setMergedOrders((prevOrders) => {
        const newOrders = [...prevOrders, ...sortedResults];

        // Remove duplicates based on id
        const uniqueOrders = Array.from(
          new Map(newOrders.map((item) => [item.id, item])).values()
        );

        return uniqueOrders;
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      setMergedOrders([]);
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

  useEffect(() => {
    currentPageRef.current = configLoadMore.currentPage;
  }, [configLoadMore.currentPage]);

  useEffect(() => {
    const cameFromDetail = location.state?.fromOrdersList;
    if (!orderType) {
      return;
    }

    if (cameFromDetail) {
      setMergedOrders(location.state.mergedOrders || []);
      setConfigLoadMore(location.state.configLoadMore || initConfigLoadMore);
      form.setFieldsValue(
        location.state.formValues || {
          orderType: OrderTypeEnum.DineIn,
        }
      );
      setTimeout(() => {
        requestAnimationFrame(() => {
          scrollContainerRef.current?.scrollTo({
            top: location.state.scrollY,
            behavior: "instant",
          });
        });
      }, 100);
      navigate(location.pathname, { replace: true, state: null });
    } else {
      setConfigLoadMore(initConfigLoadMore);
      setMergedOrders([]);
      fetchDataLogs(false, 1);
    }

    const intervalId = setInterval(fetchDataLogs, POLLING_INTERVAL_REFRESH_API);

    return () => {
      clearInterval(intervalId);
    };
  }, [venueId, orderType, JSON.stringify(completionDate)]);

  useEffect(() => {
    if (location.state?.fromOrdersList) {
      window.history.replaceState({}, "");
    }
  }, []);

  const handleLoadMore = () => {
    const nextPage = configLoadMore.currentPage + 1;
    setConfigLoadMore((prevConfig) => ({
      ...prevConfig,
      currentPage: nextPage,
    }));

    fetchDataLogs(true, nextPage);
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
          title={t("venue.title.order_logs_title")}
          onBack={() => navigate(`/${ROUTE_PATH.VENUE.DASHBOARD}`)}
        />

        {/* Venue Order History List Content */}
        <div className="flex-1 flex flex-col w-full h-full px-4 mt-4 gap-4 scrollbar-hidden overflow-y-auto scroll-smooth">
          <Form
            form={form}
            name="orderHistoryForm"
            layout="horizontal"
            requiredMark={false}
            className="!w-full flex-row-center !gap-2"
            initialValues={{
              orderType: OrderTypeEnum.DineIn,
            }}
          >
            <Form.Item
              name="orderType"
              className="form-item-error-explanation form-item-select-middle !min-w-[100px] !w-[120px] !max-w-[120px]"
            >
              <SelectInput
                placeholder={t("order.label.order_method_all_label")}
                size="middle"
                className="!text-white placeholder-fix"
                popupClassName="!bg-[var(--background-color)] !text-white [&_.ant-select-item-option-content]:!text-[12px]"
                rootClassName="custom-select "
                options={orderTypeOptions}
              />
            </Form.Item>

            <Form.Item
              name="completionDate"
              className="form-item-error-explanation form-item-select-middle !flex-1"
            >
              <CustomDateRangePicker
                placeholder={[
                  t("general.select_date_label"),
                  t("general.select_date_label"),
                ]}
                value={completionDate}
                onChange={(dates) => {
                  form.setFieldsValue({ completionDate: dates });
                }}
              />
            </Form.Item>
          </Form>

          <div
            ref={scrollContainerRef}
            className="flex-1 flex flex-col gap-4 w-full scrollbar-hidden overflow-y-auto scroll-smooth pb-4"
          >
            {!loadingFirst && mergedOrders.length === 0 ? (
              <div className="flex-grow flex items-center justify-center py-4">
                <p className="text-sm-white">{t("general.no_data")}</p>
              </div>
            ) : (
              <>
                {mergedOrders?.map((item) => {
                  const commonState = {
                    fromOrdersList: true,
                    mergedOrders,
                    configLoadMore,
                    formValues: form.getFieldsValue(),
                  };

                  if ("order_type" in item) {
                    // This is an Order
                    return (
                      <CardOrderLogItemVenue
                        key={item.id}
                        orderCode={item.order_code || ""}
                        orderMethod={item.order_type}
                        onClick={() =>
                          navigate(
                            `/${ROUTE_PATH.VENUE.DASHBOARD}/${ROUTE_PATH.VENUE.ORDER_LOGS}/${item.id}`,
                            {
                              state: {
                                ...commonState,
                                scrollY:
                                  scrollContainerRef.current?.scrollTop || 0,
                              },
                            }
                          )
                        }
                        price={item.total}
                        completionTime={item.pickup_time}
                      />
                    );
                  } else {
                    // This is a Reservation
                    return (
                      <CardReservationLogItemVenue
                        key={item.id}
                        reservationCode={item.reservation_code || ""}
                        onClick={() =>
                          navigate(
                            `/${ROUTE_PATH.VENUE.DASHBOARD}/${ROUTE_PATH.VENUE.RESERVATION_LOGS}/${item.id}`,
                            {
                              state: {
                                ...commonState,
                                scrollY:
                                  scrollContainerRef.current?.scrollTop || 0,
                              },
                            }
                          )
                        }
                        completionTime={item.updated_at}
                      />
                    );
                  }
                })}
                {!loadingFirst &&
                  mergedOrders.length > 0 &&
                  configLoadMore.hasLoadMore && (
                    <>
                      {configLoadMore.loadingLoadMore ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <SkeletonCardOrderItem key={index} />
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
        </div>
      </div>
    </Spin>
  );
};

export default VenueOrderLogListPage;
