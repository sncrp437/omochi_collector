export const handleInputFocus = () => {
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;
};

export const hideKeyboardOnEnter = (
  event: React.KeyboardEvent<HTMLInputElement>
) => {
  if (event.key === "Enter") {
    (event.target as HTMLInputElement).blur();
    handleInputFocus();
  }
};

export const onDecimalInput = (
  event:
    | React.KeyboardEvent<HTMLInputElement>
    | React.KeyboardEvent<HTMLTextAreaElement>
) => {
  const target = event.target as HTMLInputElement;
  if (event.key === "," || event.key === ".") {
    if (target.value.includes(".")) {
      event.preventDefault();
      return false;
    }
  }
  if (event.key === ",") {
    event.preventDefault();
    target.value += ".";
    return false;
  }
  return true;
};
