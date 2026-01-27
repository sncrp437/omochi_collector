import React, { useEffect } from 'react';
import { fcmService } from '../../services/fcmService';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface NotificationManagerProps {
  children: React.ReactNode;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ children }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const initializeFCM = async () => {
      if (user?.id) {
        console.log('Initializing FCM for user:', user.id);
        await fcmService.initialize(user.id.toString());
      }
    };

    initializeFCM();
  }, [user]);

  return <>{children}</>;
};

export default NotificationManager;
