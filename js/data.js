/**
 * Data fetching module for Google Sheets integration
 * Fetches video data from Google Apps Script (supports YouTube and X/Twitter embeds)
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
    return {
        videos: [
            {
                id: 'sample_001',
                url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                caption_en: 'Best ramen in town! Rich tonkotsu broth simmered for 18 hours, perfectly chewy noodles, melt-in-your-mouth chashu pork, and a soft-boiled egg with a golden yolk. This hidden gem near the station has been serving authentic Hakata-style ramen since 1985. Must try their spicy miso variant too! 🍜',
                caption_ja: 'この街で最高のラーメン！18時間煮込んだ濃厚豚骨スープ、もちもちの自家製麺、口の中でとろけるチャーシュー、そして黄金色の半熟煮卵。駅近のこの隠れた名店は1985年から本格的な博多ラーメンを提供しています。辛味噌ラーメンもぜひお試しください！🍜',
                venue_name: 'Sample Ramen House',
                genre: 'Japanese',
                address: '123 Food St, Sample City',
                nearest_station: 'Shibuya',
                nearest_station_en: 'Shibuya',
                tags: 'ramen,japanese,noodles',
                collection: 'tokyo-ramen,trending',
                priority: 5
            },
            {
                id: 'sample_002',
                url: 'https://www.youtube.com/embed/jNQXAC9IVRw',
                caption_en: 'Amazing wood-fired pizza baked at 450°C in a traditional Neapolitan oven imported straight from Naples! The Margherita with San Marzano tomatoes, fresh buffalo mozzarella, and hand-picked basil is an absolute masterpiece. They also make their own sourdough base with 72-hour fermented dough. Open late on weekends! 🍕',
                caption_ja: 'ナポリから直輸入した伝統的な窯で450°Cで焼き上げる絶品薪窯ピザ！サンマルツァーノトマト、新鮮な水牛モッツァレラ、手摘みバジルのマルゲリータは最高傑作です。72時間発酵させた自家製サワードウ生地も使用。週末は深夜まで営業！🍕',
                venue_name: 'Sample Pizza Co',
                genre: 'Italian',
                address: '456 Main Ave, Sample City',
                nearest_station: 'Roppongi',
                nearest_station_en: 'Roppongi',
                tags: 'pizza,italian,woodfired',
                collection: 'best-pizza',
                priority: 5
            },
            {
                id: 'sample_003',
                url: 'https://www.youtube.com/embed/9bZkp7q19f0',
                caption_en: 'Fresh sushi flown in daily from Tsukiji outer market! Chef Tanaka has 30 years of experience crafting each piece with precision. The omakase course features seasonal fish like shima-aji, uni from Hokkaido, and otoro that melts on your tongue. Counter seats only — reservations recommended for this intimate 8-seat experience. 🍣',
                caption_ja: '築地場外市場から毎日直送の新鮮なお寿司！田中大将は30年の経験を持ち、一貫一貫を丁寧に握ります。おまかせコースでは、しまあじ、北海道産うに、舌の上でとろけるような大トロなど旬の魚をお楽しみいただけます。カウンター8席のみ — この贅沢な体験にはご予約をおすすめします。🍣',
                venue_name: 'Sample Sushi Bar',
                genre: 'Japanese',
                address: '789 Ocean Blvd, Sample City',
                nearest_station: 'Shibuya',
                nearest_station_en: 'Shibuya',
                tags: 'sushi,japanese,fresh',
                collection: 'trending',
                priority: 5
            },
            {
                id: 'sample_x_video_001',
                url: 'https://x.com/OmochiTeam/status/1994169145060151709',
                caption_en: 'Check out this amazing food video from X! Street food at its finest - crispy, juicy, and bursting with flavor.',
                caption_ja: 'Xからの素晴らしいフードビデオ！最高のストリートフード - カリカリ、ジューシー、風味豊か。',
                venue_name: 'X Video Food Post',
                genre: 'Street Food',
                address: 'Tokyo, Japan',
                nearest_station: 'Shibuya',
                nearest_station_en: 'Shibuya',
                tags: 'streetfood,video,x',
                collection: 'trending',
                priority: 4
            },
            {
                id: 'sample_x_text_001',
                url: 'https://x.com/Eloha_JP/status/1886706336147763459',
                caption_en: 'A great food recommendation tweet - discover hidden gems through the community!',
                caption_ja: '素晴らしいグルメ情報ツイート - コミュニティを通じて隠れた名店を発見！',
                venue_name: 'X Text Food Post',
                genre: 'Japanese',
                address: 'Osaka, Japan',
                nearest_station: 'Roppongi',
                nearest_station_en: 'Roppongi',
                tags: 'recommendation,text,x',
                collection: 'trending',
                priority: 3
            }
        ],
        collections: [
            {
                collection_id: 'all',
                name_en: 'All Videos',
                name_ja: 'すべての動画',
                icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>',
                display_order: 0,
                active: true
            },
            {
                collection_id: 'tokyo-ramen',
                name_en: 'Tokyo Ramen',
                name_ja: '東京ラーメン',
                icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2l1.578 4.657A2 2 0 0 0 6.487 8H17.513a2 2 0 0 0 1.909-1.343L21 2"/><path d="M12 12v6"/><path d="M8 22h8"/><path d="M12 18c-4.418 0-8-2.239-8-5V8h16v5c0 2.761-3.582 5-8 5z"/></svg>',
                display_order: 1,
                active: true
            },
            {
                collection_id: 'best-pizza',
                name_en: 'Best Pizza',
                name_ja: '最高のピザ',
                icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 19.5h20L12 2z"/><circle cx="10" cy="13" r="1"/><circle cx="14" cy="11" r="1"/><circle cx="12" cy="16" r="1"/></svg>',
                display_order: 2,
                active: true
            },
            {
                collection_id: 'trending',
                name_en: 'Trending Now',
                name_ja: 'トレンド',
                icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
                display_order: 3,
                active: true
            }
        ]
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
