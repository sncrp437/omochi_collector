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

    // Create aspect ratio wrapper (9:16 for YouTube, flexible for X)
    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    if (video.video_type === 'x') {
        videoWrapper.classList.add('x-embed');
    }

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
 * Creates YouTube Shorts iframe element
 */
function createYouTubeIframe(video, index) {
    const iframe = document.createElement('iframe');
    iframe.dataset.videoIndex = index;
    iframe.dataset.videoType = 'youtube';

    iframe.src = `${video.url}?enablejsapi=1&mute=1&loop=1&controls=1&modestbranding=1&playsinline=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = video.caption || 'YouTube Short';

    return iframe;
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
                collectBtn.innerHTML = BOOKMARK_FILLED;
                collectBtn.classList.add('collected');
                // Meta Pixel: track collect as AddToWishlist
                if (typeof fbq === 'function') {
                    fbq('track', 'AddToWishlist', { content_name: video.venue_name || video.caption || video.id });
                }
                // Show folder prompt modal instead of toast
                var venueId = video.venue_uuid || video.id;
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
 * Play video (works for YouTube iframes; no-op for X embeds)
 * @param {HTMLIFrameElement} iframe - Video iframe element
 */
function playVideo(iframe) {
    try {
        if (iframe.dataset.videoType === 'x') return;
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    } catch (error) {
        console.error('Error playing video:', error);
    }
}

/**
 * Pause video (works for YouTube iframes; no-op for X embeds)
 * @param {HTMLIFrameElement} iframe - Video iframe element
 */
function pauseVideo(iframe) {
    try {
        if (iframe.dataset.videoType === 'x') return;
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
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
    } else {
        _lastVisibleTime = Date.now();
    }
});
