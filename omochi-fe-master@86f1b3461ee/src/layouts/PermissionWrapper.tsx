import { Outlet } from "react-router-dom";
import { VenuePermissionGuard } from "@/components/VenuePermissionGuard";
import { VenuePermission } from "@/utils/constants";

interface Props {
  permissions: VenuePermission[];
}

const PermissionWrapper = ({ permissions }: Props) => {
  return (
    <VenuePermissionGuard requiredPermissions={permissions}>
      <Outlet />
    </VenuePermissionGuard>
  );
};

export default PermissionWrapper;
