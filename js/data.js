/**
 * Data fetching module for Google Sheets integration
 * Fetches video data from Google Apps Script (supports YouTube and X/Twitter embeds)
 *
 * IMPORTANT: Replace GOOGLE_SHEETS_API_URL with your actual Google Apps Script web app URL
 */

// TODO: Replace this with your actual Google Apps Script URL
const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbxaVlIan_XuGPo5m9olPBXaPighiFzJ1MLnRNS6qc2wNcKGIvd1vlcPq1edY4JoBiAYTQ/exec';

// Cache configuration
var VIDEO_CACHE_KEY = 'omochi_video_cache';
var CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches video data from Google Sheets via Apps Script
 * Uses localStorage cache for faster subsequent loads
 * @returns {Promise<Object>} Object with videos and collections arrays
 */
async function fetchVideoData() {
    // Check cache first
    var cached = _getCachedVideoData();
    if (cached) {
        console.log('[data.js] Using cached video data');
        return cached;
    }

    try {
        const response = await fetch(GOOGLE_SHEETS_API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Cache the response
        _cacheVideoData(data);

        return data;
    } catch (error) {
        console.error('Error fetching video data:', error);
        // Return sample data for testing
        return getSampleData();
    }
}

/**
 * Get cached video data if valid
 */
function _getCachedVideoData() {
    try {
        var cached = localStorage.getItem(VIDEO_CACHE_KEY);
        if (!cached) return null;

        var parsed = JSON.parse(cached);
        var age = Date.now() - parsed.timestamp;

        if (age > CACHE_TTL_MS) {
            localStorage.removeItem(VIDEO_CACHE_KEY);
            console.log('[data.js] Cache expired, will fetch fresh');
            return null;
        }

        return parsed.data;
    } catch (e) {
        console.warn('[data.js] Cache read error:', e);
        return null;
    }
}

/**
 * Cache video data with timestamp
 */
function _cacheVideoData(data) {
    try {
        localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
        console.log('[data.js] Cached video data');
    } catch (e) {
        console.warn('[data.js] Failed to cache:', e);
    }
}

/**
 * Force refresh cache (call when data might be stale)
 */
function clearVideoCache() {
    localStorage.removeItem(VIDEO_CACHE_KEY);
    console.log('[data.js] Cache cleared');
}

/**
 * Sample YouTube Shorts data for testing (Food/Venue focused with multilingual captions)
 * This will be replaced by actual data from Google Sheets
 *
 * Expected data structure from Google Sheets:
 * {
 *   id: "video_001",
 *   url: "https://www.youtube.com/embed/VIDEO_ID" or "https://x.com/user/status/TWEET_ID",
 *   caption_en: "English caption text",
 *   caption_ja: "Japanese caption text",
 *   venue_name: "Restaurant Name" (required),
 *   category: "food" (required - top-level: food/nightlife/entertainment/shopping/beauty/travel),
 *   genre: "Cuisine type" (optional - sub-category like italian, yakiniku, club),
 *   address: "Physical location" (optional),
 *   nearest_station: "Station name" (optional),
 *   priority: 5 (optional),
 *   active: true (optional),
 *   tags: "tag1,tag2" (optional),
 *   venue_key: "venuename_area" (optional - used for NFC/QR auto-collect),
 *   reservable: true (optional - TRUE/FALSE, controls reservation availability display)
 * }
 *
 * Supported URL formats:
 *   YouTube: https://www.youtube.com/embed/VIDEO_ID
 *   X/Twitter: https://x.com/user/status/TWEET_ID or https://twitter.com/user/status/TWEET_ID
 */
function getSampleData() {
    // Returns empty data when API fails (no placeholder videos)
    return {
        videos: [],
        collections: []
    };
}

/**
 * Detects video type from URL
 * @param {string} url - Video URL
 * @returns {string|null} 'youtube', 'x', or null if unsupported
 */
function detectVideoType(url) {
    if (!url) return null;
    if (url.includes('youtube.com/embed/')) return 'youtube';
    if (url.includes('x.com/') || url.includes('twitter.com/')) return 'x';
    return null;
}

/**
 * Extracts tweet ID from an X/Twitter URL
 * @param {string} url - X or Twitter URL (e.g., https://x.com/user/status/123456)
 * @returns {string} Tweet ID or empty string
 */
function extractTweetId(url) {
    var match = url.match(/status\/(\d+)/);
    return match ? match[1] : '';
}

/**
 * Parses and validates video data (YouTube and X/Twitter)
 * @param {Object|Array} rawData - Raw data from Google Sheets (new format: {videos, collections} or old format: array)
 * @returns {Array} Validated video data
 */
function parseVideoData(rawData) {
    // Handle both new format {videos: [], collections: []} and old format (array)
    const videosArray = rawData.videos || rawData;

    return videosArray.filter(item => {
        // Validate required fields (url, caption_en)
        if (!item.url || !item.caption_en) {
            console.warn('Invalid video data - missing url or caption_en:', item);
            return false;
        }

        // Detect video type from URL
        var type = detectVideoType(item.url);
        if (!type) {
            console.warn('Unsupported video URL format:', item.url);
            return false;
        }

        return true;
    }).map(item => {
        // Ensure all items have an id
        if (!item.id) {
            item.id = 'video_' + Math.random().toString(36).substring(2, 11);
        }

        // Ensure caption_ja exists (fallback to caption_en if not provided)
        if (!item.caption_ja) {
            item.caption_ja = item.caption_en;
        }

        // Attach video type and tweet_id for X posts
        item.video_type = detectVideoType(item.url);
        if (item.video_type === 'x') {
            item.tweet_id = extractTweetId(item.url);
        }

        // Normalize reservable to boolean (default true if not specified)
        item.reservable = (item.reservable !== false && item.reservable !== 'FALSE' && item.reservable !== 'false');

        return item;
    });
}
