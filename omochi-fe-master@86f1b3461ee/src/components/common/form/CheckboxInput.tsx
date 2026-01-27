import { Checkbox } from "antd";
import { CheckboxProps } from "antd/es/checkbox";

interface CheckboxInputProps extends CheckboxProps {
  label: string;
  value?: string | boolean;
  className?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

const CheckboxInput = ({
  label,
  value,
  className = "",
  containerClassName = "",
  ...props
}: CheckboxInputProps) => {
  const checkboxProps =
    typeof value === "boolean"
      ? { checked: value, ...props }
      : { value, ...props };

  return (
    <div
      className={`!flex-1 !h-[50px] !bg-[#272525] !border-[1px] !border-white !rounded-xl !p-0 !m-0 ${containerClassName}`}
    >
      <Checkbox className={className} {...checkboxProps}>
        <div className="!flex !flex-row !items-center !justify-between !w-full">
          <div className="!flex !items-center !gap-1 !flex-1">
            {props.icon && props.icon}
            <span className="text-sm-white">{label}</span>
          </div>
        </div>
      </Checkbox>
    </div>
  );
};

export default CheckboxInput;
