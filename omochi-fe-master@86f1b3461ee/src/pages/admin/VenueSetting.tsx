import { useCallback, useLayoutEffect, useMemo, useState, memo } from "react";
import { Form, Typography, Button, Checkbox, TimePicker, Spin } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate } from "react-router-dom";
import TextInput from "@/components/common/form/TextInput";
import SelectInput from "@/components/common/form/SelectInput";
import TextAreaInput from "@/components/common/form/TextAreaInput";
import UploadInput from "@/components/common/form/UploadInput";
import CheckboxInput from "@/components/common/form/CheckboxInput";
import QRCodeStyling from "qr-code-styling";
import {
  OrderTypeEnum,
  VenueRequest,
  PaymentMethodEnum,
  VenuesRetrieveMultilingualEnum,
  AreasPrefecturesRetrieveMultilingualEnum,
} from "@/generated/api";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  getDetailVenue,
  updateVenue,
  createStripeConnectAccount,
  createOnboardingLink,
} from "@/api/venue";
import {
  setLoading as setVenueLoading,
  setVenueDetail,
} from "@/store/slices/venueSlice";
import { ROUTE_PATH, StripeAccountStatusEnum } from "@/utils/constants";
import {
  IconDownload,
  IconCreditComponent,
  IconSave,
  IconRestPayment,
  IconClockSuffix,
  IconArrowRight,
} from "@/assets/icons";
import { useTranslation } from "react-i18next";
import { getPhoneRules } from "@/rules/auth";
import { toast } from "react-toastify";
import {
  getNameVenueRules,
  getAddressVenueRules,
  getNearestStationVenueRules,
  getGenreVenueRules,
  getOpeningHoursVenueRules,
  getOrderTypesVenueRules,
  getPaymentMethodsRules,
} from "@/rules/venue";
import {
  formatChangePhoneNumberJP,
  formatPhoneNumberJP,
  handleDropdownVisibleChange,
  isEmpty,
} from "@/utils/helper";
import { getListPrefectures } from "@/api/areas";
import { setPrefectures } from "@/store/slices/areaSlice";
import { Prefecture } from "@/types/areas";
import {
  getGenreOptions,
  getVenueTagOptions,
} from "@/utils/translationHelpers";
import {
  convertJapaneseGenreToEnglishValue,
  convertJapaneseVenueTagsToEnglish,
} from "@/utils/translationMapping";

const { Text } = Typography;

interface VenueFormValues {
  name: string;
  address: string;
  opening_hours: [string, string];
  genre: string;
  description: string;
  announcement: string;
  additional_info: string[];
  payment_methods: string[];
  reception_types: string[];
  logo: File | null;
  phone_number: string;
  email: string;
  website: string;
  is_active: boolean;
  qr_code: string;
  buffer_time: string;
  enable_eat_in: boolean;
  enable_take_out: boolean;
  nearest_station: string;
}

/**
 * Venue setting page component for managing venue configuration
 *
 * Features:
 * - Venue information management
 * - Payment method configuration
 * - Stripe account setup
 * - QR code generation and download
 * - Opening hours management
 *
 * @returns Venue setting page component
 */
const VenueSetting = memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadOnboarding, setLoadOnboarding] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | undefined>(
    undefined
  );
  const receptionTypes = Form.useWatch("reception_types", form);
  const disableEatinPreorder = Form.useWatch("disable_eatin_preorder", form);
  const disableEatinReservation = Form.useWatch(
    "disable_eatin_reservation",
    form
  );
  const [venueId, setVenueId] = useState<string | undefined>(undefined);
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { loading: venueLoading, venueDetail } = useSelector(
    (state: RootState) => state.venue
  );
  const { prefectures } = useSelector((state: RootState) => state.areas);

  // Memoize Stripe connection status
  const linkedStripe = useMemo(
    () =>
      venueDetail?.onboarding_complete ||
      venueDetail?.stripe_account_status === StripeAccountStatusEnum.Verified,
    [venueDetail?.onboarding_complete, venueDetail?.stripe_account_status]
  );

  // Memoize website URL
  const websiteUrl = useMemo(() => {
    const currentOrigin = window.location.origin;
    return `${currentOrigin}/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}`;
  }, [venueId]);

  // Memoize station options
  const stationOptions = useMemo(() => {
    return prefectures?.flatMap((prefecture) => {
      return prefecture.stations.map((station) => ({
        value: station,
        label: station,
      }));
    });
  }, [prefectures]);

  const JapaneseGenreOptions = useMemo(() => {
    return getGenreOptions(true);
  }, []);

  const JapaneseVenueTagOptions = useMemo(() => {
    return getVenueTagOptions(true);
  }, []);

  /**
   * Handles navigation back to dashboard
   */
  const handleBack = useCallback(() => {
    navigate(`/${ROUTE_PATH.VENUE.DASHBOARD}`);
  }, [navigate]);

  /**
   * Fetches venue detail information from API
   */
  const fetchVenueDetail = useCallback(async () => {
    const venueId = (user?.venue_roles[0] as unknown as { venue_id: string })
      .venue_id;
    if (!venueId) {
      return;
    }
    try {
      const response = await getDetailVenue(
        venueId as string,
        VenuesRetrieveMultilingualEnum.False
      );
      if (response) {
        dispatch(setVenueDetail(response));
        const receptionTypes = [
          (response?.enable_eat_in || response?.enable_reservation) &&
            OrderTypeEnum.DineIn,
          response?.enable_take_out && OrderTypeEnum.Takeout,
        ].filter(Boolean);

        const paymentMethods = [
          response?.enable_cash_payment && PaymentMethodEnum.Cash,
          response?.enable_online_payment && PaymentMethodEnum.Online,
        ].filter(Boolean);

        const openingTime = response?.opening_time;
        const closingTime = response?.closing_time;

        const openingHours = [
          openingTime ? dayjs(openingTime, "HH:mm:ss") : undefined,
          closingTime ? dayjs(closingTime, "HH:mm:ss") : undefined,
        ];

        const additonalInfoMapped = response?.additional_info
          ? response?.additional_info.split(",")
          : [];

        setPreviewImage(response?.logo || "");

        form.setFieldsValue({
          name: response?.name,
          address: response?.address,
          phone_number: formatPhoneNumberJP(response?.phone_number ?? ""),
          genre: response?.genre,
          description: response?.description,
          announcement: response?.announcement || "",
          additional_info: additonalInfoMapped,
          reception_types: receptionTypes,
          payment_methods: paymentMethods,
          opening_hours: openingHours,
          nearest_station: response?.nearest_station,
          disable_eatin_preorder:
            !response?.enable_eat_in && response?.enable_reservation,
          disable_eatin_reservation:
            !response?.enable_reservation && response?.enable_eat_in,
        });
      }
    } catch (error) {
      console.error("Error fetching venue detail:", error);
    }
  }, [user?.venue_roles, dispatch, form]);

  /**
   * Fetches prefecture stations from API and updates Redux store
   */
  const fetchPrefectureStations = useCallback(async () => {
    try {
      const response = await getListPrefectures(
        AreasPrefecturesRetrieveMultilingualEnum.False
      );
      dispatch(setPrefectures(response as unknown as Prefecture[]));
    } catch (error) {
      console.error("Error fetching prefecture stations:", error);
    }
  }, [dispatch]);

  /**
   * Fetches all initial data (venue detail and prefectures)
   */
  const fetchData = useCallback(async () => {
    try {
      const venueId = (user?.venue_roles[0] as unknown as { venue_id: string })
        .venue_id;
      if (!venueId) {
        return;
      }

      setVenueId(venueId);

      dispatch(setVenueLoading(true));
      await Promise.allSettled([fetchVenueDetail(), fetchPrefectureStations()]);
    } catch (err) {
      console.error("Error fetching initial data:", err);
    } finally {
      dispatch(setVenueLoading(false));
    }
  }, [dispatch, user, fetchVenueDetail, fetchPrefectureStations]);

  /**
   * Handles form submission to update venue details with spam prevention
   * @param values - Form values from the venue settings form
   */
  const handleUpdateVenue = useCallback(
    async (values: VenueFormValues) => {
      try {
        if (loading) return; // Prevent spam submissions
        setLoading(true);

        const openingHoursFormated = values.opening_hours?.map((timeStr) =>
          timeStr ? dayjs(timeStr).format("HH:mm:ss") : null
        );

        // Convert Japanese genre to English genre for API
        const genreEn =
          convertJapaneseGenreToEnglishValue(values.genre) || undefined;

        // Convert Japanese venue tags to English venue tags for API
        const additionalInfoEn = convertJapaneseVenueTagsToEnglish(
          values.additional_info
        );

        const data: VenueRequest = {
          name: values.name,
          address: values.address,
          description: values.description,
          announcement: values.announcement || "",
          phone_number: values.phone_number.replace(/-/g, ""),
          email: values?.email,
          website: websiteUrl,
          opening_time: openingHoursFormated[0],
          closing_time: openingHoursFormated[1],
          is_active: values.is_active,
          enable_eat_in:
            !disableEatinPreorder &&
            values.reception_types?.includes(OrderTypeEnum.DineIn),
          enable_reservation:
            !disableEatinReservation &&
            values.reception_types?.includes(OrderTypeEnum.DineIn),
          qr_code: values.qr_code,
          enable_cash_payment: values.payment_methods.includes(
            PaymentMethodEnum.Cash
          ),
          enable_online_payment: values.payment_methods.includes(
            PaymentMethodEnum.Online
          ),
          additional_info: values.additional_info.join(","),
          additional_info_en: additionalInfoEn.join(","),
          genre: values.genre,
          genre_en: genreEn,
          enable_take_out: values.reception_types?.includes(
            OrderTypeEnum.Takeout
          ),
          nearest_station: values.nearest_station,
        };

        if (values.logo instanceof File) {
          Object.assign(data, {
            logo: values.logo,
          });
        }

        await updateVenue(venueId as string, data);
        toast.success(t("venue.toast.update_venue_success"));
      } catch (error) {
        console.error("Error updating venue:", error);
      } finally {
        await fetchVenueDetail();
        setLoading(false);
      }
    },
    [
      loading,
      websiteUrl,
      disableEatinPreorder,
      venueId,
      t,
      fetchVenueDetail,
      disableEatinReservation,
    ]
  );

  /**
   * Handles QR code download with venue website URL
   */
  const handleDownloadQR = useCallback(() => {
    const qrCode = new QRCodeStyling({
      width: 300,
      height: 300,
      type: "canvas",
      data: websiteUrl,
      dotsOptions: {
        color: "#000000",
        type: "rounded",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersSquareOptions: {
        type: "extra-rounded",
      },
      cornersDotOptions: {
        type: "dot",
      },
    });

    qrCode.download({ name: "store-qr", extension: "png" });
  }, [websiteUrl]);

  /**
   * Handles phone number change with Japanese formatting
   * @param value - Raw phone number input
   */
  const handlePhoneNumberChange = useCallback(
    (value: string) => {
      const digits = value.replace(/\D/g, "");

      if (digits.length > 11) return digits;

      const formatted = formatChangePhoneNumberJP(digits);
      form.setFieldValue("phone_number", formatted);
      form.validateFields(["phone_number"]);
    },
    [form]
  );

  /**
   * Creates Stripe onboarding link and redirects user
   */
  const handleOnboardingLink = useCallback(async () => {
    if (linkedStripe || loadOnboarding) return; // Prevent spam and if already linked
    try {
      setLoadOnboarding(true);
      const response = await createOnboardingLink(venueId as string);
      if (!isEmpty(response) && response?.url) {
        window.location.href = response.url;
        return;
      }
    } catch (error) {
      console.error("Error creating onboarding link:", error);
    } finally {
      setLoadOnboarding(false);
    }
  }, [linkedStripe, loadOnboarding, venueId, t]);

  // Handle mutual exclusive checkbox change
  const handleMutualExclusiveCheckboxChange = useCallback(
    (e: CheckboxChangeEvent, currentField: string, oppositeField: string) => {
      const { checked } = e.target;
      if (checked) {
        // If checking current option, uncheck the opposite option
        form.setFieldValue(oppositeField, false);
      }
      form.setFieldValue(currentField, checked);
    },
    []
  );

  /**
   * Handles Stripe account creation and setup with spam prevention
   */
  const handleCheckStripeAccount = useCallback(async () => {
    if (linkedStripe || loading) return; // Prevent spam and if already linked
    try {
      setLoading(true);
      if (
        venueDetail?.stripe_account_status !== StripeAccountStatusEnum.Pending
      ) {
        await handleOnboardingLink();
      } else {
        const account = await createStripeConnectAccount(venueId as string);
        if (account?.account_id) {
          await handleOnboardingLink();
        }
      }
    } catch (error) {
      console.error("Error checking Stripe account:", error);
    } finally {
      setLoading(false);
    }
  }, [
    linkedStripe,
    loading,
    venueDetail?.stripe_account_status,
    handleOnboardingLink,
    venueId,
    t,
  ]);

  // Handle navigate to order questions
  const handleNavigateOrderQuestions = useCallback(() => {
    navigate(
      `/${ROUTE_PATH.VENUE.DASHBOARD}/${ROUTE_PATH.VENUE.ORDER_QUESTIONS}`
    );
  }, [navigate]);

  useLayoutEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Spin
      spinning={venueLoading || loading}
      size="large"
      wrapperClassName="[&_.ant-spin]:!max-h-[100dvh]"
      className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
    >
      <div className="!flex !flex-col !items-center !h-[100dvh] !bg-[#272525] !w-full !py-5">
        {/* Top Navigation Bar */}
        <TopNavigationBar
          title={t("venue.title.venue_setting_title")}
          onBack={handleBack}
          hasRightIcons={false}
        />

        {/* Form Container */}
        <div className="!w-full !flex !flex-col !gap-6 !mt-4 !px-4 !flex-1 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth pb-[55px]">
          <Form
            form={form}
            name="venueSettings"
            onFinish={handleUpdateVenue}
            layout="vertical"
            requiredMark={false}
            className="!w-full !flex !flex-col !gap-6"
          >
            {/* Name */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("order.label.store_name_label")} *
              </Text>
              <Form.Item
                name="name"
                className="form-item-error-explanation"
                rules={getNameVenueRules()}
              >
                <TextInput
                  placeholder={t("order.label.store_name_label")}
                  size="large"
                  disabled={loading}
                  minLength={1}
                  maxLength={40}
                  className="based-input-text"
                />
              </Form.Item>
            </div>

            {/* Address */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("auth.register.address")} *
              </Text>
              <Form.Item
                name="address"
                className="form-item-error-explanation"
                rules={getAddressVenueRules()}
              >
                <TextInput
                  placeholder={t("auth.register.address")}
                  size="large"
                  disabled={loading}
                  maxLength={255}
                  className="based-input-text"
                />
              </Form.Item>
            </div>

            {/* Neartest station */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.neartest_station_label")} *
              </Text>
              <Form.Item
                name="nearest_station"
                className="form-item-error-explanation"
                rules={getNearestStationVenueRules()}
              >
                <SelectInput
                  placeholder={t("venue.label.neartest_station_label")}
                  size="large"
                  disabled={loading}
                  options={stationOptions}
                  className="!text-white !bg-[#272525] !h-[48px] !border-[0px] !border-white !rounded-[12px] !placeholder:!text-[#666666]"
                  popupClassName="!bg-[#272525]"
                  rootClassName="custom-select"
                  showSearch
                />
              </Form.Item>
            </div>

            {/* Phone */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.phone_number_venue_label")} *
              </Text>
              <Form.Item
                name="phone_number"
                className="form-item-error-explanation"
                rules={getPhoneRules()}
              >
                <TextInput
                  placeholder={t("venue.label.phone_number_venue_label")}
                  size="large"
                  disabled={loading}
                  maxLength={13}
                  inputMode="decimal"
                  className="based-input-text"
                  onChange={handlePhoneNumberChange}
                />
              </Form.Item>
            </div>

            {/* Opening hour */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.opening_hours_label")} *
              </Text>
              <Form.Item
                name="opening_hours"
                className="form-item-error-explanation"
                rules={getOpeningHoursVenueRules()}
              >
                <TimePicker.RangePicker
                  format="HH：mm"
                  separator="～"
                  className="custom-timepicker-input [&_.ant-picker-input]:!border-none [&_.ant-picker-separator]:!text-white"
                  popupClassName="time-picker-custom-popup"
                  placeholder={[
                    t("venue.label.start_time_label"),
                    t("venue.label.end_time_label"),
                  ]}
                  disabled={loading}
                  inputReadOnly={true}
                  suffixIcon={
                    <IconClockSuffix className="!w-5 !h-5 !min-w-5 !min-h-5 !text-white" />
                  }
                  onChange={(times) => {
                    if (times) {
                      const [start, end] = times;
                      form.setFieldValue("opening_hours", [start, end]);
                    } else {
                      form.setFieldValue("opening_hours", ["", ""]);
                    }
                    form.validateFields(["opening_hours"]);
                  }}
                  onCalendarChange={(times) => {
                    if (times) {
                      const [start, end] = times;
                      form.setFieldValue("opening_hours", [start, end]);
                    } else {
                      form.setFieldValue("opening_hours", ["", ""]);
                    }
                    form.validateFields(["opening_hours"]);
                  }}
                  onOpenChange={handleDropdownVisibleChange}
                />
              </Form.Item>
            </div>

            {/* Genre */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.genre_label")} *
              </Text>
              <Form.Item
                name="genre"
                className="form-item-error-explanation"
                rules={getGenreVenueRules()}
              >
                <SelectInput
                  placeholder={t("venue.label.genre_placeholder")}
                  size="large"
                  disabled={loading}
                  options={JapaneseGenreOptions.map((genre) => ({
                    value: genre,
                    label: genre,
                  }))}
                  className="!text-white !bg-[#272525] !h-[48px] !border-[0px] !border-white !rounded-[12px] !placeholder:!text-[#666666]"
                  popupClassName="!bg-[#272525]"
                  rootClassName="custom-select"
                  showSearch
                />
              </Form.Item>
            </div>

            {/* Description */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.description_venue_label")}
              </Text>
              <Form.Item
                name="description"
                className="form-item-error-explanation"
              >
                <TextAreaInput
                  placeholder={t("venue.label.description_venue_placeholder")}
                  disabled={loading}
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  className="textarea-dynamic !border-white scrollbar-hidden"
                  disableTrim
                />
              </Form.Item>
            </div>

            {/* Announcement */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.announcement_venue_label")}
              </Text>
              <Form.Item
                name="announcement"
                className="form-item-error-explanation"
              >
                <TextAreaInput
                  placeholder={t("venue.label.announcement_venue_placeholder")}
                  disabled={loading}
                  maxLength={500}
                  autoSize={{ minRows: 3, maxRows: 10 }}
                  className="textarea-dynamic !border-white scrollbar-hidden"
                  disableTrim
                />
              </Form.Item>
            </div>

            {/* Additional infors */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.setting_additional_info_label")}
              </Text>
              <Form.Item
                name="additional_info"
                className="form-item-error-explanation [&_.ant-select-selection-wrap]:!pr-4 [&_.ant-select-selection-overflow]:!py-[10px] multiple-select-custom [&_.ant-select-selection-overflow]:!gap-1"
              >
                <SelectInput
                  placeholder={t(
                    "venue.label.setting_additional_info_placeholder"
                  )}
                  size="large"
                  mode="multiple"
                  options={JapaneseVenueTagOptions.map((tag) => ({
                    value: tag,
                    label: tag,
                  }))}
                  className="!w-full !text-white !bg-[#272525] !border-none !border-white !rounded-xl placeholder:!text-[#666666] min-h-[26px] !h-auto [&_.ant-select-selector]:!min-h-[48px] [&_.ant-select-selector]:!h-auto [&_.ant-select-selector]:!items-start [&_.ant-select-selector]:!px-3 [&_.ant-select-selection-search]:!m-0"
                  popupClassName="!bg-[#272525]"
                  rootClassName="custom-select"
                />
              </Form.Item>
            </div>

            {/* Payment method */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("order.label.payment_method_label")} *
              </Text>
              <Form.Item
                name="payment_methods"
                initialValue={PaymentMethodEnum.Cash}
                className="form-item-error-explanation"
                rules={getPaymentMethodsRules()}
              >
                <Checkbox.Group className="!w-full !flex !flex-row !gap-2">
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.payment_methods !==
                      currentValues.payment_methods
                    }
                  >
                    {({ getFieldValue }) => {
                      const currentValue = getFieldValue("payment_methods");
                      return (
                        <>
                          <CheckboxInput
                            className="!rounded-xl !w-full !h-full flex-row-between !flex-row-reverse !px-3 !m-0 [&_.ant-checkbox-wrapper]:!w-full [&_.ant-checkbox-label]:!w-full [&_.ant-checkbox-label]:!p-0 checkbox-base-custom"
                            label={t("order.label.payment_in_store_label")}
                            value={PaymentMethodEnum.Cash}
                            icon={
                              <IconRestPayment className="!w-[22px] !h-[22px] !min-w-[22px] !min-h-[22px] !text-white" />
                            }
                            checked={currentValue === PaymentMethodEnum.Cash}
                            disabled={loading}
                          />
                          <CheckboxInput
                            className={`!rounded-xl !w-full !h-full flex-row-between !flex-row-reverse !px-3 !m-0 [&_.ant-checkbox-wrapper]:!w-full [&_.ant-checkbox-label]:!w-full [&_.ant-checkbox-label]:!p-0 checkbox-base-custom ${
                              !linkedStripe
                                ? "button-disabled  [&.ant-radio-button-wrapper-checked]:!border-[var(--text-disabled-color)]"
                                : "!bg-[#272525] !border-white !text-white  [&.ant-radio-button-wrapper-checked]:!border-white"
                            }`}
                            label={t("order.label.payment_credit_label")}
                            value={PaymentMethodEnum.Online}
                            icon={
                              <IconCreditComponent className="!w-[22px] !h-[22px] !min-w-[22px] !min-h-[22px] !text-white" />
                            }
                            checked={
                              linkedStripe &&
                              currentValue === PaymentMethodEnum.Online
                            }
                            disabled={!linkedStripe || loading}
                          />
                        </>
                      );
                    }}
                  </Form.Item>
                </Checkbox.Group>
              </Form.Item>
              <div className="w-full flex-col-center gap-2">
                <Text className="!text-white !text-[10px] !leading-[1.2em] !text-center !font-['Noto_Sans_JP']">
                  {t("venue.label.notice_stripe_link_label")}
                </Text>

                <Button
                  loading={loadOnboarding}
                  disabled={linkedStripe || loading}
                  className={`!relative !w-full !h-[48px] !border-none !outline-none flex-row-center !gap-1 !rounded-xl ${
                    linkedStripe
                      ? "button-disabled"
                      : "!bg-[var(--background-teal-color)] "
                  }`}
                  onClick={handleCheckStripeAccount}
                >
                  <Text className="!text-center text-sm-white !font-bold">
                    {t("venue.label.stripe_link_label")}
                  </Text>
                  <IconCreditComponent className="!w-[22px] !h-[22px] !min-w-[22px] !min-h-[22px] !text-white !absolute !right-3" />
                </Button>
              </div>
            </div>

            {/* Order types */}
            <div className="!flex !flex-col !gap-2 !w-full">
              <div className="!flex !items-center !gap-2 !w-full">
                <Text className="text-xs-white !font-bold">
                  {t("order.label.order_method_label_other")} *
                </Text>
              </div>
              <Form.Item
                name="reception_types"
                initialValue={[]}
                className="form-item-error-explanation !w-full"
                rules={getOrderTypesVenueRules()}
              >
                <Checkbox.Group className="!w-full !flex !flex-row !gap-2">
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.reception_types !==
                      currentValues.reception_types
                    }
                  >
                    <>
                      <CheckboxInput
                        label={t("order.label.dine_in_label")}
                        value={OrderTypeEnum.DineIn}
                        className="!w-full !h-full flex-row-between !flex-row-reverse !px-3 !m-0 [&_.ant-checkbox-wrapper]:!w-full [&_.ant-checkbox-label]:!w-full [&_.ant-checkbox-label]:!p-0 checkbox-base-custom"
                        disabled={loading}
                      />
                      <CheckboxInput
                        label={t("order.label.takeout_label")}
                        value={OrderTypeEnum.Takeout}
                        className="!w-full !h-full flex-row-between !flex-row-reverse !px-3 !m-0 [&_.ant-checkbox-wrapper]:!w-full [&_.ant-checkbox-label]:!w-full [&_.ant-checkbox-label]:!p-0 checkbox-base-custom"
                        disabled={loading}
                      />
                    </>
                  </Form.Item>
                </Checkbox.Group>
              </Form.Item>

              {receptionTypes?.includes(OrderTypeEnum.DineIn) && (
                <div className="!flex !flex-col gap-2 !border-[1px] !border-white !rounded-xl !mt-4 py-2">
                  <Form.Item
                    name="disable_eatin_preorder"
                    initialValue={false}
                    className="form-item-error-explanation !w-full"
                    valuePropName="checked"
                  >
                    <CheckboxInput
                      label={t("venue.label.disable_eatin_preorder")}
                      value={disableEatinPreorder}
                      className="!w-full !h-full flex-row-between !flex-row-reverse !px-3 !m-0 [&_.ant-checkbox-wrapper]:!w-full [&_.ant-checkbox-label]:!w-full [&_.ant-checkbox-label]:!p-0 checkbox-base-custom"
                      disabled={loading}
                      containerClassName="!border-none !h-[auto] !py-1"
                      onChange={(e) =>
                        handleMutualExclusiveCheckboxChange(
                          e,
                          "disable_eatin_preorder",
                          "disable_eatin_reservation"
                        )
                      }
                    />
                  </Form.Item>
                  <Form.Item
                    name="disable_eatin_reservation"
                    initialValue={false}
                    className="form-item-error-explanation !w-full"
                    valuePropName="checked"
                  >
                    <CheckboxInput
                      label={t("venue.label.disable_eatin_reservation")}
                      value={disableEatinReservation}
                      className="!w-full !h-full flex-row-between !flex-row-reverse !px-3 !m-0 [&_.ant-checkbox-wrapper]:!w-full [&_.ant-checkbox-label]:!w-full [&_.ant-checkbox-label]:!p-0 checkbox-base-custom"
                      disabled={loading}
                      containerClassName="!border-none !h-[auto] !py-1"
                      onChange={(e) =>
                        handleMutualExclusiveCheckboxChange(
                          e,
                          "disable_eatin_reservation",
                          "disable_eatin_preorder"
                        )
                      }
                    />
                  </Form.Item>
                </div>
              )}
            </div>

            {/* Order questions */}
            <div className="!flex !flex-col !gap-2">
              <Button
                className={`!relative !w-full !h-[48px] !border-none !outline-none flex-row-center !gap-1 !rounded-xl !bg-[var(--tag-color)]`}
                onClick={handleNavigateOrderQuestions}
              >
                <Text className="!text-center text-sm-white !font-bold">
                  {t("question.setting_order_questions_label")}
                </Text>
                <IconArrowRight className="!w-[22px] !h-[22px] !min-w-[22px] !min-h-[22px] !text-white !absolute !right-3" />
              </Button>
            </div>

            {/* Logo */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.save_image_label")}
              </Text>
              <Form.Item name="logo" className="form-item-error-explanation">
                <UploadInput
                  disabled={loading}
                  previewImage={previewImage}
                  onPreviewImageChange={setPreviewImage}
                  onChange={(file) => form.setFieldValue("logo", file)}
                  uploadClassName="!aspect-[4/3] !w-full !bg-transparent [&_.ant-upload-select]:!w-full [&_.ant-upload-select]:!h-full [&_.ant-upload-list-item-container]:!w-full [&_.ant-upload-list-item]:!bg-[var(--background-color)] [&_.ant-upload]:!border-0 [&_.ant-upload-select-picture-card]:!border-0 [&_.ant-upload-select-picture-card]:!bg-transparent [&_.ant-upload-select-picture-card]:!w-full [&_.ant-upload-select-picture-card]:!m-0"
                  previewContainerClassName="!w-full !h-full !border-[1px] !border-white !rounded-[12px] !bg-[var(--background-color)] flex-row-center !overflow-hidden"
                  previewClassName="!w-full !max-w-full !object-cover"
                  uploadButtonClassName="!w-full !h-full !border-[1px] !border-white !rounded-[12px] !bg-[var(--background-color)] flex-col-center !gap-2"
                />
              </Form.Item>
            </div>

            {/* QR Code */}
            <div className="!flex !flex-col !gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.save_qr_code_label")}
              </Text>
              <div
                className="!w-full !h-[48px] !border-[1px] !border-white !rounded-[12px] !bg-[#272525] !flex !items-center !justify-between !px-4 !cursor-pointer"
                onClick={handleDownloadQR}
              >
                <span className="!text-white !text-[14px] !flex-1 !text-center">
                  {t("venue.label.download_qr_code_label")}
                </span>
                <IconDownload className="!w-[22px] !h-[22px] !min-w-[22px] !min-h-[22px] !text-white" />
              </div>
            </div>
          </Form>
        </div>

        {/* Bottom Save Button */}
        <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className="!w-full !h-10 !min-h-10 !max-h-10 !outline-none !bg-[var(--primary-color)] !border-none !rounded-[12px] flex-row-center !gap-2"
            onClick={() => form.submit()}
          >
            <IconSave className="!w-5 !h-5 !min-w-5 !min-h-5" />
            <Text className="text-sm-white">{t("general.edit_label")}</Text>
          </Button>
        </div>
      </div>
    </Spin>
  );
});

export default VenueSetting;
