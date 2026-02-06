/**
 * Data fetching module for Google Sheets integration
 * Fetches video data from Google Apps Script (supports YouTube and X/Twitter embeds)
 *
 * IMPORTANT: Replace GOOGLE_SHEETS_API_URL with your actual Google Apps Script web app URL
 */

// TODO: Replace this with your actual Google Apps Script URL
const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwHP_Eim3bYCEFBoz6q642m9wNu3q8efx3bqio_5KqnfQr4t1xOqQS_Rll9wdom-ICfdQ/exec';

/**
 * Fetches video data from Google Sheets via Apps Script
 * @returns {Promise<Object>} Object with videos and collections arrays
 */
async function fetchVideoData() {
    try {
        const response = await fetch(GOOGLE_SHEETS_API_URL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Handle new response format: { videos: [...], collections: [...] }
        // Or fallback to old format (array of videos)
        return data;
    } catch (error) {
        console.error('Error fetching video data:', error);
        // Return sample data for testing
        return getSampleData();
    }
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
 *   genre: "Cuisine type" (optional),
 *   address: "Physical location" (optional),
 *   priority: 5 (optional),
 *   active: true (optional),
 *   tags: "tag1,tag2" (optional)
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

        return item;
    });
}
