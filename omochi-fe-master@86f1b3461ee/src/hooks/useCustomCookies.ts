import { useCookies } from "react-cookie";
import { COOKIE_EXPIRY_DURATION_MS } from "@/utils/constants";

interface CookieSetOptions {
  path?: string;
  expires?: Date;
  maxAge?: number;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
}

interface CustomCookieSetOptions extends Omit<CookieSetOptions, "maxAge"> {
  maxAge?: number;
}

type SetCookieFunction = (
  name: string,
  value: string,
  options?: CustomCookieSetOptions
) => void;

type RemoveCookieFunction = (name: string, options?: CookieSetOptions) => void;

export const useCustomCookies = (
  dependencies?: string[]
): [Record<string, string>, SetCookieFunction, RemoveCookieFunction] => {
  const [cookies, setCookie, removeCookie] = useCookies(dependencies);

  const setCustomCookie: SetCookieFunction = (name, value, options = {}) => {
    const defaultOptions: CookieSetOptions = {
      maxAge: COOKIE_EXPIRY_DURATION_MS,
      path: "/",
      ...options,
    };

    setCookie(name, value, defaultOptions);
  };

  return [cookies, setCustomCookie, removeCookie];
};
