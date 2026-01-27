import { useNavigate, useLocation } from "react-router-dom";
import { ROUTES_REDIRECT_TOP_NAVIGATOR, ROUTE_PATH } from "@/utils/constants";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useCookies } from "react-cookie";

type RouteActions = keyof typeof ROUTES_REDIRECT_TOP_NAVIGATOR;

export const useNavigateUserCheck = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [cookies] = useCookies(["is-first-visit"]);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname + location.search + location.hash;

  const navigateCheckToRoute = (
    action: RouteActions,
    originPath: string = currentPath
  ) => {
    const routerAction = ROUTES_REDIRECT_TOP_NAVIGATOR[action];
    const encodeOriginPath = encodeURIComponent(originPath);
    const path = isAuthenticated
      ? routerAction
      : cookies["is-first-visit"]
      ? `/${ROUTE_PATH.USER.LOGIN}?redirect_uri=${encodeOriginPath}`
      : `/${ROUTE_PATH.INTRODUCTION}?redirect_uri=${encodeOriginPath}`;

    if (path) {
      navigate(path as string);
    }
  };

  return { navigateCheckToRoute };
};
