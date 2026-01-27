import {
  VenueRequest,
  VenuesApi,
  MenuItemRequest,
  OrderTypeEnum,
  PausedTimeSlotRequest,
  TimeSlotRequest,
  MenuItemStockUpdateRequest,
  TimeSlotDailyLimitRequest,
  VenuesRetrieveMultilingualEnum,
  VenuesMenusItemsListMultilingualEnum,
  VenuesMenusCategoriesListMultilingualEnum,
  VenueQuestionRequest,
  VenuesQuestionsRetrieveMultilingualEnum,
} from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const venuesApi = new VenuesApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getDetailVenue = async (
  venueId: string,
  multilingual: VenuesRetrieveMultilingualEnum = VenuesRetrieveMultilingualEnum.True
) => {
  const res = await venuesApi.venuesRetrieve(venueId, multilingual);
  return res.data;
};

export const getMenuCategoriesWithItems = async (
  venueId: string,
  multilingual: VenuesMenusCategoriesListMultilingualEnum = VenuesMenusCategoriesListMultilingualEnum.True
) => {
  const res = await venuesApi.venuesMenusCategoriesListWithItemsRetrieve(
    venueId,
    multilingual
  );
  return res.data;
};

export const getTimeSlotsVenue = async (
  orderType: OrderTypeEnum,
  venueId: string
) => {
  const res = await venuesApi.venuesTimeSlotsList(orderType, venueId);
  return res.data;
};

export const getListMenuItems = async (
  venueId: string,
  categoryId?: string,
  multilingual: VenuesMenusItemsListMultilingualEnum = VenuesMenusItemsListMultilingualEnum.True
) => {
  const res = await venuesApi.venuesMenusItemsList(
    venueId,
    categoryId,
    undefined,
    multilingual
  );
  return res.data;
};

export const deleteMenuItem = async (venueId: string, itemId: string) => {
  const res = await venuesApi.venuesMenusItemsDestroy(itemId, venueId);
  return res.data;
};

export const getListMenuCategories = async (
  venueId: string,
  multilingual: VenuesMenusCategoriesListMultilingualEnum = VenuesMenusCategoriesListMultilingualEnum.True
) => {
  const res = await venuesApi.venuesMenusCategoriesList(venueId, multilingual);
  return res.data;
};

export const createNewMenuItem = async (
  venueId: string,
  data: MenuItemRequest
) => {
  const { name, price, description, image, take_out_price, category } = data;

  const res = await venuesApi.venuesMenusItemsCreate(
    venueId,
    name,
    price,
    description,
    image,
    take_out_price,
    true,
    category
  );
  return res.data;
};

export const updateMenuItem = async (
  venueId: string,
  itemId: string,
  data: MenuItemRequest
) => {
  const {
    name,
    price,
    description,
    image,
    take_out_price,
    category,
    is_priority_pass,
  } = data;

  const res = await venuesApi.venuesMenusItemsUpdate(
    itemId,
    venueId,
    name,
    price,
    description,
    image,
    take_out_price,
    true,
    category,
    undefined, // ingredients
    undefined, // preparationTime
    undefined, // isAlcoholic
    is_priority_pass
  );
  return res.data;
};

export const updateVenue = async (venueId: string, data: VenueRequest) => {
  const {
    name,
    address,
    description,
    announcement,
    phone_number,
    opening_time,
    closing_time,
    enable_eat_in,
    enable_reservation,
    enable_order_questions,
    logo,
    enable_cash_payment,
    enable_online_payment,
    enable_take_out,
    additional_info,
    additional_info_en,
    genre,
    genre_en,
    nearest_station,
    website,
  } = data;

  const res = await venuesApi.venuesUpdate(
    venueId,
    name,
    address,
    description,
    announcement,
    phone_number,
    undefined, // email
    website,
    opening_time,
    closing_time,
    true, // is_active
    enable_reservation,
    enable_eat_in,
    enable_take_out,
    enable_order_questions,
    logo,
    undefined, // qr_code
    enable_cash_payment,
    enable_online_payment,
    additional_info,
    additional_info_en,
    genre,
    genre_en,
    undefined, // buffer_time
    nearest_station
  );
  return res.data;
};

export const updatePausedTimeSlots = async (
  venueId: string,
  pausedTimeSlotRequest: PausedTimeSlotRequest
) => {
  const res = await venuesApi.venuesTimeSlotsPausedTimeSlotsCreate(
    venueId,
    pausedTimeSlotRequest
  );
  return res.data;
};

export const addNewTimeSlot = async (
  venueId: string,
  timeSlotRequest: TimeSlotRequest
) => {
  const res = await venuesApi.venuesTimeSlotsCreate(venueId, timeSlotRequest);
  return res.data;
};

export const updateTimeSlot = async (
  venueId: string,
  timeSlotId: string,
  timeSlotRequest: TimeSlotRequest
) => {
  const res = await venuesApi.venuesTimeSlotsUpdate(
    timeSlotId,
    venueId,
    timeSlotRequest
  );
  return res.data;
};

export const deleteTimeSlot = async (venueId: string, timeSlotId: string) => {
  const res = await venuesApi.venuesTimeSlotsDestroy(timeSlotId, venueId);
  return res.data;
};

export const addNewLimitCapacity = async (
  venueId: string,
  timeSlotId: string,
  timeSlotLimit: TimeSlotDailyLimitRequest
) => {
  const res = await venuesApi.venuesTimeSlotsAdditionalLimitCreate(
    timeSlotId,
    venueId,
    timeSlotLimit
  );
  return res.data;
};

export const updateOutOfStockMenuItems = async (
  venueId: string,
  menuItemStockUpdateRequest: MenuItemStockUpdateRequest
) => {
  const res = await venuesApi.venuesMenusItemsBulkUpdateStockCreate(
    venueId,
    menuItemStockUpdateRequest
  );
  return res.data;
};

export const getVenueStripeConnectAccount = async (venueId: string) => {
  const res = await venuesApi.venuesStripeConnectRetrieve(venueId);
  return res.data;
};

export const createStripeConnectAccount = async (venueId: string) => {
  const res = await venuesApi.venuesStripeConnectCreate(venueId);
  return res.data;
};

export const createOnboardingLink = async (venueId: string) => {
  const res = await venuesApi.venuesStripeConnectOnboardingLinkCreate(venueId);
  return res.data;
};

export const getListOrderQuestions = async (
  venueId: string,
  multilingual: VenuesQuestionsRetrieveMultilingualEnum = VenuesQuestionsRetrieveMultilingualEnum.True
) => {
  const res = await venuesApi.venuesQuestionsRetrieve(venueId, multilingual);
  return res.data;
};

export const updateListOrderQuestions = async (
  venueId: string,
  enableOrderQuestions: boolean,
  questions: Array<VenueQuestionRequest>
) => {
  const res = await venuesApi.venuesQuestionsUpdate(venueId, {
    enable_order_questions: enableOrderQuestions,
    questions: questions,
  });
  return res.data;
};
