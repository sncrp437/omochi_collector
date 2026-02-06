/**
 * Branched Filter Controller
 * Cascading filter: Genre -> Area -> Video Genre (Collection)
 * Replaces the old category selector, location selector, and collection selector.
 */

var CATEGORIES = [
    {
        id: 'food',
        nameKey: 'categoryFood',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2l1.578 4.657A2 2 0 0 0 6.487 8H17.513a2 2 0 0 0 1.909-1.343L21 2"/><path d="M12 12v6"/><path d="M8 22h8"/><path d="M12 18c-4.418 0-8-2.239-8-5V8h16v5c0 2.761-3.582 5-8 5z"/></svg>',
        comingSoon: false
    },
    {
        id: 'nightlife',
        nameKey: 'categoryNightlife',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M12 17v5"/><path d="M17 2H7l5 10 5-10z"/><line x1="7" y1="2" x2="17" y2="2"/></svg>',
        comingSoon: true
    },
    {
        id: 'entertainment',
        nameKey: 'categoryEntertainment',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
        comingSoon: true
    },
    {
        id: 'shopping',
        nameKey: 'categoryShopping',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
        comingSoon: true
    },
    {
        id: 'beauty',
        nameKey: 'categoryBeauty',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"/><path d="M9 3.17V4a3 3 0 0 0-3 3v5c0 1.66.68 3.16 1.76 4.24L9 17.5V19h6v-1.5l1.24-1.26A5.98 5.98 0 0 0 18 12V7a3 3 0 0 0-3-3V3.17"/><path d="M12 1v2"/></svg>',
        comingSoon: true
    },
    {
        id: 'travel',
        nameKey: 'categoryTravel',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        comingSoon: true
    }
];

var _bfStep = 'genre'; // 'genre' | 'area' | 'collection'
var _bfSelectedGenre = null;
var _bfSelectedArea = null;
var _bfVideosData = [];

var BACK_ARROW_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';

/**
 * Initialize branched filter
 * @param {Array} videosData - All loaded video objects
 */
function initBranchedFilter(videosData) {
    _bfVideosData = videosData;

    // Note: selectedCategory is now used by collections.js for 3-tier filtering
    // We keep bf_genre separate as UI state

    // Restore state
    var storedGenre = localStorage.getItem('bf_genre');
    var storedArea = localStorage.getItem('bf_area');

    if (storedGenre) {
        var cat = CATEGORIES.find(function(c) { return c.id === storedGenre && !c.comingSoon; });
        if (cat) {
            _bfSelectedGenre = storedGenre;

            // Restore category filter in collections.js
            if (typeof setCategoryFilter === 'function') {
                setCategoryFilter(storedGenre);
            }

            if (storedArea) {
                // Verify area still exists in data
                var stations = getUniqueStations(_bfVideosData);
                if (stations[storedArea]) {
                    _bfSelectedArea = storedArea;
                    setLocationFilter(storedArea);
                    _bfStep = 'collection';
                    _renderCollectionStep();
                } else {
                    localStorage.removeItem('bf_area');
                    _bfStep = 'area';
                    _renderAreaStep();
                }
            } else {
                // Check if there are any stations; if not, skip to collection
                var stationCheck = getUniqueStations(_bfVideosData);
                if (Object.keys(stationCheck).length === 0) {
                    _bfStep = 'collection';
                    _renderCollectionStep();
                } else {
                    _bfStep = 'area';
                    _renderAreaStep();
                }
            }
            return;
        }
    }

    // Default: show genre pills
    _bfStep = 'genre';
    _renderGenrePills();
}

/**
 * Render genre pills with pulse animation
 */
function _renderGenrePills() {
    var genreEl = document.getElementById('filterStepGenre');
    var areaEl = document.getElementById('filterStepArea');
    var collEl = document.getElementById('filterStepCollection');
    if (!genreEl) return;

    genreEl.style.display = '';
    if (areaEl) areaEl.style.display = 'none';
    if (collEl) collEl.style.display = 'none';

    genreEl.innerHTML = '';
    var row = document.createElement('div');
    row.className = 'filter-step-row';

    CATEGORIES.forEach(function(category) {
        var pill = document.createElement('button');
        pill.className = 'genre-pill genre-pill-pulse';
        if (category.comingSoon) pill.classList.add('coming-soon');

        var label = typeof t === 'function' ? t(category.nameKey) : category.id;
        pill.innerHTML =
            '<span class="genre-pill-icon">' + category.icon + '</span>' +
            '<span class="genre-pill-label" data-i18n="' + category.nameKey + '">' + label + '</span>';

        pill.addEventListener('click', function() {
            if (category.comingSoon) {
                var msg = typeof t === 'function' ? t('categoryComingSoon') : 'Coming soon!';
                if (typeof showToast === 'function') showToast(msg);
                return;
            }
            _selectGenre(category.id);
        });

        row.appendChild(pill);
    });

    genreEl.appendChild(row);
}

/**
 * Select a genre and transition to area step
 */
function _selectGenre(genreId) {
    _bfSelectedGenre = genreId;
    _bfSelectedArea = null;
    localStorage.setItem('bf_genre', genreId);
    localStorage.removeItem('bf_area');

    // Set category filter in collections.js (TIER 1 filtering)
    if (typeof setCategoryFilter === 'function') {
        setCategoryFilter(genreId);
    }

    // Reset location filter
    setLocationFilter('all');

    if (typeof logAnalyticsEvent === 'function') {
        logAnalyticsEvent('genre_select', genreId);
    }

    // Check if areas exist for this category
    var stations = getUniqueStations(_bfVideosData);
    if (Object.keys(stations).length === 0) {
        // No areas available, skip to collection step
        _bfStep = 'collection';
        _renderCollectionStep();
    } else {
        _bfStep = 'area';
        _renderAreaStep();
    }

    // Re-filter feed (genre selected, no area yet = show all for this genre)
    refilterFeed();
}

/**
 * Render area step: combined pill (genre) + area pills
 */
function _renderAreaStep() {
    var genreEl = document.getElementById('filterStepGenre');
    var areaEl = document.getElementById('filterStepArea');
    var collEl = document.getElementById('filterStepCollection');
    if (!areaEl) return;

    if (genreEl) genreEl.style.display = 'none';
    areaEl.style.display = '';
    if (collEl) collEl.style.display = 'none';

    areaEl.innerHTML = '';
    var row = document.createElement('div');
    row.className = 'filter-step-row';

    // Combined pill (genre only)
    var combinedPill = _createCombinedPill();
    row.appendChild(combinedPill);

    // Area pills
    var stations = getUniqueStations(_bfVideosData);
    var stationNames = Object.keys(stations).sort();

    stationNames.forEach(function(station) {
        var pill = document.createElement('button');
        pill.className = 'area-pill';
        pill.innerHTML =
            '<span class="area-pill-name">' + station + '</span>' +
            '<span class="area-pill-count">(' + stations[station] + ')</span>';

        pill.addEventListener('click', function() {
            _selectArea(station);
        });

        row.appendChild(pill);
    });

    areaEl.appendChild(row);
}

/**
 * Select an area and transition to collection step
 */
function _selectArea(station) {
    _bfSelectedArea = station;
    localStorage.setItem('bf_area', station);

    // Set location filter
    setLocationFilter(station);

    if (typeof logAnalyticsEvent === 'function') {
        logAnalyticsEvent('area_select', station);
    }

    _bfStep = 'collection';
    _renderCollectionStep();

    // Re-filter feed with area applied
    refilterFeed();
}

/**
 * Render collection step: combined pill (genre x area) + video genre pills
 */
function _renderCollectionStep() {
    var genreEl = document.getElementById('filterStepGenre');
    var areaEl = document.getElementById('filterStepArea');
    var collEl = document.getElementById('filterStepCollection');
    if (!collEl) return;

    if (genreEl) genreEl.style.display = 'none';
    if (areaEl) areaEl.style.display = 'none';
    collEl.style.display = '';

    collEl.innerHTML = '';

    // First row: combined pill
    var topRow = document.createElement('div');
    topRow.className = 'filter-step-row';
    var combinedPill = _createCombinedPill();
    topRow.appendChild(combinedPill);
    collEl.appendChild(topRow);

    // Second row: collection/video genre pills
    var pillsRow = document.createElement('div');
    pillsRow.className = 'collection-pills-row';
    renderCollectionPillsInContainer(pillsRow);
    collEl.appendChild(pillsRow);
}

/**
 * Create the combined status pill (tappable to go back)
 */
function _createCombinedPill() {
    var pill = document.createElement('button');
    pill.className = 'combined-pill';

    var genreCat = CATEGORIES.find(function(c) { return c.id === _bfSelectedGenre; });
    var genreLabel = '';
    if (genreCat) {
        genreLabel = typeof t === 'function' ? t(genreCat.nameKey) : genreCat.id;
    }

    var label = genreLabel;
    if (_bfSelectedArea) {
        var separator = typeof t === 'function' ? t('combinedPillSeparator') : ' x ';
        label = genreLabel + separator + _bfSelectedArea;
    }

    pill.innerHTML =
        '<span class="combined-pill-back">' + BACK_ARROW_SVG + '</span>' +
        '<span class="combined-pill-label">' + label + '</span>';

    pill.addEventListener('click', function() {
        _goBackOneStep();
    });

    return pill;
}

/**
 * Go back one step in the filter cascade
 */
function _goBackOneStep() {
    if (_bfStep === 'collection') {
        // Go back to area selection (keep genre)
        _bfSelectedArea = null;
        localStorage.removeItem('bf_area');
        setLocationFilter('all');

        // Reset collection selection
        selectedCollection = 'all';
        localStorage.setItem('selectedCollection', 'all');

        // Check if areas exist
        var stations = getUniqueStations(_bfVideosData);
        if (Object.keys(stations).length === 0) {
            // No areas, go back to genre
            _bfSelectedGenre = null;
            localStorage.removeItem('bf_genre');
            // Reset category filter
            if (typeof setCategoryFilter === 'function') {
                setCategoryFilter('all');
            }
            _bfStep = 'genre';
            _renderGenrePills();
        } else {
            _bfStep = 'area';
            _renderAreaStep();
        }

        refilterFeed();
    } else if (_bfStep === 'area') {
        // Go back to genre selection
        _bfSelectedGenre = null;
        _bfSelectedArea = null;
        localStorage.removeItem('bf_genre');
        localStorage.removeItem('bf_area');
        setLocationFilter('all');

        // Reset category filter
        if (typeof setCategoryFilter === 'function') {
            setCategoryFilter('all');
        }

        _bfStep = 'genre';
        _renderGenrePills();

        refilterFeed();
    }
}

/**
 * Update pill labels on language change
 */
function updateBranchedFilterNames() {
    if (_bfStep === 'genre') {
        _renderGenrePills();
    } else if (_bfStep === 'area') {
        _renderAreaStep();
    } else if (_bfStep === 'collection') {
        _renderCollectionStep();
    }
}
