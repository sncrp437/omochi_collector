/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Button, Typography } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/common/form/TextInput";
import SelectInput from "@/components/common/form/SelectInput";
import {
  getNameRules,
  getEmailRules,
  getPhoneRules,
  getPrefectureRules,
  getCityRules,
  getAddressRules,
} from "@/rules/auth";
import { ROUTE_PATH, VENUE_ROLE, USER_ROLE } from "@/utils/constants";
import { usePrefectureOptions } from "@/hooks/usePrefectureOptions";
import ConfirmSaveInfoModal from "@/components/common/ConfirmSaveInfoModal";
import "@/pages/auth/auth.css";
import { RootState } from "@/store";
import { useSelector, useDispatch } from "react-redux";
import {
  deepTrimStrings,
  formatPhoneNumberJP,
  formatChangePhoneNumberJP,
} from "@/utils/helper";
import { getMe, updateProfile, updateAddress } from "@/api/auth";
import { toast } from "react-toastify";
import { setUser } from "@/store/slices/authSlice";

const { Text } = Typography;

type UserFormValues = {
  name: string;
  email: string;
  phone_number: string;
  prefecture: string;
  city: string;
  address_detail: string;
};

const UserProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { user } = useSelector((state: RootState) => state.auth);

  // Dynamic prefecture options that update with language changes
  const { prefectureOptions } = usePrefectureOptions();

  useEffect(() => {
    if (user) {
      const trimmedUser = deepTrimStrings(user);

      form.setFieldsValue({
        name: trimmedUser.first_name,
        email: trimmedUser.email,
        phone_number: formatPhoneNumberJP(trimmedUser.phone_number || ""),
        prefecture: trimmedUser.addresses?.[0]?.prefecture || "",
        city: trimmedUser.addresses?.[0]?.city || "",
        address_detail: trimmedUser.addresses?.[0]?.detail || "",
      });
    }
  }, [user, form]);

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

  const fetchUserProfile = async () => {
    try {
      const meResult = await getMe();
      const userWithRole = {
        ...meResult,
        role: meResult.venue_roles.length > 0 ? VENUE_ROLE : USER_ROLE,
      };
      const trimmedUser = deepTrimStrings(userWithRole);
      dispatch(setUser(trimmedUser));
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const handleEditProfile = async (values: UserFormValues) => {
    try {
      setLoading(true);
      const formattedValues = deepTrimStrings({
        first_name: values.name,
        last_name: user?.last_name || "",
        email: values.email,
        phone_number: values.phone_number?.replace(/-/g, ""),
      });

      const defaultAddress = user?.addresses?.[0];
      const addressValues = deepTrimStrings({
        prefecture: values.prefecture,
        city: values.city,
        detail: values.address_detail,
        is_default: defaultAddress?.is_default || true,
      });

      const [profileResult, addressResult] = await Promise.allSettled([
        updateProfile(formattedValues),
        updateAddress(defaultAddress?.id as any, addressValues),
      ]);
      if (
        profileResult.status === "fulfilled" &&
        addressResult.status === "fulfilled"
      ) {
        toast.success(t("general.updated_profile_success"));
      }
    } catch (err) {
      console.error("Edit Profile error:", err);
    } finally {
      await fetchUserProfile();
      handleCloseModal();
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-5">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("setting.general_label")}
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
            name="register"
            onFinish={handleCheckShowModal}
            layout="vertical"
            requiredMark={false}
            className="!w-full !flex !flex-col !gap-6 !relative !flex-1"
          >
            <div className="!w-full flex-1 !flex !flex-col !gap-6 scrollbar-hidden scroll-smooth h-full pb-[60px]">
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
                  className="form-item-error-explanation"
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
                    className="based-input-text"
                    readOnly
                    disabled
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
        handleConfirm={() => handleEditProfile(form.getFieldsValue())}
        loading={loading}
      />
    </>
  );
};

export default UserProfilePage;
