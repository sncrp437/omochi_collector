import { Typography } from "antd";
import { Trans, useTranslation } from "react-i18next";
import BaseModalNotice from "./BaseModalNotice";

const { Text } = Typography;

interface PriorityPassNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRequired?: boolean;
}

const PriorityPassNoticeModal: React.FC<PriorityPassNoticeModalProps> = ({
  isOpen,
  onClose,
  isRequired = true,
}) => {
  const { t } = useTranslation();

  const renderNotRequiredContent = () => (
    <div className="flex flex-col gap-6 w-full">
      <Text className="!text-white !font-bold !text-[20px] !leading-[1.2em] !font-['Noto_Sans_JP']">
        {t("priority_pass.title.priority_pass_not_required_notice_title")}
      </Text>
      <div className="flex flex-col gap-4">
        <Text
          key="0"
          className="text-xs-white !font-normal whitespace-pre-line"
        >
          {t("priority_pass.content.priority_pass_not_required_description")}
        </Text>
        <span className="text-xs-white !font-normal">
          <Trans
            i18nKey="priority_pass.content.priority_pass_not_required_content_highlight"
            components={{
              highlight: (
                <span className="!text-[#FFCC00] !text-[12px] !leading-[1.2em] !font-['Noto_Sans_JP'] font-normal" />
              ),
            }}
          />
        </span>
        <div className="flex flex-col">
          <Trans
            i18nKey="priority_pass.content.priority_pass_question"
            components={[
              <Text key="0" className="text-xs-success !font-bold" />,
              <Text key="1" className="text-xs-white !font-normal" />,
            ]}
          />
        </div>
        <Text
          key="3"
          className="text-xs-white !font-normal whitespace-pre-line"
        >
          {t("priority_pass.content.show_order_screen_content")}
        </Text>
      </div>
    </div>
  );

  const renderRequiredContent = () => (
    <div className="flex flex-col gap-4 w-full">
      <Text className="!text-white !font-bold !text-[20px] !leading-[1.2em] !font-['Noto_Sans_JP']">
        {t("priority_pass.title.priority_pass_notice_title")}
      </Text>
      <div className="flex flex-col gap-4">
        <Trans
          i18nKey="priority_pass.content.priority_pass_notice_content"
          components={[<Text key="0" className="text-sm-white !font-normal" />]}
        />
      </div>
    </div>
  );

  return (
    <BaseModalNotice
      message={
        isRequired ? renderRequiredContent() : renderNotRequiredContent()
      }
      isModalOpen={isOpen}
      onClose={onClose}
      variant="transparent"
    />
  );
};

export default PriorityPassNoticeModal;
