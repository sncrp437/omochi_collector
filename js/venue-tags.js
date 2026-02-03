// =============================================================================
// Venue Tags & Memos API Client
// =============================================================================

// TODO: Replace with your deployed Apps Script URL
var TAGS_API_URL = '';

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

// Session cache for tags/memos to avoid redundant API calls
var _tagsCache = {};
var _memosCache = {};
var _myTagsCache = {};

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
    if (!isTagsApiConfigured() || !venueId) return [];

    var userHash = await getUserHash();
    if (!userHash) return [];

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
    if (!isTagsApiConfigured() || !venueId) return null;

    var userHash = await getUserHash();
    if (!userHash) return null;

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
    if (!isTagsApiConfigured()) return false;

    var userHash = await getUserHash();
    if (!userHash) return false;

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
            return true;
        }
    } catch (err) {
        console.warn('Failed to add tag:', err);
    }
    return false;
}

/**
 * Remove a tag from a venue
 */
async function removeVenueTag(venueId, tagKey) {
    if (!isTagsApiConfigured()) return false;

    var userHash = await getUserHash();
    if (!userHash) return false;

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
        console.warn('Failed to remove tag:', err);
    }
    return false;
}

/**
 * Save a private memo for a venue
 */
async function saveMemo(venueId, memoText) {
    if (!isTagsApiConfigured()) return false;

    var userHash = await getUserHash();
    if (!userHash) return false;

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
            return true;
        }
    } catch (err) {
        console.warn('Failed to save memo:', err);
    }
    return false;
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
