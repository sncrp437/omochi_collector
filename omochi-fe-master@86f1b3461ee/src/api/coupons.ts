import { CouponsApi } from "../generated/api";
import request, { apiConfig } from "../utils/request";

export const couponsApi = new CouponsApi(
  apiConfig,
  apiConfig.basePath,
  request.axios
);

export const getUserCoupons = async (userId?: string, venueId?: string) => {
  const res = await couponsApi.couponsUserCouponsList(userId, venueId);
  return res.data;
};

export const getUserCouponDetail = async (couponId: string) => {
  const res = await couponsApi.couponsUserCouponsRetrieve(couponId);
  return res.data;
};

export const getCampaignCoupons = async (venueId: string) => {
  const res = await couponsApi.couponsCampaignCouponsList(venueId);
  return res.data;
};

export const claimCampaignCoupon = async (couponId: string) => {
  const res = await couponsApi.couponsCampaignUserCouponClaimCreate(couponId);
  return res.data;
};
