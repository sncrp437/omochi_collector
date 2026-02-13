// =============================================================================
// Notifications Module - Drawer, In-App Banner, FCM Push
// =============================================================================

// Module state
var _notifications = [];
var _unreadCount = 0;

// Firebase config (same as Omochi React app)
var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDsWFPG9Lf5eynvksO_vB-wMa2SXSeBmi8',
    authDomain: 'omochi-f132a.firebaseapp.com',
    projectId: 'omochi-f132a',
    storageBucket: 'omochi-f132a.firebasestorage.app',
    messagingSenderId: '286977746401',
    appId: '1:286977746401:web:b377c96c2c8b0987095ea0',
    measurementId: 'G-WWQ8FG3JL1'
};

// =============================================================================
// Bell Icon
// =============================================================================

/**
 * Show the notification bell icon (called when user is logged in)
 */
function showNotificationBell() {
    var btn = document.getElementById('notificationBellBtn');
    if (btn) btn.style.display = 'flex';
}

/**
 * Update badge count on bell icon
 */
function updateBellBadge() {
    var badge = document.getElementById('notificationBadge');
    if (!badge) return;

    if (_unreadCount > 0) {
        badge.textContent = _unreadCount > 99 ? '99+' : _unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// =============================================================================
// Notification Fetching
// =============================================================================

/**
 * Fetch notifications from API (limited to 20 for performance)
 */
async function fetchNotifications() {
    if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return [];
    try {
        var response = await apiGet('/api/notifications/?page=1&page_size=20');
        if (response.ok) {
            var data = await response.json();
            _notifications = Array.isArray(data) ? data : (data.results || []);
            _unreadCount = _notifications.filter(function(n) {
                return n.status === 'UNREAD';
            }).length;
            updateBellBadge();
            return _notifications;
        }
    } catch (err) {
        console.warn('[notifications] Failed to fetch:', err);
    }
    return [];
}

/**
 * Mark a notification as read
 */
async function markNotificationRead(notificationId) {
    try {
        await apiPut('/api/notifications/' + notificationId + '/read/');
        // Update local state
        var n = _notifications.find(function(x) { return x.id === notificationId; });
        if (n) n.status = 'READ';
        _unreadCount = Math.max(0, _unreadCount - 1);
        updateBellBadge();
    } catch (err) {
        console.warn('[notifications] Failed to mark as read:', err);
    }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsRead() {
    try {
        await apiPut('/api/notifications/read_all/');
        _notifications.forEach(function(n) { n.status = 'READ'; });
        _unreadCount = 0;
        updateBellBadge();
        _renderNotificationList();
    } catch (err) {
        console.warn('[notifications] Failed to mark all as read:', err);
    }
}

// =============================================================================
// Notification Drawer
// =============================================================================

function openNotificationDrawer() {
    var drawer = document.getElementById('notificationDrawer');
    var overlay = document.getElementById('notificationDrawerOverlay');
    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    _renderNotificationList();
    _logNotificationEvent('notification_drawer_open');
}

function closeNotificationDrawer() {
    var drawer = document.getElementById('notificationDrawer');
    var overlay = document.getElementById('notificationDrawerOverlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Render notification items in the drawer list
 */
function _renderNotificationList() {
    var list = document.getElementById('notificationList');
    if (!list) return;

    list.innerHTML = '';

    if (_notifications.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'notification-empty';
        empty.textContent = t('noNotifications');
        list.appendChild(empty);
        return;
    }

    // Mark all read link
    if (_unreadCount > 0) {
        var markAllBtn = document.createElement('button');
        markAllBtn.className = 'notification-mark-all';
        markAllBtn.textContent = t('markAllRead');
        markAllBtn.addEventListener('click', function() {
            markAllNotificationsRead();
        });
        list.appendChild(markAllBtn);
    }

    _notifications.forEach(function(notification) {
        var item = document.createElement('div');
        item.className = 'notification-item' + (notification.status === 'UNREAD' ? ' unread' : '');

        var lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';

        // Title
        var titleEl = document.createElement('div');
        titleEl.className = 'notification-item-title';
        var title = (lang === 'en' && notification.title_en) ? notification.title_en : (notification.title || '');
        titleEl.textContent = title;
        item.appendChild(titleEl);

        // Message (truncated)
        var msgEl = document.createElement('div');
        msgEl.className = 'notification-item-message';
        var message = (lang === 'en' && notification.message_en) ? notification.message_en : (notification.message || '');
        if (message.length > 100) message = message.substring(0, 100) + '...';
        msgEl.textContent = message;
        item.appendChild(msgEl);

        // Timestamp
        var timeEl = document.createElement('div');
        timeEl.className = 'notification-item-time';
        timeEl.textContent = _formatRelativeTime(notification.created_at);
        item.appendChild(timeEl);

        // Click handler
        item.addEventListener('click', function() {
            if (notification.status === 'UNREAD') {
                markNotificationRead(notification.id);
                item.classList.remove('unread');
            }
            if (notification.click_action) {
                window.open(notification.click_action, '_blank', 'noopener,noreferrer');
            }
            _logNotificationEvent('notification_click', notification.id);
        });

        list.appendChild(item);
    });
}

/**
 * Format a relative time string
 */
function _formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diff = now - then;

    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo').replace('{n}', minutes);
    if (hours < 24) return t('hoursAgo').replace('{n}', hours);
    return t('daysAgo').replace('{n}', days);
}

// =============================================================================
// In-App Message Banner
// =============================================================================

/**
 * Show an in-app banner for the most recent unread notification
 */
function showInAppBanner() {
    var unread = _notifications.filter(function(n) { return n.status === 'UNREAD'; });
    if (unread.length === 0) return;

    // Check if already dismissed this session
    if (sessionStorage.getItem('in_app_banner_dismissed')) return;

    var notification = unread[0]; // Most recent
    var banner = document.getElementById('inAppBanner');
    var textEl = document.getElementById('inAppBannerText');
    if (!banner || !textEl) return;

    var lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    var title = (lang === 'en' && notification.title_en) ? notification.title_en : (notification.title || '');
    textEl.textContent = title;

    banner.style.display = 'flex';
    banner.dataset.notificationId = notification.id;

    // Auto-hide after 8 seconds
    setTimeout(function() {
        _hideInAppBanner();
    }, 8000);
}

function _hideInAppBanner() {
    var banner = document.getElementById('inAppBanner');
    if (banner) {
        banner.style.display = 'none';
        sessionStorage.setItem('in_app_banner_dismissed', 'true');
    }
}

// =============================================================================
// FCM Push Integration
// =============================================================================

/**
 * Initialize Firebase Cloud Messaging
 */
function initFCM() {
    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
        console.warn('[notifications] Firebase SDK not loaded');
        return;
    }

    // Check if already initialized
    if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }

    // Check if permission already granted
    if (Notification.permission === 'granted') {
        _registerFCMToken();
    }
}

/**
 * Request push notification permission with custom pre-prompt modal
 */
function requestPushPermission() {
    // If already granted, just register
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        _registerFCMToken();
        return;
    }

    // If already denied by browser, can't ask again
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        console.log('[notifications] Push permission denied by browser');
        return;
    }

    // Check if we've already asked this session
    if (sessionStorage.getItem('push_permission_asked')) return;

    // Show custom permission modal
    var modal = document.getElementById('pushPermissionModal');
    if (modal) modal.classList.add('show');
}

/**
 * Handle user clicking "Enable" on permission modal
 */
function _handlePushEnable() {
    var modal = document.getElementById('pushPermissionModal');
    if (modal) modal.classList.remove('show');
    sessionStorage.setItem('push_permission_asked', 'true');

    // Request browser permission
    if (typeof Notification !== 'undefined') {
        Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                _registerFCMToken();
                localStorage.setItem('push_permission_status', 'granted');
                _logNotificationEvent('push_permission_granted');
            } else {
                localStorage.setItem('push_permission_status', 'denied');
                _logNotificationEvent('push_permission_denied');
            }
        });
    }
}

/**
 * Handle user clicking "Not Now" on permission modal
 */
function _handlePushLater() {
    var modal = document.getElementById('pushPermissionModal');
    if (modal) modal.classList.remove('show');
    sessionStorage.setItem('push_permission_asked', 'true');
    localStorage.setItem('push_permission_status', 'dismissed');
}

/**
 * Register FCM token with backend
 */
async function _registerFCMToken() {
    try {
        if (typeof firebase === 'undefined' || !firebase.messaging) return;

        // Register service worker
        var registration = null;
        if ('serviceWorker' in navigator) {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }

        var messaging = firebase.messaging();
        var token = await messaging.getToken({
            vapidKey: undefined, // Uses sender ID from config
            serviceWorkerRegistration: registration
        });

        if (token) {
            // Check if already registered
            var storedToken = localStorage.getItem('fcm_token');
            if (storedToken === token) return;

            // Register with backend
            var response = await apiPost('/api/notifications/tokens/register/', {
                token: token,
                device_type: 'WEB',
                device_id: _getDeviceId()
            });

            if (response.ok) {
                localStorage.setItem('fcm_token', token);
                localStorage.setItem('fcm_token_registered', 'true');
                console.log('[notifications] FCM token registered');
            }
        }
    } catch (err) {
        console.warn('[notifications] FCM registration failed:', err);
    }
}

/**
 * Setup foreground message listener
 */
function _setupForegroundListener() {
    try {
        if (typeof firebase === 'undefined' || !firebase.messaging) return;
        var messaging = firebase.messaging();
        messaging.onMessage(function(payload) {
            console.log('[notifications] Foreground message:', payload);
            var notification = payload.notification || {};
            // Show as in-app banner
            var banner = document.getElementById('inAppBanner');
            var textEl = document.getElementById('inAppBannerText');
            if (banner && textEl) {
                textEl.textContent = notification.title || notification.body || '';
                banner.style.display = 'flex';
                sessionStorage.removeItem('in_app_banner_dismissed');
                setTimeout(function() { _hideInAppBanner(); }, 8000);
            }
            // Refresh notification list
            fetchNotifications();
        });
    } catch (err) {
        console.warn('[notifications] Foreground listener setup failed:', err);
    }
}

/**
 * Get or create a device ID
 */
function _getDeviceId() {
    var id = localStorage.getItem('fcm_device_id');
    if (!id) {
        id = 'web-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('fcm_device_id', id);
    }
    return id;
}

// =============================================================================
// Analytics
// =============================================================================

function _logNotificationEvent(eventType, id) {
    if (typeof logAnalyticsEvent === 'function') {
        logAnalyticsEvent(eventType, id || '');
    }
}

// =============================================================================
// Initialization
// =============================================================================

function initNotificationModule() {
    // Bell icon click -> open drawer
    var bellBtn = document.getElementById('notificationBellBtn');
    if (bellBtn) {
        bellBtn.addEventListener('click', function() {
            openNotificationDrawer();
        });
    }

    // Drawer close handlers
    var drawerClose = document.getElementById('notificationDrawerClose');
    var drawerOverlay = document.getElementById('notificationDrawerOverlay');
    if (drawerClose) drawerClose.addEventListener('click', closeNotificationDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeNotificationDrawer);

    // View Campaigns button in drawer
    var viewCampaignsBtn = document.getElementById('viewCampaignsBtn');
    if (viewCampaignsBtn) {
        viewCampaignsBtn.addEventListener('click', function() {
            closeNotificationDrawer();
            if (typeof openCampaignModal === 'function') {
                openCampaignModal();
            }
        });
    }

    // In-app banner close
    var bannerClose = document.getElementById('inAppBannerClose');
    if (bannerClose) {
        bannerClose.addEventListener('click', function(e) {
            e.stopPropagation();
            var nid = document.getElementById('inAppBanner').dataset.notificationId;
            if (nid) markNotificationRead(nid);
            _hideInAppBanner();
        });
    }

    // In-app banner click -> open drawer
    var banner = document.getElementById('inAppBanner');
    if (banner) {
        banner.addEventListener('click', function() {
            _hideInAppBanner();
            openNotificationDrawer();
        });
    }

    // Push permission modal handlers
    var enableBtn = document.getElementById('pushPermissionEnable');
    var laterBtn = document.getElementById('pushPermissionLater');
    var permOverlay = document.getElementById('pushPermissionOverlay');
    if (enableBtn) enableBtn.addEventListener('click', _handlePushEnable);
    if (laterBtn) laterBtn.addEventListener('click', _handlePushLater);
    if (permOverlay) permOverlay.addEventListener('click', _handlePushLater);

    // Init FCM if permission already granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        initFCM();
        _setupForegroundListener();
    }
}

/**
 * Full notification initialization flow (called from my-collections.js)
 */
async function loadNotifications() {
    if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return;

    showNotificationBell();
    await fetchNotifications();
    showInAppBanner();

    // Prompt for push permission after a delay (if not yet asked)
    var permStatus = localStorage.getItem('push_permission_status');
    if (!permStatus || permStatus === 'dismissed') {
        setTimeout(function() {
            requestPushPermission();
        }, 3000);
    }
}
