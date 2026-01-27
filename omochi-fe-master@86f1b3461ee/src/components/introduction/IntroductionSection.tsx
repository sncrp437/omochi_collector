import IntroductionSectionTitle from "./IntroductionSectionTitle";
import DiagonalBackground from "@/components/common/DiagonalBackground";
import { Typography, Button } from "antd";
import { IntroductionSectionData } from "@/types/introduction";
import { Trans, useTranslation } from "react-i18next";
import UserGuideContent from "@/components/common/UserGuideContent";
import IntroductionScene from "./IntroductionScene";
import { isEmpty } from "@/utils/helper";
import ButtonNavigateArticle from "../common/ButtonNavigateArticle";
import PartnerStoreSlider from "../PartnerStoreSlider";

const { Text, Title } = Typography;

interface IntroductionSectionProps {
  data: IntroductionSectionData;
  handleNavigateButtonSection: (type: string) => void;
  reverseDiagonal?: boolean;
}

const IntroductionSection: React.FC<IntroductionSectionProps> = ({
  data,
  handleNavigateButtonSection,
  reverseDiagonal = false,
}) => {
  const { t } = useTranslation();
  const {
    type = "normal",
    listTitle,
    description,
    buttonNavigate,
    buttonArticle,
    sceneList,
    diagonal,
    image,
    hasPartnerStore,
  } = data;

  const labelButton =
    buttonNavigate?.type === "login"
      ? t("introduction.introduction_label")
      : t("introduction.how_to_use_label");

  const hasTitleButton = buttonNavigate?.title;

  return (
    <div className="!relative !w-full !flex !flex-col">
      {/* Diagonal background */}
      <DiagonalBackground
        color={diagonal.background}
        position={diagonal.position}
        angle={diagonal.angle}
        size={diagonal.size}
        top={diagonal.top}
        reverse={reverseDiagonal}
      />

      {/* Content */}
      <div className="!relative !z-10 !flex !flex-col !gap-6 !px-5 !tracking-[2%]">
        {/* Section title */}
        {!isEmpty(listTitle) && (
          <IntroductionSectionTitle listTitle={listTitle} />
        )}
        {/* H2 for section without listTitle but has buttonNavigate.title (e.g., Section 3) */}
        {isEmpty(listTitle) && hasTitleButton && buttonNavigate?.title && (
          <Title
            level={2}
            className="!text-[24px] !leading-[1.2em] !text-white font-family-base !font-bold !m-0 !mb-0"
          >
            {buttonNavigate.title}
          </Title>
        )}

        {/* Section description */}
        {description && (
          <div className="!flex !flex-col !gap-1">
            {data.id === 1 ? (
              <Trans
                i18nKey="introduction.section_1.description"
                components={[
                  <Text className="!text-[18px] !leading-[1.2em] !font-bold font-family-base !text-white !tracking-[2%] pb-1.5" />,
                  <Text className="text-sm-white !font-bold !tracking-[2%] !pl-1" />,
                  <Text className="text-sm-white !font-bold !tracking-[2%] !pl-1" />,
                  <Text className="text-sm-white !font-bold !tracking-[2%] !pl-1" />,
                  <Text className="text-sm-white !font-bold !tracking-[2%] !pl-1" />,
                ]}
              />
            ) : (
              <Text className="text-sm-white !font-bold font-family-base !text-white !tracking-[2%] !whitespace-pre-line">
                {description}
              </Text>
            )}
          </div>
        )}

        <div
          className={`!flex !gap-5 ${
            hasTitleButton ? "!flex-col-reverse" : "!flex-col"
          }`}
        >
          {/* Button */}
          {buttonNavigate && (
            <div
              className={`flex-col flex gap-4 ${hasTitleButton ? "py-6" : ""}`}
            >
              {hasTitleButton && (
                <Text className="!text-[24px] !leading-[1.2em] !text-white font-family-base !font-bold">
                  {buttonNavigate.title}
                </Text>
              )}
              <div className="flex-col-center">
                {buttonNavigate && (
                  <Button
                    className={`${
                      buttonNavigate.type === "login"
                        ? "!bg-[var(--primary-color)]"
                        : "!bg-[#009688]"
                    } !w-[250px] !rounded-3xl !h-10 !border-none !outline-none`}
                    onClick={() =>
                      handleNavigateButtonSection(buttonNavigate.type)
                    }
                  >
                    <Text className="text-sm-white !font-bold">
                      {labelButton}
                    </Text>
                  </Button>
                )}
              </div>
            </div>
          )}
          {/* Partner Store */}
          {hasPartnerStore && <PartnerStoreSlider />}

          {/* Button Article */}
          {buttonArticle && (
            <div className="flex-col-center">
              <ButtonNavigateArticle />
            </div>
          )}

          {/* Image */}
          {image && (
            <div className="flex-row-center mx-[-24px] min-h-[400px]">
              <img
                src={image}
                alt="Section illustration"
                className="!max-w-full !h-auto"
                loading="lazy"
                fetchPriority="high"
              />
            </div>
          )}
        </div>

        {/* User guide content */}
        {type === "guide" && (
          <div className="flex-col-center">
            <UserGuideContent isShowTitle={false} showColorHighlight={false} />
          </div>
        )}

        {/* Scene list */}
        {sceneList.length > 0 && (
          <div className="!flex !flex-col !gap-12 py-4">
            {sceneList.map((scene) => (
              <IntroductionScene key={scene.id} data={scene} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntroductionSection;
