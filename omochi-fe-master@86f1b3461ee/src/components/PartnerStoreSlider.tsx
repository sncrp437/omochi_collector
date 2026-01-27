import { memo, useEffect, useState, useCallback, useMemo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { getListPartnerStores } from "../api/partner-stores";
import { PartnerStore } from "@/generated/api";
import defaultImage from "@/assets/images/default-image.png";
import { MINIMUM_PARTNER_STORE_ITEMS_CAROUSEL } from "@/utils/constants";
import SkeletonPartnerStoreSlider from "@/components/skeleton/SkeletonPartnerStoreSlider";

const duplicatePartnerStoresToMinimum = (
  items: PartnerStore[],
  minItems = MINIMUM_PARTNER_STORE_ITEMS_CAROUSEL
) => {
  if (!items.length) return [];
  const repeats = Math.ceil(minItems / items.length);
  return Array.from({ length: repeats }).flatMap(() => items);
};

const PartnerStoreSlider: React.FC = memo(() => {
  const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const displayPartnerStores = useMemo(() => {
    if (!partnerStores.length) return [];

    // if partner stores less than minimum items, make repeated partner stores
    // adapt for embla carousel
    return partnerStores.length < MINIMUM_PARTNER_STORE_ITEMS_CAROUSEL
      ? duplicatePartnerStoresToMinimum(partnerStores)
      : partnerStores;
  }, [partnerStores]);

  // Initialize embla carousel with auto-scroll
  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      dragFree: false,
      containScroll: false,
      align: "start",
      skipSnaps: false,
      startIndex: 0, // Always start from first slide
    },
    [
      AutoScroll({
        speed: 0.5,
        startDelay: 500,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
      }),
    ]
  );

  const fetchPartnerStores = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getListPartnerStores();
      setPartnerStores(res);
    } catch (error) {
      console.error("Error fetching partner stores:", error);
      setPartnerStores([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize error handler to avoid creating a new function on every render
  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      target.onerror = null;
      target.src = defaultImage;
    },
    []
  );

  useEffect(() => {
    fetchPartnerStores();
  }, [fetchPartnerStores]);

  // Don't render if no data and not loading
  if (!isLoading && !partnerStores.length) {
    return <></>;
  }

  return (
    <div className="bg-[#716F6F33] min-h-28 mx-[-24px] relative overflow-hidden backdrop-blur-[2px] border-y border-[var(--border-color)] ">
      <div className="embla overflow-hidden py-4 mx-2.5" ref={emblaRef}>
        <div className="flex">
          {isLoading ? (
            <SkeletonPartnerStoreSlider />
          ) : (
            displayPartnerStores.map((partnerStore, index) => (
              <div
                key={`${partnerStore.id}-${index}`}
                className="w-20 h-20 min-w-20 min-h-20 rounded-lg flex-[0_0_auto] ml-2"
              >
                <img
                  src={partnerStore.image}
                  alt={partnerStore.name || `Partner Store ${partnerStore.id}`}
                  className="w-full h-full object-cover rounded-lg aspect-square"
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

export default PartnerStoreSlider;
