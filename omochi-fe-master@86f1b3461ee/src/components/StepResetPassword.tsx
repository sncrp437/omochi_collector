import { Typography } from "antd";
import { StepResetPasswordData } from "@/types/auth";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

const StepResetPassword = () => {
  const { t } = useTranslation();

  const STEP_RESET_PASSWORD_DATA: StepResetPasswordData[] = [
    {
      id: 1,
      content: t("auth.forgot_password.step_1"),
    },
    {
      id: 2,
      content: t("auth.forgot_password.step_2"),
    },
    {
      id: 3,
      content: t("auth.forgot_password.step_3"),
    },
    {
      id: 4,
      content: t("auth.forgot_password.step_4"),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {STEP_RESET_PASSWORD_DATA.map((step) => (
        <div key={step.id} className="flex flex-col gap-3">
          <div className="flex-row-center !w-fit !px-2 !py-1.5 !h-[26px] bg-[var(--background-teal-color)] rounded-lg">
            <Text className="text-xs-white !font-bold">
              {t("auth.forgot_password.step_label", { step: step.id })}
            </Text>
          </div>
          <Text className="text-sm-white">{step.content}</Text>
        </div>
      ))}
    </div>
  );
};

export default StepResetPassword;
