import i18n from "@/i18n/locales/index";
import { GENRE_KEYS, VENUE_TAG_KEYS } from "@/utils/constants";
import jpTranslations from "@/i18n/jp.json";

/**
 * Generate guest count list from translation keys
 */
export const getListGuestCountOptions = () => [
  {
    id: 1,
    label: i18n.t("ui.guest_count.one_person"),
    value: 1,
  },
  {
    id: 2,
    label: i18n.t("ui.guest_count.two_people"),
    value: 2,
  },
  {
    id: 3,
    label: i18n.t("ui.guest_count.three_people"),
    value: 3,
  },
  {
    id: 4,
    label: i18n.t("ui.guest_count.four_people"),
    value: 4,
  },
  {
    id: 5,
    label: i18n.t("ui.guest_count.five_people"),
    value: 5,
  },
  {
    id: 6,
    label: i18n.t("ui.guest_count.six_people"),
    value: 6,
  },
];

/**
 * Generate genre options from translation keys
 * @param forceJapanese - If true, always return Japanese values regardless of current language
 */
export const getGenreOptions = (forceJapanese = false) => {
  if (forceJapanese) {
    return GENRE_KEYS.map((key) => jpTranslations.options.genres[key]);
  }

  return GENRE_KEYS.map((key) => i18n.t(`options.genres.${key}`));
};

/**
 * Generate venue tag options from translation keys
 * @param forceJapanese - If true, always return Japanese values regardless of current language
 */
export const getVenueTagOptions = (forceJapanese = false) => {
  if (forceJapanese) {
    return VENUE_TAG_KEYS.map((key) => jpTranslations.options.venue_tags[key]);
  }

  return VENUE_TAG_KEYS.map((key) => i18n.t(`options.venue_tags.${key}`));
};

/**
 * Generate date format functions from translation keys
 */
export const getDateFormatHelpers = () => ({
  formatMonthDay: (month: number, day: number) =>
    i18n.t("ui.date_format.month_day", { month, day }),
  formatYearMonthDay: (year: number, month: number, day: number) =>
    i18n.t("ui.date_format.year_month_day", { year, month, day }),
  getDeadlineSuffix: () => i18n.t("campaign.deadline_label"),
});

/**
 * Generate order type label based on enableEatIn and enableTakeOut flags
 */
export const getOrderTypeLabel = (
  enableEatIn?: boolean,
  enableTakeOut?: boolean
): string => {
  if (enableEatIn && enableTakeOut) {
    return i18n.t("order.label.combined_order_label");
  }
  if (enableEatIn) {
    return i18n.t("order.label.dine_in_label");
  }
  if (enableTakeOut) {
    return i18n.t("order.label.takeout_label");
  }
  return "";
};
