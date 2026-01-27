import { Checkbox, Card, Typography } from "antd";
import { CardProps } from "antd/es/card/Card";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface BaseCardVenueProps extends CardProps {
  image: React.ReactNode;
  receptionTime?: string;
  children: React.ReactNode;
  defaultImg?: string | null;
  onClick?: () => void;
  hideReceptionTime?: boolean;
  isEditMode?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

const BaseCardVenue: React.FC<BaseCardVenueProps> = ({
  image,
  children,
  onClick,
  receptionTime = "",
  hideReceptionTime = false,
  isEditMode = false,
  checked = false,
  disabled = false,
  onCheckChange,
  ...rest
}) => {
  const { t } = useTranslation();

  const handleCardClick = () => {
    if (isEditMode) {
      // In edit mode, clicking card toggles checkbox (if not disabled)
      if (!disabled && onCheckChange) {
        onCheckChange(!checked);
      }
    } else if (!disabled && onClick) {
      // Normal mode: navigate to detail
      onClick();
    }
  };

  const handleCheckboxChange = (e: { target: { checked: boolean } }) => {
    if (onCheckChange && !disabled) {
      onCheckChange(e.target.checked);
    }
  };

  return (
    <Card
      hoverable={!isEditMode && !disabled}
      variant="borderless"
      className={`!bg-[var(--card-background-color)] !rounded-2xl ${
        disabled
          ? "!opacity-50 !cursor-not-allowed"
          : !isEditMode
          ? "hover:!bg-[#404040] cursor-pointer"
          : "cursor-default"
      }`}
      styles={{
        body: {
          padding: "10px",
        },
      }}
      {...rest}
      onClick={handleCardClick}
    >
      <div className="flex-row-center gap-2 w-full">
        <div className="flex-row-center gap-2.5 w-full">
          {isEditMode && (
            <Checkbox
              className="checkbox-edit-mode !mt-0"
              checked={checked}
              disabled={disabled}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="flex-row-center gap-2 w-full flex-1">
            <div className="flex flex-col gap-2 w-[35%] min-w-[100px] max-w-[150px]">
              {!hideReceptionTime && (
                <Text className="text-xs-white !font-bold">
                  {t("venue.label.reception_time_label")}：{receptionTime}
                </Text>
              )}
              <div
                className={`rounded-[9px] flex-row-center bg-[var(--background-color)] ${
                  hideReceptionTime
                    ? "min-h-[70px] max-h-[80px]"
                    : "min-h-[50px] max-h-[60px]"
                }`}
              >
                {image}
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BaseCardVenue;
