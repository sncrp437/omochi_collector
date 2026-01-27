import Card from "antd/es/card/Card";
import { CardProps } from "antd/es/card/Card";

interface BaseCardInfoProps extends CardProps {
  children: React.ReactNode;
}

const BaseCardInfo: React.FC<BaseCardInfoProps> = ({ children, ...rest }) => {
  return (
    <Card
      hoverable
      variant="borderless"
      className="group !bg-[var(--card-background-color)] !rounded-2xl hover:!bg-[#404040] !transition-colors !duration-200 !ease-in-out"
      styles={{
        body: {
          padding: "16px",
        },
      }}
      {...rest}
    >
      <div className="flex gap-2 w-full">{children}</div>
    </Card>
  );
};

export default BaseCardInfo;
