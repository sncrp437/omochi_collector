import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse,
} from "axios";
import { jwtDecode } from "jwt-decode";
import { logout, updateTokens } from "../store/slices/authSlice";
import { store } from "../store";
import { refreshToken } from "../api/auth";
import { getItem, removeItem } from "./storage";
import { AUTH } from "./constants";
import { Configuration } from "../generated/api";
import i18n from "../i18n/locales";
import { showGlobalToastError, resetGlobalToast } from "@/utils/toastError";

const t = i18n.t;

resetGlobalToast();

interface DecodedToken {
  exp: number;
  [key: string]: unknown;
}

interface TokenRefreshResponse {
  access: string;
  refresh?: string;
}

interface PromiseResolver {
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CLIENT_TIMEOUT = parseInt(import.meta.env.VITE_CLIENT_TIMEOUT || "30000");

// Create a shared configuration object
export const apiConfig = new Configuration({
  basePath: BASE_URL,
  baseOptions: {
    withCredentials: false,
  },
});

let refreshing = false;
let promises: PromiseResolver[] = [];

const refreshTokenService = async (
  refresh: string
): Promise<TokenRefreshResponse> => {
  try {
    const response = await refreshToken(refresh);
    return response;
  } catch (error) {
    console.error("Error in refreshToken service:", error);
    throw error;
  }
};

const handleApiError = (error: AxiosError) => {
  if (!error?.response?.data) {
    showGlobalToastError(t("general.generic_error"));
    return;
  }

  const data = error.response.data;

  if (typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const firstValue = (data as Record<string, unknown>)[firstKey];

    if (Array.isArray(firstValue)) {
      const errorMessage = firstValue[0];

      const errorMapping = t("error_mapping", {
        returnObjects: true,
      }) as Record<string, string>;

      if (errorMessage.includes(Object.keys(errorMapping))) {
        showGlobalToastError(t("error_mapping." + Object.keys(errorMapping)));
      } else {
        showGlobalToastError(errorMessage);
      }
    } else if (typeof firstValue === "string") {
      showGlobalToastError(firstValue);
    } else {
      showGlobalToastError(t("general.generic_error"));
    }
  } else if (typeof data === "string") {
    showGlobalToastError(data);
  } else {
    showGlobalToastError(t("general.generic_error"));
  }
};

export class Request {
  key: string;
  token: string;
  refreshToken: string;
  axios: AxiosInstance;

  constructor(config: AxiosRequestConfig, key = AUTH) {
    this.key = key;
    this.token = "";
    this.refreshToken = "";

    const dataInfo = getItem(key);
    if (dataInfo) {
      const token = JSON.parse(dataInfo);
      this.token = token.accessToken;
      this.refreshToken = token.refreshToken;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept-Language": i18n.language || "ja",
    };

    if (this.token) {
      Object.assign(headers, {
        Authorization: `Bearer ${this.token}`,
      });
    }

    this.axios = axios.create({
      baseURL: BASE_URL,
      timeout: 15000,
      headers,
      responseType: "json",
      validateStatus: (status) => status >= 200 && status < 300,
      ...config,
    });

    this.axios.interceptors.request.use(async (config) => {
      const url = config.url?.replace(BASE_URL, "");
      if (url === "/api/auth/refresh-token/") {
        return config;
      }

      if (!navigator.onLine) {
        showGlobalToastError(t("general.network_error"));
        return Promise.reject(new Error("NETWORK_ERROR"));
      }

      await this._handleTokenExpiration(config);
      return config;
    });

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.message === "NETWORK_ERROR") {
          return Promise.reject(error);
        }

        const response = error.response;
        const status = response?.status;
        const data = response?.data;
        const errorMessage = data?.error || data?.message;

        if (status === 400 || status === 429) {
          handleApiError(error);
        } else if (status === 403) {
          showGlobalToastError(t("general.forbidden_error"));
        } else if (
          status &&
          status.toString().startsWith("4") &&
          status !== 401
        ) {
          showGlobalToastError(errorMessage || t("general.generic_error"));
        } else if (!response) {
          showGlobalToastError(t("general.generic_error"));
          console.error("An error occurred. Please try again later.");
        }

        return Promise.reject(error);
      }
    );
  }

  setupToken(): void {
    const dataInfo = getItem(this.key);
    if (dataInfo) {
      const token = JSON.parse(dataInfo);
      this.token = token.accessToken;
      this.refreshToken = token.refreshToken;
    }
    if (this.token) {
      this.axios.defaults.headers.common.Authorization = `Bearer ${this.token}`;
      this.axios.defaults.headers.Authorization = `Bearer ${this.token}`;
    }
  }

  setToken(token: string): void {
    this.token = token;
    this.axios.defaults.headers.common.Authorization = `Bearer ${this.token}`;
    this.axios.defaults.headers.Authorization = `Bearer ${this.token}`;
  }

  clearToken(): void {
    this.token = "";
    this.refreshToken = "";
    delete this.axios.defaults.headers.common.Authorization;
    delete this.axios.defaults.headers.Authorization;
    removeItem(this.key);

    store.dispatch(logout());
  }

  updateLanguageHeader(): void {
    this.axios.defaults.headers.common["Accept-Language"] =
      i18n.language || "ja";
    this.axios.defaults.headers["Accept-Language"] = i18n.language || "ja";
  }

  _onError = (error: AxiosError): never => {
    if (error.response) {
      throw error.response;
    } else if (error.request) {
      throw error.request;
    } else {
      throw error;
    }
  };

  _onSuccess = <T>(res: AxiosResponse<T>): AxiosResponse<T> => {
    return res;
  };

  _mapConfig = (config: AxiosRequestHeaders): AxiosRequestHeaders => {
    if (config.ignoreAuth) {
      config.validateStatus = (status: number) => {
        return status >= 200 && status < 300; // default
      };
    }
    return config;
  };

  async makeGet<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestHeaders
  ): Promise<AxiosResponse<T>> {
    let _config = {};

    if (config) {
      _config = this._mapConfig(config) as AxiosRequestConfig;
    }

    Object.assign(_config, { ...(params && { params }) });

    this.setupToken();
    try {
      const res = await this.axios.get<T>(url, _config);
      return this._onSuccess(res);
    } catch (error) {
      return this._onError(error as AxiosError);
    }
  }

  async makePost<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestHeaders
  ): Promise<AxiosResponse<T>> {
    let _config = {};

    if (config) {
      _config = this._mapConfig(config) as AxiosRequestConfig;
    }
    this.setupToken();

    try {
      const res = await this.axios.post<T>(url, data, _config);
      return this._onSuccess(res);
    } catch (error) {
      return this._onError(error as AxiosError);
    }
  }

  async makeDelete<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestHeaders
  ): Promise<AxiosResponse<T>> {
    let _config = {};

    if (config) {
      _config = this._mapConfig(config) as AxiosRequestConfig;
    }

    Object.assign(_config, { ...(data && { data: { ...data } }) });
    this.setupToken();

    try {
      const res = await this.axios.delete<T>(url, _config);
      return this._onSuccess(res);
    } catch (error) {
      return this._onError(error as AxiosError);
    }
  }

  async makePut<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestHeaders
  ): Promise<AxiosResponse<T>> {
    const _config = {};

    Object.assign(_config, {
      headers: {
        ...config,
      },
    });
    this.setupToken();

    try {
      const res = await this.axios.put<T>(url, data, _config);
      return this._onSuccess(res);
    } catch (error) {
      return this._onError(error as AxiosError);
    }
  }

  async _handleTokenExpiration(
    config: AxiosRequestConfig
  ): Promise<AxiosRequestConfig> {
    if (this.token) {
      try {
        const decoded = jwtDecode<DecodedToken>(this.token);
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp - currentTime < 60) {
          // Check rememberMe from authSlice before refreshing token
          const state = store.getState();
          const rememberMe = state.auth.rememberMe;

          if (!rememberMe) {
            // If rememberMe is false, logout user instead of refreshing token
            this.clearToken();
            throw new Error("Token expired and auto-refresh disabled");
          }

          try {
            this.setupToken();
            const newToken = await this._refreshToken();
            this.setupToken();
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${newToken}`;
          } catch (error) {
            console.error("Failed to refresh token", error);
            this.clearToken();
            throw error;
          }
        }
      } catch (error) {
        console.error("Error decoding token", error);
      }
    }

    return config;
  }

  async _refreshToken(): Promise<string> {
    if (!refreshing) {
      refreshing = true;

      try {
        if (!this.refreshToken) {
          store.dispatch(logout());
          throw new Error("No refresh token found");
        }
        const res = await refreshTokenService(this.refreshToken);

        store.dispatch(
          updateTokens({
            accessToken: res.access,
            refreshToken: res.refresh || undefined,
          })
        );

        for (const promise of promises) {
          promise.resolve(res.access);
        }

        return res.access;
      } catch (error) {
        for (const promise of promises) {
          promise.reject(error);
        }
        console.error("Error refreshing token", error);
        throw error;
      } finally {
        promises = [];
        refreshing = false;
      }
    } else {
      return new Promise<string>((resolve, reject) => {
        promises.push({
          resolve,
          reject,
        });
      });
    }
  }
}

const request = new Request({ timeout: CLIENT_TIMEOUT });

// Export method to update language header
export const updateRequestLanguageHeader = () => {
  request.updateLanguageHeader();
};

export default request;
