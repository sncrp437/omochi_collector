import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';

interface BackButtonProps {
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  onClick, 
  style,
  className
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1); // Go back to the previous page
    }
  };

  return (
    <Button
      type="text"
      className={`flex-row-center !bg-[var(--background-color)] !rounded-full !border-none !outline-none ${className || ''}`}
      style={{ 
        width: '40px',
        height: '40px',
        padding: '10px',
        ...style 
      }}
      onClick={handleClick}
    >
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M19 12H5" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M12 19L5 12L12 5" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </Button>
  );
};

export default BackButton;
