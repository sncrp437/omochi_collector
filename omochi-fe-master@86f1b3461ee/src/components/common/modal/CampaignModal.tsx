import { Modal, Button, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { IconClose } from "@/assets/icons";
import { Campaign } from "@/generated/api";
import useEmblaCarousel from "embla-carousel-react";
import { convertDateToLocalizedWithDeadline } from "@/utils/date";
import { DotButtonGroup } from "@/components/common/DotButtonGroup";
import { useDotButton } from "@/hooks/useDotButtonCarousel";
import { isEmpty, isValidUrl } from "@/utils/helper";
import ImageCarousel from "@/components/ImageCarousel";
import { useStoreNavigation } from "@/hooks/useStoreNavigation";
import { STOCK_STORE_STATE } from "@/utils/constants";
import { useState, useCallback, useEffect, useMemo } from "react";

const { Text } = Typography;

interface CampaignModalProps {
  isModalOpen: boolean;
  onClose: () => void;
  listCampaigns: Campaign[];
  onSaveState?: () => void;
  fromParam?: string;
}

const CampaignModal = ({
  isModalOpen,
  onClose,
  listCampaigns = [],
  onSaveState = () => {},
  fromParam = STOCK_STORE_STATE.FROM_PARAM,
}: CampaignModalProps) => {
  const { t } = useTranslation();
  const { navigateToStore } = useStoreNavigation({ onSaveState, fromParam });
  const [isNavigating, setIsNavigating] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
  });

  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

  // Reset carousel when modal open
  const resetCarousels = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollTo(0);
    }
    setResetKey((prev) => prev + 1);
  }, [emblaApi]);

  useEffect(() => {
    if (isModalOpen) {
      resetCarousels();
    }
  }, [isModalOpen, resetCarousels]);

  // Memoize filtered campaigns
  const validCampaigns = useMemo(() => {
    return listCampaigns.filter((campaign) => !isEmpty(campaign.target_venue));
  }, [listCampaigns]);

  // handle open cta link of campaign
  const handleOpenCtaLink = useCallback(() => {
    if (isNavigating) return;

    try {
      if (selectedIndex < 0 || selectedIndex >= validCampaigns.length) {
        console.error("Invalid selectedIndex:", selectedIndex);
        return;
      }

      setIsNavigating(true);
      const currentCampaign = validCampaigns[selectedIndex];

      if (!currentCampaign) {
        console.error("Campaign not found at index:", selectedIndex);
        return;
      }

      const { cta_link = "", target_venue } = currentCampaign;

      if (cta_link && isValidUrl(cta_link)) {
        window.open(cta_link, "_blank", "noopener,noreferrer");
      } else if (target_venue?.id) {
        navigateToStore(target_venue.id);
      }
    } catch (error) {
      console.error("Error handling CTA link:", error);
    } finally {
      setIsNavigating(false);
    }
  }, [isNavigating, selectedIndex, validCampaigns, navigateToStore]);

  // Memoize modal content để tránh re-render
  const campaignModalContent = useMemo(() => {
    if (!validCampaigns?.length) {
      return (
        <div className="flex-grow flex items-center justify-center py-10">
          <Text className="text-sm-white">{t("general.no_data")}</Text>
        </div>
      );
    }

    return (
      <>
        <div className="embla overflow-hidden" ref={emblaRef}>
          <div className="flex gap-2">
            {validCampaigns.map((campaign, index) => {
              const {
                image_urls = [],
                target_venue,
                title,
                description = "",
              } = campaign;

              return (
                <div
                  key={`campaign-${campaign.id || index}-${index}`}
                  className="flex-[0_0_100%] min-w-0"
                >
                  <div className="flex flex-col gap-[10px] h-full">
                    <Text className="text-base-white !font-bold">
                      {target_venue?.name}
                    </Text>

                    <ImageCarousel
                      key={`image-carousel-${resetKey}-${campaign.id || index}`}
                      imageUrls={image_urls}
                      altText="Campaign image"
                    />

                    <div className="flex-row-center bg-[var(--dark-blue-color)] rounded-xl px-[10px] !h-5 !min-h-5 w-fit">
                      <Text className="text-xs-white !font-bold">
                        {campaign.end_date &&
                          convertDateToLocalizedWithDeadline(
                            campaign.end_date,
                            t("campaign.deadline_label")
                          )}
                      </Text>
                    </div>

                    <Text className="text-base-white !font-bold !whitespace-pre-wrap">
                      {title}
                    </Text>

                    <div
                      className={`!overflow-y-auto flex-1 !scroll-smooth motion-safe:scroll-smooth scrollbar-primary !min-h-0
                      ${
                        !image_urls.length ? "!max-h-[400px]" : "!max-h-[200px]"
                      }`}
                    >
                      <div
                        className="text-xs-white !whitespace-pre-wrap word-break !leading-[normal] !w-full !max-w-full"
                        dangerouslySetInnerHTML={{
                          __html: description,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campaign dots indicator */}
        <div className="flex-row-center">
          <DotButtonGroup
            selectedIndex={selectedIndex}
            scrollSnaps={scrollSnaps}
            onDotButtonClick={onDotButtonClick}
          />
        </div>

        <div className="z-10 !flex !justify-center !sticky !bottom-0 !left-0 !right-0 !mx-auto !w-full !max-w-[500px] !py-2 !bg-[var(--background-color)] items-center gap-4 flex-wrap">
          <Button
            type="text"
            style={{ height: "unset" }}
            className="!flex-1 !h-10 !min-h-10 !max-h-10 !bg-[var(--primary-color)] !outline-none !border-none !rounded-xl text-sm-white !font-bold flex-row-center"
            onClick={handleOpenCtaLink}
            aria-label="View menu"
            role="button"
            loading={isNavigating}
            disabled={isNavigating}
          >
            <Text className="text-sm-white !font-bold">
              {t("campaign.button_view_menu_label")}
            </Text>
          </Button>
        </div>
      </>
    );
  }, [
    validCampaigns,
    resetKey,
    emblaRef,
    selectedIndex,
    scrollSnaps,
    onDotButtonClick,
    handleOpenCtaLink,
    isNavigating,
    t,
  ]);

  return (
    <Modal
      open={isModalOpen}
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
          position: "relative",
        },
        mask: {
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      }}
      className="!w-full !max-w-[500px] !p-6 !relative"
      zIndex={9999}
      maskClosable={false}
    >
      <div className="flex flex-col gap-2">
        <div className="flex-row-between gap-2 relative">
          <div className="flex-row-center bg-[var(--background-teal-color)] rounded-xl px-[10px] !h-5 !min-h-5">
            <Text className="text-xs-white !font-bold">
              {t("campaign.campaign_progessing_label")}
            </Text>
          </div>

          <Button
            type="text"
            className="!outline-none !p-0 flex-row-center !border-none !bg-transparent !h-auto"
            onClick={onClose}
          >
            <IconClose className="!w-5 !h-5 min-w-5 min-h-5 object-contain !text-white" />
          </Button>
        </div>

        {campaignModalContent}
      </div>
    </Modal>
  );
};

export default CampaignModal;
