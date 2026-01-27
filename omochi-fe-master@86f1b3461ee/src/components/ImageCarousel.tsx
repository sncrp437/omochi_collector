import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import defaultImage from "@/assets/images/default-image.png";
import { memo, useCallback } from "react";

interface ImageCarouselProps {
  imageUrls: string[];
  altText?: string;
  aspectRatio?: string;
  autoplayDelay?: number;
}

const ImageCarousel = memo(
  ({
    imageUrls,
    altText = "Image",
    aspectRatio = "aspect-[3/2]",
    autoplayDelay = 2000,
  }: ImageCarouselProps) => {
    const [emblaImageRef] = useEmblaCarousel({ loop: true }, [
      Autoplay({ delay: autoplayDelay, stopOnInteraction: false }),
    ]);

    // Memoize error handler để tránh tạo function mới mỗi lần render
    const handleImageError = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.currentTarget;
        target.onerror = null;
        target.src = defaultImage;
      },
      []
    );

    if (!imageUrls?.length) {
      return null;
    }

    return (
      <div className="embla overflow-hidden" ref={emblaImageRef}>
        <div className="flex gap-1">
          {imageUrls.map((imageUrl, imageIndex) => (
            <div
              key={imageIndex}
              className={`w-full flex-[0_0_100%] ${aspectRatio} rounded-lg overflow-hidden`}
            >
              <img
                src={imageUrl}
                alt={`${altText} ${imageIndex + 1}`}
                className="w-full h-full object-cover"
                onError={handleImageError}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

ImageCarousel.displayName = "ImageCarousel";

export default ImageCarousel;
