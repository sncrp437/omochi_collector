import { CampaignsApi } from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const campaignsApi = new CampaignsApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getListCampaigns = async () => {
  const res = await campaignsApi.campaignsList();
  return res.data;
};
