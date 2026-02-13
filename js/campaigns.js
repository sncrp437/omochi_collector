// =============================================================================
// Campaigns Module - Global + Venue Campaign Display
// =============================================================================

// Session cache
var _campaigns = [];
var _currentCampaignIndex = 0;

// =============================================================================
// Data Fetching
// =============================================================================

/**
 * Fetch campaigns from /api/campaigns/
 * Returns global + up to 5 venue-specific campaigns (server-filtered)
 */
async function fetchCampaigns() {
    if (typeof isLoggedIn !== 'function' || !isLoggedIn()) return [];
    try {
        var response = await apiGet('/api/campaigns/');
        if (response.ok) {
            var data = await response.json();
            _campaigns = Array.isArray(data) ? data : (data.results || []);
            return _campaigns;
        }
    } catch (err) {
        console.warn('[campaigns] Failed to fetch:', err);
    }
    return [];
}

/**
 * Get cached campaigns
 */
function getCachedCampaigns() {
    return _campaigns;
}

/**
 * Extract venue campaigns from a stocked-venue API item
 */
function getVenueCampaigns(apiItem) {
    return (apiItem && Array.isArray(apiItem.campaigns)) ? apiItem.campaigns : [];
}

// =============================================================================
// Session Control
// =============================================================================

function shouldShowCampaignModal() {
    return !sessionStorage.getItem('campaign_modal_shown');
}

function markCampaignModalShown() {
    sessionStorage.setItem('campaign_modal_shown', 'true');
}

// =============================================================================
// Campaign Modal
// =============================================================================

/**
 * Load campaigns and show modal if applicable (called from initCollectionsPage)
 */
async function loadAndShowGlobalCampaigns() {
    var campaigns = await fetchCampaigns();
    if (campaigns.length === 0) return;

    // Show notification bell with campaign indicator
    if (typeof showNotificationBell === 'function') {
        showNotificationBell();
    }

    // Auto-show modal once per session
    if (shouldShowCampaignModal()) {
        _renderCampaignModal(campaigns);
        openCampaignModal();
        markCampaignModalShown();
    }
}

/**
 * Render campaign modal slides
 */
function _renderCampaignModal(campaigns) {
    var carousel = document.getElementById('campaignCarousel');
    var dotsContainer = document.getElementById('campaignDots');
    if (!carousel) return;

    carousel.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';
    _currentCampaignIndex = 0;

    var lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';

    campaigns.forEach(function(campaign, i) {
        var slide = document.createElement('div');
        slide.className = 'campaign-slide';
        if (i > 0) slide.style.display = 'none';

        // Venue name
        var venueName = campaign.target_venue ? campaign.target_venue.name : '';
        if (venueName) {
            var venueEl = document.createElement('div');
            venueEl.className = 'campaign-slide-venue';
            venueEl.textContent = venueName;
            slide.appendChild(venueEl);
        }

        // Image carousel
        if (campaign.image_urls && campaign.image_urls.length > 0) {
            var imgCarousel = _createImageCarousel(campaign.image_urls, 'campaign-img-' + i);
            slide.appendChild(imgCarousel);
        }

        // Deadline badge
        if (campaign.end_date) {
            var badge = document.createElement('span');
            badge.className = 'campaign-deadline-badge';
            badge.textContent = t('campaignDeadlinePrefix') + campaign.end_date;
            slide.appendChild(badge);
        }

        // Title
        var titleEl = document.createElement('div');
        titleEl.className = 'campaign-slide-title';
        titleEl.textContent = campaign.title || '';
        slide.appendChild(titleEl);

        // Description
        if (campaign.description) {
            var descEl = document.createElement('div');
            descEl.className = 'campaign-slide-description';
            descEl.textContent = campaign.description;
            slide.appendChild(descEl);
        }

        carousel.appendChild(slide);
    });

    // Campaign navigation dots (only if > 1)
    if (campaigns.length > 1 && dotsContainer) {
        campaigns.forEach(function(_, i) {
            var dot = document.createElement('button');
            dot.className = 'campaign-dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', function() {
                _goToCampaignSlide(i, campaigns.length);
            });
            dotsContainer.appendChild(dot);
        });
    }

    // Update CTA button for first campaign
    _updateCampaignCta(campaigns[0]);
}

/**
 * Navigate to a specific campaign slide
 */
function _goToCampaignSlide(index, total) {
    var carousel = document.getElementById('campaignCarousel');
    var dotsContainer = document.getElementById('campaignDots');
    if (!carousel) return;

    _currentCampaignIndex = index;
    var slides = carousel.querySelectorAll('.campaign-slide');
    slides.forEach(function(s, i) {
        s.style.display = i === index ? 'flex' : 'none';
    });

    // Update dots
    if (dotsContainer) {
        var dots = dotsContainer.querySelectorAll('.campaign-dot');
        dots.forEach(function(d, i) {
            d.classList.toggle('active', i === index);
        });
    }

    // Update CTA
    if (_campaigns[index]) {
        _updateCampaignCta(_campaigns[index]);
    }
}

/**
 * Update the CTA button for the current campaign
 */
function _updateCampaignCta(campaign) {
    var ctaBtn = document.getElementById('campaignCtaBtn');
    if (!ctaBtn) return;

    if (campaign.cta_link) {
        ctaBtn.textContent = t('campaignViewDetails');
        ctaBtn.style.display = 'block';
        ctaBtn.onclick = function() {
            window.open(campaign.cta_link, '_blank', 'noopener,noreferrer');
            _logCampaignEvent('campaign_cta_click', campaign.id);
        };
    } else if (campaign.target_venue && campaign.target_venue.id) {
        ctaBtn.textContent = t('campaignViewDetails');
        ctaBtn.style.display = 'block';
        ctaBtn.onclick = function() {
            var appUrl = 'https://d25ayioio4kluj.cloudfront.net/store/' + campaign.target_venue.id;
            window.open(appUrl, '_blank', 'noopener,noreferrer');
            _logCampaignEvent('campaign_cta_click', campaign.id);
        };
    } else {
        ctaBtn.style.display = 'none';
    }
}

/**
 * Open campaign modal
 */
function openCampaignModal() {
    var modal = document.getElementById('campaignModal');
    if (!modal) return;

    // Re-render if campaigns exist but slides are empty
    var carousel = document.getElementById('campaignCarousel');
    if (carousel && !carousel.children.length && _campaigns.length > 0) {
        _renderCampaignModal(_campaigns);
    }

    modal.classList.add('show');
    _logCampaignEvent('campaign_modal_view', _campaigns.length > 0 ? _campaigns[0].id : '');
}

/**
 * Close campaign modal
 */
function closeCampaignModal() {
    var modal = document.getElementById('campaignModal');
    if (modal) modal.classList.remove('show');
}

// Setup campaign modal close handlers (called once)
function _initCampaignModal() {
    var closeBtn = document.getElementById('campaignModalClose');
    var overlay = document.getElementById('campaignModalOverlay');

    if (closeBtn) closeBtn.addEventListener('click', closeCampaignModal);
    if (overlay) overlay.addEventListener('click', closeCampaignModal);

    // Swipe between campaigns
    var carousel = document.getElementById('campaignCarousel');
    if (carousel) {
        var startX = 0;
        carousel.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
        }, { passive: true });
        carousel.addEventListener('touchend', function(e) {
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) {
                var total = _campaigns.length;
                if (dx < 0 && _currentCampaignIndex < total - 1) {
                    _goToCampaignSlide(_currentCampaignIndex + 1, total);
                } else if (dx > 0 && _currentCampaignIndex > 0) {
                    _goToCampaignSlide(_currentCampaignIndex - 1, total);
                }
            }
        }, { passive: true });
    }
}

// =============================================================================
// Image Carousel (reusable for campaigns and bottom sheet)
// =============================================================================

/**
 * Create an image carousel element
 * @param {Array} imageUrls - Array of image URL strings
 * @param {string} containerId - Unique ID prefix for this carousel
 * @returns {HTMLElement} The carousel wrapper
 */
function _createImageCarousel(imageUrls, containerId) {
    var wrapper = document.createElement('div');
    wrapper.className = 'campaign-img-wrapper';

    if (!imageUrls || imageUrls.length === 0) return wrapper;

    var track = document.createElement('div');
    track.className = 'campaign-slide-images';
    track.id = containerId + '-track';

    imageUrls.forEach(function(url) {
        var img = document.createElement('img');
        img.src = url;
        img.alt = t('campaignLatestInfo');
        img.loading = 'lazy';
        img.onerror = function() { this.style.display = 'none'; };
        track.appendChild(img);
    });

    wrapper.appendChild(track);

    // Dots (only if > 1 image)
    if (imageUrls.length > 1) {
        var dotsRow = document.createElement('div');
        dotsRow.className = 'campaign-image-dots';
        var currentSlide = 0;

        imageUrls.forEach(function(_, i) {
            var dot = document.createElement('button');
            dot.className = 'campaign-image-dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', function() {
                var imgWidth = track.querySelector('img') ? track.querySelector('img').offsetWidth : track.offsetWidth;
                track.scrollTo({ left: imgWidth * i, behavior: 'smooth' });
            });
            dotsRow.appendChild(dot);
        });

        // Update dots on scroll
        track.addEventListener('scroll', function() {
            var imgWidth = track.querySelector('img') ? track.querySelector('img').offsetWidth : track.offsetWidth;
            if (imgWidth <= 0) return;
            var newIndex = Math.round(track.scrollLeft / imgWidth);
            if (newIndex !== currentSlide) {
                currentSlide = newIndex;
                var dots = dotsRow.querySelectorAll('.campaign-image-dot');
                dots.forEach(function(d, di) {
                    d.classList.toggle('active', di === newIndex);
                });
            }
        }, { passive: true });

        wrapper.appendChild(dotsRow);
    }

    return wrapper;
}

// =============================================================================
// Venue Campaigns in Bottom Sheet
// =============================================================================

/**
 * Render campaign section inside the venue bottom sheet
 */
function renderVenueCampaignsInSheet(campaigns) {
    var section = document.getElementById('venueSheetCampaigns');
    var list = document.getElementById('venueSheetCampaignList');
    if (!section || !list) return;

    list.innerHTML = '';

    if (!campaigns || campaigns.length === 0) {
        section.style.display = 'none';
        return;
    }

    campaigns.forEach(function(campaign, i) {
        var card = document.createElement('div');
        card.className = 'venue-campaign-card';

        // Deadline badge
        if (campaign.end_date) {
            var badge = document.createElement('span');
            badge.className = 'venue-campaign-card-deadline';
            badge.textContent = t('campaignDeadlinePrefix') + campaign.end_date;
            card.appendChild(badge);
        }

        // Title
        var titleEl = document.createElement('div');
        titleEl.className = 'venue-campaign-card-title';
        titleEl.textContent = campaign.title || '';
        card.appendChild(titleEl);

        // Images
        if (campaign.image_urls && campaign.image_urls.length > 0) {
            var imgCarousel = _createImageCarousel(campaign.image_urls, 'venue-campaign-img-' + i);
            card.appendChild(imgCarousel);
        }

        // Description
        if (campaign.description) {
            var descEl = document.createElement('div');
            descEl.className = 'venue-campaign-card-desc';
            var text = campaign.description;
            if (text.length > 200) text = text.substring(0, 200) + '...';
            descEl.textContent = text;
            card.appendChild(descEl);
        }

        // CTA
        if (campaign.cta_link) {
            var ctaEl = document.createElement('a');
            ctaEl.className = 'venue-campaign-cta';
            ctaEl.href = campaign.cta_link;
            ctaEl.target = '_blank';
            ctaEl.rel = 'noopener noreferrer';
            ctaEl.textContent = t('campaignViewDetails');
            ctaEl.addEventListener('click', function() {
                _logCampaignEvent('venue_campaign_cta_click', campaign.id);
            });
            card.appendChild(ctaEl);
        }

        list.appendChild(card);
    });

    section.style.display = 'block';
    _logCampaignEvent('venue_campaign_view', campaigns[0].id);
}

// =============================================================================
// Analytics
// =============================================================================

function _logCampaignEvent(eventType, campaignId) {
    if (typeof logAnalyticsEvent === 'function') {
        logAnalyticsEvent(eventType, campaignId || '');
    }
}

// =============================================================================
// Init (called on DOMContentLoaded via my-collections.js integration)
// =============================================================================

function initCampaignModule() {
    _initCampaignModal();
}
