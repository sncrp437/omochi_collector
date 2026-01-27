import { Typography } from "antd";
import { Link } from "react-router-dom";
import { ROUTE_PATH } from "../utils/constants";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface FooterLinksProps {
  className?: string;
}

const FOOTER_LINKS_DATA = [
  {
    path: ROUTE_PATH.POLICY.TERMS,
    translationKey: "policy.terms_title",
  },
  {
    path: ROUTE_PATH.POLICY.CONTACT,
    translationKey: "policy.contact_title",
  },
  {
    path: ROUTE_PATH.POLICY.PRIVACY,
    translationKey: "policy.privacy_title",
  },
  {
    path: ROUTE_PATH.POLICY.LEGAL,
    translationKey: "policy.legal_title",
  },
  {
    path: ROUTE_PATH.POLICY.COUPON,
    translationKey: "policy.coupon_policy_title",
  },
];

const FooterLinks = ({ className = "" }: FooterLinksProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={`z-[2] !flex !flex-col !items-center !mt-auto pt-3 ${className}`}
    >
      {FOOTER_LINKS_DATA.map((link, index) => (
        <div key={index} className="!py-1 !px-4">
          <Link
            to={`/${ROUTE_PATH.POLICY.ROOT_POLICY}/${link.path}`}
            className="!no-underline"
          >
            <Text className="text-xs-white !hover:!text-white">
              {t(link.translationKey)}
            </Text>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default FooterLinks;
