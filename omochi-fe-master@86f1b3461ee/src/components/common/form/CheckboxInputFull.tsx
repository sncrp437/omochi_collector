import { Checkbox } from "antd";

type CheckboxInputFullProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  color?: string;
  checkboxClassName?: string;
};

const CheckboxInputFull: React.FC<CheckboxInputFullProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  color = "#FF3B30",
  checkboxClassName,
}) => {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`!h-[50px] !max-h-[50px] flex-row-between w-full p-3 rounded-xl cursor-pointer border transition
        ${disabled ? "button-disabled " : ""}
      `}
      style={{
        borderColor: checked ? color : color,
        backgroundColor: checked ? color : "transparent",
        color: checked ? "#ffffff" : color,
      }}
    >
      <span className="text-sm !leading-[1.2em]">{label}</span>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className={checkboxClassName}
      />
    </div>
  );
};

export default CheckboxInputFull;
