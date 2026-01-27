import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { ROUTE_PATH, USER_ROLE, VENUE_ROLE } from "../../utils/constants";
import { useCookies } from "react-cookie";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: typeof USER_ROLE | typeof VENUE_ROLE;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [cookies] = useCookies(["is-first-visit"]);

  const location = useLocation();

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`${
          requiredRole === USER_ROLE
            ? !cookies["is-first-visit"]
              ? `/${ROUTE_PATH.INTRODUCTION}`
              : `/${ROUTE_PATH.USER.LOGIN}`
            : `/${ROUTE_PATH.VENUE.LOGIN}`
        }`}
        state={{ from: location }}
        replace
      />
    );
  }

  // If a specific role is required (admin or user)
  if (requiredRole && user?.role !== requiredRole) {
    // If admin is accessing user route => redirect to venue dashboard
    if (requiredRole === USER_ROLE && user?.role === VENUE_ROLE) {
      return <Navigate to={`/${ROUTE_PATH.VENUE.DASHBOARD}`} replace />;
    }

    // In other cases, redirect to appropriate page
    const redirectPath =
      user?.role === VENUE_ROLE
        ? `/${ROUTE_PATH.VENUE.DASHBOARD}`
        : `/${ROUTE_PATH.USER.DASHBOARD}`;
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
