import { PartnerStoresApi } from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const partnerStoresApi = new PartnerStoresApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getListPartnerStores = async () => {
  const res = await partnerStoresApi.partnerStoresList();
  return res.data;
};
