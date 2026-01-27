import { Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { useState } from "react";
import { IconPhotograph } from "@/assets/icons";
import UploadImageModal from "@/components/common/modal/UploadImageModal";
import { ASPECT_RATIO_IMAGE } from "@/utils/constants";
import { generateRandomString } from "@/utils/helper";
import { useTranslation } from "react-i18next";

interface UploadInputProps extends Omit<UploadProps, "onChange"> {
  className?: string;
  uploadClassName?: string;
  previewClassName?: string;
  previewContainerClassName?: string;
  uploadButtonClassName?: string;
  onChange?: (file: File | null) => void;
  previewImage?: string;
  onPreviewImageChange?: (url: string | undefined) => void;
  uploadIcon?: React.ReactNode;
  uploadText?: string;
  accept?: string;
  aspectRatio?: number;
}

const UploadInput = ({
  className = "",
  uploadClassName = "",
  previewClassName = "",
  previewContainerClassName = "",
  uploadButtonClassName = "",
  onChange,
  previewImage,
  onPreviewImageChange,
  uploadIcon,
  uploadText,
  accept = ".jpg,.jpeg,.png",
  aspectRatio = ASPECT_RATIO_IMAGE.VENUE,
  ...props
}: UploadInputProps) => {
  const { t } = useTranslation();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");
  const [originalFileName, setOriginalFileName] = useState<string>("");
  const [originalFileType, setOriginalFileType] = useState<string>("");

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  // Handle change image upload
  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    const latestFile = newFileList[newFileList.length - 1];
    setFileList(latestFile ? [latestFile] : []);

    if (latestFile?.originFileObj) {
      const originalFile = latestFile.originFileObj;
      setOriginalFileName(originalFile.name);
      setOriginalFileType(originalFile.type);

      getBase64(originalFile).then((url) => {
        setTempImageUrl(url);
        setIsCropModalOpen(true);
      });
    } else {
      onPreviewImageChange?.(undefined);
      onChange?.(null);
    }
  };

  // Handle crop image
  const handleCropComplete = (croppedImage: string) => {
    // Convert base64 to File object with original name and type
    fetch(croppedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const fileExtension = originalFileName?.split(".").pop() || "jpg";
        const fileNameWithoutExtension =
          originalFileName?.split(".").slice(0, -1).join(".") ||
          "cropped-image";
        const uniqueKey = generateRandomString();
        const fileName = `${fileNameWithoutExtension}_${uniqueKey}.${fileExtension}`;
        const fileType = originalFileType || "image/jpeg";

        const file = new File([blob], fileName, {
          type: fileType,
        });
        onPreviewImageChange?.(croppedImage);
        onChange?.(file);
      })
      .catch((error) => {
        console.error("Error processing cropped image:", error);
        handleCropModalClose();
      });
  };

  // Reset state upload image
  const handleResetState = () => {
    setFileList([]);
    setTempImageUrl("");
    setOriginalFileName("");
    setOriginalFileType("");
  };

  // Close crop modal
  const handleCropModalClose = () => {
    setIsCropModalOpen(false);
    handleResetState();
  };

  // Before upload image
  const beforeUpload = (file: File) => {
    const isValidFormatImage =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg") ||
      file.name.toLowerCase().endsWith(".png");

    if (!isValidFormatImage) {
      message.error(t("upload_input.error_invalid_format"));
      // Reset state when invalid format
      handleResetState();
      return Upload.LIST_IGNORE;
    }

    const isLt1MB = file.size / 1024 / 1024 < 1;
    if (!isLt1MB) {
      message.error(t("upload_input.error_file_size"));
      // Reset state when file too large
      handleResetState();
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  return (
    <>
      <Upload
        name="image"
        listType="picture-card"
        className={`${uploadClassName} ${className}`}
        showUploadList={false}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onChange={handleChange}
        accept={accept}
        {...props}
      >
        {previewImage ? (
          <div className={`${previewContainerClassName} cursor-pointer`}>
            <img
              src={previewImage}
              alt="preview"
              className={previewClassName}
              style={{ aspectRatio }}
            />
          </div>
        ) : (
          <div className={uploadButtonClassName}>
            {uploadIcon || (
              <IconPhotograph className="!w-12 !h-12 !text-white" />
            )}
            <span className="!text-white !text-[12px] !text-center">
              {uploadText || t("upload_input.upload_text_default")}
            </span>
          </div>
        )}
      </Upload>

      <UploadImageModal
        isModalOpen={isCropModalOpen}
        onClose={handleCropModalClose}
        imageUrl={tempImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={aspectRatio}
      />
    </>
  );
};

export default UploadInput;
