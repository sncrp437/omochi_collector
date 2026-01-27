import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import jp from "../jp.json";
import en from "../en.json";

// Get language from localStorage or default to Japanese
const getStoredLanguage = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("language_selected") || "ja";
  }
  return "ja";
};

i18n.use(initReactI18next).init({
  resources: {
    ja: {
      translation: jp,
    },
    en: {
      translation: en,
    },
  },
  lng: getStoredLanguage(),
  fallbackLng: "ja",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
