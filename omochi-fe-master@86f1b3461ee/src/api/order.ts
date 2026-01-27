import {
  OrdersApi,
  OrderCreateRequest,
  OrderStatusUpdateRequest,
  Status514Enum,
} from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const ordersApi = new OrdersApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const createNewOrder = async (orderRequest: OrderCreateRequest) => {
  const res = await ordersApi.ordersCreate(orderRequest);
  return res.data;
};

export const getOrderList = async (
  startDate?: string,
  orderType?: string,
  endDate?: string,
  status?: string,
  timeSlot?: string,
  venueId?: string,
  page?: number,
  pageSize?: number
) => {
  const res = await ordersApi.ordersList(
    endDate,
    orderType,
    page,
    pageSize,
    startDate,
    status,
    timeSlot,
    venueId
  );
  return res.data;
};

export const getDetailOrder = async (orderId: string) => {
  const res = await ordersApi.ordersRetrieve(orderId);
  return res.data;
};

export const createOrderPayment = async (orderId: string) => {
  const res = await ordersApi.ordersPayCreate(orderId);
  return res.data;
};

export const getMyOrderList = async () => {
  const res = await ordersApi.ordersMyOrdersRetrieve();
  return res.data;
};

export const getListOrderByVenue = async (venueId: string) => {
  const res = await ordersApi.ordersByVenueRetrieve(venueId);
  return res.data;
};

export const updateOrderStatus = async (
  orderId: string,
  body: OrderStatusUpdateRequest
) => {
  const res = await ordersApi.ordersStatusUpdate(orderId, body);
  return res.data;
};

export const confirmOrderPickup = async (orderId: string) => {
  const res = await ordersApi.ordersConfirmPickupCreate(orderId);
  return res.data;
};

export const cancelOrder = async (orderId: string) => {
  const res = await ordersApi.ordersDestroy(orderId);
  return res.data;
};

// change multiple order status
export const changeMultipleOrderStatus = async (
  orderIds: string[],
  status: string
) => {
  const res = await ordersApi.ordersBulkStatusUpdate({
    order_ids: orderIds,
    status: status as Status514Enum,
  });
  return res.data;
};

// confirm multiple order pickup
export const confirmMultipleOrderPickup = async (orderIds: string[]) => {
  const res = await ordersApi.ordersBulkConfirmPickupCreate({
    order_ids: orderIds,
  });
  return res.data;
};
