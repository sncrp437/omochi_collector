import "@/pages/auth/auth.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Button, Typography } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useTranslation } from "react-i18next";
import PasswordInput from "@/components/common/form/PasswordInput";
import {
  getCurrentPasswordRules,
  getNewPasswordRules,
  getConfirmPasswordRules,
  makeNewPasswordDifferentValidator,
  makeConfirmPasswordMatchValidator,
} from "@/rules/auth";
import { MAX_LENGTH_PASSWORD, ROUTE_PATH } from "@/utils/constants";
import ConfirmSaveInfoModal from "@/components/common/ConfirmSaveInfoModal";
import { deepTrimStrings } from "@/utils/helper";
import { toast } from "react-toastify";
import { updatePassword } from "@/api/auth";

const { Text } = Typography;

type PasswordFormValues = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const UserChangePasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [openModalConfirm, setOpenModalConfirm] = useState(false);

  const handleCheckShowModal = async () => {
    // Prevent spam clicking
    if (loading) return;

    const rawValues = form.getFieldsValue();
    const trimmedValues = deepTrimStrings(rawValues);

    form.setFieldsValue(trimmedValues);

    try {
      await form.validateFields();
      setOpenModalConfirm(true);
    } catch (err) {
      console.error("Validation failed:", err);
    }
  };

  const handleCloseModal = () => {
    setOpenModalConfirm(false);
  };

  const handleChangePassword = async (values: PasswordFormValues) => {
    try {
      setLoading(true);

      const passwordChangeRequest = {
        current_password: values.current_password,
        new_password: values.new_password,
      };

      await updatePassword(passwordChangeRequest);
      toast.success(t("setting.update_password_success"));
      form.resetFields();
    } catch (err) {
      console.error("Change Password error:", err);
    } finally {
      handleCloseModal();
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-5">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("setting.change_password_label")}
          onBack={() =>
            navigate(
              `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.SETTINGS}`
            )
          }
        />

        {/* Form Container */}
        <div className="!w-full !px-6 !flex !flex-col !gap-6 !mt-4 h-full flex-1">
          {/* Input Fields */}
          <Form
            form={form}
            name="changePassword"
            onFinish={handleCheckShowModal}
            layout="vertical"
            requiredMark={false}
            className="!w-full !flex !flex-col !gap-6 !relative !flex-1"
          >
            <div className="!w-full flex-1 !flex !flex-col !gap-6 scrollbar-hidden scroll-smooth h-full pb-[60px]">
              {/* Current Password */}
              <div className="!flex !flex-col !gap-2">
                <Text className="text-xs-white !font-bold">
                  {t("setting.current_password_label")}
                </Text>
                <Form.Item
                  name="current_password"
                  rules={getCurrentPasswordRules()}
                  className="form-item-error-explanation"
                >
                  <PasswordInput
                    placeholder={t("setting.current_password_label")}
                    size="large"
                    disabled={loading}
                    className="based-input-text ![&_.ant-input-password-icon]:!text-white"
                  />
                </Form.Item>
              </div>

              {/* New Password */}
              <div className="!flex !flex-col !gap-2">
                <Text className="text-xs-white !font-bold">
                  {t("setting.new_password_label")}
                </Text>
                <Form.Item
                  name="new_password"
                  rules={[
                    ...getNewPasswordRules(),
                    ({ getFieldValue }) => ({
                      validator: makeNewPasswordDifferentValidator(() =>
                        getFieldValue("current_password")
                      ),
                    }),
                  ]}
                  className="form-item-error-explanation"
                >
                  <PasswordInput
                    placeholder={t("setting.new_password_label")}
                    size="large"
                    disabled={loading}
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
                    disabled={loading}
                    maxLength={MAX_LENGTH_PASSWORD}
                    className="based-input-text ![&_.ant-input-password-icon]:!text-white"
                  />
                </Form.Item>
              </div>
            </div>

            {/* Submit Button */}
            <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-6 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)]">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={loading}
                className="!w-full !outline-none !border-none !h-10 !min-h-10 !max-h-10 !py-3 !px-6 !bg-[var(--primary-color)] !border-[var(--primary-color)] !rounded-[12px] !font-bold !text-white !text-[14px] !flex !items-center !justify-center"
                onClick={handleCheckShowModal}
              >
                <span className="text-sm-white !font-bold">
                  {t("setting.edit_profile_label")}
                </span>
              </Button>
            </div>
          </Form>
        </div>
      </div>

      <ConfirmSaveInfoModal
        isOpen={openModalConfirm}
        onClose={handleCloseModal}
        handleConfirm={() => handleChangePassword(form.getFieldsValue())}
        loading={loading}
      />
    </>
  );
};

export default UserChangePasswordPage;
