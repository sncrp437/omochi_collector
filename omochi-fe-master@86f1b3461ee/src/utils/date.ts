import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { TIME_ZONE } from "@/utils/constants";
import { getDateFormatHelpers } from "@/utils/translationHelpers";
import i18n from "@/i18n/locales/index";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Convert date string to Japanese format
 * @param dateString - Date string in format "YYYY-MM-DD"
 * @returns Japanese formatted date string like "8月19日"
 */
export const convertDateToJapanese = (dateString: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();

    const { formatMonthDay } = getDateFormatHelpers();
    return formatMonthDay(month, day);
  } catch (error) {
    console.error("Error converting date to Japanese format:", error);
    return "";
  }
};

/**
 * Convert date string to Japanese format with deadline suffix
 * @param dateString - Date string in format "YYYY-MM-DD"
 * @param deadlineSuffix - Suffix text for deadline (default: "まで！")
 * @returns Japanese formatted date string like "8月19日まで！"
 */
export const convertDateToJapaneseWithDeadline = (
  dateString: string,
  deadlineSuffix?: string
): string => {
  const japaneseDate = convertDateToJapanese(dateString);
  if (!japaneseDate) return "";

  const { getDeadlineSuffix } = getDateFormatHelpers();
  const suffix = deadlineSuffix || getDeadlineSuffix();
  return `${japaneseDate}${suffix}`;
};

/**
 * Convert date string to localized format with deadline
 * @param dateString - Date string in format "YYYY-MM-DD"
 * @param deadlineSuffix - Suffix text for deadline (optional)
 * @returns Localized formatted date string:
 *   - Japanese: "9月25日まで！"
 *   - English: "Until 9/25"
 */
export const convertDateToLocalizedWithDeadline = (
  dateString: string,
  deadlineSuffix?: string
): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();

    const { formatMonthDay, getDeadlineSuffix } = getDateFormatHelpers();
    const formattedDate = formatMonthDay(month, day);
    const suffix = deadlineSuffix || getDeadlineSuffix();

    // Check current language to determine format
    const currentLanguage = i18n.language || "ja";

    if (currentLanguage === "en") {
      // English format: "Until 9/25"
      return `${suffix.replace("!", "")} ${formattedDate}`;
    } else {
      // Japanese format: "9月25日まで！"
      return `${formattedDate}${suffix}`;
    }
  } catch (error) {
    console.error(
      "Error converting date to localized format with deadline:",
      error
    );
    return "";
  }
};

/**
 * Convert UTC date string to Japanese format with year
 * @param utcDateString - UTC date string in format "YYYY-MM-DD" or ISO string (e.g., "2025-09-15T04:58:50.665757Z")
 * @returns Japanese formatted date string like "2025年9月15日"
 */
export const convertUtcDateToJapaneseWithYear = (
  utcDateString: string
): string => {
  if (!utcDateString) return "";

  try {
    // Parse UTC date and convert to Japan timezone using TIME_ZONE constant
    const japanDate = dayjs.utc(utcDateString).tz(TIME_ZONE);

    if (!japanDate.isValid()) return "";

    const year = japanDate.year();
    const month = japanDate.month() + 1; // dayjs month is 0-11
    const day = japanDate.date();

    const { formatYearMonthDay } = getDateFormatHelpers();
    return formatYearMonthDay(year, month, day);
  } catch (error) {
    console.error(
      "Error converting UTC date to Japanese format with year:",
      error
    );
    return "";
  }
};
