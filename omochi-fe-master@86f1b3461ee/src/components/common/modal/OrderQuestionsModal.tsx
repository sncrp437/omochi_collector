/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from "react";
import { Modal, Button, Typography, Form } from "antd";
import { useTranslation } from "react-i18next";
import { VenueQuestion } from "@/generated/api";
import TextAreaInput from "@/components/common/form/TextAreaInput";

const { Text } = Typography;

interface OrderQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answers: Record<string, string>) => void;
  questions: VenueQuestion[];
  loading?: boolean;
  initialAnswers?: Record<string, string>;
}

const OrderQuestionsModal: React.FC<OrderQuestionsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  questions,
  loading = false,
  initialAnswers = {},
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form values when questions/initialAnswers change
  useEffect(() => {
    if (!questions || questions.length === 0) return;
    const initialValues: Record<string, string> = {};
    questions.forEach((q) => {
      initialValues[q.id] = initialAnswers[q.id] || "";
    });
    form.setFieldsValue(initialValues);
  }, [questions, initialAnswers]);

  // Handle form submission with spam protection
  const handleSubmit = useCallback(async () => {
    // Prevent spam clicking
    if (isSubmitting || loading) return;

    setIsSubmitting(true);
    try {
      const values = await form.validateFields();
      // values is a map of { [questionId]: answer }
      await onSubmit(values as Record<string, string>);
    } catch (error) {
      console.error("Error submitting form order questions", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isSubmitting, loading, onSubmit]);

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closeIcon={false}
      centered
      width={327}
      styles={{
        content: {
          background: "#272525",
          borderRadius: "16px",
          padding: "16px",
        },
      }}
      className="!w-full !max-w-[500px] !p-6 !pb-4"
      maskClosable={!loading && !isSubmitting}
    >
      <div className="flex flex-col gap-4">
        <Text className="text-xs-white !font-bold text-center">
          {t("order.label.order_confirmation_questions_label")}
        </Text>
        <Text className="text-xs-white">
          {t("question.note_question_modal_label")}
        </Text>

        {/* Questions */}
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="flex flex-col gap-4">
            {questions.map((question) => (
              <div key={question.id} className="flex flex-col gap-2">
                <Text className="text-xs-white !font-bold">
                  {question.question}
                </Text>
                <Form.Item
                  name={question.id}
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: t("question.validation.answer_required"),
                    },
                  ]}
                  // Our TextAreaInput calls onChange with a string; tell Form how to read it
                  getValueFromEvent={(v) => v}
                >
                  <TextAreaInput
                    placeholder={t("question.user_answer_placeholder")}
                    maxLength={50}
                    className="textarea-dynamic !border-[var(--border-color)] scrollbar-hidden"
                    autoSize={{ minRows: 4, maxRows: 6 }}
                    disableTrim
                  />
                </Form.Item>
              </div>
            ))}
          </div>
        </Form>

        {/* Submit Button */}
        <div className="z-10 !flex !justify-center !sticky !bottom-0 !left-0 !right-0 !mx-auto !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            className="!flex-1 !h-[40px] !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex items-center justify-center"
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
            loading={isSubmitting || loading}
          >
            {t("order.label.order_confirm_label")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default OrderQuestionsModal;
