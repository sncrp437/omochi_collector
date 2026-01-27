import { Button, Typography, Radio } from "antd";
import { useState, useEffect } from "react";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getUserCoupons,
  getCampaignCoupons,
  claimCampaignCoupon,
} from "@/api/coupons";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { isEmpty } from "@/utils/helper";
import { UserCoupon, Coupon } from "@/generated/api";
import SkeletonCardCouponItem from "@/components/skeleton/SkeletonCardCouponItem";
import CardCouponItem from "@/components/card/CardCouponItem";
import { ROUTE_PATH } from "@/utils/constants";
import { setOrderSummary } from "@/store/slices/cartSlice";

const { Text } = Typography;

const COUPON_LABELS = {
  APPLY: "order.label.apply_coupon_label",
  CANCEL: "order.label.cancel_coupon_label",
};

const CouponsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const urlSearch = new URLSearchParams(location.search);
  const locationState = location.state as {
    venueId?: string;
    cartPageSearchParams?: string;
  } | null;
  const venueId = locationState?.venueId || urlSearch?.get("venueId") || "";

  const cartInfo = useSelector((state: RootState) => state.cart?.[venueId]);
  const orderSummary = cartInfo?.orderSummary || {};
  const couponId = orderSummary?.coupon?.id || null;

  const refCode = urlSearch.get("ref") || "";
  const { user } = useSelector((state: RootState) => state.auth);
  const [listCoupons, setListCoupons] = useState<UserCoupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(
    couponId
  );

  // Use preserved search params from CartPage if available
  const cartPageSearchParams = locationState?.cartPageSearchParams || "";
  const urlBack = cartPageSearchParams
    ? `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${ROUTE_PATH.STORE.CART}${cartPageSearchParams}`
    : refCode
    ? `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${ROUTE_PATH.STORE.CART}?ref=${refCode}`
    : `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${ROUTE_PATH.STORE.CART}`;

  const [loading, setLoading] = useState(false);
  const [loadingClaimCoupon, setLoadingClaimCoupon] = useState(false);
  const { t } = useTranslation();

  const isDisabledButton = !venueId || isEmpty(user) || isEmpty(listCoupons);

  const handleSelectCoupon = (couponId: string) => {
    setSelectedCouponId((prevId) => (prevId === couponId ? null : couponId));
  };

  useEffect(() => {
    const fetchCoupons = async () => {
      setLoading(true);
      try {
        // use Promise.allSettled to fetch both user coupons and campaign coupons
        const [userCouponsResult, campaignCouponsResult] =
          await Promise.allSettled([
            getUserCoupons(user?.id, venueId),
            getCampaignCoupons(venueId),
          ]);

        // handle user coupons result
        const userCoupons: UserCoupon[] =
          userCouponsResult.status === "fulfilled"
            ? userCouponsResult.value || []
            : [];

        // handle campaign coupons result
        const campaignCoupons: Coupon[] =
          campaignCouponsResult.status === "fulfilled"
            ? campaignCouponsResult.value || []
            : [];

        if (!isEmpty(userCoupons) || !isEmpty(campaignCoupons)) {
          if (!orderSummary?.orderType || !orderSummary?.paymentMethod) {
            setListCoupons([]);
            return;
          }

          // Create a map of campaign coupons for quick lookup
          const campaignCouponMap = new Map(
            campaignCoupons.map((campaignCoupon) => [
              campaignCoupon.id,
              campaignCoupon,
            ])
          );

          // Update user coupons with campaign coupon's created_at if duplicate exists
          const updatedUserCoupons = userCoupons.map((userCoupon) => {
            const campaignCoupon = campaignCouponMap.get(userCoupon.coupon.id);
            if (campaignCoupon) {
              // If user coupon exists and campaign coupon also exists,
              // use campaign coupon's created_at to maintain original order
              return {
                ...userCoupon,
                created_at: campaignCoupon.created_at,
              };
            }
            return userCoupon;
          });

          // Get campaign coupons that don't have corresponding user coupons
          const filteredCampaignCoupons = campaignCoupons.filter(
            (campaignCoupon) =>
              !userCoupons.some(
                (userCoupon) => userCoupon.coupon.id === campaignCoupon.id
              )
          );

          // create UserCoupon objects from campaign coupons
          const campaignUserCoupons: UserCoupon[] = filteredCampaignCoupons.map(
            (campaignCoupon) => ({
              id: campaignCoupon.id,
              user: "",
              coupon: campaignCoupon,
              is_used: false,
              created_at: campaignCoupon.created_at,
              expiry_date: campaignCoupon.expiry_date,
              updated_at: campaignCoupon.updated_at,
            })
          );

          // combine updated user coupons and campaign coupons
          const allCoupons = [...updatedUserCoupons, ...campaignUserCoupons];

          // filter by order type and payment method
          const filteredCoupons = allCoupons.filter((userCoupon) => {
            const coupon = userCoupon.coupon;

            const orderTypeMatch =
              coupon.order_type &&
              coupon.order_type.includes(orderSummary.orderType!);

            const paymentMethodMatch =
              coupon.payment_method &&
              coupon.payment_method.includes(orderSummary.paymentMethod!);

            return orderTypeMatch && paymentMethodMatch;
          });

          // Sort by LIFO
          const sortedCoupons = filteredCoupons.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );

          setListCoupons(sortedCoupons);
        }
      } catch (error) {
        console.error("Failed to fetch coupons:", error);
        setListCoupons([]);
      } finally {
        setLoading(false);
      }
    };

    if (venueId) {
      fetchCoupons();
    }
  }, [user?.id, venueId, orderSummary?.orderType, orderSummary?.paymentMethod]);

  const labelButton = selectedCouponId
    ? COUPON_LABELS.APPLY
    : COUPON_LABELS.CANCEL;

  const handleCheckCoupon = async () => {
    if (isDisabledButton) return;

    if (!selectedCouponId) {
      dispatch(
        setOrderSummary({
          venueId,
          orderSummary: {
            ...orderSummary,
            coupon: undefined,
          },
        })
      );
      navigate(urlBack);
      return;
    }

    const selectedCoupon = listCoupons.find(
      (coupon) => coupon.id === selectedCouponId
    );

    if (!selectedCoupon) {
      return;
    }

    // Check if this is a campaign coupon
    const isCampaignCoupon = !selectedCoupon.user;

    if (isCampaignCoupon && user?.id) {
      try {
        setLoadingClaimCoupon(true);
        // Create user coupon for campaign coupon
        const createdUserCoupon = await claimCampaignCoupon(selectedCoupon.id);

        // Update redux with the created user coupon
        dispatch(
          setOrderSummary({
            venueId,
            orderSummary: {
              ...orderSummary,
              coupon: {
                id: createdUserCoupon.id,
                amount: createdUserCoupon.coupon.amount,
                type: createdUserCoupon.coupon?.type,
              },
            },
          })
        );
      } catch (error) {
        console.error("Failed to create user coupon:", error);
        return;
      } finally {
        setLoadingClaimCoupon(false);
      }
    } else {
      // For existing user coupons, use directly
      dispatch(
        setOrderSummary({
          venueId,
          orderSummary: {
            ...orderSummary,
            coupon: {
              id: selectedCoupon.id,
              amount: selectedCoupon.coupon.amount,
              type: selectedCoupon.coupon?.type,
            },
          },
        })
      );
    }

    navigate(urlBack);
  };

  // Handle back navigation
  const handleBack = () => {
    if (urlBack && venueId) {
      navigate(urlBack);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <TopNavigationBar
        title={t("order.title.coupon_title")}
        onBack={handleBack}
      />

      {/* Coupons Content */}
      <div className="flex flex-col w-full h-full px-4 mt-2 gap-3 scrollbar-hidden overflow-y-auto scroll-smooth pb-[45px]">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCardCouponItem key={index} />
          ))
        ) : isEmpty(listCoupons) ? (
          <div className="flex-grow flex items-center justify-center py-4">
            <Text className="text-sm-white">{t("general.no_data")}</Text>
          </div>
        ) : (
          <Radio.Group
            value={selectedCouponId}
            onChange={(e) => {
              setSelectedCouponId(e.target.value);
            }}
            className="!pt-1 !flex flex-col !w-full !gap-2 [&_.ant-radio-button-wrapper::before]:!hidden"
          >
            {listCoupons.map((coupon) => (
              <Radio.Button
                value={coupon.id}
                checked={selectedCouponId === coupon.id}
                key={coupon.id}
                onClick={() => handleSelectCoupon(coupon.id)}
                className="!p-0 !border-none !bg-transparent !w-full !h-auto !flex-1 !rounded-2xl "
              >
                <CardCouponItem
                  key={coupon.id}
                  coupon={coupon.coupon}
                  onClick={() => {}}
                  isUsed={coupon.is_used}
                  selected={selectedCouponId === coupon.id}
                  expiryDate={coupon.expiry_date}
                />
              </Radio.Button>
            ))}
          </Radio.Group>
        )}

        {/* Button Bottom */}
        <div className="z-10 !border-none !outline-none !shadow-none !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            type="text"
            className={`!h-10 !min-h-10 !max-h-10 !flex-1 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
              isDisabledButton
                ? "button-disabled"
                : " !bg-[var(--primary-color)] !text-white"
            }`}
            style={{ height: "unset" }}
            loading={loading || loadingClaimCoupon}
            onClick={handleCheckCoupon}
          >
            <Text className="text-sm-white !font-bold">{t(labelButton)}</Text>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CouponsPage;
