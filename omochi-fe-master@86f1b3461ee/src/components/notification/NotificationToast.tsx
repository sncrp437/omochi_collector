import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface NotificationToastProps {
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
}

const NotificationToast: React.FC<NotificationToastProps> = ({ 
  position = 'top-right' 
}) => {
  return (
    <ToastContainer
      position={position}
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      toastClassName="custom-toast"
    />
  );
};

export default NotificationToast;
