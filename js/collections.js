/**
 * Collections Module
 * Handles Instagram-style collection filtering and UI
 */

let allVideos = [];
let allCollections = [];
let selectedCollection = 'all';

/**
 * Initialize collections system
 * @param {Array} videosData - Array of video objects
 * @param {Array} collectionsData - Array of collection metadata
 * @returns {Array} Filtered videos based on stored selection
 */
async function initCollections(videosData, collectionsData) {
    allVideos = videosData;
    allCollections = parseCollections(collectionsData);

    // Restore last selected collection from localStorage
    selectedCollection = localStorage.getItem('selectedCollection') || 'all';

    // Render collection selector UI
    renderCollectionSelector();

    // Return filtered videos
    return filterVideosByCollection(selectedCollection);
}

/**
 * Parse and sort collections data
 * @param {Array} data - Raw collections data from API
 * @returns {Array} Sorted and filtered collections
 */
function parseCollections(data) {
    if (!data || data.length === 0) return [];

    return data
        .filter(c => c.active !== false && c.active !== 'FALSE')
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

/**
 * Render collection selector pills
 */
function renderCollectionSelector() {
    const container = document.getElementById('collectionSelector');
    if (!container) return;

    container.innerHTML = '';

    allCollections.forEach(collection => {
        const pill = createCollectionPill(collection);
        container.appendChild(pill);
    });

    updateActiveCollection();
}

/**
 * Create a collection pill button
 * @param {Object} collection - Collection metadata
 * @returns {HTMLElement} Pill button element
 */
function createCollectionPill(collection) {
    const pill = document.createElement('button');
    pill.className = 'collection-pill';
    pill.dataset.collectionId = collection.collection_id;

    // Get current language for display name
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    const name = currentLang === 'ja' ? (collection.name_ja || collection.name_en) : collection.name_en;

    const icon = collection.icon || '';
    const count = getCollectionVideoCount(collection.collection_id);

    pill.innerHTML = `
        ${icon ? `<span class="collection-pill-icon">${icon}</span>` : ''}
        <span class="collection-pill-name">${name}</span>
        <span class="collection-pill-count">(${count})</span>
    `;

    pill.addEventListener('click', () => selectCollection(collection.collection_id));

    return pill;
}

/**
 * Select a collection and filter feed
 * @param {string} collectionId - ID of collection to select
 */
function selectCollection(collectionId) {
    selectedCollection = collectionId;
    localStorage.setItem('selectedCollection', collectionId);
    updateActiveCollection();
    filterAndRerenderFeed(collectionId);
}

/**
 * Update active state of collection pills
 */
function updateActiveCollection() {
    document.querySelectorAll('.collection-pill').forEach(pill => {
        if (pill.dataset.collectionId === selectedCollection) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
}

/**
 * Filter videos by collection ID
 * @param {string} collectionId - Collection ID to filter by
 * @returns {Array} Filtered videos
 */
function filterVideosByCollection(collectionId) {
    if (collectionId === 'all') return allVideos;

    return allVideos.filter(video => {
        if (!video.collection) return false;
        const collections = video.collection.split(',').map(c => c.trim());
        return collections.includes(collectionId);
    });
}

/**
 * Filter and re-render the video feed
 * @param {string} collectionId - Collection ID to show
 */
function filterAndRerenderFeed(collectionId) {
    const container = document.getElementById('reelsContainer');
    if (!container) return;

    // Fade out animation
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';

    setTimeout(() => {
        // Clear existing videos
        const videos = container.querySelectorAll('.reel-item');
        videos.forEach(v => v.remove());

        // Get filtered videos
        const filteredVideos = filterVideosByCollection(collectionId);

        // Handle empty state
        if (filteredVideos.length === 0) {
            showEmptyState(container);
        } else {
            // Re-render videos
            filteredVideos.forEach((video, index) => {
                if (typeof createReelItem === 'function') {
                    const reelItem = createReelItem(video, index);
                    container.appendChild(reelItem);
                }
            });

            // Re-setup intersection observer
            if (typeof setupIntersectionObserver === 'function') {
                setupIntersectionObserver();
            }
        }

        // Fade in and scroll to top
        container.style.opacity = '1';
        container.scrollTo(0, 0);
    }, 300);
}

/**
 * Get video count for a collection
 * @param {string} collectionId - Collection ID
 * @returns {number} Number of videos in collection
 */
function getCollectionVideoCount(collectionId) {
    return filterVideosByCollection(collectionId).length;
}

/**
 * Get current collection display name
 * @returns {string} Display name in current language
 */
function getCurrentCollectionName() {
    const collection = allCollections.find(c => c.collection_id === selectedCollection);
    if (!collection) {
        return typeof t === 'function' ? t('allVideos') : 'All Videos';
    }

    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    return currentLang === 'ja' ? (collection.name_ja || collection.name_en) : collection.name_en;
}

/**
 * Show empty collection state
 * @param {HTMLElement} container - Container element
 */
function showEmptyState(container) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-collection';
    const message = typeof t === 'function' ? t('noVideosInCollection') : 'No videos in this collection';
    emptyDiv.innerHTML = `<p>${message}</p>`;
    container.appendChild(emptyDiv);
}

/**
 * Update collection pill names when language changes
 */
function updateCollectionNames() {
    allCollections.forEach(collection => {
        const pill = document.querySelector(`.collection-pill[data-collection-id="${collection.collection_id}"]`);
        if (!pill) return;

        const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
        const name = currentLang === 'ja' ? (collection.name_ja || collection.name_en) : collection.name_en;

        const nameElement = pill.querySelector('.collection-pill-name');
        if (nameElement) {
            nameElement.textContent = name;
        }
    });
}
