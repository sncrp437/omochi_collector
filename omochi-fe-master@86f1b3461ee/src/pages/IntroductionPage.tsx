import { useNavigate } from "react-router-dom";
import FooterLinks from "../components/FooterLinks";
import {
  COMPANY_CONSTANTS,
  LINK_SOCIAL_MEDIA_OMOCHI,
  ROUTE_PATH,
} from "../utils/constants";
import { useCustomCookies } from "@/hooks/useCustomCookies";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import IntroductionHeader from "@/components/introduction/IntroductionHeader";
import IntroductionSection from "@/components/introduction/IntroductionSection";
import { IntroductionSectionData } from "@/types/introduction";
import Section1Img from "@/assets/images/introduction/section-1.webp";
import Section2Img from "@/assets/images/introduction/section-2.webp";
import Section3Img from "@/assets/images/introduction/section-3.webp";
import LogoAndTagline from "@/components/LogoAndTagline";
import { useTranslation } from "react-i18next";
import SEOHeadData from "@/components/common/SEOHeadData";

const IntroductionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const urlSearch = new URLSearchParams(location.search);
  const redirectUri = urlSearch.get("redirect_uri") || "";
  const refCode = urlSearch.get("ref") || "";
  const redirectUriChecked =
    redirectUri && refCode
      ? `/?redirect_uri=${encodeURIComponent(redirectUri)}&ref=${refCode}`
      : redirectUri
      ? `/?redirect_uri=${encodeURIComponent(redirectUri)}`
      : refCode
      ? `/?ref=${refCode}`
      : "";

  const INTRODUCTION_SECTION_DATA: IntroductionSectionData[] = [
    {
      id: 1,
      type: "normal",
      diagonal: {
        background: "#00C48C",
        position: "top",
        top: 120,
        size: "320px",
        angle: 30,
      },
      listTitle: [
        t("introduction.section_1.title_line_1"),
        t("introduction.section_1.title_line_2"),
        t("introduction.section_1.title_line_3"),
      ],
      description: t("introduction.section_1.description"),
      buttonNavigate: {
        title: "",
        type: "login",
      },
      buttonArticle: {
        type: "article",
        title: t("introduction.venue_recommended_label"),
      },
      hasPartnerStore: true,
      image: Section1Img,
      sceneList: [
        {
          id: 1,
          title: [
            {
              id: 1,
              content: t("introduction.section_1.scene_1.title_primary"),
              isPrimary: true,
            },
            {
              id: 2,
              content: t("introduction.section_1.scene_1.title_secondary"),
              isPrimary: false,
            },
          ],
          description: [
            {
              id: 1,
              content: t("introduction.section_1.scene_1.description_1"),
            },
            {
              id: 2,
              content: t("introduction.section_1.scene_1.description_2"),
            },
            {
              id: 3,
              content: t("introduction.section_1.scene_1.description_3"),
            },
          ],
        },
        {
          id: 2,
          title: [
            {
              id: 1,
              content: t("introduction.section_1.scene_2.title_primary"),
              isPrimary: true,
            },
            {
              id: 2,
              content: t("introduction.section_1.scene_2.title_secondary"),
              isPrimary: false,
            },
          ],
          description: [
            {
              id: 1,
              content: t("introduction.section_1.scene_2.description_1"),
            },
          ],
        },
      ],
    },
    {
      id: 2,
      type: "normal",
      diagonal: {
        background: "#32ADE6",
        position: "top",
        top: -350,
        size: "320px",
        angle: 30,
      },
      listTitle: [
        t("introduction.section_2.title_line_1"),
        t("introduction.section_2.title_line_2"),
        t("introduction.section_2.title_line_3"),
        t("introduction.section_2.title_line_4"),
      ],
      description: null,
      buttonNavigate: null,
      buttonArticle: null,
      hasPartnerStore: false,
      image: Section2Img,
      sceneList: [
        {
          id: 1,
          title: [
            {
              id: 1,
              content: t("introduction.section_2.scene_1.title_secondary"),
              isPrimary: false,
            },
            {
              id: 2,
              content: t("introduction.section_2.scene_1.title_primary"),
              isPrimary: true,
            },
          ],
          description: [
            {
              id: 1,
              content: t("introduction.section_2.scene_1.description_1"),
            },
            {
              id: 2,
              content: t("introduction.section_2.scene_1.description_2"),
            },
            {
              id: 3,
              content: t("introduction.section_2.scene_1.description_3"),
            },
          ],
        },
        {
          id: 2,
          title: [
            {
              id: 1,
              content: t("introduction.section_2.scene_2.title_secondary"),
              isPrimary: false,
            },
            {
              id: 2,
              content: t("introduction.section_2.scene_2.title_primary"),
              isPrimary: true,
            },
          ],
          description: [
            {
              id: 1,
              content: t("introduction.section_2.scene_2.description_1"),
            },
          ],
        },
      ],
    },
    {
      id: 3,
      type: "guide",
      diagonal: {
        background: "#FF5733",
        position: "top",
        top: 50,
        size: "320px",
        angle: 30,
      },
      listTitle: [],
      description: null,
      buttonNavigate: {
        title: t("policy.manual_title"),
        type: "youtube",
      },
      buttonArticle: null,
      hasPartnerStore: false,
      image: Section3Img,
      sceneList: [],
    },
    {
      id: 4,
      type: "normal",
      diagonal: {
        background: "#1E8E3E",
        position: "top",
        top: -500,
        size: "320px",
        angle: 30,
      },
      listTitle: [
        t("introduction.section_4.title_line_1"),
        t("introduction.section_4.title_line_2"),
      ],
      description: null,
      buttonNavigate: {
        title: "",
        type: "login",
      },
      buttonArticle: null,
      hasPartnerStore: false,
      image: null,
      sceneList: [],
    },
  ];

  const handleNavigateLogin = () => {
    navigate(`/${ROUTE_PATH.USER.LOGIN}${redirectUriChecked}`);
  };

  const handleNavigateYoutube = () => {
    window.open(LINK_SOCIAL_MEDIA_OMOCHI.YOUTUBE, "_blank");
  };

  const handleNavigateButtonSection = (type: string) => {
    if (type === "login") {
      handleNavigateLogin();
    } else if (type === "youtube") {
      handleNavigateYoutube();
    }
  };

  const [, setCookie] = useCustomCookies(["is-first-visit"]);
  useEffect(() => {
    if (!redirectUri) {
      setCookie("is-first-visit", "true");
    }
  }, [redirectUri, setCookie]);

  return (
    <div className="!flex !flex-col !items-center !justify-between !min-h-[100dvh] !bg-[var(--background-color)] !w-full !py-4 motion-safe:scroll-smooth">
      <SEOHeadData
        title="Omochi | 行きたいを集める"
        description="Omochi | 行きたいを集める"
        canonical={`${COMPANY_CONSTANTS.SALES_URL}/${ROUTE_PATH.INTRODUCTION}`}
        ogUrl={window.location.href}
        ogType="website"
      />
      <div className="!flex !flex-col !items-center !w-full !gap-4 !mx-auto">
        <div className="!flex !flex-col !w-full !gap-6 px-5">
          <IntroductionHeader handleNavigate={handleNavigateLogin} />
        </div>

        {/* Introduction Sections */}
        <div className="!w-full !flex !flex-col !gap-[36px] py-6">
          {INTRODUCTION_SECTION_DATA.map((section) => (
            <IntroductionSection
              key={section.id}
              data={section}
              handleNavigateButtonSection={handleNavigateButtonSection}
              reverseDiagonal={!(section.id % 2)}
            />
          ))}
        </div>
      </div>

      <div className="!w-full flex-col-center gap-3 !mt-auto pt-[96px] z-2">
        <LogoAndTagline
          logoClassName="!text-[40px] !font-bold !text-[var(--primary-color)] !text-center font-family-base !leading-[1.2em] block !w-full"
          taglineClassName="!block !text-center !text-[14px] !font-bold !text-[var(--primary-color)] font-family-base"
          useHeading={false}
        />
        <FooterLinks />
      </div>
    </div>
  );
};

export default IntroductionPage;
