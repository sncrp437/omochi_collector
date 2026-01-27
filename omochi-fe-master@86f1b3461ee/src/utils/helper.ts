/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ORDER_STATUS_MAPPING,
  ORDER_TYPE_OPTIONS,
  OrderStatusEnum,
  REDIRECT_SOURCE_ROUTE,
  ROUTE_PATH,
  TIME_ZONE,
  DROPDOWN_SCROLL_CONSTANTS,
  BUFFER_TIME_SLOT,
} from "./constants";
import { CartSliceItem, MenuItemTable } from "@/types/cart";
import {
  TimeSlot,
  MenuItem,
  OrderTypeEnum,
  OrderStatusHistory,
  Reservation,
  ReservationStatusHistory,
  Order,
  StockedVenue,
  VenueQuestion,
  OrderQuestionInputRequest,
  ReservationQuestionInputRequest,
} from "@/generated/api";
import { OptionType } from "@/types/common";
import { format, parse } from "date-fns";
import dayjs from "dayjs";
import { StatusDisplayItem } from "@/types/order";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// Selectors for dropdown elements
const SELECTORS = {
  SELECT_DROPDOWN: ".ant-select-dropdown",
  PICKER_PANEL: ".ant-picker-panel",
  TIME_PICKER_POPUP: ".time-picker-custom-popup",
  VIRTUAL_LIST: ".rc-virtual-list",
  DROPDOWN_MENU: ".ant-select-dropdown-menu",
  ANT_SELECT: ".ant-select",
} as const;

type RedirectSource = keyof typeof REDIRECT_SOURCE_ROUTE;
type FlagKey = (typeof ORDER_TYPE_OPTIONS)[number]["flag"];

export const formatYen = (value: string | number): string => {
  if (value === undefined || value === null) return "0";

  const rawValue =
    typeof value === "string" ? value.replace(/,/g, "") : String(value);

  const intPart = rawValue?.split(".")[0];

  try {
    const bigIntValue = BigInt(intPart);
    return bigIntValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } catch {
    return "0";
  }
};
export const formatYenWithCurrency = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(
    value
  );

export const parseYen = (value: string): string => {
  return value?.replace(/,/g, "");
};

export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;

  if (typeof value === "string") return value.trim().length === 0;

  if (Array.isArray(value)) return value.length === 0;

  if (value instanceof Map || value instanceof Set) return value.size === 0;

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }

  return false;
};

export const getEnabledOrderTypeOptions = (
  config: Record<FlagKey, boolean>
) => {
  return ORDER_TYPE_OPTIONS.filter((opt) => config[opt.flag]);
};

export const formatDate = (
  date: Date | string,
  formatStr: string = "HH:mm"
): string => {
  let parsedDate: Date;
  const formatStrCheck = formatStr || "HH:mm";

  if (typeof date === "string") {
    parsedDate = parse(date, "HH:mm:ss", new Date(0));
  } else {
    parsedDate = date;
  }

  if (isNaN(parsedDate.getTime())) return "";

  const formatted = format(parsedDate, formatStrCheck) || "";
  return formatted.replace(/:/g, "：");
};

export const formatTimeSlotLabel = (start_time: string, end_time: string) => {
  if (isEmpty(start_time) || isEmpty(end_time)) {
    return "";
  }
  const startTime = formatDate(start_time);
  const endTime = formatDate(end_time);
  return `${startTime} ～ ${endTime}`;
};

export const convertTimeSlotsToOptions = (data: TimeSlot[]): OptionType[] => {
  return data
    ?.slice()
    ?.sort((a, b) => a.start_time.localeCompare(b.start_time))
    ?.map((item) => ({
      value: item.id,
      label: `${formatDate(item.start_time)} ～ ${formatDate(item.end_time)}`,
      ...item,
    }));
};

export const getLabelFromOptions = (
  options: OptionType[],
  value: string | number
): string | undefined => {
  return options?.find((opt) => opt.value === value)?.label;
};

export const convertToMenuItemsTable = (
  rawItems: CartSliceItem[],
  orderType: OrderTypeEnum
): MenuItemTable[] => {
  return rawItems?.map((item, index) => {
    const price = parseFloat(getDisplayPriceMenuItem(item, orderType)) || 0;

    return {
      key: String(index + 1),
      name: item.name,
      quantity: item.quantity,
      subtotal: item.quantity * price,
    };
  });
};

export const getRedirectPathFromSource = (
  source: RedirectSource,
  venueId: string
): string => {
  const path = REDIRECT_SOURCE_ROUTE[source];
  return `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${path}`;
};

const isObject = (obj: unknown) => obj && typeof obj === "object";

export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  if (!isObject(a) || !isObject(b)) return false;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => deepEqual(a[key], b[key]));
};

export const getDisabledTimeRangePicker = (
  type: "start" | "end",
  [start, end]: [dayjs.Dayjs | undefined, dayjs.Dayjs | undefined]
) => {
  if (type === "start" && end) {
    return disableAfterTime(end);
  }

  if (type === "end" && start) {
    return disableBeforeTime(start);
  }

  return {};
};

const disableAfterTime = (limit: dayjs.Dayjs) => {
  return {
    disabledHours: () =>
      Array.from({ length: 24 }, (_, i) => i).filter((h) => h > limit?.hour()),
    disabledMinutes: (hour: number) =>
      hour === limit?.hour()
        ? Array.from({ length: 60 }, (_, i) => i).filter(
            (m) => m >= limit.minute()
          )
        : [],
  };
};

const disableBeforeTime = (limit: dayjs.Dayjs) => {
  return {
    disabledHours: () =>
      Array.from({ length: 24 }, (_, i) => i).filter((h) => h < limit.hour()),
    disabledMinutes: (hour: number) =>
      hour === limit.hour()
        ? Array.from({ length: 60 }, (_, i) => i).filter(
            (m) => m <= limit.minute()
          )
        : [],
  };
};

export const sortTimeSlots = (slots: TimeSlot[]): TimeSlot[] => {
  return [...slots].sort(
    (a, b) =>
      dayjs(a.start_time, "HH:mm:ss").valueOf() -
      dayjs(b.start_time, "HH:mm:ss").valueOf()
  );
};

export const filterMenuItemsByOrderType = (
  items: MenuItem[],
  orderType: OrderTypeEnum
) => {
  return items.filter((item) =>
    orderType === OrderTypeEnum.Takeout ? item.take_out_price !== null : true
  );
};

export const getDisplayPriceMenuItem = (
  item: { price: string; take_out_price?: string | null },
  orderType: OrderTypeEnum
) => {
  if (orderType === OrderTypeEnum.Takeout) {
    return item.take_out_price ?? "-";
  }
  return item.price ?? "-";
};

export const formatPhoneNumberJP = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");

  const mobileRegex = /^(\d{3})(\d{4})(\d{4})$/;
  const landlineRegex = /^(\d{2})(\d{4})(\d{4})$/;

  if (digits.length === 11 && mobileRegex.test(digits)) {
    return digits.replace(mobileRegex, "$1-$2-$3");
  }

  if (digits.length === 10 && landlineRegex.test(digits)) {
    return digits.replace(landlineRegex, "$1-$2-$3");
  }

  return phone;
};

export const getDisplayStatusList = (
  history: OrderStatusHistory[] | Reservation["status_history"],
  mapping: typeof ORDER_STATUS_MAPPING,
  status: OrderStatusEnum
): StatusDisplayItem[] => {
  const latestHistoryByStatus = history.reduce((acc, curr) => {
    const existing = acc[curr.new_status];
    if (
      !existing ||
      new Date(curr.changed_at) > new Date(existing.changed_at)
    ) {
      acc[curr.new_status] = curr;
    }
    return acc;
  }, {} as Record<string, OrderStatusHistory | ReservationStatusHistory>);

  const statusOrder = mapping.map((item) => item.status);
  const currentStatusIndex = statusOrder.indexOf(status as OrderStatusEnum);

  const filteredHistory = Object.entries(latestHistoryByStatus).reduce(
    (acc, [status, history]) => {
      const statusIndex = statusOrder.indexOf(status as OrderStatusEnum);
      if (statusIndex <= currentStatusIndex) {
        acc[status] = history;
      }
      return acc;
    },
    {} as Record<string, OrderStatusHistory | ReservationStatusHistory>
  );

  const statusList = mapping.map(({ status, label }) => {
    const matched = filteredHistory[status];
    return {
      status,
      label,
      completed: Boolean(matched),
      completedAt: matched?.changed_at
        ? format(new Date(matched?.changed_at), "HH:mm")
        : "",
      keyIcon: "" as const,
    };
  });

  const lastCompletedIndex = statusList.reduce(
    (lastIdx, item, idx) => (item.completed ? idx : lastIdx),
    -1
  );

  return statusList.map((item, idx) => {
    if (idx <= lastCompletedIndex) {
      return { ...item, keyIcon: "done" };
    } else if (idx === lastCompletedIndex + 1) {
      return { ...item, keyIcon: "preparing" };
    } else {
      return { ...item, keyIcon: "" };
    }
  });
};

export const getSummaryDataOrder = (orderDetail: Order) => {
  const {
    total_amount = 0,
    total = 0,
    takeout_fee_subsidized_amount = 0,
    order_discount_amount = 0,
    application_fee_discount_amount = 0,
    order_type = OrderTypeEnum.DineIn,
  } = orderDetail || {};

  const takeoutFee = Number(takeout_fee_subsidized_amount ?? 0);
  const totalCouponAmount =
    Number(order_discount_amount ?? 0) +
    Number(application_fee_discount_amount ?? 0);

  const totalAmountConverted = Math.max(Number(total_amount), 0);
  const totalConverted = Math.max(Number(total), 0);

  const serviceFee = order_type === OrderTypeEnum.Takeout ? takeoutFee : 0;

  const data = [
    {
      key: "subtotal",
      label: "order.label.summary_subtotal_label",
      value: totalAmountConverted,
      hidden: false,
    },
    {
      key: "serviceFee",
      label: "order.label.summary_service_fee_label",
      value: serviceFee,
      hidden: order_type !== OrderTypeEnum.Takeout,
    },
    {
      key: "couponDiscount",
      label: "order.label.coupon_label",
      value: -totalCouponAmount,
      hidden: false,
    },
    {
      key: "total",
      label: "order.label.summary_total_label",
      value: totalConverted,
      hidden: false,
    },
  ];

  return data.filter((item) => !item?.hidden);
};

export const getSortTimeOrder = (item: any) => {
  return new Date(
    item.pickup_time || item.order_date || item.created_at || 0
  ).getTime();
};

export const deepTrimStrings = (obj: any): any => {
  if (typeof obj === "string") return obj.trim();
  if (Array.isArray(obj)) return obj.map(deepTrimStrings);
  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, val]) => [key, deepTrimStrings(val)])
    );
  }
  return obj;
};

export const getTokyoToday = () => {
  return dayjs().tz(TIME_ZONE).startOf("day");
};

export const getTokyoNow = () => {
  return dayjs().tz(TIME_ZONE);
};

export const formatChangePhoneNumberJP = (phone: string) => {
  const digits = phone.replace(/\D/g, "");

  if (digits.length > 11) return digits;

  let formatted = digits;

  if (digits.length > 2) {
    switch (true) {
      case digits.length === 11:
        formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(
          7
        )}`;
        break;
      case digits.length > 6:
        formatted = `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(
          6
        )}`;
        break;
      default:
        formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
  }

  return formatted;
};

// Helper functions for dropdown scroll handling
const isInTimePicker = (target: HTMLElement) => {
  return (
    target.closest(SELECTORS.PICKER_PANEL) ||
    target.closest(SELECTORS.TIME_PICKER_POPUP)
  );
};

const isInSelectDropdown = (target: HTMLElement) => {
  return target.closest(SELECTORS.SELECT_DROPDOWN);
};

const shouldPreventScroll = (target: HTMLElement) => {
  const dropdown = isInSelectDropdown(target);
  const timePicker = isInTimePicker(target);
  return !(timePicker && !dropdown);
};

const handleDropdownScrollBoundary = (target: HTMLElement, deltaY: number) => {
  const dropdown = isInSelectDropdown(target);
  if (!dropdown) return false;

  const scrollableElement =
    dropdown.querySelector(SELECTORS.VIRTUAL_LIST) || dropdown;
  const { scrollTop, scrollHeight, clientHeight } = scrollableElement;

  if (scrollHeight <= clientHeight) return true;

  return (
    (scrollTop === 0 && deltaY < 0) ||
    (scrollTop >= scrollHeight - clientHeight && deltaY > 0)
  );
};

const adjustDropdownStyles = (restore = false) => {
  const dropdowns = document.querySelectorAll(SELECTORS.SELECT_DROPDOWN);

  dropdowns.forEach((dropdown) => {
    const dropdownEl = dropdown as HTMLElement;
    const scrollableContent =
      dropdownEl.querySelector(SELECTORS.VIRTUAL_LIST) ||
      dropdownEl.querySelector(SELECTORS.DROPDOWN_MENU);

    if (restore) {
      dropdownEl.style.maxHeight = "";
      dropdownEl.style.overflow = "";
      if (scrollableContent) {
        (scrollableContent as HTMLElement).style.maxHeight = "";
        (scrollableContent as HTMLElement).style.overflowY = "";
      }
    } else {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const rect = dropdownEl.getBoundingClientRect();

      if (rect.bottom > currentHeight) {
        const availableHeight =
          currentHeight - rect.top - DROPDOWN_SCROLL_CONSTANTS.KEYBOARD_PADDING;

        if (availableHeight >= DROPDOWN_SCROLL_CONSTANTS.MIN_DROPDOWN_HEIGHT) {
          dropdownEl.style.maxHeight = `${availableHeight}px`;
          dropdownEl.style.overflow = "hidden";

          if (scrollableContent) {
            (scrollableContent as HTMLElement).style.maxHeight = `${
              availableHeight - DROPDOWN_SCROLL_CONSTANTS.CONTENT_PADDING
            }px`;
            (scrollableContent as HTMLElement).style.overflowY = "auto";
          }
        }
      }
    }
  });
};

export const handleDropdownVisibleChange = (open: boolean) => {
  // Always cleanup first
  const existingHandlers = (window as any).dropdownScrollHandlers;
  if (existingHandlers) {
    try {
      document.removeEventListener("wheel", existingHandlers.wheel);
      document.removeEventListener("touchstart", existingHandlers.touchstart);
      document.removeEventListener("touchmove", existingHandlers.touchmove);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          existingHandlers.viewport
        );
      } else {
        window.removeEventListener("resize", existingHandlers.viewport);
      }

      if (existingHandlers.cleanupTimeoutId) {
        clearTimeout(existingHandlers.cleanupTimeoutId);
      }
    } catch (error) {
      console.error("Error in handleDropdownVisibleChange", error);
    }

    delete (window as any).dropdownScrollHandlers;
  }

  if (!open) return;

  let startY = 0;
  const initialViewportHeight =
    window.visualViewport?.height || window.innerHeight;

  // Viewport change handler
  const handleViewportChange = () => {
    try {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = initialViewportHeight - currentHeight;

      if (heightDiff > DROPDOWN_SCROLL_CONSTANTS.KEYBOARD_THRESHOLD) {
        const activeInput = document.activeElement;
        const isSearchActive =
          activeInput &&
          (activeInput.tagName === "INPUT" ||
            activeInput.tagName === "TEXTAREA") &&
          activeInput.closest(SELECTORS.ANT_SELECT);

        if (isSearchActive) {
          adjustDropdownStyles(false);
        }
      } else {
        adjustDropdownStyles(true);
      }
    } catch (error) {
      console.error("Error in handleViewportChange", error);
    }
  };

  // Event handlers
  const preventWheelScrollChaining = (e: WheelEvent) => {
    try {
      const target = e.target as HTMLElement;

      if (!shouldPreventScroll(target)) return;

      if (handleDropdownScrollBoundary(target, e.deltaY)) {
        e.preventDefault();
        e.stopPropagation();
      }
    } catch (error) {
      console.error("Error in preventWheelScrollChaining", error);
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    try {
      startY = e.touches[0].clientY;
    } catch (error) {
      console.error("Error in handleTouchStart", error);
    }
  };

  const preventTouchScrollChaining = (e: TouchEvent) => {
    try {
      const target = e.target as HTMLElement;

      if (!shouldPreventScroll(target)) return;

      const dropdown = isInSelectDropdown(target);
      if (dropdown) {
        const currentY = e.touches[0].clientY;
        const deltaY = startY - currentY;

        if (handleDropdownScrollBoundary(target, deltaY)) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        e.preventDefault();
        e.stopPropagation();
      }
    } catch (error) {
      console.error("Error in preventTouchScrollChaining", error);
    }
  };

  // Add event listeners
  try {
    document.addEventListener("wheel", preventWheelScrollChaining, {
      passive: false,
    });
    document.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchmove", preventTouchScrollChaining, {
      passive: false,
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
    } else {
      window.addEventListener("resize", handleViewportChange);
    }

    // Store timeout ID for cleanup
    const cleanupTimeoutId = setTimeout(() => {
      handleDropdownVisibleChange(false);
    }, DROPDOWN_SCROLL_CONSTANTS.CLEANUP_TIMEOUT);

    // Store handlers for cleanup
    (window as any).dropdownScrollHandlers = {
      wheel: preventWheelScrollChaining,
      touchstart: handleTouchStart,
      touchmove: preventTouchScrollChaining,
      viewport: handleViewportChange,
      cleanupTimeoutId,
    };
  } catch (error) {
    console.error("Error in handleDropdownVisibleChange", error);
  }
};

export const roundUpToNext15Min = (dt: dayjs.Dayjs): dayjs.Dayjs => {
  const minute = dt.minute();
  const next = Math.ceil(minute / BUFFER_TIME_SLOT) * BUFFER_TIME_SLOT;

  return dt.startOf("hour").add(next, "minute");
};

export const generateTimeslotsFrom = (
  startTime: dayjs.Dayjs
): { id: string; time: string }[] => {
  const timeslots: { id: string; time: string }[] = [];
  const endOfDay = startTime.hour(23).minute(45).second(0).millisecond(0);

  let current = startTime;
  let index = 0;

  while (current.isBefore(endOfDay) || current.isSame(endOfDay)) {
    timeslots.push({
      id: `ts-${index}`,
      time: current.format("HH:mm"),
    });

    current = current.add(BUFFER_TIME_SLOT, "minute");
    index++;
  }

  return timeslots;
};

export const findSatisfyingVenueTimeslot = (
  venue: StockedVenue,
  selectedTimeSlot: { id: string; time: string }
): TimeSlot | null => {
  if (!venue?.timeslots?.length || !selectedTimeSlot?.time) {
    return null;
  }

  const todayStr = getTokyoNow().format("YYYY-MM-DD");
  const selectedTime = dayjs(`${todayStr}T${selectedTimeSlot.time}:00`);

  return (
    venue.timeslots.find((ts) => {
      if (
        ts.is_paused ||
        ts?.remaining_slots <= 0 ||
        !ts.start_time ||
        !ts.end_time
      )
        return false;
      const tsStart = dayjs(`${todayStr}T${ts.start_time}`);
      const tsEnd = dayjs(`${todayStr}T${ts.end_time}`);
      return selectedTime.isBetween(tsStart, tsEnd, null, "[)");
    }) || null
  );
};

// Generate a random string of 8 alphanumeric characters
export const generateRandomString = (length = 8): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
};

export const formatAndRoundAmount = (amount: string) => {
  const parsedAmount = parseFloat(amount);
  return isNaN(parsedAmount) ? 0 : Math.round(parsedAmount);
};

/**
 * Convert user answers to OrderQuestionInputRequest format for order creation
 * @param answers - User answers mapped by question ID
 * @param venueQuestions - List of venue questions
 * @returns Array of OrderQuestionInputRequest
 */
export const convertAnswersToOrderQuestions = (
  answers: Record<string, string>,
  venueQuestions: VenueQuestion[]
): OrderQuestionInputRequest[] => {
  return venueQuestions.map((question) => {
    const answer = answers[question.id] || "";
    return {
      question_id: question.id,
      question: question.question,
      question_en: question.question, // Using same question for both languages for now
      answer: answer,
    };
  });
};

/**
 * Convert user answers to ReservationQuestionInputRequest format for reservation creation
 * @param answers - User answers mapped by question ID
 * @param venueQuestions - List of venue questions
 * @returns Array of ReservationQuestionInputRequest
 */
export const convertAnswersToReservationQuestions = (
  answers: Record<string, string>,
  venueQuestions: VenueQuestion[]
): ReservationQuestionInputRequest[] => {
  return venueQuestions.map((question) => {
    const answer = answers[question.id] || "";
    return {
      question_id: question.id,
      answer: answer,
    };
  });
};
