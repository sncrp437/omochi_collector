// Import audio files from assets
import userNotificationSound from "@/assets/sound/user-notification.wav";
import venueNotificationSound from "@/assets/sound/venue-notification.wav";
import { USER_ROLE, VENUE_ROLE } from "./constants";

export type NotificationType = typeof USER_ROLE | typeof VENUE_ROLE;

class NotificationPlayer {
  private audioContext: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private audioCache: Map<string, AudioBuffer> = new Map(); // Smart cache with fallback

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    } catch (error) {
      console.error("Web Audio API not supported:" + error);
    }
  }

  /**
   * Simple audio unlock - MUST be called from user click
   */
  async unlockAudio(): Promise<void> {
    if (!this.audioContext) {
      console.error("Web Audio API not supported");
      return;
    }

    try {
      // Resume if suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Play silent sound to unlock
      const buffer = this.audioContext.createBuffer(
        1,
        1,
        this.audioContext.sampleRate
      );
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      gainNode.gain.setValueAtTime(0.001, this.audioContext.currentTime); // Almost silent

      source.start(0);

      this.isUnlocked = true;
    } catch (error) {
      console.error("Audio unlock failed:" + error);
      this.isUnlocked = true; // Mark as unlocked to avoid loops
    }
  }

  /**
   * Smart cache: try cache first, fallback to fresh load
   */
  private async loadAudioBuffer(audioUrl: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    // Try cache first
    if (this.audioCache.has(audioUrl)) {
      const cachedBuffer = this.audioCache.get(audioUrl)!;
      try {
        // Test if cached buffer is still valid
        const testSource = this.audioContext.createBufferSource();
        testSource.buffer = cachedBuffer;
        return cachedBuffer;
      } catch {
        // Cache corrupted, remove and reload
        this.audioCache.delete(audioUrl);
      }
    }

    // Load fresh if not cached or cache failed
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Cache the successful result
      this.audioCache.set(audioUrl, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error("Failed to load audio buffer:" + error);
      return null;
    }
  }

  /**
   * Play audio file
   */
  async playSound(audioUrl: string): Promise<void> {
    if (!this.audioContext) {
      console.error("Web Audio API not supported");
      return;
    }

    try {
      // Resume if suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Load audio buffer (smart cache)
      const audioBuffer = await this.loadAudioBuffer(audioUrl);
      if (!audioBuffer) {
        console.error("Failed to load audio buffer");
        return;
      }

      // Create and play source
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Debug: Set volume and log it
      const volume = 0.8;
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

      // Start playback
      source.start(0);
    } catch (error) {
      console.warn("Failed to create notification sound:", error);
    }
  }

  /**
   * Check if audio needs user interaction to unlock
   */
  needsUnlock(): boolean {
    if (!this.audioContext) return false;
    if (this.isUnlocked) return false;

    // Check AudioContext state
    if (this.audioContext.state === "suspended") return true;

    // Check if mobile and tablet device (most need unlock)
    const userAgent = navigator.userAgent.toLowerCase();
    const isNeedUnlockDevices =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|windows phone|mobile|tablet|kindle|silk/i.test(
        userAgent
      );
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    return isNeedUnlockDevices || hasTouch;
  }

  /**
   * Preload audio files (call when app starts for better performance)
   */
  async preloadAudio(type: NotificationType): Promise<void> {
    try {
      await Promise.all([
        this.loadAudioBuffer(
          type === USER_ROLE ? userNotificationSound : venueNotificationSound
        ),
      ]);
    } catch (error) {
      console.error("Failed to preload audio files:" + error);
    }
  }

  /**
   * Clear audio cache (for debugging)
   */
  clearCache(): void {
    this.audioCache.clear();
  }
}

// Create singleton instance
const notificationPlayer = new NotificationPlayer();

/**
 * Unlock audio - call this from user click
 */
export const unlockAudioForMobile = (): Promise<void> => {
  return notificationPlayer.unlockAudio();
};

/**
 * Play notification by type
 */
export const playNotificationByType = (
  type: NotificationType
): Promise<void> => {
  const audioUrl =
    type === USER_ROLE ? userNotificationSound : venueNotificationSound;
  return notificationPlayer.playSound(audioUrl);
};

/**
 * Check if audio unlock modal should be shown
 */
export const shouldShowAudioUnlockModal = (): boolean => {
  return notificationPlayer.needsUnlock();
};

/**
 * Play notification with simple debounce
 */
let lastPlayTime = 0;
export const playNotificationWithDebounce = (
  type: NotificationType,
  minIntervalMs: number = 2000
): Promise<void> => {
  const now = Date.now();
  if (now - lastPlayTime > minIntervalMs) {
    lastPlayTime = now;
    return playNotificationByType(type);
  } else {
    console.warn("Audio playback skipped due to debounce");
    return Promise.resolve();
  }
};

/**
 * Preload audio files (call when app starts for better performance)
 */
export const preloadNotificationSounds = (
  type: NotificationType
): Promise<void> => {
  return notificationPlayer.preloadAudio(type);
};
