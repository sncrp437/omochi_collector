// =============================================================================
// Local Collections Module - Browser-level localStorage storage
// =============================================================================

const LOCAL_COLLECTIONS_KEY = 'omochi_local_collections';

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
        venue_name: video.venue_name || '',
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
        date_added: new Date().toISOString(),
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
