import { Typography } from "antd";
import { useTranslation } from "react-i18next";
import BaseCardInfo from "@/components/card/BaseCardInfo";
import { OrderQuestion } from "@/generated/api";

const { Text } = Typography;

interface OrderQuestionsCardProps {
  orderQuestions: OrderQuestion[];
}

const OrderQuestionsCard: React.FC<OrderQuestionsCardProps> = ({
  orderQuestions,
}) => {
  const { t } = useTranslation();

  // Don't render if no questions
  if (!orderQuestions || !orderQuestions?.length) {
    return null;
  }

  return (
    <BaseCardInfo>
      <div className="flex flex-col w-full gap-4">
        {orderQuestions.map((question) => {
          const hasAnswer =
            question.answer && question.answer.trim().length > 0;

          return (
            <div key={question.id} className="flex flex-col gap-1.5">
              {/* Question */}
              <Text className="text-sm-white !font-bold">
                {question.question}
              </Text>

              {/* Answer */}
              <Text
                className={`!text-sm font-family-base !leading-[1.2em] ${
                  hasAnswer
                    ? "!text-white"
                    : "!text-[var(--background-gray-color)]"
                }`}
              >
                {hasAnswer ? question.answer : t("order.label.no_answer")}
              </Text>
            </div>
          );
        })}
      </div>
    </BaseCardInfo>
  );
};

export default OrderQuestionsCard;
