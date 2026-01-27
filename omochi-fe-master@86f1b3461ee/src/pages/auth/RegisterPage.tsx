import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Form, Button, Typography } from "antd";
import "./auth.css";
import TextInput from "../../components/common/form/TextInput";
import PasswordInput from "../../components/common/form/PasswordInput";
import SelectInput from "../../components/common/form/SelectInput";
import {
  getNameRules,
  getEmailRules,
  getPhoneRules,
  getPasswordRules,
  getPrefectureRules,
  getCityRules,
  getAddressRules,
} from "../../rules/auth";
import { MAX_LENGTH_PASSWORD, ROUTE_PATH } from "@/utils/constants";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { registerUser } from "../../api/auth";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { deepTrimStrings, formatChangePhoneNumberJP } from "@/utils/helper";
import { selectLatestRefGlobally } from "@/store/slices/refSlice";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrefectureOptions } from "@/hooks/usePrefectureOptions";

const { Text } = Typography;

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const location = useLocation();
  const refState = useSelector((state: RootState) => state.ref);

  // Dynamic prefecture options that update with language changes
  const { prefectureOptions } = usePrefectureOptions();
  const urlSearch = new URLSearchParams(location.search);
  const redirectUri = urlSearch.get("redirect_uri") || "";
  const refCode = urlSearch.get("ref") || "";
  const redirectUriChecked =
    redirectUri && refCode
      ? `/?redirect_uri=${encodeURIComponent(redirectUri)}&ref=${refCode}`
      : redirectUri
      ? `/?redirect_uri=${encodeURIComponent(redirectUri)}`
      : refCode
      ? `/?ref=${refCode}`
      : "";

  const handleRegister = async () => {
    setLoading(true);
    const rawValues = form.getFieldsValue();
    const trimmedValues = deepTrimStrings(rawValues);
    form.setFieldsValue(trimmedValues);

    try {
      await form.validateFields();
      const refCodeValid =
        refCode ||
        selectLatestRefGlobally({ ref: refState })?.refCode ||
        undefined;

      const formattedValues = {
        first_name: trimmedValues.name,
        last_name: "",
        email: trimmedValues.email,
        phone_number: trimmedValues.phone_number.replace(/-/g, ""),
        password: trimmedValues.password,
        password_confirm: trimmedValues.password,
        address: {
          prefecture: trimmedValues.prefecture,
          city: trimmedValues.city,
          detail: trimmedValues.address_detail,
        },
        ref_code: refCodeValid,
      };

      await registerUser(formattedValues);
      toast.success(t("auth.register.register_success"));
      navigate(`/${ROUTE_PATH.USER.LOGIN}${redirectUriChecked}`);
    } catch (err) {
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="!flex !flex-col !items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <TopNavigationBar
        title={t("auth.register.title")}
        onBack={() =>
          navigate(`/${ROUTE_PATH.USER.LOGIN}${redirectUriChecked}`)
        }
      />

      {/* Form Container */}
      <div className="!w-full !px-6 !flex !flex-col !gap-6 !mt-4 !flex-1 scroll-hidden overflow-y-auto scroll-smooth">
        {/* Input Fields */}
        <Form
          form={form}
          name="register"
          onFinish={handleRegister}
          layout="vertical"
          requiredMark={false}
          className="!w-full !flex !flex-col !gap-6"
        >
          <div className="!w-full !flex !flex-col !gap-6">
            {/* Name */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("auth.register.name")}
              </Text>
              <Form.Item
                name="name"
                rules={getNameRules()}
                className="form-item-error-explanation"
              >
                <TextInput
                  placeholder={t("auth.register.name_placeholder")}
                  size="large"
                  disabled={loading}
                  maxLength={100}
                  className="based-input-text"
                />
              </Form.Item>
            </div>

            {/* Address */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("auth.register.address")}
              </Text>
              <Form.Item
                name="prefecture"
                rules={getPrefectureRules()}
                className="!m-0 [&_.ant-form-item-explain-error]:!text-[12px] !important [&_.ant-form-item-explain-error]:!mt-2 [&_.ant-form-item-explain]:!mt-1"
              >
                <SelectInput
                  placeholder={t("auth.register.prefecture_placeholder")}
                  size="large"
                  disabled={loading}
                  options={prefectureOptions}
                  className="!text-white placeholder-fix !h-[48px]"
                  popupClassName="!bg-[var(--background-color)]"
                  style={{ width: "100%", font: "inherit" }}
                  rootClassName="custom-select [&_.ant-select-selector]:!px-[11px]"
                  showSearch
                />
              </Form.Item>
              <Form.Item
                name="city"
                rules={getCityRules()}
                className="form-item-error-explanation"
              >
                <TextInput
                  placeholder={t("auth.register.city_placeholder")}
                  size="large"
                  maxLength={100}
                  disabled={loading}
                  className="based-input-text"
                />
              </Form.Item>
              <Form.Item
                name="address_detail"
                rules={getAddressRules()}
                className="form-item-error-explanation"
              >
                <TextInput
                  placeholder={t("auth.register.address_placeholder")}
                  size="large"
                  disabled={loading}
                  maxLength={255}
                  className="based-input-text"
                />
              </Form.Item>
            </div>

            {/* Email */}
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
                  disabled={loading}
                  className="based-input-text"
                />
              </Form.Item>
            </div>

            {/* Phone Number */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("auth.register.phone")}
              </Text>
              <Form.Item
                name="phone_number"
                rules={getPhoneRules()}
                className="form-item-error-explanation"
              >
                <TextInput
                  placeholder={t("auth.register.phone_placeholder")}
                  size="large"
                  maxLength={13}
                  disabled={loading}
                  inputMode="decimal"
                  className="based-input-text"
                  onChange={(value) => {
                    const digits = value.replace(/\D/g, "");

                    if (digits.length > 11) return digits;

                    const formatted = formatChangePhoneNumberJP(digits);
                    form.setFieldValue("phone_number", formatted);
                    form.validateFields(["phone_number"]);
                  }}
                />
              </Form.Item>
            </div>

            {/* Password */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("auth.register.password")}
              </Text>
              <Form.Item
                name="password"
                rules={getPasswordRules()}
                className="form-item-error-explanation"
              >
                <PasswordInput
                  placeholder={t("auth.register.password_placeholder")}
                  size="large"
                  maxLength={MAX_LENGTH_PASSWORD}
                  disabled={loading}
                  className="based-input-text ![&_.ant-input-password-icon]:!text-white"
                />
              </Form.Item>
            </div>
          </div>

          {/* Submit Button */}
          <div className="!flex !justify-center !mt-4">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="!w-full !outline-none !h-auto !py-3 !px-6 !bg-[var(--primary-color)] !border-[var(--primary-color)] !rounded-[12px] !font-bold !text-white !text-[14px] !flex !items-center !justify-center"
            >
              <span className="!font-['Noto_Sans_JP']">
                {t("auth.register.submit")}
              </span>
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default RegisterPage;
