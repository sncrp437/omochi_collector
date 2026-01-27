import {
  StockedVenueRequest,
  StockedVenuesApi,
  OrderTypeEnum,
} from "@/generated/api";
import request, { apiConfig } from "../utils/request";

export const stockVenueApi = new StockedVenuesApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getListStockVenues = async (
  genre?: string,
  isFavorite?: boolean,
  nearestStation?: string,
  orderType?: OrderTypeEnum
) => {
  const res = await stockVenueApi.stockedVenuesList(
    genre,
    isFavorite,
    nearestStation,
    orderType
  );
  return res.data;
};

export const addFavoriteVenue = async (
  id: string,
  data: StockedVenueRequest
) => {
  const res = await stockVenueApi.stockedVenuesFavoriteUpdate(id, data);
  return res.data;
};

export const createStockVenue = async (data: StockedVenueRequest) => {
  const res = await stockVenueApi.stockedVenuesCreate(data);
  return res.data;
};
