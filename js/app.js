/**
 * Main application logic for Instagram Reels-style video player
 */

// Bookmark SVG icons
const BOOKMARK_OUTLINE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
const BOOKMARK_FILLED = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';

// Global state
let videos = [];
let currentVideoIndex = 0;
let players = [];

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
        if (rawData.collections && typeof initCollections === 'function') {
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

        // Set up intersection observer for autoplay
        setupIntersectionObserver();

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
 * Renders the video feed with videos
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

    videosArray.forEach((video, index) => {
        const reelItem = createReelItem(video, index);
        container.appendChild(reelItem);
    });

    // Keep loading indicator in DOM but hidden
    if (loading && loading.parentNode !== container) {
        container.appendChild(loading);
    }
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

    // Create 9:16 aspect ratio wrapper
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';

    // Create iframe based on video type
    const iframe = createVideoIframe(video, index);
    videoWrapper.appendChild(iframe);
    videoContainer.appendChild(videoWrapper);

    // Create overlay with caption and collect button
    const overlay = createOverlay(video);

    // Append to reel item
    reelItem.appendChild(videoContainer);
    reelItem.appendChild(overlay);

    return reelItem;
}

/**
 * Creates YouTube Shorts iframe element
 * @param {Object} video - Video data object
 * @param {number} index - Video index
 * @returns {HTMLIFrameElement} iframe element
 */
function createVideoIframe(video, index) {
    const iframe = document.createElement('iframe');
    iframe.dataset.videoIndex = index;

    // YouTube Shorts embed with autoplay control via API
    iframe.src = `${video.url}?enablejsapi=1&mute=1&loop=1&controls=1&modestbranding=1&playsinline=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = video.caption || 'YouTube Short';

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

    // Set initial caption based on current language
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    caption.textContent = currentLang === 'ja' ? caption.dataset.captionJa : caption.dataset.captionEn;

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
                if (typeof showToast === 'function') {
                    showToast(t('collectSaved'));
                }
                collectBtn.innerHTML = BOOKMARK_FILLED;
                collectBtn.classList.add('collected');
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
 */
function setupIntersectionObserver() {
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // Video must be 50% visible
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const iframe = entry.target.querySelector('iframe');
            if (!iframe) return;

            if (entry.isIntersecting) {
                // Video is visible - play
                playVideo(iframe);

                // Log video view (if analytics enabled)
                const videoIndex = entry.target.dataset.index;
                if (typeof logVideoView === 'function' && videos[videoIndex] && videos[videoIndex].id) {
                    logVideoView(videos[videoIndex].id);
                }
            } else {
                // Video is not visible - pause
                pauseVideo(iframe);
            }
        });
    }, options);

    // Observe all reel items
    const reelItems = document.querySelectorAll('.reel-item');
    reelItems.forEach(item => observer.observe(item));
}

/**
 * Play video (works for YouTube iframes)
 * @param {HTMLIFrameElement} iframe - Video iframe element
 */
function playVideo(iframe) {
    try {
        // Send postMessage to YouTube iframe to play
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    } catch (error) {
        console.error('Error playing video:', error);
    }
}

/**
 * Pause video (works for YouTube iframes)
 * @param {HTMLIFrameElement} iframe - Video iframe element
 */
function pauseVideo(iframe) {
    try {
        // Send postMessage to YouTube iframe to pause
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    } catch (error) {
        console.error('Error pausing video:', error);
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
