import React, { useState, useEffect } from "react";
import { DatePicker } from "antd";
import type { DatePickerProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { IconCalendar, IconClose } from "@/assets/icons";
import { handleDropdownVisibleChange } from "@/utils/helper";

interface CustomDateRangePickerProps {
  value?: [Dayjs | null, Dayjs | null];
  onChange?: (dates: [Dayjs | null, Dayjs | null]) => void;
  placeholder?: [string, string];
  format?: string;
}

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({
  value = [null, null],
  onChange,
  placeholder = ["", ""],
  format = "YYYY/MM/DD",
}) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(value[0]);
  const [endDate, setEndDate] = useState<Dayjs | null>(value[1]);

  useEffect(() => {
    setStartDate(value[0]);
    setEndDate(value[1]);
  }, [value]);

  const handleStartChange: DatePickerProps["onChange"] = (date) => {
    let newStartDate = date;
    let newEndDate = endDate;

    if (date && endDate && date.isAfter(endDate)) {
      newStartDate = endDate;
      newEndDate = date;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
    onChange?.([newStartDate, newEndDate]);
  };

  const handleEndChange: DatePickerProps["onChange"] = (date) => {
    let newStartDate = startDate;
    let newEndDate = date;

    if (date && startDate && date.isBefore(startDate)) {
      newStartDate = date;
      newEndDate = startDate;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
    onChange?.([newStartDate, newEndDate]);
  };

  return (
    <div className="flex-row-center gap-1 w-full !px-2 !h-8 !min-h-8 !max-h-8 rounded-[6px] border border-white">
      <div className="flex-row-center gap-1 w-full">
        <DatePicker
          value={startDate}
          onChange={handleStartChange}
          disabledDate={(current) => current && current.isAfter(dayjs(), "day")}
          className="!text-white placeholder-fix !border-none !outline-none"
          placeholder={placeholder[0]}
          format={format}
          rootClassName="custom-datepicker"
          popupClassName="custom-datepicker-popup"
          size="middle"
          suffixIcon={false}
          getPopupContainer={(triggerNode) => triggerNode.parentElement!}
          allowClear={false}
          inputReadOnly={true}
          onOpenChange={handleDropdownVisibleChange}
        />
        <div className="select-none text-xs-white">～</div>
        <DatePicker
          value={endDate}
          onChange={handleEndChange}
          disabledDate={(current) => {
            return current && current.isAfter(dayjs(), "day");
          }}
          className="!text-white placeholder-fix !border-none !outline-none"
          placeholder={placeholder[1]}
          format={format}
          rootClassName="custom-datepicker"
          size="middle"
          suffixIcon={false}
          placement="bottomLeft"
          allowClear={false}
          inputReadOnly={true}
          onOpenChange={handleDropdownVisibleChange}
        />
      </div>
      <div className="!w-5 !h-5 !min-w-5 !min-h-5 !max-w-5 !max-h-5 flex-row-center">
        {startDate || endDate ? (
          <div
            className="absolute right-2 cursor-pointer text-white hover:text-red-400 !w-4 !h-4 !min-w-4 !min-h-4 !max-w-4 !max-h-4 bg-white rounded-full flex-row-center"
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
              onChange?.([null, null]);
            }}
          >
            <IconClose className="w-3 h-3 !text-black" />
          </div>
        ) : (
          <IconCalendar className="!w-5 !h-5 !min-w-5 !min-h-5 !max-w-5 !max-h-5 !text-white" />
        )}
      </div>
    </div>
  );
};

export default CustomDateRangePicker;
