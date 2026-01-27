import { Typography } from "antd";
import TopNavigationBar from "@/components/common/TopNavigationBar";
import SEOHeadData from "@/components/common/SEOHeadData";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePolicyConstants } from "@/hooks/usePolicyConstants";

const { Text, Title } = Typography;

const LegalPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { contactInfo, legalContent } = usePolicyConstants();

  const contactInfoArray = Object.entries(contactInfo)
    .filter(([key]) => key !== "capitalStock")
    .map(([key, contact]) => ({
      key,
      label: contact.label,
      value: contact.value,
    }));

  return (
    <>
      <SEOHeadData
        title={`${t("policy.legal_title")} | Omochi`}
        description={
          legalContent.sections.length > 0
            ? `${t("policy.legal_title")}。${legalContent.sections[0].label}${
                legalContent.sections[0].value
                  ? `：${legalContent.sections[0].value}`
                  : ""
              }、${legalContent.sections[1]?.label || ""}、${
                legalContent.sections[2]?.label || ""
              }などの詳細情報をご確認いただけます。`
            : `${t(
                "policy.legal_title"
              )}。運営会社情報、販売価格、支払方法などの詳細をご確認いただけます。`
        }
        canonical={window.location.href}
        ogUrl={window.location.href}
        ogType="website"
      />
      <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("policy.legal_title")}
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
          {t("policy.legal_title")} - Omochi
        </Title>

        {/* Legal Content */}
        <div className="flex flex-col w-full gap-4 px-6 mt-4 scrollbar-hidden overflow-y-auto scroll-smooth">
          <Text className="text-sm-white">{t("policy.legal_title")}</Text>
          <div className="leading-[1.2em]">
            {contactInfoArray.map((contact) => (
              <div key={contact.key}>
                <Text className="text-sm-white break-all">
                  {contact.label}：
                </Text>
                <Text className="text-sm-white">{contact.value}</Text>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {legalContent.sections.map((legal) => {
              const { label, value, items, optionalContent } = legal;
              return (
                <div key={legal.id} className="leading-[1.2em]">
                  <Title
                    level={2}
                    className="text-sm-white !break-all !font-bold !m-0 !mb-2"
                  >
                    {label}
                  </Title>
                  {value && <Text className="text-sm-white">{value}</Text>}
                  <div className="flex flex-col">
                    {items.map((item, index) => (
                      <Text key={index} className="text-sm-white">
                        {item}
                      </Text>
                    ))}
                  </div>
                  {optionalContent && (
                    <>
                      <Text className="text-sm-white !break-all">
                        {optionalContent.label}：
                      </Text>
                      <div className="flex flex-col">
                        {optionalContent.items?.map((item, index) => (
                          <Text key={index} className="text-sm-white">
                            {item}
                          </Text>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default LegalPage;
