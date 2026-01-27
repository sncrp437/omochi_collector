import { SystemSettingsApi } from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const systemSettingsApi = new SystemSettingsApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getApplicationFee = async () => {
  const res = await systemSettingsApi.systemSettingsApplicationFeeRetrieve();
  return res.data;
};
