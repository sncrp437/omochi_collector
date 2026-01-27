import { Spin } from "antd";
import { useLayoutEffect, useState } from "react";
import { checkStatusPayment } from "@/api/payment";
import { useNavigate, useLocation } from "react-router-dom";
import NotFoundPage from "@/pages/NotFoundPage";
import { PaymentsCheckStatusRetrieve200Response } from "@/generated/api";
import { isEmpty } from "@/utils/helper";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { ROUTE_PATH, PaymentStripeStatusEnum } from "@/utils/constants";
import { useDispatch } from "react-redux";
import { clearCart, updatePaymentStatus } from "@/store/slices/cartSlice";

const PaymentStatusPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const urlSearch = new URLSearchParams(location.search);
  const sessionId = urlSearch.get("session_id") || "";

  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] =
    useState<PaymentsCheckStatusRetrieve200Response>(
      {} as PaymentsCheckStatusRetrieve200Response
    );

  useLayoutEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        setLoading(true);
        const response = await checkStatusPayment(sessionId);
        if (!isEmpty(response) && response.status) {
          setPaymentInfo(response);
          const venueId = response.venue_id || "";
          const statusPayment = response.status as PaymentStripeStatusEnum;
          dispatch(
            updatePaymentStatus({
              venueId,
              status: PaymentStripeStatusEnum.Failed,
            })
          );
          switch (statusPayment) {
            case PaymentStripeStatusEnum.Completed:
              dispatch(clearCart(venueId));
              toast.success(t("general.payment_successful"));
              navigate(
                `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.ORDERS}`
              );
              return;
            case PaymentStripeStatusEnum.Failed:
              navigate(
                `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${ROUTE_PATH.STORE.CART}?need_payment=true`
              );
              return;
            default:
              navigate(
                `/${ROUTE_PATH.STORE.ROOT_STORE}/${venueId}/${ROUTE_PATH.STORE.CART}?need_payment=true`
              );
              return;
          }
        }
      } catch (error) {
        console.error("Error fetching payment status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentStatus();
  }, [sessionId]);

  if ((!sessionId || isEmpty(paymentInfo)) && !loading) {
    return <NotFoundPage />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full ">
      <Spin
        spinning={true}
        size="large"
        className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
      />
    </div>
  );
};

export default PaymentStatusPage;
