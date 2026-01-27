import React from "react";
import { Input } from "antd";
import { BaseInputProps } from "../../../types/common";
import { handleBlur, handleKeyDown } from "../../../utils/form-input";

const TextInput: React.FC<BaseInputProps> = ({
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
  suffixIcon,
  minLength,
  readOnly = false,
}) => {
  return (
    <Input
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      maxLength={maxLength}
      className={className}
      style={style}
      value={value}
      inputMode={inputMode}
      onKeyDown={(e) => handleKeyDown(e, onKeyDown, inputMode)}
      onBlur={(e) => handleBlur(e, onChange, onBlur)}
      onChange={(e) => onChange?.(e.target.value)}
      suffix={suffixIcon}
      minLength={minLength}
      readOnly={readOnly}
    />
  );
};

export default TextInput;
