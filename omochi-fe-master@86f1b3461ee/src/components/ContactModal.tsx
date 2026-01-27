import { Modal, Button, Typography } from "antd";
import "@/components/common/ConfirmLogoutModal.css";

const { Text } = Typography;

interface ContactModalProps {
  isOpen: boolean;
  title: string;
  data: {
    label: string;
    value: string;
  }[];
  onClick: () => void;
  btnText: string;
}

const ContactModal = ({
  isOpen,
  onClick,
  title,
  data,
  btnText,
}: ContactModalProps) => {
  return (
    <Modal
      open={isOpen}
      onCancel={onClick}
      footer={null}
      centered
      width={327}
      className="contact-modal"
      closeIcon={false}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="w-full flex flex-col gap-3">
          <Text className="text-sm-white !font-bold">{title}</Text>
          {data.map((item) => (
            <div className="flex flex-row gap-2">
              <Text className="text-sm-white !break-keep">{item.label}:</Text>
              <Text className="text-sm-white !break-all">{item.value}</Text>
            </div>
          ))}
        </div>

        <div className="flex w-full gap-[22px]">
          <Button
            className="flex-1 !h-[40px] !bg-transparent !hover:text-white !outline-none border border-white !rounded-[12px] flex-row-center"
            onClick={onClick}
          >
            <Text className="text-sm-white !font-bold">{btnText}</Text>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ContactModal;
