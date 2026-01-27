import { handleInputFocus, onDecimalInput } from "./input";

export const handleBlur = (
  e: React.FocusEvent<HTMLInputElement> | React.FocusEvent<HTMLTextAreaElement>,
  onChange?: (value: string) => void,
  onBlur?: () => void
) => {
  const trimmedValue = e.target.value.trim();
  onChange?.(trimmedValue);
  onBlur?.();
  handleInputFocus();
};

export const handleKeyDown = (
  e:
    | React.KeyboardEvent<HTMLInputElement>
    | React.KeyboardEvent<HTMLTextAreaElement>,
  onKeyDown?: (
    e:
      | React.KeyboardEvent<HTMLInputElement>
      | React.KeyboardEvent<HTMLTextAreaElement>
  ) => void,
  inputMode?: string
) => {
  onKeyDown?.(e);
  if (inputMode === "decimal") {
    onDecimalInput(e);
  }
};
