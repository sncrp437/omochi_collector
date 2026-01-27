import { Typography } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePolicyConstants } from "@/hooks/usePolicyConstants";

const { Text, Title } = Typography;

const CouponPolicyPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { couponPolicyContent } = usePolicyConstants();

  return (
    <>
      <SEOHeadData
        title={`${t("policy.coupon_policy_title")} | Omochi`}
        description={
          couponPolicyContent.sections.length > 0 &&
          couponPolicyContent.sections[0].description
            ? `${t(
                "policy.coupon_policy_title"
              )}。${couponPolicyContent.sections[0].description.replace(
                /\n/g,
                " "
              )}`
            : `${t(
                "policy.coupon_policy_title"
              )}。クーポンの内容、付与条件、使用方法、有効期限についてご確認いただけます。`
        }
        canonical={window.location.href}
        ogUrl={window.location.href}
        ogType="website"
      />
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("policy.coupon_policy_title")}
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
          {t("policy.coupon_policy_title")} - Omochi
        </Title>

        {/* Coupon Policy Content */}
        <div className="flex flex-col w-full gap-4 px-6 mt-4 scrollbar-hidden overflow-y-auto scroll-smooth">
          {couponPolicyContent.sections.map((section) => (
            <div key={section.id} className="flex flex-col leading-[1.2em]">
              <Title level={2} className="text-sm-white !font-bold !m-0 !mb-2">
                {section.label}
              </Title>
              {section.description && (
                <Text className="text-sm-white whitespace-pre-line">
                  {section.description}
                </Text>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CouponPolicyPage;
