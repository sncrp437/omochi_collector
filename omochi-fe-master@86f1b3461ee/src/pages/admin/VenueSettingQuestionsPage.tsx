/* eslint-disable react-hooks/exhaustive-deps */
import TopNavigationBar from "@/components/common/TopNavigationBar";
import {
  DEFAULT_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  ROUTE_PATH,
} from "@/utils/constants";
import { Spin, Form, Button, Typography, Checkbox } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { getListOrderQuestions, updateListOrderQuestions } from "@/api/venue";
import {
  VenueQuestionRequest,
  VenuesQuestionsRetrieveMultilingualEnum,
} from "@/generated/api";
import TextInput from "@/components/common/form/TextInput";
import { IconPlus, IconSave, IconDelete, IconClose } from "@/assets/icons";
import { toast } from "react-toastify";
import ButtonSwitch from "@/components/common/form/ButtonSwitch";
import { getQuestionValidationRules } from "@/rules/venue";

const { Text } = Typography;

interface QuestionFormValues {
  [key: string]: string | boolean;
}

const VenueSettingQuestionsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm<QuestionFormValues>();
  const venueId = useSelector(
    (state: RootState) => state.auth.user?.venue_roles[0]?.venue_id
  );

  // State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(
    DEFAULT_QUESTION_COUNT
  );
  const [isRemoveMode, setIsRemoveMode] = useState<boolean>(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(
    new Set()
  );
  const [enableQuestion, setEnableQuestion] = useState<boolean>(false);

  // Fetch order questions
  const fetchOrderQuestions = useCallback(async () => {
    if (!venueId) return;

    setIsLoading(true);
    try {
      const response = await getListOrderQuestions(
        venueId,
        VenuesQuestionsRetrieveMultilingualEnum.False
      );
      const questions = response.questions || [];

      // Set question count
      const count =
        questions.length > 0 ? questions.length : DEFAULT_QUESTION_COUNT;
      setQuestionCount(count);

      // Fill data to form
      const formValues: QuestionFormValues = {};
      questions.forEach((question, index) => {
        formValues[`question_${index}`] = question.question;
      });
      form.setFieldsValue(formValues);

      // Set enable question state
      setEnableQuestion(response.enable_order_questions);
    } catch (error) {
      console.error("Error fetching order questions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  // Fetch data on mount
  useEffect(() => {
    fetchOrderQuestions();
  }, [fetchOrderQuestions]);

  // Handle back to venue settings
  const handleBackToVenueSettings = useCallback(() => {
    if (isRemoveMode) {
      setIsRemoveMode(false);
      return;
    }
    navigate(
      `/${ROUTE_PATH.VENUE.DASHBOARD}/${ROUTE_PATH.VENUE.SETTINGS_VENUE}`
    );
  }, [navigate, isRemoveMode]);

  // Handle toggle remove mode
  const handleToggleRemoveMode = useCallback(() => {
    if (isRemoveMode && selectedQuestions.size > 0) {
      // Remove selected questions
      const currentValues = form.getFieldsValue();
      const remainingQuestions: string[] = [];

      // Get all unselected questions
      for (let i = 0; i < questionCount; i++) {
        if (!selectedQuestions.has(i)) {
          const questionValue = currentValues[`question_${i}`];
          remainingQuestions.push(questionValue as string);
        }
      }

      // Reset form with remaining questions
      const newFormValues: QuestionFormValues = {};

      // Clear all old fields
      for (let i = 0; i < questionCount; i++) {
        form.setFieldValue(`question_${i}`, undefined);
      }

      // Set remaining questions
      remainingQuestions.forEach((question, index) => {
        newFormValues[`question_${index}`] = question;
      });

      form.setFieldsValue(newFormValues);

      // Update question count
      const newCount = remainingQuestions.length;
      setQuestionCount(newCount);
    }
    setIsRemoveMode((prev) => !prev);
    setSelectedQuestions(new Set());
  }, [isRemoveMode, selectedQuestions, form, questionCount]);

  // Handle checkbox selection
  const handleCheckboxChange = useCallback(
    (index: number, checked: boolean) => {
      setSelectedQuestions((prev) => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(index);
        } else {
          newSet.delete(index);
        }
        return newSet;
      });
    },
    []
  );

  // Handle add question
  const handleAddQuestion = useCallback(() => {
    if (questionCount >= MAX_QUESTION_COUNT) {
      toast.warning(
        t("question.toast.max_question_reached", { max: MAX_QUESTION_COUNT })
      );
      return;
    }
    setQuestionCount((prev) => prev + 1);
  }, [questionCount, t]);

  // Handle update venue questions
  const handleUpdateVenueQuestions = useCallback(
    async (values: QuestionFormValues) => {
      if (!venueId || isSaving) return; // Prevent spam

      setIsSaving(true);
      try {
        // Convert form values to questions array
        const questions: VenueQuestionRequest[] = [];
        for (let i = 0; i < questionCount; i++) {
          const questionText = values[`question_${i}`];
          if (
            questionText &&
            typeof questionText === "string" &&
            questionText.trim()
          ) {
            questions.push({
              question: questionText.trim(),
            });
          }
        }

        // Update questions with enable flag from state
        await updateListOrderQuestions(venueId, enableQuestion, questions);
        toast.success(t("question.toast.update_question_success"));
        form.resetFields();
        await fetchOrderQuestions();
      } catch (error) {
        console.error("Error updating venue questions:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [venueId, isSaving, t, questionCount, enableQuestion, fetchOrderQuestions]
  );

  return (
    <Spin
      spinning={isLoading || isSaving}
      size="large"
      wrapperClassName="[&_.ant-spin]:!max-h-[100dvh]"
      className="[&_.ant-spin-dot-spin]:!text-[var(--primary-color)]"
    >
      <div className="!flex !flex-col !items-center !h-[100dvh] !bg-[#272525] !w-full !py-5">
        {/* Top navigation bar */}
        <TopNavigationBar
          title={t("question.venue_setting_questions_title")}
          onBack={handleBackToVenueSettings}
          hasRightIcons
          customBackIcon={
            isRemoveMode ? (
              <IconClose className="base-icon-size !text-white" />
            ) : undefined
          }
        >
          <div className="flex items-center gap-4">
            <Button
              type="text"
              onClick={handleToggleRemoveMode}
              disabled={!questionCount || isLoading || isSaving}
              className="!p-1 !flex !items-center !justify-end !bg-transparent !border-none !outline-none !min-w-10"
            >
              {isRemoveMode ? (
                <IconDelete className="!w-5 !h-5 !min-w-5 !min-h-5 !text-[var(--primary-color)]" />
              ) : (
                <Text className="text-base-primary !font-bold">
                  {t("general.remove_label")}
                </Text>
              )}
            </Button>
          </div>
        </TopNavigationBar>

        {/* Form Container */}
        <div className="!w-full !flex !flex-col !gap-6 !mt-4 !px-4 !flex-1 scrollbar-hidden overflow-y-auto motion-safe:scroll-smooth pb-[95px]">
          {!isLoading && (
            <Form
              form={form}
              name="orderQuestions"
              onFinish={handleUpdateVenueQuestions}
              layout="vertical"
              requiredMark={false}
              className="!w-full !flex !flex-col !gap-4"
            >
              <div className="!flex !flex-col !gap-4 !h-full">
                {/* Render dynamic question inputs */}
                {Array.from({ length: questionCount }).map((_, index) => (
                  <div key={index} className="!flex !flex-col !gap-2">
                    <div className="!flex !flex-row !items-start !gap-4">
                      {isRemoveMode && (
                        <Checkbox
                          checked={selectedQuestions.has(index)}
                          onChange={(e) =>
                            handleCheckboxChange(index, e.target.checked)
                          }
                          className="custom-question-checkbox"
                        />
                      )}
                      <Form.Item
                        name={`question_${index}`}
                        className="form-item-error-explanation !mb-0 !flex-1"
                        rules={getQuestionValidationRules(
                          form,
                          `question_${index}`,
                          questionCount
                        )}
                      >
                        <TextInput
                          placeholder={t(
                            "question.setting_question_placeholder"
                          )}
                          size="large"
                          disabled={isLoading || isSaving || isRemoveMode}
                          maxLength={255}
                          className="based-input-text-card"
                        />
                      </Form.Item>
                    </div>
                  </div>
                ))}

                {/* Add question */}
                {!isRemoveMode && questionCount < MAX_QUESTION_COUNT && (
                  <div className="!flex !flex-col !gap-2">
                    <Button
                      onClick={handleAddQuestion}
                      disabled={
                        isLoading ||
                        isSaving ||
                        questionCount >= MAX_QUESTION_COUNT
                      }
                      className="!w-full !h-10 !min-h-10 !outline-none !bg-[var(--card-background-color)] !border !border-[var(--border-color)] !border-dashed !rounded-xl flex-row-center !gap-2 disabled:!opacity-50 disabled:!cursor-not-allowed"
                    >
                      <IconPlus className="!w-5 !h-5 min-w-5 min-h-5 !text-white" />
                      <Text className="text-sm-white">
                        {t("question.add_question_label")}
                      </Text>
                    </Button>
                  </div>
                )}
              </div>
            </Form>
          )}
        </div>

        {/* Bottom Fixed Layout */}
        <div className="z-10 !flex !flex-col !fixed !bottom-0 !left-0 !right-0 !mx-auto !px-4 !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] !gap-6">
          {/* Enable question */}
          <div className="flex-row-between !gap-2 !bg-transparent !rounded-xl">
            <Text className="text-sm-white">
              {t("question.enable_question_label")}
            </Text>
            <ButtonSwitch
              disabled={isLoading || isSaving}
              value={enableQuestion}
              onChange={setEnableQuestion}
            />
          </div>

          {/* Save Button */}
          <Button
            type="primary"
            htmlType="submit"
            loading={isSaving}
            disabled={isLoading || isSaving}
            className="!w-full !h-10 !min-h-10 !max-h-10 !outline-none !bg-[var(--primary-color)] !border-none !rounded-[12px] flex-row-center !gap-2"
            onClick={() => form.submit()}
          >
            <IconSave className="!w-5 !h-5 !min-w-5 !min-h-5" />
            <Text className="text-sm-white">{t("general.edit_label")}</Text>
          </Button>
        </div>
      </div>
    </Spin>
  );
};

export default VenueSettingQuestionsPage;
