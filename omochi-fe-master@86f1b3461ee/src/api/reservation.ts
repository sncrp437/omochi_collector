import {
  ReservationsApi,
  ReservationRequest,
  ReservationStatusUpdateRequest,
  Status514Enum,
} from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const reservationsApi = new ReservationsApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getReservationList = async (
  startDate?: string,
  endDate?: string,
  status?: string,
  venue?: string,
  page?: number,
  pageSize?: number
) => {
  const res = await reservationsApi.reservationsList(
    endDate,
    page,
    pageSize,
    startDate,
    status,
    venue
  );
  return res.data;
};

export const getReservationDetail = async (reservationId: string) => {
  const res = await reservationsApi.reservationsRetrieve(reservationId);
  return res.data;
};

export const createNewReservation = async (
  reservationRequest: ReservationRequest
) => {
  const res = await reservationsApi.reservationsCreate(reservationRequest);
  return res.data;
};

export const getMyReservationList = async (
  endDate?: string,
  startDate?: string,
  status?: string
) => {
  const res = await reservationsApi.reservationsMyReservationsList(
    endDate,
    startDate,
    status
  );
  return res.data;
};

export const updateReservationStatus = async (
  reservationId: string,
  body: ReservationStatusUpdateRequest
) => {
  const res = await reservationsApi.reservationsStatusUpdate(
    reservationId,
    body
  );
  return res.data;
};

// change multiple reservation status
export const changeMultipleReservationStatus = async (
  reservationIds: string[],
  status: string
) => {
  const res = await reservationsApi.reservationsBulkStatusUpdate({
    reservation_ids: reservationIds,
    status: status as Status514Enum,
  });
  return res.data;
};
