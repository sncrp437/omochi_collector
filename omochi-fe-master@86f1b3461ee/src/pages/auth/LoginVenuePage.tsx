import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Form, Button, Typography } from "antd";
import { login } from "../../store/slices/authSlice";
import { ROUTE_PATH, USER_ROLE, VENUE_ROLE } from "../../utils/constants";
import { loginVenue, updatePreferredLanguage } from "../../api/auth";
import "./auth.css";
import LogoAndTagline from "../../components/LogoAndTagline";
import TextInput from "../../components/common/form/TextInput";
import PasswordInput from "../../components/common/form/PasswordInput";
import { getEmailRules, getPasswordRules } from "../../rules/auth";
import request from "../../utils/request";
import { isNetworkError, isUnauthorizedError } from "../../utils/error";
import { useTranslation } from "react-i18next";
import { showGlobalToastError } from "@/utils/toastError";
import RememberMeCheckbox from "@/components/common/form/RememberMeCheckbox";
import { RootState } from "@/store";
import { PreferredLanguageEnum } from "@/generated/api";
import { useLanguage } from "@/hooks/useLanguage";

const { Text } = Typography;

const LoginVenuePage = () => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const from = location.state?.from?.pathname || "/";
  const rememberMe =
    useSelector((state: RootState) => state.auth.rememberMe) || false;

  const handleLogin = async (values: { email: string; password: string }) => {
    const { email, password } = values;
    setLoading(true);

    try {
      const response = await loginVenue(email, password);

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

        if (response.user.venue_roles.length > 0) {
          navigate(ROUTE_PATH.VENUE.DASHBOARD);
        } else {
          navigate(from !== "/" ? from : ROUTE_PATH.USER.DASHBOARD);
        }

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
                  <span className="!text-white !text-[12px] !font-bold !font-['Noto_Sans_JP']">
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
                  className="based-input-text"
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
                  <span className="!text-white !text-[12px] !font-bold !font-['Noto_Sans_JP']">
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
                  className="based-input-text ![&_.ant-input-password-icon]:!text-white"
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
                <Link
                  to={`/${ROUTE_PATH.AUTH.FORGOT_PASSWORD}?from=login-venue`}
                  className="!no-underline"
                >
                  <Text className="!text-white !text-[12px] !font-normal !hover:!text-white !font-['Noto_Sans_JP'] !border-b !border-white">
                    {t("auth.login.forgot_password_link")}
                  </Text>
                </Link>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default LoginVenuePage;
