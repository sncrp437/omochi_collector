import { useEffect, ReactNode } from "react";
import { useLocation, Outlet } from "react-router-dom";

interface ScrollToTopProps {
  children?: ReactNode;
}

const ScrollToTop = ({ children }: ScrollToTopProps) => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return children || <Outlet />;
};

export default ScrollToTop;
