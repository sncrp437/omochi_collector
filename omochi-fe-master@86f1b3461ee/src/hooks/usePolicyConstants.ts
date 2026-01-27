import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { COMPANY_CONSTANTS } from "@/utils/constants";

/**
 * Custom hook for dynamic policy constants that update when language changes
 */
export const usePolicyConstants = () => {
  const { t } = useTranslation();

  const contactInfo = useMemo(() => ({
    businessName: {
      label: t("policy.company_info.business_name_label"),
      value: t("policy.company_info.business_name_value"),
    },
    representative: {
      label: t("policy.company_info.representative_label"),
      value: t("policy.company_info.representative_value"),
    },
    capitalStock: {
      label: t("policy.company_info.capital_stock_label"),
      value: t("policy.company_info.capital_stock_value"),
    },
    location: {
      label: t("policy.company_info.location_label"),
      value: t("policy.company_info.location_value"),
    },
    phoneNumber: {
      label: t("policy.company_info.phone_number_label"),
      value: t("policy.company_info.phone_number_value"),
    },
    email: {
      label: t("policy.company_info.email_label"),
      value: COMPANY_CONSTANTS.EMAIL,
    },
    salesURL: {
      label: t("policy.company_info.sales_url_label"),
      value: COMPANY_CONSTANTS.SALES_URL,
    },
  }), [t]);

  const privacyPolicyContent = useMemo(() => ({
    description: t("policy.privacy_content.description"),
    sections: [
      {
        id: 1,
        label: t("policy.privacy_content.section_1.label"),
        description: t("policy.privacy_content.section_1.description"),
        items: [
          t("policy.privacy_content.section_1.items.0"),
          t("policy.privacy_content.section_1.items.1"),
          t("policy.privacy_content.section_1.items.2"),
          t("policy.privacy_content.section_1.items.3"),
        ],
      },
      {
        id: 2,
        label: t("policy.privacy_content.section_2.label"),
        description: t("policy.privacy_content.section_2.description"),
        items: [
          t("policy.privacy_content.section_2.items.0"),
          t("policy.privacy_content.section_2.items.1"),
          t("policy.privacy_content.section_2.items.2"),
          t("policy.privacy_content.section_2.items.3"),
        ],
      },
      {
        id: 3,
        label: t("policy.privacy_content.section_3.label"),
        description: t("policy.privacy_content.section_3.description"),
        items: [
          t("policy.privacy_content.section_3.items.0"),
          t("policy.privacy_content.section_3.items.1"),
          t("policy.privacy_content.section_3.items.2"),
          t("policy.privacy_content.section_3.items.3"),
          t("policy.privacy_content.section_3.items.4"),
        ],
      },
      {
        id: 4,
        label: t("policy.privacy_content.section_4.label"),
        description: t("policy.privacy_content.section_4.description"),
        items: [],
      },
      {
        id: 5,
        label: t("policy.privacy_content.section_5.label"),
        description: t("policy.privacy_content.section_5.description"),
        items: [],
      },
      {
        id: 6,
        label: t("policy.privacy_content.section_6.label"),
        description: t("policy.privacy_content.section_6.description"),
        items: [],
      },
      {
        id: 7,
        label: t("policy.privacy_content.section_7.label"),
        description: t("policy.privacy_content.section_7.description"),
        items: [],
      },
      {
        id: 8,
        label: t("policy.privacy_content.section_8.label"),
        description: t("policy.privacy_content.section_8.description"),
        items: [],
      },
    ],
  }), [t]);

  const legalContent = useMemo(() => ({
    sections: [
      {
        id: 1,
        label: t("policy.legal_content.section_1.label"),
        value: t("policy.legal_content.section_1.value"),
        items: [],
        optionalContent: {
          label: t("policy.legal_content.section_1.optional_label"),
          items: [
            t("policy.legal_content.section_1.optional_items.0"),
            t("policy.legal_content.section_1.optional_items.1"),
          ],
        },
      },
      {
        id: 2,
        label: t("policy.legal_content.section_2.label"),
        value: t("policy.legal_content.section_2.value"),
        items: [],
        optionalContent: {
          label: t("policy.legal_content.section_2.optional_label"),
          items: [
            t("policy.legal_content.section_2.optional_items.0"),
            t("policy.legal_content.section_2.optional_items.1"),
          ],
        },
      },
      {
        id: 3,
        label: t("policy.legal_content.section_3.label"),
        value: "",
        items: [
          t("policy.legal_content.section_3.items.0"),
          t("policy.legal_content.section_3.items.1"),
        ],
        optionalContent: null,
      },
      {
        id: 4,
        label: t("policy.legal_content.section_4.label"),
        value: "",
        items: [
          t("policy.legal_content.section_4.items.0"),
          t("policy.legal_content.section_4.items.1"),
        ],
        optionalContent: null,
      },
      {
        id: 5,
        label: t("policy.legal_content.section_5.label"),
        value: t("policy.legal_content.section_5.value"),
        items: [],
        optionalContent: null,
      },
      {
        id: 6,
        label: t("policy.legal_content.section_6.label"),
        value: t("policy.legal_content.section_6.value"),
        items: [],
        optionalContent: null,
      },
    ],
  }), [t]);

  const couponPolicyContent = useMemo(() => ({
    sections: [
      {
        id: 1,
        label: t("policy.coupon_content.section_1.label"),
        description: t("policy.coupon_content.section_1.description"),
        items: [],
      },
      {
        id: 2,
        label: t("policy.coupon_content.section_2.label"),
        description: t("policy.coupon_content.section_2.description"),
        items: [],
      },
      {
        id: 3,
        label: t("policy.coupon_content.section_3.label"),
        description: t("policy.coupon_content.section_3.description"),
        items: [],
      },
      {
        id: 4,
        label: t("policy.coupon_content.section_4.label"),
        description: t("policy.coupon_content.section_4.description"),
        items: [],
      },
    ],
  }), [t]);

  return {
    contactInfo,
    privacyPolicyContent,
    legalContent,
    couponPolicyContent,
  };
};
