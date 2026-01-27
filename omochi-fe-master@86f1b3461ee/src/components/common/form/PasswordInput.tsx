import React from "react";
import { Input } from "antd";
import { BaseInputProps } from "../../../types/common";
import { handleBlur, handleKeyDown } from "../../../utils/form-input";

const PasswordInput: React.FC<BaseInputProps> = ({
  placeholder,
  disabled,
  className,
  style,
  size = "large",
  maxLength,
  value,
  inputMode = "text",
  onChange,
  onKeyDown,
  onBlur,
}) => {
  return (
    <Input.Password
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      maxLength={maxLength}
      className={className}
      style={style}
      inputMode={inputMode}
      value={value}
      onKeyDown={(e) => handleKeyDown(e, onKeyDown, inputMode)}
      onBlur={(e) => handleBlur(e, onChange, onBlur)}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
};

export default PasswordInput; 