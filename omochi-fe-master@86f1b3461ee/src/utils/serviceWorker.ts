/**
 * Register Firebase Messaging Service Worker
 */
export const registerServiceWorker = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered successfully:', registration);
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  } else {
    console.log('Service Worker not supported');
    return false;
  }
};

/**
 * Check if service worker is ready
 */
export const isServiceWorkerReady = (): Promise<ServiceWorkerRegistration | undefined> => {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.ready;
  }
  return Promise.resolve(undefined);
};

/**
 * Get active service worker registration
 */
export const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      return registration || null;
    } catch (error) {
      console.error('Error getting service worker registration:', error);
      return null;
    }
  }
  return null;
};
