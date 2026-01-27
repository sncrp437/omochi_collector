import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import "./App.css";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Spin } from "antd";
import LoadingLogo from "./components/LoadingLogo";
import ScrollToTop from "./components/common/ScrollToTop";
import { useCookies } from "react-cookie";
import { ROUTE_PATH, WHITELIST_PATHS } from "./utils/constants";
import {
  NotificationManager,
  NotificationToast,
} from "./components/notification";
import { RootState } from "./store";

function App() {
  const hasShownLoading = useRef(false);
  const [isLoading, setIsLoading] = useState(() => !hasShownLoading.current);
  const [cookies] = useCookies(["is-first-visit"]);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthLoading } = useSelector((state: RootState) => state.ui);
  useAuth();

  if (isLoading) {
    return (
      <div className="!flex !items-center !justify-center !min-h-[100dvh] !bg-[var(--background-color)] !max-w-[500px] !mx-auto">
        <LoadingLogo
          duration={2000}
          onComplete={() => {
            const isWhitelisted = WHITELIST_PATHS.some((pattern) => {
              const regex = new RegExp(pattern);
              return regex.test(location.pathname);
            });
            if (!cookies["is-first-visit"] && !isWhitelisted) {
              navigate(`/${ROUTE_PATH.INTRODUCTION}`);
            }
            hasShownLoading.current = true;
            setIsLoading(false);
          }}
        />
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="!flex !items-center !justify-center !min-h-[100dvh] !bg-[var(--background-color)] !max-w-[500px] !mx-auto">
        <Spin
          size="large"
          className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
        />
      </div>
    );
  }

  return (
    <NotificationManager>
      <ScrollToTop>
        <Outlet />
      </ScrollToTop>
      <NotificationToast />
    </NotificationManager>
  );
}

export default App;
