import { Radio } from "antd";
import { RadioButtonProps } from "antd/es/radio/radioButton";

interface RadioInputProps extends RadioButtonProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  isChecked?: boolean;
  className?: string;
}

const RadioInput = ({
  label,
  value,
  icon,
  isChecked,
  className,
  disabled,
  ...props
}: RadioInputProps) => {
  return (
    <Radio.Button
      disabled={disabled}
      value={value}
      className={`${className || ""}`}
      {...props}
    >
      <div className="!w-full !h-full !flex !items-center !justify-between !px-3">
        <div className="!flex !items-center !gap-1">
          {icon}
          <span className="text-sm-white">{label}</span>
        </div>
        <div
          className={`!w-4 !h-4 !border-[2px]  !rounded-full !flex !items-center !justify-center ${
            disabled ? "!border-[var(--text-disabled-color)]" : "!border-white"
          }`}
        >
          {isChecked && (
            <div className="!w-2 !h-2 !bg-white !rounded-full"></div>
          )}
        </div>
      </div>
    </Radio.Button>
  );
};

export default RadioInput;
