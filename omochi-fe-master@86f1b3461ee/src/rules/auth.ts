import { Rule } from "antd/es/form";
import i18n from "../i18n/locales";
import { MAX_LENGTH_PASSWORD, MIN_LENGTH_PASSWORD } from "@/utils/constants";

export const getEmailRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.email.required"),
  },
  {
    type: "email",
    message: i18n.t("validation.email.invalid"),
  },
];

export const getPasswordRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.password.required"),
  },
  {
    min: MIN_LENGTH_PASSWORD,
    message: i18n.t("validation.password.min_length"),
  },
];

export const getNameRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.name.required"),
  },
];

export const hasJapaneseValidator = async (_: unknown, value: string) => {
  if (!value) return Promise.resolve();

  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  if (!japaneseRegex.test(value)) {
    return Promise.reject(new Error(i18n.t("validation.japanese.required")));
  }
  return Promise.resolve();
};

export const isJapaneseNameValidator = async (_: unknown, value: string) => {
  if (!value) return Promise.resolve();

  const validCharsRegex =
    /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9\s]+$/;
  if (!validCharsRegex.test(value)) {
    return Promise.reject(
      new Error(i18n.t("validation.japanese.invalid_chars"))
    );
  }
  return Promise.resolve();
};

export const getPhoneRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.phone.required"),
  },
  {
    pattern: /^(\d{2}-\d{4}-\d{4}|\d{3}-\d{4}-\d{4})$/,
    message: i18n.t("validation.phone.invalid_format"),
  },
];

export const getPrefectureRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.address.prefecture"),
  },
];

export const getAddressRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.address.address"),
  },
];

export const getCityRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.address.city"),
  },
];

// Password change validation rules
export const getCurrentPasswordRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("setting.rule.current_password_required"),
  },
];

export const getNewPasswordRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("setting.rule.new_password_required"),
  },
  {
    min: MIN_LENGTH_PASSWORD,
    message: i18n.t("validation.password.min_length"),
  },
  {
    max: MAX_LENGTH_PASSWORD,
    message: i18n.t("validation.password.max_length"),
  },
];

export const getConfirmPasswordRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("setting.rule.confirm_password_required"),
  },
];

// Validator factory: ensure new password differs from current password
// Pass a getter to avoid stale closure values
export const makeNewPasswordDifferentValidator = (
  getCurrentPassword: () => string
) => {
  return async (_: unknown, value: string) => {
    const currentPassword = getCurrentPassword();
    if (value && value === currentPassword) {
      return Promise.reject(
        new Error(i18n.t("setting.rule.new_password_same_as_current"))
      );
    }
    return Promise.resolve();
  };
};

// Validator factory: ensure confirm password matches new password
export const makeConfirmPasswordMatchValidator = (
  getNewPassword: () => string
) => {
  return async (_: unknown, value: string) => {
    const newPassword = getNewPassword();
    if (value && value !== newPassword) {
      return Promise.reject(
        new Error(i18n.t("setting.rule.confirm_password_mismatch"))
      );
    }
    return Promise.resolve();
  };
};
