// =============================================================================
// My Collections Page Logic
// =============================================================================

/**
 * Initialize the collections page
 */
async function initCollectionsPage() {
    const loadingEl = document.getElementById('collectionsLoading');
    const authRequiredEl = document.getElementById('collectionsAuthRequired');
    const emptyEl = document.getElementById('collectionsEmpty');
    const cardsListEl = document.getElementById('venueCardsList');

    // Check if user is logged in
    if (!isLoggedIn()) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (authRequiredEl) authRequiredEl.style.display = 'block';
        _setupLoginButton();
        return;
    }

    // Fetch stocked venues
    try {
        const response = await apiGet('/api/stocked-venues/');

        if (response.status === 401) {
            // Token expired and refresh failed
            if (loadingEl) loadingEl.style.display = 'none';
            if (authRequiredEl) authRequiredEl.style.display = 'block';
            _setupLoginButton();
            return;
        }

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const venues = await response.json();

        if (loadingEl) loadingEl.style.display = 'none';

        if (!venues || venues.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        // Render venue cards
        if (cardsListEl) {
            cardsListEl.style.display = 'flex';
            venues.forEach(stockedVenue => {
                const card = createVenueCard(stockedVenue);
                cardsListEl.appendChild(card);
            });
        }

    } catch (err) {
        console.error('Failed to load collections:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) {
            emptyEl.style.display = 'block';
            const p = emptyEl.querySelector('p');
            if (p) p.textContent = t('errorLoading') || 'Error loading data';
        }
    }
}

/**
 * Create a venue card element
 * @param {Object} stockedVenue - Stocked venue object from API
 * @returns {HTMLElement} Card element
 */
function createVenueCard(stockedVenue) {
    const venue = stockedVenue.venue_details || {};
    const card = document.createElement('div');
    card.className = 'venue-card';
    card.dataset.stockedVenueId = stockedVenue.id;

    // Logo
    const logoDiv = document.createElement('div');
    logoDiv.className = 'venue-card-logo';
    if (venue.logo) {
        const img = document.createElement('img');
        img.src = venue.logo;
        img.alt = venue.name || '';
        img.onerror = function() {
            this.style.display = 'none';
            const placeholder = document.createElement('span');
            placeholder.className = 'venue-card-logo-placeholder';
            placeholder.textContent = '🍽️';
            this.parentNode.appendChild(placeholder);
        };
        logoDiv.appendChild(img);
    } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'venue-card-logo-placeholder';
        placeholder.textContent = '🍽️';
        logoDiv.appendChild(placeholder);
    }

    // Info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'venue-card-info';

    const name = document.createElement('div');
    name.className = 'venue-card-name';
    name.textContent = venue.name || 'Unknown Venue';

    infoDiv.appendChild(name);

    if (venue.genre) {
        const genre = document.createElement('div');
        genre.className = 'venue-card-genre';
        genre.textContent = venue.genre;
        infoDiv.appendChild(genre);
    }

    if (venue.nearest_station) {
        const station = document.createElement('div');
        station.className = 'venue-card-station';
        station.textContent = '📍 ' + venue.nearest_station;
        infoDiv.appendChild(station);
    }

    if (venue.address) {
        const address = document.createElement('div');
        address.className = 'venue-card-address';
        address.textContent = venue.address;
        infoDiv.appendChild(address);
    }

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'venue-card-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = t('removeVenue') || 'Remove';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeVenue(stockedVenue.id, card);
    });

    card.appendChild(logoDiv);
    card.appendChild(infoDiv);
    card.appendChild(removeBtn);

    // Click card to visit venue website if available
    if (venue.website) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.open(venue.website, '_blank');
        });
    }

    return card;
}

/**
 * Remove a venue from the user's collection
 * @param {string} stockedVenueId - The stocked venue record ID
 * @param {HTMLElement} cardElement - The card DOM element
 */
async function removeVenue(stockedVenueId, cardElement) {
    try {
        const response = await apiDelete(`/api/stocked-venues/${stockedVenueId}/`);

        if (response.ok || response.status === 204) {
            // Animate removal
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'translateX(100%)';
            setTimeout(() => {
                cardElement.remove();
                // Check if list is now empty
                const cardsList = document.getElementById('venueCardsList');
                if (cardsList && cardsList.children.length === 0) {
                    cardsList.style.display = 'none';
                    const emptyEl = document.getElementById('collectionsEmpty');
                    if (emptyEl) emptyEl.style.display = 'block';
                }
            }, 300);
        } else {
            console.error('Failed to remove venue:', response.status);
        }
    } catch (err) {
        console.error('Remove venue error:', err);
    }
}

/**
 * Set up the login button on the auth-required state
 */
function _setupLoginButton() {
    const loginBtn = document.getElementById('collectionsLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            showAuthModal('login');
        });
    }
}

// Override the post-auth callback to reload collections after login
const _originalHandlePendingCollect = typeof _handlePendingCollect === 'function' ? _handlePendingCollect : null;

// After successful login on this page, reload the collections
function _handlePendingCollect() {
    if (_originalHandlePendingCollect) _originalHandlePendingCollect();
    // Reload the page to show collections after login
    window.location.reload();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollectionsPage);
} else {
    initCollectionsPage();
}
