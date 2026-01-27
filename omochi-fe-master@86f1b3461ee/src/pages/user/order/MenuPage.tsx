/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Fragment,
} from "react";
import { Button, Typography, Form, Select, Spin } from "antd";

const { Text, Title } = Typography;
import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ROUTE_PATH,
  ORDER_TYPE_OPTIONS,
  STOCK_STORE_STATE,
  STOCK_VENUE_AVAILABLE_STATE,
  NOTIFICATION_FROM_PARAM,
  ARTICLE_FROM_PARAM,
  TypeCheckboxEnum,
  BUFFER_TIME_SLOT,
  STORAGE_ANNOUNCEMENT_KEY,
  ASPECT_RATIO_IMAGE,
} from "@/utils/constants";
import { useTranslation } from "react-i18next";
import BaseCardHorizontal from "@/components/card/BaseCardHorizontal";
import SelectInput from "@/components/common/form/SelectInput";
import {
  IconClockSuffix,
  IconCurrencyYen,
  IconChevronDown,
  IconReservation,
  IconCartComponent,
} from "@/assets/icons";
import CustomTag from "@/components/common/CustomTag";
import {
  formatYen,
  isEmpty,
  getEnabledOrderTypeOptions,
  convertTimeSlotsToOptions,
  getLabelFromOptions,
  filterMenuItemsByOrderType,
  getDisplayPriceMenuItem,
  getTokyoToday,
  getTokyoNow,
  handleDropdownVisibleChange,
} from "@/utils/helper";
import QuantityInput from "@/components/common/form/QuantityInput";
import PriorityPassCheckbox from "@/components/common/form/PriorityPassCheckbox";
import MenuItemInfoModal from "@/components/common/modal/MenuItemInfoModal";
import VenueInfoModal from "@/components/common/modal/VenueInfoModal";
import {
  getDetailVenue,
  getMenuCategoriesWithItems,
  getTimeSlotsVenue,
} from "@/api/venue";
import { getDetailOrder } from "@/api/order";
import {
  VenueDetail,
  MenuCategoryWithItems,
  MenuItem,
  PaymentMethodEnum,
  Reservation,
  PaymentStatusEnum,
} from "@/generated/api";
import defaultImage from "@/assets/images/default-image.png";
import {
  setOrderSummary,
  updateCartInfoFromMenu,
  updateQuantity,
  clearCart,
  updatePaymentStatus,
} from "@/store/slices/cartSlice";
import { addRefToVenue, removeRefFromVenue } from "@/store/slices/refSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { OrderSummary, PriceMapMenuItem } from "@/types/cart";
import { OptionType } from "@/types/common";
import { OrderTypeEnum } from "@/generated/api";
import NotFoundPage from "@/pages/NotFoundPage";
import { useNavigateUserCheck } from "@/hooks/useNavigateUserCheck";
import { createStockVenue } from "@/api/stock-venue";
import { createRefLog } from "@/api/ref-logs";
import AlcoholConfirmationModal from "@/components/common/modal/AlcoholConfirmationModal";
import PriorityPassNoticeModal from "@/components/common/modal/PriorityPassNoticeModal";
import { getMyReservationList } from "@/api/reservation";
import { usePriorityPass } from "@/hooks/usePriorityPass";
import VenueAnnouncementModal from "@/components/common/modal/VenueAnnouncementModal";
import { getSessionStorageWithExpiry } from "@/utils/storage";
import { useLanguage } from "@/hooks/useLanguage";
import { getListGuestCountOptions } from "@/utils/translationHelpers";
import VenueInfoContent from "@/components/common/VenueInfoContent";
import PhoneCallButton from "@/components/common/PhoneCallButton";
import GoogleAds from "@/components/common/ads/GoogleAds";

type OrderTypeOption = (typeof ORDER_TYPE_OPTIONS)[number];

const MenuPage = () => {
  const { t } = useTranslation();
  const { id: venueId = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { navigateCheckToRoute } = useNavigateUserCheck();
  const { onLanguageChange } = useLanguage();
  const urlSearch = new URLSearchParams(location.search);
  const stateFromStockVenue = location.state as {
    orderType?: OrderTypeEnum;
    timeSlot?: string;
  } | null;
  const [pendingTimeSlot, setPendingTimeSlot] = useState<string | null>(null);
  const refCode = urlSearch.get("ref")?.trim() || "";
  const fromPage = urlSearch.get("from")?.trim() || "";
  const articleId = urlSearch.get("articleId")?.trim() || "";
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [form] = Form.useForm();
  const orderType = Form.useWatch("orderType", form);
  const guestCount = Form.useWatch("guestCount", form);
  const timeSlot = Form.useWatch("timeSlot", form);
  const cartInfo = useSelector((state: RootState) => state.cart?.[venueId]);
  const orderSummary = cartInfo?.orderSummary;

  const [categorySelected, setCategorySelected] = useState<string>();
  const [menuItemSelected, setMenuItemSelected] = useState<MenuItem | null>(
    null
  );
  const [openStoreModal, setOpenStoreModal] = useState(false);
  const [venueInfo, setVenueInfo] = useState<VenueDetail | null>(null);
  const [rawMenuCategories, setRawMenuCategories] = useState<
    MenuCategoryWithItems[]
  >([]);
  const [filteredCategories, setFilteredCategories] = useState<
    MenuCategoryWithItems[]
  >([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [timeSlotOptions, setTimeSlotOptions] = useState<OptionType[]>([]);

  const [orderTypeOptions, setOrderTypeOptions] = useState<OrderTypeOption[]>(
    []
  );

  // Dynamic guest count options that update with language changes
  const guestCountOptions = useMemo(() => getListGuestCountOptions(), [t]);
  const [openModalAlcohol, setOpenModalAlcohol] = useState(false);
  const [alcoholicConfirmCallback, setAlcoholicConfirmCallback] = useState<
    (() => void) | null
  >(null);

  const [userReservations, setUserReservations] = useState<Reservation[]>([]);

  // Refs for category horizontal scrolling
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [typeModalAnnouncement, setTypeModalAnnouncement] =
    useState<string>("");

  // Track if venue is partner or not
  const [isPartnerVenue, setIsPartnerVenue] = useState<boolean>(true);

  // Priority pass hook
  const {
    // State
    openModalPriorityPass,
    setOpenModalPriorityPass,
    isPriorityPassModalRequired,
    setIsPriorityPassModalRequired,
    priorityPassItem,
    setPriorityPassItem,
    priorityPassRequired,
    setPriorityPassRequired,
    hasPriorityPassInCart,
    priorityPassInCart,

    // Functions
    findPriorityPassItem: findPriorityPassItemForCurrentOrderType,
    addPriorityPassToCart,
    removePriorityPassFromCart,
    updatePriorityPassQuantity,
    updatePriorityPassItemNoticeStatus,
    updatePriorityPassItemAddType,

    // Modal handlers
    showPriorityPassModal: handleShowPriorityPassModal,
    closePriorityPassModal: handleClosePriorityPassModal,
  } = usePriorityPass(venueId, orderType, guestCount);

  const totalQuantity = useMemo(() => {
    if (!cartInfo?.items?.length || !cartInfo?.orderSummary?.orderType)
      return 0;

    const currentOrderType = cartInfo.orderSummary.orderType;

    const filteredItems = cartInfo.items.filter((item) =>
      item.supportedOrderTypes?.includes(currentOrderType)
    );

    return filteredItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartInfo]);

  // Check if eatin preorder is disabled for current order type
  const isEatinPreorderDisabled = useMemo(() => {
    return (
      orderSummary?.disable_eatin_preorder && orderType === OrderTypeEnum.DineIn
    );
  }, [orderSummary?.disable_eatin_preorder, orderType]);

  // Check if eatin reservation is disabled for current order type
  const isEatinReservationDisabled = useMemo(() => {
    return (
      orderSummary?.disable_eatin_reservation &&
      orderType === OrderTypeEnum.DineIn
    );
  }, [orderSummary?.disable_eatin_reservation, orderType]);

  // Clear non-priority pass items if disable_eatin_preorder is true for DineIn only
  useEffect(() => {
    if (isEatinPreorderDisabled && cartInfo?.items?.length) {
      const nonPriorityPassItems = cartInfo.items.filter(
        (item) => !item.is_priority_pass
      );
      if (nonPriorityPassItems.length > 0) {
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
  }, [isEatinPreorderDisabled, cartInfo, dispatch, venueId]);

  useEffect(() => {
    if (refCode && venueId) {
      dispatch(addRefToVenue({ venueId, refCode }));
    }
  }, [refCode, venueId, dispatch]);

  // Fetch user reservations
  const fetchUserReservations = async (): Promise<Reservation[]> => {
    if (!isAuthenticated || !venueId) {
      return [];
    }

    try {
      const today = getTokyoToday();
      const startDate = today.format("YYYY-MM-DD");
      const reservations = await getMyReservationList(startDate, startDate);

      if (!isEmpty(reservations)) {
        return reservations.filter(
          (reservation: Reservation) => reservation.venue === venueId
        ) as Reservation[];
      }
      return [];
    } catch (error) {
      console.error("Error fetching user reservations:", error);
      return [];
    }
  };

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
          dispatch(removeRefFromVenue({ venueId, refCode }));
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

  // Fetch all data function - can be called when language changes
  const fetchAllData = useCallback(async () => {
    if (!venueId) return;
    setLoadingFirst(true);
    const orderSummaryDraft = { ...orderSummary };

    // Check if there's an existing order to handle
    if (orderSummary?.orderId) {
      try {
        const orderDetail = await getDetailOrder(orderSummary.orderId);
        dispatch(updatePaymentStatus({ venueId, status: undefined }));

        // Check if order is already paid or is cash payment
        if (
          (orderDetail.payment_status === PaymentStatusEnum.Paid &&
            orderDetail.payment_method === PaymentMethodEnum.Online) ||
          orderDetail.payment_method === PaymentMethodEnum.Cash
        ) {
          // Clear cart and reset orderSummary to initial state
          dispatch(clearCart(venueId));
          Object.assign(orderSummaryDraft, {
            orderId: undefined,
            paymentStatus: undefined,
            paymentMethod: undefined,
            coupon: undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching order detail:", error);
      }
    }

    // First, fetch venue detail to check if it's a partner venue
    let venueResponse: VenueDetail | null = null;
    try {
      venueResponse = await getDetailVenue(venueId);
    } catch (error) {
      console.error("Error fetching venue detail:", error);
      setLoadingFirst(false);
      return;
    }

    // Handle venue detail result
    if (venueResponse?.id) {
      setVenueInfo(venueResponse);
      const isPartner = venueResponse.is_partner ?? true; // Default to true if not specified
      setIsPartnerVenue(isPartner);

      // Always set up basic venue info
      const supportedPaymentMethods = ([
        venueResponse?.enable_cash_payment && PaymentMethodEnum.Cash,
        venueResponse?.enable_online_payment && PaymentMethodEnum.Online,
      ].filter(Boolean) as PaymentMethodEnum[]) || [PaymentMethodEnum.Cash];

      dispatch(
        setOrderSummary({
          venueId,
          orderSummary: {
            ...orderSummaryDraft,
            storeName: venueResponse.name,
            supportedPaymentMethods: supportedPaymentMethods,
            serviceFee: venueResponse.custom_platform_fee_amount ?? null,
            disable_eatin_preorder:
              !venueResponse.enable_eat_in && venueResponse.enable_reservation,
            disable_eatin_reservation:
              !venueResponse.enable_reservation && venueResponse.enable_eat_in,
            enable_order_questions:
              venueResponse.enable_order_questions || false,
          },
        })
      );

      // If it's not a partner venue, only show venue info - don't fetch menu/timeslot/reservations
      if (!isPartner) {
        setLoadingFirst(false);
        return;
      }

      // For partner venues, continue with full functionality
      const hasEatIn =
        venueResponse.enable_eat_in ||
        venueResponse.enable_reservation ||
        false;
      const hasTakeout = venueResponse.enable_take_out || false;

      const orderTypesEnabled = getEnabledOrderTypeOptions({
        enable_eat_in: hasEatIn,
        enable_take_out: hasTakeout,
      });
      setOrderTypeOptions(orderTypesEnabled);

      // Fetch remaining data in parallel for partner venues
      const [menuResult, reservationResult] = await Promise.allSettled([
        getMenuCategoriesWithItems(venueId),
        fetchUserReservations(),
      ]);

      // Handle menu result
      if (
        menuResult.status === "fulfilled" &&
        menuResult.value &&
        !isEmpty(menuResult.value)
      ) {
        const filteredMenus = (
          menuResult.value as MenuCategoryWithItems[]
        ).filter((menu) => Array.isArray(menu.items) && menu.items.length > 0);
        if (!isEmpty(filteredMenus)) {
          setRawMenuCategories([...filteredMenus]);

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

          dispatch(
            updateCartInfoFromMenu({
              venueId,
              priceMap,
            })
          );
        }
      } else {
        console.error("fetch menu categories with items error:", menuResult);
      }

      // Handle reservation result
      if (reservationResult.status === "fulfilled") {
        const reservationOfVenue = reservationResult.value.filter(
          (reservation) => reservation.venue === venueId
        );
        setUserReservations(reservationOfVenue);
      } else {
        console.error("fetch user reservations error:", reservationResult);
        setUserReservations([]);
      }
    } else {
      console.error("fetch detail venue error: venue response is invalid");
    }

    setLoadingFirst(false);
  }, [venueId, isAuthenticated]);

  useEffect(() => {
    if (!venueId) return;

    handleCreateStockVenue();
    fetchAllData();
  }, [venueId, isAuthenticated]);

  // Register callback for language changes
  useEffect(() => {
    if (!onLanguageChange || !venueId) return;

    const cleanup = onLanguageChange(() => {
      // Always fetch data when language changes, regardless of venueInfo state
      // The fetchAllData function will handle the logic internally
      fetchAllData();
    });

    return cleanup;
  }, [venueId, fetchAllData]);

  useEffect(() => {
    if (!venueId || !orderType) return;

    const fetchTimeSlots = async () => {
      try {
        const slots = await getTimeSlotsVenue(orderType, venueId);
        if (slots) {
          setTimeSlotOptions(convertTimeSlotsToOptions([...slots]));
        }
      } catch (error) {
        console.error("Error fetching time slots:", error);
      }
    };

    fetchTimeSlots();
  }, [venueId, orderType]);

  const flattenMenuItems = (menus: MenuCategoryWithItems[]): MenuItem[] =>
    menus.flatMap((cat) => cat.items);

  // Filter raw menus by order type and cache result
  const filteredMenus = useMemo(() => {
    return rawMenuCategories
      .map((menu) => {
        const filteredItems = filterMenuItemsByOrderType(menu.items, orderType);
        if (!filteredItems.length) return null;
        return { ...menu, items: filteredItems };
      })
      .filter(Boolean) as MenuCategoryWithItems[];
  }, [rawMenuCategories, orderType]);

  // Store filtered categories
  useEffect(() => {
    setFilteredCategories(filteredMenus);
  }, [filteredMenus]);

  // Update menu items whenever category or filteredMenus changes
  useEffect(() => {
    if (!filteredMenus.length) {
      setFilteredMenuItems([]);
      return;
    }

    if (!categorySelected) {
      setFilteredMenuItems(flattenMenuItems(filteredMenus));
      return;
    }

    const selectedCategory = filteredMenus.find(
      (cat) => cat.id === categorySelected
    );
    if (selectedCategory) {
      setFilteredMenuItems(selectedCategory.items);
    } else {
      setFilteredMenuItems(flattenMenuItems(filteredMenus));
      setCategorySelected(undefined);
    }
  }, [filteredMenus, categorySelected]);

  // Check timeslot valid
  const isTimeSlotValid = useCallback(
    (slot: OptionType) => {
      if (!slot.start_time) return false;

      const today = getTokyoToday();
      const [hours, minutes] = slot.start_time.split(":").map(Number);
      const slotDate = today.hour(hours).minute(minutes);

      const now = getTokyoNow();
      const timeDiff = slotDate.diff(now, "minute");

      // Only allow selecting time slots that are at least 15 minutes from current time
      const isTimeAvailable = timeDiff >= BUFFER_TIME_SLOT;

      const remainingSlots = slot.remaining_slots ?? 0;
      const guestCountCheck =
        orderType === OrderTypeEnum.DineIn ? guestCount : 1;

      // Check if the slot has remaining slots and is not paused
      const hasRemaining =
        remainingSlots > 0 && remainingSlots >= guestCountCheck;

      // If there are remaining slots, check both time and pause status
      if (hasRemaining) {
        return isTimeAvailable && !slot.is_paused;
      }

      // If no remaining slots and this is takeout, disable
      if (orderType === OrderTypeEnum.Takeout) {
        return false;
      }

      // For DineIn: check if user has valid reservation for this slot
      // Only check time availability, not pause status (since no remaining slots = paused)
      const validReservation = userReservations.find(
        (reservation) =>
          reservation.time_slot === slot.value &&
          !reservation.order_id &&
          reservation.party_size >= (guestCount || 1)
      );

      return isTimeAvailable && !!validReservation;
    },
    [orderType, guestCount, userReservations]
  );

  // Get label for timeslot with reservation info
  const getTimeSlotLabel = useCallback(
    (slot: OptionType) => {
      const baseLabel = slot.label;

      // If timeslot is valid (available), use original label
      if (isTimeSlotValid(slot)) {
        return baseLabel;
      }

      // If not available, use existing disabled label
      return `${baseLabel} (${t("general.not_available")})`;
    },
    [isTimeSlotValid]
  );

  const timeSlotsFilteredOptions = useMemo(() => {
    if (!guestCount || orderType === OrderTypeEnum.Takeout) {
      return timeSlotOptions?.map((slot) => {
        // Only allow selecting time slots that are at least 15 minutes from current time
        const isTimeAvailable = isTimeSlotValid(slot);

        return {
          ...slot,
          isAvailable: isTimeAvailable,
          label: isTimeAvailable ? slot.label : getTimeSlotLabel(slot),
        };
      });
    }

    return timeSlotOptions?.map((slot) => {
      // Only allow selecting time slots that are at least 15 minutes from current time
      const isTimeAvailable = isTimeSlotValid(slot);
      const isGuestCountAvailable = guestCount <= (slot.remaining_slots ?? 0);

      // For DineIn with no remaining slots, check reservation
      let isAvailable = isTimeAvailable;
      if (!isGuestCountAvailable && orderType === OrderTypeEnum.DineIn) {
        // Check if user has valid reservation
        const validReservation = userReservations.find(
          (reservation) =>
            reservation.time_slot === slot.value &&
            !reservation.order_id &&
            reservation.party_size >= guestCount
        );
        isAvailable = isTimeAvailable && !!validReservation;
      } else {
        isAvailable = isTimeAvailable && isGuestCountAvailable;
      }

      return {
        ...slot,
        isAvailable,
        label: isAvailable ? slot.label : getTimeSlotLabel(slot),
      };
    });
  }, [guestCount, timeSlotOptions, orderType, userReservations]);

  // Memoize button states to prevent unnecessary recalculations
  const buttonStates = useMemo(() => {
    // Get the current selected time slot
    const selectedTimeSlot = timeSlotsFilteredOptions.find(
      (slot) => slot.value === timeSlot
    );

    // Check if the selected time slot is available
    const isTimeSlotAvailable =
      !isEmpty(timeSlot) &&
      !isEmpty(timeSlotOptions) &&
      selectedTimeSlot?.isAvailable !== false;

    // Cart button is disabled
    const isCartButtonDisabled =
      isEmpty(cartInfo) ||
      isEmpty(cartInfo.items) ||
      totalQuantity <= 0 ||
      isEmpty(cartInfo.orderSummary) ||
      isEmpty(orderType) ||
      !isTimeSlotAvailable ||
      (isEatinPreorderDisabled && !hasPriorityPassInCart);

    // Seat reservation button is disabled
    const isSeatButtonDisabled =
      !isTimeSlotAvailable || isEatinReservationDisabled;

    const isDisabledButtonPhone = isEmpty(venueInfo?.phone_number);

    return {
      isDisabledButtonCart: isCartButtonDisabled,
      isDisabledButtonSeat: isSeatButtonDisabled,
      isDisabledButtonPhone: isDisabledButtonPhone,
    };
  }, [
    cartInfo,
    totalQuantity,
    orderType,
    timeSlot,
    timeSlotOptions,
    timeSlotsFilteredOptions,
    isEatinPreorderDisabled,
    isEatinReservationDisabled,
    hasPriorityPassInCart,
    venueInfo?.phone_number,
  ]);

  const { isDisabledButtonCart, isDisabledButtonSeat, isDisabledButtonPhone } =
    buttonStates;

  useEffect(() => {
    if (!isEmpty(orderTypeOptions.length)) {
      const hasTakeaway = orderTypeOptions.some(
        (opt) => opt.value === OrderTypeEnum.Takeout
      );

      const validSlots = [
        ...timeSlotsFilteredOptions.filter((slot) => slot.isAvailable),
      ];

      const isTimeSlotStillValid = validSlots?.some(
        (slot) => slot.value === orderSummary?.timeSlot
      );

      const isOrderTypeValid = orderTypeOptions.some(
        (opt) => opt.value === orderSummary?.orderType
      );

      const orderTypeSelected = isOrderTypeValid
        ? orderSummary?.orderType
        : hasTakeaway
        ? OrderTypeEnum.Takeout
        : OrderTypeEnum.DineIn;

      dispatch(
        setOrderSummary({
          venueId,
          orderSummary: {
            ...orderSummary,
            orderType: orderTypeSelected,
          },
        })
      );

      // Select a valid timeslot
      const selectedTimeSlot =
        orderSummary?.timeSlot && isTimeSlotStillValid
          ? orderSummary.timeSlot
          : validSlots?.[0]?.value || null;

      // Update form values
      form.setFieldsValue({
        orderType: orderTypeSelected,
        guestCount: orderSummary?.guestCount || 1,
        timeSlot: selectedTimeSlot,
      });

      // If the timeslot has changed, update the orderSummary
      if (selectedTimeSlot && selectedTimeSlot !== orderSummary?.timeSlot) {
        const updatedSummary = buildOrderSummary(
          orderSummary,
          { timeSlot: selectedTimeSlot },
          timeSlotsFilteredOptions,
          timeSlotOptions
        );

        dispatch(
          setOrderSummary({
            venueId,
            orderSummary: updatedSummary,
          })
        );
      }
    }
  }, [orderTypeOptions, form, timeSlotsFilteredOptions]);

  // Handle state from StockVenueAvailablePage
  useEffect(() => {
    if (stateFromStockVenue && !isEmpty(orderTypeOptions)) {
      const { orderType: stateOrderType, timeSlot: stateTimeSlot } =
        stateFromStockVenue;

      if (stateOrderType) {
        form.setFieldValue("orderType", stateOrderType);
        handleFormChange({ orderType: stateOrderType });
      }

      if (stateTimeSlot) {
        setPendingTimeSlot(stateTimeSlot);
      }

      // Clear state after using it
      window.history.replaceState(
        {},
        "",
        window.location.pathname + window.location.search
      );
    }
  }, [stateFromStockVenue, orderTypeOptions, form]);

  // Handle timeSlot from state after timeSlotOptions are fetched
  useEffect(() => {
    if (pendingTimeSlot && !isEmpty(timeSlotOptions)) {
      // Find the pending time slot in the options
      const pendingSlot = timeSlotOptions.find(
        (slot) => slot.value === pendingTimeSlot
      );

      let selectedTimeSlot = null;

      if (pendingSlot && isTimeSlotValid(pendingSlot)) {
        // If pending time slot exists and is valid, use it
        selectedTimeSlot = pendingTimeSlot;
      } else {
        // If pending time slot is not available, find the first available one
        const firstAvailableSlot = timeSlotOptions.find((slot) =>
          isTimeSlotValid(slot)
        );
        if (firstAvailableSlot) {
          selectedTimeSlot = firstAvailableSlot.value;
        }
      }

      // Set the selected time slot only if we found a valid one
      if (selectedTimeSlot) {
        form.setFieldValue("timeSlot", selectedTimeSlot);
        handleFormChange({ timeSlot: selectedTimeSlot });
      }

      setPendingTimeSlot(null);
    }
  }, [timeSlotOptions, pendingTimeSlot, form]);

  // Handle menu item selection
  const handleSelectMenuItem = (item: MenuItem) => {
    setMenuItemSelected(item);
  };

  const buildOrderSummary = (
    baseSummary: OrderSummary,
    updatedValues: any,
    timeSlots: any[],
    timeSlotOptions: any[]
  ): OrderSummary => {
    const summary: OrderSummary = {
      ...baseSummary,
      ...updatedValues,
    };

    const timeSlot = updatedValues.timeSlot;
    if (timeSlot) {
      summary.timeSlotLabel =
        getLabelFromOptions(timeSlotOptions, timeSlot) || "";
      const timeSlotRaw = timeSlots.find((slot) => slot.value === timeSlot);
      summary.timeSlotStart = timeSlotRaw?.start_time || "";
      summary.timeSlotEnd = timeSlotRaw?.end_time || "";
    }

    return summary;
  };

  // Use findPriorityPassItem from the hook with this adapter
  const findPriorityPassItem = useCallback(() => {
    return findPriorityPassItemForCurrentOrderType(
      flattenMenuItems(rawMenuCategories)
    );
  }, [findPriorityPassItemForCurrentOrderType, rawMenuCategories]);

  const checkPriorityPassRequired = useCallback(
    (selectedTimeSlot: string) => {
      const selectedSlot = timeSlotOptions.find(
        (slot) => slot.value === selectedTimeSlot
      );

      if (!selectedSlot || !selectedSlot.priority_pass_slot) {
        return false;
      }

      // Get remaining slots after current booking
      const remainingSlots = selectedSlot.remaining_slots || 0;
      const currentGuestCount =
        orderType === OrderTypeEnum.DineIn ? guestCount || 1 : 1;

      // Check if user already has a reservation for this timeslot
      const existingReservation = userReservations.find(
        (reservation) =>
          reservation.time_slot === selectedTimeSlot && !reservation.order_id
      );

      if (existingReservation && orderType === OrderTypeEnum.DineIn) {
        const existingPartySize = existingReservation.party_size || 0;
        const additionalGuests = Math.max(
          0,
          currentGuestCount - existingPartySize
        );

        const remainingSlotsAfterBooking = remainingSlots - additionalGuests;

        return (
          remainingSlotsAfterBooking < selectedSlot.priority_pass_slot &&
          remainingSlots >= additionalGuests
        );
      }

      const remainingSlotsAfterBooking = remainingSlots - currentGuestCount;

      return (
        remainingSlotsAfterBooking < selectedSlot.priority_pass_slot &&
        remainingSlots >= currentGuestCount
      );
    },
    [timeSlotOptions, guestCount, orderType, userReservations]
  );

  // Form actions
  const handleFormChange = (changedValues: any) => {
    form.setFieldsValue({
      ...changedValues,
    });

    const updatedSummary = buildOrderSummary(
      orderSummary,
      changedValues,
      timeSlotsFilteredOptions,
      timeSlotOptions
    );

    dispatch(
      setOrderSummary({
        venueId: venueId,
        orderSummary: updatedSummary,
      })
    );
  };

  const onSubmit = (values: any, action?: string) => {
    const orderSummarySubmit = buildOrderSummary(
      orderSummary,
      values,
      timeSlotsFilteredOptions,
      timeSlotOptions
    );

    dispatch(setOrderSummary({ venueId, orderSummary: orderSummarySubmit }));

    if (action === "cart") {
      const url = refCode
        ? `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${ROUTE_PATH.STORE.CART}?ref=${refCode}&from=${fromPage}`
        : `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${ROUTE_PATH.STORE.CART}${
            fromPage ? `?from=${fromPage}` : ""
          }`;
      navigate(url);
    } else if (action === "seat_reservation") {
      const url = refCode
        ? `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${ROUTE_PATH.STORE.SEAT_RESERVATION}?ref=${refCode}&from=${fromPage}`
        : `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${
            ROUTE_PATH.STORE.SEAT_RESERVATION
          }${fromPage ? `?from=${fromPage}` : ""}`;
      navigate(url);
    }
  };

  const handleSubmit = (action: string) => {
    form
      .validateFields()
      .then((values) => {
        onSubmit(values, action);
      })
      .catch((errorInfo) => {
        console.error("Form validation failed:", errorInfo);
      });
  };

  // Handle alcoholic modal
  const handleShowAlcoholicModal = useCallback(
    (confirmCallback: () => void) => {
      setAlcoholicConfirmCallback(() => confirmCallback);
      setOpenModalAlcohol(true);
    },
    []
  );

  // Alcohol confirmation modal
  const handleCloseModalAlcoholic = useCallback(() => {
    setOpenModalAlcohol(false);
    setAlcoholicConfirmCallback(null);
  }, []);

  const handleConfirmAlcoholic = useCallback(() => {
    if (alcoholicConfirmCallback) {
      alcoholicConfirmCallback();
    }
    handleCloseModalAlcoholic();
  }, [alcoholicConfirmCallback, handleCloseModalAlcoholic]);

  useEffect(() => {
    if (!timeSlot) return;

    // First check if there's a valid priority pass item for the current order type
    const priorityItem = findPriorityPassItem();
    setPriorityPassItem(priorityItem);

    // Only check if priority pass is required if we have a valid priority pass item
    // for the current order type
    const isPriorityPassRequired =
      priorityItem && checkPriorityPassRequired(timeSlot);
    setPriorityPassRequired(!!isPriorityPassRequired);

    // Track the change in addType BEFORE modifying cart
    const currentAddType = priorityPassInCart?.addType;
    const hasChangedToManualFromAuto =
      priorityPassInCart?.previousAddType === TypeCheckboxEnum.AUTO &&
      currentAddType === TypeCheckboxEnum.MANUAL;

    if (isPriorityPassRequired) {
      // Priority pass is required for this timeslot
      setIsPriorityPassModalRequired(true);

      if (!priorityItem) {
        setPriorityPassRequired(false);
        return;
      }

      const itemId = priorityItem?.origin_id || priorityItem.id;
      const isManual = priorityPassInCart?.addType === TypeCheckboxEnum.MANUAL;

      if (
        isManual &&
        orderType === OrderTypeEnum.DineIn &&
        guestCount &&
        priorityPassInCart.quantity !== guestCount
      ) {
        dispatch(
          updateQuantity({
            venueId,
            id: priorityPassInCart.id,
            origin_id: priorityPassInCart.origin_id,
            quantity: guestCount,
          })
        );
      } else if (!priorityPassInCart || !isManual) {
        addPriorityPassToCart(priorityItem, TypeCheckboxEnum.AUTO);
      }
      setOpenModalPriorityPass(true);

      // Update previousAddType when changing to AUTO
      if (priorityItem && currentAddType !== TypeCheckboxEnum.AUTO) {
        updatePriorityPassItemAddType(itemId, TypeCheckboxEnum.AUTO);
      }
    } else {
      // Priority pass is not required for this timeslot
      // Only remove priority pass if it was auto-added and wasn't manually added before
      if (
        priorityItem &&
        priorityPassInCart?.addType === TypeCheckboxEnum.AUTO &&
        priorityPassInCart.previousAddType !== TypeCheckboxEnum.MANUAL
      ) {
        removePriorityPassFromCart(priorityItem);
      } else if (
        priorityItem &&
        priorityPassInCart?.addType === TypeCheckboxEnum.AUTO
      ) {
        const itemId = priorityItem.origin_id || priorityItem.id;

        // If coming from required timeslot (AUTO), update to MANUAL and reset notice flag
        updatePriorityPassItemAddType(itemId, TypeCheckboxEnum.MANUAL);
        updatePriorityPassItemNoticeStatus(itemId, false);
      }

      // Show not required notice if switching from auto to manual and has priority pass before
      if (
        priorityItem &&
        priorityPassInCart?.addType === TypeCheckboxEnum.MANUAL &&
        !priorityPassInCart.hasShownNotRequiredNotice &&
        hasChangedToManualFromAuto
      ) {
        setIsPriorityPassModalRequired(false);
        setOpenModalPriorityPass(true);
      }
    }
  }, [
    timeSlot,
    guestCount,
    checkPriorityPassRequired,
    findPriorityPassItem,
    orderType,
    priorityPassInCart?.hasShownNotRequiredNotice,
  ]);

  // Update priority pass quantity when guestCount changes or orderType changes
  useEffect(() => {
    updatePriorityPassQuantity();
  }, [guestCount, orderType, updatePriorityPassQuantity]);

  // Function to scroll selected category into view
  const scrollToSelectedCategory = useCallback((selectedCategoryId: string) => {
    if (!categoryContainerRef.current || !selectedCategoryId) return;

    const selectedCategoryElement = categoryRefs.current[selectedCategoryId];
    if (!selectedCategoryElement) return;

    const container = categoryContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = selectedCategoryElement.getBoundingClientRect();

    const elementCenter = elementRect.left + elementRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const scrollOffset = elementCenter - containerCenter;

    container.scrollTo({
      left: container.scrollLeft + scrollOffset,
      behavior: "smooth",
    });
  }, []);

  // Handler for category selection with smooth scrolling
  const handleCategoryClick = (categoryId: string | undefined) => {
    setCategorySelected(categoryId);

    // Only scroll if a specific category is selected (not "すべて")
    if (categoryId) {
      scrollToSelectedCategory(categoryId);
    }
  };

  // Handle back navigation
  const handleBackNavigation = () => {
    switch (fromPage) {
      case STOCK_STORE_STATE.FROM_PARAM:
        navigate(
          `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.STOCK_STORE}?scrollToStore=${venueId}`
        );
        return;
      case STOCK_VENUE_AVAILABLE_STATE.FROM_PARAM:
        navigate(
          `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.STOCK_STORE}/${ROUTE_PATH.USER.STOCK_VENUE_AVAILABLE}`
        );
        return;
      case NOTIFICATION_FROM_PARAM:
        navigate(
          `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.NOTIFICATIONS}`,
          {
            state: location.state,
          }
        );
        return;
      case ARTICLE_FROM_PARAM:
        // Go back to article detail page if articleId is provided, otherwise article list page
        if (articleId) {
          navigate(`/${ROUTE_PATH.ARTICLE}/${articleId}`);
        } else {
          navigate(`/${ROUTE_PATH.ARTICLE}`);
        }
        return;
      default:
        navigateCheckToRoute("dashboard");
        return;
    }
  };

  // Handle Open Modal Announcement
  const handleOpenModalAnnouncement = (type: string) => {
    const dontShowAnnouncement = getSessionStorageWithExpiry(
      `${STORAGE_ANNOUNCEMENT_KEY}_${venueId}`
    );

    if (venueInfo?.announcement && !dontShowAnnouncement) {
      setTypeModalAnnouncement(type);
      return;
    } else {
      handleSubmit(type);
      setTypeModalAnnouncement("");
    }
  };

  // Handle close modal announcement
  const handleCloseModalAnnouncement = () => {
    handleSubmit(typeModalAnnouncement);
    setTypeModalAnnouncement("");
  };

  if (loadingFirst) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full ">
        <Spin
          spinning={loadingFirst}
          size="large"
          className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
        />
      </div>
    );
  }

  if (isEmpty(venueInfo) || isEmpty(venueInfo?.id) || isEmpty(venueId)) {
    return <NotFoundPage />;
  }

  return (
    <>
      <SEOHeadData
        title={`${venueInfo?.name} | Omochi`}
        description={
          venueInfo?.description ||
          t("seo.description_menu", {
            name: venueInfo?.name || "",
          })
        }
        canonical={window.location.href}
        ogImage={venueInfo?.logo || undefined}
        ogUrl={window.location.href}
        ogType="website"
        keywords={`${venueInfo?.name}, ${t("order.title.menu_title")}, ${t(
          "order.title.cart_title"
        )}, ${venueInfo?.address}`}
      />
      <Spin
        wrapperClassName="[&_.ant-spin]:!max-h-[100%]"
        spinning={loadingFirst}
        size="large"
      >
        <div className="relative flex flex-col items-center !h-[100dvh] max-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
          {/* Top navigation bar */}
          <TopNavigationBar
            title={t("order.title.menu_title")}
            onBack={handleBackNavigation}
            hasRightIcons
            needUserGuide
            hasLanguageSwitcher
          />

          {/* Menu Content */}
          <div className="relative flex flex-col w-full px-4 mt-2 flex-1 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth pb-[45px]">
            {/* Partner venue with menu */}
            {isPartnerVenue ? (
              <>
                <BaseCardHorizontal
                  srcImg={venueInfo?.logo || defaultImage}
                  onClick={() => setOpenStoreModal(true)}
                  defaultImg={defaultImage}
                >
                  <div className="flex flex-col gap-1 flex-1">
                    <Title
                      level={1}
                      className="text-base-white !font-bold !m-0 !mb-0"
                    >
                      {venueInfo?.name}
                    </Title>
                    <div
                      className="!text-[12px] !text-white font-family-base !leading-[normal] line-clamp-3 !whitespace-pre-wrap word-break"
                      dangerouslySetInnerHTML={{
                        __html: venueInfo?.description || "",
                      }}
                    />
                    <Text className="!text-[12px] font-family-base !leading-[1.2em] !text-[var(--tag-color)]">
                      {venueInfo?.address}
                    </Text>
                  </div>
                </BaseCardHorizontal>

                <Text className="text-xs-white !pt-3">
                  {t("order.label.infant_and_pet_notice")}
                </Text>

                <Form
                  form={form}
                  name="menuSelection"
                  layout="horizontal"
                  requiredMark={false}
                  className="!w-full !flex !flex-col !gap-3 !py-3"
                  onValuesChange={handleFormChange}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Form.Item
                      layout="horizontal"
                      name="orderType"
                      className="!m-0 form-item-select-middle form-item-horizontal flex-1"
                      label={
                        <Text className="text-xs-white min-w-fit">
                          {t("order.label.order_method_label")}
                        </Text>
                      }
                      colon={false}
                      rules={[
                        {
                          required: true,
                          message: "",
                        },
                      ]}
                    >
                      <Select
                        placeholder={t("order.label.order_method_label")}
                        size="middle"
                        className="!text-white placeholder-fix"
                        popupClassName="!bg-[var(--background-color)] !text-white !min-w-fit"
                        rootClassName="custom-select dark-select"
                        suffixIcon={
                          <IconChevronDown
                            width={20}
                            height={20}
                            className="w-[20px] h-[20px] min-w-[20px] min-h-[20px]"
                            stroke="currentColor"
                          />
                        }
                        onDropdownVisibleChange={handleDropdownVisibleChange}
                        onChange={() => {
                          setTimeSlotOptions([]);
                        }}
                      >
                        {orderTypeOptions?.map((option) => (
                          <Select.Option
                            key={option.value}
                            value={option.value}
                          >
                            {t(option.label)}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="guestCount"
                      layout="horizontal"
                      className="!m-0 form-item-select-middle form-item-horizontal"
                      label={
                        <Text className="text-xs-white min-w-fit">
                          {t("order.label.guest_count_label")}
                        </Text>
                      }
                      colon={false}
                    >
                      <SelectInput
                        placeholder={t("order.label.guest_count_label")}
                        options={guestCountOptions}
                        size="middle"
                        className="!text-white placeholder-fix"
                        popupClassName="!bg-[var(--background-color)] !text-white !w-fit"
                        rootClassName="custom-select dark-select"
                        disabled={orderType !== OrderTypeEnum.DineIn}
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="timeSlot"
                    layout="horizontal"
                    className="!m-0 form-item-select-middle form-item-horizontal flex-1 w-full"
                    label={
                      <Text className="text-xs-white min-w-fit">
                        {t("order.label.time_slots_label")}
                      </Text>
                    }
                    colon={false}
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <SelectInput
                      placeholder={t("order.label.time_slots_label")}
                      options={timeSlotsFilteredOptions}
                      size="middle"
                      className="!text-white placeholder-fix"
                      popupClassName="!bg-[var(--background-color)] !text-white"
                      rootClassName="custom-select dark-select"
                      suffixIcon={
                        <IconClockSuffix className="object-contain w-5 h-5 min-w-5 min-h-5 !text-white" />
                      }
                    />
                  </Form.Item>
                </Form>

                {isEmpty(filteredMenuItems) && !loadingFirst ? (
                  <div className="flex-grow flex items-center justify-center py-4">
                    <Text className="text-sm-white">
                      {t("general.no_data")}
                    </Text>
                  </div>
                ) : (
                  <>
                    {/* Hidden H2 for SEO - Menu Section */}
                    <Title
                      level={2}
                      className="!absolute !w-px !h-px !p-0 !-m-px !overflow-hidden !whitespace-nowrap !border-0"
                      style={{
                        clip: "rect(0, 0, 0, 0)",
                        clipPath: "inset(50%)",
                      }}
                    >
                      {t("order.title.menu_title")} - {venueInfo?.name}
                    </Title>
                    <div
                      ref={categoryContainerRef}
                      className="!bg-[var(--background-color)] z-[2] pb-3 sticky top-0 flex flex-row gap-1 w-full overflow-x-scroll scrollbar-hidden scroll-smooth min-h-[38px]"
                    >
                      {/* All category option */}
                      <div>
                        <CustomTag
                          label={t("general.all_categories")}
                          color={!categorySelected ? "#FF5733" : "#4A4A4A"}
                          onClick={() => handleCategoryClick(undefined)}
                        />
                      </div>

                      {filteredCategories?.map((category) => {
                        const { name, id } = category;
                        const isSelected = id === categorySelected;

                        return (
                          <div
                            key={id}
                            ref={(el) => {
                              categoryRefs.current[id] = el;
                            }}
                          >
                            <CustomTag
                              key={id}
                              label={name}
                              color={isSelected ? "#FF5733" : "#4A4A4A"}
                              onClick={() => handleCategoryClick(id)}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="w-full flex flex-col gap-3 ">
                      {filteredMenuItems.map((item, index) => (
                        <Fragment key={item.id}>
                          <BaseCardHorizontal
                            srcImg={item.image || defaultImage}
                            onClick={() => handleSelectMenuItem(item)}
                            defaultImg={defaultImage}
                            aspectRatio={ASPECT_RATIO_IMAGE.MENU_ITEM}
                            title={item.name}
                          >
                            <div className="flex flex-col gap-1 flex-1">
                              <div className="flex flex-col gap-1 flex-1">
                                <Title
                                  level={3}
                                  className="text-sm-white !font-bold !m-0 !mb-0"
                                >
                                  {item.name}
                                </Title>
                                <Text className="!text-[12px] !text-white !font-['Noto_Sans_JP'] !leading-[normal] line-clamp-3 !whitespace-pre-wrap">
                                  {item.description}
                                </Text>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  <IconCurrencyYen className="!w-5 !h-5 !min-w-5 !min-h-5 !flex-shrink-0 !text-white" />
                                  <Text className="text-xs-white !font-bold">
                                    {formatYen(
                                      getDisplayPriceMenuItem(item, orderType)
                                    )}
                                  </Text>
                                </div>
                                {item.is_out_of_stock ||
                                (isEatinPreorderDisabled &&
                                  !item.is_priority_pass) ? (
                                  <div className="flex-row-center px-2 h-7 min-h-7 max-h-7 bg-[var(--background-color)] rounded-[6px] min-w-[96px]">
                                    <p className="!text-center !text-[12px] !leading-[1.2em] text-[var(--text-disabled-color)] !font-['Noto_Sans_JP'] !m-0">
                                      {t(
                                        isEatinPreorderDisabled &&
                                          !item.is_priority_pass
                                          ? "general.read_only"
                                          : "general.empty_quantity"
                                      )}
                                    </p>
                                  </div>
                                ) : item.is_priority_pass ? (
                                  <PriorityPassCheckbox
                                    venueId={venueId}
                                    menuItem={item}
                                    isRequired={
                                      priorityPassRequired &&
                                      priorityPassItem?.id === item.id
                                    }
                                    onShowPriorityPassModal={
                                      handleShowPriorityPassModal
                                    }
                                  />
                                ) : (
                                  <QuantityInput
                                    venueId={venueId}
                                    menuItem={item}
                                    onShowAlcoholicModal={
                                      handleShowAlcoholicModal
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </BaseCardHorizontal>

                          {/* Add Google Ads after the first item if only 1 item, or after the second item if 2+ items */}
                          {((filteredMenuItems.length === 1 && index === 0) ||
                            (filteredMenuItems.length > 1 && index === 1)) && (
                            <div className="!w-full -my-1.5 !max-w-[500px]">
                              <GoogleAds
                                adClient={
                                  import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID
                                }
                                adSlot={import.meta.env.VITE_ADS_SLOT_MENU_PAGE}
                              />
                            </div>
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              // Non-partner venue just show venue info
              <VenueInfoContent venueInfo={venueInfo} />
            )}
          </div>

          {/* Button Bottom */}
          <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
            {isPartnerVenue ? (
              <>
                {(!isEatinPreorderDisabled || findPriorityPassItem()) && (
                  <Button
                    type="text"
                    className={`!flex-1 !h-10 !max-h-10 !min-h-10 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
                      isDisabledButtonCart
                        ? "button-disabled"
                        : " !bg-[var(--primary-color)] !text-white"
                    }`}
                    style={{ height: "unset" }}
                    onClick={() => handleOpenModalAnnouncement("cart")}
                    disabled={isDisabledButtonCart}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <IconCartComponent className="object-contain w-5 h-5 min-w-5 min-h-5" />
                      <Text className="text-sm-white">
                        {t("order.label.view_cart_label")} ({totalQuantity})
                      </Text>
                    </div>
                  </Button>
                )}
                {orderType === OrderTypeEnum.DineIn &&
                  !priorityPassRequired &&
                  !hasPriorityPassInCart &&
                  !isEatinReservationDisabled && (
                    <Button
                      type="text"
                      className={`w-fit !border-none !h-10 !max-h-10 !min-h-10 !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
                        isDisabledButtonSeat
                          ? "button-disabled"
                          : "!bg-[var(--background-teal-color)] !text-white"
                      } ${
                        (!isEatinPreorderDisabled || findPriorityPassItem()) &&
                        !isEatinReservationDisabled
                          ? ""
                          : "!flex-1"
                      }`}
                      style={{ height: "unset" }}
                      onClick={() =>
                        handleOpenModalAnnouncement("seat_reservation")
                      }
                      disabled={isDisabledButtonSeat}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <IconReservation className="!text-white w-5 h-5 min-w-5 min-h-5" />
                        <Text className="text-sm-white">
                          {t("order.label.seat_only_label")}
                        </Text>
                      </div>
                    </Button>
                  )}
              </>
            ) : (
              <PhoneCallButton
                phoneNumber={venueInfo?.phone_number || ""}
                disabled={isDisabledButtonPhone}
              />
            )}
          </div>
        </div>
      </Spin>

      <MenuItemInfoModal
        isOpen={!isEmpty(menuItemSelected)}
        onClose={() => setMenuItemSelected(null)}
        menuItemInfo={menuItemSelected}
      />

      <VenueInfoModal
        isOpen={openStoreModal}
        venueInfo={venueInfo}
        onClose={() => setOpenStoreModal(false)}
      />

      <AlcoholConfirmationModal
        isOpen={openModalAlcohol}
        onClose={handleCloseModalAlcoholic}
        handleConfirm={handleConfirmAlcoholic}
      />

      <PriorityPassNoticeModal
        isOpen={openModalPriorityPass}
        onClose={handleClosePriorityPassModal}
        isRequired={isPriorityPassModalRequired}
      />

      <VenueAnnouncementModal
        isOpen={!!typeModalAnnouncement}
        onClose={handleCloseModalAnnouncement}
        message={venueInfo?.announcement || ""}
        venueId={venueId}
      />
    </>
  );
};

export default MenuPage;
