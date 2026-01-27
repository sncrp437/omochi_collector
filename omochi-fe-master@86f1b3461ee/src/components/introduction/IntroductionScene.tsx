import { SceneItem } from "@/types/introduction";
import { isEmpty } from "@/utils/helper";
import { Typography } from "antd";

const { Text, Title } = Typography;

interface IntroductionSceneProps {
  data: SceneItem;
}

const IntroductionScene: React.FC<IntroductionSceneProps> = ({ data }) => {
  if (isEmpty(data)) return null;

  const { id, title, description } = data;
  const isEven = id % 2 === 0;

  // Find primary title for H3, others as Text
  const primaryTitle = title.find((item) => item.isPrimary);
  const secondaryTitles = title.filter((item) => !item.isPrimary);

  return (
    <div className="!flex !flex-col gap-2">
      <div
        className={`!flex !flex-col ${isEven ? "!items-end" : "!items-start"}`}
      >
        {/* Primary title as H3 for SEO */}
        {primaryTitle && (
          <Title
            level={3}
            className={`!text-[24px] !leading-[1.2em] font-family-base !font-bold !tracking-[2%] !m-0 !mb-0 ${
              primaryTitle.isPrimary ? "!text-[var(--success-color)]" : "!text-white"
            }`}
          >
            {primaryTitle.content}
          </Title>
        )}
        {/* Secondary titles as Text */}
        {secondaryTitles.map((item) => (
          <Text
            key={item.id}
            className={`!text-[24px] !leading-[1.2em] font-family-base !font-bold !tracking-[2%] !text-white`}
          >
            {item.content}
          </Text>
        ))}
      </div>

      <div
        className={`!flex !flex-col ${
          isEven ? "!items-end !mr-[-20px]" : "!items-start !ml-[-20px]"
        }`}
      >
        <div
          className={`!bg-[#1D4957] !py-3 ${
            isEven
              ? "!rounded-tl-2xl !rounded-bl-2xl pl-2 pr-4"
              : "!rounded-tr-2xl !rounded-br-2xl pl-4 pr-2"
          }`}
        >
          {description.map((item) => (
            <Text
              key={item.id}
              className="text-sm-white !font-bold !tracking-[2%] !block"
            >
              {item.content}
            </Text>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntroductionScene;
