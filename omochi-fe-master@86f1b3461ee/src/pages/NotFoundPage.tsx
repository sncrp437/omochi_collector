import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { VENUE_ROLE, ROUTE_PATH } from "@/utils/constants";

interface NotFoundPageProps {
  hiddenBackButton?: boolean;
}

const NotFoundPage: React.FC<NotFoundPageProps> = (props) => {
  const { hiddenBackButton = false } = props;

  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === VENUE_ROLE;
  const pathRedirect = isAdmin ? `/${ROUTE_PATH.VENUE.DASHBOARD}` : "/";

  return (
    <div className="min-h-[100dvh] mx-auto max-w-[500px] flex items-center justify-center bg-[var(--background-color)]">
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold text-red-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">
          Page not found
        </h2>
        <p className="text-white mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        {!hiddenBackButton && (
          <Button
            type="primary"
            className="bg-green-500 hover:bg-green-600 !text-white font-semibold py-2 px-4 rounded-md transition duration-300"
            onClick={() => navigate(pathRedirect)}
          >
            Back to home
          </Button>
        )}
      </div>
    </div>
  );
};

export default NotFoundPage;
