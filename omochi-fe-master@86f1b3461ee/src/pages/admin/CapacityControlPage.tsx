import { Typography, Form, Button, Table, Spin, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState, useEffect, useRef, useMemo } from "react";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { ROUTE_PATH, ORDER_TYPE_OPTIONS } from "@/utils/constants";
import SelectInput from "@/components/common/form/SelectInput";
import {
  OrderTypeEnum,
  TimeSlot,
  TimeSlotRequest,
  MenuItemStockUpdateRequest,
  VenuesRetrieveMultilingualEnum,
  VenuesMenusItemsListMultilingualEnum,
} from "@/generated/api";
import {
  IconResume,
  IconPause,
  IconDeleteRed,
  IconWarning,
  IconPriorityPass,
} from "@/assets/icons";
import BaseCardInfo from "@/components/card/BaseCardInfo";
import {
  formatTimeSlotLabel,
  isEmpty,
  sortTimeSlots,
  getEnabledOrderTypeOptions,
} from "@/utils/helper";
import TimePickerInput from "@/components/common/form/TimePickerInput";
import TextInput from "@/components/common/form/TextInput";
import { useSelector } from "react-redux";
import {
  getListMenuItems,
  getTimeSlotsVenue,
  addNewTimeSlot,
  updateOutOfStockMenuItems,
  updatePausedTimeSlots,
  deleteTimeSlot,
  updateTimeSlot,
  addNewLimitCapacity,
  getDetailVenue,
} from "@/api/venue";
import { RootState } from "@/store";
import { OptionType } from "@/types/common";
import CheckboxInputFull from "@/components/common/form/CheckboxInputFull";
import DeleteConfirmationModal from "@/components/common/modal/venue/DeleteConfirmationModal";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import BaseModalConfirm from "@/components/common/modal/BaseModalConfirm";
import {
  getCapacityRules,
  getPriorityPassRules,
  validateEndTime,
  validateStartTime,
} from "@/rules/venue";
import SetLimitCapacityModal from "@/components/common/modal/venue/SetLimitCapacityModal";

const { Text } = Typography;

type OrderTypeOption = (typeof ORDER_TYPE_OPTIONS)[number];

const MODAL_CONFIRM_TYPE = {
  STOP_ACCEPTING: "stop_accepting",
  PAUSE_TIME_SLOTS: "pause_time_slots",
  RESUME_TIME_SLOTS: "resume_time_slots",
};

const CapacityControlPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { user } = useSelector((state: RootState) => state.auth);
  const venueId = user?.venue_roles[0]?.venue_id || "";
  const [checkedStop, setCheckedStop] = useState(false);
  const [typeModalConfirm, setTypeModalConfirm] = useState("");
  const [messageModalConfirm, setMessageModalConfirm] = useState<
    React.ReactNode | string
  >("");
  const [labelButtonModal, setLabelButtonModal] = useState({
    confirm: t("general.yes"),
    cancel: t("general.no"),
  });
  const [orderTypeOptions, setOrderTypeOptions] = useState<OrderTypeOption[]>(
    []
  );

  const [orderType, setOrderType] = useState<OrderTypeEnum | undefined>(
    undefined
  );
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTimeSlot, setLoadingTimeSlot] = useState(false);
  const [isValidForm, setIsValidForm] = useState(false);
  const [menuItemOptions, setMenuItemOptions] = useState<OptionType[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [outOfStockIds, setOutOfStockIds] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [typeFormTimeSlot, setTypeFormTimeSlot] = useState("add");
  const [loadingForm, setLoadingForm] = useState(false);
  const [openModalSetLimit, setOpenModalSetLimit] = useState(false);
  const didFetchTimeSlotsInitially = useRef(false);

  const labelButtonStopAccepting = t(
    orderType === OrderTypeEnum.Takeout
      ? "venue.label.stop_accepting_take_out_label"
      : "venue.label.stop_accepting_eat_in_label"
  );

  const labelKeyMap = {
    [OrderTypeEnum.Takeout]: {
      capacityLabel: t("venue.label.party_size_table_label_take_out"),
      capacityUnit: t("venue.label.party_size_table_label_take_out_unit"),
    },
    [OrderTypeEnum.DineIn]: {
      capacityLabel: t("venue.label.party_size_table_label_eat_in"),
      capacityUnit: t("venue.label.party_size_table_label_eat_in_unit"),
    },
  };

  const fetchTimeSlots = async () => {
    if (!orderType || !venueId) return;
    try {
      setLoadingTimeSlot(true);
      if (didFetchTimeSlotsInitially.current) {
        setLoading(true);
      }
      didFetchTimeSlotsInitially.current = true;
      const response = await getTimeSlotsVenue(orderType, venueId);
      if (response) {
        const sortedSlots = sortTimeSlots(
          response.map((slot) => ({
            ...slot,
            is_paused: !slot.is_paused
              ? slot.remaining_slots <= 0
              : slot.is_paused,
          }))
        );
        setTimeSlots(sortedSlots);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
    } finally {
      setLoading(false);
      setLoadingTimeSlot(false);
    }
  };

  useEffect(() => {
    if (timeSlots.length > 0 && !loadingTimeSlot) {
      const allPaused = timeSlots.every((slot) => slot.is_paused);
      if (checkedStop !== allPaused) {
        setCheckedStop(allPaused);
      }
    } else {
      setCheckedStop(true);
    }
  }, [timeSlots, loadingTimeSlot]);

  const fetchMenuItemsData = async () => {
    try {
      const response = await getListMenuItems(
        venueId,
        undefined,
        VenuesMenusItemsListMultilingualEnum.False
      );
      return response;
    } catch (error) {
      console.error("Error fetching menu items:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      const [detailResult, menuResult] = await Promise.allSettled([
        getDetailVenue(venueId, VenuesRetrieveMultilingualEnum.False),
        fetchMenuItemsData(),
      ]);

      if (detailResult.status === "fulfilled") {
        const hasEatIn =
          detailResult.value.enable_eat_in ||
          detailResult.value.enable_reservation ||
          false;
        const hasTakeout = detailResult.value.enable_take_out || false;

        const orderTypesEnabled = getEnabledOrderTypeOptions({
          enable_eat_in: hasEatIn,
          enable_take_out: hasTakeout,
        });

        const orderTypesMapping = orderTypesEnabled.map((option) => ({
          label: t(option.label),
          value: option.value,
        }));

        setOrderTypeOptions(orderTypesMapping as OrderTypeOption[]);
        const orderTypeSelected = hasTakeout
          ? OrderTypeEnum.Takeout
          : OrderTypeEnum.DineIn;
        setOrderType(orderTypeSelected);
      } else {
        console.error("Failed to fetch venue detail", detailResult.reason);
      }

      if (
        menuResult.status === "fulfilled" &&
        menuResult.value &&
        menuResult.value.length
      ) {
        const menuItems = menuResult.value;
        setMenuItemOptions(
          menuItems.map((item) => ({
            value: item.id,
            label: item.name,
          }))
        );
        const outOfStock = menuItems
          .filter((item) => item.is_out_of_stock)
          .map((item) => item.id);
        setOutOfStockIds(outOfStock);
      } else {
        setMenuItemOptions([]);
        console.error("Failed to fetch menu items", menuResult);
      }

      setLoading(false);
    };

    fetchAllData();
  }, [venueId]);

  useEffect(() => {
    if (!venueId || !orderType) return;
    fetchTimeSlots();
  }, [orderType, venueId]);

  const labelByOrderType = useMemo(() => {
    return labelKeyMap[orderType ?? OrderTypeEnum.DineIn];
  }, [orderType]);

  const checkFormValid = () => {
    const partySize = form.getFieldValue("partySize");

    const hasAllValues =
      form.getFieldValue("startTime") &&
      form.getFieldValue("endTime") &&
      !isEmpty(partySize);

    const hasErrors = form
      .getFieldsError()
      .some((field) => field.errors.length > 0);

    setIsValidForm(hasAllValues && !hasErrors);
  };

  // Handle close delete modal
  const handleCloseModalDelete = () => {
    setSelectedTimeSlot(null);
    setOpenDeleteModal(false);
  };

  // Handle close modal confirm
  const handleCloseModalConfirm = () => {
    setTypeModalConfirm("");
    setMessageModalConfirm("");
    setLabelButtonModal({
      confirm: t("general.yes"),
      cancel: t("general.no"),
    });
  };

  // Handle open delete modal
  const handleOpenDeleteTimeSlot = (
    event: React.MouseEvent,
    timeSlot: TimeSlot
  ) => {
    event.stopPropagation();
    setOpenDeleteModal(true);
    setSelectedTimeSlot(timeSlot);
  };

  // Handle confirm delete item
  const handleConfirmDeleteItem = async () => {
    if (!selectedTimeSlot) return;
    try {
      setLoading(true);
      await deleteTimeSlot(venueId, selectedTimeSlot.id);
      setTimeSlots((prev) =>
        sortTimeSlots(prev.filter((slot) => slot.id !== selectedTimeSlot.id))
      );

      if (typeFormTimeSlot === "edit") {
        form.resetFields();
        setSelectedTimeSlot(null);
        setTypeFormTimeSlot("add");
        checkFormValid();
      }
      toast.success(t("venue.toast.detele_capacity_success"));
    } catch (error) {
      console.error("Error deleting time slot:", error);
    } finally {
      handleCloseModalDelete();
      await fetchTimeSlots();
      setLoading(false);
    }
  };

  // Handle call api pause time slots
  const handlePauseTimeSlots = async (
    timeSlots: TimeSlot[] = [],
    isPaused: boolean
  ) => {
    if (!orderType || !venueId) return;
    try {
      setLoading(true);
      const pausedTimeSlotRequest = {
        time_slot_ids: timeSlots.map((slot) => slot.id),
        service_type: orderType,
        is_paused: isPaused,
      };

      await updatePausedTimeSlots(venueId, pausedTimeSlotRequest);
      setTimeSlots((prev) =>
        sortTimeSlots(
          prev.map((slot) =>
            !timeSlots.length || timeSlots.some((ts) => ts.id === slot.id)
              ? {
                  ...slot,
                  is_paused: slot.remaining_slots <= 0 ? true : isPaused,
                }
              : slot
          )
        )
      );
      toast.success(t("venue.toast.update_capacity_success"));
    } catch (error) {
      console.error("Error updating time slot pause status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle checked stop accepting
  const handleCheckedStop = (valueCheck: boolean) => {
    if (!timeSlots.length) {
      setCheckedStop(true);
      handleCloseModalConfirm();
      return;
    }
    if (valueCheck) {
      setMessageModalConfirm(
        <Trans
          i18nKey="venue.label.stop_accepting_confirmation"
          components={[
            <Text className="text-sm-white !font-bold !text-center" />,
            <Text className="text-sm-white !font-bold !text-center" />,
          ]}
        />
      );
      setLabelButtonModal({
        cancel: t("venue.label.menu_item_edit_confirm_cancel"),
        confirm: t("general.stop_label"),
      });
      setTypeModalConfirm(MODAL_CONFIRM_TYPE.STOP_ACCEPTING);
    } else {
      setCheckedStop(false);
      handleCloseModalConfirm();
      handlePauseTimeSlots([], false);
    }
  };

  // Handle add new time slot
  const handleSubmitFormTimeSlot = async () => {
    if (!orderType || !venueId) return;
    try {
      setLoading(true);
      setLoadingForm(true);
      let messageToast = "";
      const values = form.getFieldsValue();
      const { startTime, endTime, partySize, priorityPass } = values;
      if (!startTime || !endTime || isEmpty(partySize)) {
        return;
      }

      const startTimeConverted = dayjs(startTime);
      const endTimeConverted = dayjs(endTime);

      const slotInterval = endTimeConverted.diff(startTimeConverted, "minutes");

      const newTimeSlot: TimeSlotRequest = {
        start_time: startTimeConverted.format("HH:mm:ss"),
        end_time: endTimeConverted.format("HH:mm:ss"),
        max_reservations: partySize,
        service_type: orderType,
        is_paused: partySize <= 0 ? true : false,
        slot_interval: slotInterval,
        priority_pass_slot: priorityPass || undefined,
      };

      const isAddTimeSlot = typeFormTimeSlot === "add";
      if (isAddTimeSlot) {
        const response = await addNewTimeSlot(venueId, newTimeSlot);
        if (response) {
          setTimeSlots((prev) => sortTimeSlots([...prev, response]));
        }
        messageToast = "venue.toast.save_capacity_success";
      } else {
        if (!selectedTimeSlot) return;
        Object.assign(newTimeSlot, {
          is_paused: selectedTimeSlot.is_paused,
        });
        await updateTimeSlot(venueId, selectedTimeSlot.id, newTimeSlot);
        fetchTimeSlots();
        messageToast = "venue.toast.update_capacity_success";
      }

      form.resetFields();
      setIsValidForm(false);
      setTypeFormTimeSlot("add");
      setSelectedTimeSlot(null);
      if (messageToast) {
        toast.success(t(messageToast));
      }
    } catch (error) {
      console.error("Error adding new time slot:", error);
    } finally {
      setLoading(false);
      setLoadingForm(false);
    }
  };

  // Handle update out of stock items
  const updateOutOfStock = async (
    menuItemRequest: MenuItemStockUpdateRequest
  ) => {
    try {
      await updateOutOfStockMenuItems(venueId, menuItemRequest);
    } catch (error) {
      console.error("Error update stock menu items:", error);
    }
  };

  // Handle out of stock change
  const handleOutOfStockChange = (value: string[]) => {
    setOutOfStockIds(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      updateOutOfStock({
        menu_item_ids: value,
      });
    }, 500);
  };

  // Handle confirm modal
  const handleConfirmModal = () => {
    const isPauseType =
      typeModalConfirm === MODAL_CONFIRM_TYPE.PAUSE_TIME_SLOTS ||
      typeModalConfirm === MODAL_CONFIRM_TYPE.RESUME_TIME_SLOTS;

    if (isPauseType && !selectedTimeSlot) return;

    if (typeModalConfirm === MODAL_CONFIRM_TYPE.STOP_ACCEPTING) {
      setCheckedStop(true);
      handlePauseTimeSlots([], true);
    }

    if (isPauseType) {
      const isPaused = typeModalConfirm === MODAL_CONFIRM_TYPE.PAUSE_TIME_SLOTS;
      handlePauseTimeSlots([selectedTimeSlot!], isPaused);
    }
    form.resetFields();
    setIsValidForm(false);
    handleCloseModalConfirm();
  };

  // Handle open modal status time slot
  const handleOpenModalStatusTimeSlot = (type: string, timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    if (
      type === MODAL_CONFIRM_TYPE.RESUME_TIME_SLOTS &&
      timeSlot.is_paused &&
      timeSlot.remaining_slots <= 0
    ) {
      setOpenModalSetLimit(true);
      return;
    }
    const messageConfirm =
      type === MODAL_CONFIRM_TYPE.PAUSE_TIME_SLOTS
        ? "venue.label.pause_time_slot_confirmation"
        : "venue.label.resume_time_slot_confirmation";
    setMessageModalConfirm(
      <Text className="text-sm-white !font-bold !text-center">
        {t(messageConfirm)}
      </Text>
    );
    setTypeModalConfirm(type);
  };

  // Handle update time slot
  const handleUpdateTimeSlot = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setTypeFormTimeSlot("edit");
    form.setFieldsValue({
      startTime: dayjs(timeSlot.start_time, "HH:mm:ss"),
      endTime: dayjs(timeSlot.end_time, "HH:mm:ss"),
      partySize: timeSlot.max_reservations,
      priorityPass: timeSlot?.priority_pass_slot ?? undefined,
    });
    checkFormValid();
  };

  // Handle close modal set limit capacity
  const handleCloseModalSetLimit = () => {
    setOpenModalSetLimit(false);
    setSelectedTimeSlot(null);
  };

  // Handle confirm set limit capacity
  const handleConfirmSetLimitCapacity = async (payload: number) => {
    try {
      setLoading(true);
      if (!selectedTimeSlot) return;
      await addNewLimitCapacity(venueId, selectedTimeSlot.id, {
        temporary_additional_limit: payload,
      });
      fetchTimeSlots();
      toast.success(t("venue.toast.save_capacity_success"));
    } catch (error) {
      console.error("Error setting limit capacity:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCapacityContent = (timeSlot: TimeSlot) => {
    if (timeSlot.remaining_slots <= 0) return t("general.full_label");
    const totalCurrent = Number(timeSlot.total_current_limit ?? 0);
    const remainingSlot = Number(timeSlot.remaining_slots ?? 0);
    const maxReservations = Number(timeSlot.max_reservations ?? 0);

    const currentFilled = totalCurrent - remainingSlot;

    const base = `${currentFilled}/${timeSlot.total_current_limit}${labelByOrderType.capacityUnit}`;
    const additional = timeSlot.temporary_additional_limit
      ? `（${maxReservations}）`
      : "";

    return base + additional;
  };

  // Define column time slots setting
  const timeSlotsSettingColumn: ColumnsType<TimeSlot> = [
    {
      title: t("venue.label.time_slots_table_label"),
      key: "time_slot",
      render: (_, record) => (
        <Text className="text-sm-white">
          {formatTimeSlotLabel(record.start_time, record.end_time)}
        </Text>
      ),
    },
    {
      title: t("venue.label.priority_pass_table_header"),
      key: "priority_pass",
      align: "center",
      width: "40px",
      render: (_, record) => (
        <div className="flex-row-center">
          {record.priority_pass_slot && record.priority_pass_slot > 0 ? (
            <IconPriorityPass className="!text-white !w-[22px] !h-[22px] !min-w-[22px] !min-h-[22px]" />
          ) : (
            <></>
          )}
        </div>
      ),
    },
    {
      title: labelByOrderType.capacityLabel,
      key: "party_size",
      align: "center",
      width: "60px",
      render: (_, record) => renderCapacityContent(record),
    },
    {
      title: t("venue.label.action_label"),
      key: "action",
      width: "80px",
      render: (_, record) => (
        <div className="flex-row-center gap-[10px]">
          <Button
            disabled={loading}
            className="flex-row-center !bg-transparent !border-none !p-0 !outline-none"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenModalStatusTimeSlot(
                record.is_paused
                  ? MODAL_CONFIRM_TYPE.RESUME_TIME_SLOTS
                  : MODAL_CONFIRM_TYPE.PAUSE_TIME_SLOTS,
                record
              );
            }}
          >
            {record.is_paused ? (
              <IconResume className="w-[22px] h-[22px] min-w-[22px] min-h-[22px]" />
            ) : (
              <IconPause className="w-[22px] h-[22px] min-w-[22px] min-h-[22px]" />
            )}
          </Button>
          <Button
            onClick={(event) => handleOpenDeleteTimeSlot(event, record)}
            className="flex-row-center !bg-transparent !border-none !p-0 !outline-none"
            disabled={loading}
          >
            <IconDeleteRed className="w-[22px] h-[22px] min-w-[22px] min-h-[22px]" />
          </Button>
        </div>
      ),
      align: "center",
    },
  ];

  return (
    <>
      <Spin
        spinning={loading}
        size="large"
        className="!w-full !h-full [&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
        wrapperClassName="[&_.ant-spin]:!max-h-[100%]"
      >
        <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
          {/* Top navigation bar */}
          <TopNavigationBar
            title={t("venue.title.capacity_control_title")}
            onBack={() => navigate(`/${ROUTE_PATH.VENUE.DASHBOARD}`)}
          />

          {/* Capacity Control Content */}
          <div className="flex flex-col w-full h-full px-4 mt-4 gap-3 scrollbar-hidden overflow-y-auto scroll-smooth pb-[45px]">
            <div className="!w-full !flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("order.label.order_method_label")}
              </Text>
              <SelectInput
                placeholder={t("order.label.order_method_label")}
                size="large"
                className="!text-white placeholder-fix !h-[48px]"
                options={orderTypeOptions}
                popupClassName="!bg-[var(--background-color)]"
                style={{ width: "100%", font: "inherit" }}
                rootClassName="custom-select"
                value={orderType}
                onChange={(val) => {
                  form.resetFields();
                  setIsValidForm(false);
                  setOrderType(val as OrderTypeEnum);
                }}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Text className="text-xs-white !font-bold !py-1">
                  {t("venue.label.time_slots_setting_label")}
                </Text>

                <BaseCardInfo>
                  <Table
                    dataSource={timeSlots}
                    columns={timeSlotsSettingColumn}
                    pagination={false}
                    rowKey={(record) => record.id}
                    bordered={false}
                    size="small"
                    className="!w-full custom-receipt-table"
                    summary={() => null}
                    locale={{
                      emptyText: (
                        <Empty className="text-sm-white" description={false}>
                          {t("general.no_data")}
                        </Empty>
                      ),
                    }}
                    onRow={(record) => ({
                      onClick: () => handleUpdateTimeSlot(record),
                    })}
                  />
                </BaseCardInfo>
              </div>

              <Form
                form={form}
                name="timeSlot"
                layout="vertical"
                requiredMark={false}
                className="!w-full !flex !flex-col !gap-4"
                onFinish={handleSubmitFormTimeSlot}
                onFieldsChange={checkFormValid}
                disabled={loading}
              >
                <div className="flex flex-row gap-2 w-full">
                  <Form.Item
                    name="startTime"
                    label={
                      <Text className="text-xs-white !font-bold !m-0">
                        {t("venue.label.start_time_label")}
                      </Text>
                    }
                    className="form-item-error-explanation !flex-1 !m-0"
                    rules={[{ validator: validateStartTime(form) }]}
                  >
                    <TimePickerInput
                      suffixIcon={null}
                      className="time-picker-custom"
                      minuteStep={1}
                      disabled={loading}
                      inputReadOnly={true}
                      onChange={() => {
                        const endTimeHasError =
                          form.getFieldError("endTime").length > 0;
                        if (endTimeHasError) {
                          form.validateFields(["endTime"]);
                        }
                        form.validateFields(["startTime"]);
                      }}
                      onCalendarChange={(value) => {
                        form.setFieldValue("startTime", value);
                        const endTimeHasError =
                          form.getFieldError("endTime").length > 0;
                        if (endTimeHasError) {
                          form.validateFields(["endTime"]);
                        }
                        form.validateFields(["startTime"]);
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="endTime"
                    label={
                      <Text className="text-xs-white !font-bold !m-0">
                        {t("venue.label.end_time_label")}
                      </Text>
                    }
                    className="form-item-error-explanation !flex-1 !m-0"
                    rules={[{ validator: validateEndTime(form) }]}
                  >
                    <TimePickerInput
                      suffixIcon={null}
                      className="time-picker-custom"
                      minuteStep={1}
                      disabled={loading}
                      inputReadOnly={true}
                      onChange={() => {
                        const startTimeHasError =
                          form.getFieldError("startTime").length > 0;
                        if (startTimeHasError) {
                          form.validateFields(["startTime"]);
                        }
                        form.validateFields(["endTime"]);
                      }}
                      onCalendarChange={(value) => {
                        form.setFieldValue("endTime", value);
                        const startTimeHasError =
                          form.getFieldError("startTime").length > 0;
                        if (startTimeHasError) {
                          form.validateFields(["startTime"]);
                        }
                        form.validateFields(["endTime"]);
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="partySize"
                    className="form-item-error-explanation !w-15 !m-0"
                    label={
                      <Text className="text-xs-white !font-bold !m-0">
                        {labelByOrderType.capacityLabel}
                      </Text>
                    }
                    rules={getCapacityRules(false)}
                    validateTrigger="onChange"
                    validateFirst={true}
                  >
                    <TextInput
                      placeholder="--"
                      size="large"
                      className="input-center-custom !text-[14px]"
                      inputMode="decimal"
                      maxLength={2}
                      disabled={loading}
                      onChange={() => {
                        form
                          .validateFields(["partySize"])
                          .then(() => {
                            const priorityPassValue =
                              form.getFieldValue("priorityPass");
                            if (priorityPassValue) {
                              form.validateFields(["priorityPass"]);
                            }
                          })
                          .catch(() => {});
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="priorityPass"
                    className="form-item-error-explanation !w-15 !m-0"
                    label={
                      <Text className="text-xs-white !font-bold !m-0">
                        {t("venue.label.priority_pass_table_label")}
                      </Text>
                    }
                    rules={getPriorityPassRules(false, form)}
                    validateTrigger="onChange"
                    dependencies={["partySize"]}
                  >
                    <TextInput
                      placeholder="--"
                      size="large"
                      className="input-center-custom !text-[14px]"
                      inputMode="decimal"
                      maxLength={2}
                      disabled={loading}
                      onChange={() => {
                        form
                          .validateFields(["partySize"])
                          .then(() => {
                            form.validateFields(["priorityPass"]);
                          })
                          .catch(() => {});
                      }}
                    />
                  </Form.Item>
                </div>

                <Button
                  type="text"
                  htmlType="submit"
                  className={`!min-h-10 !h-10 !max-h-10 !flex-1 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
                    isValidForm
                      ? "!bg-[#666666] !text-white"
                      : "button-disabled"
                  }`}
                  disabled={loading || !isValidForm}
                  loading={loadingForm}
                >
                  <Text className="text-sm-white">
                    {t(
                      typeFormTimeSlot === "add"
                        ? "venue.label.add_time_slot_label"
                        : "general.edit_label"
                    )}
                  </Text>
                </Button>
              </Form>

              <div className="flex flex-col gap-2">
                <Text className="text-xs-white !font-bold !py-1">
                  {t("venue.label.out_of_stock_label")}：
                </Text>

                <div className="form-item-error-explanation [&_.ant-select-selection-wrap]:!pr-4 [&_.ant-select-selection-overflow]:!py-[10px] multiple-select-custom [&_.ant-select-selection-overflow]:!gap-1">
                  <SelectInput
                    placeholder={t("venue.label.out_of_stock_placeholder")}
                    className="!w-full !text-white !bg-[#272525] !border-none !border-white !rounded-xl placeholder:!text-[#666666] min-h-[26px] !h-auto [&_.ant-select-selector]:!min-h-[48px] [&_.ant-select-selector]:!h-auto [&_.ant-select-selector]:!items-start [&_.ant-select-selector]:!px-3 [&_.ant-select-selection-search]:!m-0"
                    popupClassName="!bg-[#272525]"
                    rootClassName="custom-select"
                    size="large"
                    mode="multiple"
                    options={menuItemOptions}
                    value={outOfStockIds}
                    onChange={(value) =>
                      handleOutOfStockChange(value as string[])
                    }
                  />
                </div>
              </div>

              <CheckboxInputFull
                label={labelButtonStopAccepting}
                checked={checkedStop}
                onChange={handleCheckedStop}
                checkboxClassName="checkbox-danger-custom"
                disabled={loading || loadingTimeSlot}
              />
            </div>
          </div>
        </div>
      </Spin>

      <DeleteConfirmationModal
        isOpen={openDeleteModal}
        onClose={handleCloseModalDelete}
        handleConfirm={handleConfirmDeleteItem}
        confirmationText={t("venue.label.time_slots_delete_confirmation")}
        loading={loading}
      />

      <BaseModalConfirm
        isOpen={!!typeModalConfirm && !!messageModalConfirm}
        message={messageModalConfirm}
        onClose={handleCloseModalConfirm}
        handleConfirm={handleConfirmModal}
        cancelText={labelButtonModal.cancel}
        confirmText={labelButtonModal.confirm}
        classNameButtonContainer="!flex-row-reverse"
        loading={loading}
        icon={
          <IconWarning className="!text-white !w-[96px] !h-[96px] !min-w-[96px] !min-h-[96px]" />
        }
      />

      <SetLimitCapacityModal
        isOpen={openModalSetLimit}
        timeSlot={selectedTimeSlot}
        onClose={handleCloseModalSetLimit}
        loading={loading}
        handleConfirm={handleConfirmSetLimitCapacity}
        orderType={orderType}
      />
    </>
  );
};

export default CapacityControlPage;
