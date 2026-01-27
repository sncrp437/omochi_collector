import {
  AreasApi,
  AreasPrefecturesRetrieveMultilingualEnum,
} from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const areasApi = new AreasApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getListPrefectures = async (
  multilingual: AreasPrefecturesRetrieveMultilingualEnum = AreasPrefecturesRetrieveMultilingualEnum.True
) => {
  const res = await areasApi.areasPrefecturesRetrieve(multilingual);
  return res.data;
};
