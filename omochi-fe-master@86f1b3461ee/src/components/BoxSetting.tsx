import { Typography } from "antd";
import { Link } from "react-router-dom";
import { IconChevronRight } from "@/assets/icons";
import { IconType } from "@/types/common";

const { Text } = Typography;

interface BoxSettingProps {
  icon?: IconType;
  name: string;
  urlRedirect: string;
}

const BoxSetting: React.FC<BoxSettingProps> = ({
  icon = null,
  name,
  urlRedirect = "",
}) => {
  const IconComponent = icon as IconType;

  return (
    <Link
      to={urlRedirect}
      className="!p-4 flex-row-between gap-2 !bg-transparent"
    >
      <div className="flex !items-center gap-6">
        <div className="w-6 min-w-6">
          {icon && (
            <IconComponent className="!text-white w-6 h-6 min-w-6 min-h-6" />
          )}
        </div>
        <Text className="text-sm-white">{name}</Text>
      </div>

      <div className="w-6 min-w-6">
        <IconChevronRight className="!text-white w-6 h-6 min-w-6 min-h-6" />
      </div>
    </Link>
  );
};

export default BoxSetting;
