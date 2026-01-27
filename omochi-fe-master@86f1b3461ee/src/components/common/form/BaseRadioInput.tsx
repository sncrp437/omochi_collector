import { Radio, Typography } from "antd";
import type { RadioChangeEvent } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

type PaymentOption = {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
};

interface BaseRadioInputProps {
  value: string;
  onChange: (value: string) => void;
  options: PaymentOption[];
}

const BaseRadioInput: React.FC<BaseRadioInputProps> = ({
  value,
  onChange,
  options,
}) => {
  const { t } = useTranslation();

  const handleChange = (e: RadioChangeEvent) => {
    onChange(e.target.value);
  };

  return (
    <Radio.Group
      onChange={handleChange}
      value={value}
      className="custom-base-radio !flex !gap-2 !w-full [&_.ant-radio-button-wrapper::before]:!hidden"
    >
      {options.map((option) => (
        <Radio.Button
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={`
          !text-white !rounded-xl !p-3 !flex items-center !border !border-white !flex-1 !h-[40px] !w-full
            !transition-all duration-200
            ${option.disabled ? "button-disabled" : ""}
          `}
        >
          <div className="flex items-center gap-2">
            {option.icon && (
              <img
                src={option.icon}
                alt="Icon Payment"
                className="w-[22px] h-[22px] min-w-[22px] min-h-[22px]"
              />
            )}
            <Text className="text-sm-white">{t(option.label)}</Text>
          </div>
          <div
            className={`w-4 h-4 min-w-4 min-h-4 border-[2px] rounded-full flex items-center justify-center ${
              option.disabled
                ? "!border-[var(--text-disabled-color)]"
                : "!border-white"
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

export default BaseRadioInput;
