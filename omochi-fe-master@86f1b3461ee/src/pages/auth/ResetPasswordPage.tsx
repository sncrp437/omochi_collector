import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spin, Typography } from "antd";
import {
  getConfirmPasswordRules,
  getNewPasswordRules,
  makeConfirmPasswordMatchValidator,
} from "@/rules/auth";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import PasswordInput from "@/components/common/form/PasswordInput";
import {
  MAX_LENGTH_PASSWORD,
  ROUTE_PATH,
  USER_ROLE,
  VENUE_ROLE,
} from "@/utils/constants";
import { useLocation, useNavigate } from "react-router-dom";
import NotFoundPage from "@/pages/NotFoundPage";
import { isEmpty } from "@/utils/helper";
import { resetPasswordConfirm } from "@/api/auth";
import UpdatePasswordSuccessful from "@/components/UpdatePasswordSuccessful";
import { toast } from "react-toastify";

const { Text } = Typography;

const ResetPasswordPage = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const urlSearch = new URLSearchParams(location.search);
  const tokenResetPassword = urlSearch.get("token") || "";
  // check role to redirect to login page
  const role =
    (urlSearch.get("role") as typeof USER_ROLE | typeof VENUE_ROLE) ||
    USER_ROLE;

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);

  // handle reset password
  const handleResetPassword = useCallback(async () => {
    // Prevent spam clicking
    if (submitting) return;
    try {
      setSubmitting(true);

      await form.validateFields();
      const newPassword = form.getFieldValue("new_password");
      // reset password confirm
      await resetPasswordConfirm(tokenResetPassword, newPassword);
      toast.success(t("setting.update_password_success"));

      // reset form and set success state
      setResetPasswordSuccess(true);
      form.resetFields();
    } catch (error) {
      console.error("Error resetting password", error);
      setResetPasswordSuccess(false);
    } finally {
      setSubmitting(false);
    }
  }, [form, submitting, t, tokenResetPassword]);

  if (isEmpty(tokenResetPassword)) {
    return <NotFoundPage hiddenBackButton />;
  }

  if (resetPasswordSuccess) {
    return (
      <UpdatePasswordSuccessful
        onButtonClick={() =>
          navigate(
            `/${
              role === USER_ROLE
                ? ROUTE_PATH.USER.LOGIN
                : ROUTE_PATH.VENUE.LOGIN
            }`
          )
        }
      />
    );
  }

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
          hiddenBackButton
        />
        <div className="relative flex flex-col gap-6 w-full px-6 mt-4 flex-1 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth pb-[45px]">
          <Form
            form={form}
            name="resetPassword"
            layout="vertical"
            onFinish={handleResetPassword}
            requiredMark={false}
            className="!w-full !flex !flex-col !gap-6 !relative !flex-1"
          >
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("setting.new_password_label")}
              </Text>
              <Form.Item
                name="new_password"
                rules={[...getNewPasswordRules()]}
                className="form-item-error-explanation"
              >
                <PasswordInput
                  placeholder={t("setting.new_password_label")}
                  size="large"
                  disabled={submitting}
                  maxLength={MAX_LENGTH_PASSWORD}
                  className="based-input-text ![&_.ant-input-password-icon]:!text-white"
                />
              </Form.Item>
            </div>

            {/* Confirm Password */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("setting.confirm_password_label")}
              </Text>
              <Form.Item
                name="confirm_password"
                rules={[
                  ...getConfirmPasswordRules(),
                  ({ getFieldValue }) => ({
                    validator: makeConfirmPasswordMatchValidator(() =>
                      getFieldValue("new_password")
                    ),
                  }),
                ]}
                className="form-item-error-explanation"
              >
                <PasswordInput
                  placeholder={t("setting.confirm_password_label")}
                  size="large"
                  disabled={submitting}
                  maxLength={MAX_LENGTH_PASSWORD}
                  className="based-input-text ![&_.ant-input-password-icon]:!text-white"
                />
              </Form.Item>
            </div>
          </Form>
        </div>
        <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            type="text"
            className="!w-full !border-none !h-10 !max-h-10 !min-h-10 !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none !bg-[var(--primary-color)] !text-white"
            style={{ height: "unset" }}
            disabled={submitting}
            loading={submitting}
            onClick={handleResetPassword}
          >
            <Text className="text-sm-white">{t("general.edit_label")}</Text>
          </Button>
        </div>
      </div>
    </Spin>
  );
};

export default ResetPasswordPage;
