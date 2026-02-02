/**
 * Lightweight Analytics Tracking Module
 * Logs user activity to Google Sheets via Apps Script
 *
 * IMPORTANT: Set ANALYTICS_API_URL to your Analytics Apps Script URL
 * This is DIFFERENT from the video data API URL
 */

// Analytics configuration
const ANALYTICS_API_URL = 'YOUR_ANALYTICS_APPS_SCRIPT_URL_HERE'; // Replace with your analytics API URL
const ENABLE_FRONTEND_ANALYTICS = true; // Set to false to disable all tracking

// Session management
let sessionId = null;
let trackedVideos = new Set(); // Track which videos have been logged

/**
 * Initialize analytics on page load
 */
function initAnalytics() {
    if (!ENABLE_FRONTEND_ANALYTICS) return;

    // Generate session ID (random, not stored anywhere)
    sessionId = generateSessionId();

    // Track page load
    logPageLoad();
}

/**
 * Generate a random session ID
 */
function generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `sess_${timestamp}_${random}`;
}

/**
 * Get session data (device info, screen size, etc.)
 */
function getSessionData() {
    return {
        session_id: sessionId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || 'direct',
        screen_size: `${window.screen.width}x${window.screen.height}`,
        is_mobile: isMobileDevice()
    };
}

/**
 * Detect if device is mobile
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth <= 768;
}

/**
 * Log page load event
 */
async function logPageLoad() {
    if (!ENABLE_FRONTEND_ANALYTICS || ANALYTICS_API_URL === 'YOUR_ANALYTICS_APPS_SCRIPT_URL_HERE') return;

    try {
        const sessionData = getSessionData();
        const payload = {
            event_type: 'page_load',
            ...sessionData
        };

        // Send POST request to analytics API
        fetch(ANALYTICS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).catch(() => {
            // Silently fail if analytics fails
        });
    } catch (error) {
        // Don't break the app if analytics fails
        console.debug('Analytics page load failed:', error);
    }
}

/**
 * Log video view event
 * @param {string} videoId - ID of the viewed video
 */
async function logVideoView(videoId) {
    if (!ENABLE_FRONTEND_ANALYTICS || !sessionId || ANALYTICS_API_URL === 'YOUR_ANALYTICS_APPS_SCRIPT_URL_HERE') return;

    // Only log each video once per session
    if (trackedVideos.has(videoId)) return;
    trackedVideos.add(videoId);

    try {
        const sessionData = getSessionData();
        const payload = {
            event_type: 'video_view',
            video_id: videoId,
            ...sessionData
        };

        // Send POST request
        fetch(ANALYTICS_API_URL, {
            method: 'POST',
            mode: 'no-cors', // Avoid CORS issues
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).catch(() => {
            // Silently fail
        });
    } catch (error) {
        console.debug('Analytics video view failed:', error);
    }
}

/**
 * Log collect button click event
 * @param {string} videoId - ID of the collected video
 */
async function logCollectEvent(videoId) {
    if (!ENABLE_FRONTEND_ANALYTICS || !sessionId || ANALYTICS_API_URL === 'YOUR_ANALYTICS_APPS_SCRIPT_URL_HERE') return;

    try {
        const sessionData = getSessionData();
        const payload = {
            event_type: 'collect',
            video_id: videoId,
            ...sessionData
        };

        // Send POST request
        fetch(ANALYTICS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).catch(() => {
            // Silently fail
        });
    } catch (error) {
        console.debug('Analytics collect event failed:', error);
    }
}

/**
 * Batch analytics events (optional optimization)
 * Store events and send in batches to reduce requests
 */
const pendingEvents = [];
let batchTimer = null;

function queueAnalyticsEvent(eventData) {
    if (!ENABLE_FRONTEND_ANALYTICS) return;

    pendingEvents.push(eventData);

    // Clear existing timer
    if (batchTimer) clearTimeout(batchTimer);

    // Send batch after 2 seconds or when 5 events accumulated
    if (pendingEvents.length >= 5) {
        sendBatchedEvents();
    } else {
        batchTimer = setTimeout(sendBatchedEvents, 2000);
    }
}

function sendBatchedEvents() {
    if (pendingEvents.length === 0 || ANALYTICS_API_URL === 'YOUR_ANALYTICS_APPS_SCRIPT_URL_HERE') return;

    const events = [...pendingEvents];
    pendingEvents.length = 0; // Clear array

    // Send all events (they'll be processed individually by Apps Script)
    events.forEach(event => {
        fetch(ANALYTICS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }).catch(() => {});
    });
}
