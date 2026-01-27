import { PaymentsApi } from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const paymentApi = new PaymentsApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const checkStatusPayment = async (sessionId: string) => {
  const res = await paymentApi.paymentsCheckStatusRetrieve(sessionId);
  return res.data;
};
