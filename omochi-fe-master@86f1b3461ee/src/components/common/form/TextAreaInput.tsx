import React from "react";
import { Input } from "antd";
import { handleBlur, handleKeyDown } from "../../../utils/form-input";
import { TextAreaInputProps } from "@/types/common";

const { TextArea } = Input;

const TextAreaInput: React.FC<TextAreaInputProps> = ({
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
  autoSize = { minRows: 1, maxRows: 5 },
  disableTrim = false,
}) => {
  const handleBlurEvent = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (disableTrim) {
      onBlur?.();
    } else {
      handleBlur(e, onChange, onBlur);
    }
  };

  return (
    <TextArea
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      maxLength={maxLength}
      className={className}
      style={style}
      value={value}
      inputMode={inputMode}
      onKeyDown={(e) => handleKeyDown(e, onKeyDown, inputMode)}
      onBlur={handleBlurEvent}
      onChange={(e) => onChange?.(e.target.value)}
      autoSize={autoSize}
    />
  );
};

export default TextAreaInput;
