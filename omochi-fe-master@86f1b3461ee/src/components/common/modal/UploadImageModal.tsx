import { IconClose } from "@/assets/icons";
import { ASPECT_RATIO_IMAGE } from "@/utils/constants";
import { Modal, Button, Slider, Typography } from "antd";
import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Trans, useTranslation } from "react-i18next";

const { Text } = Typography;

interface UploadImageModalProps {
  isModalOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  onCropComplete?: (croppedImage: string) => void;
  aspectRatio?: number;
}

const UploadImageModal = ({
  isModalOpen,
  onClose,
  imageUrl,
  onCropComplete,
  aspectRatio = ASPECT_RATIO_IMAGE.VENUE,
}: UploadImageModalProps) => {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Reset crop state when modal opens
  useEffect(() => {
    if (isModalOpen && imageUrl) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [isModalOpen, imageUrl]);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (_: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // create image object from img file
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  // get cropped image from image object
  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
      0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
    );

    return canvas.toDataURL("image/jpeg");
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!imageUrl || !croppedAreaPixels) return;

    setIsLoading(true);
    try {
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
      onCropComplete?.(croppedImage);
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <Modal
      open={isModalOpen}
      onCancel={handleCancel}
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
        mask: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
      className="!w-full !max-w-[500px] !p-6"
      zIndex={9999}
      maskClosable={false}
    >
      <div className="flex flex-col gap-4">
        <div className="flex-row-between gap-2">
          <Text className="text-base-white !font-bold">
            {t("upload_image.edit_image_title")}
          </Text>
          <Button
            type="text"
            className="!outline-none !p-0 flex-row-center !border-none !bg-transparent !h-auto"
            onClick={onClose}
          >
            <IconClose className="!w-5 !h-5 min-w-5 min-h-5 object-contain !text-white" />
          </Button>
        </div>
        {imageUrl && (
          <div
            className="relative w-full !rounded-2xl"
            style={{
              aspectRatio: aspectRatio,
            }}
          >
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              minZoom={1}
              maxZoom={3}
              restrictPosition={true}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteCallback}
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "8px",
                },
              }}
            />
          </div>
        )}

        <div className="flex-row-center gap-3 min-h-5">
          <Text className="text-xs-white">
            {t("upload_image.change_zoom_label")}
          </Text>
          <div className="flex-1">
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={setZoom}
              className="!m-0 slider-primary-custom"
              styles={{
                track: {
                  backgroundColor: "#FF5733",
                  height: "6px",
                },
                rail: {
                  backgroundColor: "#EEF1F4",
                  height: "6px",
                  borderRadius: "4px",
                },
                handle: {
                  backgroundColor: "#FFFFFF",
                  borderColor: "#FF5733",
                },
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Trans
            i18nKey="upload_image.notice_upload"
            components={[
              <Text className="text-xs-white" />,
              <Text className="text-xs-white" />,
            ]}
          />
        </div>

        <div className="flex w-full">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={!croppedAreaPixels}
            className="!flex-1 !h-10 !min-h-10 !max-h-10  !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex items-center justify-center"
          >
            {t("upload_image.save_upload_label")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UploadImageModal;
