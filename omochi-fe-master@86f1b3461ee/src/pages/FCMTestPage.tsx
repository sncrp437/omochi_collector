import React from 'react';
import { NotificationTestPanel } from '../components/notification';
import TopNavigationBar from '../components/common/TopNavigationBar';
import { useNavigate } from 'react-router-dom';

const FCMTestPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center !h-[100dvh] !bg-[var(--background-color)] !w-full py-4">
      <TopNavigationBar 
        title="FCM Test" 
        onBack={() => navigate(-1)} 
      />
      <div className="flex-1 w-full px-4 mt-4 overflow-y-auto">
        <NotificationTestPanel />
      </div>
    </div>
  );
};

export default FCMTestPage;
