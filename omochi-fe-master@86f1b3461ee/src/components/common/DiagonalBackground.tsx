interface DiagonalBackgroundProps {
  color?: string;
  angle?: number;
  reverse?: boolean;
  position?: "top" | "middle" | "bottom";
  size?: string;
  className?: string;
  top?: number;
}

const DiagonalBackground: React.FC<DiagonalBackgroundProps> = ({
  color = "#00C19C",
  angle = 25,
  reverse = false,
  position = "middle",
  size = "50px",
  className = "",
  top = 100,
}) => {
  let transformOrigin = "center center";

  if (position === "top") {
    transformOrigin = "top left";
  } else if (position === "bottom") {
    transformOrigin = "bottom left";
  }

  const skewAngle = reverse ? angle : -angle;

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: size,
    backgroundColor: color,
    zIndex: 0,
    transform: `skewY(${skewAngle}deg)`,
    transformOrigin,
  };

  if (position === "top") {
    backgroundStyle.top = `${top}px`;
  } else if (position === "middle") {
    backgroundStyle.top = "50%";
    backgroundStyle.transform = `translateY(-50%) skewY(${skewAngle}deg)`;
  } else if (position === "bottom") {
    backgroundStyle.bottom = 0;
    backgroundStyle.top = "auto";
  }

  return <div className={`z-[-1] ${className}`} style={backgroundStyle}></div>;
};

export default DiagonalBackground;
