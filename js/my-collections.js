// =============================================================================
// My Collections Page Logic - Dual source (localStorage + API)
// =============================================================================

// All merged collection items for filtering/sorting
var _allMergedItems = [];
var _activeGenreFilter = null;
var _activeLocationFilter = null;
var _aiSorted = false;

/**
 * Initialize the collections page
 */
async function initCollectionsPage() {
    var loadingEl = document.getElementById('collectionsLoading');
    var authRequiredEl = document.getElementById('collectionsAuthRequired');
    var emptyEl = document.getElementById('collectionsEmpty');
    var cardsListEl = document.getElementById('venueCardsList');

    // 1. Always load local collections
    var localItems = typeof getLocalCollections === 'function' ? getLocalCollections() : [];

    // 2. Check login status
    var loggedIn = typeof isLoggedIn === 'function' && isLoggedIn();

    // 3. If logged in, fetch API collections and sync
    var apiItems = [];
    if (loggedIn) {
        try {
            var response = await apiGet('/api/stocked-venues/');
            if (response.ok) {
                apiItems = await response.json();
            } else if (response.status === 401) {
                // Token expired - still show local items
                loggedIn = false;
            }
        } catch (err) {
            console.warn('Failed to fetch API collections:', err);
        }

        // Sync unsynced local items to API
        if (loggedIn && typeof syncLocalCollectionsToApi === 'function') {
            syncLocalCollectionsToApi();
        }
    }

    if (loadingEl) loadingEl.style.display = 'none';

    // 4. Merge and deduplicate
    _allMergedItems = _mergeCollections(localItems, apiItems);

    // If no items at all and not logged in, show auth-required or empty
    if (_allMergedItems.length === 0) {
        if (!loggedIn && localItems.length === 0) {
            // No local items, not logged in - show empty state with discover link
            if (emptyEl) emptyEl.style.display = 'block';
        } else {
            if (emptyEl) emptyEl.style.display = 'block';
        }
        return;
    }

    // 5. Render cards
    _renderAllCards();

    // 6. Build filter pills
    _renderGenreFilters();
    _renderLocationFilters();

    // 7. Show AI search bar
    var aiSection = document.getElementById('aiSearchSection');
    if (aiSection && _allMergedItems.length > 1) {
        aiSection.style.display = 'block';
        _setupAiSearch();
    }

    // 8. Show registration prompt if not logged in and has items
    if (!loggedIn && localItems.length > 0) {
        var banner = document.getElementById('registerPromptBanner');
        if (banner) {
            banner.style.display = 'block';
            var btn = document.getElementById('registerPromptBtn');
            if (btn) {
                btn.addEventListener('click', function() {
                    if (typeof showAuthModal === 'function') showAuthModal('register');
                });
            }
        }
    }

    // 9. Show logout button if logged in
    if (loggedIn) {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'block';
    }
}

/**
 * Merge local and API collections, deduplicating by venue_uuid
 */
function _mergeCollections(localItems, apiItems) {
    var merged = [];
    var seenVenueUuids = {};

    // API items take priority (richer data from venue_details)
    apiItems.forEach(function(apiItem) {
        merged.push({ source: 'api', data: apiItem });
        if (apiItem.venue) {
            seenVenueUuids[apiItem.venue] = true;
        }
    });

    // Add local items not already in API results
    localItems.forEach(function(localItem) {
        if (localItem.venue_uuid && seenVenueUuids[localItem.venue_uuid]) {
            return; // Already shown via API
        }
        merged.push({ source: 'local', data: localItem });
    });

    return merged;
}

/**
 * Get normalized venue info from a merged item (works for both sources)
 */
function _getVenueInfo(item) {
    var lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
    if (item.source === 'api') {
        var v = item.data.venue_details || {};
        return {
            name: (lang === 'en' && v.name_en) ? v.name_en : (v.name || 'Unknown Venue'),
            genre: (lang === 'en' && v.genre_en) ? v.genre_en : (v.genre || ''),
            nearest_station: (lang === 'en' && v.nearest_station_en) ? v.nearest_station_en : (v.nearest_station || ''),
            address: (lang === 'en' && v.address_en) ? v.address_en : (v.address || ''),
            logo: v.logo || null,
            website: v.website || null,
            description: v.description || '',
            opening_time: v.opening_time || '',
            closing_time: v.closing_time || ''
        };
    }
    // Local item
    var d = item.data;
    return {
        name: d.venue_name || (lang === 'ja' ? d.caption_ja : d.caption_en) || 'Saved Venue',
        genre: (lang === 'en' && d.genre_en) ? d.genre_en : (d.genre || ''),
        nearest_station: (lang === 'en' && d.nearest_station_en) ? d.nearest_station_en : (d.nearest_station || ''),
        address: d.address || '',
        logo: null,
        website: null,
        description: '',
        opening_time: '',
        closing_time: ''
    };
}

/**
 * Render all venue cards (respecting current filters)
 */
function _renderAllCards() {
    var cardsListEl = document.getElementById('venueCardsList');
    var emptyEl = document.getElementById('collectionsEmpty');
    if (!cardsListEl) return;

    cardsListEl.innerHTML = '';

    var filtered = _getFilteredItems();

    if (filtered.length === 0) {
        cardsListEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    cardsListEl.style.display = 'flex';

    filtered.forEach(function(item) {
        var card = _createUnifiedCard(item);
        cardsListEl.appendChild(card);
    });
}

/**
 * Get filtered items based on active genre and location filters
 */
function _getFilteredItems() {
    return _allMergedItems.filter(function(item) {
        var info = _getVenueInfo(item);

        if (_activeGenreFilter && info.genre !== _activeGenreFilter) {
            return false;
        }
        if (_activeLocationFilter && info.nearest_station !== _activeLocationFilter) {
            return false;
        }
        return true;
    });
}

/**
 * Create a unified venue card (works for both API and local items)
 */
function _createUnifiedCard(item) {
    var info = _getVenueInfo(item);

    var card = document.createElement('div');
    card.className = 'venue-card';

    // Store source info for removal
    if (item.source === 'api') {
        card.dataset.stockedVenueId = item.data.id;
    } else {
        card.dataset.localId = item.data.id;
    }

    // Logo
    var logoDiv = document.createElement('div');
    logoDiv.className = 'venue-card-logo';
    if (info.logo) {
        var img = document.createElement('img');
        img.src = info.logo;
        img.alt = info.name;
        img.onerror = function() {
            this.style.display = 'none';
            var placeholder = document.createElement('span');
            placeholder.className = 'venue-card-logo-placeholder';
            placeholder.textContent = '\uD83C\uDF7D\uFE0F';
            this.parentNode.appendChild(placeholder);
        };
        logoDiv.appendChild(img);
    } else {
        var placeholder = document.createElement('span');
        placeholder.className = 'venue-card-logo-placeholder';
        placeholder.textContent = '\uD83C\uDF7D\uFE0F';
        logoDiv.appendChild(placeholder);
    }

    // Info section
    var infoDiv = document.createElement('div');
    infoDiv.className = 'venue-card-info';

    var nameEl = document.createElement('div');
    nameEl.className = 'venue-card-name';
    nameEl.textContent = info.name;
    infoDiv.appendChild(nameEl);

    if (info.genre) {
        var genreEl = document.createElement('div');
        genreEl.className = 'venue-card-genre';
        genreEl.textContent = info.genre;
        infoDiv.appendChild(genreEl);
    }

    if (info.nearest_station) {
        var stationEl = document.createElement('div');
        stationEl.className = 'venue-card-station';
        stationEl.textContent = '\uD83D\uDCCD ' + info.nearest_station;
        infoDiv.appendChild(stationEl);
    }

    if (info.address) {
        var addressEl = document.createElement('div');
        addressEl.className = 'venue-card-address';
        addressEl.textContent = info.address;
        infoDiv.appendChild(addressEl);
    }

    // Remove button
    var removeBtn = document.createElement('button');
    removeBtn.className = 'venue-card-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = t('removeVenue') || 'Remove';
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        _removeItem(item, card);
    });

    card.appendChild(logoDiv);
    card.appendChild(infoDiv);
    card.appendChild(removeBtn);

    // Click to visit website (API items only)
    if (info.website) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            window.open(info.website, '_blank');
        });
    }

    return card;
}

/**
 * Remove an item (handles both API and local)
 */
async function _removeItem(item, cardElement) {
    if (item.source === 'api') {
        try {
            var response = await apiDelete('/api/stocked-venues/' + item.data.id + '/');
            if (!response.ok && response.status !== 204) {
                console.error('Failed to remove venue:', response.status);
                return;
            }
        } catch (err) {
            console.error('Remove venue error:', err);
            return;
        }
    } else {
        if (typeof removeLocalCollection === 'function') {
            removeLocalCollection(item.data.id);
        }
    }

    // Remove from merged array
    var idx = _allMergedItems.indexOf(item);
    if (idx > -1) _allMergedItems.splice(idx, 1);

    // Animate removal
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'translateX(100%)';
    setTimeout(function() {
        cardElement.remove();
        _checkEmptyState();
        // Refresh filters in case a genre/location is now empty
        _renderGenreFilters();
        _renderLocationFilters();
    }, 300);
}

/**
 * Check if the list is now empty
 */
function _checkEmptyState() {
    var cardsList = document.getElementById('venueCardsList');
    if (cardsList && cardsList.children.length === 0) {
        cardsList.style.display = 'none';
        var emptyEl = document.getElementById('collectionsEmpty');
        if (emptyEl) emptyEl.style.display = 'block';
    }
}

// =============================================================================
// Filter Pills
// =============================================================================

/**
 * Build genre filter pills from current collection data
 */
function _renderGenreFilters() {
    var container = document.getElementById('genreFilterPills');
    var section = document.getElementById('genreFilterSection');
    if (!container || !section) return;

    var genres = {};
    _allMergedItems.forEach(function(item) {
        var info = _getVenueInfo(item);
        if (info.genre) {
            genres[info.genre] = (genres[info.genre] || 0) + 1;
        }
    });

    var genreKeys = Object.keys(genres);
    if (genreKeys.length < 2) {
        section.style.display = 'none';
        _activeGenreFilter = null;
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    // "All" pill
    var allPill = document.createElement('button');
    allPill.className = 'filter-pill' + (!_activeGenreFilter ? ' active' : '');
    allPill.textContent = t('allGenres');
    allPill.addEventListener('click', function() {
        _activeGenreFilter = null;
        localStorage.setItem('collectionsGenreFilter', '');
        _renderGenreFilters();
        _renderAllCards();
    });
    container.appendChild(allPill);

    genreKeys.sort().forEach(function(genre) {
        var pill = document.createElement('button');
        pill.className = 'filter-pill' + (_activeGenreFilter === genre ? ' active' : '');
        pill.textContent = genre;
        pill.addEventListener('click', function() {
            _activeGenreFilter = genre;
            localStorage.setItem('collectionsGenreFilter', genre);
            _renderGenreFilters();
            _renderAllCards();
        });
        container.appendChild(pill);
    });
}

/**
 * Build location filter pills from current collection data
 */
function _renderLocationFilters() {
    var container = document.getElementById('locationFilterPills');
    var section = document.getElementById('locationFilterSection');
    if (!container || !section) return;

    var locations = {};
    _allMergedItems.forEach(function(item) {
        var info = _getVenueInfo(item);
        if (info.nearest_station) {
            locations[info.nearest_station] = (locations[info.nearest_station] || 0) + 1;
        }
    });

    var locationKeys = Object.keys(locations);
    if (locationKeys.length < 2) {
        section.style.display = 'none';
        _activeLocationFilter = null;
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    // "All" pill
    var allPill = document.createElement('button');
    allPill.className = 'filter-pill' + (!_activeLocationFilter ? ' active' : '');
    allPill.textContent = t('allLocations');
    allPill.addEventListener('click', function() {
        _activeLocationFilter = null;
        localStorage.setItem('collectionsLocationFilter', '');
        _renderLocationFilters();
        _renderAllCards();
    });
    container.appendChild(allPill);

    locationKeys.sort().forEach(function(location) {
        var pill = document.createElement('button');
        pill.className = 'filter-pill' + (_activeLocationFilter === location ? ' active' : '');
        pill.textContent = location;
        pill.addEventListener('click', function() {
            _activeLocationFilter = location;
            localStorage.setItem('collectionsLocationFilter', location);
            _renderLocationFilters();
            _renderAllCards();
        });
        container.appendChild(pill);
    });
}

// =============================================================================
// AI Smart Sort
// =============================================================================

function _setupAiSearch() {
    var searchBtn = document.getElementById('aiSearchBtn');
    var searchInput = document.getElementById('aiSearchInput');
    var resetBtn = document.getElementById('aiResetBtn');
    if (!searchBtn || !searchInput) return;

    searchBtn.addEventListener('click', function() {
        _performAiSort();
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            _performAiSort();
        }
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            _aiSorted = false;
            resetBtn.style.display = 'none';
            // Re-render in original order
            _renderAllCards();
        });
    }
}

async function _performAiSort() {
    var searchInput = document.getElementById('aiSearchInput');
    var searchBtn = document.getElementById('aiSearchBtn');
    var resetBtn = document.getElementById('aiResetBtn');
    if (!searchInput || !searchInput.value.trim()) return;

    var query = searchInput.value.trim();

    // Check AI availability
    if (typeof aiSortCollections !== 'function' || typeof isAiSortAvailable !== 'function' || !isAiSortAvailable()) {
        if (typeof showToast === 'function') {
            showToast(t('aiUnavailable'));
        }
        return;
    }

    // Show loading state
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.classList.add('loading');
    }

    // Build venue metadata for AI
    var filtered = _getFilteredItems();
    var venues = filtered.map(function(item) {
        return _getVenueInfo(item);
    });

    try {
        var sortedIndices = await aiSortCollections(query, venues);

        if (sortedIndices && sortedIndices.length > 0) {
            // Reorder the filtered items
            var reordered = sortedIndices.map(function(idx) {
                return filtered[idx];
            }).filter(Boolean);

            // Re-render cards in AI order
            var cardsListEl = document.getElementById('venueCardsList');
            if (cardsListEl) {
                cardsListEl.innerHTML = '';
                cardsListEl.style.display = 'flex';
                reordered.forEach(function(item, i) {
                    var card = _createUnifiedCard(item);
                    // Add AI badge to top results
                    if (i < 3) {
                        var badge = document.createElement('span');
                        badge.className = 'ai-badge';
                        badge.textContent = 'AI';
                        var nameEl = card.querySelector('.venue-card-name');
                        if (nameEl) nameEl.appendChild(badge);
                    }
                    cardsListEl.appendChild(card);
                });
            }

            _aiSorted = true;
            if (resetBtn) resetBtn.style.display = 'block';
        } else {
            if (typeof showToast === 'function') {
                showToast(t('aiUnavailable'));
            }
        }
    } catch (err) {
        console.error('AI sort failed:', err);
        if (typeof showToast === 'function') {
            showToast(t('aiUnavailable'));
        }
    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.classList.remove('loading');
        }
    }
}

// =============================================================================
// Login Button + Post-Auth Callback
// =============================================================================

function _setupLoginButton() {
    var loginBtn = document.getElementById('collectionsLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            showAuthModal('login');
        });
    }
}

// Override the post-auth callback to sync and reload after login
var _originalHandlePendingCollect = typeof _handlePendingCollect === 'function' ? _handlePendingCollect : null;

function _handlePendingCollect() {
    // Sync local collections to API after login, then reload
    if (typeof syncLocalCollectionsToApi === 'function') {
        syncLocalCollectionsToApi().then(function() {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

// Restore persisted filters
(function() {
    var savedGenre = localStorage.getItem('collectionsGenreFilter');
    var savedLocation = localStorage.getItem('collectionsLocationFilter');
    if (savedGenre) _activeGenreFilter = savedGenre;
    if (savedLocation) _activeLocationFilter = savedLocation;
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollectionsPage);
} else {
    initCollectionsPage();
}
