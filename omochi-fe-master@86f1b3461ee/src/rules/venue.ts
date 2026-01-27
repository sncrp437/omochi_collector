/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormInstance, Rule } from "antd/es/form";
import i18n from "../i18n/locales";
import dayjs from "dayjs";

export const getNameVenueRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.venue.name.required"),
  },
];

export const getAddressVenueRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.venue.address.required"),
  },
];

export const getNearestStationVenueRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.venue.nearest_station.required"),
  },
];

export const getOrderTypesVenueRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.venue.order_types.required"),
  },
];

export const getOpeningHoursVenueRules = (): Rule[] => [
  {
    validator: async (_, value: [dayjs.Dayjs, dayjs.Dayjs]) => {
      const [start, end] = value || [];

      if (!start || !end) {
        return Promise.reject(
          i18n.t("validation.venue.opening_hours.required")
        );
      }

      if (!start.isBefore(end)) {
        return Promise.reject(
          i18n.t("validation.venue.opening_hours.invalid_value")
        );
      }

      return Promise.resolve();
    },
  },
];

export const getGenreVenueRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.venue.genre.required"),
  },
];

export const getPaymentMethodsRules = (): Rule[] => [
  {
    required: true,
    message: i18n.t("validation.venue.payment_methods.required"),
  },
];

export const getCapacityRules = (isRequired: boolean = true): Rule[] => [
  {
    required: isRequired,
    message: i18n.t("validation.venue.capacity.required"),
  },
  {
    validator: (_, value) => {
      if (value === undefined || value === null || !value) {
        return Promise.resolve();
      }

      const number = Number(value);

      if (isNaN(number) || !Number.isInteger(number) || number < 0) {
        return Promise.reject(
          i18n.t("validation.venue.capacity.invalid_value")
        );
      }

      return Promise.resolve();
    },
  },
];

export const validateStartTime =
  (form: FormInstance) => (_: any, value: dayjs.Dayjs) => {
    const endTime: dayjs.Dayjs = form.getFieldValue("endTime");
    if (!value || !endTime) return Promise.resolve();

    if (value.valueOf() >= endTime.valueOf()) {
      return Promise.reject(i18n.t("general.invalid_start_time"));
    }

    // Check minimum 15 minutes duration
    const duration = endTime.diff(value, "minute");
    if (duration < 15) {
      return Promise.reject(i18n.t("general.invalid_timeslot_minium"));
    }

    return Promise.resolve();
  };

export const validateEndTime =
  (form: FormInstance) => (_: any, value: dayjs.Dayjs) => {
    const startTime: dayjs.Dayjs = form.getFieldValue("startTime");
    if (!value || !startTime) return Promise.resolve();

    if (value.valueOf() <= startTime.valueOf()) {
      return Promise.reject(i18n.t("general.invalid_start_time"));
    }

    // Check minimum 15 minutes duration
    const duration = value.diff(startTime, "minute");
    if (duration < 15) {
      return Promise.reject(i18n.t("general.invalid_timeslot_minium"));
    }

    return Promise.resolve();
  };

export const getPriorityPassRules = (
  isRequired: boolean = true,
  form?: FormInstance
): Rule[] => [
  {
    required: isRequired,
    message: i18n.t("validation.venue.capacity.required"),
  },
  {
    validator: (_, value) => {
      if (value === undefined || value === null || !value) {
        return Promise.resolve();
      }

      const number = Number(value);

      if (isNaN(number) || !Number.isInteger(number) || number < 0) {
        return Promise.reject(
          i18n.t("validation.venue.capacity.invalid_value")
        );
      }

      // Check if priority pass value is less than capacity
      if (form) {
        const capacity = form.getFieldValue("partySize");
        if (
          capacity !== undefined &&
          capacity !== null &&
          !isNaN(Number(capacity)) &&
          number > Number(capacity)
        ) {
          return Promise.reject(
            i18n.t("validation.venue.priority_pass.exceed_capacity")
          );
        }
      }

      return Promise.resolve();
    },
  },
];

export const getQuestionValidationRules = (
  form: FormInstance,
  currentFieldName: string,
  questionCount: number
): Rule[] => [
  {
    validator: (_: any, value: string) => {
      // Check if value exists and is string
      if (!value || typeof value !== "string") {
        return Promise.resolve();
      }

      const trimmedValue = value.trim();

      // Check for whitespace-only input
      if (trimmedValue.length === 0) {
        return Promise.reject(
          i18n.t("question.validation.question_whitespace_error")
        );
      }

      // Check for duplicates by iterating through question fields only
      for (let i = 0; i < questionCount; i++) {
        const fieldName = `question_${i}`;

        // Skip current field
        if (fieldName === currentFieldName) {
          continue;
        }

        const fieldValue = form.getFieldValue(fieldName);

        if (
          fieldValue &&
          typeof fieldValue === "string" &&
          fieldValue.trim().toLowerCase() === trimmedValue.toLowerCase()
        ) {
          return Promise.reject(i18n.t("question.validation.unique_question"));
        }
      }

      return Promise.resolve();
    },
  },
];
