import { Typography } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePolicyConstants } from "@/hooks/usePolicyConstants";

const { Text, Title } = Typography;

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { contactInfo, privacyPolicyContent } = usePolicyConstants();

  return (
    <>
      <SEOHeadData
        title={`${t("policy.privacy_title")} | Omochi`}
        description={
          privacyPolicyContent.description || t("policy.privacy_title")
        }
        canonical={window.location.href}
        ogUrl={window.location.href}
        ogType="website"
      />
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("policy.privacy_title")}
          onBack={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
        />

        {/* H1 for SEO - Page title */}
        <Title
          level={1}
          className="!absolute !w-px !h-px !p-0 !-m-px !overflow-hidden !whitespace-nowrap !border-0"
          style={{ clip: "rect(0, 0, 0, 0)", clipPath: "inset(50%)" }}
        >
          {t("policy.privacy_title")} - Omochi
        </Title>

        {/* Privacy Policy Content */}
        <div className="flex flex-col w-full gap-4 px-6 mt-4 scrollbar-hidden overflow-y-auto scroll-smooth">
          <Text className="text-sm-white">{t("policy.privacy_title")}</Text>
          <Text className="text-sm-white">
            {privacyPolicyContent.description}
          </Text>
          {privacyPolicyContent.sections.map((privacy) => (
            <div key={privacy.id} className="flex flex-col leading-[1.2em]">
              <Title level={2} className="text-sm-white !font-bold !m-0 !mb-2">
                {privacy.id}. {privacy.label}
              </Title>
              <Text className="text-sm-white">{privacy.description}</Text>
              {privacy.items?.map((item, index) => (
                <Text key={index} className="text-sm-white">
                  {item}
                </Text>
              ))}
            </div>
          ))}
          <div className="flex flex-col leading-[1.2em]">
            <Text className="text-sm-white">
              {contactInfo.businessName.value}
            </Text>
            <Text className="text-sm-white">
              Email: {contactInfo.email.value}
            </Text>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;
