import { Switch } from "antd";

interface ButtonSwitchProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}

const ButtonSwitch = ({
  value = false,
  onChange,
  disabled = false,
}: ButtonSwitchProps) => {
  return (
    <Switch
      checked={value}
      onChange={onChange}
      className="switch-primary-custom !outline-none"
      disabled={disabled}
    />
  );
};

export default ButtonSwitch;
