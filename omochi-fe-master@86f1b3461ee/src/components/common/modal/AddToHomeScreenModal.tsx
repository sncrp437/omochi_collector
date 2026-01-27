import { Modal, Button, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface AddToHomeScreenModalProps {
  isModalOpen: boolean;
  onClose: () => void;
}

const AddToHomeScreenModal: React.FC<AddToHomeScreenModalProps> = ({
  isModalOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  const MODAL_CONTENT = {
    header: {
      title: t("add_to_home_screen.header.title"),
      intro: [
        t("add_to_home_screen.header.intro_1"),
        t("add_to_home_screen.header.intro_2"),
      ],
    },
    main: {
      feature: t("add_to_home_screen.main.feature"),
      description: t("add_to_home_screen.main.description"),
      subDescription: t("add_to_home_screen.main.sub_description"),
      benefits: [
        t("add_to_home_screen.main.benefits.no_wait_entry"),
        t("add_to_home_screen.main.benefits.takeout_preorder"),
        t("add_to_home_screen.main.benefits.instant_stock_access"),
      ],
    },
    instructions: {
      title: t("add_to_home_screen.instructions.title"),
      steps: {
        iPhone: t("add_to_home_screen.instructions.steps.iphone"),
        Android: t("add_to_home_screen.instructions.steps.android"),
      },
      alternative: {
        title: t("add_to_home_screen.instructions.alternative.title"),
        text: t("add_to_home_screen.instructions.alternative.text"),
      },
    },
  };

  const renderHeader = () => (
    <div className="flex flex-col gap-4">
      <Text className="text-sm-success !font-bold">
        {MODAL_CONTENT.header.title}
      </Text>
      <div className="flex flex-col gap-1">
        {MODAL_CONTENT.header.intro.map((text, index) => (
          <Text key={index} className="text-sm-white">
            {text}
          </Text>
        ))}
      </div>
    </div>
  );

  const renderMainContent = () => (
    <div className="flex flex-col gap-1">
      <Text className="text-sm-success !font-bold">
        {MODAL_CONTENT.main.feature}
      </Text>
      <Text className="text-sm-white">{MODAL_CONTENT.main.description}</Text>
      <Text className="text-sm-white">{MODAL_CONTENT.main.subDescription}</Text>
      <div className="flex flex-col pt-3">
        {MODAL_CONTENT.main.benefits.map((benefit, index) => (
          <div key={index} className="flex items-baseline gap-2">
            <Text className="!text-xs">✔</Text>
            <Text className="text-sm-white">{benefit}</Text>
          </div>
        ))}
      </div>
    </div>
  );

  const renderInstructions = () => (
    <div className="flex flex-col gap-1">
      <Text className="text-sm-success !font-bold">
        {MODAL_CONTENT.instructions.title}
      </Text>
      <div className="flex flex-col gap-3">
        <div className="text-sm-white flex flex-col">
          【iPhone】
          <Text className="text-sm-white">
            {MODAL_CONTENT.instructions.steps.iPhone}
          </Text>
        </div>
        <div className="text-sm-white flex flex-col">
          【Android】
          <Text className="text-sm-white">
            {MODAL_CONTENT.instructions.steps.Android}
          </Text>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <Text className="text-sm-white">
          {MODAL_CONTENT.instructions.alternative.title}
        </Text>
        <Text className="text-sm-white">
          {MODAL_CONTENT.instructions.alternative.text}
        </Text>
      </div>
    </div>
  );

  return (
    <Modal
      open={isModalOpen}
      onCancel={onClose}
      footer={null}
      closeIcon={false}
      centered
      width={327}
      styles={{
        content: {
          background: "#272525",
          borderRadius: "16px",
          padding: "20px",
        },
        mask: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
      className="!w-full !max-w-[500px] !p-6"
      zIndex={9999}
      maskClosable={false}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {renderHeader()}
          {renderMainContent()}
          {renderInstructions()}
        </div>

        <div className="flex w-full pt-2">
          <Button
            className="!flex-1 !h-10 !min-h-10 !bg-transparent !outline-none !border !border-white !rounded-xl text-sm-white !font-bold flex-row-center"
            onClick={onClose}
          >
            {t("general.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddToHomeScreenModal;
