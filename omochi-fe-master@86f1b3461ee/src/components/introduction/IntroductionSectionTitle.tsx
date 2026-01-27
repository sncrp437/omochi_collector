import { Typography } from "antd";

const { Text, Title } = Typography;

interface IntroductionSectionTitleProps {
  listTitle?: string[];
}

const IntroductionSectionTitle: React.FC<IntroductionSectionTitleProps> = ({
  listTitle,
}) => {
  if (!listTitle || listTitle.length === 0) return null;

  // Combine all title lines for hidden H2 (better SEO)
  const fullTitle = listTitle.join(" ");

  return (
    <div className="!flex !flex-col !w-full pt-[10px]">
      {/* Hidden H2 with full title for SEO */}
      <Title
        level={2}
        className="!absolute !w-px !h-px !p-0 !-m-px !overflow-hidden !whitespace-nowrap !border-0"
        style={{ clip: "rect(0, 0, 0, 0)", clipPath: "inset(50%)" }}
      >
        {fullTitle}
      </Title>
      {/* Visible title lines for UI */}
      {listTitle.map((title, index) => (
        <Text
          key={`${title}-${index}`}
          className="!text-[32px] !leading-10 font-family-base !text-white !font-bold !tracking-[2%]"
        >
          {title}
        </Text>
      ))}
    </div>
  );
};

export default IntroductionSectionTitle;
