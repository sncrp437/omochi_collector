/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Select, Tag } from "antd";
import { SelectInputProps, OptionType } from "../../../types/common";
import { IconChevronDown, IconClose } from "@/assets/icons";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import { handleDropdownVisibleChange } from "@/utils/helper";

const CustomTagSelect = ({
  label,
  closable,
  onClose,
}: CustomTagProps): React.ReactElement => {
  return (
    <Tag
      closable={false}
      className="!bg-[var(--card-background-color)] !text-white !border-none flex-row-center !gap-[6px] !rounded-lg !h-[26px] !me-0 !ps-[10px]"
    >
      <span className="text-xs-white">{label}</span>
      {closable && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={onClose}
        >
          <IconClose className="cursor-pointer" width={18} height={18} />
        </div>
      )}
    </Tag>
  );
};

const SelectInput: React.FC<SelectInputProps> = ({
  placeholder,
  disabled,
  className,
  popupClassName,
  rootClassName,
  style,
  size = "large",
  options,
  value,
  onChange,
  onBlur,
  suffixIcon = (
    <IconChevronDown
      width={20}
      height={20}
      className="w-[20px] h-[20px] min-w-[20px] min-h-[20px]"
      stroke="currentColor"
    />
  ),
  defaultValue,
  mode,
  tagRender = CustomTagSelect,
  showSearch = false,
  allowClear = false,
}) => {
  // Handle option selection to hide keyboard
  const handleSelect = () => {
    if (showSearch) {
      setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
      }, 100);
    }
  };

  return (
    <Select
      placeholder={placeholder}
      size={size}
      disabled={disabled}
      options={options?.map((option: OptionType) => ({
        ...option,
        disabled: option?.isAvailable === false,
        className: option?.isAvailable === false ? "!text-gray-400" : "",
      }))}
      className={className}
      popupClassName={`custom-select-scroll ${popupClassName}`}
      style={style}
      rootClassName={rootClassName}
      value={value as any}
      onChange={onChange}
      onBlur={onBlur}
      onSelect={handleSelect}
      suffixIcon={suffixIcon}
      defaultValue={defaultValue}
      mode={mode}
      tagRender={tagRender}
      showSearch={showSearch}
      allowClear={allowClear}
      onDropdownVisibleChange={handleDropdownVisibleChange}
      getPopupContainer={(triggerNode) => triggerNode.parentElement}
    />
  );
};

export default SelectInput;
