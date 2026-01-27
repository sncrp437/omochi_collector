import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AUTH,
  USER_ROLE,
  VENUE_ROLE,
  CART,
  REF_SLICE,
  CAMPAIGN_MODAL_SHOWN_KEY,
} from "../../utils/constants";
import { UserWithRole } from "../../types/auth";
import { toast } from "react-toastify";

interface AuthState {
  isAuthenticated: boolean;
  user: UserWithRole | null;
  accessToken: string | null;
  refreshToken: string | null;
  rememberMe: boolean;
}

// Get authentication data from localStorage if available
const loadAuthFromStorage = (): AuthState => {
  try {
    const authData = localStorage.getItem(AUTH);
    if (authData) {
      return JSON.parse(authData);
    }
  } catch (error) {
    console.error("Error loading auth data from localStorage:", error);
  }
  return {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    rememberMe: false,
  };
};

// Initialize state from localStorage
const initialState: AuthState = loadAuthFromStorage();

interface LoginPayload {
  user: UserWithRole;
  accessToken: string;
  refreshToken?: string;
  rememberMe?: boolean;
}

let isLoggingOut = false;

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      const userWithRole = {
        ...action.payload.user,
        role:
          action.payload.user.venue_roles.length > 0 ? VENUE_ROLE : USER_ROLE,
      };

      state.isAuthenticated = true;
      state.user = userWithRole;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken || null;
      state.rememberMe = action.payload.rememberMe || false;

      // Reset logout flag on login
      isLoggingOut = false;

      try {
        localStorage.setItem(
          AUTH,
          JSON.stringify({
            isAuthenticated: true,
            user: userWithRole,
            accessToken: action.payload.accessToken,
            refreshToken: action.payload.refreshToken || null,
            rememberMe: action.payload.rememberMe || false,
          })
        );
      } catch (error) {
        console.error("Error saving auth data to localStorage:", error);
      }
    },
    logout: (state) => {
      // Set flag before dismiss
      isLoggingOut = true;

      // Dismiss toasts
      toast.dismiss();

      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.rememberMe = false;

      // Remove from localStorage
      try {
        localStorage.removeItem(AUTH);
        localStorage.removeItem(CART);
        localStorage.removeItem(REF_SLICE);
        localStorage.removeItem("fcm_token");
        localStorage.removeItem("fcm_token_registered");
        localStorage.removeItem("last_notification_check");
        localStorage.removeItem(CAMPAIGN_MODAL_SHOWN_KEY);
      } catch (error) {
        console.error("Error removing auth data from localStorage:", error);
      }

      // Reset flag after cleanup
      setTimeout(() => {
        isLoggingOut = false;
      }, 100);
    },
    updateTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken?: string }>
    ) => {
      state.accessToken = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }

      // Update localStorage
      try {
        const authData = localStorage.getItem(AUTH);
        if (authData) {
          const parsedData = JSON.parse(authData);
          parsedData.accessToken = action.payload.accessToken;
          parsedData.refreshToken = action.payload.refreshToken
            ? action.payload.refreshToken
            : state.refreshToken;

          localStorage.setItem(AUTH, JSON.stringify(parsedData));
        }
      } catch (error) {
        console.error("Error updating tokens in localStorage:", error);
      }
    },
    setUser: (state, action: PayloadAction<UserWithRole>) => {
      const userWithRole = {
        ...action.payload,
        role: action.payload.venue_roles.length > 0 ? VENUE_ROLE : USER_ROLE,
      };
      state.user = userWithRole;

      try {
        const authData = localStorage.getItem(AUTH);
        if (authData) {
          const parsedData = JSON.parse(authData);
          parsedData.user = userWithRole;
          localStorage.setItem(AUTH, JSON.stringify(parsedData));
        }
      } catch (error) {
        console.error("Error updating user data in localStorage:", error);
      }
    },
    setRememberMe: (state, action: PayloadAction<boolean>) => {
      state.rememberMe = action.payload;

      // Update localStorage
      try {
        const authData = localStorage.getItem(AUTH);
        if (authData) {
          const parsedData = JSON.parse(authData);
          parsedData.rememberMe = action.payload;
          localStorage.setItem(AUTH, JSON.stringify(parsedData));
        }
      } catch (error) {
        console.error("Error updating rememberMe in localStorage:", error);
      }
    },
  },
});

export const { login, logout, updateTokens, setUser, setRememberMe } =
  authSlice.actions;

// Export simple checker function
export const getIsLoggingOut = () => isLoggingOut;

export default authSlice.reducer;
