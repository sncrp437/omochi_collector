import { RefLogsApi, RefLogClickRequest } from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const refLogApi = new RefLogsApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const createRefLog = async (refLogRequest: RefLogClickRequest) => {
  const res = await refLogApi.logRefClick(refLogRequest);
  return res.data;
};
