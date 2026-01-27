import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PaymentStatusEnum } from "@/generated/api";

/**
 * Custom hook for all dynamic status constants that update when language changes
 * Includes order status, reservation status, and payment status
 */
export const useStatusConstants = () => {
  const { t } = useTranslation();

  // Common status for both orders and reservations (they use the same translations)
  const commonStatus = useMemo(
    () => ({
      PENDING: {
        label: t("order.status.common.pending"),
        value: "PENDING",
        icons: ["PREPARING"],
        color: "#B0B0B0",
      },
      CONFIRMED: {
        label: t("order.status.common.confirmed"),
        value: "CONFIRMED",
        icons: ["PREPARING"],
        color: "#B0B0B0",
      },
      PREPARING: {
        label: t("order.status.common.preparing"),
        value: "PREPARING",
        icons: ["PREPARING"],
        color: "#FFCC00",
      },
      READY: {
        label: t("order.status.common.ready"),
        value: "READY",
        icons: ["COMPLETED"],
        color: "#34C759",
      },
      COMPLETED: {
        label: t("order.status.common.completed"),
        value: "COMPLETED",
        icons: ["COMPLETED"],
        color: "#4d759a",
      },
      CANCELLED: {
        label: t("order.status.common.cancelled"),
        value: "CANCELLED",
        icons: ["COMPLETED"],
        color: "#FF3B30",
      },
    }),
    [t]
  );

  // Payment status mapping
  const paymentStatusMapping = useMemo(
    () => ({
      [PaymentStatusEnum.Pending]: {
        value: t("order.status.payment.incomplete"),
        color: "#FF3B30",
      },
      [PaymentStatusEnum.Paid]: {
        value: t("order.status.payment.completed"),
        color: "#34C759",
      },
      [PaymentStatusEnum.Failed]: {
        value: t("order.status.payment.failed"),
        color: "#FF3B30",
      },
    }),
    [t]
  );

  return {
    // For backward compatibility and clarity
    orderStatus: commonStatus,
    reservationStatus: commonStatus,
    // Payment status
    paymentStatusMapping,
  };
};
