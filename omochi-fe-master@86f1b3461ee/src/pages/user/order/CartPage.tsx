/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useRef } from "react";
import { Button, Typography, Spin, Modal } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import {
  ROUTE_PATH,
  ORDER_TYPE_OPTIONS,
  DUMMY_MENU_ITEM_TABLE,
  PaymentStripeStatusEnum,
} from "@/utils/constants";
import {
  IconCreditComponent,
  IconCoupon,
  IconRestPayment,
  IconCartComponent,
} from "@/assets/icons";
import BaseCardInfo from "@/components/card/BaseCardInfo";
import {
  getLabelFromOptions,
  convertToMenuItemsTable,
  isEmpty,
  getRedirectPathFromSource,
} from "@/utils/helper";
import PaymentMethodRadio from "@/components/common/form/PaymentMethodRadio";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { store } from "@/store";
import { PriceMapMenuItem, CartSliceItem } from "@/types/cart";
import { useCookies } from "react-cookie";
import {
  PaymentMethodEnum,
  OrderItemRequest,
  OrderTypeEnum,
  CouponTypeEnum,
  PaymentStatusEnum,
  Order,
  LangEnum,
} from "@/generated/api";
import {
  createNewOrder,
  createOrderPayment,
  getDetailOrder,
  cancelOrder,
} from "@/api/order";
import {
  clearCart,
  setOrderSummary,
  updateCartDetailFromOrder,
  updatePaymentStatus,
  updateCartInfoFromMenu,
  setApplicationFeeCart,
  setOrderQuestionAnswers,
  updateQuantity,
} from "@/store/slices/cartSlice";
import { createStockVenue } from "@/api/stock-venue";
import { getDetailVenue, getMenuCategoriesWithItems } from "@/api/venue";
import { hasCartItemChanged } from "@/utils/cart";
import BaseModalNotice from "@/components/common/modal/BaseModalNotice";
import OrderAmountDetails from "@/components/card/OrderAmountDetails";
import { getUserCouponDetail } from "@/api/coupons";
import { createRefLog } from "@/api/ref-logs";
import { getApplicationFee } from "@/api/system";
import TermsOfServiceModal from "@/components/common/modal/TermsOfServiceModal";
import OrderQuestionsModal from "@/components/common/modal/OrderQuestionsModal";
import { getListOrderQuestions } from "@/api/venue";
import { VenueQuestion } from "@/generated/api";
import { convertAnswersToOrderQuestions } from "@/utils/helper";
import { useLanguage } from "@/hooks/useLanguage";

const { Text } = Typography;

const CartPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { id: venueId = "" } = useParams<{ id: string }>();
  const { currentLanguage } = useLanguage();

  const cartInfo = useSelector((state: RootState) => state.cart?.[venueId]);
  const applicationFeeCart = cartInfo?.applicationFee;
  const orderSummary = cartInfo?.orderSummary || {};
  const rawItems = cartInfo?.items || [];
  const supportedPaymentMethods = orderSummary?.supportedPaymentMethods || [];
  const orderQuestionAnswers = cartInfo?.orderQuestionAnswers || {};

  const getInitialPaymentMethod = (): PaymentMethodEnum | null => {
    if (supportedPaymentMethods.length === 0) {
      return null;
    }

    if (
      orderSummary.paymentMethod &&
      supportedPaymentMethods.includes(orderSummary.paymentMethod)
    ) {
      return orderSummary.paymentMethod;
    }

    const fallback = supportedPaymentMethods.includes(PaymentMethodEnum.Cash)
      ? PaymentMethodEnum.Cash
      : supportedPaymentMethods[0];

    return fallback;
  };

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodEnum>(
    getInitialPaymentMethod() || PaymentMethodEnum.Cash
  );
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [cookies] = useCookies(["is-first-visit"]);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [loadingPaymentCard, setLoadingPaymentCard] = useState(false);
  const isFailed = useMemo(
    () => orderSummary?.paymentStatus === PaymentStripeStatusEnum.Failed,
    [orderSummary?.paymentStatus]
  );

  const [loadingOrder, setLoadingOrder] = useState(
    !!orderSummary?.orderId && isFailed
  );
  const [isFailedPayment, setIsFailedPayment] = useState(isFailed);
  const urlSearch = new URLSearchParams(location.search);
  const refCode = urlSearch.get("ref") || "";
  const needPayment = urlSearch.get("need_payment") === "true";
  const hasFetchedOrderDetail = useRef(false);
  const skipCouponValidation = useRef(false);

  const [openModalUpdated, setOpenModalUpdated] = useState(false);
  const [openTermsOfService, setOpenTermsOfService] = useState(false);
  const [loadingApplicationFee, setLoadingApplicationFee] = useState(false);
  const [openOrderQuestions, setOpenOrderQuestions] = useState(false);
  const [venueQuestions, setVenueQuestions] = useState<VenueQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const fetchApplicationFee = async () => {
    setLoadingApplicationFee(true);
    try {
      const response = await getApplicationFee();
      if (!isEmpty(response)) {
        dispatch(
          setApplicationFeeCart({
            venueId,
            applicationFee: {
              amount: response.amount ?? 0,
              tax_rate: response.tax_rate ?? 0.1,
            },
          })
        );
      }
    } catch (error) {
      console.error("Error fetching application fee:", error);
    } finally {
      setLoadingApplicationFee(false);
    }
  };

  // Fetch venue questions for order (DineIn only)
  const fetchVenueQuestions = async (): Promise<VenueQuestion[]> => {
    // Gate: Only fetch questions for DineIn orders
    if (orderSummary?.orderType !== OrderTypeEnum.DineIn) {
      return [];
    }
    setLoadingQuestions(true);
    try {
      const response = await getListOrderQuestions(venueId);
      return response?.questions || [];
    } catch (error) {
      console.error("Error fetching venue questions:", error);
      return [];
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      handleCreateStockVenue();

      // Check if there's an existing order to handle
      if (orderSummary?.orderId) {
        try {
          setLoadingOrder(true);
          const orderDetail = await getDetailOrder(orderSummary.orderId!);

          // Check if order is already paid or is cash payment
          if (
            (orderDetail.payment_status === PaymentStatusEnum.Paid &&
              orderDetail.payment_method === PaymentMethodEnum.Online) ||
            orderDetail.payment_method === PaymentMethodEnum.Cash
          ) {
            // Clear cart and redirect to orders page
            dispatch(clearCart(venueId));
            return;
          }

          // Check if order is ONLINE payment but not PAID and not completed
          if (
            orderSummary?.paymentMethod === PaymentMethodEnum.Online &&
            orderSummary?.paymentStatus &&
            orderSummary?.paymentStatus !== PaymentStripeStatusEnum.Completed &&
            !hasFetchedOrderDetail.current
          ) {
            hasFetchedOrderDetail.current = true;
            // Set flag to skip coupon validation
            skipCouponValidation.current = true;

            // Use the already fetched orderDetail instead of calling fetchOrderDetail again
            if (!isEmpty(orderDetail) && needPayment) {
              dispatch(
                updateCartDetailFromOrder({
                  venueId,
                  orderDetail: orderDetail,
                })
              );

              // Save order questions and answers to Redux if order has questions (DineIn only)
              if (
                orderDetail.order_type === OrderTypeEnum.DineIn &&
                orderDetail.order_questions &&
                orderDetail.order_questions.length > 0
              ) {
                // First, fetch venue questions to get the mapping
                const venueQuestions = await fetchVenueQuestions();

                const answers: Record<string, string> = {};
                orderDetail.order_questions.forEach((orderQuestion) => {
                  // Find matching venue question by question text
                  const matchingVenueQuestion = venueQuestions.find(
                    (venueQuestion) =>
                      venueQuestion.question.trim().toLowerCase() ===
                      orderQuestion.question.trim().toLowerCase()
                  );

                  if (matchingVenueQuestion) {
                    // Use venue question ID as key (same as when creating order)
                    answers[matchingVenueQuestion.id] =
                      orderQuestion.answer || "";
                  }
                });

                dispatch(
                  setOrderQuestionAnswers({
                    venueId,
                    answers,
                  })
                );
              }

              // Update enable_order_questions from venue detail after syncing from order
              try {
                const venueDetail = await getDetailVenue(venueId);
                if (venueDetail?.id) {
                  const currentOrderSummary =
                    store.getState().cart?.[venueId]?.orderSummary;
                  const newEnableOrderQuestions =
                    venueDetail.enable_order_questions || false;

                  // Check if enable_order_questions has changed only for DineIn orders
                  const hasOrderQuestionsChanged =
                    currentOrderSummary?.enable_order_questions !==
                      newEnableOrderQuestions &&
                    currentOrderSummary?.orderType === OrderTypeEnum.DineIn;

                  dispatch(
                    setOrderSummary({
                      venueId,
                      orderSummary: {
                        ...currentOrderSummary,
                        enable_order_questions: newEnableOrderQuestions,
                      },
                    })
                  );

                  // If venue settings changed, show modal to inform user
                  if (hasOrderQuestionsChanged) {
                    setOpenModalUpdated(true);
                  }
                }
              } catch (error) {
                console.error(
                  "Error fetching venue detail for enable_order_questions:",
                  error
                );
              }

              if (
                (orderDetail?.payment_status as PaymentStripeStatusEnum) !==
                  PaymentStripeStatusEnum.Completed &&
                orderDetail?.payment_method === PaymentMethodEnum.Online
              ) {
                setIsFailedPayment(true);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching order detail:", error);
        } finally {
          setTimeout(() => {
            skipCouponValidation.current = false;
            setLoadingOrder(false);
          }, 100);
        }
      }

      if (
        orderSummary.paymentMethod === undefined ||
        !supportedPaymentMethods.includes(orderSummary.paymentMethod)
      ) {
        const fallbackMethod = getInitialPaymentMethod();
        dispatch(
          setOrderSummary({
            venueId,
            orderSummary: {
              ...orderSummary,
              paymentMethod: fallbackMethod || undefined,
            },
          })
        );
      }
    };

    initializePage();
  }, []);

  // Validate coupon when orderType changes
  useEffect(() => {
    // Skip coupon validation if we're currently fetching order detail
    if (skipCouponValidation.current) return;

    if (orderSummary?.coupon?.id && orderSummary?.orderType) {
      validateCouponCompatibility(orderSummary.orderType, undefined);
    }
  }, [orderSummary?.orderType, orderSummary?.coupon?.id]);

  const {
    storeName = "",
    orderType = "",
    guestCount = 0,
    timeSlot = "",
    timeSlotLabel = "",
  } = orderSummary;

  // Check if eatin preorder is disabled for DineIn only
  const isEatinPreorderDisabled = useMemo(() => {
    return (
      orderSummary?.disable_eatin_preorder && orderType === OrderTypeEnum.DineIn
    );
  }, [orderSummary?.disable_eatin_preorder, orderType]);

  // Check if there are priority pass items in the cart
  const hasPriorityPassInCart = useMemo(() => {
    if (!rawItems?.length) return false;
    return rawItems.some((item) => item.is_priority_pass && item.quantity > 0);
  }, [rawItems]);

  // Clear non-priority pass items if disable_eatin_preorder is true for DineIn only
  useEffect(() => {
    if (isEatinPreorderDisabled) {
      // Only clear non-priority pass items
      const nonPriorityPassItems = rawItems.filter(
        (item) => !item.is_priority_pass
      );
      if (nonPriorityPassItems.length > 0) {
        // If there are non-priority pass items, clear only those
        nonPriorityPassItems.forEach((item) => {
          dispatch(
            updateQuantity({
              venueId,
              id: item.id,
              origin_id: item.origin_id,
              quantity: 0,
            })
          );
        });
      }
    }
  }, [
    isEatinPreorderDisabled,
    venueId,
    dispatch,
    rawItems,
    hasPriorityPassInCart,
  ]);

  useEffect(() => {
    if (!isEmpty(applicationFeeCart) || orderType !== OrderTypeEnum.Takeout) {
      return;
    }

    fetchApplicationFee();
  }, [orderType]);

  // Helper function to filter cart items based on order type and priority pass settings
  const filterCartItems = (
    items: CartSliceItem[] = [],
    currentOrderType: OrderTypeEnum | string = orderType
  ) => {
    const filteredByOrderType = items.filter((item) => {
      if (item.is_priority_pass) return true;
      return (
        item.supportedOrderTypes ?? [
          OrderTypeEnum.DineIn,
          OrderTypeEnum.Takeout,
        ]
      ).includes((currentOrderType as OrderTypeEnum) || OrderTypeEnum.DineIn);
    });

    // Then filter by priority pass
    if (isEatinPreorderDisabled && currentOrderType === OrderTypeEnum.DineIn) {
      return filteredByOrderType.filter((item) => item.is_priority_pass);
    }

    return filteredByOrderType;
  };

  const visibleItems = useMemo(
    () => filterCartItems(rawItems),
    [rawItems, orderType, isEatinPreorderDisabled]
  );

  const getSummaryData = () => {
    const totalAmount =
      cartInfo?.totalAmountByType?.[orderSummary?.orderType] ?? 0;

    const subtotal = totalAmount;

    const applicationFeeAmount =
      orderSummary?.serviceFee != null
        ? orderSummary.serviceFee
        : applicationFeeCart?.amount ?? 0;
    const applicationFeeTaxRate = applicationFeeCart?.tax_rate ?? 0.1;

    const platFormFeeAmount =
      applicationFeeAmount + applicationFeeAmount * applicationFeeTaxRate;

    const serviceFee =
      orderType === OrderTypeEnum.Takeout ? platFormFeeAmount : 0;

    let couponFee = 0;
    if (orderSummary?.coupon?.amount) {
      const couponAmount = parseFloat(orderSummary.coupon.amount);

      if (orderSummary.coupon?.type === CouponTypeEnum.ServiceFee) {
        couponFee = Math.min(couponAmount, serviceFee);
      } else {
        couponFee = couponAmount;
      }
    }

    const total = subtotal + serviceFee - couponFee;

    const subtotalConverted = Math.max(Number(subtotal), 0);
    const totalConverted = Math.max(Number(total), 0);

    const data = [
      {
        key: "subtotal",
        label: t("order.label.summary_subtotal_label"),
        value: subtotalConverted,
      },
      {
        key: "serviceFee",
        label: t("order.label.summary_service_fee_label"),
        value: serviceFee,
        hidden: orderType !== OrderTypeEnum.Takeout,
      },
      {
        key: "couponDiscount",
        label: t("order.label.coupon_label"),
        value: -couponFee,
      },
      {
        key: "total",
        label: t("order.label.summary_total_label"),
        value: totalConverted,
      },
    ];

    return data.filter((item) => !item.hidden);
  };

  const totalQuantity = useMemo(() => {
    if (!cartInfo?.items?.length || !cartInfo?.orderSummary?.orderType)
      return 0;

    const currentOrderType = cartInfo.orderSummary.orderType;

    const filteredItems = cartInfo.items.filter((item) =>
      item.supportedOrderTypes?.includes(currentOrderType)
    );

    return filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartInfo]);

  const summaryData = useMemo(
    () => getSummaryData(),
    [paymentMethod, orderType, cartInfo, orderSummary, applicationFeeCart]
  );

  // Calculate total amount to avoid duplicate code
  const totalAmount = useMemo(() => {
    const totalItem = summaryData.find((item) => item.key === "total");
    return totalItem ? Number(totalItem.value) : 0;
  }, [summaryData]);

  // Auto switch to Cash if Online is selected but total <= 0
  useEffect(() => {
    if (
      paymentMethod === PaymentMethodEnum.Online &&
      totalAmount <= 0 &&
      supportedPaymentMethods?.includes(PaymentMethodEnum.Cash)
    ) {
      setPaymentMethod(PaymentMethodEnum.Cash);
      dispatch(
        setOrderSummary({
          venueId,
          orderSummary: {
            ...orderSummary,
            paymentMethod: PaymentMethodEnum.Cash,
          },
        })
      );
    }
  }, [totalAmount, paymentMethod, supportedPaymentMethods]);

  const isDisabledButton =
    isEmpty(cartInfo) ||
    isEmpty(cartInfo?.items) ||
    isEmpty(orderSummary?.orderType) ||
    isEmpty(orderSummary?.timeSlot) ||
    isEmpty(orderSummary?.guestCount) ||
    isEmpty(orderSummary?.supportedPaymentMethods) ||
    loadingApplicationFee ||
    totalQuantity <= 0 ||
    (() => {
      // Check if at least one payment method is available
      if (!supportedPaymentMethods?.length) return true;
      const isCashAvailable = supportedPaymentMethods.includes(
        PaymentMethodEnum.Cash
      );
      const isOnlineAvailable =
        supportedPaymentMethods.includes(PaymentMethodEnum.Online) &&
        totalAmount > 0;
      return !(isCashAvailable || isOnlineAvailable);
    })();

  const menuItemsTable = !isEmpty(visibleItems)
    ? convertToMenuItemsTable(visibleItems, orderType as OrderTypeEnum)
    : DUMMY_MENU_ITEM_TABLE;

  const orderInfoMap = [
    {
      id: 1,
      label: t("order.label.store_name_label"),
      value: storeName,
    },
    {
      id: 2,
      label: t("order.label.order_method_label"),
      value: t(getLabelFromOptions(ORDER_TYPE_OPTIONS, orderType) || ""),
    },
    {
      id: 3,
      label: t("order.label.time_specification_label"),
      value: timeSlotLabel,
    },
  ];
  if (orderType === OrderTypeEnum.DineIn) {
    orderInfoMap.push({
      id: 4,
      label: t("order.label.guest_count_label"),
      value: `${guestCount}${t(
        "venue.label.party_size_table_label_eat_in_unit"
      )}`,
    });
  }

  // Handle create stock venue
  const handleCreateStockVenue = async () => {
    if (!isAuthenticated) return;
    try {
      if (venueId && isAuthenticated) {
        const isRefSelf =
          refCode && user?.ref_code && refCode === user.ref_code;
        if (!refCode || !isRefSelf) {
          await createStockVenue({
            venue: venueId,
          });
        }
        if (refCode && !isRefSelf) {
          await createRefLog({
            venue_id: venueId,
            ref_code: refCode,
          });
        }
        // remove ref code from url
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (error) {
      console.error("Error creating stock venue:", error);
    }
  };

  // Handle remove coupon from cart
  const handleRemoveCouponFromCart = (newPaymentMethod?: PaymentMethodEnum) => {
    dispatch(
      setOrderSummary({
        venueId,
        orderSummary: {
          ...orderSummary,
          coupon: undefined,
          paymentMethod: newPaymentMethod || orderSummary.paymentMethod,
        },
      })
    );
  };

  // Handle validate coupon when orderType or paymentMethod changes
  const validateCouponCompatibility = async (
    newOrderType?: OrderTypeEnum,
    newPaymentMethod?: PaymentMethodEnum
  ) => {
    const couponId = orderSummary?.coupon?.id;
    if (!couponId) return;

    // Skip validation if we're currently fetching order detail
    if (skipCouponValidation.current) return;

    const currentOrderType = newOrderType || orderType;
    const currentPaymentMethod = newPaymentMethod || paymentMethod;

    if (!currentOrderType || !currentPaymentMethod) return;

    try {
      const couponDetail = await getUserCouponDetail(couponId);
      if (isEmpty(couponDetail)) {
        // Coupon not found, remove it
        handleRemoveCouponFromCart(currentPaymentMethod);
        return;
      }

      const coupon = couponDetail.coupon;

      // Check if coupon supports current order type and payment method
      const orderTypeMatch =
        coupon.order_type && coupon.order_type.includes(currentOrderType);
      const paymentMethodMatch =
        coupon.payment_method &&
        coupon.payment_method.includes(currentPaymentMethod);

      if (!orderTypeMatch || !paymentMethodMatch) {
        // Coupon not compatible, remove it
        handleRemoveCouponFromCart(currentPaymentMethod);
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      // If error, remove coupon to be safe
      handleRemoveCouponFromCart(currentPaymentMethod);
    }
  };

  // Handle check authenticated
  const handleCheckAuthenticated = () => {
    if (!isAuthenticated) {
      const redirectUri = encodeURIComponent(
        getRedirectPathFromSource("cart", venueId)
      );
      const targetPath = cookies["is-first-visit"]
        ? `/${ROUTE_PATH.USER.LOGIN}/?redirect_uri=${redirectUri}&ref=${refCode}`
        : `/${ROUTE_PATH.INTRODUCTION}/?redirect_uri=${redirectUri}&ref=${refCode}`;
      navigate(targetPath);
      return false;
    }
    return true;
  };

  // Handle creating order payment and redirecting to the payment page
  const handleCreateOrderPayment = async (orderId: string) => {
    try {
      setLoadingPaymentCard(true);
      const response = await createOrderPayment(orderId);
      if (!isEmpty(response) && response.checkout_url) {
        window.location.href = response.checkout_url;
      }
    } catch (error) {
      console.error("Error creating order payment:", error);
      dispatch(updatePaymentStatus({ venueId, status: undefined }));
    } finally {
      setLoadingPaymentCard(false);
    }
  };

  // Handle checking payment status and updating order summary
  const handleCheckPayment = async (orderId: string) => {
    try {
      if (paymentMethod === PaymentMethodEnum.Online) {
        dispatch(
          setOrderSummary({
            venueId,
            orderSummary: {
              ...orderSummary,
              paymentMethod: paymentMethod,
              paymentStatus: PaymentStripeStatusEnum.Pending,
              orderId: orderId,
            },
          })
        );
        await handleCreateOrderPayment(orderId);
      } else {
        dispatch(clearCart(venueId));
        navigate(`/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.ORDERS}`);
      }
    } catch (error) {
      console.error("Error order payment:", error);
    }
  };

  // Handle check update Venue fee
  const checkAndUpdateVenue = async () => {
    const venueDetail = await getDetailVenue(venueId);
    if (!venueDetail?.id) {
      return false;
    }

    // Check for disable_eatin_preorder first
    const newDisableEatinPreorder =
      (!venueDetail?.enable_eat_in && venueDetail?.enable_reservation) || false;

    // Check for enable_order_questions
    const newEnableOrderQuestions =
      venueDetail?.enable_order_questions || false;

    let hasChanged = false;

    // Check if disable_eatin_preorder has changed
    if (
      orderSummary?.disable_eatin_preorder !== newDisableEatinPreorder &&
      newDisableEatinPreorder
    ) {
      hasChanged = true;
    }

    // Check if enable_order_questions has changed for only DineIn orders
    if (
      orderSummary?.enable_order_questions !== newEnableOrderQuestions &&
      orderSummary?.orderType === OrderTypeEnum.DineIn
    ) {
      hasChanged = true;
    }

    // Check service fee changes for takeout
    if (orderType === OrderTypeEnum.Takeout) {
      const newFee = venueDetail?.custom_platform_fee_amount;
      const oldFee = orderSummary?.serviceFee;

      if (newFee !== oldFee) {
        hasChanged = true;
      }
    }

    // Update orderSummary if any changes detected
    if (hasChanged) {
      dispatch(
        setOrderSummary({
          venueId,
          orderSummary: {
            ...orderSummary,
            storeName: venueDetail.name,
            serviceFee: venueDetail?.custom_platform_fee_amount ?? null,
            disable_eatin_preorder: newDisableEatinPreorder,
            enable_order_questions: newEnableOrderQuestions,
          },
        })
      );
    }

    return hasChanged;
  };

  // Check and update coupon if it exists
  const checkAndUpdateCoupon = async (): Promise<boolean> => {
    const couponId = orderSummary?.coupon?.id;
    if (!couponId) return false;

    try {
      const couponDetail = await getUserCouponDetail(couponId);

      if (isEmpty(couponDetail)) {
        handleRemoveCouponFromCart();
        return true;
      }

      const newAmount = couponDetail.coupon.amount || "0";
      const newType = couponDetail.coupon?.type;
      const oldAmount = orderSummary?.coupon?.amount || "0";
      const oldType = orderSummary?.coupon?.type;

      // Check if amount or type has changed
      if (newAmount !== oldAmount || newType !== oldType) {
        dispatch(
          setOrderSummary({
            venueId,
            orderSummary: {
              ...orderSummary,
              coupon: {
                id: couponDetail.id,
                amount: newAmount,
                type: newType,
              },
            },
          })
        );
        return true;
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        handleRemoveCouponFromCart();
        return true;
      }

      console.error("Failed to fetch coupon detail:", error);
    }

    return false;
  };

  // Handle checking updated menu items
  const checkAndUpdateMenuItems = async (): Promise<boolean> => {
    const menuResult = await getMenuCategoriesWithItems(venueId);
    const filteredMenus = menuResult.filter(
      (menu) => Array.isArray(menu.items) && menu.items.length > 0
    );

    if (!filteredMenus.length) {
      dispatch(clearCart(venueId));
      return true;
    }

    const priceMap: Record<string, PriceMapMenuItem> = {};
    filteredMenus.forEach((category) => {
      category.items.forEach((item) => {
        const itemId = item.origin_id || item.id;
        priceMap[itemId] = {
          id: item.id,
          origin_id: item.origin_id,
          price: item.price,
          take_out_price: item.take_out_price ?? undefined,
          is_out_of_stock: item.is_out_of_stock,
          name: item.name,
        };
      });
    });

    const hasCartChanged = visibleItems.some((item) => {
      const itemId = item.origin_id || item.id;
      return hasCartItemChanged(
        item,
        priceMap[itemId],
        orderType as OrderTypeEnum
      );
    });

    dispatch(updateCartInfoFromMenu({ venueId, priceMap }));

    return hasCartChanged;
  };

  // Handle check and update application fee
  const checkAndUpdateApplicationFee = async () => {
    if (orderType !== OrderTypeEnum.Takeout) return;

    const applicationFee = await getApplicationFee();
    if (isEmpty(applicationFee)) return false;
    const newAmount = applicationFee.amount ?? 0;
    const newTaxRate = applicationFee.tax_rate ?? 0.1;

    const oldAmount = applicationFeeCart?.amount ?? 0;
    const oldTaxRate = applicationFeeCart?.tax_rate ?? 0.1;
    const hasChanged = newAmount !== oldAmount || newTaxRate !== oldTaxRate;

    if (hasChanged) {
      dispatch(
        setApplicationFeeCart({
          venueId,
          applicationFee: {
            amount: newAmount,
            tax_rate: newTaxRate,
          },
        })
      );
    }
    return hasChanged;
  };

  // Helper function to check if order question answers have changed
  const checkOrderQuestionAnswersChanged = (
    orderDetail: Order,
    currentAnswers: Record<string, string>,
    venueQuestions: VenueQuestion[]
  ): boolean => {
    if (
      !orderDetail.order_questions ||
      orderDetail.order_questions.length === 0 ||
      !venueQuestions ||
      venueQuestions.length === 0
    ) {
      return false;
    }

    for (const orderQuestion of orderDetail.order_questions) {
      // Find matching venue question by question text
      const matchingVenueQuestion = venueQuestions.find(
        (vq) =>
          vq.question.trim().toLowerCase() ===
          orderQuestion.question.trim().toLowerCase()
      );

      if (!matchingVenueQuestion) {
        continue;
      }

      // Get current answer using venue question ID
      const currentAnswer = currentAnswers[matchingVenueQuestion.id] || "";
      const orderAnswer = orderQuestion.answer || "";

      // Compare answers (case-insensitive and trim whitespace)
      if (
        currentAnswer.trim().toLowerCase() !== orderAnswer.trim().toLowerCase()
      ) {
        return true;
      }
    }

    return false;
  };

  // Helper function to check if order needs to be cancelled and recreated
  const shouldCancelAndRecreateOrder = (
    orderDetail: Order,
    currentOrderData: {
      orderType: OrderTypeEnum | string;
      timeSlot: string;
      guestCount?: number;
      paymentMethod: PaymentMethodEnum;
      items: CartSliceItem[];
      totalAmountByType?: Record<OrderTypeEnum, number>;
      applicationFee?: { amount: number; tax_rate: number };
      coupon?: { id: string; amount: string; type?: CouponTypeEnum };
      enableOrderQuestions?: boolean;
      venueQuestions?: VenueQuestion[];
      orderQuestionAnswers?: Record<string, string>;
    }
  ): boolean => {
    // Check if order has changed
    const hasOrderChanged = checkOrderChanges(orderDetail, currentOrderData);

    if (hasOrderChanged) {
      return true;
    }

    return false;
  };

  // Helper function to check if venue questions have changed
  const checkVenueQuestionsChanges = (
    orderDetail: Order,
    currentEnableOrderQuestions: boolean,
    currentVenueQuestions: VenueQuestion[],
    currentAnswers: Record<string, string>
  ): boolean => {
    const orderHasVenueQuestions =
      orderDetail.order_questions && orderDetail.order_questions?.length > 0;

    // If enable_order_questions changed from true to false, order should be recreated
    if (currentEnableOrderQuestions !== orderHasVenueQuestions) {
      return true;
    }

    // If both have venue questions, check if questions content changed
    if (
      currentEnableOrderQuestions &&
      orderHasVenueQuestions &&
      currentVenueQuestions &&
      currentVenueQuestions.length > 0
    ) {
      // Check if user answers have changed compared to order detail answers
      if (
        checkOrderQuestionAnswersChanged(
          orderDetail,
          currentAnswers,
          currentVenueQuestions
        )
      ) {
        return true;
      }
    }

    return false;
  };

  // Helper function to check if order has changed compared to existing order
  const checkOrderChanges = (
    orderDetail: Order,
    currentOrderData: {
      orderType: OrderTypeEnum | string;
      timeSlot: string;
      guestCount?: number;
      paymentMethod: PaymentMethodEnum;
      items: CartSliceItem[];
      totalAmountByType?: Record<OrderTypeEnum, number>;
      applicationFee?: { amount: number; tax_rate: number };
      coupon?: { id: string; amount: string; type?: CouponTypeEnum };
      enableOrderQuestions?: boolean;
      venueQuestions?: VenueQuestion[];
      orderQuestionAnswers?: Record<string, string>;
    }
  ): boolean => {
    // Check order type
    if (orderDetail.order_type !== currentOrderData.orderType) {
      return true;
    }

    // Check time slot
    if (orderDetail.time_slot !== currentOrderData.timeSlot) {
      return true;
    }

    // Check party size for DineIn orders
    if (
      currentOrderData.orderType === OrderTypeEnum.DineIn &&
      orderDetail.party_size !== (currentOrderData.guestCount || 0)
    ) {
      return true;
    }

    // Check payment method
    if (orderDetail.payment_method !== currentOrderData.paymentMethod) {
      return true;
    }

    // Check items
    const currentItems = currentOrderData.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        menu_item: item.id,
        quantity: item.quantity,
      }))
      .sort((a, b) => a.menu_item.localeCompare(b.menu_item));

    const orderItems = orderDetail.items
      .map((item) => ({
        menu_item: item.menu_item,
        quantity: item.quantity || 0,
      }))
      .sort((a, b) => a.menu_item.localeCompare(b.menu_item));

    if (JSON.stringify(currentItems) !== JSON.stringify(orderItems)) {
      return true;
    }

    // Check total amount by type
    if (currentOrderData.totalAmountByType) {
      const currentTotal =
        currentOrderData.totalAmountByType[
          currentOrderData.orderType as OrderTypeEnum
        ] || 0;
      const orderTotal = parseFloat(orderDetail.total_amount || "0");
      if (
        currentTotal &&
        orderTotal &&
        Math.abs(currentTotal - orderTotal) > 0.01
      ) {
        return true;
      }
    }

    // Check application fee for takeout orders
    if (
      currentOrderData.orderType === OrderTypeEnum.Takeout &&
      currentOrderData.applicationFee
    ) {
      // Calculate current service fee the same way as getSummaryData
      const currentApplicationFeeAmount =
        currentOrderData.applicationFee.amount ?? 0;
      const currentApplicationFeeTaxRate =
        currentOrderData.applicationFee.tax_rate ?? 0.1;

      const currentServiceFee =
        currentApplicationFeeAmount +
        currentApplicationFeeAmount * currentApplicationFeeTaxRate;

      const orderFee = parseFloat(orderDetail.application_fee_amount || "0");
      if (currentServiceFee !== orderFee) {
        return true;
      }
    }

    // Check coupon
    const currentCouponId = currentOrderData.coupon?.id;
    const orderCouponId = orderDetail.user_coupon;
    if (currentCouponId && orderCouponId && currentCouponId !== orderCouponId) {
      return true;
    }
    // Check venue questions changes (DineIn only)
    if (currentOrderData.orderType === OrderTypeEnum.DineIn) {
      if (
        checkVenueQuestionsChanges(
          orderDetail,
          currentOrderData.enableOrderQuestions || false,
          currentOrderData.venueQuestions || [],
          currentOrderData.orderQuestionAnswers || {}
        )
      ) {
        return true;
      }
    }

    return false;
  };

  // Handle confirming the order with spam protection
  const handleConfirmOrder = async () => {
    // Prevent spam clicking
    if (confirmingOrder || loadingPaymentCard) return;

    if (!handleCheckAuthenticated()) return;
    setConfirmingOrder(true);
    dispatch(
      setOrderSummary({
        venueId,
        orderSummary: {
          ...orderSummary,
          paymentMethod: paymentMethod,
        },
      })
    );

    try {
      // Check if venue has order questions enabled (DineIn only) - moved to step 2
      if (
        orderSummary?.enable_order_questions &&
        orderType === OrderTypeEnum.DineIn
      ) {
        // Fetch venue questions
        const questions = await fetchVenueQuestions();

        // If questions exist, show modal (regardless of whether user answers or not)
        if (questions && questions.length > 0) {
          setVenueQuestions(questions);
          setOpenOrderQuestions(true);
          setConfirmingOrder(false); // Reset loading state when showing modal
          return;
        }
      }

      // Proceed with order creation if no questions or questions are empty
      await proceedWithOrderCreation();
    } catch (error) {
      console.error("Error confirming order:", error);
    } finally {
      setConfirmingOrder(false);
    }
  };

  // Handle proceeding with order creation (extracted from handleConfirmOrder)
  const proceedWithOrderCreation = async (answers?: Record<string, string>) => {
    try {
      // Step 1: Check and update venue, coupon, menu items, application fee before creating order
      const [venueResult, couponResult, cartResult, applicationFeeResult] =
        await Promise.allSettled([
          checkAndUpdateVenue(),
          checkAndUpdateCoupon(),
          checkAndUpdateMenuItems(),
          checkAndUpdateApplicationFee(),
        ]);

      const hasVenueChanged =
        venueResult.status === "fulfilled" && venueResult.value;
      const hasCouponChanged =
        couponResult.status === "fulfilled" && couponResult.value;
      const hasCartChanged =
        cartResult.status === "fulfilled" && cartResult.value;
      const hasApplicationFeeChanged =
        applicationFeeResult.status === "fulfilled" &&
        applicationFeeResult.value;

      if (
        hasVenueChanged ||
        hasCouponChanged ||
        hasCartChanged ||
        hasApplicationFeeChanged
      ) {
        setOpenModalUpdated(true);
        return;
      }

      // Step 2: Check if there's an existing order to handle
      if (orderSummary?.orderId) {
        try {
          const orderDetail = await getDetailOrder(orderSummary.orderId);

          // Check if order is already paid or is cash payment
          if (
            (orderDetail.payment_status === PaymentStatusEnum.Paid &&
              orderDetail.payment_method === PaymentMethodEnum.Online) ||
            orderDetail.payment_method === PaymentMethodEnum.Cash
          ) {
            // Clear cart and redirect to orders page
            dispatch(clearCart(venueId));
            navigate(`/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.ORDERS}`);
            return;
          }

          // Check if order is ONLINE payment but not PAID
          if (
            orderDetail.payment_method === PaymentMethodEnum.Online &&
            orderDetail.payment_status !== PaymentStatusEnum.Paid
          ) {
            // Get the latest cart data from Redux store after updates
            const updatedCartInfo = store.getState().cart?.[venueId];
            const updatedRawItems = updatedCartInfo?.items || [];

            // Use the helper function to filter items consistently
            const orderItems = filterCartItems(updatedRawItems, orderType);

            // Use answers passed to function if available, otherwise get from Redux store
            const latestOrderQuestionAnswers =
              answers || updatedCartInfo?.orderQuestionAnswers || {};

            // Check if order needs to be cancelled and recreated
            const needsRecreation = shouldCancelAndRecreateOrder(orderDetail, {
              orderType,
              timeSlot,
              guestCount,
              paymentMethod,
              items: orderItems,
              totalAmountByType: updatedCartInfo?.totalAmountByType,
              applicationFee: updatedCartInfo?.applicationFee,
              coupon: orderSummary?.coupon,
              enableOrderQuestions: orderSummary?.enable_order_questions,
              venueQuestions: venueQuestions,
              orderQuestionAnswers: latestOrderQuestionAnswers,
            });

            if (!needsRecreation) {
              // No changes detected, create payment for existing order
              await handleCreateOrderPayment(orderDetail.id);
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching order detail:", error);
        }
      }

      // Get the latest cart data from Redux store after updates
      const updatedCartInfo = store.getState().cart?.[venueId];
      const updatedRawItems = updatedCartInfo?.items || [];

      // Use the helper function to filter items consistently
      const orderItems = filterCartItems(updatedRawItems, orderType);

      const menuItemsOrder: OrderItemRequest[] = orderItems
        .map((item) => ({
          menu_item: item.id,
          quantity: Number(item.quantity),
        }))
        .filter((item) => item.quantity > 0);

      const orderData = {
        venue: venueId,
        time_slot: timeSlot,
        party_size: orderType === OrderTypeEnum.DineIn ? Number(guestCount) : 0,
        order_type: orderType as OrderTypeEnum,
        payment_method: paymentMethod,
        items: menuItemsOrder,
        lang: currentLanguage as LangEnum,
      };
      if (orderSummary?.coupon?.id) {
        Object.assign(orderData, {
          user_coupon: orderSummary.coupon.id,
        });
      }

      // Add venue questions if venue has questions enabled (DineIn only)
      // Always include venue_questions when venue has enable_order_questions = true and orderType is DineIn
      if (
        orderSummary?.enable_order_questions &&
        orderType === OrderTypeEnum.DineIn &&
        venueQuestions &&
        venueQuestions.length > 0
      ) {
        Object.assign(orderData, {
          venue_questions: convertAnswersToOrderQuestions(
            answers || {},
            venueQuestions
          ),
        });
      }

      if (orderSummary?.orderId) {
        await cancelOrder(orderSummary.orderId);
        dispatch(
          setOrderSummary({
            venueId,
            orderSummary: {
              ...orderSummary,
              orderId: undefined,
              paymentStatus: undefined,
            },
          })
        );
      }

      const response = await createNewOrder(orderData);
      if (!isEmpty(response) && response.id) {
        handleCheckPayment(response.id);
      }
    } catch (error) {
      console.error("Error proceeding with order creation:", error);
    }
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setIsFailedPayment(false);
    dispatch(updatePaymentStatus({ venueId, status: undefined }));
  };

  // Handle order questions modal submission with spam protection
  const handleOrderQuestionsSubmit = async (
    answers: Record<string, string>
  ) => {
    // Prevent spam clicking
    if (confirmingOrder || loadingPaymentCard) return;

    setConfirmingOrder(true);
    try {
      // Store answers in Redux for order creation
      dispatch(
        setOrderQuestionAnswers({
          venueId,
          answers,
        })
      );
      // Proceed with order creation, passing answers directly
      await proceedWithOrderCreation(answers);
    } catch (error) {
      console.error("Error submitting order questions:", error);
    } finally {
      setConfirmingOrder(false);
      setOpenOrderQuestions(false);
    }
  };

  // Handle navigating to the coupons page with spam protection
  const handleNavigateToCoupons = () => {
    // Prevent spam clicking
    if (confirmingOrder || loadingPaymentCard) return;

    if (!handleCheckAuthenticated()) return;

    // Preserve all current search params
    const currentSearchParams = new URLSearchParams(location.search);
    currentSearchParams.set("venueId", venueId);
    if (refCode) {
      currentSearchParams.set("ref", refCode);
    }

    navigate(
      `/${ROUTE_PATH.USER.DASHBOARD}/${
        ROUTE_PATH.USER.COUPONS
      }?${currentSearchParams.toString()}`,
      {
        state: {
          venueId,
          cartPageSearchParams: location.search, // Preserve original search params
        },
      }
    );
  };

  return (
    <Spin
      wrapperClassName="[&_.ant-spin]:!max-h-[100%]"
      spinning={loadingPaymentCard || loadingOrder}
      size="large"
      className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
    >
      <div className="flex flex-col items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("order.title.cart_title")}
          onBack={() => {
            const from = urlSearch.get("from");
            let backUrl = `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}`;

            if (from) {
              backUrl += `?from=${from}`;
            }

            navigate(backUrl);
          }}
          hasRightIcons
          needUserGuide
        />

        {/* Cart Content */}
        <div className="flex flex-col w-full px-4 mt-2 gap-3 pb-[45px]">
          <BaseCardInfo>
            <div className="flex flex-col w-full gap-2">
              {orderInfoMap.map((info) => {
                const { label, value } = info;
                return (
                  <div key={info.id} className="grid grid-cols-2">
                    <Text className="text-sm-white">{label}</Text>
                    <Text className="text-sm-white !font-bold">{value}</Text>
                  </div>
                );
              })}
            </div>
          </BaseCardInfo>

          <div className="flex flex-col gap-2">
            <Text className="text-xs-white !font-bold !py-1">
              {t("order.label.order_detail_label")}
            </Text>
            <OrderAmountDetails
              menuItemsTable={menuItemsTable}
              summaryDataProps={summaryData}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Text className="text-xs-white !font-bold !py-1">
              {t("order.label.payment_method_label")}
            </Text>
            <div>
              <PaymentMethodRadio
                value={paymentMethod}
                onChange={(method: PaymentMethodEnum) => {
                  setPaymentMethod(method);
                  dispatch(
                    setOrderSummary({
                      venueId,
                      orderSummary: {
                        ...orderSummary,
                        paymentMethod: method,
                      },
                    })
                  );
                  // Validate coupon compatibility with new payment method
                  validateCouponCompatibility(undefined, method);
                }}
                loading={confirmingOrder || loadingPaymentCard}
                options={[
                  {
                    value: PaymentMethodEnum.Cash,
                    label: t("order.label.payment_in_store_label"),
                    icon: (
                      <IconRestPayment className="w-[22px] h-[22px] min-w-[22px] min-h-[22px]" />
                    ),
                    disabled: !supportedPaymentMethods?.includes(
                      PaymentMethodEnum.Cash
                    ),
                  },
                  {
                    value: PaymentMethodEnum.Online,
                    label: t("order.label.payment_credit_label"),
                    icon: (
                      <IconCreditComponent className="w-[22px] h-[22px] min-w-[22px] min-h-[22px]" />
                    ),
                    disabled:
                      !supportedPaymentMethods?.includes(
                        PaymentMethodEnum.Online
                      ) || totalAmount <= 0,
                  },
                ]}
              />
            </div>
          </div>

          <Text className="text-xs-white">
            {t("order.label.confirming_terms_label")}
          </Text>

          <BaseCardInfo onClick={() => setOpenTermsOfService(true)}>
            <div className="flex flex-col gap-2">
              <Text className="text-sm-white !font-bold">
                {t("policy.terms_title")}
              </Text>
              <div>
                <Text className="text-sm-white">
                  {t("policy.terms_preview.main")}
                </Text>
                <span className="text-[14px] font-family-base !leading-[1.2em] text-[var(--dark-blue-color)]">
                  {t("policy.terms_preview.more")}
                </span>
              </div>
            </div>
          </BaseCardInfo>
        </div>

        {/* Button Bottom */}
        <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4">
          <Button
            type="text"
            className={`!shrink-0 !h-10 !max-h-10 !min-h-10 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
              isDisabledButton ? "button-disabled" : "!bg-[#009688] !text-white"
            }`}
            style={{ height: "unset" }}
            disabled={isDisabledButton}
            loading={confirmingOrder || loadingPaymentCard}
            onClick={handleNavigateToCoupons}
          >
            <div className="flex items-center justify-center gap-2">
              <IconCoupon className="object-contain w-5 h-5 min-w-5 min-h-5 !text-white" />
              <Text className="text-sm-white">
                {t("order.label.coupon_label")}
              </Text>
            </div>
          </Button>
          <Button
            type="text"
            className={`!flex-1 !h-10 !max-h-10 !min-h-10 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
              isDisabledButton
                ? "button-disabled"
                : " !bg-[var(--primary-color)] !text-white"
            }`}
            style={{ height: "unset" }}
            disabled={isDisabledButton}
            onClick={() => handleConfirmOrder()}
            loading={confirmingOrder || loadingPaymentCard}
          >
            <div className="flex items-center justify-center gap-2">
              <IconCartComponent className=" !text-white !w-5 !h-5 !min-w-5 !min-h-5" />
              <Text className="text-sm-white">
                {t("order.label.confirm_order_label")}
              </Text>
            </div>
          </Button>
        </div>
      </div>

      <Modal
        open={isFailedPayment}
        onCancel={handleCloseModal}
        footer={null}
        closeIcon={false}
        centered
        width={327}
        styles={{
          content: {
            background: "#272525",
            borderRadius: "16px",
            padding: "16px",
          },
        }}
        className="!w-full !max-w-[500px] !p-6"
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex flex-col gap-2">
            <Trans
              i18nKey="general.payment_failed"
              components={[
                <Text className="text-sm-white" />,
                <Text className="text-sm-white" />,
                <Text className="text-sm-white" />,
              ]}
            />
          </div>
          <div className="flex w-full">
            <Button
              className="!flex-1 !h-[40px] !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex items-center justify-center"
              onClick={handleCloseModal}
            >
              {t("general.close")}
            </Button>
          </div>
        </div>
      </Modal>

      <BaseModalNotice
        isModalOpen={openModalUpdated}
        onClose={() => setOpenModalUpdated(false)}
        message={
          <div className="!text-center flex flex-col gap-1">
            <Trans
              i18nKey="order.label.menu_item_updated_confirmation"
              components={[
                <Text className="text-sm-white !font-bold" />,
                <Text className="text-sm-white !font-bold" />,
              ]}
            />
          </div>
        }
      />

      {openTermsOfService && (
        <TermsOfServiceModal
          isOpen={openTermsOfService}
          onClose={() => setOpenTermsOfService(false)}
        />
      )}

      <OrderQuestionsModal
        isOpen={openOrderQuestions}
        onClose={() => setOpenOrderQuestions(false)}
        onSubmit={handleOrderQuestionsSubmit}
        questions={venueQuestions}
        loading={loadingQuestions || confirmingOrder}
        initialAnswers={orderQuestionAnswers}
      />
    </Spin>
  );
};

export default CartPage;
