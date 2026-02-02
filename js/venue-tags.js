// =============================================================================
// Venue Tags & Memos API Client
// =============================================================================

// TODO: Replace with your deployed Apps Script URL
var TAGS_API_URL = '';

// Predefined tag definitions
var VENUE_TAGS = [
    { key: 'date_spot', icon: '\uD83D\uDC91', en: 'Date Spot', ja: '\u30C7\u30FC\u30C8\u30B9\u30DD\u30C3\u30C8' },
    { key: 'business_dinner', icon: '\uD83D\uDC54', en: 'Business Dinner', ja: '\u30D3\u30B8\u30CD\u30B9\u30C7\u30A3\u30CA\u30FC' },
    { key: 'family_friendly', icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66', en: 'Family-friendly', ja: '\u30D5\u30A1\u30DF\u30EA\u30FC\u5411\u3051' },
    { key: 'solo_dining', icon: '\uD83E\uDDD1', en: 'Solo Dining OK', ja: '\u304A\u3072\u3068\u308A\u3055\u307E\u004F\u004B' },
    { key: 'late_night', icon: '\uD83C\uDF19', en: 'Late Night', ja: '\u6DF1\u591C\u55B6\u696D' },
    { key: 'budget_friendly', icon: '\uD83D\uDCB0', en: 'Budget-friendly', ja: '\u304A\u624B\u9803' },
    { key: 'special_occasion', icon: '\uD83C\uDF89', en: 'Special Occasion', ja: '\u7279\u5225\u306A\u65E5' },
    { key: 'quiet_calm', icon: '\uD83E\uDD2B', en: 'Quiet / Calm', ja: '\u9759\u304B\u30FB\u843D\u3061\u7740\u304D' },
    { key: 'lively_fun', icon: '\uD83C\uDF8A', en: 'Lively / Fun', ja: '\u8CE1\u3084\u304B\u30FB\u697D\u3057\u3044' },
    { key: 'pet_friendly', icon: '\uD83D\uDC15', en: 'Pet-friendly', ja: '\u30DA\u30C3\u30C8\u53EF' },
    { key: 'great_drinks', icon: '\uD83C\uDF77', en: 'Great Drinks', ja: '\u30C9\u30EA\u30F3\u30AF\u304C\u7F8E\u5473\u3057\u3044' },
    { key: 'photogenic', icon: '\uD83D\uDCF8', en: 'Photogenic', ja: '\u30D5\u30A9\u30C8\u30B8\u30A7\u30CB\u30C3\u30AF' }
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
