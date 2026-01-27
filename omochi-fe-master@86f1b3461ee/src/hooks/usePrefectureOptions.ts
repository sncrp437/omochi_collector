import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Custom hook for dynamic prefecture options that update when language changes
 */
export const usePrefectureOptions = () => {
  const { t } = useTranslation();

  const prefectureOptions = useMemo(
    () => [
      {
        value: t("options.prefectures.hokkaido"),
        label: t("options.prefectures.hokkaido"),
      },
      {
        value: t("options.prefectures.aomori"),
        label: t("options.prefectures.aomori"),
      },
      {
        value: t("options.prefectures.iwate"),
        label: t("options.prefectures.iwate"),
      },
      {
        value: t("options.prefectures.miyagi"),
        label: t("options.prefectures.miyagi"),
      },
      {
        value: t("options.prefectures.akita"),
        label: t("options.prefectures.akita"),
      },
      {
        value: t("options.prefectures.yamagata"),
        label: t("options.prefectures.yamagata"),
      },
      {
        value: t("options.prefectures.fukushima"),
        label: t("options.prefectures.fukushima"),
      },
      {
        value: t("options.prefectures.ibaraki"),
        label: t("options.prefectures.ibaraki"),
      },
      {
        value: t("options.prefectures.tochigi"),
        label: t("options.prefectures.tochigi"),
      },
      {
        value: t("options.prefectures.gunma"),
        label: t("options.prefectures.gunma"),
      },
      {
        value: t("options.prefectures.saitama"),
        label: t("options.prefectures.saitama"),
      },
      {
        value: t("options.prefectures.chiba"),
        label: t("options.prefectures.chiba"),
      },
      {
        value: t("options.prefectures.tokyo"),
        label: t("options.prefectures.tokyo"),
      },
      {
        value: t("options.prefectures.kanagawa"),
        label: t("options.prefectures.kanagawa"),
      },
      {
        value: t("options.prefectures.niigata"),
        label: t("options.prefectures.niigata"),
      },
      {
        value: t("options.prefectures.toyama"),
        label: t("options.prefectures.toyama"),
      },
      {
        value: t("options.prefectures.ishikawa"),
        label: t("options.prefectures.ishikawa"),
      },
      {
        value: t("options.prefectures.fukui"),
        label: t("options.prefectures.fukui"),
      },
      {
        value: t("options.prefectures.yamanashi"),
        label: t("options.prefectures.yamanashi"),
      },
      {
        value: t("options.prefectures.nagano"),
        label: t("options.prefectures.nagano"),
      },
      {
        value: t("options.prefectures.gifu"),
        label: t("options.prefectures.gifu"),
      },
      {
        value: t("options.prefectures.shizuoka"),
        label: t("options.prefectures.shizuoka"),
      },
      {
        value: t("options.prefectures.aichi"),
        label: t("options.prefectures.aichi"),
      },
      {
        value: t("options.prefectures.mie"),
        label: t("options.prefectures.mie"),
      },
      {
        value: t("options.prefectures.shiga"),
        label: t("options.prefectures.shiga"),
      },
      {
        value: t("options.prefectures.kyoto"),
        label: t("options.prefectures.kyoto"),
      },
      {
        value: t("options.prefectures.osaka"),
        label: t("options.prefectures.osaka"),
      },
      {
        value: t("options.prefectures.hyogo"),
        label: t("options.prefectures.hyogo"),
      },
      {
        value: t("options.prefectures.nara"),
        label: t("options.prefectures.nara"),
      },
      {
        value: t("options.prefectures.wakayama"),
        label: t("options.prefectures.wakayama"),
      },
      {
        value: t("options.prefectures.tottori"),
        label: t("options.prefectures.tottori"),
      },
      {
        value: t("options.prefectures.shimane"),
        label: t("options.prefectures.shimane"),
      },
      {
        value: t("options.prefectures.okayama"),
        label: t("options.prefectures.okayama"),
      },
      {
        value: t("options.prefectures.hiroshima"),
        label: t("options.prefectures.hiroshima"),
      },
      {
        value: t("options.prefectures.yamaguchi"),
        label: t("options.prefectures.yamaguchi"),
      },
      {
        value: t("options.prefectures.tokushima"),
        label: t("options.prefectures.tokushima"),
      },
      {
        value: t("options.prefectures.kagawa"),
        label: t("options.prefectures.kagawa"),
      },
      {
        value: t("options.prefectures.ehime"),
        label: t("options.prefectures.ehime"),
      },
      {
        value: t("options.prefectures.kochi"),
        label: t("options.prefectures.kochi"),
      },
      {
        value: t("options.prefectures.fukuoka"),
        label: t("options.prefectures.fukuoka"),
      },
      {
        value: t("options.prefectures.saga"),
        label: t("options.prefectures.saga"),
      },
      {
        value: t("options.prefectures.nagasaki"),
        label: t("options.prefectures.nagasaki"),
      },
      {
        value: t("options.prefectures.kumamoto"),
        label: t("options.prefectures.kumamoto"),
      },
      {
        value: t("options.prefectures.oita"),
        label: t("options.prefectures.oita"),
      },
      {
        value: t("options.prefectures.miyazaki"),
        label: t("options.prefectures.miyazaki"),
      },
      {
        value: t("options.prefectures.kagoshima"),
        label: t("options.prefectures.kagoshima"),
      },
      {
        value: t("options.prefectures.okinawa"),
        label: t("options.prefectures.okinawa"),
      },
    ],
    [t]
  );

  return {
    prefectureOptions,
  };
};
