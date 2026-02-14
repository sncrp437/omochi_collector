/**
 * Main application logic for Instagram Reels-style video player
 */

// Bookmark SVG icons
const BOOKMARK_OUTLINE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
const BOOKMARK_FILLED = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

// Progressive rendering configuration
const INITIAL_BATCH_SIZE = 10;      // Show first 10 immediately
const SUBSEQUENT_BATCH_SIZE = 20;   // Render 20 at a time in background
const BATCH_DELAY_MS = 50;          // Delay between batches

// Global state
let videos = [];
let currentVideoIndex = 0;

// YouTube IFrame Player API state
var _ytPlayers = {};       // Map of video index -> YT.Player instance
var _ytApiReady = false;   // Set to true when onYouTubeIframeAPIReady fires
var _ytPendingLoads = [];  // Indices queued before API was ready
var _ytPlayerReady = {};   // Map of video index -> boolean (true when onReady has fired)

// Progressive render state
let _renderQueue = [];
let _renderIndex = 0;
let _pendingRenderFrame = null;

// Viewport-aware iframe management
let _globalObserver = null;
const IFRAME_LOAD_DISTANCE = 2;   // Load iframes within ±2 of current
const IFRAME_UNLOAD_DISTANCE = 3; // Unload iframes beyond ±3 of current
let _currentVisibleIndex = 0;

/**
 * YouTube IFrame API ready callback (called automatically by the API)
 * Must be global (window-level) for the API to find it.
 */
function onYouTubeIframeAPIReady() {
    _ytApiReady = true;
    // Process any players queued before API loaded
    _ytPendingLoads.forEach(function(index) {
        _loadPlayer(index);
    });
    _ytPendingLoads = [];

    // Ensure currently visible video gets loaded (may not have been in pending queue)
    _manageIframeLifecycle(_currentVisibleIndex);
}

/**
 * Sanitize caption text for safe HTML rendering
 * - Converts newlines to <br> tags
 * - Allows only safe HTML tags: <br>, <b>, <strong>, <i>, <em>, <u>
 * - Escapes all other HTML to prevent XSS
 * @param {string} text - Raw caption text
 * @returns {string} Sanitized HTML string
 */
function sanitizeCaption(text) {
    if (!text) return '';

    // First, escape HTML entities to prevent XSS
    let safe = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // Convert newlines to <br>
    safe = safe.replace(/\n/g, '<br>');

    // Re-enable allowed tags (after escaping, they're now &lt;b&gt; etc.)
    // Allow: b, strong, i, em, u, br, p, h1-h6, ul, ol, li, span (no attributes)
    safe = safe.replace(/&lt;(\/?(b|strong|i|em|u|br|p|h[1-6]|ul|ol|li|span)\s*\/?)&gt;/gi, '<$1>');

    return safe;
}

/**
 * Initialize the application
 */
async function init() {
    try {
        // Initialize analytics (if enabled)
        if (typeof initAnalytics === 'function') {
            initAnalytics();
        }

        // Show loading indicator
        const loading = document.getElementById('loading');

        // Fetch video data
        const rawData = await fetchVideoData();

        // Parse videos
        videos = parseVideoData(rawData);

        if (videos.length === 0) {
            console.error('No valid video data found');
            loading.innerHTML = `<p>${t('noVideos')}</p>`;
            return;
        }

        // Initialize collections (if available)
        let filteredVideos = videos;
        if (typeof initCollections === 'function') {
            filteredVideos = await initCollections(videos, rawData.collections);
        }

        // Initialize branched filter (genre -> area -> video genre)
        if (typeof initBranchedFilter === 'function') {
            initBranchedFilter(videos);
        }

        // Render video feed with filtered videos
        renderVideoFeed(filteredVideos);

        // Hide loading indicator
        loading.classList.add('hidden');

        // Show welcome modal (if enabled)
        if (typeof showWelcomeModal === 'function') {
            const collectionName = typeof getCurrentCollectionName === 'function'
                ? getCurrentCollectionName()
                : (typeof t === 'function' ? t('allVideos') : 'All Videos');
            showWelcomeModal(collectionName);
        }

    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('loading').innerHTML = `<p>${t('errorLoading')}</p>`;
    }
}

/**
 * Re-initialize filter system without fetching data
 * Called when page is restored from BFCache or tab becomes visible
 */
function reinitFilters() {
    // Guard: Skip if videos not loaded yet
    if (!videos || videos.length === 0) {
        return;
    }

    // Re-initialize branched filter with existing video data
    if (typeof initBranchedFilter === 'function') {
        initBranchedFilter(videos);
    }
}

/**
 * Renders the video feed with videos using progressive batching
 * First batch renders immediately, remaining videos render in background
 * @param {Array} videosToRender - Array of videos to render (defaults to all videos)
 */
function renderVideoFeed(videosToRender) {
    const container = document.getElementById('reelsContainer');
    const loading = document.getElementById('loading');

    const videosArray = videosToRender || videos;

    if (videosArray.length === 0) {
        container.innerHTML = '<div class="empty-collection"><p>No videos available</p></div>';
        return;
    }

    // Cancel any pending background rendering
    _cancelPendingRender();

    // Store queue for progressive rendering
    _renderQueue = videosArray;
    _renderIndex = 0;

    // Render initial batch synchronously (fast first paint)
    const initialBatch = videosArray.slice(0, INITIAL_BATCH_SIZE);
    initialBatch.forEach((video, index) => {
        const reelItem = createReelItem(video, index);
        container.appendChild(reelItem);
    });
    _renderIndex = INITIAL_BATCH_SIZE;

    // Hide loading indicator after first batch
    if (loading) loading.classList.add('hidden');

    // Set up IntersectionObserver for initial batch
    setupIntersectionObserver();

    // Seed: load iframes near the first visible position
    _manageIframeLifecycle(0);

    // Fix: If YT API already loaded but our flag missed it (e.g. callback fired early)
    if (!_ytApiReady && window.YT && window.YT.Player) {
        _ytApiReady = true;
        _manageIframeLifecycle(0);
    }

    // Safety net: ensure the first video plays even if all timing-based attempts failed
    _ensureFirstVideoPlays();

    // Render remaining videos in background batches
    if (videosArray.length > INITIAL_BATCH_SIZE) {
        _renderRemainingBatches(container);
    }

    // Keep loading indicator in DOM but hidden
    if (loading && loading.parentNode !== container) {
        container.appendChild(loading);
    }
}

/**
 * Renders remaining videos in background batches using requestIdleCallback
 * @param {HTMLElement} container - The reels container element
 */
function _renderRemainingBatches(container) {
    if (_renderIndex >= _renderQueue.length) {
        _pendingRenderFrame = null;
        return;
    }

    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleRender = window.requestIdleCallback ||
        ((cb) => setTimeout(cb, BATCH_DELAY_MS));

    _pendingRenderFrame = scheduleRender(() => {
        // Guard: check if render was cancelled
        if (_pendingRenderFrame === null) return;

        const endIndex = Math.min(_renderIndex + SUBSEQUENT_BATCH_SIZE, _renderQueue.length);
        const fragment = document.createDocumentFragment();

        for (let i = _renderIndex; i < endIndex; i++) {
            const reelItem = createReelItem(_renderQueue[i], i);
            fragment.appendChild(reelItem);
        }

        container.appendChild(fragment);
        _renderIndex = endIndex;

        // Re-setup observer to include new items
        setupIntersectionObserver();

        // Continue with next batch
        _renderRemainingBatches(container);
    });
}

/**
 * Cancels any pending background rendering
 * Called before filter changes or page navigation
 */
function _cancelPendingRender() {
    if (_pendingRenderFrame !== null) {
        if (window.cancelIdleCallback) {
            window.cancelIdleCallback(_pendingRenderFrame);
        } else {
            clearTimeout(_pendingRenderFrame);
        }
        _pendingRenderFrame = null;
    }
    _renderQueue = [];
    _renderIndex = 0;

    // Destroy all active YouTube players before removing DOM
    Object.keys(_ytPlayers).forEach(function(key) {
        try { _ytPlayers[key].destroy(); } catch (e) { /* ignore */ }
    });
    _ytPlayers = {};
    _ytPlayerReady = {};
    _ytPendingLoads = [];

    // Disconnect observer since DOM elements are about to be removed
    if (_globalObserver) {
        _globalObserver.disconnect();
    }
}

var _ensurePlayTimeout = null;

/**
 * Safety net: retry playing the visible video after a delay
 * Catches all edge cases where initial play attempts were lost due to timing
 */
function _ensureFirstVideoPlays() {
    // Clear any previous timeout (e.g. from filter re-render)
    if (_ensurePlayTimeout) {
        clearTimeout(_ensurePlayTimeout);
    }

    _ensurePlayTimeout = setTimeout(function() {
        _ensurePlayTimeout = null;
        var idx = _currentVisibleIndex;
        var player = _ytPlayers[idx];

        if (!player || !_ytPlayerReady[idx]) return;

        // Check if player is already playing
        try {
            var state = player.getPlayerState();
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            if (state !== 1 && state !== 3) {
                // Not playing and not buffering — try to play
                if (_isIndexVisible(idx)) {
                    player.playVideo();
                }
            }
        } catch (e) {
            // Player may have been destroyed
        }
    }, 1500);
}

/**
 * Creates a single reel item element
 * @param {Object} video - Video data object
 * @param {number} index - Video index
 * @returns {HTMLElement} Reel item element
 */
function createReelItem(video, index) {
    const reelItem = document.createElement('div');
    reelItem.className = 'reel-item';
    reelItem.dataset.index = index;

    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';

    // Create aspect ratio wrapper (9:16 for YouTube, flexible for X)
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    if (video.video_type === 'x') {
        videoWrapper.classList.add('x-embed');
    }

    // Create iframe based on video type
    const iframe = createVideoIframe(video, index);
    videoWrapper.appendChild(iframe);

    // Set YouTube thumbnail as placeholder background (visible while iframe loads)
    if (video.video_type !== 'x' && video.url) {
        const ytId = _extractYouTubeId(video.url);
        if (ytId) {
            videoWrapper.style.backgroundImage = `url(https://img.youtube.com/vi/${ytId}/sddefault.jpg)`;
        }
    }

    videoContainer.appendChild(videoWrapper);

    // Create overlay with caption and collect button
    const overlay = createOverlay(video);

    // Append to reel item
    reelItem.appendChild(videoContainer);
    reelItem.appendChild(overlay);

    return reelItem;
}

/**
 * Creates video iframe element (YouTube or X/Twitter)
 * @param {Object} video - Video data object
 * @param {number} index - Video index
 * @returns {HTMLIFrameElement} iframe element
 */
function createVideoIframe(video, index) {
    if (video.video_type === 'x') {
        return createXEmbed(video, index);
    }
    return createYouTubeIframe(video, index);
}

/**
 * Creates YouTube Shorts placeholder div for YT.Player API
 * The div will be replaced by an iframe when _loadPlayer() is called
 */
function createYouTubeIframe(video, index) {
    var div = document.createElement('div');
    div.id = 'yt-player-' + index;
    div.dataset.videoIndex = index;
    div.dataset.videoType = 'youtube';
    div.dataset.videoId = _extractYouTubeId(video.url) || '';
    return div;
}

/**
 * Extract YouTube video ID from embed URL
 * @param {string} url - URL like "https://www.youtube.com/embed/VIDEO_ID"
 * @returns {string|null} Video ID or null
 */
function _extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/youtube\.com\/embed\/([^?/]+)/);
    return match ? match[1] : null;
}

/**
 * Creates X/Twitter tweet embed iframe
 * Uses platform.twitter.com direct iframe (no widgets.js needed)
 */
function createXEmbed(video, index) {
    const iframe = document.createElement('iframe');
    iframe.dataset.videoIndex = index;
    iframe.dataset.videoType = 'x';

    iframe.src = `https://platform.twitter.com/embed/Tweet.html?dnt=true&id=${video.tweet_id}&theme=dark`;
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    iframe.title = video.caption || 'X Post';
    iframe.style.border = 'none';

    return iframe;
}

/**
 * Creates overlay with caption and collect button
 * @param {Object} video - Video data object
 * @returns {HTMLElement} Overlay element
 */
function createOverlay(video) {
    const overlay = document.createElement('div');
    overlay.className = 'reel-overlay';

    // Caption - store both languages as data attributes
    const caption = document.createElement('p');
    caption.className = 'reel-caption';
    caption.dataset.captionEn = video.caption_en || '';
    caption.dataset.captionJa = video.caption_ja || video.caption_en || '';

    // Set initial caption based on current language (with formatting support)
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    const rawCaption = currentLang === 'ja' ? caption.dataset.captionJa : caption.dataset.captionEn;
    caption.innerHTML = sanitizeCaption(rawCaption);

    // Check if caption is truncated after render, add expand/collapse behavior
    requestAnimationFrame(() => {
        if (caption.scrollHeight > caption.clientHeight) {
            caption.classList.add('truncated');
        }
    });

    caption.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = caption.classList.contains('expanded');
        if (isExpanded) {
            caption.classList.remove('expanded');
            caption.classList.add('truncated');
            overlay.classList.remove('caption-expanded');
        } else {
            caption.classList.remove('truncated');
            caption.classList.add('expanded');
            overlay.classList.add('caption-expanded');
        }
    });

    // Collect button
    const collectBtn = document.createElement('button');
    collectBtn.className = 'collect-btn';
    collectBtn.dataset.videoId = video.id || '';

    // Check if already collected locally
    if (typeof isLocallyCollected === 'function' && video.id && isLocallyCollected(video.id)) {
        collectBtn.innerHTML = BOOKMARK_FILLED;
        collectBtn.classList.add('collected');
    } else {
        collectBtn.innerHTML = BOOKMARK_OUTLINE;
    }

    collectBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // Log analytics event
        if (typeof logCollectEvent === 'function' && video.id) {
            logCollectEvent(video.id);
        }

        // Save to localStorage immediately (no auth required)
        if (typeof saveLocalCollection === 'function') {
            var isNew = saveLocalCollection(video);
            if (isNew) {
                collectBtn.innerHTML = BOOKMARK_FILLED;
                collectBtn.classList.add('collected');
                // Meta Pixel: track collect as AddToWishlist
                if (typeof fbq === 'function') {
                    var fbName = (typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'en' && video.venue_name_en) ? video.venue_name_en : (video.venue_name || video.caption || video.id);
                    fbq('track', 'AddToWishlist', { content_name: fbName });
                }
                // Set default visit status to "want_to_go"
                var venueId = video.venue_uuid || video.id;
                if (typeof initDefaultVisitStatus === 'function') {
                    initDefaultVisitStatus(venueId);
                }
                // Show folder prompt modal instead of toast
                showFolderPrompt(venueId);
            } else {
                if (typeof showToast === 'function') {
                    showToast(t('alreadyCollected'));
                }
                return;
            }
        }

        // If logged in and has venue_uuid, also sync to API silently
        if (video.venue_uuid && typeof isLoggedIn === 'function' && isLoggedIn()) {
            try {
                await apiPost('/api/stocked-venues/', { venue: video.venue_uuid });
                if (typeof markLocalCollectionSynced === 'function') {
                    markLocalCollectionSynced(video.id);
                }
            } catch (err) {
                console.warn('API sync failed, will retry later:', err);
            }
        }
    });

    overlay.appendChild(caption);
    overlay.appendChild(collectBtn);

    return overlay;
}

/**
 * Sets up Intersection Observer for autoplay functionality
 * Uses a single global observer to prevent memory leaks
 */
function setupIntersectionObserver() {
    // Disconnect previous observer to prevent leak
    if (_globalObserver) {
        _globalObserver.disconnect();
    }

    const options = {
        root: null,
        rootMargin: '0px',
        threshold: [0.5, 0.75, 1.0] // Multiple thresholds for better visibility tracking
    };

    _globalObserver = new IntersectionObserver(function(entries) {
        // Find the most visible intersecting entry in this batch
        var bestEntry = null;
        var bestRatio = 0;

        entries.forEach(function(entry) {
            if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
                bestRatio = entry.intersectionRatio;
                bestEntry = entry;
            }
            // Pause videos leaving viewport
            if (!entry.isIntersecting) {
                var idx = parseInt(entry.target.dataset.index, 10);
                pauseVideo(idx);
            }
        });

        // Only act on the most visible entry to avoid _currentVisibleIndex thrashing
        if (bestEntry) {
            var index = parseInt(bestEntry.target.dataset.index, 10);
            _currentVisibleIndex = index;

            // Load/unload players around current position
            _manageIframeLifecycle(index);

            // Play current video (no-op for X embeds since no player exists)
            playVideo(index);

            // Log video view (if analytics enabled)
            if (typeof logVideoView === 'function' && videos[index] && videos[index].id) {
                logVideoView(videos[index].id);
            }
        }
    }, options);

    // Observe all reel items
    const reelItems = document.querySelectorAll('.reel-item');
    reelItems.forEach(item => _globalObserver.observe(item));
}

/**
 * Check if a reel-item at the given index is visible in the viewport
 * Uses getBoundingClientRect for reliable visibility detection
 * (more robust than comparing _currentVisibleIndex which can be stale)
 * @param {number} index - Video index
 * @returns {boolean} true if the item is substantially visible
 */
function _isIndexVisible(index) {
    var el = document.querySelector('.reel-item[data-index="' + index + '"]');
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var viewHeight = window.innerHeight;
    // Consider visible if at least 50% of viewport is covered
    return rect.top < viewHeight * 0.75 && rect.bottom > viewHeight * 0.25;
}

/**
 * Load/unload YouTube players around the current viewport position
 * @param {number} currentIndex - Index of the currently visible reel-item
 */
function _manageIframeLifecycle(currentIndex) {
    var reelItems = document.querySelectorAll('.reel-item');

    reelItems.forEach(function(item) {
        var itemIndex = parseInt(item.dataset.index, 10);
        var distance = Math.abs(itemIndex - currentIndex);

        // Find the YouTube placeholder/iframe element
        var ytEl = item.querySelector('[data-video-type="youtube"]');
        if (!ytEl) return;

        if (distance <= IFRAME_LOAD_DISTANCE) {
            _loadPlayer(itemIndex);
        } else if (distance > IFRAME_UNLOAD_DISTANCE) {
            _unloadPlayer(itemIndex);
        }
        // Items between LOAD and UNLOAD distance are left as-is (prevents thrashing)
    });
}

/**
 * Create a YT.Player for the given video index
 * @param {number} index - Video index
 */
function _loadPlayer(index) {
    // Already loaded
    if (_ytPlayers[index]) return;

    // API not ready yet - queue for later
    if (!_ytApiReady) {
        if (_ytPendingLoads.indexOf(index) === -1) {
            _ytPendingLoads.push(index);
        }
        return;
    }

    // Find the placeholder div
    var container = document.getElementById('yt-player-' + index);
    if (!container || container.tagName === 'IFRAME') return;

    var videoId = container.dataset.videoId;
    if (!videoId) return;

    _ytPlayers[index] = new YT.Player('yt-player-' + index, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
            autoplay: 0,
            mute: 1,
            loop: 1,
            controls: 1,
            modestbranding: 1,
            playsinline: 1,
            playlist: videoId,
            rel: 0,
            enablejsapi: 1
        },
        events: {
            onReady: function(event) {
                _ytPlayerReady[index] = true;
                // Set allow attribute for autoplay permission
                var iframe = event.target.getIframe();
                if (iframe) {
                    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                }
                // Autoplay if this video is actually visible in viewport
                // (uses getBoundingClientRect instead of _currentVisibleIndex which can be stale)
                if (_isIndexVisible(index)) {
                    event.target.playVideo();
                }
            },
            onStateChange: function(event) {
                if (event.data === YT.PlayerState.ENDED) {
                    event.target.playVideo();
                }
                // Retry if player got cued but should be playing (YT sometimes cues instead of playing)
                if (event.data === YT.PlayerState.CUED && _isIndexVisible(index)) {
                    event.target.playVideo();
                }
            },
            onError: function(event) {
                console.warn('YT Player error for index ' + index + ':', event.data);
            }
        }
    });
}

/**
 * Destroy a YT.Player to free memory when scrolling far away
 * @param {number} index - Video index
 */
function _unloadPlayer(index) {
    var player = _ytPlayers[index];
    if (!player) return;

    // Get the iframe before destroying (to find parent wrapper)
    var iframe = null;
    try { iframe = player.getIframe(); } catch (e) { /* ignore */ }
    var wrapper = iframe ? iframe.parentElement : null;

    try {
        player.destroy();
    } catch (e) {
        console.warn('Error destroying player ' + index + ':', e);
    }
    delete _ytPlayers[index];
    delete _ytPlayerReady[index];

    // Recreate placeholder div so player can be re-created on scroll-back
    if (wrapper && !document.getElementById('yt-player-' + index)) {
        var div = document.createElement('div');
        div.id = 'yt-player-' + index;
        div.dataset.videoIndex = index;
        div.dataset.videoType = 'youtube';
        var sourceVideo = videos[index] || _renderQueue[index];
        if (sourceVideo) {
            div.dataset.videoId = _extractYouTubeId(sourceVideo.url) || '';
        }
        wrapper.appendChild(div);
    }
}

/**
 * Play video at the given index (uses YT.Player API; no-op for X embeds)
 * @param {number} index - Video index
 */
function playVideo(index) {
    var player = _ytPlayers[index];
    if (!player || !_ytPlayerReady[index]) return; // Skip if player not ready yet; onReady will handle it
    try {
        player.playVideo();
    } catch (e) {
        console.warn('Error playing video ' + index + ':', e);
    }
}

/**
 * Pause video at the given index (uses YT.Player API; no-op for X embeds)
 * @param {number} index - Video index
 */
function pauseVideo(index) {
    var player = _ytPlayers[index];
    if (!player || !_ytPlayerReady[index]) return;
    try {
        player.pauseVideo();
    } catch (e) {
        console.warn('Error pausing video ' + index + ':', e);
    }
}

/**
 * Handle scroll events (optional - for additional functionality)
 */
function handleScroll() {
    const container = document.getElementById('reelsContainer');
    const scrollPosition = container.scrollTop;
    const windowHeight = window.innerHeight;

    // Calculate current video index based on scroll position
    currentVideoIndex = Math.round(scrollPosition / windowHeight);
}

/**
 * Save a venue to the user's collection via API
 * @param {Object} video - Video data with venue_uuid
 * @param {HTMLElement} buttonEl - The collect button element
 */
async function collectVenue(video, buttonEl) {
    if (!video.venue_uuid) return;

    try {
        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.textContent = '...';
        }

        const response = await apiPost('/api/stocked-venues/', { venue: video.venue_uuid });

        if (response.ok || response.status === 200 || response.status === 201) {
            if (buttonEl) {
                buttonEl.innerHTML = BOOKMARK_FILLED;
                buttonEl.classList.add('collected');
            }
        } else {
            const errData = await response.json().catch(() => ({}));
            console.error('Collect failed:', errData);
            if (buttonEl) {
                buttonEl.innerHTML = BOOKMARK_OUTLINE;
            }
        }
    } catch (err) {
        console.error('Collect error:', err);
        if (buttonEl) {
            buttonEl.innerHTML = BOOKMARK_OUTLINE;
        }
    } finally {
        if (buttonEl) {
            buttonEl.disabled = false;
        }
    }
}

// =============================================================================
// Folder Prompt Modal (shown after collecting a venue)
// =============================================================================

var _folderPromptVenueId = null;
var _folderPromptSelectedColor = null;

/**
 * Show folder prompt modal after collecting a venue
 */
async function showFolderPrompt(venueId) {
    var modal = document.getElementById('folderPromptModal');
    if (!modal) {
        // Fallback to toast if modal not found
        if (typeof showToast === 'function') {
            showToast(t('collectSaved'));
        }
        return;
    }

    _folderPromptVenueId = venueId;

    // Load user folders
    var folders = [];
    if (typeof fetchFolders === 'function') {
        folders = await fetchFolders();
    } else if (typeof getLocalFolders === 'function') {
        folders = getLocalFolders();
    }

    // Render folder pills
    var pillsContainer = document.getElementById('folderPromptPills');
    if (pillsContainer) {
        pillsContainer.innerHTML = '';

        folders.forEach(function(folder) {
            var pill = document.createElement('button');
            pill.className = 'folder-prompt-pill';
            pill.innerHTML = '<span class="folder-prompt-pill-dot" style="background:' + folder.color + ';"></span>' +
                             _escapeHtmlSimple(folder.name);
            pill.addEventListener('click', function() {
                _selectFolderInPrompt(folder.id);
            });
            pillsContainer.appendChild(pill);
        });

        // "+ New" pill
        var newPill = document.createElement('button');
        newPill.className = 'folder-prompt-pill folder-prompt-pill-new';
        newPill.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ' +
                           t('newFolder');
        newPill.addEventListener('click', function() {
            _showFolderCreateInPrompt();
        });
        pillsContainer.appendChild(newPill);
    }

    // Setup color buttons
    _setupFolderPromptColors();

    // Hide create section initially
    var createSection = document.getElementById('folderPromptCreate');
    if (createSection) createSection.classList.remove('active');

    // Clear input
    var nameInput = document.getElementById('folderPromptCreateInput');
    if (nameInput) nameInput.value = '';

    // Setup event handlers
    var overlay = document.getElementById('folderPromptOverlay');
    var skipBtn = document.getElementById('folderPromptSkip');
    var saveBtn = document.getElementById('folderPromptCreateSave');

    if (overlay) {
        overlay.onclick = function() {
            _closeFolderPrompt();
        };
    }

    if (skipBtn) {
        skipBtn.onclick = function() {
            _closeFolderPrompt();
            if (typeof showToast === 'function') {
                showToast(t('collectSaved'));
            }
        };
    }

    if (saveBtn) {
        saveBtn.onclick = function() {
            _createFolderFromPrompt();
        };
    }

    // Show modal
    modal.classList.add('active');
}

/**
 * Setup color buttons in folder prompt
 */
function _setupFolderPromptColors() {
    var container = document.getElementById('folderPromptCreateColors');
    if (!container || typeof FOLDER_COLORS === 'undefined') return;

    container.innerHTML = '';
    _folderPromptSelectedColor = FOLDER_COLORS[0];

    FOLDER_COLORS.forEach(function(color, idx) {
        var btn = document.createElement('button');
        btn.className = 'folder-prompt-create-color' + (idx === 0 ? ' active' : '');
        btn.style.background = color;
        btn.addEventListener('click', function() {
            container.querySelectorAll('.folder-prompt-create-color').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            _folderPromptSelectedColor = color;
        });
        container.appendChild(btn);
    });
}

/**
 * Show create folder section in prompt
 */
function _showFolderCreateInPrompt() {
    var createSection = document.getElementById('folderPromptCreate');
    var nameInput = document.getElementById('folderPromptCreateInput');
    if (createSection) {
        createSection.classList.add('active');
    }
    if (nameInput) {
        nameInput.focus();
    }
}

/**
 * Create folder from prompt and assign venue to it
 */
async function _createFolderFromPrompt() {
    var nameInput = document.getElementById('folderPromptCreateInput');
    var name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
        if (nameInput) nameInput.focus();
        return;
    }

    // Save folder
    if (typeof saveFolder === 'function') {
        var folder = await saveFolder(null, name, _folderPromptSelectedColor);
        if (folder && folder.id) {
            // Assign venue to this folder
            await _selectFolderInPrompt(folder.id);
            return;
        }
    }

    _closeFolderPrompt();
}

/**
 * Select a folder for the venue and close prompt
 */
async function _selectFolderInPrompt(folderId) {
    if (_folderPromptVenueId && folderId) {
        if (typeof setVenueFolder === 'function') {
            await setVenueFolder(_folderPromptVenueId, folderId);
        }

        // Show confirmation
        if (typeof showToast === 'function') {
            var folders = typeof getLocalFolders === 'function' ? getLocalFolders() : [];
            var folder = folders.find(function(f) { return f.id === folderId; });
            if (folder) {
                showToast(t('savedToFolder').replace('{folder}', folder.name));
            } else {
                showToast(t('collectSaved'));
            }
        }
    }

    _closeFolderPrompt();
}

/**
 * Close folder prompt modal
 */
function _closeFolderPrompt() {
    var modal = document.getElementById('folderPromptModal');
    if (modal) modal.classList.remove('active');
    _folderPromptVenueId = null;
}

/**
 * Simple HTML escape for folder names
 */
function _escapeHtmlSimple(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// =============================================================================
// Swipe Hint (mobile onboarding - shown once per session)
// =============================================================================

var _swipeHintTimeout = null;

/**
 * Show the swipe hint if not already shown this session
 */
function showSwipeHint() {
    // Only show once per browser session
    if (sessionStorage.getItem('swipeHintShown')) {
        return;
    }

    var hint = document.getElementById('swipeHint');
    if (!hint) return;

    // Mark as shown
    sessionStorage.setItem('swipeHintShown', 'true');

    // Show the hint with a slight delay (let videos render first)
    setTimeout(function() {
        hint.classList.add('visible');
    }, 800);

    // Auto-hide after 5 seconds
    _swipeHintTimeout = setTimeout(function() {
        hideSwipeHint();
    }, 5000);

    // Hide on scroll
    var container = document.getElementById('reelsContainer');
    if (container) {
        container.addEventListener('scroll', hideSwipeHint, { once: true });
    }
}

/**
 * Hide the swipe hint
 */
function hideSwipeHint() {
    var hint = document.getElementById('swipeHint');
    if (hint) {
        hint.classList.remove('visible');
        hint.classList.add('hidden');
    }

    // Clear timeout if still pending
    if (_swipeHintTimeout) {
        clearTimeout(_swipeHintTimeout);
        _swipeHintTimeout = null;
    }
}

// =============================================================================
// Settings Drawer
// =============================================================================

/**
 * Initialize settings drawer functionality
 */
function initSettingsDrawer() {
    var gearBtn = document.getElementById('settingsGearBtn');
    var drawer = document.getElementById('settingsDrawer');
    var overlay = document.getElementById('settingsDrawerOverlay');
    var closeBtn = document.getElementById('settingsDrawerClose');
    var logoutSection = document.getElementById('settingsLogoutSection');
    var logoutBtn = document.getElementById('settingsLogoutBtn');

    if (!gearBtn || !drawer || !overlay) return;

    // Open drawer on gear click
    gearBtn.addEventListener('click', function() {
        openSettingsDrawer();
    });

    // Close drawer on overlay click
    overlay.addEventListener('click', function() {
        closeSettingsDrawer();
    });

    // Close drawer on close button click
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeSettingsDrawer();
        });
    }

    // Show/hide logout section based on auth state
    if (logoutSection && typeof isLoggedIn === 'function') {
        logoutSection.style.display = isLoggedIn() ? 'block' : 'none';
    }

    // Setup logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (typeof logout === 'function') {
                logout();
            }
            closeSettingsDrawer();
            // Update logout section visibility
            if (logoutSection) {
                logoutSection.style.display = 'none';
            }
        });
    }
}

/**
 * Open settings drawer
 */
function openSettingsDrawer() {
    var drawer = document.getElementById('settingsDrawer');
    var overlay = document.getElementById('settingsDrawerOverlay');
    var logoutSection = document.getElementById('settingsLogoutSection');

    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');

    // Update logout visibility when opening
    if (logoutSection && typeof isLoggedIn === 'function') {
        logoutSection.style.display = isLoggedIn() ? 'block' : 'none';
    }
}

/**
 * Close settings drawer
 */
function closeSettingsDrawer() {
    var drawer = document.getElementById('settingsDrawer');
    var overlay = document.getElementById('settingsDrawerOverlay');

    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Initialize content type toggle (YouTube/X/All)
 */
function initContentTypeToggle() {
    var buttons = document.querySelectorAll('.content-btn');
    if (!buttons.length) return;

    // Restore saved selection from localStorage
    var saved = localStorage.getItem('selectedContentType') || 'all';

    // Update button states
    buttons.forEach(function(btn) {
        if (btn.dataset.content === saved) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }

        // Add click handler
        btn.addEventListener('click', function() {
            var contentType = btn.dataset.content;

            // Update active states
            buttons.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');

            // Update filter and re-render feed
            if (typeof setContentTypeFilter === 'function') {
                setContentTypeFilter(contentType);
            }

            // Re-filter and render the feed
            if (typeof filterAndRerenderFeed === 'function') {
                var currentCollection = typeof selectedCollection !== 'undefined'
                    ? selectedCollection
                    : (localStorage.getItem('selectedCollection') || 'all');
                filterAndRerenderFeed(currentCollection);
            }
        });
    });

    // Sync initial filter state
    if (typeof setContentTypeFilter === 'function' && saved !== 'all') {
        setContentTypeFilter(saved);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        init();
        initSettingsDrawer();
        initContentTypeToggle();
    });
} else {
    init();
    initSettingsDrawer();
    initContentTypeToggle();
}

// Handle page restore from BFCache (back/forward navigation)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        // Page was restored from BFCache
        reinitFilters();
    }
});

// Handle tab visibility changes
var _lastVisibleTime = Date.now();
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // Only reinit if hidden for more than 1 second (avoid rapid tab switches)
        var hiddenDuration = Date.now() - _lastVisibleTime;
        if (hiddenDuration > 1000) {
            reinitFilters();
        }
        // Resume the current video when tab becomes visible
        playVideo(_currentVisibleIndex);
    } else {
        _lastVisibleTime = Date.now();
        // Pause the current video when tab is hidden
        pauseVideo(_currentVisibleIndex);
    }
});
