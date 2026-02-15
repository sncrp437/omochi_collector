// =============================================================================
// My Collections Page Logic - Dual source (localStorage + API)
// =============================================================================

// All merged collection items for filtering/sorting
var _allMergedItems = [];
var _filteredItems = []; // Current filtered items for event delegation lookup
var _activeGenreFilter = null;
var _activeLocationFilter = null;
var _activeFolderFilter = null; // null = All, 'uncategorized' = no folder, folder_id = specific folder
var _aiFilteredIndices = null;
var _aiFilterQuery = '';
var _aiSearchState = 'inactive'; // 'inactive' | 'active' | 'loading' | 'results'
var _userFolders = [];
var _venueFolders = {};
var _editingFolderId = null; // For folder edit modal
var _autoCollectedVenue = null; // Venue that was auto-collected via URL param
var _pendingDeleteItem = null;
var _pendingDeleteCard = null;

/**
 * Strip HTML tags from a string, preserving line breaks from block-level elements.
 */
function _stripHtml(html) {
    if (!html) return '';
    var text = html.replace(/<br\s*\/?>/gi, '\n')
                   .replace(/<\/p>/gi, '\n')
                   .replace(/<\/div>/gi, '\n');
    var tmp = document.createElement('div');
    tmp.innerHTML = text;
    return (tmp.textContent || tmp.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
}

// =============================================================================
// NFC/QR Auto-Collect via URL Parameters
// =============================================================================

/**
 * Get auto-collect params from URL
 * Supports: ?collect=VENUE_KEY&src=nfc|qr|link
 */
function getAutoCollectParams() {
    var params = new URLSearchParams(window.location.search);
    return {
        venueKey: params.get('collect') || params.get('v') || null,
        source: params.get('src') || 'direct'
    };
}

/**
 * Handle auto-collect on page load (NFC/QR integration)
 * Fetches video data, finds venue by venue_key, saves to collection
 * @returns {Promise<Object|null>} The auto-collected venue item or null
 */
async function handleAutoCollect() {
    var params = getAutoCollectParams();
    if (!params.venueKey) return null;

    console.log('[my-collections] Auto-collect triggered for venue_key:', params.venueKey);

    // Log arrival event
    if (typeof logAnalyticsEvent === 'function') {
        logAnalyticsEvent('nfc_arrival', params.venueKey);
    }

    // Fetch video data to find venue
    var rawData = null;
    try {
        rawData = await fetchVideoData();
    } catch (err) {
        console.error('[my-collections] Failed to fetch video data for auto-collect:', err);
    }

    if (!rawData) {
        if (typeof showToast === 'function') {
            showToast(t('venueNotFound'));
        }
        _cleanAutoCollectUrl();
        return null;
    }

    var venues = typeof parseVideoData === 'function' ? parseVideoData(rawData) : [];

    // Find venue by venue_key (primary) or id (fallback)
    var venue = venues.find(function(v) { return v.venue_key === params.venueKey; }) ||
                venues.find(function(v) { return v.id === params.venueKey; });

    if (!venue) {
        console.warn('[my-collections] Venue not found for key:', params.venueKey);
        if (typeof showToast === 'function') {
            showToast(t('venueNotFound'));
        }
        if (typeof logAnalyticsEvent === 'function') {
            logAnalyticsEvent('auto_collect_not_found', params.venueKey);
        }
        _cleanAutoCollectUrl();
        return null;
    }

    // Check if already collected
    if (typeof isLocallyCollected === 'function' && isLocallyCollected(venue.id)) {
        console.log('[my-collections] Venue already collected:', venue.venue_name);
        if (typeof showToast === 'function') {
            showToast(t('alreadyInCollection'));
        }
        if (typeof logAnalyticsEvent === 'function') {
            logAnalyticsEvent('auto_collect_duplicate', params.venueKey);
        }
        _cleanAutoCollectUrl();
        // Still return venue to open the bottom sheet
        return venue;
    }

    // Auto-save to collection
    var isNew = false;
    if (typeof saveLocalCollection === 'function') {
        isNew = saveLocalCollection(venue);
    }

    if (isNew) {
        // Show success toast with hint
        var acLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
        var vName = (acLang === 'en' && venue.venue_name_en) ? venue.venue_name_en : (venue.venue_name || 'Venue');
        var toastMsg = '\u2713 ' + vName + ' ' + t('collected');
        if (typeof showToast === 'function') {
            showToast(toastMsg, 3500);
        }
        if (typeof logAnalyticsEvent === 'function') {
            logAnalyticsEvent('auto_collect_success', params.venueKey);
        }

        // Sync to API if logged in and has venue_uuid
        if (venue.venue_uuid && typeof isLoggedIn === 'function' && isLoggedIn()) {
            try {
                await apiPost('/api/stocked-venues/', { venue: venue.venue_uuid });
                if (typeof markLocalCollectionSynced === 'function') {
                    markLocalCollectionSynced(venue.id);
                }
            } catch (err) {
                console.warn('[my-collections] API sync failed for auto-collected venue:', err);
            }
        }
    }

    // Clean URL (remove params without reload)
    _cleanAutoCollectUrl();

    return venue;
}

/**
 * Remove auto-collect params from URL without page reload
 */
function _cleanAutoCollectUrl() {
    var cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
}

/**
 * Highlight newly collected venue card with animation
 * @param {string} videoId - The video_id to highlight
 */
function highlightVenueCard(videoId) {
    var card = document.querySelector('.venue-card[data-video-id="' + videoId + '"]');
    // Also try finding by local_id pattern in case card uses that
    if (!card) {
        var cards = document.querySelectorAll('.venue-card');
        for (var i = 0; i < cards.length; i++) {
            var localId = cards[i].dataset.localId;
            if (localId && _filteredItems && _filteredItems[i]) {
                var itemVideoId = _filteredItems[i].data.video_id || _filteredItems[i].data.id;
                if (itemVideoId === videoId) {
                    card = cards[i];
                    break;
                }
            }
        }
    }

    if (card) {
        card.classList.add('newly-collected');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Find the merged item that matches an auto-collected venue
 * @param {Object} venue - The venue object from video data
 * @returns {Object|null} The merged item or null
 */
function _findMergedItemForVenue(venue) {
    if (!venue || !_allMergedItems) return null;

    for (var i = 0; i < _allMergedItems.length; i++) {
        var item = _allMergedItems[i];
        if (item.source === 'local') {
            if (item.data.video_id === venue.id || item.data.venue_key === venue.venue_key) {
                return item;
            }
        } else if (item.source === 'api') {
            if (item.data.venue === venue.venue_uuid) {
                return item;
            }
        }
    }
    return null;
}

/**
 * Setup event delegation for venue card clicks (called once during init)
 */
function _setupCardClickDelegation() {
    var cardsListEl = document.getElementById('venueCardsList');
    if (!cardsListEl || cardsListEl._delegationSetup) return;

    cardsListEl.addEventListener('click', function(e) {
        // Ignore remove button and visit column clicks (handled separately with stopPropagation)
        if (e.target.closest('.venue-card-remove')) return;
        if (e.target.closest('.venue-card-visit-col')) return;

        var card = e.target.closest('.venue-card');
        if (!card) return;

        var idx = parseInt(card.dataset.venueIndex, 10);
        if (!isNaN(idx) && _filteredItems && _filteredItems[idx]) {
            _openVenueSheet(_filteredItems[idx]);
        }
    });

    cardsListEl._delegationSetup = true;
}

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
        hasDeepLink: false,  // Uses Universal Link (web URL that prompts app)
        hasWebFallback: false
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

    // Clean up expired guest data (memos, tags, folders)
    if (typeof cleanupAllExpiredGuestData === 'function') {
        cleanupAllExpiredGuestData();
    }

    // Setup event delegation for venue card clicks (once, before any rendering)
    _setupCardClickDelegation();
    _setupDeleteConfirmModal();

    // Setup AI search bar event listeners
    _setupAiSearchBar();

    // 0. Handle NFC/QR auto-collect FIRST (before loading collections)
    _autoCollectedVenue = await handleAutoCollect();

    // 1. Always load local collections (includes auto-collected venue if new)
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
        // Hide AI search bar when empty
        var aiSearchBar = document.getElementById('aiSearchBar');
        if (aiSearchBar) aiSearchBar.style.display = 'none';

        if (!loggedIn && localItems.length === 0) {
            // No local items, not logged in - show empty state with discover link
            if (emptyEl) emptyEl.style.display = 'block';
        } else {
            if (emptyEl) emptyEl.style.display = 'block';
        }
        return;
    }

    // 5. Show AI search bar if we have enough items
    var aiSearchBar = document.getElementById('aiSearchBar');
    if (aiSearchBar) {
        aiSearchBar.style.display = _allMergedItems.length >= 2 ? 'block' : 'none';
    }

    // 6. Render cards
    _renderAllCards();

    // 7. Build filter pills
    _renderGenreFilters();
    _renderLocationFilters();

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

    // 10. Load folders and setup drawer
    await _loadFolders();
    _setupFolderDrawer();

    // 11. Initialize expiration warning banner for guest users
    if (typeof initExpirationBanner === 'function') {
        initExpirationBanner();
    }

    // 12. Handle auto-collected venue (NFC/QR) - highlight and open sheet
    if (_autoCollectedVenue) {
        // Find the merged item for this venue
        var mergedItem = _findMergedItemForVenue(_autoCollectedVenue);
        if (mergedItem) {
            // Highlight the card with animation
            highlightVenueCard(_autoCollectedVenue.id);
            // Auto-open the venue detail bottom sheet after a brief delay
            setTimeout(function() {
                _openVenueSheet(mergedItem);
            }, 600);
        }
    }

    // 13. Initialize campaigns and notifications (logged-in users only)
    if (loggedIn) {
        // Init campaign modal handlers
        if (typeof initCampaignModule === 'function') initCampaignModule();
        // Init notification module handlers
        if (typeof initNotificationModule === 'function') initNotificationModule();

        // Load notifications (bell badge, in-app banner, push permission)
        if (typeof loadNotifications === 'function') {
            loadNotifications();
        }

        // Load and show campaign modal (delayed to avoid conflicts)
        if (typeof loadAndShowGlobalCampaigns === 'function') {
            setTimeout(function() {
                loadAndShowGlobalCampaigns();
            }, _autoCollectedVenue ? 2000 : 800);
        }
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
            description: (lang === 'en' && v.description_en) ? v.description_en : (v.description || ''),
            opening_time: v.opening_time || '',
            closing_time: v.closing_time || '',
            phone_number: v.phone_number || '',
            reservable: !!v.enable_reservation,
            enable_eat_in: !!v.enable_eat_in,
            enable_take_out: !!v.enable_take_out,
            announcement: (lang === 'en' && v.announcement_en) ? v.announcement_en : (v.announcement || ''),
            venue_uuid: item.data.venue || null,
            video_type: v.video_type || 'youtube'
        };
    }
    // Local item
    var d = item.data;
    return {
        name: (lang === 'en' && d.venue_name_en) ? d.venue_name_en : (d.venue_name || (lang === 'ja' ? d.caption_ja : d.caption_en) || 'Saved Venue'),
        genre: (lang === 'en' && d.genre_en) ? d.genre_en : (d.genre || ''),
        nearest_station: (lang === 'en' && d.nearest_station_en) ? d.nearest_station_en : (d.nearest_station || ''),
        address: d.address || '',
        logo: null,
        website: null,
        description: '',
        opening_time: '',
        closing_time: '',
        phone_number: d.phone_number || '',
        reservable: d.reservable !== false,
        enable_eat_in: false,
        enable_take_out: false,
        announcement: '',
        venue_uuid: d.venue_uuid || null,
        reservation_url: d.reservation_url || '',
        video_type: d.video_type || 'youtube'
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
    _filteredItems = filtered; // Store for event delegation lookup

    if (filtered.length === 0) {
        cardsListEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    cardsListEl.style.display = 'flex';

    filtered.forEach(function(item, index) {
        var card = _createUnifiedCard(item, index);
        cardsListEl.appendChild(card);
    });
}

/**
 * Get filtered items based on active folder, content type, genre, and location filters
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
 * @param {Object} item - The venue item
 * @param {number} index - Index in _filteredItems for event delegation lookup
 */
function _createUnifiedCard(item, index) {
    var info = _getVenueInfo(item);

    var card = document.createElement('div');
    card.className = 'venue-card';

    // Add AI-picked class if this card is from AI search results
    if (_aiFilteredIndices !== null && _aiSearchState === 'results') {
        card.className += ' ai-picked';
    }

    // Store index for event delegation lookup
    card.dataset.venueIndex = index;

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

    // AI badge (shown only when AI search is active)
    var aiBadge = document.createElement('span');
    aiBadge.className = 'ai-badge';
    aiBadge.textContent = t('aiPickedBadge');
    card.appendChild(aiBadge);

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

    // Async: check if user has a memo for this venue (works for both guests and logged-in)
    var venueIdForMemo = typeof getVenueIdFromItem === 'function' ? getVenueIdFromItem(item) : null;
    if (venueIdForMemo && typeof fetchMemo === 'function') {
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

    // Campaign badge (API items with active campaigns)
    if (item.source === 'api' && item.data.campaigns && item.data.campaigns.length > 0) {
        var campaignBadge = document.createElement('span');
        campaignBadge.className = 'venue-card-campaign-badge';
        campaignBadge.innerHTML = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ' + t('campaignLatestInfo');
        infoDiv.appendChild(campaignBadge);
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
        _showDeleteConfirm(item, card);
    });

    // Visit status column (right side of card)
    var visitCol = document.createElement('div');
    visitCol.className = 'venue-card-visit-col';
    if (venueId) visitCol.dataset.venueId = venueId;

    var visitWantBtn = document.createElement('button');
    visitWantBtn.className = 'venue-card-visit-btn want';
    visitWantBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> ' + t('visitWantToGo');
    visitWantBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        _toggleCardVisitStatus(venueId, 'want_to_go', visitCol);
    });

    var visitWentBtn = document.createElement('button');
    visitWentBtn.className = 'venue-card-visit-btn went';
    visitWentBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ' + t('visitWent');
    visitWentBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        _toggleCardVisitStatus(venueId, 'went', visitCol);
    });

    var visitTrophy = document.createElement('span');
    visitTrophy.className = 'venue-card-trophy';
    visitTrophy.style.display = 'none';

    visitCol.appendChild(visitWantBtn);
    visitCol.appendChild(visitWentBtn);
    visitCol.appendChild(visitTrophy);

    // Populate visit status from localStorage (synchronous)
    if (venueId && typeof getLocalVisitStatus === 'function') {
        var vs = getLocalVisitStatus(venueId);
        _updateCardVisitUI(visitCol, vs);
    }

    card.appendChild(logoDiv);
    card.appendChild(infoDiv);
    card.appendChild(visitCol);
    card.appendChild(removeBtn);

    // Note: Click handling is done via event delegation in _setupCardClickDelegation()
    // to avoid stale listener issues when cards are re-rendered

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

function _showDeleteConfirm(item, cardElement) {
    _pendingDeleteItem = item;
    _pendingDeleteCard = cardElement;
    var modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.add('active');
}

function _hideDeleteConfirm() {
    var modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('active');
    _pendingDeleteItem = null;
    _pendingDeleteCard = null;
}

function _setupDeleteConfirmModal() {
    var overlay = document.getElementById('deleteConfirmOverlay');
    var cancelBtn = document.getElementById('deleteConfirmCancel');
    var confirmBtn = document.getElementById('deleteConfirmBtn');

    if (overlay) overlay.addEventListener('click', _hideDeleteConfirm);
    if (cancelBtn) cancelBtn.addEventListener('click', _hideDeleteConfirm);
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            if (_pendingDeleteItem && _pendingDeleteCard) {
                _removeItem(_pendingDeleteItem, _pendingDeleteCard);
            }
            _hideDeleteConfirm();
        });
    }
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

    // Don't show genre filters when AI is active
    if (_aiSearchState === 'loading' || _aiSearchState === 'results') {
        return;
    }

    var genres = {};
    _allMergedItems.forEach(function(item) {
        var info = _getVenueInfo(item);
        if (info.genre) {
            genres[info.genre] = (genres[info.genre] || 0) + 1;
        }
    });

    var genreKeys = Object.keys(genres);

    // Show section if 2+ genres
    if (genreKeys.length < 2) {
        section.style.display = 'none';
        _activeGenreFilter = null;
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    // "All" pill
    var allPill = document.createElement('button');
    allPill.className = 'genre-pill' + (!_activeGenreFilter ? ' active' : '');
    allPill.textContent = t('allGenres');
    allPill.addEventListener('click', function() {
        _activeGenreFilter = null;
        localStorage.setItem('collectionsGenreFilter', '');
        _renderGenreFilters();
        _renderAllCards();
    });
    container.appendChild(allPill);

    // Genre pills
    genreKeys.sort().forEach(function(genre) {
        var pill = document.createElement('button');
        pill.className = 'genre-pill' + (_activeGenreFilter === genre ? ' active' : '');
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

    // Don't show location filters when AI is active
    if (_aiSearchState === 'loading' || _aiSearchState === 'results') {
        return;
    }

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
    allPill.className = 'genre-pill' + (!_activeLocationFilter ? ' active' : '');
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
        pill.className = 'genre-pill' + (_activeLocationFilter === location ? ' active' : '');
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
// AI Smart Search (Dedicated Search Bar)
// =============================================================================

/**
 * Clear AI filter state and reset UI to inactive
 */
function _clearAiFilter() {
    _aiFilteredIndices = null;
    _aiFilterQuery = '';
    _aiSearchState = 'inactive';
    _updateAiSearchBarUI();
    _updateFilterSectionsVisibility();
}

/**
 * Setup AI search bar event listeners (called once during init)
 */
function _setupAiSearchBar() {
    var aiSearchBar = document.getElementById('aiSearchBar');
    var inactiveEl = document.getElementById('aiSearchInactive');
    var cancelBtn = document.getElementById('aiSearchCancel');
    var submitBtn = document.getElementById('aiSearchSubmit');
    var inputEl = document.getElementById('aiSearchInput');
    var clearBtn = document.getElementById('aiSearchClear');
    var resultsEl = document.getElementById('aiSearchResults');

    // Hide AI search bar if AI is not available or not enough items
    if (aiSearchBar) {
        var hasAi = typeof isAiSortAvailable === 'function';
        if (!hasAi) {
            aiSearchBar.style.display = 'none';
            return;
        }
    }

    if (inactiveEl) {
        inactiveEl.addEventListener('click', function() {
            _activateAiSearch();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            _cancelAiSearch();
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            var query = inputEl ? inputEl.value : '';
            _executeAiFilter(query);
        });
    }

    if (inputEl) {
        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                _executeAiFilter(inputEl.value);
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _clearAiSearch();
        });
    }

    if (resultsEl) {
        // Clicking results bar (not clear button) opens input for new search
        resultsEl.addEventListener('click', function(e) {
            if (e.target.id !== 'aiSearchClear') {
                _activateAiSearch();
            }
        });
    }
}

/**
 * Switch to active input state
 */
function _activateAiSearch() {
    _aiSearchState = 'active';
    _updateAiSearchBarUI();
    _updateFilterSectionsVisibility();

    var inputEl = document.getElementById('aiSearchInput');
    if (inputEl) {
        inputEl.value = _aiFilterQuery || '';
        setTimeout(function() { inputEl.focus(); }, 50);
    }
}

/**
 * Cancel AI search and return to inactive (or results if we had results)
 */
function _cancelAiSearch() {
    if (_aiFilteredIndices !== null) {
        _aiSearchState = 'results';
    } else {
        _aiSearchState = 'inactive';
    }
    _updateAiSearchBarUI();
    _updateFilterSectionsVisibility();
}

/**
 * Clear AI search completely and return to inactive
 */
function _clearAiSearch() {
    _aiFilteredIndices = null;
    _aiFilterQuery = '';
    _aiSearchState = 'inactive';
    _updateAiSearchBarUI();
    _updateFilterSectionsVisibility();
    _renderGenreFilters();
    _renderLocationFilters();
    _renderAllCards();
}

/**
 * Update the AI search bar UI based on current state
 */
function _updateAiSearchBarUI() {
    var inactiveEl = document.getElementById('aiSearchInactive');
    var activeEl = document.getElementById('aiSearchActive');
    var loadingEl = document.getElementById('aiSearchLoading');
    var resultsEl = document.getElementById('aiSearchResults');
    var queryEl = document.getElementById('aiSearchQuery');
    var countEl = document.getElementById('aiSearchCount');

    if (!inactiveEl || !activeEl || !loadingEl || !resultsEl) return;

    // Hide all states first
    inactiveEl.style.display = 'none';
    activeEl.style.display = 'none';
    loadingEl.style.display = 'none';
    resultsEl.style.display = 'none';

    switch (_aiSearchState) {
        case 'inactive':
            inactiveEl.style.display = 'flex';
            break;
        case 'active':
            activeEl.style.display = 'flex';
            break;
        case 'loading':
            loadingEl.style.display = 'flex';
            break;
        case 'results':
            resultsEl.style.display = 'flex';
            if (queryEl) queryEl.textContent = _aiFilterQuery;
            if (countEl) {
                var count = _aiFilteredIndices ? _aiFilteredIndices.length : 0;
                countEl.textContent = '(' + count + ' ' + t('aiResultsCount') + ')';
            }
            break;
    }
}

/**
 * Show/hide filter sections based on AI state
 */
function _updateFilterSectionsVisibility() {
    var genreSection = document.getElementById('genreFilterSection');
    var locationSection = document.getElementById('locationFilterSection');

    var hideFilters = _aiSearchState === 'loading' || _aiSearchState === 'results';

    if (genreSection) {
        genreSection.style.display = hideFilters ? 'none' : '';
    }
    if (locationSection) {
        locationSection.style.display = hideFilters ? 'none' : '';
    }
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
        _cancelAiSearch();
        return;
    }

    // Check AI availability
    if (typeof aiSortCollections !== 'function' || typeof isAiSortAvailable !== 'function' || !isAiSortAvailable()) {
        if (typeof showToast === 'function') {
            showToast(t('aiUnavailable'));
        }
        _cancelAiSearch();
        return;
    }

    // Show loading state in dedicated AI search bar
    _aiSearchState = 'loading';
    _updateAiSearchBarUI();
    _updateFilterSectionsVisibility();

    // Build venue metadata for ALL items
    var venues = _allMergedItems.map(function(item) {
        return _getVenueInfo(item);
    });

    try {
        var matchedIndices = await aiSortCollections(query, venues);

        if (matchedIndices && matchedIndices.length > 0) {
            _aiFilteredIndices = matchedIndices;
            _aiFilterQuery = query;
            _aiSearchState = 'results';
            _activeGenreFilter = null;
            _activeLocationFilter = null;
            localStorage.setItem('collectionsGenreFilter', '');
            localStorage.setItem('collectionsLocationFilter', '');
            _updateAiSearchBarUI();
            _updateFilterSectionsVisibility();
            _renderAllCards();
        } else {
            _aiFilteredIndices = null;
            _aiFilterQuery = '';
            _aiSearchState = 'inactive';
            _updateAiSearchBarUI();
            _updateFilterSectionsVisibility();
            if (typeof showToast === 'function') {
                showToast(t('aiNoMatches'));
            }
            _renderGenreFilters();
            _renderLocationFilters();
            _renderAllCards();
        }
    } catch (err) {
        console.error('AI filter failed:', err);
        _aiFilteredIndices = null;
        _aiFilterQuery = '';
        _aiSearchState = 'inactive';
        _updateAiSearchBarUI();
        _updateFilterSectionsVisibility();
        if (typeof showToast === 'function') {
            showToast(t('aiUnavailable'));
        }
        _renderGenreFilters();
        _renderLocationFilters();
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

    var rawVenueFolders = {};
    if (typeof fetchVenueFolders === 'function') {
        rawVenueFolders = await fetchVenueFolders();
    } else if (typeof getLocalVenueFolders === 'function') {
        rawVenueFolders = getLocalVenueFolders();
    }
    // Normalize: extract folder_id from new object format { folder_id, expires_at, synced }
    _venueFolders = {};
    Object.keys(rawVenueFolders).forEach(function(venueId) {
        var val = rawVenueFolders[venueId];
        _venueFolders[venueId] = typeof val === 'object' ? val.folder_id : val;
    });
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
// OMOCHI_APP_BASE_URL removed - Omochi App button no longer in action row

/**
 * Get reservation URL for an item (checks localStorage for Google Sheets data)
 */
function _getReservationUrl(item) {
    if (item.source === 'local') {
        return item.data.reservation_url || '';
    }
    // API items: look up matching local collection
    if (item.source === 'api') {
        var locals = typeof getLocalCollections === 'function' ? getLocalCollections() : [];
        // Pass 1: match by venue_uuid
        if (item.data.venue) {
            for (var i = 0; i < locals.length; i++) {
                if (locals[i].venue_uuid === item.data.venue && locals[i].reservation_url) {
                    return locals[i].reservation_url;
                }
            }
        }
        // Pass 2: match by video_id (always present in local collections)
        var apiId = item.data.venue || item.data.id;
        for (var i = 0; i < locals.length; i++) {
            if (locals[i].video_id && locals[i].video_id === apiId && locals[i].reservation_url) {
                return locals[i].reservation_url;
            }
        }
    }
    return '';
}

/**
 * Get phone number for an item (checks localStorage for Google Sheets data)
 */
function _getPhoneNumber(item) {
    if (item.source === 'local') {
        return item.data.phone_number || '';
    }
    // API items: check venue_details first, then fall back to local collection
    var vd = item.data.venue_details || {};
    if (vd.phone_number) return vd.phone_number;
    if (item.source === 'api') {
        var locals = typeof getLocalCollections === 'function' ? getLocalCollections() : [];
        // Pass 1: match by venue_uuid
        if (item.data.venue) {
            for (var i = 0; i < locals.length; i++) {
                if (locals[i].venue_uuid === item.data.venue && locals[i].phone_number) {
                    return locals[i].phone_number;
                }
            }
        }
        // Pass 2: match by video_id (always present in local collections)
        var apiId = item.data.venue || item.data.id;
        for (var i = 0; i < locals.length; i++) {
            if (locals[i].video_id && locals[i].video_id === apiId && locals[i].phone_number) {
                return locals[i].phone_number;
            }
        }
    }
    return '';
}

// =============================================================================
// Visit Status Helpers (Card + Bottom Sheet)
// =============================================================================

var _visitIncrementDebounce = null;

/**
 * Update the visit status UI on a card's visit column
 */
function _updateCardVisitUI(visitCol, visitStatus) {
    if (!visitCol) return;
    var wantBtn = visitCol.querySelector('.venue-card-visit-btn.want');
    var wentBtn = visitCol.querySelector('.venue-card-visit-btn.went');
    var trophy = visitCol.querySelector('.venue-card-trophy');

    if (wantBtn) wantBtn.classList.toggle('active', visitStatus && visitStatus.status === 'want_to_go');
    if (wentBtn) wentBtn.classList.toggle('active', visitStatus && visitStatus.status === 'went');

    if (trophy) {
        if (visitStatus && visitStatus.status === 'went' && visitStatus.visit_count > 0) {
            trophy.style.display = 'inline-flex';
            trophy.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> x' + visitStatus.visit_count;
        } else {
            trophy.style.display = 'none';
        }
    }
}

/**
 * Toggle visit status from a card button click
 */
function _toggleCardVisitStatus(venueId, newStatus, visitCol) {
    if (!venueId || typeof getLocalVisitStatus !== 'function') return;

    var current = getLocalVisitStatus(venueId);

    if (current && current.status === newStatus) {
        // Toggle off (clear)
        removeLocalVisitStatus(venueId);
        _updateCardVisitUI(visitCol, null);
        if (typeof removeVisitStatus === 'function') removeVisitStatus(venueId);
    } else if (newStatus === 'went') {
        var count = (current && current.status === 'went') ? current.visit_count : 0;
        setLocalVisitStatus(venueId, 'went', count + 1);
        var updated = getLocalVisitStatus(venueId);
        _updateCardVisitUI(visitCol, updated);
        if (typeof setVisitStatus === 'function') setVisitStatus(venueId, 'went', updated.visit_count);
    } else {
        setLocalVisitStatus(venueId, 'want_to_go', 0);
        _updateCardVisitUI(visitCol, getLocalVisitStatus(venueId));
        if (typeof setVisitStatus === 'function') setVisitStatus(venueId, 'want_to_go', 0);
    }
}

/**
 * Render visit status section in the bottom sheet
 */
function _renderVisitStatus(venueId) {
    var section = document.getElementById('venueSheetVisitSection');
    if (!section) return;

    var wantBtn = document.getElementById('visitBtnWant');
    var wentBtn = document.getElementById('visitBtnWent');
    var trophyBadge = document.getElementById('visitTrophyBadge');
    var trophyCount = document.getElementById('visitTrophyCount');
    var incrementBtn = document.getElementById('visitIncrementBtn');

    // Get current status
    var vs = venueId && typeof getLocalVisitStatus === 'function' ? getLocalVisitStatus(venueId) : null;

    // Update button states
    if (wantBtn) {
        wantBtn.classList.toggle('active', vs && vs.status === 'want_to_go');
        wantBtn.onclick = function() {
            if (vs && vs.status === 'want_to_go') {
                removeLocalVisitStatus(venueId);
                if (typeof removeVisitStatus === 'function') removeVisitStatus(venueId);
                vs = null;
            } else {
                setLocalVisitStatus(venueId, 'want_to_go', 0);
                if (typeof setVisitStatus === 'function') setVisitStatus(venueId, 'want_to_go', 0);
                vs = getLocalVisitStatus(venueId);
            }
            _renderVisitStatus(venueId);
            _syncCardVisitFromSheet(venueId);
        };
    }

    if (wentBtn) {
        wentBtn.classList.toggle('active', vs && vs.status === 'went');
        wentBtn.onclick = function() {
            if (vs && vs.status === 'went') {
                removeLocalVisitStatus(venueId);
                if (typeof removeVisitStatus === 'function') removeVisitStatus(venueId);
                vs = null;
            } else {
                var count = (vs && vs.status === 'went') ? vs.visit_count : 0;
                setLocalVisitStatus(venueId, 'went', count + 1);
                if (typeof setVisitStatus === 'function') setVisitStatus(venueId, 'went', count + 1);
                vs = getLocalVisitStatus(venueId);
            }
            _renderVisitStatus(venueId);
            _syncCardVisitFromSheet(venueId);
        };
    }

    // Trophy badge
    if (trophyBadge && trophyCount) {
        if (vs && vs.status === 'went' && vs.visit_count > 0) {
            trophyBadge.style.display = 'inline-flex';
            trophyCount.textContent = vs.visit_count + t('visitCountSuffix');
        } else {
            trophyBadge.style.display = 'none';
        }
    }

    // Increment button
    if (incrementBtn) {
        if (vs && vs.status === 'went') {
            incrementBtn.style.display = 'inline-block';
            incrementBtn.onclick = function() {
                if (_visitIncrementDebounce) return;
                _visitIncrementDebounce = setTimeout(function() { _visitIncrementDebounce = null; }, 500);

                var cur = getLocalVisitStatus(venueId);
                var newCount = (cur ? cur.visit_count : 0) + 1;
                setLocalVisitStatus(venueId, 'went', newCount);
                if (typeof setVisitStatus === 'function') setVisitStatus(venueId, 'went', newCount);
                _renderVisitStatus(venueId);
                _syncCardVisitFromSheet(venueId);
            };
        } else {
            incrementBtn.style.display = 'none';
        }
    }

    section.style.display = venueId ? '' : 'none';
}

/**
 * Sync card visit UI when bottom sheet status changes
 */
function _syncCardVisitFromSheet(venueId) {
    if (!venueId) return;
    var visitCols = document.querySelectorAll('.venue-card-visit-col[data-venue-id="' + venueId + '"]');
    var vs = typeof getLocalVisitStatus === 'function' ? getLocalVisitStatus(venueId) : null;
    visitCols.forEach(function(col) {
        _updateCardVisitUI(col, vs);
    });
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

    // Render visit status section
    _renderVisitStatus(venueId);

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

    // Render venue campaigns (API items only)
    if (typeof renderVenueCampaignsInSheet === 'function') {
        var venueCampaigns = (item.source === 'api' && typeof getVenueCampaigns === 'function')
            ? getVenueCampaigns(item.data) : [];
        renderVenueCampaignsInSheet(venueCampaigns);
    }

    // Reset scroll to top before showing
    var venueSheetEl = document.getElementById('venueSheet');
    if (venueSheetEl) venueSheetEl.scrollTop = 0;

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
 * Render action buttons (Call, Reserve, Taxi)
 */
function _renderActionButtons(item, info, venueId) {
    var actionsEl = document.getElementById('venueSheetActions');
    var callBtn = document.getElementById('venueActionCall');
    var reserveBtn = document.getElementById('venueActionReserve');
    var taxiBtn = document.getElementById('venueActionTaxi');
    var callSub = document.getElementById('venueCallSub');
    var reserveSub = document.getElementById('venueReserveSub');
    var hasActions = false;

    var reservationUrl = _getReservationUrl(item);
    var phoneNumber = _getPhoneNumber(item);
    var isReservable = info.reservable !== false;

    // --- Call button ---
    if (callBtn) {
        if (phoneNumber) {
            callBtn.href = 'tel:' + phoneNumber;
            callBtn.style.display = 'flex';
            callBtn.classList.remove('disabled');
            callBtn.onclick = function(e) {
                _logVenueAction('venue_call', venueId);
            };
            // Show "No Reservation" hint if venue is not reservable
            if (callSub) {
                if (!isReservable) {
                    callSub.textContent = t('noReservation');
                    callSub.style.display = 'block';
                } else {
                    callSub.style.display = 'none';
                }
            }
            hasActions = true;
        } else {
            callBtn.style.display = 'none';
        }
    }

    // --- Reserve button (always visible) ---
    if (reserveBtn) {
        if (reservationUrl) {
            // Has reservation URL - show as active link
            reserveBtn.href = reservationUrl;
            reserveBtn.style.display = 'flex';
            reserveBtn.classList.remove('disabled');
            reserveBtn.onclick = function(e) {
                _logVenueAction('venue_web_reserve', venueId);
            };
            if (reserveSub) reserveSub.style.display = 'none';
        } else {
            // No reservation URL - show disabled with disclaimer
            reserveBtn.href = '#';
            reserveBtn.style.display = 'flex';
            reserveBtn.classList.add('disabled');
            reserveBtn.onclick = function(e) { e.preventDefault(); };
            if (reserveSub) {
                reserveSub.textContent = t('notAvailable');
                reserveSub.style.display = 'block';
            }
        }
        hasActions = true;
    }

    // --- Taxi button (show if venue has address) ---
    if (taxiBtn) {
        if (info.address) {
            taxiBtn.style.display = 'flex';
            taxiBtn.onclick = function(e) {
                e.preventDefault();
                _openTaxiPicker(info.address, venueId);
            };
            hasActions = true;
        } else {
            taxiBtn.style.display = 'none';
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
        descEl.textContent = _stripHtml(info.description);
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
        if (info.reservable) services.push(t('reservationAvailable'));
        if (services.length > 0) {
            servicesEl.textContent = services.join(' \u00B7 ');
            servicesEl.style.display = 'block';
            hasDetails = true;
        } else {
            servicesEl.style.display = 'none';
        }
    }

    if (announcementEl) {
        announcementEl.textContent = _stripHtml(info.announcement);
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
    }
    // Fetch user's tags for both guests (localStorage) and logged-in (API)
    if (venueId && typeof fetchMyTags === 'function') {
        myTags = await fetchMyTags(venueId);
    }

    var hasAnyTags = Object.keys(tagCounts).length > 0 || myTags.length > 0;

    VENUE_TAGS.forEach(function(tagDef) {
        var count = tagCounts[tagDef.key] || 0;
        var isMyTag = myTags.indexOf(tagDef.key) !== -1;

        var pill = document.createElement('button');
        pill.className = 'venue-tag-pill' + (isMyTag ? ' active' : '');

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

        // Tags are now toggleable for all users (guests save to localStorage)
        if (venueId) {
            pill.addEventListener('click', function() {
                _toggleTag(venueId, tagDef.key, pill, count, isMyTag);
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

    // Always show the memo section and textarea (guests + logged-in)
    section.style.display = 'block';
    if (loggedInDiv) loggedInDiv.style.display = 'block';
    if (loginPrompt) loginPrompt.style.display = 'none';
    if (textarea) textarea.value = '';

    // Hint: "Only you can see this" for logged-in, "Register to keep forever" for guests
    if (hintEl) {
        hintEl.style.display = 'inline';
        hintEl.textContent = loggedIn ? t('memoPrivateHint') : t('memoLoginHint');
    }

    // Load existing memo (works for both - fetchMemo() now checks localStorage for guests)
    if (venueId && typeof fetchMemo === 'function') {
        var memo = await fetchMemo(venueId);
        if (memo && textarea) textarea.value = memo;
    }

    // Save handler (works for both - saveMemo() now saves to localStorage for guests)
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
function _buildTaxiUrl(serviceId) {
    switch (serviceId) {
        case 'uber':
            // Simple Universal Link - just opens Uber app
            // Address is copied to clipboard so user can paste destination
            return 'https://m.uber.com/ul/';

        case 'go-taxi':
            // Deep link to open GO app
            return 'mot-go://';

        default:
            return null;
    }
}

/**
 * Get web fallback URL for a service (used when deep link fails)
 */
function _getTaxiWebFallback(serviceId) {
    switch (serviceId) {
        case 'uber':
            // Primary URL is already web, no separate fallback needed
            return null;

        case 'go-taxi':
            return 'https://go.mo-t.com/';

        default:
            return null;
    }
}

/**
 * Open URL via anchor click (triggers Universal Link handling on mobile)
 * This is needed because window.open() doesn't trigger app handoffs on iOS/Android
 */
function _openUrlViaAnchor(url, openInNewTab) {
    var a = document.createElement('a');
    a.href = url;
    if (openInNewTab) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    }
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

    // Copy address to clipboard so user can paste in the app
    if (address) {
        var copied = await _copyToClipboard(address);
        if (copied && typeof showToast === 'function') {
            showToast(t('addressCopied'));
        }
    }

    // Build URL and open
    var url = _buildTaxiUrl(serviceId);

    if (url) {
        // Try deep link first for mobile (non-http URLs)
        if (service.hasDeepLink && url.indexOf('http') !== 0) {
            // For deep links, try to open and fallback to web if app not installed
            var fallbackUrl = _getTaxiWebFallback(serviceId);

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
            // Web URL - open via anchor click (triggers Universal Link on mobile)
            _openUrlViaAnchor(url, true);
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

// =============================================================================
// Settings Drawer (shared with index page)
// =============================================================================

/**
 * Initialize settings drawer functionality
 */
function initSettingsDrawer() {
    var gearBtn = document.getElementById('settingsGearBtn');
    var drawer = document.getElementById('settingsDrawer');
    var overlay = document.getElementById('settingsDrawerOverlay');
    var closeBtn = document.getElementById('settingsDrawerClose');
    var loginLink = document.getElementById('settingsLoginLink');
    var passwordResetLink = document.getElementById('settingsPasswordResetLink');
    var deleteAccountLink = document.getElementById('settingsDeleteAccountLink');
    var logoutBtn = document.getElementById('settingsLogoutBtn');

    if (!gearBtn || !drawer || !overlay) return;

    gearBtn.addEventListener('click', function() {
        openSettingsDrawer();
    });

    overlay.addEventListener('click', function() {
        closeSettingsDrawer();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeSettingsDrawer();
        });
    }

    // Login/Register link (guest)
    if (loginLink) {
        loginLink.addEventListener('click', function() {
            closeSettingsDrawer();
            if (typeof showAuthModal === 'function') {
                showAuthModal('login');
            }
        });
    }

    // Password Reset link
    if (passwordResetLink) {
        passwordResetLink.addEventListener('click', function() {
            closeSettingsDrawer();
            _showPasswordResetModal();
        });
    }

    // Delete Account link
    if (deleteAccountLink) {
        deleteAccountLink.addEventListener('click', function() {
            closeSettingsDrawer();
            _showDeleteAccountModal();
        });
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (typeof logout === 'function') {
                logout();
            }
            closeSettingsDrawer();
            // Reload page to reflect logged out state
            window.location.reload();
        });
    }

    // Initialize modals
    _initPasswordResetModal();
    _initDeleteAccountModal();
}

/**
 * Open settings drawer
 */
function openSettingsDrawer() {
    var drawer = document.getElementById('settingsDrawer');
    var overlay = document.getElementById('settingsDrawerOverlay');

    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');

    // Update account sections when opening
    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
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

// =============================================================================
// Password Reset Modal
// =============================================================================

function _showPasswordResetModal() {
    var modal = document.getElementById('passwordResetModal');
    if (!modal) return;

    // Reset state
    var formContainer = document.getElementById('passwordResetFormContainer');
    var errorEl = document.getElementById('resetPasswordError');
    var successEl = document.getElementById('resetPasswordSuccess');
    var emailInput = document.getElementById('resetEmail');
    var submitBtn = document.getElementById('resetPasswordSubmitBtn');

    if (formContainer) formContainer.style.display = 'block';
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
    if (successEl) successEl.style.display = 'none';
    if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('auth-btn-loading'); }

    // Pre-fill email from logged-in user
    if (emailInput && typeof getUser === 'function') {
        var user = getUser();
        if (user && user.email) {
            emailInput.value = user.email;
        }
    }

    modal.classList.add('show');
}

function _hidePasswordResetModal() {
    var modal = document.getElementById('passwordResetModal');
    if (modal) modal.classList.remove('show');
}

function _initPasswordResetModal() {
    var modal = document.getElementById('passwordResetModal');
    var closeBtn = document.getElementById('passwordResetModalClose');
    var overlay = document.getElementById('passwordResetModalOverlay');
    var submitBtn = document.getElementById('resetPasswordSubmitBtn');

    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            _hidePasswordResetModal();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function() {
            _hidePasswordResetModal();
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async function() {
            var emailInput = document.getElementById('resetEmail');
            var errorEl = document.getElementById('resetPasswordError');
            var successEl = document.getElementById('resetPasswordSuccess');
            var formContainer = document.getElementById('passwordResetFormContainer');

            if (!emailInput) return;

            var email = emailInput.value.trim();
            if (!email) {
                if (errorEl) {
                    errorEl.textContent = t('resetPasswordError') || 'Failed to send reset link. Please try again.';
                    errorEl.style.display = 'block';
                }
                return;
            }

            submitBtn.disabled = true;
            submitBtn.classList.add('auth-btn-loading');
            if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

            try {
                if (typeof requestPasswordReset === 'function') {
                    await requestPasswordReset(email);
                }

                // Show success
                if (formContainer) formContainer.style.display = 'none';
                if (successEl) successEl.style.display = 'block';

                // Auto-close after 3 seconds
                setTimeout(function() {
                    _hidePasswordResetModal();
                }, 3000);
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('auth-btn-loading');

                if (errorEl) {
                    if (err && err.detail && (err.detail.toLowerCase().includes('wait') || err.detail.toLowerCase().includes('too many'))) {
                        errorEl.textContent = t('resetPasswordRateLimit') || 'Too many requests. Please wait before trying again.';
                    } else if (err && err.detail) {
                        errorEl.textContent = err.detail;
                    } else {
                        errorEl.textContent = t('resetPasswordError') || 'Failed to send reset link. Please try again.';
                    }
                    errorEl.style.display = 'block';
                }
            }
        });
    }
}

// =============================================================================
// Delete Account Modal
// =============================================================================

function _showDeleteAccountModal() {
    var modal = document.getElementById('deleteAccountModal');
    if (modal) modal.classList.add('show');
}

function _hideDeleteAccountModal() {
    var modal = document.getElementById('deleteAccountModal');
    if (modal) modal.classList.remove('show');
}

function _initDeleteAccountModal() {
    var modal = document.getElementById('deleteAccountModal');
    var closeBtn = document.getElementById('deleteAccountModalClose');
    var overlay = document.getElementById('deleteAccountModalOverlay');
    var contactBtn = document.getElementById('deleteAccountContactBtn');

    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            _hideDeleteAccountModal();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function() {
            _hideDeleteAccountModal();
        });
    }

    if (contactBtn) {
        contactBtn.addEventListener('click', function() {
            var user = typeof getUser === 'function' ? getUser() : null;
            var subject = encodeURIComponent('Account Deletion Request');
            var body = encodeURIComponent('Please delete my account.\n\nAccount Email: ' + (user && user.email ? user.email : ''));
            window.location.href = 'mailto:info@omochiapp.com?subject=' + subject + '&body=' + body;
            _hideDeleteAccountModal();
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initCollectionsPage();
        initSettingsDrawer();
    });
} else {
    initCollectionsPage();
    initSettingsDrawer();
}
