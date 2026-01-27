import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState, useRef } from "react";
import { LANGUAGE_STORAGE_KEY, LANGUAGE_OPTIONS } from "@/utils/constants";
import { updateRequestLanguageHeader } from "@/utils/request";

interface UseLanguageReturn {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  isLanguageLoading: boolean;
  languageOptions: Array<{
    value: string;
    label: string;
  }>;
  onLanguageChange?: (callback: () => void) => void;
}

/**
 * Custom hook for managing language switching
 * Handles localStorage persistence and language state
 */
export const useLanguage = (): UseLanguageReturn => {
  const { i18n } = useTranslation();
  const [isLanguageLoading, setIsLanguageLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [languageChangeCallback, setLanguageChangeCallback] = useState<
    (() => void) | null
  >(null);
  const previousLanguageRef = useRef(i18n.language);

  // Update currentLanguage when i18n language changes
  useEffect(() => {
    const hasLanguageChanged = previousLanguageRef.current !== i18n.language;

    setCurrentLanguage(i18n.language);

    // Only trigger callback if language actually changed (not initial load)
    if (hasLanguageChanged) {
      // Update request headers with new language
      updateRequestLanguageHeader();

      if (languageChangeCallback) {
        // Delay callback to ensure headers are updated
        setTimeout(() => {
          try {
            languageChangeCallback();
          } catch (error) {
            console.error("Error in language change callback:", error);
          }
        }, 0);
      }
    }

    previousLanguageRef.current = i18n.language;
  }, [i18n.language]);

  const changeLanguage = useCallback(
    async (language: string) => {
      // If the language is already selected, do nothing
      if (language === currentLanguage || isLanguageLoading) {
        return;
      }

      setIsLanguageLoading(true);

      try {
        // Change i18n language
        await i18n.changeLanguage(language);

        // Save to localStorage for persistence
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

        // Update local state
        setCurrentLanguage(language);
      } catch (error) {
        console.error("Failed to change language:", error);
      } finally {
        setIsLanguageLoading(false);
      }
    },
    [currentLanguage, i18n, isLanguageLoading]
  );

  const onLanguageChange = useCallback((callback: () => void) => {
    setLanguageChangeCallback(() => callback);

    // Return cleanup function
    return () => {
      setLanguageChangeCallback(null);
    };
  }, []);

  return {
    currentLanguage,
    changeLanguage,
    isLanguageLoading,
    languageOptions: LANGUAGE_OPTIONS,
    onLanguageChange,
  };
};
