import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  VENUE_ROLE_PERMISSIONS,
  VenuePermission,
  VENUE_MANAGEMENT_ROLES,
  ROUTE_PATH,
} from "@/utils/constants";
import BaseModalNotice from "./common/modal/BaseModalNotice";
import { useNavigate } from "react-router-dom";
import { Trans } from "react-i18next";
import { Typography } from "antd";

const { Text } = Typography;

interface VenuePermissionGuardProps {
  requiredPermissions: VenuePermission[];
  children: React.ReactNode;
}

export const VenuePermissionGuard = ({
  requiredPermissions,
  children,
}: VenuePermissionGuardProps) => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const fallback = (
    <BaseModalNotice
      message={
        <Trans
          i18nKey="general.no_permission"
          components={[
            <Text className="text-sm-white !font-bold" />,
            <Text className="text-sm-white !font-bold" />,
          ]}
        />
      }
      onClose={() => {
        navigate(`/${ROUTE_PATH.VENUE.DASHBOARD}`);
      }}
      isModalOpen={true}
    />
  );

  const venueRole = user?.venue_roles?.[0]?.role;

  if (!venueRole) return fallback;

  const rolePermissions =
    VENUE_ROLE_PERMISSIONS[venueRole.toUpperCase() as VENUE_MANAGEMENT_ROLES];

  const hasPermission =
    rolePermissions?.includes(VenuePermission.ALL) ||
    requiredPermissions.every((permission) =>
      rolePermissions?.includes(permission)
    );

  return hasPermission ? <>{children}</> : fallback;
};
