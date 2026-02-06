// =============================================================================
// My Collections Page Logic - Dual source (localStorage + API)
// =============================================================================

// All merged collection items for filtering/sorting
var _allMergedItems = [];
var _activeGenreFilter = null;
var _activeLocationFilter = null;
var _activeFolderFilter = null; // null = All, 'uncategorized' = no folder, folder_id = specific folder
var _aiFilteredIndices = null;
var _aiFilterQuery = '';
var _userFolders = [];
var _venueFolders = {};
var _editingFolderId = null; // For folder edit modal

// =============================================================================
// Taxi / Rides Feature
// =============================================================================

// Taxi service definitions (only services with working deep links)
var TAXI_SERVICES = [
    {
        id: 'uber',
        name: 'Uber',
        icon: 'U',
        descKey: 'uberDesc',
        hasDeepLink: true,
        hasWebFallback: true
    },
    {
        id: 'go-taxi',
        name: 'GO',
        icon: 'GO',
        descKey: 'goTaxiDesc',
        hasDeepLink: true,
        hasWebFallback: true
    }
];

// Geocoding cache (session-level)
var _geocodeCache = {};

// Current taxi modal state
var _taxiModalAddress = '';
var _taxiModalVenueId = '';

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

    // 7. Show registration prompt if not logged in and has items
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

    // 8. Show logout button if logged in
    if (loggedIn) {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'block';
    }

    // 9. Load folders and setup drawer
    await _loadFolders();
    _setupFolderDrawer();
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
            description: (lang === 'en' && v.description_en) ? v.description_en : (v.description || ''),
            opening_time: v.opening_time || '',
            closing_time: v.closing_time || '',
            phone_number: v.phone_number || '',
            enable_reservation: !!v.enable_reservation,
            enable_eat_in: !!v.enable_eat_in,
            enable_take_out: !!v.enable_take_out,
            announcement: (lang === 'en' && v.announcement_en) ? v.announcement_en : (v.announcement || ''),
            venue_uuid: item.data.venue || null
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
        closing_time: '',
        phone_number: '',
        enable_reservation: false,
        enable_eat_in: false,
        enable_take_out: false,
        announcement: '',
        venue_uuid: d.venue_uuid || null,
        reservation_url: d.reservation_url || ''
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
 * Get filtered items based on active folder, genre, and location filters
 */
function _getFilteredItems() {
    // If AI filter is active, return only AI-matched items
    if (_aiFilteredIndices !== null) {
        return _aiFilteredIndices.map(function(idx) {
            return _allMergedItems[idx];
        }).filter(Boolean);
    }

    return _allMergedItems.filter(function(item) {
        var info = _getVenueInfo(item);
        var venueId = _getItemVenueId(item);

        // Folder filter
        if (_activeFolderFilter !== null) {
            var itemFolder = venueId ? _venueFolders[venueId] : null;
            if (_activeFolderFilter === 'uncategorized') {
                if (itemFolder) return false; // Has a folder, skip
            } else {
                if (itemFolder !== _activeFolderFilter) return false;
            }
        }

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
 * Get venue ID from merged item (for folder lookups)
 */
function _getItemVenueId(item) {
    if (item.source === 'api') {
        return item.data.venue || item.data.id || null;
    }
    return item.data.venue_uuid || item.data.video_id || item.data.id || null;
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
            placeholder.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2l1.578 4.657A2 2 0 0 0 6.487 8H17.513a2 2 0 0 0 1.909-1.343L21 2"/><path d="M12 12v6"/><path d="M8 22h8"/><path d="M12 18c-4.418 0-8-2.239-8-5V8h16v5c0 2.761-3.582 5-8 5z"/></svg>';
            this.parentNode.appendChild(placeholder);
        };
        logoDiv.appendChild(img);
    } else {
        var placeholder = document.createElement('span');
        placeholder.className = 'venue-card-logo-placeholder';
        placeholder.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2l1.578 4.657A2 2 0 0 0 6.487 8H17.513a2 2 0 0 0 1.909-1.343L21 2"/><path d="M12 12v6"/><path d="M8 22h8"/><path d="M12 18c-4.418 0-8-2.239-8-5V8h16v5c0 2.761-3.582 5-8 5z"/></svg>';
        logoDiv.appendChild(placeholder);
    }

    // Info section
    var infoDiv = document.createElement('div');
    infoDiv.className = 'venue-card-info';

    var nameRow = document.createElement('div');
    nameRow.className = 'venue-card-name-row';

    var nameEl = document.createElement('div');
    nameEl.className = 'venue-card-name';
    nameEl.textContent = info.name;
    nameRow.appendChild(nameEl);

    // Memo indicator (populated async)
    var memoIndicator = document.createElement('span');
    memoIndicator.className = 'venue-card-memo-indicator';
    memoIndicator.style.display = 'none';
    memoIndicator.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    memoIndicator.title = t('myNoteTitle');
    nameRow.appendChild(memoIndicator);

    infoDiv.appendChild(nameRow);

    // Async: check if user has a memo for this venue
    var venueIdForMemo = typeof getVenueIdFromItem === 'function' ? getVenueIdFromItem(item) : null;
    if (venueIdForMemo && typeof isLoggedIn === 'function' && isLoggedIn() &&
        typeof fetchMemo === 'function' && typeof isTagsApiConfigured === 'function' && isTagsApiConfigured()) {
        fetchMemo(venueIdForMemo).then(function(memo) {
            if (memo && memo.trim()) {
                memoIndicator.style.display = 'inline';
            }
        });
    }

    if (info.genre) {
        var genreEl = document.createElement('div');
        genreEl.className = 'venue-card-genre';
        genreEl.textContent = info.genre;
        infoDiv.appendChild(genreEl);
    }

    if (info.nearest_station) {
        var stationEl = document.createElement('div');
        stationEl.className = 'venue-card-station';
        stationEl.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + info.nearest_station;
        infoDiv.appendChild(stationEl);
    }

    if (info.address) {
        var addressEl = document.createElement('div');
        addressEl.className = 'venue-card-address';
        addressEl.textContent = info.address;
        infoDiv.appendChild(addressEl);
    }

    // Folder indicator
    var cardVenueId = _getItemVenueId(item);
    var cardFolderId = cardVenueId ? _venueFolders[cardVenueId] : null;
    if (cardFolderId) {
        var folder = _userFolders.find(function(f) { return f.id === cardFolderId; });
        if (folder) {
            var folderEl = document.createElement('div');
            folderEl.className = 'venue-card-folder';
            folderEl.innerHTML = '<span class="venue-card-folder-dot" style="background:' + folder.color + ';"></span>' +
                                 _escapeHtml(folder.name);
            infoDiv.appendChild(folderEl);
        }
    }

    // Tag badges placeholder (populated async)
    var tagsContainer = document.createElement('div');
    tagsContainer.className = 'venue-card-tags';
    infoDiv.appendChild(tagsContainer);

    // Async: load tag badges
    var venueId = typeof getVenueIdFromItem === 'function' ? getVenueIdFromItem(item) : null;
    if (venueId && typeof isTagsApiConfigured === 'function' && isTagsApiConfigured()) {
        fetchVenueTags(venueId).then(function(tagCounts) {
            var sorted = Object.keys(tagCounts).sort(function(a, b) {
                return tagCounts[b] - tagCounts[a];
            });
            sorted.slice(0, 3).forEach(function(tagKey) {
                var badge = document.createElement('span');
                badge.className = 'venue-card-tag-badge';
                badge.textContent = (typeof getTagIcon === 'function' ? getTagIcon(tagKey) : '') + ' ' +
                                    (typeof getTagLabel === 'function' ? getTagLabel(tagKey) : tagKey) +
                                    ' (' + tagCounts[tagKey] + ')';
                tagsContainer.appendChild(badge);
            });
        });
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

    // Click to open venue detail bottom sheet
    card.style.cursor = 'pointer';
    card.addEventListener('click', function() {
        _openVenueSheet(item);
    });

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
    var hasAi = _allMergedItems.length > 1 && typeof isAiSortAvailable === 'function';
    var aiActive = _aiFilteredIndices !== null;

    // Show section if 2+ genres or AI is available
    if (genreKeys.length < 2 && !hasAi) {
        section.style.display = 'none';
        _activeGenreFilter = null;
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    // "All" pill
    var allPill = document.createElement('button');
    allPill.className = 'filter-pill' + (!_activeGenreFilter && !aiActive ? ' active' : '');
    allPill.textContent = t('allGenres');
    allPill.addEventListener('click', function() {
        _clearAiFilter();
        _activeGenreFilter = null;
        localStorage.setItem('collectionsGenreFilter', '');
        _renderGenreFilters();
        _renderAllCards();
    });
    container.appendChild(allPill);

    // Genre pills
    genreKeys.sort().forEach(function(genre) {
        var pill = document.createElement('button');
        pill.className = 'filter-pill' + (!aiActive && _activeGenreFilter === genre ? ' active' : '');
        pill.textContent = genre;
        pill.addEventListener('click', function() {
            _clearAiFilter();
            _activeGenreFilter = genre;
            localStorage.setItem('collectionsGenreFilter', genre);
            _renderGenreFilters();
            _renderAllCards();
        });
        container.appendChild(pill);
    });

    // AI pill (at the end)
    if (hasAi) {
        if (aiActive) {
            // Show "AI: [query]" pill as active
            var aiPill = document.createElement('button');
            aiPill.className = 'filter-pill filter-pill-ai active';
            var label = t('aiFilterLabel') + ': ' + _aiFilterQuery;
            if (label.length > 25) label = label.substring(0, 22) + '...';
            aiPill.textContent = label;
            aiPill.addEventListener('click', function() {
                _clearAiFilter();
                _renderGenreFilters();
                _renderAllCards();
            });
            container.appendChild(aiPill);
        } else {
            // Show "AI" pill (inactive, tappable to open input)
            var aiPill = document.createElement('button');
            aiPill.className = 'filter-pill filter-pill-ai';
            aiPill.textContent = t('aiFilterLabel');
            aiPill.addEventListener('click', function() {
                _showAiInputInline();
            });
            container.appendChild(aiPill);
        }
    }
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

    var aiActive = _aiFilteredIndices !== null;

    // "All" pill
    var allPill = document.createElement('button');
    allPill.className = 'filter-pill' + (!_activeLocationFilter || aiActive ? ' active' : '');
    allPill.textContent = t('allLocations');
    allPill.addEventListener('click', function() {
        _clearAiFilter();
        _activeLocationFilter = null;
        localStorage.setItem('collectionsLocationFilter', '');
        _renderGenreFilters();
        _renderLocationFilters();
        _renderAllCards();
    });
    container.appendChild(allPill);

    locationKeys.sort().forEach(function(location) {
        var pill = document.createElement('button');
        pill.className = 'filter-pill' + (!aiActive && _activeLocationFilter === location ? ' active' : '');
        pill.textContent = location;
        pill.addEventListener('click', function() {
            _clearAiFilter();
            _activeLocationFilter = location;
            localStorage.setItem('collectionsLocationFilter', location);
            _renderGenreFilters();
            _renderLocationFilters();
            _renderAllCards();
        });
        container.appendChild(pill);
    });
}

// =============================================================================
// AI Smart Search (Inline in Genre Filter Row)
// =============================================================================

/**
 * Clear AI filter state
 */
function _clearAiFilter() {
    _aiFilteredIndices = null;
    _aiFilterQuery = '';
}

/**
 * Show inline AI search input in the genre filter pill row
 */
function _showAiInputInline() {
    var container = document.getElementById('genreFilterPills');
    if (!container) return;

    container.innerHTML = '';

    // Cancel button
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'ai-inline-cancel';
    cancelBtn.textContent = t('aiSearchCancel');
    cancelBtn.addEventListener('click', function() {
        _renderGenreFilters();
    });

    // Text input
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'ai-inline-input';
    input.placeholder = t('aiSearchPlaceholder');
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            _executeAiFilter(input.value);
        }
    });

    // Submit button
    var submitBtn = document.createElement('button');
    submitBtn.className = 'ai-inline-submit';
    submitBtn.textContent = t('aiSearchGo');
    submitBtn.addEventListener('click', function() {
        _executeAiFilter(input.value);
    });

    container.appendChild(cancelBtn);
    container.appendChild(input);
    container.appendChild(submitBtn);

    input.focus();
}

/**
 * Show Puter.js disclaimer modal before first AI use
 */
function _showPuterDisclaimer() {
    return new Promise(function(resolve) {
        if (localStorage.getItem('puterDisclaimerAccepted')) {
            resolve(true);
            return;
        }

        var overlay = document.createElement('div');
        overlay.className = 'puter-disclaimer-overlay';

        var modal = document.createElement('div');
        modal.className = 'puter-disclaimer-modal';

        var title = document.createElement('h3');
        title.textContent = t('puterDisclaimerTitle');
        modal.appendChild(title);

        var text = document.createElement('p');
        text.textContent = t('puterDisclaimerText');
        modal.appendChild(text);

        var btnRow = document.createElement('div');
        btnRow.className = 'puter-disclaimer-buttons';

        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'puter-disclaimer-btn cancel';
        cancelBtn.textContent = t('puterDisclaimerCancel');
        cancelBtn.addEventListener('click', function() {
            overlay.remove();
            resolve(false);
        });

        var continueBtn = document.createElement('button');
        continueBtn.className = 'puter-disclaimer-btn continue';
        continueBtn.textContent = t('puterDisclaimerContinue');
        continueBtn.addEventListener('click', function() {
            localStorage.setItem('puterDisclaimerAccepted', 'true');
            overlay.remove();
            resolve(true);
        });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(continueBtn);
        modal.appendChild(btnRow);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

/**
 * Execute AI filter: send query to AI, store matching indices, re-render
 */
async function _executeAiFilter(query) {
    if (!query || !query.trim()) return;
    query = query.trim();

    // Show Puter disclaimer on first use
    var accepted = await _showPuterDisclaimer();
    if (!accepted) {
        _renderGenreFilters();
        return;
    }

    // Check AI availability
    if (typeof aiSortCollections !== 'function' || typeof isAiSortAvailable !== 'function' || !isAiSortAvailable()) {
        if (typeof showToast === 'function') {
            showToast(t('aiUnavailable'));
        }
        _renderGenreFilters();
        return;
    }

    // Show loading state in pill area
    var container = document.getElementById('genreFilterPills');
    if (container) {
        container.innerHTML = '';
        var loadingPill = document.createElement('span');
        loadingPill.className = 'ai-loading-pill';
        loadingPill.textContent = t('aiSorting');
        container.appendChild(loadingPill);
    }

    // Build venue metadata for ALL items
    var venues = _allMergedItems.map(function(item) {
        return _getVenueInfo(item);
    });

    try {
        var matchedIndices = await aiSortCollections(query, venues);

        if (matchedIndices && matchedIndices.length > 0) {
            _aiFilteredIndices = matchedIndices;
            _aiFilterQuery = query;
            _activeGenreFilter = null;
            _activeLocationFilter = null;
            localStorage.setItem('collectionsGenreFilter', '');
            localStorage.setItem('collectionsLocationFilter', '');
            _renderGenreFilters();
            _renderLocationFilters();
            _renderAllCards();
        } else {
            _aiFilteredIndices = null;
            _aiFilterQuery = '';
            if (typeof showToast === 'function') {
                showToast(t('aiNoMatches'));
            }
            _renderGenreFilters();
            _renderAllCards();
        }
    } catch (err) {
        console.error('AI filter failed:', err);
        _aiFilteredIndices = null;
        _aiFilterQuery = '';
        if (typeof showToast === 'function') {
            showToast(t('aiUnavailable'));
        }
        _renderGenreFilters();
        _renderAllCards();
    }
}

// =============================================================================
// Folder Drawer & Management
// =============================================================================

/**
 * Load folders from API (or localStorage for guests)
 */
async function _loadFolders() {
    if (typeof fetchFolders === 'function') {
        _userFolders = await fetchFolders();
    } else {
        _userFolders = getLocalFolders ? getLocalFolders() : [];
    }

    if (typeof fetchVenueFolders === 'function') {
        _venueFolders = await fetchVenueFolders();
    } else {
        _venueFolders = getLocalVenueFolders ? getLocalVenueFolders() : {};
    }
}

/**
 * Setup folder drawer event handlers
 */
function _setupFolderDrawer() {
    var trigger = document.getElementById('folderDrawerTrigger');
    var drawer = document.getElementById('folderDrawer');
    var overlay = document.getElementById('folderDrawerOverlay');
    var closeBtn = document.getElementById('folderDrawerClose');
    var createBtn = document.getElementById('folderCreateBtn');
    var editBtn = document.getElementById('folderEditBtn');

    if (trigger) {
        trigger.addEventListener('click', function() {
            _openFolderDrawer();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function() {
            _closeFolderDrawer();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            _closeFolderDrawer();
        });
    }

    if (createBtn) {
        createBtn.addEventListener('click', function() {
            _openFolderModal(null); // null = create new
        });
    }

    if (editBtn) {
        editBtn.addEventListener('click', function() {
            // Toggle edit mode (show edit buttons on folders)
            editBtn.classList.toggle('active');
            _renderFolderDrawerList();
        });
    }

    // Setup folder modal
    _setupFolderModal();
}

/**
 * Open the folder drawer
 */
function _openFolderDrawer() {
    var drawer = document.getElementById('folderDrawer');
    var overlay = document.getElementById('folderDrawerOverlay');
    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    _renderFolderDrawerList();
}

/**
 * Close the folder drawer
 */
function _closeFolderDrawer() {
    var drawer = document.getElementById('folderDrawer');
    var overlay = document.getElementById('folderDrawerOverlay');
    var editBtn = document.getElementById('folderEditBtn');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (editBtn) editBtn.classList.remove('active');
}

/**
 * Render the folder list inside the drawer
 */
function _renderFolderDrawerList() {
    var container = document.getElementById('folderDrawerList');
    if (!container) return;

    var isEditMode = document.getElementById('folderEditBtn')?.classList.contains('active');
    container.innerHTML = '';

    // Count venues per folder
    var folderCounts = { all: _allMergedItems.length, uncategorized: 0 };
    _userFolders.forEach(function(f) { folderCounts[f.id] = 0; });

    _allMergedItems.forEach(function(item) {
        var venueId = _getItemVenueId(item);
        var folderId = venueId ? _venueFolders[venueId] : null;
        if (folderId && folderCounts[folderId] !== undefined) {
            folderCounts[folderId]++;
        } else {
            folderCounts.uncategorized++;
        }
    });

    // "All" item
    var allItem = document.createElement('div');
    allItem.className = 'folder-drawer-item' + (_activeFolderFilter === null ? ' active' : '');
    allItem.innerHTML = '<div class="folder-drawer-color" style="background:#888;"></div>' +
                        '<span class="folder-drawer-name">' + t('allGenres') + '</span>' +
                        '<span class="folder-drawer-count">' + folderCounts.all + '</span>';
    allItem.addEventListener('click', function() {
        _activeFolderFilter = null;
        localStorage.setItem('collectionsFolderFilter', '');
        _closeFolderDrawer();
        _renderAllCards();
    });
    container.appendChild(allItem);

    // User folders
    _userFolders.forEach(function(folder) {
        var item = document.createElement('div');
        item.className = 'folder-drawer-item' + (_activeFolderFilter === folder.id ? ' active' : '');

        var colorDot = '<div class="folder-drawer-color" style="background:' + folder.color + ';"></div>';
        var nameSpan = '<span class="folder-drawer-name">' + _escapeHtml(folder.name) + '</span>';
        var countSpan = '<span class="folder-drawer-count">' + (folderCounts[folder.id] || 0) + '</span>';

        if (isEditMode) {
            // Add edit button
            item.innerHTML = colorDot + nameSpan + countSpan +
                '<button class="folder-drawer-edit-btn" data-folder-id="' + folder.id + '">' +
                '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                '</button>';
            var editBtnEl = item.querySelector('.folder-drawer-edit-btn');
            if (editBtnEl) {
                editBtnEl.addEventListener('click', function(e) {
                    e.stopPropagation();
                    _openFolderModal(folder.id);
                });
            }
        } else {
            item.innerHTML = colorDot + nameSpan + countSpan;
        }

        item.addEventListener('click', function(e) {
            if (e.target.closest('.folder-drawer-edit-btn')) return;
            _activeFolderFilter = folder.id;
            localStorage.setItem('collectionsFolderFilter', folder.id);
            _closeFolderDrawer();
            _renderAllCards();
        });
        container.appendChild(item);
    });

    // Divider
    if (_userFolders.length > 0 || folderCounts.uncategorized > 0) {
        var divider = document.createElement('div');
        divider.className = 'folder-drawer-divider';
        container.appendChild(divider);
    }

    // "Uncategorized" item
    if (folderCounts.uncategorized > 0) {
        var uncatItem = document.createElement('div');
        uncatItem.className = 'folder-drawer-item' + (_activeFolderFilter === 'uncategorized' ? ' active' : '');
        uncatItem.innerHTML = '<div class="folder-drawer-color" style="background:#555;"></div>' +
                              '<span class="folder-drawer-name">' + t('uncategorized') + '</span>' +
                              '<span class="folder-drawer-count">' + folderCounts.uncategorized + '</span>';
        uncatItem.addEventListener('click', function() {
            _activeFolderFilter = 'uncategorized';
            localStorage.setItem('collectionsFolderFilter', 'uncategorized');
            _closeFolderDrawer();
            _renderAllCards();
        });
        container.appendChild(uncatItem);
    }
}

/**
 * Setup folder create/edit modal
 */
function _setupFolderModal() {
    var modal = document.getElementById('folderModal');
    var overlay = document.getElementById('folderModalOverlay');
    var cancelBtn = document.getElementById('folderModalCancel');
    var saveBtn = document.getElementById('folderModalSave');
    var deleteBtn = document.getElementById('folderModalDelete');
    var colorPicker = document.getElementById('folderColorPicker');

    if (overlay) {
        overlay.addEventListener('click', function() {
            _closeFolderModal();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            _closeFolderModal();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            _saveFolderFromModal();
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            _deleteFolderFromModal();
        });
    }

    // Render color buttons
    if (colorPicker && typeof FOLDER_COLORS !== 'undefined') {
        colorPicker.innerHTML = '';
        FOLDER_COLORS.forEach(function(color, idx) {
            var btn = document.createElement('button');
            btn.className = 'folder-color-btn' + (idx === 0 ? ' active' : '');
            btn.style.background = color;
            btn.dataset.color = color;
            btn.addEventListener('click', function() {
                colorPicker.querySelectorAll('.folder-color-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
            colorPicker.appendChild(btn);
        });
    }
}

/**
 * Open folder modal for create or edit
 */
function _openFolderModal(folderId) {
    var modal = document.getElementById('folderModal');
    var titleEl = document.getElementById('folderModalTitle');
    var nameInput = document.getElementById('folderNameInput');
    var deleteBtn = document.getElementById('folderModalDelete');
    var colorPicker = document.getElementById('folderColorPicker');

    _editingFolderId = folderId;

    if (folderId) {
        // Edit mode
        var folder = _userFolders.find(function(f) { return f.id === folderId; });
        if (!folder) return;

        if (titleEl) titleEl.textContent = t('editFolder');
        if (nameInput) nameInput.value = folder.name;
        if (deleteBtn) deleteBtn.style.display = 'block';

        // Select color
        if (colorPicker) {
            colorPicker.querySelectorAll('.folder-color-btn').forEach(function(btn) {
                btn.classList.toggle('active', btn.dataset.color === folder.color);
            });
        }
    } else {
        // Create mode
        if (titleEl) titleEl.textContent = t('createFolder');
        if (nameInput) nameInput.value = '';
        if (deleteBtn) deleteBtn.style.display = 'none';

        // Select first color
        if (colorPicker) {
            colorPicker.querySelectorAll('.folder-color-btn').forEach(function(btn, idx) {
                btn.classList.toggle('active', idx === 0);
            });
        }
    }

    if (modal) modal.classList.add('active');
    if (nameInput) nameInput.focus();
}

/**
 * Close folder modal
 */
function _closeFolderModal() {
    var modal = document.getElementById('folderModal');
    if (modal) modal.classList.remove('active');
    _editingFolderId = null;
}

/**
 * Save folder from modal
 */
async function _saveFolderFromModal() {
    var nameInput = document.getElementById('folderNameInput');
    var colorPicker = document.getElementById('folderColorPicker');

    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        nameInput?.focus();
        return;
    }

    var activeColorBtn = colorPicker?.querySelector('.folder-color-btn.active');
    var color = activeColorBtn ? activeColorBtn.dataset.color : FOLDER_COLORS[0];

    // Save folder
    if (typeof saveFolder === 'function') {
        var folder = await saveFolder(_editingFolderId, name, color);
        if (folder) {
            // Refresh folders
            await _loadFolders();
            _renderFolderDrawerList();
        }
    }

    _closeFolderModal();
}

/**
 * Delete folder from modal
 */
async function _deleteFolderFromModal() {
    if (!_editingFolderId) return;

    if (typeof deleteFolder === 'function') {
        await deleteFolder(_editingFolderId);
        // If we were filtering by this folder, reset
        if (_activeFolderFilter === _editingFolderId) {
            _activeFolderFilter = null;
            localStorage.setItem('collectionsFolderFilter', '');
        }
        await _loadFolders();
        _renderFolderDrawerList();
        _renderAllCards();
    }

    _closeFolderModal();
}

/**
 * Escape HTML for safe rendering
 */
function _escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// =============================================================================
// Folder Picker (for changing venue folder from bottom sheet)
// =============================================================================

var _folderPickerVenueId = null;

/**
 * Render folder row in bottom sheet
 */
function _renderSheetFolderRow(venueId) {
    var row = document.getElementById('venueSheetFolderRow');
    var dotEl = document.getElementById('venueSheetFolderDot');
    var nameEl = document.getElementById('venueSheetFolderName');
    var changeBtn = document.getElementById('venueSheetFolderChange');

    if (!row) return;

    // Always show folder row (even uncategorized)
    row.style.display = 'flex';

    var folderId = venueId ? _venueFolders[venueId] : null;
    var folder = folderId ? _userFolders.find(function(f) { return f.id === folderId; }) : null;

    if (folder) {
        if (dotEl) dotEl.style.background = folder.color;
        if (nameEl) nameEl.textContent = folder.name;
    } else {
        if (dotEl) dotEl.style.background = '#555';
        if (nameEl) nameEl.textContent = t('uncategorized');
    }

    // Setup change button
    if (changeBtn) {
        changeBtn.onclick = function() {
            _openFolderPicker(venueId);
        };
    }
}

/**
 * Open folder picker modal
 */
function _openFolderPicker(venueId) {
    var modal = document.getElementById('folderPickerModal');
    var overlay = document.getElementById('folderPickerOverlay');
    var cancelBtn = document.getElementById('folderPickerCancel');
    var list = document.getElementById('folderPickerList');

    if (!modal || !list) return;

    _folderPickerVenueId = venueId;
    var currentFolderId = venueId ? _venueFolders[venueId] : null;

    // Render folder options
    list.innerHTML = '';

    // "None" option (uncategorized)
    var noneItem = document.createElement('div');
    noneItem.className = 'folder-picker-item' + (!currentFolderId ? ' active' : '');
    noneItem.innerHTML = '<span class="folder-picker-item-dot" style="background:#555;"></span>' +
                         '<span class="folder-picker-item-name">' + t('uncategorized') + '</span>' +
                         '<svg class="folder-picker-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    noneItem.addEventListener('click', function() {
        _selectFolderForVenue(venueId, null);
    });
    list.appendChild(noneItem);

    // User folders
    _userFolders.forEach(function(folder) {
        var item = document.createElement('div');
        item.className = 'folder-picker-item' + (currentFolderId === folder.id ? ' active' : '');
        item.innerHTML = '<span class="folder-picker-item-dot" style="background:' + folder.color + ';"></span>' +
                         '<span class="folder-picker-item-name">' + _escapeHtml(folder.name) + '</span>' +
                         '<svg class="folder-picker-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
        item.addEventListener('click', function() {
            _selectFolderForVenue(venueId, folder.id);
        });
        list.appendChild(item);
    });

    // Setup close handlers
    if (overlay) {
        overlay.onclick = function() {
            _closeFolderPicker();
        };
    }
    if (cancelBtn) {
        cancelBtn.onclick = function() {
            _closeFolderPicker();
        };
    }

    modal.classList.add('active');
}

/**
 * Close folder picker modal
 */
function _closeFolderPicker() {
    var modal = document.getElementById('folderPickerModal');
    if (modal) modal.classList.remove('active');
    _folderPickerVenueId = null;
}

/**
 * Select a folder for a venue
 */
async function _selectFolderForVenue(venueId, folderId) {
    if (!venueId) {
        _closeFolderPicker();
        return;
    }

    // Update local cache
    if (folderId) {
        _venueFolders[venueId] = folderId;
    } else {
        delete _venueFolders[venueId];
    }

    // Sync to API
    if (typeof setVenueFolder === 'function') {
        await setVenueFolder(venueId, folderId);
    }

    // Update bottom sheet folder row
    _renderSheetFolderRow(venueId);

    // Re-render cards in case filter is active
    _renderAllCards();

    _closeFolderPicker();

    // Show toast
    if (typeof showToast === 'function') {
        var folder = folderId ? _userFolders.find(function(f) { return f.id === folderId; }) : null;
        var msg = folder ? t('movedToFolder').replace('{folder}', folder.name) : t('removedFromFolder');
        showToast(msg);
    }
}

// =============================================================================
// Venue Detail Bottom Sheet
// =============================================================================

var _currentSheetItem = null;

// Omochi App base URL (DEV environment)
var OMOCHI_APP_BASE_URL = 'https://d25ayioio4kluj.cloudfront.net';

/**
 * Get reservation URL for an item (checks localStorage for Google Sheets data)
 */
function _getReservationUrl(item) {
    if (item.source === 'local') {
        return item.data.reservation_url || '';
    }
    // API items: look up matching local collection by venue_uuid
    if (item.source === 'api' && item.data.venue) {
        var locals = typeof getLocalCollections === 'function' ? getLocalCollections() : [];
        for (var i = 0; i < locals.length; i++) {
            if (locals[i].venue_uuid === item.data.venue && locals[i].reservation_url) {
                return locals[i].reservation_url;
            }
        }
    }
    return '';
}

/**
 * Log a venue action to analytics
 */
function _logVenueAction(eventType, venueId) {
    if (typeof logAnalyticsEvent === 'function') {
        logAnalyticsEvent(eventType, venueId || '');
    }
}

/**
 * Open the venue detail bottom sheet for a collection item
 */
async function _openVenueSheet(item) {
    var overlay = document.getElementById('venueSheetOverlay');
    if (!overlay) return;

    _currentSheetItem = item;
    var info = _getVenueInfo(item);
    var venueId = typeof getVenueIdFromItem === 'function' ? getVenueIdFromItem(item) : null;

    // Populate header
    var nameEl = document.getElementById('venueSheetName');
    var metaEl = document.getElementById('venueSheetMeta');
    if (nameEl) nameEl.textContent = info.name;
    if (metaEl) {
        var metaParts = [];
        if (info.genre) metaParts.push(info.genre);
        if (info.nearest_station) metaParts.push(info.nearest_station);
        if (info.address) metaParts.push(info.address);
        metaEl.textContent = metaParts.join(' \u00B7 ');
    }

    // Render folder row (before memo)
    _renderSheetFolderRow(venueId);

    // Render memo section (prominent, always visible)
    await _renderSheetMemo(venueId);

    // Populate action buttons
    _renderActionButtons(item, info, venueId);

    // Render map
    _renderVenueMap(info);

    // Populate venue details
    _renderVenueDetails(info);

    // Render tags
    await _renderSheetTags(venueId);

    // Show overlay
    overlay.classList.add('active');

    // Setup close handlers
    var closeBtn = document.getElementById('venueSheetClose');
    var overlayEl = document.getElementById('venueSheetOverlay');

    if (closeBtn) closeBtn.onclick = _closeVenueSheet;
    if (overlayEl) {
        overlayEl.onclick = function(e) {
            if (e.target === overlayEl) _closeVenueSheet();
        };
    }

    // Log venue detail view
    _logVenueAction('venue_detail_view', venueId);
}

/**
 * Render action buttons (Call, Reserve, Omochi App)
 */
function _renderActionButtons(item, info, venueId) {
    var actionsEl = document.getElementById('venueSheetActions');
    var callBtn = document.getElementById('venueActionCall');
    var reserveBtn = document.getElementById('venueActionReserve');
    var appBtn = document.getElementById('venueActionApp');
    var taxiRow = document.getElementById('venueSheetTaxiRow');
    var taxiBtn = document.getElementById('venueActionTaxi');
    var hasActions = false;

    var reservationUrl = _getReservationUrl(item);
    var venueUuid = info.venue_uuid;

    if (callBtn) {
        if (info.phone_number) {
            callBtn.href = 'tel:' + info.phone_number;
            callBtn.style.display = 'flex';
            callBtn.onclick = function(e) {
                _logVenueAction('venue_call', venueId);
            };
            hasActions = true;
        } else {
            callBtn.style.display = 'none';
        }
    }

    if (reserveBtn) {
        if (reservationUrl) {
            reserveBtn.href = reservationUrl;
            reserveBtn.style.display = 'flex';
            reserveBtn.onclick = function(e) {
                _logVenueAction('venue_web_reserve', venueId);
            };
            hasActions = true;
        } else {
            reserveBtn.style.display = 'none';
        }
    }

    if (appBtn) {
        if (venueUuid) {
            appBtn.href = OMOCHI_APP_BASE_URL + '/store/' + venueUuid;
            appBtn.style.display = 'flex';
            appBtn.onclick = function(e) {
                _logVenueAction('venue_view_app', venueId);
            };
            hasActions = true;
        } else {
            appBtn.style.display = 'none';
        }
    }

    // Taxi button (show if venue has address)
    if (taxiRow && taxiBtn) {
        if (info.address) {
            taxiRow.style.display = 'block';
            taxiBtn.onclick = function(e) {
                e.preventDefault();
                _openTaxiPicker(info.address, venueId);
            };
        } else {
            taxiRow.style.display = 'none';
        }
    }

    if (actionsEl) actionsEl.style.display = hasActions ? 'flex' : 'none';
}

/**
 * Render venue detail info (description, hours, services, announcement)
 */
function _renderVenueDetails(info) {
    var detailsEl = document.getElementById('venueSheetDetails');
    var descEl = document.getElementById('venueSheetDescription');
    var hoursEl = document.getElementById('venueSheetHours');
    var servicesEl = document.getElementById('venueSheetServices');
    var announcementEl = document.getElementById('venueSheetAnnouncement');

    var hasDetails = false;

    if (descEl) {
        descEl.textContent = info.description || '';
        descEl.style.display = info.description ? 'block' : 'none';
        if (info.description) hasDetails = true;
    }

    if (hoursEl) {
        if (info.opening_time || info.closing_time) {
            hoursEl.textContent = t('hoursLabel') + ': ' + (info.opening_time || '?') + ' - ' + (info.closing_time || '?');
            hoursEl.style.display = 'block';
            hasDetails = true;
        } else {
            hoursEl.style.display = 'none';
        }
    }

    if (servicesEl) {
        var services = [];
        if (info.enable_eat_in) services.push(t('dineIn'));
        if (info.enable_take_out) services.push(t('takeout'));
        if (info.enable_reservation) services.push(t('reservationAvailable'));
        if (services.length > 0) {
            servicesEl.textContent = services.join(' \u00B7 ');
            servicesEl.style.display = 'block';
            hasDetails = true;
        } else {
            servicesEl.style.display = 'none';
        }
    }

    if (announcementEl) {
        announcementEl.textContent = info.announcement || '';
        announcementEl.style.display = info.announcement ? 'block' : 'none';
        if (info.announcement) hasDetails = true;
    }

    if (detailsEl) detailsEl.style.display = hasDetails ? 'block' : 'none';
}

/**
 * Render Google Maps embed in the bottom sheet (no API key needed)
 */
function _renderVenueMap(info) {
    var section = document.getElementById('venueSheetMapSection');
    var container = document.getElementById('venueSheetMapContainer');
    var link = document.getElementById('venueSheetMapLink');
    if (!section || !container) return;

    container.innerHTML = '';

    var address = info.address;
    if (!address || !address.trim()) {
        section.style.display = 'none';
        return;
    }

    var encodedAddress = encodeURIComponent(address.trim());
    var lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';

    var iframe = document.createElement('iframe');
    iframe.src = 'https://maps.google.com/maps?q=' + encodedAddress + '&t=m&z=15&output=embed&hl=' + lang;
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    iframe.setAttribute('allowfullscreen', '');
    iframe.title = info.name + ' - ' + (typeof t === 'function' ? t('mapLabel') : 'Location');
    container.appendChild(iframe);

    if (link) {
        link.href = 'https://www.google.com/maps/search/?api=1&query=' + encodedAddress;
        link.style.display = 'inline-flex';
    }

    section.style.display = 'block';
}

function _closeVenueSheet() {
    var overlay = document.getElementById('venueSheetOverlay');
    if (overlay) overlay.classList.remove('active');
    _currentSheetItem = null;

    var mapContainer = document.getElementById('venueSheetMapContainer');
    if (mapContainer) mapContainer.innerHTML = '';
}

/**
 * Render community tag pills in the bottom sheet
 */
async function _renderSheetTags(venueId) {
    var container = document.getElementById('venueSheetTags');
    var hintEl = document.getElementById('venueSheetTagsHint');
    if (!container) return;

    container.innerHTML = '';

    var loggedIn = typeof isLoggedIn === 'function' && isLoggedIn();
    var tagCounts = {};
    var myTags = [];

    if (venueId && typeof isTagsApiConfigured === 'function' && isTagsApiConfigured()) {
        tagCounts = await fetchVenueTags(venueId);
        if (loggedIn) {
            myTags = await fetchMyTags(venueId);
        }
    }

    var hasAnyTags = Object.keys(tagCounts).length > 0;

    VENUE_TAGS.forEach(function(tagDef) {
        var count = tagCounts[tagDef.key] || 0;
        var isMyTag = myTags.indexOf(tagDef.key) !== -1;

        var pill = document.createElement('button');
        pill.className = 'venue-tag-pill' + (isMyTag ? ' active' : '') + (!loggedIn ? ' readonly' : '');

        var iconSpan = document.createElement('span');
        iconSpan.className = 'tag-icon';
        iconSpan.innerHTML = tagDef.icon;
        pill.appendChild(iconSpan);

        var lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
        var labelSpan = document.createElement('span');
        labelSpan.textContent = tagDef[lang] || tagDef.en;
        pill.appendChild(labelSpan);

        if (count > 0) {
            var countSpan = document.createElement('span');
            countSpan.className = 'tag-count';
            countSpan.textContent = '(' + count + ')';
            pill.appendChild(countSpan);
        }

        if (loggedIn && venueId) {
            pill.addEventListener('click', function() {
                _toggleTag(venueId, tagDef.key, pill, count, isMyTag);
            });
        } else if (!loggedIn) {
            pill.addEventListener('click', function() {
                if (typeof showAuthModal === 'function') {
                    showAuthModal('login');
                } else if (typeof showToast === 'function') {
                    showToast(t('loginToTag'));
                }
            });
        }

        container.appendChild(pill);
    });

    // Hint text
    if (hintEl) {
        if (!loggedIn) {
            hintEl.textContent = t('loginToTag');
        } else if (!hasAnyTags) {
            hintEl.textContent = t('noTagsYet');
        } else {
            hintEl.textContent = '';
        }
    }
}

/**
 * Toggle a tag on/off
 */
async function _toggleTag(venueId, tagKey, pillEl, currentCount, wasActive) {
    // Optimistic UI update
    var isNowActive = !wasActive;
    pillEl.classList.toggle('active');

    var countSpan = pillEl.querySelector('.tag-count');
    var newCount = isNowActive ? currentCount + 1 : Math.max(0, currentCount - 1);
    if (newCount > 0) {
        if (!countSpan) {
            countSpan = document.createElement('span');
            countSpan.className = 'tag-count';
            pillEl.appendChild(countSpan);
        }
        countSpan.textContent = '(' + newCount + ')';
    } else if (countSpan) {
        countSpan.remove();
    }

    var success;
    if (isNowActive) {
        success = await addVenueTag(venueId, tagKey);
    } else {
        success = await removeVenueTag(venueId, tagKey);
    }

    if (success) {
        if (typeof showToast === 'function') {
            showToast(isNowActive ? t('tagAdded') : t('tagRemoved'));
        }
    } else {
        // Revert on failure
        pillEl.classList.toggle('active');
        if (currentCount > 0) {
            if (!countSpan) {
                countSpan = document.createElement('span');
                countSpan.className = 'tag-count';
                pillEl.appendChild(countSpan);
            }
            countSpan.textContent = '(' + currentCount + ')';
        } else if (countSpan) {
            countSpan.remove();
        }
        if (typeof showToast === 'function') {
            showToast(t('tagFailed'));
        }
    }
}

/**
 * Render the memo section in the bottom sheet (always visible)
 * - Logged-in: textarea with existing memo + save button
 * - Not logged-in: friendly tap-to-login prompt
 */
async function _renderSheetMemo(venueId) {
    var section = document.getElementById('venueSheetMemoSection');
    var loggedInDiv = document.getElementById('venueSheetMemoLoggedIn');
    var loginPrompt = document.getElementById('venueSheetMemoLoginPrompt');
    var hintEl = document.getElementById('venueSheetMemoHint');
    var textarea = document.getElementById('venueSheetMemo');
    var saveBtn = document.getElementById('venueSheetSaveBtn');
    if (!section) return;

    var loggedIn = typeof isLoggedIn === 'function' && isLoggedIn();

    // Always show the memo section
    section.style.display = 'block';

    if (loggedIn) {
        // Show textarea, hide login prompt
        if (loggedInDiv) loggedInDiv.style.display = 'block';
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (hintEl) hintEl.style.display = 'inline';
        if (textarea) textarea.value = '';

        // Load existing memo
        if (venueId && typeof fetchMemo === 'function') {
            var memo = await fetchMemo(venueId);
            if (memo && textarea) textarea.value = memo;
        }

        // Save handler
        if (saveBtn) {
            saveBtn.onclick = async function() {
                if (!textarea || !venueId) return;
                saveBtn.disabled = true;
                saveBtn.textContent = '...';

                var success = await saveMemo(venueId, textarea.value);
                saveBtn.disabled = false;
                saveBtn.textContent = t('saveMemo');

                if (typeof showToast === 'function') {
                    showToast(success ? t('memoSaved') : t('memoSaveFailed'));
                }
            };
        }
    } else {
        // Show login prompt, hide textarea
        if (loggedInDiv) loggedInDiv.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'flex';
        if (hintEl) hintEl.style.display = 'none';

        // Tap prompt to trigger auth modal
        if (loginPrompt) {
            loginPrompt.onclick = function() {
                if (typeof showAuthModal === 'function') {
                    showAuthModal('login');
                }
            };
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

// =============================================================================
// Taxi Picker Functions
// =============================================================================

/**
 * Geocode an address using free geocode.maps.co API
 * Returns { lat, lng } or null on failure
 */
async function _geocodeAddress(address) {
    if (!address || !address.trim()) return null;

    // Check cache first
    var cacheKey = address.trim().toLowerCase();
    if (_geocodeCache[cacheKey]) {
        return _geocodeCache[cacheKey];
    }

    try {
        var url = 'https://geocode.maps.co/search?q=' + encodeURIComponent(address);
        var response = await fetch(url);
        if (!response.ok) return null;

        var data = await response.json();
        if (data && data.length > 0) {
            var result = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
            _geocodeCache[cacheKey] = result;
            return result;
        }
    } catch (err) {
        console.warn('Geocoding failed:', err);
    }
    return null;
}

/**
 * Build URL for a taxi service (deep links for app, web fallback handled separately)
 */
function _buildTaxiUrl(serviceId, address, coords) {
    var lat = coords ? coords.lat : null;
    var lng = coords ? coords.lng : null;
    var encodedAddr = encodeURIComponent(address || '');

    switch (serviceId) {
        case 'uber':
            // Deep link with destination (opens app directly)
            if (lat && lng) {
                return 'uber://riderequest?dropoff[latitude]=' + lat +
                       '&dropoff[longitude]=' + lng +
                       '&dropoff[formatted_address]=' + encodedAddr;
            }
            // Web fallback with address only (no coords available)
            return 'https://m.uber.com/ul/?action=setPickup&pickup=my_location' +
                   '&dropoff[formatted_address]=' + encodedAddr;

        case 'go-taxi':
            // Deep link to open GO app
            return 'mot-go://';

        default:
            return null;
    }
}

/**
 * Get web fallback URL for a service
 */
function _getTaxiWebFallback(serviceId, coords) {
    var lat = coords ? coords.lat : null;
    var lng = coords ? coords.lng : null;

    switch (serviceId) {
        case 'uber':
            if (lat && lng) {
                return 'https://m.uber.com/ul?drop[0][latitude]=' + lat +
                       '&drop[0][longitude]=' + lng;
            }
            return 'https://m.uber.com/';

        case 'go-taxi':
            return 'https://go.mo-t.com/';

        default:
            return null;
    }
}

/**
 * Copy text to clipboard
 */
async function _copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        try {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (e) {
            return false;
        }
    }
}

/**
 * Open the taxi picker modal
 */
function _openTaxiPicker(address, venueId) {
    var modal = document.getElementById('taxiPickerModal');
    var list = document.getElementById('taxiPickerList');
    var overlay = document.getElementById('taxiPickerOverlay');
    var cancelBtn = document.getElementById('taxiPickerCancel');

    if (!modal || !list) return;

    _taxiModalAddress = address;
    _taxiModalVenueId = venueId;

    // Render service options
    list.innerHTML = '';

    TAXI_SERVICES.forEach(function(service) {
        var item = document.createElement('div');
        item.className = 'taxi-picker-item';
        item.dataset.serviceId = service.id;

        var iconDiv = document.createElement('div');
        iconDiv.className = 'taxi-picker-item-icon ' + service.id;
        iconDiv.textContent = service.icon;

        var textDiv = document.createElement('div');
        textDiv.className = 'taxi-picker-item-text';

        var nameSpan = document.createElement('div');
        nameSpan.className = 'taxi-picker-item-name';
        nameSpan.textContent = service.name;

        var descSpan = document.createElement('div');
        descSpan.className = 'taxi-picker-item-desc';
        descSpan.textContent = t(service.descKey);

        textDiv.appendChild(nameSpan);
        textDiv.appendChild(descSpan);
        item.appendChild(iconDiv);
        item.appendChild(textDiv);

        item.addEventListener('click', function() {
            _selectTaxiService(service.id);
        });

        list.appendChild(item);
    });

    // Setup close handlers
    if (overlay) {
        overlay.onclick = _closeTaxiPicker;
    }
    if (cancelBtn) {
        cancelBtn.onclick = _closeTaxiPicker;
    }

    modal.classList.add('active');
}

/**
 * Close the taxi picker modal
 */
function _closeTaxiPicker() {
    var modal = document.getElementById('taxiPickerModal');
    if (modal) modal.classList.remove('active');
    _taxiModalAddress = '';
    _taxiModalVenueId = '';
}

/**
 * Handle taxi service selection
 */
async function _selectTaxiService(serviceId) {
    var address = _taxiModalAddress;
    var venueId = _taxiModalVenueId;
    var service = TAXI_SERVICES.find(function(s) { return s.id === serviceId; });

    if (!service) {
        _closeTaxiPicker();
        return;
    }

    // Log analytics
    _logVenueAction('taxi_' + serviceId, venueId);

    // Show loading state
    var list = document.getElementById('taxiPickerList');
    if (list) {
        list.innerHTML = '<div class="taxi-picker-loading">' +
            '<div class="spinner"></div>' +
            '<div>' + t('taxiOpening') + '</div>' +
            '</div>';
    }

    // Geocode address for Uber to include coordinates
    var coords = null;
    if (serviceId === 'uber' && address) {
        coords = await _geocodeAddress(address);
    }

    // For GO Taxi, copy address to clipboard (no URL pre-fill supported)
    if (serviceId === 'go-taxi' && address) {
        var copied = await _copyToClipboard(address);
        if (copied && typeof showToast === 'function') {
            showToast(t('addressCopied'));
        }
    }

    // Build URL and open
    var url = _buildTaxiUrl(serviceId, address, coords);

    if (url) {
        // Try deep link first for mobile (non-http URLs)
        if (service.hasDeepLink && url.indexOf('http') !== 0) {
            // For deep links, try to open and fallback to web if app not installed
            var fallbackUrl = _getTaxiWebFallback(serviceId, coords);

            // Set a timeout to open web fallback if deep link fails
            var fallbackTimer = setTimeout(function() {
                if (fallbackUrl) {
                    window.open(fallbackUrl, '_blank');
                }
            }, 2500);

            // Try deep link via location.href
            window.location.href = url;

            // Clear timer if page is still active after a short delay
            setTimeout(function() {
                clearTimeout(fallbackTimer);
            }, 3000);
        } else {
            // Web URL - open directly in new tab
            window.open(url, '_blank');
        }
    }

    _closeTaxiPicker();
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
