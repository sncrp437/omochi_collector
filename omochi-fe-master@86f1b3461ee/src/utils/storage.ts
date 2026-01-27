import { CART_EXPIRY_DURATION_MS } from "./constants";
import { SessionStorageData } from "@/types/cart";

export const getItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error("Error getting item from localStorage:", error);
    return null;
  }
};

export const setItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error("Error setting item in localStorage:", error);
  }
};

export const removeItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing item from localStorage:", error);
  }
};

/**
 * Set session storage data with timestamp
 * @param key - Storage key
 * @param data - Data to store
 */
export const setSessionStorageWithExpiry = (
  key: string,
  data: Partial<SessionStorageData>
) => {
  const storageData: SessionStorageData = {
    dontShow: true,
    persistedAt: Date.now(),
    ...data,
  };
  sessionStorage.setItem(key, JSON.stringify(storageData));
};

/**
 * Get session storage data and check if it's still valid
 * @param key - Storage key
 * @param expiryTime - Expiry time in milliseconds (default: 24 hours)
 * @returns true if data is valid and should be used, false otherwise
 */
export const getSessionStorageWithExpiry = (
  key: string,
  expiryTime: number = CART_EXPIRY_DURATION_MS
): boolean => {
  try {
    const data = sessionStorage.getItem(key);
    if (!data) return false;

    const parsedData: SessionStorageData = JSON.parse(data);
    const now = Date.now();

    // Check if the data is still valid
    if (parsedData.dontShow && now - parsedData.persistedAt < expiryTime) {
      return true;
    }

    // Data is expired, remove it
    sessionStorage.removeItem(key);
    return false;
  } catch (error) {
    // If parsing fails, treat as invalid data
    console.error("Error parsing session storage data:", error);
    sessionStorage.removeItem(key);
    return false;
  }
};

/**
 * Remove session storage data
 * @param key - Storage key
 */
export const removeSessionStorage = (key: string) => {
  sessionStorage.removeItem(key);
};
