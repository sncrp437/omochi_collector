/**
 * Collections Module
 * Handles 3-tier filtering (category, location, genre/collection) and feed re-rendering.
 * UI rendering is delegated to the branched filter controller (categories.js).
 */

let allVideos = [];
let allCollections = [];
let selectedCollection = 'all';
let selectedLocation = 'all';
let selectedCategory = 'all'; // 'food', 'nightlife', 'entertainment', etc.
let selectedContentType = 'all'; // 'all', 'youtube', 'x'

// Filter indices for fast lookups
var _categoryIndex = {};  // { 'food': [video1, video2], 'nightlife': [video3] }
var _genreIndex = {};     // { 'italian': [video1], 'yakiniku': [video2] }
var _stationIndex = {};   // { 'shibuya': [video1, video3] }

/**
 * Initialize collections system (no UI rendering)
 * @param {Array} videosData - Array of video objects
 * @param {Array} collectionsData - Array of collection metadata
 * @returns {Array} Filtered videos based on stored selection
 */
async function initCollections(videosData, collectionsData) {
    allVideos = videosData;
    allCollections = parseCollections(collectionsData);

    // Build filter indices for fast lookups
    _buildFilterIndices(videosData);

    // Restore last selected filters from localStorage
    selectedCollection = localStorage.getItem('selectedCollection') || 'all';
    selectedCategory = localStorage.getItem('selectedCategory') || 'all';
    selectedContentType = localStorage.getItem('selectedContentType') || 'all';

    // Return filtered videos
    return filterVideosByCollection(selectedCollection);
}

/**
 * Parse and sort collections data
 */
function parseCollections(data) {
    if (!data || data.length === 0) return [];
    return data
        .filter(c => c.active !== false && c.active !== 'FALSE')
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
}

/**
 * Build filter indices for O(1) lookups
 */
function _buildFilterIndices(videos) {
    _categoryIndex = {};
    _genreIndex = {};
    _stationIndex = {};

    videos.forEach(function(video) {
        // Index by category
        if (video.category) {
            var cat = video.category.toLowerCase();
            if (!_categoryIndex[cat]) _categoryIndex[cat] = [];
            _categoryIndex[cat].push(video);
        }

        // Index by genre (comma-separated)
        if (video.genre) {
            video.genre.split(',').forEach(function(g) {
                var key = g.trim().toLowerCase();
                if (key) {
                    if (!_genreIndex[key]) _genreIndex[key] = [];
                    _genreIndex[key].push(video);
                }
            });
        }

        // Index by collection (comma-separated)
        if (video.collection) {
            video.collection.split(',').forEach(function(c) {
                var key = c.trim().toLowerCase();
                if (key) {
                    if (!_genreIndex[key]) _genreIndex[key] = [];
                    _genreIndex[key].push(video);
                }
            });
        }

        // Index by station
        if (video.nearest_station) {
            var station = video.nearest_station;
            if (!_stationIndex[station]) _stationIndex[station] = [];
            _stationIndex[station].push(video);
        }
    });
}

/**
 * Set category filter (called by branched filter Step 1)
 * @param {string} category - 'food', 'nightlife', 'entertainment', or 'all'
 */
function setCategoryFilter(category) {
    selectedCategory = category;
    localStorage.setItem('selectedCategory', category);
}

/**
 * Get current category filter
 */
function getCategoryFilter() {
    return selectedCategory;
}

/**
 * Set content type filter (YouTube, X, or All)
 * @param {string} contentType - 'all', 'youtube', or 'x'
 */
function setContentTypeFilter(contentType) {
    selectedContentType = contentType;
    localStorage.setItem('selectedContentType', contentType);
}

/**
 * Get current content type filter
 */
function getContentTypeFilter() {
    return selectedContentType;
}

/**
 * Render sub-genre pills into a provided container element
 * Uses unique genres/collections from filtered videos
 * @param {HTMLElement} containerEl - Target container
 */
function renderCollectionPillsInContainer(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    var subGenres = getUniqueSubGenres();

    // Add "All" pill first
    var allPill = document.createElement('button');
    allPill.className = 'collection-pill' + (selectedCollection === 'all' ? ' active' : '');
    allPill.dataset.collectionId = 'all';
    var allLabel = typeof t === 'function' ? t('allVideos') : 'All';
    allPill.innerHTML = '<span class="collection-pill-name">' + allLabel + '</span>';
    allPill.addEventListener('click', function() { selectCollection('all'); });
    containerEl.appendChild(allPill);

    // Add sub-genre pills
    subGenres.forEach(function(subGenre) {
        var pill = document.createElement('button');
        pill.className = 'collection-pill' + (selectedCollection === subGenre.id ? ' active' : '');
        if (subGenre.isCollection) pill.classList.add('special-collection');
        pill.dataset.collectionId = subGenre.id;

        pill.innerHTML =
            '<span class="collection-pill-name">' + subGenre.name + '</span>' +
            '<span class="collection-pill-count">(' + subGenre.count + ')</span>';

        pill.addEventListener('click', function() { selectCollection(subGenre.id); });
        containerEl.appendChild(pill);
    });
}

/**
 * Create a collection pill button
 */
function createCollectionPill(collection) {
    var pill = document.createElement('button');
    pill.className = 'collection-pill';
    pill.dataset.collectionId = collection.collection_id;

    var currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    var name = currentLang === 'ja' ? (collection.name_ja || collection.name_en) : collection.name_en;
    var icon = collection.icon || '';
    var count = getCollectionVideoCount(collection.collection_id);

    pill.innerHTML =
        (icon ? '<span class="collection-pill-icon">' + icon + '</span>' : '') +
        '<span class="collection-pill-name">' + name + '</span>' +
        '<span class="collection-pill-count">(' + count + ')</span>';

    pill.addEventListener('click', function() { selectCollection(collection.collection_id); });
    return pill;
}

/**
 * Select a collection and filter feed
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
    document.querySelectorAll('.collection-pill').forEach(function(pill) {
        if (pill.dataset.collectionId === selectedCollection) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
}

/**
 * Filter videos by content type, category, location, and collection/genre
 * Implements full 4-tier filtering
 */
function filterVideosByCollection(collectionId) {
    var result = allVideos;

    // TIER 0: Filter by content type (YouTube, X, or All)
    if (selectedContentType !== 'all') {
        result = result.filter(function(video) {
            return video.video_type === selectedContentType;
        });
    }

    // TIER 1: Filter by category (Food, Nightlife, Entertainment)
    if (selectedCategory !== 'all') {
        var catVideos = _categoryIndex[selectedCategory.toLowerCase()];
        if (catVideos) {
            // Apply category filter to current result (respecting content type)
            var catSet = new Set(catVideos);
            result = result.filter(function(video) {
                return catSet.has(video);
            });
        } else {
            result = []; // No videos in this category
        }
    }

    // TIER 2: Filter by location (nearest_station)
    if (selectedLocation !== 'all') {
        result = result.filter(function(video) {
            return video.nearest_station === selectedLocation;
        });
    }

    // TIER 3: Filter by collection/genre (Italian, Yakiniku, etc.)
    if (collectionId !== 'all') {
        var searchId = collectionId.toLowerCase();
        result = result.filter(function(video) {
            // Check genre field
            if (video.genre) {
                var genres = video.genre.split(',').map(function(g) {
                    return g.trim().toLowerCase();
                });
                if (genres.includes(searchId)) return true;
            }
            // Check collection field
            if (video.collection) {
                var collections = video.collection.split(',').map(function(c) {
                    return c.trim().toLowerCase();
                });
                if (collections.includes(searchId)) return true;
            }
            return false;
        });
    }

    return result;
}

/**
 * Filter and re-render the video feed with progressive rendering
 */
function filterAndRerenderFeed(collectionId) {
    var container = document.getElementById('reelsContainer');
    if (!container) return;

    // Cancel any pending progressive render
    if (typeof _cancelPendingRender === 'function') {
        _cancelPendingRender();
    }

    container.style.opacity = '0';
    container.style.transition = 'opacity 0.3s ease';

    setTimeout(function() {
        var videos = container.querySelectorAll('.reel-item');
        videos.forEach(function(v) { v.remove(); });

        var filteredVideos = filterVideosByCollection(collectionId);

        if (filteredVideos.length === 0) {
            showEmptyState(container);
        } else {
            // Use progressive renderVideoFeed from app.js
            if (typeof renderVideoFeed === 'function') {
                renderVideoFeed(filteredVideos);
            } else {
                // Fallback for compatibility
                filteredVideos.forEach(function(video, index) {
                    if (typeof createReelItem === 'function') {
                        var reelItem = createReelItem(video, index);
                        container.appendChild(reelItem);
                    }
                });

                if (typeof setupIntersectionObserver === 'function') {
                    setupIntersectionObserver();
                }
            }
        }

        container.style.opacity = '1';
        container.scrollTo(0, 0);
    }, 300);
}

/**
 * Get video count for a collection
 */
function getCollectionVideoCount(collectionId) {
    return filterVideosByCollection(collectionId).length;
}

/**
 * Get current collection display name
 */
function getCurrentCollectionName() {
    var collection = allCollections.find(function(c) { return c.collection_id === selectedCollection; });
    if (!collection) {
        return typeof t === 'function' ? t('allVideos') : 'All Videos';
    }
    var currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    return currentLang === 'ja' ? (collection.name_ja || collection.name_en) : collection.name_en;
}

/**
 * Show empty collection state
 */
function showEmptyState(container) {
    var emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-collection';
    var message = typeof t === 'function' ? t('noVideosInCollection') : 'No videos in this collection';
    emptyDiv.innerHTML = '<p>' + message + '</p>';
    container.appendChild(emptyDiv);
}

/**
 * Update collection pill names when language changes
 */
function updateCollectionNames() {
    allCollections.forEach(function(collection) {
        var pill = document.querySelector('.collection-pill[data-collection-id="' + collection.collection_id + '"]');
        if (!pill) return;

        var currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
        var name = currentLang === 'ja' ? (collection.name_ja || collection.name_en) : collection.name_en;

        var nameElement = pill.querySelector('.collection-pill-name');
        if (nameElement) {
            nameElement.textContent = name;
        }
    });
}

/**
 * Get unique stations from video data (respects category filter)
 * @param {Array} videosData - Array of video objects
 * @returns {Object} { stationName: count }
 */
function getUniqueStations(videosData) {
    var currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    var stations = {};

    // Filter by category first if set
    var filteredVideos = videosData;
    if (selectedCategory !== 'all') {
        filteredVideos = videosData.filter(function(v) {
            return v.category && v.category.toLowerCase() === selectedCategory.toLowerCase();
        });
    }

    // Filter by content type (YouTube, X, or All)
    if (selectedContentType !== 'all') {
        filteredVideos = filteredVideos.filter(function(v) {
            return v.video_type === selectedContentType;
        });
    }

    filteredVideos.forEach(function(video) {
        var station = (currentLang === 'en' && video.nearest_station_en)
            ? video.nearest_station_en
            : (video.nearest_station || '');
        if (station) {
            stations[station] = (stations[station] || 0) + 1;
        }
    });
    return stations;
}

/**
 * Get unique sub-genres from videos (respects category + location filters)
 * Combines genre and collection fields
 * @returns {Array} [{id: 'yakiniku', name: '焼肉', count: 2, isCollection: false}, ...]
 */
function getUniqueSubGenres() {
    var subGenres = {};

    // Get videos filtered by category + location (but not by genre/collection)
    var filteredVideos = allVideos;

    // Apply TIER 1: category filter
    if (selectedCategory !== 'all') {
        var catVideos = _categoryIndex[selectedCategory.toLowerCase()];
        filteredVideos = catVideos || [];
    }

    // Apply TIER 0: content type filter
    if (selectedContentType !== 'all') {
        filteredVideos = filteredVideos.filter(function(v) {
            return v.video_type === selectedContentType;
        });
    }

    // Apply TIER 2: location filter
    if (selectedLocation !== 'all') {
        filteredVideos = filteredVideos.filter(function(v) {
            return v.nearest_station === selectedLocation;
        });
    }

    // Extract from genre field (Column F)
    filteredVideos.forEach(function(video) {
        if (video.genre) {
            video.genre.split(',').forEach(function(g) {
                var key = g.trim().toLowerCase();
                var displayName = g.trim();
                if (key) {
                    if (!subGenres[key]) {
                        subGenres[key] = { id: key, name: displayName, count: 0, isCollection: false };
                    }
                    subGenres[key].count++;
                }
            });
        }

        // Extract from collection field (Column K)
        if (video.collection) {
            video.collection.split(',').forEach(function(c) {
                var key = c.trim().toLowerCase();
                var displayName = c.trim();
                if (key) {
                    if (!subGenres[key]) {
                        subGenres[key] = { id: key, name: displayName, count: 0, isCollection: true };
                    }
                    subGenres[key].count++;
                }
            });
        }
    });

    // Sort: collections first, then by count descending
    return Object.values(subGenres).sort(function(a, b) {
        if (a.isCollection !== b.isCollection) return a.isCollection ? -1 : 1;
        return b.count - a.count;
    });
}

/**
 * Set location filter without rendering UI
 * @param {string} station - Station name or 'all'
 */
function setLocationFilter(station) {
    selectedLocation = station;
    localStorage.setItem('selectedLocation', station);
}

/**
 * Re-filter feed with current filters (called by branched filter)
 */
function refilterFeed() {
    filterAndRerenderFeed(selectedCollection);
}
