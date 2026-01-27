import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TermsOfServiceContent from "@/components/common/TermsOfServiceContent";

const TermsOfServicePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <SEOHeadData
        title={`${t("policy.terms_title")} | Omochi`}
        description={
          t("policy.terms_content.description") ||
          t("policy.terms_subtitle") ||
          t("policy.terms_title")
        }
        canonical={window.location.href}
        ogUrl={window.location.href}
        ogType="website"
      />
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("policy.terms_title")}
          onBack={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
        />

        {/* Terms Content */}
        <div className="flex flex-col w-full gap-6 px-6 mt-4 scrollbar-hidden overflow-y-auto scroll-smooth">
          <TermsOfServiceContent />
        </div>
      </div>
    </>
  );
};

export default TermsOfServicePage;
