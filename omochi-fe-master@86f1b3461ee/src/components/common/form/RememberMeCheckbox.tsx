import { Checkbox, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { setRememberMe } from "@/store/slices/authSlice";
import { RootState } from "@/store";
import React, { useCallback } from "react";

const { Text } = Typography;

const RememberMeCheckbox = React.memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const rememberMe = useSelector((state: RootState) => state.auth.rememberMe);

  const handleChange = useCallback(
    (checked: boolean) => {
      dispatch(setRememberMe(checked));
    },
    [dispatch]
  );

  return (
    <div className="flex items-center gap-2 w-fit">
      <Checkbox
        checked={rememberMe}
        onChange={(e) => handleChange(e.target.checked)}
        className="flex-row-between !flex-row-reverse !m-0 [&_.ant-checkbox-wrapper]:!w-full [&_.ant-checkbox-label]:!w-full [&_.ant-checkbox-label]:!p-0 checkbox-base-custom"
      />
      <Text className="text-xs-white !font-bold !whitespace-pre-wrap">
        {t("auth.login.remember_me")}
      </Text>
    </div>
  );
});

export default RememberMeCheckbox;
