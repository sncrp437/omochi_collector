import { Modal, Typography, Button } from "antd";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import "@/components/common/ConfirmLogoutModal.css";
import { IconCopy, IconLINE, IconTikTok } from "@/assets/icons";
import facebookIcon from "@/assets/images/facebook.png";
import xIcon from "@/assets/images/x.png";
import mailIcon from "@/assets/images/mail.png";
import instagramIcon from "@/assets/images/instagram.png";
import qrIcon from "@/assets/images/qr.png";
import QrModal from "./QrModal";

import {
  getShareUrlTwitter,
  getShareUrlFacebook,
  getShareUrlLine,
  getShareUrlEmail,
  handleDownloadQR,
  getShareUrlInstagram,
  getShareUrlTikTok,
} from "@/utils/share";
import { copyClipboard } from "@/utils/clipboard";
const { Text } = Typography;

interface ShareSNSProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: {
    title: string;
    url: string;
  }[];
  hashtags?: string;
}

const ShareSNS = ({ isOpen, onClose, title, url }: ShareSNSProps) => {
  const { t } = useTranslation();
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  const shareText = `${t("share.template.recommendation", {
    venues: url.map((item) => item.title).join(", "),
  })}

${t("share.template.invitation_label")}
${t("share.template.description")}

${t("share.template.benefit_1")}
${t("share.template.benefit_2")}
${t("share.template.benefit_3")}
${t("share.template.benefit_4")}

${t("share.template.call_to_action")}

${url.map((item) => `${item.title}: ${item.url}`).join("\n\n")}

${t("share.template.hashtags")}`;

  const handleShare = (platform: string) => {
    let shareUrl = "";
    switch (platform) {
      case "facebook":
        shareUrl = getShareUrlFacebook(url[0].url);
        window.open(shareUrl, "_blank");
        break;
      case "twitter":
        shareUrl = getShareUrlTwitter(shareText);
        window.open(shareUrl, "_blank");
        break;
      case "line":
        shareUrl = getShareUrlLine(shareText, url[0].url);
        window.open(shareUrl, "_blank");
        break;
      case "email":
        shareUrl = getShareUrlEmail(title, shareText);
        window.open(shareUrl, "_blank");
        break;
      case "instagram":
        shareUrl = getShareUrlInstagram();
        window.open(shareUrl, "_blank");
        break;
      case "tiktok":
        shareUrl = getShareUrlTikTok();
        window.open(shareUrl, "_blank");
        break;
      case "qr":
        if (url.length === 0) {
          return;
        }
        setIsQrModalVisible(true);
        break;
      default:
        return;
    }
  };

  const handleQrConfirm = (hasShare: boolean) => {
    if (hasShare && url.length > 0) {
      url.forEach((item, index) => {
        setTimeout(() => {
          handleDownloadQR(item.url);
        }, index * 500);
      });
    }
    setIsQrModalVisible(false);
  };

  const handleQrModalClose = () => {
    setIsQrModalVisible(false);
  };

  const handleCopyContent = () => {
    copyClipboard(shareText, t("general.copy_success"));
  };

  const firstRowPlatforms = [
    {
      key: "facebook",
      icon: facebookIcon,
      label: "Facebook",
    },
    {
      key: "twitter",
      icon: xIcon,
      label: "X",
    },
    {
      key: "instagram",
      icon: instagramIcon,
      label: "Instagram",
    },
    {
      key: "tiktok",
      icon: IconTikTok,
      label: "TikTok",
    },
  ];

  const secondRowPlatforms = [
    {
      key: "line",
      icon: IconLINE,
      label: "Line",
    },
    {
      key: "email",
      icon: mailIcon,
      label: "Email",
    },
    {
      key: "qr",
      icon: qrIcon,
      label: "QR Code",
    },
  ];

  return (
    <Modal
      open={isOpen}
      footer={null}
      centered
      className="share-sns-modal contact-modal [&_.ant-modal-close]:!text-white [&_.ant-modal-close]:hover:!text-white/80 !w-full !max-w-[500px] !p-6"
      width={327}
      closable={false}
    >
      <div className="flex flex-col items-center gap-6">
        <Text className="text-sm-white !font-bold">{t("share.title")}</Text>
        <div className="flex flex-col gap-4 w-full px-4">
          <div className="grid grid-cols-4 gap-4">
            {firstRowPlatforms.map((platform) => (
              <div
                key={platform.key}
                onClick={() => handleShare(platform.key)}
                className="flex flex-col items-center gap-2 rounded-lg !bg-transparent cursor-pointer"
              >
                <img
                  src={platform.icon}
                  alt={platform.label}
                  className="w-[60px] h-[60px] object-contain"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            {secondRowPlatforms.map((platform) => (
              <div
                key={platform.key}
                onClick={() => handleShare(platform.key)}
                className="flex flex-col items-center gap-2 rounded-lg !bg-transparent cursor-pointer"
                style={{ width: "60px" }}
              >
                <img
                  src={platform.icon}
                  alt={platform.label}
                  className="w-[60px] h-[60px] object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Share Content */}
        <div className="!flex !flex-row !justify-stretch !items-stretch !gap-[22px]">
          <div className="!flex !flex-col !gap-2 !flex-1">
            <Text className="text-xs-white !font-bold">
              {t("share.post_title")}
            </Text>
            <div className="!bg-[#383838] !rounded-[12px] !p-3 !flex !flex-col !justify-center !items-center !gap-2">
              <Text
                className="!text-white !text-xs !font-normal !leading-[1.2] !w-full"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {shareText}
              </Text>
            </div>
          </div>
        </div>

        <div className="!flex !flex-col gap-5 w-full sticky bottom-0 left-0 right-0 mx-auto z-999999 !bg-[#272525]">
          <div className="!flex !flex-row !justify-stretch !items-stretch !gap-[22px] !w-full !h-10">
            <Button
              onClick={handleCopyContent}
              className="!bg-[#009688] !rounded-[12px] !px-4 !py-2 !h-10 !flex !flex-row !justify-center !items-center !gap-2 !w-full !border-none !outline-none hover:!bg-[#00695c]"
            >
              <Text className="!text-white !text-xs !font-normal !leading-[1.2em] !text-center !mt-[3px]">
                {t("share.copy_post")}
              </Text>
              <IconCopy className="!w-5 !h-5 !text-white !absolute !right-3" />
            </Button>
          </div>

          {/* Close Button */}
          <div className="flex w-full gap-[22px]">
            <Button
              className="flex-1 !h-[40px] !bg-transparent !hover:text-white !hover:border-transparent !outline-none border border-white !rounded-[12px] !text-white text-[14px] font-bold font-['Noto_Sans_JP'] flex items-center justify-center"
              onClick={onClose}
            >
              {t("general.close")}
            </Button>
          </div>
        </div>
      </div>

      <QrModal
        isVisible={isQrModalVisible}
        onClose={handleQrModalClose}
        onConfirm={handleQrConfirm}
      />
    </Modal>
  );
};

export default ShareSNS;
