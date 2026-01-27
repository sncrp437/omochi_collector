import { NotificationsApi } from "@/generated/api";
import request, { apiConfig } from "../utils/request";

export const notiApi = new NotificationsApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const registerNotiToken = async (token: string) => {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("device_id", deviceId);
  }
  const res = await notiApi.registerFcmToken({
    token,
    device_id: deviceId,
    device_type: "WEB",
  });
  return res.data;
};

export const getUserNotification = async (
  page?: number,
  pageSize?: number,
  status?: string
) => {
  const res = await notiApi.notificationsList(page, pageSize, status);
  return res.data;
};

export const getUserNotificationDetail = async (id: string) => {
  const res = await notiApi.notificationsRetrieve(id);
  return res.data;
};

export const readAllNotification = async () => {
  const res = await notiApi.notificationsReadAllUpdate();
  return res.data;
};

export const getUpcomingNotificationVenue = async (venueId: string) => {
  const res = await notiApi.notificationsUpcomingReservationsRetrieve(venueId);
  return res.data;
};

export const readOneNotification = async (id: string) => {
  const res = await notiApi.notificationsReadUpdate(id);
  return res.data;
};
