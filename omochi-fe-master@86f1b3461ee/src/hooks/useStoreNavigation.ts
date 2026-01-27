import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTE_PATH, STOCK_STORE_STATE } from "@/utils/constants";

interface UseStoreNavigationProps {
  onSaveState?: () => void;
  fromParam?: string;
}

/**
 * Custom hook for handling store navigation with state saving
 *
 * @param onSaveState - Callback function to save current state before navigation
 * @returns Object containing navigation function
 */
export const useStoreNavigation = ({
  onSaveState,
  fromParam = STOCK_STORE_STATE.FROM_PARAM,
}: UseStoreNavigationProps) => {
  const navigate = useNavigate();

  /**
   * Navigates to store page with proper state saving and query parameters
   * @param venueId - The ID of the venue to navigate to
   */
  const navigateToStore = useCallback(
    (venueId: string) => {
      // Save current state before navigation
      onSaveState?.();

      // Navigate to store page with from parameter
      navigate(`/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}?from=${fromParam}`);
    },
    [navigate, onSaveState, fromParam]
  );

  return { navigateToStore };
};
