/**
 * Data fetching module for Google Sheets integration
 * Fetches YouTube Shorts data from Google Apps Script
 *
 * IMPORTANT: Replace GOOGLE_SHEETS_API_URL with your actual Google Apps Script web app URL
 */

// TODO: Replace this with your actual Google Apps Script URL
const GOOGLE_SHEETS_API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';

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
 *   url: "https://www.youtube.com/embed/VIDEO_ID",
 *   caption_en: "English caption text",
 *   caption_ja: "Japanese caption text",
 *   venue_name: "Restaurant Name" (required),
 *   genre: "Cuisine type" (optional),
 *   address: "Physical location" (optional),
 *   priority: 5 (optional),
 *   active: true (optional),
 *   tags: "tag1,tag2" (optional)
 * }
 */
function getSampleData() {
    return {
        videos: [
            {
                id: 'sample_001',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                caption_en: 'Best ramen in town! 🍜',
                caption_ja: 'この街で最高のラーメン！🍜',
                venue_name: 'Sample Ramen House',
                genre: 'Japanese',
                address: '123 Food St, Sample City',
                tags: 'ramen,japanese,noodles',
                collection: 'tokyo-ramen,trending',
                priority: 5
            },
            {
                id: 'sample_002',
                url: 'https://www.youtube.com/embed/jNQXAC9IVRw',
                caption_en: 'Amazing wood-fired pizza 🍕',
                caption_ja: '素晴らしい薪窯ピザ 🍕',
                venue_name: 'Sample Pizza Co',
                genre: 'Italian',
                address: '456 Main Ave, Sample City',
                tags: 'pizza,italian,woodfired',
                collection: 'best-pizza',
                priority: 5
            },
            {
                id: 'sample_003',
                url: 'https://www.youtube.com/embed/9bZkp7q19f0',
                caption_en: 'Fresh sushi daily 🍣',
                caption_ja: '新鮮な寿司ロール 🍣',
                venue_name: 'Sample Sushi Bar',
                genre: 'Japanese',
                address: '789 Ocean Blvd, Sample City',
                tags: 'sushi,japanese,fresh',
                collection: 'trending',
                priority: 5
            }
        ],
        collections: [
            {
                collection_id: 'all',
                name_en: 'All Videos',
                name_ja: 'すべての動画',
                icon: '🎬',
                display_order: 0,
                active: true
            },
            {
                collection_id: 'tokyo-ramen',
                name_en: 'Tokyo Ramen',
                name_ja: '東京ラーメン',
                icon: '🍜',
                display_order: 1,
                active: true
            },
            {
                collection_id: 'best-pizza',
                name_en: 'Best Pizza',
                name_ja: '最高のピザ',
                icon: '🍕',
                display_order: 2,
                active: true
            },
            {
                collection_id: 'trending',
                name_en: 'Trending Now',
                name_ja: 'トレンド',
                icon: '🔥',
                display_order: 3,
                active: true
            }
        ]
    };
}

/**
 * Parses and validates YouTube Shorts data
 * @param {Object|Array} rawData - Raw data from Google Sheets (new format: {videos, collections} or old format: array)
 * @returns {Array} Validated video data
 */
function parseVideoData(rawData) {
    // Handle both new format {videos: [], collections: []} and old format (array)
    const videosArray = rawData.videos || rawData;

    return videosArray.filter(item => {
        // Validate required fields (id, url, caption_en)
        if (!item.url || !item.caption_en) {
            console.warn('Invalid video data - missing url or caption_en:', item);
            return false;
        }

        // Ensure URL is a YouTube embed URL
        if (!item.url.includes('youtube.com/embed/')) {
            console.warn('Invalid video URL - must be YouTube embed format:', item.url);
            return false;
        }

        return true;
    }).map(item => {
        // Ensure all items have an id
        if (!item.id) {
            item.id = 'video_' + Math.random().toString(36).substr(2, 9);
        }

        // Ensure caption_ja exists (fallback to caption_en if not provided)
        if (!item.caption_ja) {
            item.caption_ja = item.caption_en;
        }

        return item;
    });
}
