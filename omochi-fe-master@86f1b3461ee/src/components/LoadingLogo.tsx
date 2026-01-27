import { useEffect, useState } from "react";

interface LoadingLogoProps {
  duration?: number;
  onComplete?: () => void;
}

const LoadingLogo: React.FC<LoadingLogoProps> = ({
  duration = 2000,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const newProgress = Math.min((elapsedTime / duration) * 100, 100);

      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
        if (onComplete) {
          onComplete();
        }
      }
    }, 5);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="!flex !flex-col !items-center !gap-[24px] !w-[327px]">
      {/* Logo */}
      <div className="!w-full">
        <h1 className="!text-12 !font-bold !text-[var(--primary-color)] !text-center !font-['Noto_Sans_JP'] !leading-[1.2em]">
          Omochi
        </h1>
      </div>

      {/* Progress Bar */}
      <div className="!w-full !h-[8px] !bg-[#5B5B5B] !rounded-[4px] !overflow-hidden">
        <div
          className="!h-full !bg-[var(--primary-color)] !rounded-[4px]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default LoadingLogo;
