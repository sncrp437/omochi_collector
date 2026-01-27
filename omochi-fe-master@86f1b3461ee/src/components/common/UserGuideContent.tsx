import { Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { Typography } from "antd";
import {
  IconPolygonRight,
  IconQRCode,
  IconClockComponent,
  IconShareComponent,
  IconStockVenue,
} from "@/assets/icons";
import { useTranslation } from "react-i18next";
import { IconType } from "@/types/common";

const { Text } = Typography;

const USER_GUIDE_ICON_MAP = {
  clock: {
    icon: IconClockComponent,
    color: "#1E8E3E",
  },
  cube: {
    icon: IconStockVenue,
    color: "#1A73E8",
  },
  qrCode: {
    icon: IconQRCode,
    color: "#FFCC00",
  },
  share: {
    icon: IconShareComponent,
    color: "#32ADE6",
  },
};

type UserGuideIconKey = keyof typeof USER_GUIDE_ICON_MAP;

interface UserGuideItem {
  id: number;
  content: string;
  contentHighlight?: string;
}

interface UserGuideSection {
  id: number;
  label: string;
  iconKeys: string[];
  listContent: UserGuideItem[];
}

interface UserGuideContentProps {
  isShowTitle?: boolean;
  showColorHighlight?: boolean;
}

const UserGuideContent: React.FC<UserGuideContentProps> = ({
  isShowTitle = true,
  showColorHighlight = true,
}) => {
  const { t } = useTranslation();

  // Dynamic user guide content that updates when language changes
  const userGuideContent = useMemo((): UserGuideSection[] => [
    {
      id: 1,
      label: t("policy.user_guide_content.section_1.label"),
      iconKeys: ["qrCode", "clock", "share"],
      listContent: [
        {
          id: 1,
          content: t("policy.user_guide_content.section_1.step_1"),
        },
        {
          id: 2,
          content: t("policy.user_guide_content.section_1.step_2"),
        },
        {
          id: 3,
          content: t("policy.user_guide_content.section_1.step_3"),
        },
      ],
    },
    {
      id: 2,
      label: t("policy.user_guide_content.section_2.label"),
      iconKeys: ["cube", "clock", "share"],
      listContent: [
        {
          id: 1,
          content: t("policy.user_guide_content.section_2.step_1"),
        },
        {
          id: 2,
          content: t("policy.user_guide_content.section_2.step_2"),
        },
        {
          id: 3,
          content: t("policy.user_guide_content.section_2.step_3"),
        },
      ],
    },
    {
      id: 3,
      label: t("policy.user_guide_content.section_3.label"),
      iconKeys: ["cube", "share"],
      listContent: [
        {
          id: 1,
          content: t("policy.user_guide_content.section_3.step_1"),
        },
        {
          id: 2,
          content: t("policy.user_guide_content.section_3.step_2_content"),
          contentHighlight: t("policy.user_guide_content.section_3.step_2_highlight"),
        },
      ],
    },
  ], [t]);

  return (
    <div className="flex flex-col !w-full gap-4">
      {isShowTitle && (
        <Text className="!font-bold !text-[16px] !leading-[1.2em] !text-white font-family-base text-center">
          {t("policy.example_usage_title")}
        </Text>
      )}

      {userGuideContent.map((guide: UserGuideSection) => {
        const { label, iconKeys, listContent } = guide;
        return (
          <div key={guide.id} className="flex flex-col gap-4">
            <Text
              className={`!font-bold !text-[16px] !leading-[1.2em] font-family-base ${
                showColorHighlight ? "!text-[#FFCC00]" : "!text-white"
              }`}
            >
              {label}
            </Text>
            <div className="grid grid-cols-5 gap-1 items-center">
              {iconKeys.map((keyIcon: string, index: number) => {
                const iconConfig =
                  USER_GUIDE_ICON_MAP[keyIcon as UserGuideIconKey];

                const { icon, color } = iconConfig;
                const IconComponent = icon as IconType;

                return (
                  <Fragment key={index}>
                    <div
                      className={`rounded-[16px] flex items-center justify-center !aspect-square max-w-[72px] min-w-[56px] w-full max-h-[72px] min-h-[56px] ${
                        index === 0
                          ? "justify-self-start"
                          : index === 1
                          ? "justify-self-center"
                          : "justify-self-end"
                      }`}
                      style={{
                        backgroundColor: color,
                      }}
                    >
                      <IconComponent className="!p-1 !text-white" />
                    </div>
                    {index < iconKeys.length - 1 && (
                      <div className="flex items-center justify-center">
                        <IconPolygonRight />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              {listContent.map((item: UserGuideItem) =>
                showColorHighlight ? (
                  <Text key={item.id} className="text-sm-white">
                    <span>{item.id}. </span>
                    <span>
                      <span>{item.content} </span>
                      {item.contentHighlight && (
                        <Text className="!leading-[1.2em] font-family-base !text-[#FFCC00] !font-bold">
                          {item.contentHighlight}
                        </Text>
                      )}
                    </span>
                  </Text>
                ) : (
                  <div key={item.id} className="flex gap-2 items-baseline">
                    <Text className="text-sm-white">{item.id}.</Text>
                    <div className="flex-1">
                      <Text className="text-sm-white">{item.content}</Text>
                      {item.contentHighlight && (
                        <Text className="!leading-[1.2em] font-family-base !text-white">
                          {item.contentHighlight}
                        </Text>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserGuideContent;
