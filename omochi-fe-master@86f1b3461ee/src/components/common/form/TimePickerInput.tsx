import { TimePicker, TimePickerProps } from "antd";
import dayjs from "dayjs";
import { format } from "date-fns";
import { handleDropdownVisibleChange } from "@/utils/helper";

interface TimePickerInputProps
  extends Omit<TimePickerProps, "value" | "defaultValue" | "onChange"> {
  value?: Date | null;
  defaultValue?: Date;
  onChange?: (value: Date | null, timeString: string) => void;
  format?: string;
  minuteStep?: TimePickerProps["minuteStep"];
  placeholder?: string;
}

const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  defaultValue,
  onChange,
  format: timeFormat = "HH:mm",
  minuteStep = 5,
  placeholder = "-- : --",
  ...rest
}) => {
  return (
    <TimePicker
      value={value ? dayjs(value) : null}
      defaultValue={defaultValue ? dayjs(defaultValue) : undefined}
      onChange={(value) => {
        if (!value) {
          onChange?.(null, "");
          return;
        }
        const nativeDate = value.toDate();
        onChange?.(nativeDate, format(nativeDate, timeFormat));
      }}
      format={timeFormat}
      minuteStep={minuteStep}
      placeholder={placeholder}
      showNow={false}
      onOpenChange={handleDropdownVisibleChange}
      popupClassName="time-picker-custom-popup"
      allowClear={false}
      {...rest}
    />
  );
};

export default TimePickerInput;
