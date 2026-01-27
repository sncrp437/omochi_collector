import { OrderTypeEnum } from "@/generated/api";

export const AUTH = "auth";
export const CART = "cart";
export const REF_SLICE = "ref";
export const USER_ROLE = "user";
export const VENUE_ROLE = "venue";
export const CAMPAIGN_MODAL_SHOWN_KEY = "campaign_modal_shown";
export const LANGUAGE_STORAGE_KEY = "language_selected";

// Company constants
export const COMPANY_CONSTANTS = {
  EMAIL: "info@omochiapp.com",
  SALES_URL: "https://omochiapp.com",
} as const;

// Language options constants for multiple languages
export const LANGUAGE_OPTIONS = [
  {
    value: "ja",
    label: "JA",
  },
  {
    value: "en",
    label: "EN",
  },
];

export enum VENUE_MANAGEMENT_ROLES {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
}

export enum VenuePermission {
  ALL = "ALL",
  ORDERS = "ORDERS",
  RESERVATION = "RESERVATION",
  ORDER_LOGS = "ORDER_LOGS",
  CAPACITY_CONTROL = "CAPACITY_CONTROL",
  SETTINGS_VENUE = "SETTINGS_VENUE",
  MENU_MANAGEMENT = "MENU_MANAGEMENT",
}

export const VENUE_ROLE_PERMISSIONS: Record<
  VENUE_MANAGEMENT_ROLES,
  VenuePermission[]
> = {
  OWNER: [VenuePermission.ALL],
  MANAGER: [VenuePermission.ALL],
  STAFF: [VenuePermission.ORDERS],
};

export const POLLING_INTERVAL_REFRESH_API = 45000; // 45 seconds
export const CART_EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
export const LINK_SOCIAL_MEDIA_OMOCHI = {
  INSTAGRAM:
    "https://www.instagram.com/omochi_team?igsh=cDhhbHhrcmw4ZWtk&utm_source=qr",
  YOUTUBE: "https://youtube.com/@omochisupport",
};
export const MAX_SIZE_FETCH_ORDERS = 20;
export const MAX_SIZE_FETCH_ARTICLES = 10;
export const TIME_ZONE = "Asia/Tokyo";
export const STOCK_STORE_STATE = {
  FROM_PARAM: "stock-store",
  SESSION_STORAGE_KEY: "stockStoreState",
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000, // 1 day
};
export const STOCK_VENUE_AVAILABLE_STATE = {
  FROM_PARAM: "stock-venue-available",
  SESSION_STORAGE_KEY: "stockVenueAvailableState",
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000, // 1 day
};
export const NOTIFICATION_FROM_PARAM = "notifications";
export const ARTICLE_FROM_PARAM = "article";
export const ARTICLE_LIST_STATE = {
  SESSION_STORAGE_KEY: "articleListState",
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000, // 1 day
};
export const NOTIFICATION_SCROLL_KEY = "notificationScrollTo";
export const COOKIE_EXPIRY_DURATION_MS = 60 * 60 * 24 * 365; // 1 year
export const CATEGORY_PRIORITY_PASS_ID = "00000000-0000-0000-0000-000000000001";
export const MAX_ALMOST_FULL_SLOT = 5; // Threshold for almost full slots
export const BUFFER_TIME_SLOT = 15; // Buffer time in minutes for slot availability
export const STORAGE_ANNOUNCEMENT_KEY = "dontShowAnnouncement";
export const ASPECT_RATIO_IMAGE = {
  VENUE: 4 / 3,
  MENU_ITEM: 3 / 2,
};
export const DEFAULT_QUESTION_COUNT = 3;
export const MAX_QUESTION_COUNT = 10;

// constants for validation password
export const MAX_LENGTH_PASSWORD = 12;
export const MIN_LENGTH_PASSWORD = 6;

// Constants for dropdown scroll handling
export const DROPDOWN_SCROLL_CONSTANTS = {
  KEYBOARD_THRESHOLD: 150,
  MIN_DROPDOWN_HEIGHT: 120,
  KEYBOARD_PADDING: 20,
  CONTENT_PADDING: 20,
  CLEANUP_TIMEOUT: 30000,
} as const;

// Constants for partner store items
export const MINIMUM_PARTNER_STORE_ITEMS_CAROUSEL = 8;

export const ROUTE_PATH = {
  ROOT: "/",
  INTRODUCTION: "introduction",
  ARTICLE: "article",
  NOT_FOUND: "not-found",
  USER: {
    LOGIN: "login-user",
    REGISTER: "register-user",
    DASHBOARD: "user",
    MENU: "menu",
    CART: "cart",
    ORDERS: "orders",
    ORDER_CONFIRMATION: "order-confirmation",
    PRODUCTS: "products",
    CATEGORIES: "categories",
    USERS: "users",
    NOTIFICATIONS: "notifications",
    QR_SCAN: "qr-scan",
    STOCK_STORE: "stock-store",
    SHARE: "share",
    SETTINGS: "settings",
    PROFILE: "profile",
    SHOW_TO_VENUE: "show-to-venue",
    RESERVATION: "reservation",
    COUPONS: "coupons",
    STOCK_VENUE_AVAILABLE: "available",
    CHANGE_PASSWORD: "change-password",
  },
  VENUE: {
    LOGIN: "login-venue",
    DASHBOARD: "venue",
    MENU_MANAGEMENT: "menu-management",
    CART: "cart",
    ORDERS: "orders",
    ORDER_LOGS: "order-logs",
    CAPACITY_CONTROL: "capacity-control",
    PRODUCTS: "products",
    CATEGORIES: "categories",
    USERS: "users",
    NOTIFICATIONS: "notifications",
    SETTINGS_VENUE: "settings-venue",
    ORDER_QUESTIONS: "order-questions",
    RESERVATION: "reservation",
    RESERVATION_LOGS: "reservation-logs",
  },
  FCM_TEST: "fcm-test",
  POLICY: {
    ROOT_POLICY: "policy",
    CONTACT: "contact",
    TERMS: "terms",
    PRIVACY: "privacy-policy",
    LEGAL: "legal",
    MANUAL: "manual",
    COUPON: "coupon",
  },
  STORE: {
    ROOT_STORE: "store",
    CART: "cart",
    SEAT_RESERVATION: "seat-reservation",
  },
  PAYMENT: {
    ROOT_PAYMENT: "payment",
    PAYMENT_STATUS: "status",
  },
  AUTH: {
    FORGOT_PASSWORD: "forgot-password",
    RESET_PASSWORD: "reset-password",
  },
};

export enum OrderTypes {
  DINE_IN = "order.label.dine_in_label",
  TAKEOUT = "order.label.takeout_label",
}

export const ORDER_TYPE_OPTIONS = [
  {
    value: OrderTypeEnum.DineIn,
    label: "order.label.dine_in_label",
    flag: "enable_eat_in" as const,
  },
  {
    value: OrderTypeEnum.Takeout,
    label: "order.label.takeout_label",
    flag: "enable_take_out" as const,
  },
];

export const WHITELIST_PATHS = [
  `/${ROUTE_PATH.STORE.ROOT_STORE}`,
  `/${ROUTE_PATH.VENUE.LOGIN}`,
  "^/venue(/.*)?$",
  `/${ROUTE_PATH.ARTICLE}`,
  `/${ROUTE_PATH.POLICY.ROOT_POLICY}`,
];

export const ROUTES_REDIRECT_TOP_NAVIGATOR = {
  manual: `/${ROUTE_PATH.POLICY.ROOT_POLICY}/${ROUTE_PATH.POLICY.MANUAL}`,
  notification: `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.NOTIFICATIONS}`,
  back: -1,
  dashboard: `/${ROUTE_PATH.USER.DASHBOARD}`,
};

export const DUMMY_MENU_ITEM_TABLE = [
  {
    key: "1",
    name: "order.label.menu_item_name_label",
    quantity: 0,
    subtotal: 0,
  },
];

export const REDIRECT_SOURCE_ROUTE: Record<string, string> = {
  cart: ROUTE_PATH.STORE.CART,
  reservation: ROUTE_PATH.STORE.SEAT_RESERVATION,
};

export enum OrderStatusEnum {
  Pending = "PENDING",
  Confirmed = "CONFIRMED",
  Preparing = "PREPARING",
  Ready = "READY",
  Completed = "COMPLETED",
  Cancelled = "CANCELLED",
}

export const ORDER_STATUS_MAPPING = [
  {
    id: 1,
    status: OrderStatusEnum.Confirmed,
    label: "order.label.order_status_label_confirmed",
  },
  {
    id: 2,
    status: OrderStatusEnum.Preparing,
    label: "order.label.order_status_label_preparing",
  },
  {
    id: 3,
    status: OrderStatusEnum.Ready,
    label: "order.label.order_status_label_ready",
  },
  {
    id: 4,
    status: OrderStatusEnum.Completed,
    label: "order.label.order_status_label_completed",
  },
];

export enum PaymentStripeStatusEnum {
  Pending = "PENDING",
  Processing = "PROCESSING",
  Completed = "COMPLETED",
  Failed = "FAILED",
}

export enum PreOrderEnum {
  YES = "yes",
  NO = "no",
}

export const PRE_ORDER_OPTIONS = [
  {
    value: PreOrderEnum.NO,
    label: "order.content.pre_order_no_content",
  },
  {
    value: PreOrderEnum.YES,
    label: "order.content.pre_order_yes_content",
  },
];

export enum FormModeEnum {
  ADD = "add",
  EDIT = "edit",
}

export enum StripeAccountStatusEnum {
  Pending = "PENDING",
  Created = "CREATED",
  Verified = "VERIFIED",
  Restricted = "RESTRICTED",
  Rejected = "REJECTED",
}

export enum TypeCheckboxEnum {
  AUTO = "auto",
  MANUAL = "manual",
}

// Venue genre and tag constants - Single source of truth
export const GENRE_KEYS = [
  "hamburger",
  "pizza",
  "japanese",
  "chinese",
  "korean",
  "italian",
  "french",
  "curry",
  "cafe",
  "sweets",
  "bento",
  "rice_bowl",
  "sushi",
  "udon_soba",
  "ramen",
  "grill_bbq",
  "salad_healthy",
  "vegetarian_vegan",
  "seafood",
  "family_restaurant",
  "bakery",
  "drinks_juice",
  "alcohol_bar",
] as const;

export const VENUE_TAG_KEYS = [
  "cash_only",
  "wifi_available",
  "power_outlet",
  "non_smoking",
  "smoking_allowed",
  "terrace_seating",
  "private_room",
  "child_friendly",
  "stroller_friendly",
  "kids_chair",
  "pet_outdoor",
  "pet_indoor",
  "pet_not_allowed",
] as const;

export type GenreKey = (typeof GENRE_KEYS)[number];
export type VenueTagKey = (typeof VENUE_TAG_KEYS)[number];

// Constants for better maintainability
export const DATE_FORMAT_BASE = "YYYY-MM-DD";
export const TIME_FORMAT_BASE = "HH:mm";
export const JP_TIME_SEPARATOR_BASE = "：";
