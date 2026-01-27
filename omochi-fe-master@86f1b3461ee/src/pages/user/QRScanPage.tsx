/* eslint-disable @typescript-eslint/no-explicit-any */
import TopNavigationBar from "@/components/common/TopNavigationBar";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";
import { ROUTE_PATH } from "@/utils/constants";
import { Modal, Button, Typography } from "antd";

const { Text } = Typography;

const QRScanPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [isDeniedCamera, setIsDeniedCamera] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleScan = (result: string) => {
    try {
      const url = new URL(result);
      const currentHost = window.location.hostname;

      if (
        url.hostname === currentHost &&
        url.pathname.startsWith(`/${ROUTE_PATH.STORE.ROOT_STORE}`)
      ) {
        qrScannerRef.current?.stop();
        qrScannerRef.current?.destroy();
        const internalPath = url.pathname + url.search + url.hash;
        navigate(internalPath);
      } else {
        setIsModalOpen(true);
        qrScannerRef.current?.stop();
      }
    } catch (error) {
      setIsModalOpen(true);
      qrScannerRef.current?.stop();
      console.error("Invalid URL:", error);
    }
  };
  const initQrScanner = async () => {
    try {
      if (!videoRef.current) return;

      // Using facing back camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
      };

      const QrAny = QrScanner as any;
      const qrInstance: QrScanner = new QrAny(
        videoRef.current,
        (res: QrScanner.ScanResult) => {
          const textCode = res.data;
          handleScan(textCode);
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: false,
        }
      );

      await qrInstance.start();
      qrScannerRef.current = qrInstance;
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setIsDeniedCamera(true);
      }
    }
  };

  // Handle window resize to reinitialize the QR scanner
  const handleResize = useRef(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }

    setTimeout(() => {
      initQrScanner();
    }, 300);
  }).current;

  useEffect(() => {
    initQrScanner();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      const qr = qrScannerRef.current;
      if (qr) {
        qr.stop();
        qr.destroy();
        qrScannerRef.current = null;
      }
    };
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      qrScannerRef.current?.start();
    }, 300);
  };

  return (
    <>
      <div className="flex flex-col items-center !h-[100dvh] max-h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
        <TopNavigationBar
          title={t("order.title.qr_scan_title")}
          onBack={() => navigate(`/${ROUTE_PATH.USER.DASHBOARD}`)}
        />

        <div className="flex flex-col w-full px-4 flex-1 mt-4 scrollbar-hidden overflow-y-auto">
          <div className="relative w-full max-w-[500px] mx-auto overflow-hidden rounded-2xl bg-[var(--card-background-color)] aspect-square flex-1">
            {isDeniedCamera ? (
              <div className="flex flex-col gap-2 px-4 justify-center h-full">
                <Text className="text-sm-white">
                  {t("qr_scan.camera_permission_required")}
                </Text>
                <Text className="text-sm-white">
                  {t("qr_scan.solution_title")}
                </Text>
                <Text className="text-sm-white">
                  {t("qr_scan.solution_step_1")}
                </Text>
                <Text className="text-sm-white">
                  {t("qr_scan.solution_step_2")}
                </Text>
                <Text className="text-sm-white">
                  {t("qr_scan.solution_step_3")}
                </Text>
              </div>
            ) : (
              <video
                ref={videoRef}
                className="object-cover w-full h-full flex-1 rounded-2xl"
                playsInline
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        closeIcon={false}
        centered
        width={327}
        styles={{
          content: {
            background: "#272525",
            borderRadius: "16px",
            padding: "24px",
          },
        }}
        className="!w-full !max-w-[500px] !p-6"
      >
        <div className="flex flex-col items-center justify-center gap-6">
          <Text className="text-sm-white">{t("qr_scan.qr_scan_error")}</Text>
          <div className="flex w-full">
            <Button
              className="!flex-1 !h-[40px] !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex items-center justify-center"
              onClick={handleCloseModal}
            >
              {t("general.close")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QRScanPage;
