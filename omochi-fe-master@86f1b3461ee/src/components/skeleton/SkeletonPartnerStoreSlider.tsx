import { memo } from "react";
import { MINIMUM_PARTNER_STORE_ITEMS_CAROUSEL } from "@/utils/constants";

const SkeletonPartnerStoreSlider: React.FC = memo(() => {
  return (
    <div className="flex">
      {Array.from({ length: MINIMUM_PARTNER_STORE_ITEMS_CAROUSEL }).map(
        (_, index) => (
          <div
            key={index}
            className="w-20 h-20 min-w-20 min-h-20 rounded-lg flex-[0_0_auto] ml-2 bg-gray-300/60 animate-pulse"
          />
        )
      )}
    </div>
  );
});

export default SkeletonPartnerStoreSlider;
