import { Select, Typography } from "antd";
import { useLanguage } from "@/hooks/useLanguage";
import { updatePreferredLanguage } from "@/api/auth";
import { PreferredLanguageEnum } from "@/generated/api";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

const { Text } = Typography;

interface LanguageSwitcherProps {
  className?: string;
  rootClassName?: string;
  popupClassName?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = "custom-select-transparent max-w-10",
  rootClassName = "!bg-[var(--background-color)]",
  popupClassName = "custom-select-scroll !min-w-fit !border-[var(--border-color)] !left-[-10px] !rounded-lg",
}) => {
  const { currentLanguage, changeLanguage, languageOptions } = useLanguage();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLanguageChange = async (value: string) => {
    try {
      // Change language in the app
      await changeLanguage(value);

      // Only update preferred language in backend if user is authenticated
      if (user) {
        const preferredLanguage =
          value === "ja" ? PreferredLanguageEnum.Ja : PreferredLanguageEnum.En;
        await updatePreferredLanguage(preferredLanguage);
      }
    } catch (error) {
      console.error("Error updating language:", error);
    }
  };

  return (
    <Select
      value={currentLanguage}
      onChange={handleLanguageChange}
      className={`${className} !z-[2]`}
      suffixIcon={null}
      rootClassName={rootClassName}
      popupClassName={popupClassName}
      getPopupContainer={(trigger) => trigger.parentNode}
      dropdownStyle={{ textAlign: "center" }}
    >
      {languageOptions.map((option) => (
        <Select.Option key={option.value} value={option.value}>
          <Text className="text-sm-white !font-bold">{option.label}</Text>
        </Select.Option>
      ))}
    </Select>
  );
};

export default LanguageSwitcher;
