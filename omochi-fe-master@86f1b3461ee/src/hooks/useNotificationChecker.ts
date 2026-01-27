import { useState, useEffect, useCallback, useRef } from "react";
import {
  getUserNotification,
  getUpcomingNotificationVenue,
  readOneNotification,
  readAllNotification,
} from "@/api/notification";
import type { Notification } from "@/generated/api";
import { Status5d6Enum } from "@/generated/api";
import { fcmService } from "@/services/fcmService";
import {
  POLLING_INTERVAL_REFRESH_API,
  USER_ROLE,
  VENUE_ROLE,
} from "@/utils/constants";
import {
  NotificationType,
  playNotificationWithDebounce,
} from "@/utils/notificationSound";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { toast } from "react-toastify";
import { getIsLoggingOut } from "@/store/slices/authSlice";

interface UseNotificationCheckerProps {
  enabled?: boolean;
  interval?: number;
  typeNotification?: NotificationType;
}

interface UseNotificationCheckerReturn {
  notifications: Notification[];
  unreadCount: number;
  hasUnread: boolean;
  loading: boolean;
  permissionGranted: boolean;
  requestPermission: () => Promise<void>;
  playNotificationSoundChecker: () => void;
  hasRecentNotificationTrigger: boolean;
}

export const useNotificationChecker = ({
  enabled = true,
  interval = POLLING_INTERVAL_REFRESH_API,
  typeNotification = USER_ROLE,
}: UseNotificationCheckerProps = {}): UseNotificationCheckerReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [hasRecentNotificationTrigger, setHasRecentNotificationTrigger] =
    useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const permissionCheckRef = useRef<NodeJS.Timeout | null>(null);

  const user = useSelector((state: RootState) => state.auth.user);
  const venueId = user?.venue_roles?.[0]?.venue_id;

  // Check if Notification API is available
  const isNotificationSupported = useCallback(() => {
    return typeof window !== "undefined" && "Notification" in window;
  }, []);

  // Check notification permission
  const checkPermission = useCallback(() => {
    if (!isNotificationSupported()) {
      if (permissionGranted) {
        setPermissionGranted(false);
      }
      return;
    }

    const hasPermission = Notification.permission === "granted";
    const hasToken = !!fcmService.getStoredToken();
    const isGranted = hasPermission && hasToken;

    if (isGranted !== permissionGranted) {
      setPermissionGranted(isGranted);
    }
  }, [permissionGranted, isNotificationSupported]);

  // Set up permission checking
  useEffect(() => {
    // Initial check
    checkPermission();

    if (!isNotificationSupported()) {
      return;
    }

    // Check permission every 3 seconds
    permissionCheckRef.current = setInterval(checkPermission, 3000);

    // Also listen for visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkPermission();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (permissionCheckRef.current) {
        clearInterval(permissionCheckRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkPermission, isNotificationSupported]);

  // Play notification sound wrapper with debounce
  const handlePlayNotificationSound = () => {
    try {
      // Use debounced version to prevent audio spam
      playNotificationWithDebounce(typeNotification, 2000);
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!enabled) return;

    setLoading(true);
    try {
      if (typeNotification === VENUE_ROLE && venueId) {
        // For venue, use upcoming notification API
        const data = await getUpcomingNotificationVenue(venueId);
        const currentUpcomingCount =
          (data?.order_count || 0) + (data?.reservation_count || 0);

        // Play sound if there are upcoming orders/reservations
        if (currentUpcomingCount > 0) {
          handlePlayNotificationSound();
        }

        // Set empty notifications array for venue (we don't need the actual notifications)
        setNotifications([]);
      } else {
        // For user, use regular notification API
        const res = await getUserNotification(
          undefined,
          undefined,
          Status5d6Enum.Unread
        );
        const newNotifications = res?.results || [];

        // Check for new notifications since last check (only for user)
        if (typeNotification === USER_ROLE) {
          const lastCheckTime = localStorage.getItem("last_notification_check");

          // Helper function to show notification toast and play sound
          const showNotificationToast = (notification: Notification) => {
            const title = notification.title || "";
            const message = notification.message
              ? `: ${notification.message}`
              : "";
            toast.info(`${title} ${message}`, {
              position: "top-center",
              autoClose: false,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              toastId: `notification-${notification.id}`,
              onClose: () => handleToastClose(notification),
            });
            handlePlayNotificationSound();
          };

          if (newNotifications.length > 0) {
            let shouldShowNotification = false;
            let notificationToShow: Notification | undefined;
            let latestNotificationTime: number = 0;

            // Single loop to find both new notifications and latest timestamp
            const lastCheck = lastCheckTime ? parseInt(lastCheckTime) : 0;
            const newNotificationsSinceLastCheck: Notification[] = [];

            newNotifications.forEach((noti: Notification) => {
              const notiTime = new Date(noti.created_at || "").getTime();

              // Track latest notification time
              if (notiTime > latestNotificationTime) {
                latestNotificationTime = notiTime;
              }

              // Check if this notification is newer than last check
              if (notiTime > lastCheck) {
                newNotificationsSinceLastCheck.push(noti);
              }
            });

            if (lastCheckTime) {
              // Not first time - check for notifications newer than last check
              if (newNotificationsSinceLastCheck.length > 0) {
                shouldShowNotification = true;
                notificationToShow = newNotificationsSinceLastCheck[0];
              }
            } else {
              // First time - show toast for the most recent notification
              shouldShowNotification = true;
              notificationToShow = newNotifications[0];
            }

            // Show notification if needed
            if (shouldShowNotification && notificationToShow) {
              showNotificationToast(notificationToShow);
              setHasRecentNotificationTrigger(true);
            }

            // But only update if it's newer to prevent rollback
            if (latestNotificationTime > 0) {
              const currentLastCheck = lastCheckTime
                ? parseInt(lastCheckTime)
                : 0;
              if (latestNotificationTime > currentLastCheck) {
                localStorage.setItem(
                  "last_notification_check",
                  latestNotificationTime.toString()
                );
              }
            }
          }
        }

        setNotifications(newNotifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Request notification permission
  const requestPermission = useCallback(async () => {
    const registeredToken = localStorage.getItem("fcm_token_registered");
    if (!isNotificationSupported() || registeredToken) {
      console.warn(
        "Cannot request permission: Notification API not supported or token already registered"
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // Get FCM token
        const token = await fcmService.getToken();
        if (token) {
          // Register with server
          await fcmService.sendTokenToServer(token);

          // Update permission status
          setTimeout(checkPermission, 500);
        }
      } else {
        setTimeout(checkPermission, 100);
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
    }
  }, [checkPermission, isNotificationSupported]);

  // Helper function to handle toast close and mark notification as read
  const handleToastClose = async (notification: Notification) => {
    // Don't mark as read if user is logging out
    if (getIsLoggingOut()) {
      return;
    }

    try {
      if (notification.id) {
        await readOneNotification(notification.id);
      } else {
        await readAllNotification();
      }
      // Refetch notifications to update unread count
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Set up polling interval
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchNotifications();

    // Set up interval
    intervalRef.current = setInterval(fetchNotifications, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled]);

  const unreadNotifications = notifications.filter(
    (noti) => noti.status === Status5d6Enum.Unread
  );

  return {
    notifications,
    unreadCount: unreadNotifications.length,
    hasUnread: unreadNotifications.length > 0,
    loading,
    permissionGranted,
    requestPermission,
    playNotificationSoundChecker: handlePlayNotificationSound,
    hasRecentNotificationTrigger,
  };
};
