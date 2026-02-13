// =============================================================================
// Venue Tags & Memos API Client
// =============================================================================

// TODO: Replace with your deployed Apps Script URL
var TAGS_API_URL = 'https://script.google.com/macros/s/AKfycbxeb4dJ5LQ5rTFokdfquRDua5G67PxCHtYsLX9_e4_nQQ1Dh0CmAXf2pX6SaIwimjg3/exec';

// Predefined tag definitions
// SVG icon helper for venue tags (14x14 minimalist stroke icons)
function _tagSvg(paths) {
    return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
}

var VENUE_TAGS = [
    { key: 'date_spot', icon: _tagSvg('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'), en: 'Date Spot', ja: '\u30C7\u30FC\u30C8\u30B9\u30DD\u30C3\u30C8' },
    { key: 'business_dinner', icon: _tagSvg('<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'), en: 'Business Dinner', ja: '\u30D3\u30B8\u30CD\u30B9\u30C7\u30A3\u30CA\u30FC' },
    { key: 'family_friendly', icon: _tagSvg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'), en: 'Family-friendly', ja: '\u30D5\u30A1\u30DF\u30EA\u30FC\u5411\u3051' },
    { key: 'solo_dining', icon: _tagSvg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'), en: 'Solo Dining OK', ja: '\u304A\u3072\u3068\u308A\u3055\u307E\u004F\u004B' },
    { key: 'late_night', icon: _tagSvg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'), en: 'Late Night', ja: '\u6DF1\u591C\u55B6\u696D' },
    { key: 'budget_friendly', icon: _tagSvg('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'), en: 'Budget-friendly', ja: '\u304A\u624B\u9803' },
    { key: 'special_occasion', icon: _tagSvg('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>'), en: 'Special Occasion', ja: '\u7279\u5225\u306A\u65E5' },
    { key: 'quiet_calm', icon: _tagSvg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'), en: 'Quiet / Calm', ja: '\u9759\u304B\u30FB\u843D\u3061\u7740\u304D' },
    { key: 'lively_fun', icon: _tagSvg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'), en: 'Lively / Fun', ja: '\u8CE1\u3084\u304B\u30FB\u697D\u3057\u3044' },
    { key: 'pet_friendly', icon: _tagSvg('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>'), en: 'Pet-friendly', ja: '\u30DA\u30C3\u30C8\u53EF' },
    { key: 'great_drinks', icon: _tagSvg('<path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 3H4l2 7h12l2-7z"/><path d="M6 10c0 3.31 2.69 6 6 6s6-2.69 6-6"/>'), en: 'Great Drinks', ja: '\u30C9\u30EA\u30F3\u30AF\u304C\u7F8E\u5473\u3057\u3044' },
    { key: 'photogenic', icon: _tagSvg('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'), en: 'Photogenic', ja: '\u30D5\u30A9\u30C8\u30B8\u30A7\u30CB\u30C3\u30AF' }
];

// Session cache for tags/memos/folders to avoid redundant API calls
var _tagsCache = {};
var _memosCache = {};
var _myTagsCache = {};
var _foldersCache = null;
var _venueFoldersCache = null;

// Folder color presets (must match Apps Script)
var FOLDER_COLORS = [
    '#FF6B9D', // Pink
    '#4A90D9', // Blue
    '#50C878', // Green
    '#FFB347', // Orange
    '#9B59B6', // Purple
    '#F39C12', // Gold
    '#1ABC9C', // Teal
    '#E74C3C'  // Red
];

/**
 * Check if the tags API is configured
 */
function isTagsApiConfigured() {
    return TAGS_API_URL && TAGS_API_URL.length > 0;
}

/**
 * Compute SHA-256 hash of user email + salt for user identification
 */
async function getUserHash() {
    var user = typeof getUser === 'function' ? getUser() : null;
    if (!user || !user.email) return null;

    var raw = 'omochi_tags_v1_' + user.email.toLowerCase().trim();
    var buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    var hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/**
 * Get tag label in current language
 */
function getTagLabel(tagKey) {
    var lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    for (var i = 0; i < VENUE_TAGS.length; i++) {
        if (VENUE_TAGS[i].key === tagKey) {
            return VENUE_TAGS[i][lang] || VENUE_TAGS[i].en;
        }
    }
    return tagKey;
}

/**
 * Get tag icon
 */
function getTagIcon(tagKey) {
    for (var i = 0; i < VENUE_TAGS.length; i++) {
        if (VENUE_TAGS[i].key === tagKey) {
            return VENUE_TAGS[i].icon;
        }
    }
    return '';
}

// =============================================================================
// GET Operations
// =============================================================================

/**
 * Fetch aggregated tags for a venue (public, no auth needed)
 */
async function fetchVenueTags(venueId) {
    if (!isTagsApiConfigured() || !venueId) return {};

    // Check cache (5 min TTL)
    var cacheKey = 'tags_' + venueId;
    var cached = _tagsCache[cacheKey];
    if (cached && Date.now() - cached.time < 300000) return cached.data;

    try {
        var url = TAGS_API_URL + '?action=get_tags&venue_id=' + encodeURIComponent(venueId);
        var response = await fetch(url);
        var result = await response.json();
        if (result.status === 'ok') {
            _tagsCache[cacheKey] = { data: result.tags, time: Date.now() };
            return result.tags;
        }
    } catch (err) {
        console.warn('Failed to fetch venue tags:', err);
    }
    return {};
}

/**
 * Fetch tags for multiple venues in one call
 */
async function fetchVenueTagsBatch(venueIds) {
    if (!isTagsApiConfigured() || !venueIds || venueIds.length === 0) return {};

    try {
        var url = TAGS_API_URL + '?action=get_tags_batch&venue_ids=' + encodeURIComponent(venueIds.join(','));
        var response = await fetch(url);
        var result = await response.json();
        if (result.status === 'ok') {
            // Cache each venue's tags
            Object.keys(result.venues).forEach(function(vid) {
                _tagsCache['tags_' + vid] = { data: result.venues[vid], time: Date.now() };
            });
            return result.venues;
        }
    } catch (err) {
        console.warn('Failed to fetch venue tags batch:', err);
    }
    return {};
}

/**
 * Fetch which tags the current user has applied to a venue
 */
async function fetchMyTags(venueId) {
    if (!venueId) return [];

    var userHash = await getUserHash();
    if (!userHash) {
        // Guest: check local tags
        var localTags = getLocalTags();
        return localTags
            .filter(function(t) { return t.venue_id === venueId; })
            .map(function(t) { return t.tag_key; });
    }

    if (!isTagsApiConfigured()) return [];

    // Check cache
    var cacheKey = 'my_' + venueId;
    var cached = _myTagsCache[cacheKey];
    if (cached && Date.now() - cached.time < 300000) return cached.data;

    try {
        var url = TAGS_API_URL + '?action=get_my_tags&venue_id=' + encodeURIComponent(venueId) +
                  '&user_hash=' + encodeURIComponent(userHash);
        var response = await fetch(url);
        var result = await response.json();
        if (result.status === 'ok') {
            _myTagsCache[cacheKey] = { data: result.my_tags, time: Date.now() };
            return result.my_tags;
        }
    } catch (err) {
        console.warn('Failed to fetch my tags:', err);
    }
    return [];
}

/**
 * Fetch the current user's private memo for a venue
 */
async function fetchMemo(venueId) {
    if (!venueId) return null;

    var userHash = await getUserHash();
    if (!userHash) {
        // Guest: check local memos
        var localMemos = getLocalMemos();
        var localMemo = localMemos.find(function(m) { return m.venue_id === venueId; });
        return localMemo ? localMemo.memo_text : null;
    }

    if (!isTagsApiConfigured()) return null;

    // Check cache
    var cacheKey = 'memo_' + venueId;
    var cached = _memosCache[cacheKey];
    if (cached && Date.now() - cached.time < 300000) return cached.data;

    try {
        var url = TAGS_API_URL + '?action=get_memo&venue_id=' + encodeURIComponent(venueId) +
                  '&user_hash=' + encodeURIComponent(userHash);
        var response = await fetch(url);
        var result = await response.json();
        if (result.status === 'ok') {
            _memosCache[cacheKey] = { data: result.memo, time: Date.now() };
            return result.memo;
        }
    } catch (err) {
        console.warn('Failed to fetch memo:', err);
    }
    return null;
}

// =============================================================================
// POST Operations
// =============================================================================

/**
 * Add a tag to a venue
 */
async function addVenueTag(venueId, tagKey) {
    if (!venueId) return false;

    var userHash = await getUserHash();

    // Save to localStorage first (works for both guests and logged-in)
    var localTags = getLocalTags();
    var exists = localTags.some(function(t) {
        return t.venue_id === venueId && t.tag_key === tagKey;
    });

    if (!exists) {
        localTags.push({
            venue_id: venueId,
            tag_key: tagKey,
            created_at: new Date().toISOString(),
            expires_at: _guestExpiresAt(),
            synced: false
        });
        setLocalTags(localTags);
    }

    // Guest: local save only
    if (!userHash || !isTagsApiConfigured()) return true;

    // Logged-in: also sync to API
    try {
        var response = await fetch(TAGS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add_tag',
                venue_id: venueId,
                tag_key: tagKey,
                user_hash: userHash,
                session_id: sessionStorage.getItem('session_id') || ''
            })
        });
        var result = await response.json();
        if (result.status === 'ok') {
            // Invalidate caches
            delete _tagsCache['tags_' + venueId];
            delete _myTagsCache['my_' + venueId];
            // Mark as synced
            var tags = getLocalTags();
            var idx = tags.findIndex(function(t) {
                return t.venue_id === venueId && t.tag_key === tagKey;
            });
            if (idx >= 0) {
                tags[idx].synced = true;
                setLocalTags(tags);
            }
            return true;
        }
    } catch (err) {
        console.warn('Failed to add tag to API:', err);
    }
    return true; // Local save succeeded
}

/**
 * Remove a tag from a venue
 */
async function removeVenueTag(venueId, tagKey) {
    if (!venueId) return false;

    var userHash = await getUserHash();

    // Remove from localStorage first
    var localTags = getLocalTags();
    localTags = localTags.filter(function(t) {
        return !(t.venue_id === venueId && t.tag_key === tagKey);
    });
    setLocalTags(localTags);

    // Guest: local removal only
    if (!userHash || !isTagsApiConfigured()) return true;

    // Logged-in: also remove from API
    try {
        var response = await fetch(TAGS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'remove_tag',
                venue_id: venueId,
                tag_key: tagKey,
                user_hash: userHash
            })
        });
        var result = await response.json();
        if (result.status === 'ok') {
            delete _tagsCache['tags_' + venueId];
            delete _myTagsCache['my_' + venueId];
            return true;
        }
    } catch (err) {
        console.warn('Failed to remove tag from API:', err);
    }
    return true; // Local removal succeeded
}

/**
 * Save a private memo for a venue
 */
async function saveMemo(venueId, memoText) {
    if (!venueId) return false;

    var userHash = await getUserHash();

    // Save to localStorage first (works for both guests and logged-in)
    var localMemos = getLocalMemos();
    var existingIdx = localMemos.findIndex(function(m) { return m.venue_id === venueId; });

    var memoObj = {
        venue_id: venueId,
        memo_text: memoText,
        created_at: new Date().toISOString(),
        expires_at: _guestExpiresAt(),
        synced: false
    };

    // Preserve original created_at/expires_at on update
    if (existingIdx >= 0) {
        memoObj.created_at = localMemos[existingIdx].created_at || memoObj.created_at;
        memoObj.expires_at = localMemos[existingIdx].expires_at || memoObj.expires_at;
        localMemos[existingIdx] = memoObj;
    } else {
        localMemos.push(memoObj);
    }
    setLocalMemos(localMemos);

    // Guest: local save only
    if (!userHash || !isTagsApiConfigured()) return true;

    // Logged-in: also sync to API
    try {
        var response = await fetch(TAGS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save_memo',
                venue_id: venueId,
                user_hash: userHash,
                memo_text: memoText
            })
        });
        var result = await response.json();
        if (result.status === 'ok') {
            _memosCache['memo_' + venueId] = { data: memoText, time: Date.now() };
            // Mark as synced in localStorage
            var memos = getLocalMemos();
            var idx = memos.findIndex(function(m) { return m.venue_id === venueId; });
            if (idx >= 0) {
                memos[idx].synced = true;
                setLocalMemos(memos);
            }
            return true;
        }
    } catch (err) {
        console.warn('Failed to save memo to API:', err);
    }
    return true; // Local save succeeded even if API failed
}

/**
 * Get the venue ID for a merged collection item
 */
function getVenueIdFromItem(item) {
    if (item.source === 'api') {
        return item.data.venue || item.data.id || null;
    }
    return item.data.venue_uuid || item.data.id || null;
}

// =============================================================================
// Folder Operations
// =============================================================================

/**
 * Fetch all folders for the current user
 */
async function fetchFolders() {
    if (!isTagsApiConfigured()) return [];

    var userHash = await getUserHash();
    if (!userHash) return getLocalFolders(); // Return local folders for guests

    // Check cache (5 min TTL)
    if (_foldersCache && Date.now() - _foldersCache.time < 300000) {
        return _foldersCache.data;
    }

    try {
        var url = TAGS_API_URL + '?action=get_folders&user_hash=' + encodeURIComponent(userHash);
        var response = await fetch(url);
        var result = await response.json();
        if (result.status === 'ok') {
            _foldersCache = { data: result.folders, time: Date.now() };
            // Also update local cache
            setLocalFolders(result.folders);
            return result.folders;
        }
    } catch (err) {
        console.warn('Failed to fetch folders:', err);
    }
    return getLocalFolders(); // Fallback to local
}

/**
 * Fetch venue-folder mappings for the current user
 */
async function fetchVenueFolders() {
    if (!isTagsApiConfigured()) return {};

    var userHash = await getUserHash();
    if (!userHash) return getLocalVenueFolders(); // Return local mappings for guests

    // Check cache
    if (_venueFoldersCache && Date.now() - _venueFoldersCache.time < 300000) {
        return _venueFoldersCache.data;
    }

    try {
        var url = TAGS_API_URL + '?action=get_venue_folders&user_hash=' + encodeURIComponent(userHash);
        var response = await fetch(url);
        var result = await response.json();
        if (result.status === 'ok') {
            _venueFoldersCache = { data: result.venue_folders, time: Date.now() };
            // Also update local cache
            setLocalVenueFolders(result.venue_folders);
            return result.venue_folders;
        }
    } catch (err) {
        console.warn('Failed to fetch venue folders:', err);
    }
    return getLocalVenueFolders(); // Fallback to local
}

/**
 * Create or update a folder
 */
async function saveFolder(folderId, name, color, order) {
    // Save to local cache first
    var localFolders = getLocalFolders();
    var existingIdx = localFolders.findIndex(function(f) { return f.id === folderId; });

    var folder = {
        id: folderId || 'folder_' + Date.now(),
        name: name,
        color: color || FOLDER_COLORS[0],
        order: typeof order === 'number' ? order : localFolders.length,
        created_at: new Date().toISOString(),
        expires_at: _guestExpiresAt(),
        synced: false
    };

    if (existingIdx >= 0) {
        // Preserve original timestamps on update
        folder.created_at = localFolders[existingIdx].created_at || folder.created_at;
        folder.expires_at = localFolders[existingIdx].expires_at || folder.expires_at;
        folder.synced = localFolders[existingIdx].synced || false;
        localFolders[existingIdx] = folder;
    } else {
        localFolders.push(folder);
    }
    setLocalFolders(localFolders);

    // If logged in, sync to API
    if (!isTagsApiConfigured()) return folder;

    var userHash = await getUserHash();
    if (!userHash) return folder; // Guest - local only

    try {
        var response = await fetch(TAGS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save_folder',
                folder_id: folder.id,
                user_hash: userHash,
                folder_name: name,
                color: folder.color,
                order: folder.order
            })
        });
        var result = await response.json();
        if (result.status === 'ok') {
            folder.id = result.folder_id || folder.id;
            folder.synced = true;
            // Update local with synced flag
            var folders = getLocalFolders();
            var idx = folders.findIndex(function(f) { return f.id === folder.id; });
            if (idx >= 0) {
                folders[idx].synced = true;
                setLocalFolders(folders);
            }
            // Invalidate cache
            _foldersCache = null;
        }
    } catch (err) {
        console.warn('Failed to save folder to API:', err);
    }
    return folder;
}

/**
 * Delete a folder
 */
async function deleteFolder(folderId) {
    // Remove from local cache
    var localFolders = getLocalFolders();
    localFolders = localFolders.filter(function(f) { return f.id !== folderId; });
    setLocalFolders(localFolders);

    // Remove venue-folder associations (handle both old string and new object format)
    var venueFolders = getLocalVenueFolders();
    Object.keys(venueFolders).forEach(function(venueId) {
        var val = venueFolders[venueId];
        var linkedFolderId = typeof val === 'object' ? val.folder_id : val;
        if (linkedFolderId === folderId) {
            delete venueFolders[venueId];
        }
    });
    setLocalVenueFolders(venueFolders);

    // If logged in, sync to API
    if (!isTagsApiConfigured()) return true;

    var userHash = await getUserHash();
    if (!userHash) return true; // Guest - local only

    try {
        var response = await fetch(TAGS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_folder',
                folder_id: folderId,
                user_hash: userHash
            })
        });
        var result = await response.json();
        if (result.status === 'ok') {
            _foldersCache = null;
            _venueFoldersCache = null;
        }
        return result.status === 'ok';
    } catch (err) {
        console.warn('Failed to delete folder from API:', err);
    }
    return true; // Local delete succeeded
}

/**
 * Assign a venue to a folder
 */
async function setVenueFolder(venueId, folderId) {
    // Save to local cache first
    var venueFolders = getLocalVenueFolders();
    if (folderId) {
        venueFolders[venueId] = {
            folder_id: folderId,
            created_at: new Date().toISOString(),
            expires_at: _guestExpiresAt(),
            synced: false
        };
    } else {
        delete venueFolders[venueId];
    }
    setLocalVenueFolders(venueFolders);

    // If logged in, sync to API
    if (!isTagsApiConfigured()) return true;

    var userHash = await getUserHash();
    if (!userHash) return true; // Guest - local only

    try {
        var action = folderId ? 'set_venue_folder' : 'remove_venue_folder';
        var body = {
            action: action,
            venue_id: venueId,
            user_hash: userHash
        };
        if (folderId) body.folder_id = folderId;

        var response = await fetch(TAGS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        var result = await response.json();
        if (result.status === 'ok') {
            // Mark as synced
            if (folderId) {
                var vf = getLocalVenueFolders();
                if (vf[venueId] && typeof vf[venueId] === 'object') {
                    vf[venueId].synced = true;
                    setLocalVenueFolders(vf);
                }
            }
            _venueFoldersCache = null;
        }
        return result.status === 'ok';
    } catch (err) {
        console.warn('Failed to set venue folder via API:', err);
    }
    return true; // Local update succeeded
}

/**
 * Get folder for a venue (from cache)
 */
function getVenueFolderSync(venueId) {
    var venueFolders = getLocalVenueFolders();
    var val = venueFolders[venueId];
    if (!val) return null;
    // Handle both old format (plain string) and new format ({ folder_id, ... })
    return typeof val === 'object' ? val.folder_id : val;
}

/**
 * Get folder by ID (from cache)
 */
function getFolderById(folderId) {
    var folders = getLocalFolders();
    return folders.find(function(f) { return f.id === folderId; }) || null;
}

/**
 * Invalidate folder caches (call after login to refresh from API)
 */
function invalidateFolderCache() {
    _foldersCache = null;
    _venueFoldersCache = null;
}

// =============================================================================
// Local Storage Helpers for Folders
// =============================================================================

var LOCAL_FOLDERS_KEY = 'omochi_user_folders';
var LOCAL_VENUE_FOLDERS_KEY = 'omochi_venue_folders';
var LOCAL_MEMOS_KEY = 'omochi_local_memos';
var LOCAL_TAGS_KEY = 'omochi_local_tags';
var GUEST_EXPIRY_DAYS = 7;

function getLocalFolders() {
    try {
        var data = localStorage.getItem(LOCAL_FOLDERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function setLocalFolders(folders) {
    try {
        localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders));
    } catch (e) {
        console.warn('Failed to save folders to localStorage:', e);
    }
}

function getLocalVenueFolders() {
    try {
        var data = localStorage.getItem(LOCAL_VENUE_FOLDERS_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

function setLocalVenueFolders(venueFolders) {
    try {
        localStorage.setItem(LOCAL_VENUE_FOLDERS_KEY, JSON.stringify(venueFolders));
    } catch (e) {
        console.warn('Failed to save venue folders to localStorage:', e);
    }
}

// =============================================================================
// Local Storage Helpers for Memos & Tags (Guest Mode)
// =============================================================================

function getLocalMemos() {
    try {
        var data = localStorage.getItem(LOCAL_MEMOS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function setLocalMemos(memos) {
    try {
        localStorage.setItem(LOCAL_MEMOS_KEY, JSON.stringify(memos));
    } catch (e) {
        console.warn('Failed to save memos to localStorage:', e);
    }
}

function getLocalTags() {
    try {
        var data = localStorage.getItem(LOCAL_TAGS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function setLocalTags(tags) {
    try {
        localStorage.setItem(LOCAL_TAGS_KEY, JSON.stringify(tags));
    } catch (e) {
        console.warn('Failed to save tags to localStorage:', e);
    }
}

function _guestExpiresAt() {
    return new Date(Date.now() + GUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// =============================================================================
// Guest Data Expiration Cleanup
// =============================================================================

/**
 * Remove expired local memos
 * @returns {number} Number of items deleted
 */
function cleanupExpiredMemos() {
    var memos = getLocalMemos();
    var now = new Date();
    var valid = memos.filter(function(m) {
        if (!m.expires_at) return true; // Legacy items kept
        return new Date(m.expires_at) > now;
    });
    var deletedCount = memos.length - valid.length;
    if (deletedCount > 0) setLocalMemos(valid);
    return deletedCount;
}

/**
 * Remove expired local tags
 * @returns {number} Number of items deleted
 */
function cleanupExpiredTags() {
    var tags = getLocalTags();
    var now = new Date();
    var valid = tags.filter(function(t) {
        if (!t.expires_at) return true;
        return new Date(t.expires_at) > now;
    });
    var deletedCount = tags.length - valid.length;
    if (deletedCount > 0) setLocalTags(valid);
    return deletedCount;
}

/**
 * Remove expired folders and their venue-folder associations
 * @returns {number} Number of folders deleted
 */
function cleanupExpiredFolders() {
    var folders = getLocalFolders();
    var now = new Date();
    var deletedCount = 0;

    var validFolders = folders.filter(function(f) {
        if (!f.expires_at) return true; // Legacy items kept
        var expired = new Date(f.expires_at) <= now;
        if (expired) deletedCount++;
        return !expired;
    });

    if (deletedCount > 0) {
        setLocalFolders(validFolders);

        // Clean orphaned venue-folder associations
        var validIds = validFolders.map(function(f) { return f.id; });
        var venueFolders = getLocalVenueFolders();
        var cleaned = {};
        Object.keys(venueFolders).forEach(function(venueId) {
            var val = venueFolders[venueId];
            var fId = typeof val === 'object' ? val.folder_id : val;
            // Check folder still exists and association not expired
            if (validIds.indexOf(fId) >= 0) {
                if (typeof val === 'object' && val.expires_at && new Date(val.expires_at) <= now) {
                    return; // Expired association
                }
                cleaned[venueId] = val;
            }
        });
        setLocalVenueFolders(cleaned);
    }

    return deletedCount;
}

/**
 * Clean up all expired guest data
 * @returns {Object} { memos, tags, folders } - counts deleted
 */
function cleanupAllExpiredGuestData() {
    return {
        memos: cleanupExpiredMemos(),
        tags: cleanupExpiredTags(),
        folders: cleanupExpiredFolders(),
        visits: cleanupExpiredVisits()
    };
}

// =============================================================================
// Post-Login Sync Functions
// =============================================================================

/**
 * Sync unsynced local memos to the Tags API
 */
async function syncLocalMemosToApi() {
    var userHash = await getUserHash();
    if (!userHash) return;

    var memos = getLocalMemos().filter(function(m) { return !m.synced; });
    for (var i = 0; i < memos.length; i++) {
        try {
            await saveMemo(memos[i].venue_id, memos[i].memo_text);
        } catch (err) {
            console.warn('Failed to sync memo:', err);
        }
    }
}

/**
 * Sync unsynced local tags to the Tags API
 */
async function syncLocalTagsToApi() {
    var userHash = await getUserHash();
    if (!userHash) return;

    var tags = getLocalTags().filter(function(t) { return !t.synced; });
    for (var i = 0; i < tags.length; i++) {
        try {
            await addVenueTag(tags[i].venue_id, tags[i].tag_key);
        } catch (err) {
            console.warn('Failed to sync tag:', err);
        }
    }
}

/**
 * Sync unsynced local folders and venue-folder mappings to the Tags API
 */
async function syncLocalFoldersToApi() {
    var userHash = await getUserHash();
    if (!userHash) return;

    // Sync folders first
    var folders = getLocalFolders().filter(function(f) { return !f.synced; });
    for (var i = 0; i < folders.length; i++) {
        try {
            await saveFolder(folders[i].id, folders[i].name, folders[i].color, folders[i].order);
        } catch (err) {
            console.warn('Failed to sync folder:', err);
        }
    }

    // Then sync venue-folder associations
    var venueFolders = getLocalVenueFolders();
    var venueIds = Object.keys(venueFolders);
    for (var i = 0; i < venueIds.length; i++) {
        var val = venueFolders[venueIds[i]];
        var isSynced = typeof val === 'object' ? val.synced : true;
        if (!isSynced) {
            var fId = typeof val === 'object' ? val.folder_id : val;
            try {
                await setVenueFolder(venueIds[i], fId);
            } catch (err) {
                console.warn('Failed to sync venue folder:', err);
            }
        }
    }
}

// =============================================================================
// Visit Status Tracking (Went / Want to Go)
// =============================================================================

var LOCAL_VISITS_KEY = 'omochi_local_visits';
var _visitStatusCache = {};

var VISIT_STATUSES = {
    WENT: 'went',
    WANT_TO_GO: 'want_to_go'
};

// --- localStorage Helpers ---

function getLocalVisits() {
    try {
        var data = localStorage.getItem(LOCAL_VISITS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function setLocalVisits(visits) {
    try {
        localStorage.setItem(LOCAL_VISITS_KEY, JSON.stringify(visits));
    } catch (e) {
        console.warn('Failed to save visits to localStorage:', e);
    }
}

/**
 * Get visit status for a venue (synchronous, from localStorage)
 * @returns {{ status: string, visit_count: number }} or null
 */
function getLocalVisitStatus(venueId) {
    if (!venueId) return null;
    var visits = getLocalVisits();
    var entry = visits.find(function(v) { return v.venue_id === venueId; });
    if (!entry) return null;
    return { status: entry.status, visit_count: entry.visit_count || 0 };
}

/**
 * Set visit status for a venue in localStorage
 */
function setLocalVisitStatus(venueId, status, visitCount) {
    if (!venueId) return;
    var visits = getLocalVisits();
    var existingIdx = visits.findIndex(function(v) { return v.venue_id === venueId; });

    var entry = {
        venue_id: venueId,
        status: status,
        visit_count: typeof visitCount === 'number' ? visitCount : (status === VISIT_STATUSES.WENT ? 1 : 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: _guestExpiresAt(),
        synced: false
    };

    if (existingIdx >= 0) {
        entry.created_at = visits[existingIdx].created_at || entry.created_at;
        entry.expires_at = visits[existingIdx].expires_at || entry.expires_at;
        visits[existingIdx] = entry;
    } else {
        visits.push(entry);
    }
    setLocalVisits(visits);

    // Invalidate cache
    delete _visitStatusCache['visit_' + venueId];
}

/**
 * Remove visit status for a venue
 */
function removeLocalVisitStatus(venueId) {
    if (!venueId) return;
    var visits = getLocalVisits();
    visits = visits.filter(function(v) { return v.venue_id !== venueId; });
    setLocalVisits(visits);
    delete _visitStatusCache['visit_' + venueId];
}

/**
 * Set default "want_to_go" if no status exists yet (called on collect)
 */
function initDefaultVisitStatus(venueId) {
    if (!venueId) return;
    var existing = getLocalVisitStatus(venueId);
    if (!existing) {
        setLocalVisitStatus(venueId, VISIT_STATUSES.WANT_TO_GO, 0);
    }
}

// --- API Operations ---

/**
 * Fetch visit status from API (logged-in) or localStorage (guest)
 * @returns {{ status: string, visit_count: number }} or null
 */
async function fetchVisitStatus(venueId) {
    if (!venueId) return null;

    var userHash = await getUserHash();
    if (!userHash) {
        // Guest: use localStorage
        return getLocalVisitStatus(venueId);
    }

    if (!isTagsApiConfigured()) return getLocalVisitStatus(venueId);

    // Check cache (5 min TTL)
    var cacheKey = 'visit_' + venueId;
    var cached = _visitStatusCache[cacheKey];
    if (cached && Date.now() - cached.time < 300000) return cached.data;

    try {
        var url = TAGS_API_URL + '?action=get_visit_status&venue_id=' + encodeURIComponent(venueId) +
                  '&user_hash=' + encodeURIComponent(userHash);
        var response = await fetch(url);
        var result = await response.json();
        if (result.status === 'ok') {
            var data = result.visit_status ? {
                status: result.visit_status,
                visit_count: result.visit_count || 0
            } : null;
            _visitStatusCache[cacheKey] = { data: data, time: Date.now() };
            return data;
        }
    } catch (err) {
        console.warn('Failed to fetch visit status:', err);
    }
    return getLocalVisitStatus(venueId); // Fallback to local
}

/**
 * Set visit status (localStorage-first + API sync)
 */
async function setVisitStatus(venueId, status, visitCount) {
    if (!venueId) return false;

    // Save locally first
    setLocalVisitStatus(venueId, status, visitCount);

    // If logged in, sync to API
    var userHash = await getUserHash();
    if (!userHash || !isTagsApiConfigured()) return true;

    try {
        var response = await fetch(TAGS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'set_visit_status',
                venue_id: venueId,
                user_hash: userHash,
                visit_status: status,
                visit_count: visitCount || (status === VISIT_STATUSES.WENT ? 1 : 0)
            })
        });
        var result = await response.json();
        if (result.status === 'ok') {
            // Mark as synced
            var visits = getLocalVisits();
            var idx = visits.findIndex(function(v) { return v.venue_id === venueId; });
            if (idx >= 0) {
                visits[idx].synced = true;
                setLocalVisits(visits);
            }
            delete _visitStatusCache['visit_' + venueId];
            return true;
        }
    } catch (err) {
        console.warn('Failed to set visit status via API:', err);
    }
    return true; // Local save succeeded
}

/**
 * Remove visit status (localStorage-first + API sync)
 */
async function removeVisitStatus(venueId) {
    if (!venueId) return false;

    removeLocalVisitStatus(venueId);

    var userHash = await getUserHash();
    if (!userHash || !isTagsApiConfigured()) return true;

    try {
        var response = await fetch(TAGS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'remove_visit_status',
                venue_id: venueId,
                user_hash: userHash
            })
        });
        var result = await response.json();
        if (result.status === 'ok') {
            delete _visitStatusCache['visit_' + venueId];
        }
    } catch (err) {
        console.warn('Failed to remove visit status via API:', err);
    }
    return true;
}

// --- Cleanup & Sync ---

/**
 * Remove expired visit status entries
 * @returns {number} Number of items deleted
 */
function cleanupExpiredVisits() {
    var visits = getLocalVisits();
    var now = new Date();
    var valid = visits.filter(function(v) {
        if (!v.expires_at) return true; // Legacy items kept
        return new Date(v.expires_at) > now;
    });
    var deletedCount = visits.length - valid.length;
    if (deletedCount > 0) setLocalVisits(valid);
    return deletedCount;
}

/**
 * Sync unsynced local visit statuses to the Tags API
 */
async function syncLocalVisitsToApi() {
    var userHash = await getUserHash();
    if (!userHash) return;

    var visits = getLocalVisits().filter(function(v) { return !v.synced; });
    for (var i = 0; i < visits.length; i++) {
        try {
            await setVisitStatus(visits[i].venue_id, visits[i].status, visits[i].visit_count);
        } catch (err) {
            console.warn('Failed to sync visit status:', err);
        }
    }
}
