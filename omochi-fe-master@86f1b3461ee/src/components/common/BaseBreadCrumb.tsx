import { ROUTE_PATH } from "@/utils/constants";
import { Breadcrumb } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface BaseBreadCrumbProps {
  items: {
    title: string | React.ReactNode;
    href?: string;
  }[];
}

const BaseBreadCrumb: React.FC<BaseBreadCrumbProps> = (props) => {
  const { t } = useTranslation();
  const { items = [] } = props;

  const baseBreadCrumbItems = [
    {
      title: (
        <Link to={`/${ROUTE_PATH.INTRODUCTION}`}>
          {t("article.breadcrumb_home")}
        </Link>
      ),
    },
    ...items,
  ];

  return (
    <div className="flex flex-row">
      <Breadcrumb items={baseBreadCrumbItems} className="base-breadcrumb" />
    </div>
  );
};

export default BaseBreadCrumb;
