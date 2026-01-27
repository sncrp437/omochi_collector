import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import GuestLayout from "../layouts/GuestLayout";
import UserLayout from "../layouts/UserLayout";
import AdminLayout from "../layouts/AdminLayout";
import NotFoundPage from "../pages/NotFoundPage";
import ProtectedRoute from "../components/routes/ProtectedRoute";
import GuestRoute from "../components/routes/GuestRoute";
import IntroductionPage from "../pages/IntroductionPage";
import PublicRoute from "@/components/routes/PublicRoute";
import {
  ROUTE_PATH,
  USER_ROLE,
  VENUE_ROLE,
  VenuePermission,
} from "../utils/constants";
import PermissionWrapper from "@/layouts/PermissionWrapper";

// Pages for guests
import LoginPage from "../pages/auth/LoginPage";
import LoginVenuePage from "../pages/auth/LoginVenuePage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

// Pages for users
import UserGuidePage from "@/pages/user/UserGuidePage";
import NotificationPage from "@/pages/user/NotificationPage";
import StockStoresPage from "@/pages/user/StockStoresPage";
import OrderListPage from "@/pages/user/order/OrderListPage";
import UserSettingPage from "@/pages/user/setting/UserSettingPage";
import MenuPage from "@/pages/user/order/MenuPage";
import UserProfilePage from "@/pages/user/setting/UserProfilePage";
import QRScanPage from "@/pages/user/QRScanPage";
import CartPage from "@/pages/user/order/CartPage";
import SeatReservationPage from "@/pages/user/order/SeatReservationPage";
import OrderDetailPage from "@/pages/user/order/OrderDetailPage";
import ShowToVenuePage from "@/pages/user/order/ShowToVenuePage";
import ReservationDetailPage from "@/pages/user/order/ReservationDetailPage";
import PaymentStatusPage from "@/pages/user/order/PaymentStatusPage";
import ReservationShowToVenuePage from "@/pages/user/order/ReservationShowToVenuePage";
import CouponsPage from "@/pages/user/order/CouponsPage";
import StockVenueAvailablePage from "@/pages/user/StockVenueAvailablePage";
import UserChangePasswordPage from "@/pages/user/setting/UserChangePasswordPage";

// Pages for admin
import DashboardPage from "../pages/admin/DashboardPage";
import Home from "../pages/user/Home";
import MenuManagementPage from "@/pages/admin/MenuManagementPage";
import CapacityControlPage from "@/pages/admin/CapacityControlPage";
import VenueOrderListPage from "@/pages/admin/order/VenueOrderListPage";
import VenueOrderLogListPage from "@/pages/admin/order/VenueOrderLogListPage";
import VenueOrderLogDetailPage from "@/pages/admin/order/VenueOrderLogDetailPage";
import VenueReservationLogDetailPage from "@/pages/admin/order/VenueReservationLogDetailPage";
import VenueSettingQuestionsPage from "@/pages/admin/VenueSettingQuestionsPage";

// Pages of policy
import TermsOfServicePage from "@/pages/policy/TermsOfServicePage";
import ContactPage from "@/pages/policy/ContactPage";
import PrivacyPolicyPage from "@/pages/policy/PrivacyPolicyPage";
import LegalPage from "@/pages/policy/LegalPage";
import VenueSetting from "@/pages/admin/VenueSetting";
import VenueOrderDetailPage from "@/pages/admin/order/VenueOrderDetailPage";
import VenueReservationDetailPage from "@/pages/admin/order/VenueReservationDetailPage";
import SharePage from "@/pages/user/SharePage";
import CouponPolicyPage from "@/pages/policy/CouponPolicyPage";
import ArticleListPage from "@/pages/article/ArticleListPage";
import ArticleDetailPage from "@/pages/article/ArticleDetailPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "",
        element: (
          <PublicRoute>
            <GuestLayout />
          </PublicRoute>
        ),
        children: [
          // Introduction route
          {
            path: ROUTE_PATH.INTRODUCTION,
            element: <IntroductionPage />,
          },
          // Policy routes
          {
            path: ROUTE_PATH.POLICY.ROOT_POLICY,
            children: [
              {
                index: true,
                element: <NotFoundPage />,
              },
              {
                path: ROUTE_PATH.POLICY.TERMS,
                element: <TermsOfServicePage />,
              },
              {
                path: ROUTE_PATH.POLICY.CONTACT,
                element: <ContactPage />,
              },
              {
                path: ROUTE_PATH.POLICY.PRIVACY,
                element: <PrivacyPolicyPage />,
              },
              {
                path: ROUTE_PATH.POLICY.LEGAL,
                element: <LegalPage />,
              },
              {
                path: ROUTE_PATH.POLICY.MANUAL,
                element: <UserGuidePage />,
              },
              {
                path: ROUTE_PATH.POLICY.COUPON,
                element: <CouponPolicyPage />,
              },
            ],
          },
          // Store routes
          {
            path: `${ROUTE_PATH.STORE.ROOT_STORE}/:id`,
            children: [
              {
                index: true,
                element: <MenuPage />,
              },
              {
                path: ROUTE_PATH.STORE.CART,
                element: <CartPage />,
              },
              {
                path: ROUTE_PATH.STORE.SEAT_RESERVATION,
                element: <SeatReservationPage />,
              },
            ],
          },
          // Article routes - Using correct constant
          {
            path: ROUTE_PATH.ARTICLE,
            children: [
              {
                index: true,
                element: <ArticleListPage />,
              },
              {
                path: ":articleId",
                element: <ArticleDetailPage />,
              },
            ],
          },
        ],
      },
      // Guest routes
      {
        path: "",
        element: (
          <GuestRoute>
            <GuestLayout />
          </GuestRoute>
        ),
        children: [
          {
            index: true,
            element: <LoginPage />,
          },
          {
            path: ROUTE_PATH.USER.LOGIN,
            element: <LoginPage />,
          },
          {
            path: ROUTE_PATH.VENUE.LOGIN,
            element: <LoginVenuePage />,
          },
          {
            path: ROUTE_PATH.USER.REGISTER,
            element: <RegisterPage />,
          },
          {
            path: ROUTE_PATH.AUTH.FORGOT_PASSWORD,
            element: <ForgotPasswordPage />,
          },
          {
            path: ROUTE_PATH.AUTH.RESET_PASSWORD,
            element: <ResetPasswordPage />,
          },
        ],
      },
      {
        path: ROUTE_PATH.PAYMENT.ROOT_PAYMENT,
        element: (
          <ProtectedRoute requiredRole={USER_ROLE}>
            <UserLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <NotFoundPage />,
          },
          {
            path: ROUTE_PATH.PAYMENT.PAYMENT_STATUS,
            element: <PaymentStatusPage />,
          },
        ],
      },
      {
        path: ROUTE_PATH.USER.DASHBOARD,
        element: (
          <ProtectedRoute requiredRole={USER_ROLE}>
            <UserLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Home />,
          },
          {
            path: ROUTE_PATH.USER.ORDERS,
            element: <OrderListPage />,
          },
          {
            path: `${ROUTE_PATH.USER.ORDERS}/:orderId`,
            element: <OrderDetailPage />,
          },
          {
            path: `${ROUTE_PATH.USER.ORDERS}/:orderId/${ROUTE_PATH.USER.SHOW_TO_VENUE}`,
            element: <ShowToVenuePage />,
          },
          {
            path: ROUTE_PATH.USER.NOTIFICATIONS,
            element: <NotificationPage />,
          },
          {
            path: ROUTE_PATH.USER.STOCK_STORE,
            element: <StockStoresPage />,
          },
          {
            path: `${ROUTE_PATH.USER.STOCK_STORE}/${ROUTE_PATH.USER.STOCK_VENUE_AVAILABLE}`,
            element: <StockVenueAvailablePage />,
          },
          {
            path: ROUTE_PATH.USER.SETTINGS,
            element: <UserSettingPage />,
          },
          {
            path: ROUTE_PATH.USER.PROFILE,
            element: <UserProfilePage />,
          },
          {
            path: ROUTE_PATH.USER.CHANGE_PASSWORD,
            element: <UserChangePasswordPage />,
          },
          {
            path: ROUTE_PATH.USER.QR_SCAN,
            element: <QRScanPage />,
          },
          {
            path: `${ROUTE_PATH.USER.RESERVATION}/:reservationId`,
            element: <ReservationDetailPage />,
          },
          {
            path: `${ROUTE_PATH.USER.RESERVATION}/:reservationId/${ROUTE_PATH.USER.SHOW_TO_VENUE}`,
            element: <ReservationShowToVenuePage />,
          },
          {
            path: ROUTE_PATH.USER.SHARE,
            element: <SharePage />,
          },
          {
            path: ROUTE_PATH.USER.COUPONS,
            element: <CouponsPage />,
          },
        ],
      },
      {
        path: ROUTE_PATH.VENUE.DASHBOARD,
        element: (
          <ProtectedRoute requiredRole={VENUE_ROLE}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            element: (
              <PermissionWrapper
                permissions={[VenuePermission.SETTINGS_VENUE]}
              />
            ),
            children: [
              {
                path: ROUTE_PATH.VENUE.SETTINGS_VENUE,
                element: <VenueSetting />,
              },
              {
                path: ROUTE_PATH.VENUE.ORDER_QUESTIONS,
                element: <VenueSettingQuestionsPage />,
              },
            ],
          },
          {
            element: (
              <PermissionWrapper
                permissions={[VenuePermission.MENU_MANAGEMENT]}
              />
            ),
            children: [
              {
                path: ROUTE_PATH.VENUE.MENU_MANAGEMENT,
                element: <MenuManagementPage />,
              },
            ],
          },
          {
            element: (
              <PermissionWrapper
                permissions={[VenuePermission.CAPACITY_CONTROL]}
              />
            ),
            children: [
              {
                path: ROUTE_PATH.VENUE.CAPACITY_CONTROL,
                element: <CapacityControlPage />,
              },
            ],
          },
          {
            element: (
              <PermissionWrapper permissions={[VenuePermission.ORDERS]} />
            ),
            children: [
              {
                path: ROUTE_PATH.VENUE.ORDERS,
                element: <VenueOrderListPage />,
              },
              {
                path: `${ROUTE_PATH.VENUE.ORDERS}/:orderId`,
                element: <VenueOrderDetailPage />,
              },
              {
                path: `${ROUTE_PATH.VENUE.RESERVATION}/:reservationId`,
                element: <VenueReservationDetailPage />,
              },
            ],
          },
          {
            element: (
              <PermissionWrapper permissions={[VenuePermission.ORDER_LOGS]} />
            ),
            children: [
              {
                path: ROUTE_PATH.VENUE.ORDER_LOGS,
                element: <VenueOrderLogListPage />,
              },
              {
                path: `${ROUTE_PATH.VENUE.ORDER_LOGS}/:orderId`,
                element: <VenueOrderLogDetailPage />,
              },
              {
                path: `${ROUTE_PATH.VENUE.RESERVATION_LOGS}/:reservationId`,
                element: <VenueReservationLogDetailPage />,
              },
            ],
          },
        ],
      },
      {
        path: ROUTE_PATH.NOT_FOUND,
        element: <NotFoundPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;
