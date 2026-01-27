import { Typography } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePolicyConstants } from "@/hooks/usePolicyConstants";

const { Text, Title } = Typography;

const ContactPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { contactInfo } = usePolicyConstants();

  const contactInfoArray = Object.entries(contactInfo).map(
    ([key, contact]) => ({
      key,
      label: contact.label,
      value: contact.value,
    })
  );

  return (
    <>
      <SEOHeadData
        title={`${t("policy.contact_title")} | Omochi`}
        description={`${t("policy.contact_title")}。${
          contactInfo.businessName.label
        }：${contactInfo.businessName.value}、${contactInfo.email.label}：${
          contactInfo.email.value
        }などの運営会社情報をご確認いただけます。Omochiサービスに関するお問い合わせはこちらから。`}
        canonical={window.location.href}
        ogUrl={window.location.href}
        ogType="website"
      />
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("policy.contact_title")}
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
          {t("policy.contact_title")} - Omochi
        </Title>

        {/* Contact Content */}
        <div className="flex flex-col w-full gap-4 px-6 mt-4 scrollbar-hidden overflow-y-auto scroll-smooth">
          {contactInfoArray.map((contact) => (
            <div key={contact.key} className="leading-[1.2em]">
              <Text className="text-sm-white !break-all">
                {contact.label}：
              </Text>
              <Text className="text-sm-white">{contact.value}</Text>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ContactPage;
