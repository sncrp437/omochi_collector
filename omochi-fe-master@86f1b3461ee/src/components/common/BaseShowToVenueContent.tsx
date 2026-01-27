import { Typography } from "antd";

const { Text } = Typography;

interface BaseShowToVenueContentProps {
  label: string;
  value: string;
  color?: string;
}

export const BaseShowToVenueContent: React.FC<BaseShowToVenueContentProps> = ({
  label,
  value,
  color = "#FFFFFF",
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <Text className="text-sm-white">{label}</Text>
      <Text
        className="!text-[32px] !font-bold !font-['Noto_Sans_JP'] !leading-[1.2em] !text-center"
        style={{ color }}
      >
        {value}
      </Text>
    </div>
  );
};
