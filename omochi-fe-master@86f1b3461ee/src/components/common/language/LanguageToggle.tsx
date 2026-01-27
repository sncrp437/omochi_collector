import { Button, Typography } from "antd";
import { useLanguage } from "@/hooks/useLanguage";

const { Text } = Typography;

interface LanguageToggleProps {
  className?: string;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = "" }) => {
  const { currentLanguage, changeLanguage, languageOptions } = useLanguage();

  const handleLanguageChange = (value: string) => {
    changeLanguage(value);
  };

  return (
    <div className={`flex-row-center gap-1 !h-8 ${className}`}>
      {languageOptions.map((option) => (
        <Button
          key={option.value}
          onClick={() => handleLanguageChange(option.value)}
          className={`
            !h-8 !px-6 !rounded-lg !font-bold !text-sm !transition-all !duration-200 !border-none !outline-none
            ${
              currentLanguage === option.value
                ? "!bg-[var(--card-background-color)] !shadow-md"
                : "!bg-transparent !text-white"
            }
          `}
        >
          <Text className="text-sm-white !font-bold">{option.label}</Text>
        </Button>
      ))}
    </div>
  );
};

export default LanguageToggle;
