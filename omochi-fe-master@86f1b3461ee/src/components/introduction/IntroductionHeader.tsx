import LogoAndTagline from "@/components/LogoAndTagline";
import { useTranslation } from "react-i18next";
import { Typography, Button } from "antd";
import LanguageSwitcher from "@/components/common/language/LanguageSwitcher";

const { Text } = Typography;

interface IntroductionHeaderProps {
  handleNavigate: () => void;
}

const IntroductionHeader: React.FC<IntroductionHeaderProps> = ({
  handleNavigate,
}) => {
  const { t } = useTranslation();
  return (
    <div className="!w-full flex-row-between z-20">
      <div>
        <LogoAndTagline
          logoClassName="!text-[32px] !font-bold !text-[var(--primary-color)] !text-center font-family-base !leading-[1.2em]"
          taglineClassName="!block !text-center !text-[10px] !font-bold !text-[var(--primary-color)] font-family-base"
          useHeading={true}
          headingLevel={1}
        />
      </div>

      <div className="flex-row-center gap-2.5">
        <Button
          className="!px-6 !h-[40px] !outline-none !bg-[var(--primary-color)] !border-none !rounded-lg text-sm-white !font-bold flex-row-center"
          onClick={handleNavigate}
        >
          <Text className="text-sm-white !font-bold !text-center">
            {t("auth.login.submit")}
          </Text>
        </Button>

        <LanguageSwitcher className="custom-select-dark-blue max-w-10 flex-row-center" />
      </div>
    </div>
  );
};

export default IntroductionHeader;
