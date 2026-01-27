import { useCallback, useEffect, useState } from "react";
import { ROUTE_PATH } from "@/utils/constants";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Typography, Spin } from "antd";
import { getEmailRules } from "@/rules/auth";
import StepResetPassword from "@/components/StepResetPassword";
import TextInput from "@/components/common/form/TextInput";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { requestPasswordReset } from "@/api/auth";
import { toast } from "react-toastify";

const { Text } = Typography;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const urlSearch = new URLSearchParams(location.search);
  const redirectUri = urlSearch.get("redirect_uri") || "";
  const refCode = urlSearch.get("ref") || "";
  const fromParam = urlSearch.get("from") || "";
  
  // Get the source page from query parameter (persists across page reload)
  // Default to user login if not provided
  const getFromPage = () => {
    if (fromParam === "login-venue") {
      return `/${ROUTE_PATH.VENUE.LOGIN}`;
    }
    // Default to user login
    return `/${ROUTE_PATH.USER.LOGIN}`;
  };
  const fromPage = getFromPage();

  const redirectUriChecked =
    redirectUri && refCode
      ? `/?redirect_uri=${encodeURIComponent(redirectUri)}&ref=${refCode}`
      : redirectUri
      ? `/?redirect_uri=${encodeURIComponent(redirectUri)}`
      : refCode
      ? `/?ref=${refCode}`
      : "";

  const handleSendMail = useCallback(async () => {
    // Prevent spam clicking and enforce cooldown
    if (submitting || isCooldown) return;

    setSubmitting(true);
    try {
      await form.validateFields();
      const email = form.getFieldValue("email");
      await requestPasswordReset(email);
      toast.success(t("auth.forgot_password.send_mail_success"));

      // Start cooldown after successful request
      setIsCooldown(true);
      setCooldownSeconds(60);
    } catch (error) {
      console.error("Error sending mail", error);
      setIsCooldown(false);
      setCooldownSeconds(0);
    } finally {
      setSubmitting(false);
    }
  }, [form, submitting, isCooldown, t]);

  useEffect(() => {
    if (!isCooldown) return;

    const intervalId = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          setIsCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
      // Reset state when unmount to avoid state inconsistency
      setCooldownSeconds(0);
      setIsCooldown(false);
    };
  }, [isCooldown]);

  return (
    <Spin
      spinning={submitting}
      size="large"
      className="!w-full !h-full [&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
      wrapperClassName="[&_.ant-spin]:!max-h-[100%]"
    >
      <div className="!flex !flex-col !items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("setting.change_password_label")}
          onBack={() =>
            navigate(`${fromPage}${redirectUriChecked}`)
          }
        />
        <div className="relative flex flex-col gap-6 w-full px-6 mt-4 flex-1 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth pb-[45px]">
          <StepResetPassword />
          <Form
            form={form}
            name="forgotPassword"
            onFinish={handleSendMail}
            layout="vertical"
          >
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("auth.register.email")}
              </Text>
              <Form.Item
                name="email"
                rules={getEmailRules()}
                className="form-item-error-explanation"
              >
                <TextInput
                  placeholder={t("auth.register.email_placeholder")}
                  size="large"
                  maxLength={100}
                  disabled={submitting || isCooldown}
                  className="based-input-text"
                />
              </Form.Item>
              <Text className="!text-xs !text-[var(--breadcrumb-color)] font-family-base !leading-[1.2em]">
                {t("auth.forgot_password.notice_email_label")}
              </Text>
            </div>
          </Form>
        </div>
        <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            type="text"
            className={`!w-full !border-none !h-10 !max-h-10 !min-h-10 !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none !text-white
              ${isCooldown ? "button-disabled" : "!bg-[var(--primary-color)]"}
            `}
            style={{ height: "unset" }}
            disabled={submitting || isCooldown}
            loading={submitting}
            onClick={handleSendMail}
          >
            <Text className="text-sm-white">
              {t("auth.forgot_password.send_mail_label")}
              {isCooldown ? `(${cooldownSeconds}s)` : ""}
            </Text>
          </Button>
        </div>
      </div>
    </Spin>
  );
};

export default ForgotPasswordPage;
