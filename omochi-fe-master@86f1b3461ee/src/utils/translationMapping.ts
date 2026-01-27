import { GENRE_KEYS, VENUE_TAG_KEYS } from "@/utils/constants";
import jpTranslations from "@/i18n/jp.json";
import enTranslations from "@/i18n/en.json";

type MappingType = "genres" | "venue_tags";

// Type-safe access to translation options
const getTranslationValue = (
  translations: typeof jpTranslations,
  type: MappingType,
  key: string
): string | undefined => {
  const options = translations.options as Record<
    string,
    Record<string, string>
  >;
  return options[type]?.[key];
};

// Create dynamic mapping based on type using existing constants
const createJapaneseToEnglishMapping = (
  type: MappingType
): Record<string, string> => {
  const mapping: Record<string, string> = {};
  const keys = type === "genres" ? GENRE_KEYS : VENUE_TAG_KEYS;

  keys.forEach((key) => {
    const japaneseValue = getTranslationValue(jpTranslations, type, key);
    const englishValue = getTranslationValue(enTranslations, type, key);

    if (japaneseValue && englishValue) {
      mapping[japaneseValue] = englishValue;
    }
  });

  return mapping;
};

// Cache the mappings for performance
const genreMapping = createJapaneseToEnglishMapping("genres");
const venueTagMapping = createJapaneseToEnglishMapping("venue_tags");

/**
 * Universal function to convert Japanese values to English values
 */
const convertJapaneseToEnglish = (
  type: MappingType,
  japaneseValues: string | string[]
): string | string[] | null => {
  const mapping = type === "genres" ? genreMapping : venueTagMapping;

  if (typeof japaneseValues === "string") {
    if (!japaneseValues?.trim()) return null;
    return mapping[japaneseValues.trim()] || null;
  }

  if (!japaneseValues || !Array.isArray(japaneseValues)) return [];

  return japaneseValues
    .map((value) => value?.trim())
    .filter((value) => value)
    .map((value) => mapping[value])
    .filter((value) => value);
};

export const convertJapaneseGenreToEnglishValue = (
  japaneseGenre: string
): string | null => {
  return convertJapaneseToEnglish("genres", japaneseGenre) as string | null;
};

export const convertJapaneseVenueTagsToEnglish = (
  japaneseTags: string[]
): string[] => {
  return convertJapaneseToEnglish("venue_tags", japaneseTags) as string[];
};
