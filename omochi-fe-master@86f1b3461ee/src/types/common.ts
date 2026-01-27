/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
export interface BaseInputProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: "large" | "middle" | "small";
  maxLength?: number;
  value?: string | string[];
  inputMode?:
    | "text"
    | "numeric"
    | "email"
    | "tel"
    | "search"
    | "url"
    | "decimal";
  onChange?: (value: string) => void;
  onKeyDown?: (
    e:
      | React.KeyboardEvent<HTMLInputElement>
      | React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
  onBlur?: () => void;
  suffixIcon?: React.ReactNode;
  minLength?: number;
  readOnly?: boolean;
}

export interface SelectInputProps
  extends Omit<BaseInputProps, "inputMode" | "maxLength"> {
  popupClassName?: string;
  rootClassName?: string;
  options?: { value: string | number; label: string }[];
  suffixIcon?: React.ReactNode;
  defaultValue?: string;
  mode?: "multiple" | "tags";
  tagRender?: (props: CustomTagProps) => React.ReactElement;
  showSearch?: boolean;
  onChange?: (value: string | string[]) => void;
  allowClear?: boolean;
}

export interface FormInputProps extends BaseInputProps {
  type?: "input" | "select" | "password";
  popupClassName?: string;
  rootClassName?: string;
  options?: { value: string; label: string }[];
}

export type OptionType = {
  value: string | number;
  label: string;
  isAvailable?: boolean;
  start_time?: string;
  end_time?: string;
  remaining_slots?: number;
  is_paused?: boolean;
  priority_pass_slot?: number;
  [key: string]: any;
};

export interface TextAreaInputProps extends BaseInputProps {
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  disableTrim?: boolean;
}

export type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;