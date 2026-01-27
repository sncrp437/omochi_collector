import { Rule, RuleObject } from "antd/es/form";
import i18n from "../i18n/locales";
import { parseYen } from "@/utils/helper";
import { OptionType } from "@/types/common";

export const priceValidator = (_: RuleObject, value: string) => {
  if (value === undefined || value === null || value === "") {
    return Promise.resolve();
  }
  const raw = parseYen(value);
  const numberValue = Number(raw);

  if (!/^[0-9]+$/.test(raw)) {
    return Promise.reject(
      i18n.t("validation.menu_item.eat_in_price.invalid_format")
    );
  }

  if (numberValue < 0) {
    return Promise.reject(
      i18n.t("validation.menu_item.eat_in_price.invalid_range")
    );
  }

  return Promise.resolve();
};

export const getCategoryValidator = (menuCategories: OptionType[]) => {
  return (_: RuleObject, value: string) => {
    if (!value) {
      return Promise.resolve();
    }
    const validValues = menuCategories.map((opt) => opt.value);
    if (!validValues.includes(value)) {
      return Promise.reject(
        i18n.t("validation.menu_item.category.invalid_value")
      );
    }
    return Promise.resolve();
  };
};

export const getNameRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.menu_item.name.required"),
  },
];

export const getDescriptionRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.menu_item.description.required"),
  },
];

export const getCategoryRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.menu_item.category.required"),
  },
];

export const getEatInRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.menu_item.eat_in_price.required"),
  },
  {
    validator: priceValidator,
  },
];

export const getTakeOutRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.menu_item.take_out_price.required"),
  },
  {
    validator: priceValidator,
  },
];
