// =============================================================================
// Local Collections Module - Browser-level localStorage storage
// =============================================================================

const LOCAL_COLLECTIONS_KEY = 'omochi_local_collections';
const COLLECTION_EXPIRY_DAYS = 7;

/**
 * Get all locally saved collections
 * @returns {Array} Array of collection objects
 */
function getLocalCollections() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_COLLECTIONS_KEY)) || [];
    } catch (e) {
        return [];
    }
}

/**
 * Save a video/venue to local collections
 * @param {Object} video - Video data object from feed
 * @returns {boolean} true if newly saved, false if already exists
 */
function saveLocalCollection(video) {
    const collections = getLocalCollections();

    // Deduplicate by video_id
    if (collections.some(c => c.video_id === video.id)) {
        return false;
    }

    collections.push({
        id: 'local_' + Date.now(),
        video_id: video.id,
        venue_uuid: video.venue_uuid || null,
        venue_key: video.venue_key || null,
        venue_name: video.venue_name || '',
        venue_name_en: video.venue_name_en || video.venue_name || '',
        genre: video.genre || '',
        genre_en: video.genre_en || video.genre || '',
        address: video.address || '',
        nearest_station: video.nearest_station || '',
        nearest_station_en: video.nearest_station_en || video.nearest_station || '',
        caption_en: video.caption_en || '',
        caption_ja: video.caption_ja || '',
        video_url: video.url || '',
        video_type: video.video_type || 'youtube',
        reservation_url: video.reservation_url || '',
        phone_number: video.phone_number || '',
        reservable: video.reservable !== false,
        date_added: new Date().toISOString(),
        expires_at: new Date(Date.now() + COLLECTION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        synced: false
    });

    localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(collections));
    return true;
}

/**
 * Remove a local collection by its local ID
 * @param {string} localId - The local collection ID (e.g., "local_1706832000000")
 */
function removeLocalCollection(localId) {
    let collections = getLocalCollections();
    collections = collections.filter(c => c.id !== localId);
    localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(collections));
}

/**
 * Mark a local collection item as synced to API
 * @param {string} videoId - The video ID to mark as synced
 */
function markLocalCollectionSynced(videoId) {
    const collections = getLocalCollections();
    const item = collections.find(c => c.video_id === videoId);
    if (item) {
        item.synced = true;
        localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(collections));
    }
}

/**
 * Get all unsynced local collections that have a venue_uuid
 * @returns {Array} Unsynced items with venue_uuid
 */
function getUnsyncedCollections() {
    return getLocalCollections().filter(c => !c.synced && c.venue_uuid);
}

/**
 * Check if a video is already in local collections
 * @param {string} videoId - The video ID to check
 * @returns {boolean}
 */
function isLocallyCollected(videoId) {
    return getLocalCollections().some(c => c.video_id === videoId);
}

/**
 * Sync unsynced local collections to the API
 * Requires apiPost to be available (from api.js)
 */
async function syncLocalCollectionsToApi() {
    if (typeof apiPost !== 'function') return;

    const unsynced = getUnsyncedCollections();
    for (const item of unsynced) {
        try {
            const response = await apiPost('/api/stocked-venues/', { venue: item.venue_uuid });
            if (response.ok || response.status === 201) {
                markLocalCollectionSynced(item.video_id);
            }
        } catch (err) {
            console.warn('Sync failed for', item.video_id, err);
        }
    }
}

// =============================================================================
// Toast Notification
// =============================================================================

let _toastTimeout = null;

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default 2000)
 */
function showToast(message, duration) {
    duration = duration || 2000;
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) return;

    // Clear any existing timeout
    if (_toastTimeout) {
        clearTimeout(_toastTimeout);
    }

    toastMessage.textContent = message;
    toast.classList.add('show');

    _toastTimeout = setTimeout(function() {
        toast.classList.remove('show');
        _toastTimeout = null;
    }, duration);
}

// =============================================================================
// Collection Expiration (Guest Users)
// =============================================================================

/**
 * Remove expired collections from localStorage
 * @returns {number} Number of items deleted
 */
function cleanupExpiredCollections() {
    var collections = getLocalCollections();
    var now = new Date();
    var valid = collections.filter(function(c) {
        // Legacy items without expires_at are kept (backward compatible)
        if (!c.expires_at) return true;
        return new Date(c.expires_at) > now;
    });

    var deletedCount = collections.length - valid.length;
    if (deletedCount > 0) {
        localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(valid));
    }
    return deletedCount;
}

/**
 * Get expiration info for banner display
 * @returns {Object|null} { count, daysLeft, soonestExpiry } or null if no collections
 */
function getExpirationInfo() {
    var collections = getLocalCollections();
    var memos = typeof getLocalMemos === 'function' ? getLocalMemos() : [];
    var tags = typeof getLocalTags === 'function' ? getLocalTags() : [];
    var folders = typeof getLocalFolders === 'function' ? getLocalFolders() : [];
    var visits = typeof getLocalVisits === 'function' ? getLocalVisits() : [];

    var totalCount = collections.length + memos.length + tags.length + folders.length + visits.length;
    if (totalCount === 0) return null;

    // Find soonest expiring item across all data types
    var now = new Date();
    var soonest = null;
    var allExpiries = []
        .concat(collections.map(function(c) { return c.expires_at; }))
        .concat(memos.map(function(m) { return m.expires_at; }))
        .concat(tags.map(function(t) { return t.expires_at; }))
        .concat(folders.map(function(f) { return f.expires_at; }))
        .concat(visits.map(function(v) { return v.expires_at; }))
        .filter(Boolean);

    for (var i = 0; i < allExpiries.length; i++) {
        var exp = new Date(allExpiries[i]);
        if (!soonest || exp < soonest) {
            soonest = exp;
        }
    }

    if (!soonest) return null;

    var msLeft = soonest - now;
    var daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    return {
        count: totalCount,
        collections: collections.length,
        memos: memos.length,
        tags: tags.length,
        folders: folders.length,
        visits: visits.length,
        daysLeft: Math.max(0, daysLeft),
        soonestExpiry: soonest.toISOString()
    };
}

// =============================================================================
// Expiration Warning Banner
// =============================================================================

/**
 * Update the expiration warning banner based on current state
 */
function updateExpirationBanner() {
    // Don't show for logged-in users
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        hideExpirationBanner();
        return;
    }

    // Check if user dismissed banner this session
    if (sessionStorage.getItem('expirationBannerDismissed') === 'true') {
        hideExpirationBanner();
        return;
    }

    // Cleanup expired items first (collections + memos/tags/folders)
    cleanupExpiredCollections();
    if (typeof cleanupAllExpiredGuestData === 'function') {
        cleanupAllExpiredGuestData();
    }

    var info = getExpirationInfo();
    if (!info || info.count === 0) {
        hideExpirationBanner();
        return;
    }

    var banner = document.getElementById('expirationBanner');
    var message = document.getElementById('expirationMessage');
    if (!banner || !message) return;

    // Get translations or use defaults
    var lang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 'en';
    var text, urgencyClass = '';

    // Build item summary
    var itemDesc = '';
    if (lang === 'ja') {
        var parts = [];
        if (info.collections > 0) parts.push('店舗' + info.collections + '件');
        if (info.memos > 0) parts.push('メモ' + info.memos + '件');
        if (info.tags > 0) parts.push('タグ' + info.tags + '件');
        if (info.folders > 0) parts.push('フォルダ' + info.folders + '個');
        if (info.visits > 0) parts.push('訪問記録' + info.visits + '件');
        itemDesc = parts.join('、');
    } else {
        var parts = [];
        if (info.collections > 0) parts.push(info.collections + ' venue' + (info.collections === 1 ? '' : 's'));
        if (info.memos > 0) parts.push(info.memos + ' memo' + (info.memos === 1 ? '' : 's'));
        if (info.tags > 0) parts.push(info.tags + ' tag' + (info.tags === 1 ? '' : 's'));
        if (info.folders > 0) parts.push(info.folders + ' folder' + (info.folders === 1 ? '' : 's'));
        if (info.visits > 0) parts.push(info.visits + ' visit record' + (info.visits === 1 ? '' : 's'));
        itemDesc = parts.join(', ');
    }

    if (info.daysLeft > 1) {
        if (lang === 'ja') {
            text = '保存した' + itemDesc + 'は' + info.daysLeft + '日後に削除されます。登録して永久保存。';
        } else {
            text = 'Your ' + itemDesc + ' will expire in ' + info.daysLeft + ' days. Register to keep forever.';
        }
    } else if (info.daysLeft === 1) {
        if (lang === 'ja') {
            text = '⚠️ 明日削除されます！今すぐ登録を。';
        } else {
            text = '⚠️ Your data expires TOMORROW! Register now to keep it.';
        }
        urgencyClass = 'urgent';
    } else {
        if (lang === 'ja') {
            text = '🚨 本日削除！最後のチャンス。';
        } else {
            text = '🚨 Last chance! Your data expires TODAY.';
        }
        urgencyClass = 'critical';
    }

    message.textContent = text;
    banner.className = 'expiration-banner' + (urgencyClass ? ' ' + urgencyClass : '');
    banner.style.display = 'flex';
    document.body.classList.add('has-expiration-banner');
}

/**
 * Hide the expiration warning banner
 */
function hideExpirationBanner() {
    var banner = document.getElementById('expirationBanner');
    if (banner) {
        banner.style.display = 'none';
    }
    document.body.classList.remove('has-expiration-banner');
}

/**
 * Initialize expiration banner and event listeners
 */
function initExpirationBanner() {
    updateExpirationBanner();

    // Register button opens auth modal
    var regBtn = document.getElementById('expirationRegisterBtn');
    if (regBtn) {
        regBtn.addEventListener('click', function() {
            if (typeof showAuthModal === 'function') {
                showAuthModal('register');
            }
        });
    }

    // Dismiss button hides for this session only
    var dismissBtn = document.getElementById('expirationDismissBtn');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', function() {
            sessionStorage.setItem('expirationBannerDismissed', 'true');
            hideExpirationBanner();
        });
    }
}

// =============================================================================
// Stocked Venues API Cache (sessionStorage)
// =============================================================================

var STOCKED_VENUES_CACHE_KEY = 'omochi_stocked_venues_cache';

/**
 * Get cached stocked venues from sessionStorage
 * @returns {Array|null} Cached API items array, or null if not cached
 */
function getCachedStockedVenues() {
    try {
        var raw = sessionStorage.getItem(STOCKED_VENUES_CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Cache stocked venues API response in sessionStorage
 * @param {Array} data - Raw API response array
 */
function cacheStockedVenues(data) {
    try {
        sessionStorage.setItem(STOCKED_VENUES_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        // sessionStorage quota exceeded — ignore
    }
}

/**
 * Add a single venue to the cached array (after successful collect POST)
 * @param {Object} item - Stocked venue object from API response
 */
function addToStockedVenuesCache(item) {
    var cached = getCachedStockedVenues();
    if (!cached) return;
    cached.push(item);
    cacheStockedVenues(cached);
}

/**
 * Remove a single venue from the cached array (after successful DELETE)
 * @param {string} stockedVenueId - The stocked venue ID to remove
 */
function removeFromStockedVenuesCache(stockedVenueId) {
    var cached = getCachedStockedVenues();
    if (!cached) return;
    cacheStockedVenues(cached.filter(function(v) { return v.id !== stockedVenueId; }));
}

/**
 * Invalidate the stocked venues cache entirely
 */
function invalidateStockedVenuesCache() {
    sessionStorage.removeItem(STOCKED_VENUES_CACHE_KEY);
}
