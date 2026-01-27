import { Tag, TagProps } from "antd";

type IconPosition = "start" | "end";

interface CustomTagProps extends TagProps {
  label: string;
  color: string;
  icon?: React.ReactNode;
  iconPosition?: IconPosition;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  borderRadius?: string;
}

const CustomTag: React.FC<CustomTagProps> = ({
  label,
  color,
  icon = null,
  iconPosition = "start",
  disabled = false,
  onClick,
  className = "",
  borderRadius = "!rounded-lg",
  ...rest
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };
  return (
    <Tag
      icon={icon}
      color={color}
      className={`${borderRadius} text-xs-white !flex items-center gap-1 !h-[26px] !me-[0px] ${
        iconPosition === "start" ? "!flex-row" : "!flex-row-reverse"
      } ${
        disabled ? "!opacity-50 !cursor-not-allowed" : "!cursor-pointer "
      } ${className}`}
      onClick={handleClick}
      {...rest}
    >
      {label}
    </Tag>
  );
};

export default CustomTag;
