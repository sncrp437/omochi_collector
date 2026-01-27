import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { ROUTE_PATH, VENUE_ROLE } from "../../utils/constants";
import { useCookies } from "react-cookie";

interface GuestRouteProps {
  children: React.ReactNode;
}

const buildRedirectQuery = (uri?: string) =>
  uri ? `?redirect_uri=${encodeURIComponent(uri)}` : "";

const GuestRoute = ({ children }: GuestRouteProps) => {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [cookies] = useCookies(["is-first-visit"]);
  const location = useLocation();
  const redirectUriTemp = new URLSearchParams(location.search).get("redirect_uri");
  const refCode = new URLSearchParams(location.search).get("ref");
  const redirectUri = redirectUriTemp && refCode
    ? `${redirectUriTemp}?ref=${refCode}`
    : redirectUriTemp
      ? `${redirectUriTemp}`
      : "";

  // If already authenticated, redirect based on role and redirectUri
  if (isAuthenticated) {
    const userGuidePath = `/${ROUTE_PATH.POLICY.ROOT_POLICY}/${ROUTE_PATH.POLICY.MANUAL}`;

    if (!cookies["is-first-visit"] && redirectUri) {
      return (
        <Navigate
          to={`${userGuidePath}${buildRedirectQuery(redirectUri)}`}
          replace
        />
      );
    }

    if (redirectUri) {
      return <Navigate to={decodeURIComponent(redirectUri)} replace />;
    }

    if (
      user?.role === VENUE_ROLE &&
      location.pathname === `/${ROUTE_PATH.VENUE.LOGIN}`
    ) {
      return <Navigate to={`/${ROUTE_PATH.VENUE.DASHBOARD}`} replace />;
    }

    return <Navigate to={`/${ROUTE_PATH.USER.DASHBOARD}`} replace />;
  }

  // If not authenticated, show content for guests
  return <>{children}</>;
};

export default GuestRoute;
