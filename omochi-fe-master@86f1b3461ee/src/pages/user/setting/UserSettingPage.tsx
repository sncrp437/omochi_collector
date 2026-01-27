import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate } from "react-router-dom";
import BoxSetting from "@/components/BoxSetting";
import { ROUTE_PATH } from "@/utils/constants";
import { useTranslation } from "react-i18next";
import { IconLock, IconSetting } from "@/assets/icons";

const dataUserSetting = [
  {
    id: 1,
    list: [
      {
        id: 1,
        name: "setting.general_label",
        icon: IconSetting,
        urlRedirect: `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.PROFILE}`,
      },
    ],
  },
  {
    id: 2,
    list: [
      {
        id: 1,
        name: "setting.change_password_label",
        icon: IconLock,
        urlRedirect: `/${ROUTE_PATH.USER.DASHBOARD}/${ROUTE_PATH.USER.CHANGE_PASSWORD}`,
      },
    ],
  },
  {
    id: 3,
    list: [
      {
        id: 1,
        name: "policy.terms_title",
        icon: undefined,
        urlRedirect: `/${ROUTE_PATH.POLICY.ROOT_POLICY}/${ROUTE_PATH.POLICY.TERMS}`,
      },
      {
        id: 2,
        name: "policy.contact_title",
        icon: undefined,
        urlRedirect: `/${ROUTE_PATH.POLICY.ROOT_POLICY}/${ROUTE_PATH.POLICY.CONTACT}`,
      },
      {
        id: 3,
        name: "policy.privacy_title",
        icon: undefined,
        urlRedirect: `/${ROUTE_PATH.POLICY.ROOT_POLICY}/${ROUTE_PATH.POLICY.PRIVACY}`,
      },
      {
        id: 4,
        name: "policy.legal_title",
        icon: undefined,
        urlRedirect: `/${ROUTE_PATH.POLICY.ROOT_POLICY}/${ROUTE_PATH.POLICY.LEGAL}`,
      },
    ],
  },
];

const UserSettingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center !min-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      {/* Top navigation bar */}
      <TopNavigationBar
        title={t("setting.user_setting_title")}
        onBack={() => navigate(`/${ROUTE_PATH.USER.DASHBOARD}`)}
      />

      {/* User Setting Content */}
      <div className="flex flex-col w-full px-4 mt-4 gap-4">
        {dataUserSetting.map((setting) => {
          const { list: settingList } = setting;

          return (
            <div
              key={setting.id}
              className="flex flex-col border border-[#EEF1F4] rounded-[6px] divide-y divide-[#EEF1F4]"
            >
              {settingList.map((item) => (
                <BoxSetting
                  key={item.id}
                  icon={item.icon}
                  name={t(item.name)}
                  urlRedirect={item.urlRedirect}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserSettingPage;
