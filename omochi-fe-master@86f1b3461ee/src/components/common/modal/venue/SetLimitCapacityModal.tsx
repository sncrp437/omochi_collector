import { Modal, Button, Typography, Form } from "antd";
import "@/components/common/ConfirmLogoutModal.css";
import { IconWarning } from "@/assets/icons";
import { useTranslation } from "react-i18next";
import { OrderTypeEnum, TimeSlot } from "@/generated/api";
import { getCapacityRules } from "@/rules/venue";
import TextInput from "@/components/common/form/TextInput";
import { isEmpty } from "@/utils/helper";
import { useMemo } from "react";

const { Text } = Typography;

interface SetLimitCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleConfirm: (payload: number) => Promise<void>;
  loading?: boolean;
  timeSlot: TimeSlot | null;
  orderType?: OrderTypeEnum;
}

const SetLimitCapacityModal: React.FC<SetLimitCapacityModalProps> = ({
  isOpen,
  onClose,
  handleConfirm,
  loading = false,
  timeSlot,
  orderType = OrderTypeEnum.DineIn,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const labelKeyMap = {
    [OrderTypeEnum.Takeout]: {
      capacityUnit: t("venue.label.party_size_table_label_take_out_unit"),
      addMoreCapacityLabel: t("venue.label.add_more_capacity_label_take_out"),
    },
    [OrderTypeEnum.DineIn]: {
      capacityUnit: t("venue.label.party_size_table_label_eat_in_unit"),
      addMoreCapacityLabel: t("venue.label.add_more_capacity_label_eat_in"),
    },
  };

  const labelByOrderType = useMemo(() => {
    return labelKeyMap[orderType ?? OrderTypeEnum.DineIn];
  }, [orderType]);

  if (!timeSlot || isEmpty(timeSlot)) {
    return <></>;
  }

  // Reset form fields and close modal
  const handleForceCloseModal = () => {
    form.resetFields();
    onClose();
  };

  // Handle confirm action with form validation
  const handleConfirmInternal = async () => {
    try {
      const values = await form.validateFields();
      const payload = values.capacity;

      await handleConfirm(payload);
      handleForceCloseModal();
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };
  const base = `${timeSlot.total_current_limit}${labelByOrderType.capacityUnit}`;
  const additional = timeSlot.temporary_additional_limit
    ? `（${timeSlot.max_reservations}）`
    : "";

  const currentCapacity = `${base}${additional}`;

  return (
    <Modal
      open={isOpen}
      onCancel={handleForceCloseModal}
      footer={null}
      centered
      width={327}
      styles={{
        content: {
          background: "#272525",
          borderRadius: "16px",
          padding: "24px",
        },
        mask: {
          backgroundColor: "#000000B2",
        },
      }}
      closeIcon={false}
      className="!w-full !max-w-[500px] !p-6"
      maskClosable={false}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <IconWarning className="w-[96px] h-[96px] !min-w-[96px] !min-h-[96px] !text-white" />

        <div className="w-full text-center">
          <Text className="text-sm-white !font-bold">
            {t("venue.label.set_limit_capacity_confirmation")}
          </Text>
        </div>

        <div className="flex w-full gap-[22px]">
          <div className="flex-1 flex flex-col gap-2">
            <Text className="text-xs-white !font-bold">
              {t("venue.label.current_capacity_label")}
            </Text>
            <div className="flex-row-center !flex-1 !w-full !h-10 !min-h-10 !max-h-10 !bg-[var(--card-background-color)] !rounded-xl">
              <p className="text-[var(--text-disabled-color)] text-[14px] !leading-[1.2em] !font-['Noto_Sans_JP'] !m-0">
                {currentCapacity}
              </p>
            </div>
          </div>

          <Form
            form={form}
            name="capacity"
            layout="vertical"
            requiredMark={false}
            className="!flex-1 !flex !flex-col !gap-4"
            onFinish={handleConfirm}
            disabled={loading}
          >
            <div className="flex flex-col gap-2">
              <Text className="text-xs-white !font-bold !m-0">
                {labelByOrderType.addMoreCapacityLabel}
              </Text>
              <Form.Item
                name="capacity"
                className="form-item-error-explanation !w-full !m-0"
                label={false}
                rules={getCapacityRules()}
              >
                <TextInput
                  placeholder="--"
                  size="large"
                  className="input-center-custom !text-[14px]"
                  inputMode="decimal"
                  maxLength={2}
                  disabled={loading}
                />
              </Form.Item>
            </div>
          </Form>
        </div>

        <div className="flex w-full gap-[22px]">
          <Button
            className="!flex-1 !h-10 !min-h-10 !max-h-10 !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={onClose}
            loading={loading}
            disabled={loading}
          >
            {t("venue.label.menu_item_edit_confirm_cancel")}
          </Button>
          <Button
            className="!flex-1 !h-10 !min-h-10 !max-h-10 !bg-transparent !hover:text-white !outline-none border border-white !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={handleConfirmInternal}
            loading={loading}
            disabled={loading}
          >
            {t("venue.label.resume_reception_label")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SetLimitCapacityModal;
