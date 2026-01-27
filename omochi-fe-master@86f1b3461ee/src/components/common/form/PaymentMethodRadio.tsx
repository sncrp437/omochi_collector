import { Radio, Typography } from "antd";
import type { RadioChangeEvent } from "antd";
import { PaymentMethodEnum } from "@/generated/api";

const { Text } = Typography;

type PaymentOption = {
  value: PaymentMethodEnum;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

interface PaymentMethodRadioProps {
  value: string;
  onChange: (value: PaymentMethodEnum) => void;
  options: PaymentOption[];
  loading?: boolean;
}

const PaymentMethodRadio: React.FC<PaymentMethodRadioProps> = ({
  value,
  onChange,
  options,
  loading = false,
}) => {
  const handleChange = (e: RadioChangeEvent) => {
    if (loading) return;
    onChange(e.target.value);
  };

  return (
    <Radio.Group
      onChange={handleChange}
      value={value}
      className="custom-base-radio custom-payment-radio !flex !gap-2 !w-full [&_.ant-radio-button-wrapper::before]:!hidden"
      disabled={loading}
    >
      {options.map((option) => (
        <Radio.Button
          key={option.value}
          value={option.value}
          className={`
          !rounded-xl !px-3 !py-[10px] !flex items-center !border-none !flex-1 !h-[40px] !w-full
            !transition-all duration-200
            ${option.disabled ? "button-disabled" : "!text-white "}
          `}
          disabled={option.disabled || loading}
        >
          <div className="flex items-center gap-2">
            {option.icon && option.icon}
            <Text className="text-sm-white">{option.label}</Text>
          </div>
          <div
            className={`w-4 h-4 min-w-4 min-h-4 border-[2px] rounded-full flex items-center justify-center ${
              option.disabled
                ? "border-[var(--text-disabled-color)]"
                : "border-white"
            }`}
          >
            {value === option.value && (
              <span className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-white" />
            )}
          </div>
        </Radio.Button>
      ))}
    </Radio.Group>
  );
};

export default PaymentMethodRadio;
