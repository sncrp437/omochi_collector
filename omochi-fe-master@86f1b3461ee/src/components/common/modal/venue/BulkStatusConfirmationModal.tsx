import { Fragment } from "react";
import { Modal, Button, Typography } from "antd";
import { Trans, useTranslation } from "react-i18next";
import { Order, Reservation } from "@/generated/api";
import { formatTimeSlotLabel, getLabelFromOptions } from "@/utils/helper";
import { ORDER_TYPE_OPTIONS } from "@/utils/constants";

const { Text } = Typography;

interface BulkStatusConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleConfirm: () => void;
  items: (Order | Reservation)[];
  loading?: boolean;
  description?: string;
  isConfirmingReady?: boolean;
}

// Type guard to check if item is an Order
const isOrder = (item: Order | Reservation): item is Order => {
  return "order_type" in item;
};

// Helper function to get order/reservation code
const getItemCode = (item: Order | Reservation): string => {
  return isOrder(item) ? item.order_code || "" : item.reservation_code || "";
};

// Helper function to get order type label
const getOrderTypeLabel = (
  item: Order | Reservation,
  t: (key: string) => string
): string => {
  if (isOrder(item)) {
    return t(getLabelFromOptions(ORDER_TYPE_OPTIONS, item.order_type) || "");
  }
  return t("order.label.dine_in_label");
};

// Helper function to get timeslot label
const getTimeslotLabel = (item: Order | Reservation): string => {
  return formatTimeSlotLabel(item.start_time || "", item.end_time || "");
};

// Render function for order item
const renderOrderItem = (
  item: Order | Reservation,
  t: (key: string) => string
) => {
  const code = getItemCode(item);
  const orderType = getOrderTypeLabel(item, t);
  const timeslot = getTimeslotLabel(item);

  return (
    <>
      {/* Code Tag*/}
      <div className="flex-row-center gap-1 px-2 py-0 min-h-[19px] bg-[#757575] rounded-xl min-w-[65px] w-fit">
        <Text className="text-xs-white !font-bold whitespace-nowrap">
          #{code}
        </Text>
      </div>

      <Text className="text-xs-white !font-normal whitespace-nowrap mr-1 ml-3">
        {orderType}
      </Text>

      <Text className="text-xs-white !font-normal mr-1">|</Text>

      <Text className="text-xs-white !font-normal">{timeslot}</Text>
    </>
  );
};

const BulkStatusConfirmationModal: React.FC<
  BulkStatusConfirmationModalProps
> = ({
  isOpen,
  onClose,
  handleConfirm,
  items,
  loading = false,
  description,
  isConfirmingReady = false,
}) => {
  const { t } = useTranslation();
  const descriptionKey = `venue.bulk_status.description_${
    isConfirmingReady ? "completed" : "ready"
  }`;
  const confirmButtonLabel = isConfirmingReady
    ? t("venue.bulk_status.confirm_button_label_completed")
    : t("venue.bulk_status.confirm_button_label_ready");

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closeIcon={false}
      centered
      width={327}
      styles={{
        content: {
          background: "#272525",
          borderRadius: "16px",
          padding: "24px",
        },
        mask: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
      className="!w-full !max-w-[500px] !p-6"
      zIndex={999}
      maskClosable={!loading}
    >
      <div className="flex flex-col gap-6">
        {/* Title and Description */}
        <div className="flex flex-col gap-4">
          <Text className="!text-xl !font-bold leading-[1.2em] font-family-base !text-white">
            {t("venue.bulk_status.title")}
          </Text>
          {description ? (
            <Text className="text-sm-white whitespace-pre-line">
              {description}
            </Text>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Trans
                i18nKey={descriptionKey}
                components={[
                  <Text key="0" className="text-sm-white block" />,
                  <Text key="1" className="text-sm-white block" />,
                  <Text key="2" className="text-sm-white block" />,
                ]}
              />
            </div>
          )}
        </div>

        {/* Target Orders Section */}
        <div className="flex flex-col gap-3">
          <Text className="text-xs-white !font-bold">
            {t("venue.bulk_status.target_orders_label")}
          </Text>

          {/* Order List */}
          <div className="grid grid-cols-[65px_auto_auto_1fr] items-center gap-y-3">
            {items.map((item) => (
              <Fragment key={item.id}>{renderOrderItem(item, t)}</Fragment>
            ))}
          </div>
        </div>

        {/* Confirm Button */}
        <div className="z-10 !flex !justify-center !sticky !bottom-0 !left-0 !right-0 !mx-auto !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap !border-none">
          <Button
            className="!w-full !h-10 !min-h-10 !max-h-10 !bg-[var(--background-teal-color)] !border-none !rounded-xl flex-row-center !outline-none"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            <Text className="text-sm-white !font-bold">
              {confirmButtonLabel}
            </Text>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkStatusConfirmationModal;
