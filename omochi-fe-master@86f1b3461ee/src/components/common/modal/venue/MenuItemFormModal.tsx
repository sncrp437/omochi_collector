/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import "@/components/common/ConfirmLogoutModal.css";
import { Modal, Button, Typography, Form } from "antd";
import { IconClose, IconCurrencyYen, IconWarning } from "@/assets/icons";
import { useTranslation, Trans } from "react-i18next";
import TextInput from "@/components/common/form/TextInput";
import SelectInput from "@/components/common/form/SelectInput";
import UploadInput from "@/components/common/form/UploadInput";
import BaseRadioInput from "@/components/common/form/BaseRadioInput";
import {
  FormModeEnum,
  PRE_ORDER_OPTIONS,
  PreOrderEnum,
  CATEGORY_PRIORITY_PASS_ID,
  ASPECT_RATIO_IMAGE,
} from "@/utils/constants";
import { OptionType } from "@/types/common";
import { MenuItem, MenuItemRequest } from "@/generated/api";
import { formatYen, parseYen, deepEqual } from "@/utils/helper";
import {
  getNameRules,
  getDescriptionRules,
  getCategoryRules,
  getEatInRules,
  getTakeOutRules,
  getCategoryValidator,
} from "@/rules/menu";
import TextAreaInput from "@/components/common/form/TextAreaInput";
import BaseModalConfirm from "@/components/common/modal/BaseModalConfirm";

const { Text } = Typography;

interface MenuItemFormModalProps {
  typeOpen: string;
  onClose: () => void;
  handleConfirm: (payload: MenuItemRequest) => Promise<void>;
  loading?: boolean;
  menuCategories?: OptionType[];
  menuDetails?: MenuItem | null;
  hasPriorityPassItems?: boolean;
}

const MenuItemFormModal: React.FC<MenuItemFormModalProps> = ({
  typeOpen,
  onClose,
  handleConfirm,
  loading = false,
  menuCategories = [],
  menuDetails = null,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [previewImage, setPreviewImage] = useState<string | undefined>(
    undefined
  );
  const [preOrderStatus, setPreOrderStatus] = useState<string>(
    PreOrderEnum.YES
  );
  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<any>({});
  const contentConfirm =
    typeOpen === FormModeEnum.EDIT ? "general.edit_label" : "general.add_label";
  const titleModal =
    typeOpen === FormModeEnum.EDIT
      ? t("venue.title.menu_item_edit_title")
      : t("venue.title.menu_item_add_title");

  // Filter out priority pass category for non-priority pass items
  const filteredCategories = useMemo(() => {
    if (
      typeOpen === FormModeEnum.EDIT &&
      menuDetails &&
      !menuDetails.is_priority_pass
    ) {
      return menuCategories.filter(
        (category) =>
          !category?.system_category &&
          category.value !== CATEGORY_PRIORITY_PASS_ID
      );
    }
    return menuCategories;
  }, [menuCategories, menuDetails, typeOpen]);

  useEffect(() => {
    if (menuDetails && typeOpen === FormModeEnum.EDIT) {
      const initValues = {
        name: menuDetails.name,
        image: menuDetails.image,
        description: menuDetails.description,
        eatInPrice: formatYen(menuDetails.price),
        category: menuDetails.category,
      };
      setPreviewImage(menuDetails?.image || "");
      setPreOrderStatus(
        menuDetails.take_out_price ? PreOrderEnum.YES : PreOrderEnum.NO
      );
      if (
        menuDetails.take_out_price !== undefined &&
        menuDetails.take_out_price !== null
      ) {
        Object.assign(initValues, {
          takeOutPrice: formatYen(menuDetails.take_out_price),
        });
      }
      setInitialFormValues(initValues);
      form.setFieldsValue(initValues);
    }
  }, [menuDetails, form, typeOpen]);

  // Handle form reset and close modal
  const handleForceCloseModal = () => {
    setShowModalConfirm(false);
    form.resetFields();
    setPreviewImage(undefined);
    setPreOrderStatus(PreOrderEnum.YES);
    onClose();
  };

  // Check if the form has changed
  const hasFormChanged = () => {
    const currentValues = form.getFieldsValue();
    return !deepEqual(currentValues, initialFormValues);
  };

  // Handle attempt to close modal
  const handleAttemptCloseModal = () => {
    if (hasFormChanged() && typeOpen === FormModeEnum.EDIT) {
      setShowModalConfirm(true);
    } else {
      form.resetFields();
      setPreviewImage(undefined);
      setPreOrderStatus(PreOrderEnum.YES);
      onClose();
    }
  };

  // Handle confirm button submit form
  const handleConfirmInternal = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name.trim(),
        description: values.description,
        price: parseYen(values.eatInPrice),
        category: values.category,
        take_out_price:
          preOrderStatus === PreOrderEnum.YES
            ? parseYen(values.takeOutPrice)
            : "",
        is_priority_pass: menuDetails?.is_priority_pass,
      };

      if (values.image instanceof File) {
        Object.assign(payload, {
          image: values.image,
        });
      }

      await handleConfirm(payload);

      handleForceCloseModal();
    } catch (error) {
      console.warn("Validation failed:", error);
    }
  };

  const isPriorityPass = useMemo(() => {
    return typeOpen === FormModeEnum.EDIT && menuDetails?.is_priority_pass;
  }, [typeOpen, menuDetails]);

  return (
    <>
      <Modal
        open={!!typeOpen}
        onCancel={handleAttemptCloseModal}
        destroyOnClose={true}
        footer={null}
        centered
        width={327}
        styles={{
          content: {
            background: "#272525",
            borderRadius: "16px",
            padding: "16px",
          },
          header: {
            background: "#272525",
          },
          mask: {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          },
        }}
        closeIcon={false}
        className="!w-full !max-w-[500px] !p-6"
        maskClosable={false}
      >
        <div className="flex flex-col gap-2">
          <div className="flex-row-between gap-2 bg-[var(--background-color)]">
            <Text className="text-base-white font-bold">{t(titleModal)}</Text>

            <Button
              type="text"
              className="!outline-none !w-9 !h-9 !min-w-9 !min-h-9 !p-0 flex-row-center !bg-[var(--card-background-color)] hover:!bg-[#404040] !border-none"
              onClick={handleAttemptCloseModal}
            >
              <IconClose className="!w-5 !h-5 min-w-5 min-h-5 object-contain !text-white" />
            </Button>
          </div>

          <Form
            form={form}
            name="menuItemForm"
            layout="vertical"
            requiredMark={false}
            className="!w-full !flex !flex-col !gap-4"
          >
            <Form.Item
              name="name"
              className="form-item-error-explanation"
              label={
                <Text className="text-xs-white !font-bold">
                  {t("order.label.menu_item_name_label")} *
                </Text>
              }
              rules={getNameRules()}
            >
              <TextInput
                placeholder={t("order.label.menu_item_name_label")}
                size="large"
                disabled={loading}
                maxLength={15}
                className="based-input-text"
              />
            </Form.Item>

            <Form.Item
              name="image"
              className="form-item-error-explanation"
              label={
                <Text className="text-xs-white !font-bold">
                  {t("venue.label.menu_item_image_label")}
                </Text>
              }
            >
              <UploadInput
                previewImage={previewImage}
                onPreviewImageChange={setPreviewImage}
                onChange={(file) => form.setFieldValue("image", file)}
                uploadClassName="!aspect-[3/2] !w-full !bg-transparent [&_.ant-upload-select]:!w-full [&_.ant-upload-select]:!h-full [&_.ant-upload-list-item-container]:!w-full [&_.ant-upload-list-item]:!bg-[var(--background-color)] [&_.ant-upload]:!border-0 [&_.ant-upload-select-picture-card]:!border-0 [&_.ant-upload-select-picture-card]:!bg-transparent [&_.ant-upload-select-picture-card]:!w-full [&_.ant-upload-select-picture-card]:!m-0"
                previewContainerClassName="!w-full !h-full !border-[1px] !border-white !rounded-[12px] !bg-[var(--background-color)] flex-row-center !overflow-hidden"
                previewClassName="!w-full !max-w-full !object-cover"
                uploadButtonClassName="!w-full !h-full !border-[1px] !border-white !rounded-[12px] !bg-[var(--background-color)] flex-col-center !gap-2"
                aspectRatio={ASPECT_RATIO_IMAGE.MENU_ITEM}
              />
            </Form.Item>

            <Form.Item
              name="description"
              className="form-item-error-explanation"
              label={
                <Text className="text-xs-white !font-bold">
                  {t("venue.label.menu_item_description_label")} *
                </Text>
              }
              rules={getDescriptionRules()}
            >
              <TextAreaInput
                placeholder={t("venue.label.menu_item_description_label")}
                size="large"
                disabled={loading}
                className="textarea-dynamic !border-white scrollbar-hidden"
                maxLength={150}
                disableTrim
              />
            </Form.Item>

            <Form.Item
              name="eatInPrice"
              className="form-item-error-explanation"
              label={
                <Text className="text-xs-white !font-bold">
                  {t("venue.label.menu_item_dine_in_tax_label")}*
                </Text>
              }
              rules={getEatInRules()}
              normalize={(value) => formatYen(value)}
            >
              <TextInput
                placeholder={t("venue.label.menu_item_dine_in_tax_label")}
                size="large"
                disabled={loading}
                className="based-input-text"
                inputMode="decimal"
                suffixIcon={
                  <IconCurrencyYen className="!w-5 !h-5 !min-w-5 !min-h-5 !flex-shrink-0 !text-white" />
                }
              />
            </Form.Item>

            <div className="flex flex-col gap-2">
              <Text className="text-xs-white !font-bold">
                {t("venue.label.menu_item_take_out_tax_label")}
              </Text>

              <BaseRadioInput
                value={preOrderStatus}
                options={PRE_ORDER_OPTIONS}
                onChange={(value: string) => setPreOrderStatus(value)}
              />
              {preOrderStatus === PreOrderEnum.YES && (
                <Form.Item
                  name="takeOutPrice"
                  className="form-item-error-explanation !pt-2"
                  rules={getTakeOutRules()}
                  normalize={(value) => formatYen(value)}
                >
                  <TextInput
                    placeholder={t("venue.label.menu_item_take_out_tax_label")}
                    size="large"
                    disabled={loading}
                    className="based-input-text"
                    inputMode="decimal"
                    suffixIcon={
                      <IconCurrencyYen className="!w-5 !h-5 !min-w-5 !min-h-5 !flex-shrink-0 !text-white" />
                    }
                  />
                </Form.Item>
              )}
            </div>

            <Form.Item
              name="category"
              className="form-item-error-explanation form-item-disabled"
              label={
                <Text className="text-xs-white !font-bold">
                  {t("venue.label.menu_item_category_label")} *
                </Text>
              }
              rules={[
                ...getCategoryRules(),
                { validator: getCategoryValidator(filteredCategories) },
              ]}
            >
              <SelectInput
                placeholder={t("venue.label.menu_item_category_label")}
                size="large"
                disabled={loading || isPriorityPass}
                readOnly={isPriorityPass}
                className="!text-white placeholder-fix !h-[48px]"
                options={filteredCategories}
                popupClassName="!bg-[var(--background-color)]"
                style={{ width: "100%", font: "inherit" }}
                rootClassName="custom-select dark-select"
              />
            </Form.Item>

            {/* Button Bottom */}
            <div className="z-10 !flex !justify-center !sticky !bottom-0 !left-0 !right-0 !mx-auto !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
              <Button
                type="text"
                className={
                  "!flex-1 !h-10 !max-h-10 !bg-transparent !border !border-white !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none "
                }
                style={{ height: "unset" }}
                onClick={handleAttemptCloseModal}
              >
                <Text className="text-sm-white">{t("general.back")}</Text>
              </Button>
              <Button
                type="text"
                className={
                  "!flex-1 !h-10 !max-h-10 !border-none !rounded-xl !flex !items-center !justify-center !px-4 !py-[10px] !outline-none !bg-[var(--primary-color)] !text-white "
                }
                style={{ height: "unset" }}
                onClick={() => handleConfirmInternal()}
                loading={loading}
                disabled={loading}
              >
                <Text className="text-sm-white">{t(contentConfirm)}</Text>
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      <BaseModalConfirm
        isOpen={showModalConfirm}
        onClose={() => setShowModalConfirm(false)}
        handleConfirm={handleForceCloseModal}
        message={
          <Trans
            i18nKey="venue.label.menu_item_edit_confirm"
            components={[
              <Text className="text-sm-white !font-bold !text-center" />,
              <Text className="text-sm-white !font-bold !text-center" />,
            ]}
          />
        }
        cancelText={t("venue.label.menu_item_edit_confirm_cancel")}
        confirmText={t("venue.label.menu_item_edit_confirm_ok")}
        fixedWidthButton
        loading={loading}
        icon={
          <IconWarning className="!text-white !w-[96px] !h-[96px] !min-w-[96px] !min-h-[96px]" />
        }
      />
    </>
  );
};

export default MenuItemFormModal;
