import { Typography } from "antd";
import { useTranslation } from "react-i18next";
const { Text, Title } = Typography;

interface LogoAndTaglineProps {
  logoText?: string;
  taglineText?: string;
  logoClassName?: string;
  taglineClassName?: string;
  useHeading?: boolean; // Allow using H1 for SEO
  headingLevel?: 1 | 2; // Control heading level
}

const LogoAndTagline: React.FC<LogoAndTaglineProps> = ({
  logoText = "Omochi",
  taglineText,
  logoClassName = "!text-[48px] !font-bold !text-[var(--primary-color)] !text-center font-family-base !leading-[1.2em]",
  taglineClassName = "!block !text-center !text-[16px] !font-bold !text-[var(--primary-color)] font-family-base",
  useHeading = false,
  headingLevel = 1,
}) => {
  const { t } = useTranslation();
  const defaultTaglineText = taglineText || t("general.app_tagline");
  const fullTitle = `${logoText} - ${defaultTaglineText}`;

  return (
    <div className="!flex !flex-col !w-full">
      {/* Hidden heading with full title for SEO */}
      {useHeading && (
        <Title
          level={headingLevel}
          className="!absolute !w-px !h-px !p-0 !-m-px !overflow-hidden !whitespace-nowrap !border-0"
          style={{ clip: "rect(0, 0, 0, 0)", clipPath: "inset(50%)" }}
        >
          {fullTitle}
        </Title>
      )}
      {/* Visible logo and tagline */}
      <div className="!w-full">
        <Text className={logoClassName}>{logoText}</Text>
      </div>
      <div className="!w-full">
        <Text className={taglineClassName}>{defaultTaglineText}</Text>
      </div>
    </div>
  );
};

export default LogoAndTagline;
