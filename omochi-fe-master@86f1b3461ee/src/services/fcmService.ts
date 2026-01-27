import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../config/firebase";
import { toast } from "react-toastify";
import {
  registerNotiToken,
  readOneNotification,
  readAllNotification,
} from "@/api/notification";
import { playNotificationByType } from "@/utils/notificationSound";
import { store } from "../store";
import { USER_ROLE, VENUE_ROLE } from "../utils/constants";
import { getIsLoggingOut } from "@/store/slices/authSlice";

export interface FCMToken {
  token: string;
}

export interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
  };
  data?: { [key: string]: string };
}

interface PendingNotification {
  title: string;
  body: string;
  timestamp: number;
  notificationId?: string;
}

class FCMService {
  private vapidKey = import.meta.env.VITE_FCM_VAPID_KEY || ""; // You need to get this from Firebase Console > Project Settings > Cloud Messaging
  private pendingNotifications: PendingNotification[] = [];

  /**
   * Check if Notification API is available
   */
  private isNotificationSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      typeof window.Notification !== "undefined"
    );
  }

  /**
   * Show toast notification
   */
  private showToast(
    title: string,
    body: string,
    autoClose: number | false = false,
    notificationId?: string,
    isVenue: boolean = false
  ): void {
    const toastOptions: {
      position: "top-center";
      autoClose: number | false;
      hideProgressBar: boolean;
      closeOnClick: boolean;
      pauseOnHover: boolean;
      draggable: boolean;
      onClose?: () => Promise<void>;
      toastId?: string;
    } = {
      position: "top-center",
      autoClose: autoClose,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      toastId: `notification-${notificationId}`,
    };

    // Add onClose callback to mark notification as read if ID is provided and role is USER (not venue)
    if (!isVenue) {
      toastOptions.onClose = async () => {
        if (getIsLoggingOut()) {
          return;
        }

        try {
          if (notificationId) {
            await readOneNotification(notificationId);
          } else {
            await readAllNotification();
          }
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      };
    }
    const message = body ? `: ${body}` : "";
    toast.info(`${title} ${message}`, toastOptions);
  }

  /**
   * Play notification sound based on user role
   */
  private playSound(isVenue: boolean): void {
    const notificationType = isVenue ? VENUE_ROLE : USER_ROLE;
    playNotificationByType(notificationType).catch((error) => {
      console.warn("Failed to play notification sound:", error);
    });
  }

  /**
   * Handle notification display (toast + sound)
   */
  private handleNotificationDisplay(
    title: string,
    body: string,
    isVenue: boolean,
    notificationId?: string
  ): void {
    const autoClose = isVenue ? 5000 : false;
    this.showToast(title, body, autoClose, notificationId, isVenue);
    this.playSound(isVenue);
  }

  /**
   * Add notification to pending list for background processing
   */
  private addPendingNotification(
    title: string,
    body: string,
    notificationId?: string
  ): void {
    this.pendingNotifications.push({
      title,
      body,
      timestamp: Date.now(),
      notificationId,
    });
  }

  /**
   * Process pending notifications when user returns to dashboard
   */
  processPendingNotifications(): void {
    if (this.pendingNotifications.length === 0) return;

    const state = store.getState();
    const userRole = state.auth.user?.role ?? "";
    const isVenue = userRole === VENUE_ROLE;

    // Only process for user role
    if (isVenue) {
      this.pendingNotifications = [];
      return;
    }

    // Show toast for the most recent notification
    const latestNotification =
      this.pendingNotifications[this.pendingNotifications.length - 1];

    this.handleNotificationDisplay(
      latestNotification.title,
      latestNotification.body,
      false,
      latestNotification.notificationId
    );
    // Clear pending notifications
    this.pendingNotifications = [];
  }

  /**
   * Request notification permission and get FCM token
   */
  async requestPermission(): Promise<string | null> {
    if (!this.isNotificationSupported()) {
      return null;
    }

    try {
      const permission = await window.Notification.requestPermission();

      if (permission === "granted") {
        return await this.getToken();
      } else {
        return null;
      }
    } catch (error) {
      console.error("An error occurred while retrieving token. ", error);
      return null;
    }
  }

  /**
   * Get FCM registration token
   */
  async getToken(): Promise<string | null> {
    try {
      if (!messaging) {
        return null;
      }

      const currentToken = await getToken(messaging!, {
        vapidKey: this.vapidKey || undefined,
      });

      if (currentToken) {
        // Store token immediately
        localStorage.setItem("fcm_token", currentToken);
        return currentToken;
      } else {
        return null;
      }
    } catch (error) {
      console.error("An error occurred while retrieving token. ", error);
      return null;
    }
  }

  /**
   * Set up foreground message listener
   */
  setupForegroundMessageListener() {
    if (!messaging) {
      return;
    }

    if (!this.isNotificationSupported()) {
      return;
    }

    onMessage(messaging!, (payload: NotificationPayload) => {
      const title = payload.notification?.title || "";
      const body = payload.notification?.body || "";

      // Extract notification ID from payload data if available
      const notificationId = payload.data?.notificationId;

      const state = store.getState();
      const userRole = state.auth.user?.role ?? "";
      const isVenue = userRole === VENUE_ROLE;

      if (isVenue) {
        // Venue: Always show notification immediately
        this.handleNotificationDisplay(title, body, true, notificationId);
      } else {
        // User: Check if tab is visible
        const isTabVisible = document.visibilityState === "visible";

        if (isTabVisible) {
          // User is viewing tab - show notification immediately
          this.handleNotificationDisplay(title, body, false, notificationId);

          // Update last_notification_check to prevent duplicate in polling
          localStorage.setItem(
            "last_notification_check",
            Date.now().toString()
          );
        } else {
          // User is not viewing tab - store for later processing
          this.addPendingNotification(title, body, notificationId);
        }
      }
    });
  }

  /**
   * Send token to backend server
   */
  async sendTokenToServer(token: string): Promise<boolean> {
    try {
      // Check if this token was already successfully registered with server
      const registeredToken = localStorage.getItem("fcm_token_registered");
      if (registeredToken === token) {
        return true;
      }

      const result = await registerNotiToken(token);

      if (result) {
        // Mark this token as successfully registered with server
        localStorage.setItem("fcm_token_registered", token);
      }

      return !!result;
    } catch (error) {
      console.error("Error sending token to server:", error);
      return false;
    }
  }

  /**
   * Initialize FCM service
   */
  async initialize(userId?: string): Promise<void> {
    try {
      // Set up foreground message listener
      this.setupForegroundMessageListener();

      // Request permission and get token
      const token = await this.requestPermission();

      if (token && userId) {
        // Send token to server
        await this.sendTokenToServer(token);
      }
    } catch (error) {
      console.error("Error initializing FCM service:", error);
    }
  }

  /**
   * Get stored FCM token from localStorage
   */
  getStoredToken(): string | null {
    return localStorage.getItem("fcm_token");
  }

  /**
   * Clear stored FCM token
   */
  clearStoredToken(): void {
    localStorage.removeItem("fcm_token");
    localStorage.removeItem("fcm_token_registered");
  }
}

export const fcmService = new FCMService();
export default fcmService;
