import { Button, Typography } from "antd";
import { useState, useMemo, useEffect } from "react";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ROUTE_PATH,
  ORDER_TYPE_OPTIONS,
  OrderStatusEnum,
} from "@/utils/constants";
import { IconCartComponent } from "@/assets/icons";
import BaseCardInfo from "@/components/card/BaseCardInfo";
import { RootState } from "@/store";
import { useDispatch, useSelector } from "react-redux";
import {
  getLabelFromOptions,
  isEmpty,
  getRedirectPathFromSource,
  getTokyoNow,
} from "@/utils/helper";
import { createNewReservation } from "@/api/reservation";
import { clearCart, setOrderQuestionAnswers } from "@/store/slices/cartSlice";
import { useCookies } from "react-cookie";
import { OrderTypeEnum, ReservationRequest, LangEnum } from "@/generated/api";
import OrderQuestionsModal from "@/components/common/modal/OrderQuestionsModal";
import { getListOrderQuestions } from "@/api/venue";
import { VenueQuestion } from "@/generated/api";
import { convertAnswersToReservationQuestions } from "@/utils/helper";
import { useLanguage } from "@/hooks/useLanguage";

const { Text } = Typography;

type ReservationStatusType = ReservationRequest["status"];

const SeatReservationPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { id: venueId = "" } = useParams<{ id: string }>();
  const cartInfo = useSelector((state: RootState) => state.cart?.[venueId]);
  const orderSummary = cartInfo?.orderSummary || {};
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { currentLanguage } = useLanguage();

  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [cookies] = useCookies(["is-first-visit"]);
  const [openOrderQuestions, setOpenOrderQuestions] = useState(false);
  const [venueQuestions, setVenueQuestions] = useState<VenueQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const orderQuestionAnswers = cartInfo?.orderQuestionAnswers || {};

  const {
    storeName = "",
    orderType = "",
    guestCount = 0,
    timeSlotLabel = "",
    timeSlot = "",
  } = orderSummary;

  const orderInfoMap = [
    {
      id: 1,
      label: t("order.label.store_name_label"),
      value: storeName,
    },
    {
      id: 2,
      label: t("order.label.order_method_label"),
      value: t(getLabelFromOptions(ORDER_TYPE_OPTIONS, orderType) || ""),
    },
    {
      id: 3,
      label: t("order.label.time_specification_label"),
      value: timeSlotLabel,
    },
    {
      id: 4,
      label: t("order.label.guest_count_label"),
      value: `${guestCount}${t(
        "venue.label.party_size_table_label_eat_in_unit"
      )}`,
    },
  ];

  // Check if eatin reservation is disabled for current order type
  const isEatinReservationDisabled = useMemo(() => {
    return (
      orderSummary?.disable_eatin_reservation &&
      orderType === OrderTypeEnum.DineIn
    );
  }, [orderSummary?.disable_eatin_reservation, orderType]);

  const isDisabledButton =
    isEmpty(cartInfo?.orderSummary) ||
    !guestCount ||
    orderType === OrderTypeEnum.Takeout ||
    isEatinReservationDisabled;

  // Fetch venue questions for reservation (DineIn only)
  const fetchVenueQuestions = async (): Promise<VenueQuestion[]> => {
    // Gate: Only fetch questions for DineIn orders
    if (orderType !== OrderTypeEnum.DineIn) {
      return [];
    }
    setLoadingQuestions(true);
    try {
      const response = await getListOrderQuestions(venueId);
      return response?.questions || [];
    } catch (error) {
      console.error("Error fetching venue questions:", error);
      return [];
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Clear cart if eatin reservation is disabled
  useEffect(() => {
    if (isEatinReservationDisabled) {
      dispatch(clearCart(venueId));
    }
  }, [isEatinReservationDisabled, dispatch, venueId]);

  const handleReservation = async () => {
    // Prevent spam clicking
    if (loadingConfirm || loadingQuestions) return;

    if (!isAuthenticated) {
      const redirectUri = encodeURIComponent(
        getRedirectPathFromSource("reservation", venueId)
      );
      const targetPath = cookies["is-first-visit"]
        ? `/${ROUTE_PATH.USER.LOGIN}/?redirect_uri=${redirectUri}`
        : `/${ROUTE_PATH.INTRODUCTION}/?redirect_uri=${redirectUri}`;

      navigate(targetPath);
      return;
    }

    // Check if venue has order questions enabled (DineIn only)
    if (
      orderSummary?.enable_order_questions &&
      orderType === OrderTypeEnum.DineIn
    ) {
      // Fetch venue questions
      const questions = await fetchVenueQuestions();

      // If questions exist, show modal (regardless of whether user answers or not)
      if (questions && questions.length > 0) {
        setVenueQuestions(questions);
        setOpenOrderQuestions(true);
        return;
      }
    }

    // Proceed with reservation creation if no questions or questions are empty
    await proceedWithReservationCreation();
  };

  // Handle proceeding with reservation creation (extracted from handleReservation)
  const proceedWithReservationCreation = async (
    answers?: Record<string, string>
  ) => {
    try {
      const today = getTokyoNow().format("YYYY-MM-DD");

      const reservationData: ReservationRequest = {
        venue: venueId,
        time_slot: timeSlot,
        party_size: Number(guestCount),
        status: OrderStatusEnum.Pending as ReservationStatusType,
        date: today.toString(),
        lang: currentLanguage as LangEnum,
      };

      // Add venue questions if answers are provided
      if (answers && Object.keys(answers).length > 0) {
        reservationData.venue_questions = convertAnswersToReservationQuestions(
          answers,
          venueQuestions
        );
      }

      setLoadingConfirm(true);
      const response = await createNewReservation(reservationData);
      if (response) {
        dispatch(clearCart(venueId));
        navigate(`/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.ORDERS}`);
      }
    } catch (error) {
      console.error("Error creating reservation:", error);
    } finally {
      setLoadingConfirm(false);
    }
  };

  // Handle order questions modal submission with spam protection
  const handleOrderQuestionsSubmit = async (
    answers: Record<string, string>
  ) => {
    // Prevent spam clicking
    if (loadingConfirm || loadingQuestions) return;

    try {
      // Store answers in Redux for reservation creation
      dispatch(
        setOrderQuestionAnswers({
          venueId,
          answers,
        })
      );
      // Proceed with reservation creation, passing answers directly
      await proceedWithReservationCreation(answers);
    } catch (error) {
      console.error("Error submitting order questions:", error);
    } finally {
      setOpenOrderQuestions(false);
    }
  };

  return (
    <div className="flex flex-col items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <TopNavigationBar
        title={t("order.title.seat_reservation_title")}
        onBack={() => {
          const urlSearch = new URLSearchParams(location.search);
          const from = urlSearch.get("from");
          let backUrl = `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}`;

          if (from) {
            backUrl += `?from=${from}`;
          }

          navigate(backUrl);
        }}
        hasRightIcons
        needUserGuide
      />

      {/* Contact Content */}
      <div className="flex flex-col w-full px-4 mt-2 gap-3 pb-[50px]">
        <BaseCardInfo>
          <div className="flex flex-col w-full gap-2">
            {orderInfoMap.map((info) => {
              const { label, value } = info;
              return (
                <div key={info.id} className="grid grid-cols-2">
                  <Text className="text-sm-white">{label}</Text>
                  <Text className="text-sm-white !font-bold">{value}</Text>
                </div>
              );
            })}
          </div>
        </BaseCardInfo>
      </div>

      {/* Button Bottom */}
      <div className="z-10 !flex !justify-center !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
        <Button
          type="text"
          className={`!flex-1 !h-10 !max-h-10 !min-h-10 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none ${
            isDisabledButton
              ? "button-disabled"
              : " !bg-[var(--primary-color)] !text-white"
          }`}
          style={{ height: "unset" }}
          disabled={isDisabledButton}
          onClick={() => handleReservation()}
          loading={loadingConfirm || loadingQuestions}
        >
          <div className="flex items-center justify-center gap-2">
            <IconCartComponent className=" !text-white !w-5 !h-5 !min-w-5 !min-h-5" />
            <Text className="text-sm-white">
              {t("order.label.confirm_order_label")}
            </Text>
          </div>
        </Button>
      </div>

      <OrderQuestionsModal
        isOpen={openOrderQuestions}
        onClose={() => setOpenOrderQuestions(false)}
        onSubmit={handleOrderQuestionsSubmit}
        questions={venueQuestions}
        loading={loadingQuestions || loadingConfirm}
        initialAnswers={orderQuestionAnswers}
      />
    </div>
  );
};

export default SeatReservationPage;
