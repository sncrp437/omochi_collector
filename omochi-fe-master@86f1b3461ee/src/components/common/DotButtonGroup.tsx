import { Button } from "antd";

type DotButtonProps = {
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
};

export const DotButton: React.FC<DotButtonProps> = ({
  children,
  isActive = false,
  className = "",
  ...restProps
}) => {
  return (
    <Button
      type="text"
      className={`!w-2 !h-2 !rounded-full !transition-colors !duration-200 !p-0 !min-w-2 !min-h-2 !border-none !outline-none ${
        isActive ? "!bg-[#D9D9D9]" : "!bg-[var(--background-disabled-color)]"
      } ${className}`}
      {...restProps}
    >
      {children}
    </Button>
  );
};

export const DotButtonGroup: React.FC<{
  selectedIndex: number;
  scrollSnaps: number[];
  onDotButtonClick: (index: number) => void;
  className?: string;
}> = ({ selectedIndex, scrollSnaps, onDotButtonClick, className = "" }) => {
  if (scrollSnaps.length <= 1) return null;

  return (
    <div className={`!flex !items-center !gap-[6px] ${className}`}>
      {scrollSnaps.map((_, index) => (
        <DotButton
          key={index}
          isActive={index === selectedIndex}
          onClick={() => onDotButtonClick(index)}
        />
      ))}
    </div>
  );
};
