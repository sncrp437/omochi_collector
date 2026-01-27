import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Form, Button, Typography } from "antd";
import { login } from "../../store/slices/authSlice";
import { loginUser, updatePreferredLanguage } from "../../api/auth";
import "./auth.css";
import FooterLinks from "../../components/FooterLinks";
import LogoAndTagline from "../../components/LogoAndTagline";
import TextInput from "../../components/common/form/TextInput";
import PasswordInput from "../../components/common/form/PasswordInput";
import { getEmailRules, getPasswordRules } from "../../rules/auth";
import { ROUTE_PATH, USER_ROLE, VENUE_ROLE } from "../../utils/constants";
import request from "../../utils/request";
import { isUnauthorizedError, isNetworkError } from "../../utils/error";
import { useTranslation } from "react-i18next";
import { createRefLog } from "@/api/ref-logs";
import { selectAllVenues, clearAllRefs } from "../../store/slices/refSlice";
import { showGlobalToastError } from "@/utils/toastError";
import { useCookies } from "react-cookie";
import RememberMeCheckbox from "@/components/common/form/RememberMeCheckbox";
import { RootState } from "@/store";
import LanguageToggle from "@/components/common/language/LanguageToggle";
import { PreferredLanguageEnum } from "@/generated/api";
import { useLanguage } from "@/hooks/useLanguage";

const { Text } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const refVenues = useSelector(selectAllVenues);
  const rememberMe =
    useSelector((state: RootState) => state.auth.rememberMe) || false;
  const [cookies] = useCookies(["is-first-visit"]);
  const urlSearch = new URLSearchParams(location.search);
  const redirectUri = urlSearch.get("redirect_uri") || "";
  const refCode = urlSearch.get("ref") || "";

  // Helper function to build URL with query parameters
  const buildUrlWithParams = (
    basePath: string,
    params: Record<string, string>
  ): string => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, value);
      }
    });
    const queryString = urlParams.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  // Build forgot password URL with all necessary params
  const forgotPasswordUrl = buildUrlWithParams(
    `/${ROUTE_PATH.AUTH.FORGOT_PASSWORD}`,
    {
      redirect_uri: redirectUri,
      ref: refCode,
      from: "login-user",
    }
  );

  // Build redirect URI for other links (backward compatible format)
  const redirectUriChecked =
    redirectUri && refCode
      ? `/?redirect_uri=${encodeURIComponent(redirectUri)}&ref=${refCode}`
      : redirectUri
      ? `/?redirect_uri=${encodeURIComponent(redirectUri)}`
      : refCode
      ? `/?ref=${refCode}`
      : "";

  const getPostLoginRedirect = (
    redirectUri: string,
    refCode: string,
    isFirstVisit: boolean
  ): string => {
    const DASHBOARD = `/${ROUTE_PATH.USER.DASHBOARD}`;
    const USER_GUIDE = `/${ROUTE_PATH.POLICY.ROOT_POLICY}/${ROUTE_PATH.POLICY.MANUAL}`;

    if (!redirectUri) return DASHBOARD;

    const decoded = decodeURIComponent(redirectUri);
    const separator = decoded.includes("?") ? "&" : "?";
    const uriWithRef = refCode
      ? `${decoded}${separator}ref=${refCode}`
      : decoded;

    return !isFirstVisit
      ? `${USER_GUIDE}?redirect_uri=${encodeURIComponent(uriWithRef)}`
      : uriWithRef;
  };

  const handleLogin = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setLoading(true);

    try {
      const response = await loginUser(email?.trim(), password?.trim());

      if (response && response.user) {
        const user = {
          ...response.user,
          role: response.user.venue_roles.length > 0 ? VENUE_ROLE : USER_ROLE,
        };
        request.setToken(response.access);
        dispatch(
          login({
            user: user,
            accessToken: response.access,
            refreshToken: response.refresh,
            rememberMe,
          })
        );

        // Update preferred language after successful login
        try {
          const preferredLanguage =
            currentLanguage === "ja"
              ? PreferredLanguageEnum.Ja
              : PreferredLanguageEnum.En;
          await updatePreferredLanguage(preferredLanguage);
        } catch (error) {
          console.error("Error updating preferred language:", error);
        }

        // Get all venue-refCode pairs from refSlice
        const hasRefData = Object.keys(refVenues).length > 0;

        if (hasRefData) {
          const refLogPromises: Promise<unknown>[] = [];
          Object.entries(refVenues).forEach(([venueId, refItems]) => {
            refItems.forEach((refItem) => {
              refLogPromises.push(
                createRefLog({
                  venue_id: venueId,
                  ref_code: refItem.refCode,
                }).catch((error) => {
                  console.error(
                    `Error creating ref log for venue ${venueId}, ref ${refItem.refCode}:`,
                    error
                  );
                  return { error, venueId, refCode: refItem.refCode };
                })
              );
            });
          });

          // Call all ref log APIs in parallel
          try {
            await Promise.allSettled(refLogPromises);
            dispatch(clearAllRefs());
          } catch (error) {
            console.error("Error processing ref logs:", error);
          }
        }

        // Determine redirect destination - check is-first-visit for redirectUri flow
        const redirectTo = getPostLoginRedirect(
          redirectUri,
          refCode,
          Boolean(cookies["is-first-visit"])
        );

        navigate(redirectTo);
      } else {
        showGlobalToastError(t("auth.login.error"));
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        showGlobalToastError(t("auth.login.error_401"));
      } else if (!isNetworkError(err)) {
        console.error("Login error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="!flex !flex-col !items-center !justify-between !min-h-[100dvh] !bg-[var(--background-color)] !w-full !py-4">
      <div className="!flex !flex-col !items-center !w-full !gap-12">
        <div className="flex-col-center gap-3">
          {/* Logo and Tagline */}
          <LogoAndTagline />

          {/* Language Toggle */}
          <LanguageToggle />
        </div>

        {/* Login Form */}
        <div className="!flex !flex-col !w-full !gap-8 !px-6">
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            requiredMark={false}
            className="!w-full !flex !flex-col !gap-8"
          >
            <div className="!flex !flex-col !gap-2 !w-full">
              <Form.Item
                label={
                  <span className="text-xs-white !font-bold">
                    {t("auth.login.email")}
                  </span>
                }
                name="email"
                rules={getEmailRules()}
                className="form-item-error-explanation"
              >
                <TextInput
                  placeholder={t("auth.login.email_placeholder")}
                  size="large"
                  disabled={loading}
                  className="!text-[14px] !bg-[var(--background-color)] h-[48px] !border-[1px] !border-white !rounded-[12px] !text-white !placeholder:!text-[#666666]  !placeholder:!opacity-100"
                  style={{
                    padding: "12px !important",
                    fontFamily: "Noto Sans JP !important",
                    fontSize: "14px !important",
                  }}
                />
              </Form.Item>
            </div>

            <div className="!flex !flex-col !gap-2 !w-full">
              <Form.Item
                label={
                  <span className="text-xs-white !font-bold">
                    {t("auth.login.password")}
                  </span>
                }
                name="password"
                rules={getPasswordRules()}
                className="form-item-error-explanation"
              >
                <PasswordInput
                  placeholder={t("auth.login.password_placeholder")}
                  size="large"
                  disabled={loading}
                  className="!text-[14px] based-input-text ![&_.ant-input-password-icon]:!text-white"
                  style={{
                    padding: "12px !important",
                    fontFamily: "Noto Sans JP !important",
                    fontSize: "14px !important",
                  }}
                />
              </Form.Item>
            </div>

            <RememberMeCheckbox />

            <div className="!flex !flex-col !gap-3 !mt-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="!w-full !outline-none !h-auto !py-3 !px-6 !bg-[var(--primary-color)] !border-[var(--primary-color)] !rounded-[12px] !font-bold !text-white !text-[14px] !flex !items-center !justify-center"
                style={{
                  fontFamily: "Noto Sans JP !important",
                }}
              >
                {t("auth.login.submit")}
              </Button>

              <div className="flex-col-center !w-full gap-3">
                <Link to={forgotPasswordUrl} className="!no-underline">
                  <Text className="!text-white !text-[12px] !font-normal !hover:!text-white !font-['Noto_Sans_JP'] !border-b !border-white">
                    {t("auth.login.forgot_password_link")}
                  </Text>
                </Link>
                <Link
                  to={`/${ROUTE_PATH.USER.REGISTER}${redirectUriChecked}`}
                  className="!no-underline"
                >
                  <Text className="!text-white !text-[12px] !font-normal !hover:!text-white !font-['Noto_Sans_JP'] !border-b !border-white">
                    {t("auth.login.register_link")}
                  </Text>
                </Link>
              </div>
            </div>
          </Form>
        </div>
      </div>

      {/* Footer Links */}
      <FooterLinks />
    </div>
  );
};

export default LoginPage;
