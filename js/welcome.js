/**
 * Welcome Modal Module
 * Shows a welcome message once per day
 */

/**
 * Check if welcome modal should be shown
 * @returns {boolean} True if modal should be shown
 */
function shouldShowWelcomeModal() {
    const lastShown = localStorage.getItem('welcomeModalLastShown');
    if (!lastShown) return true;

    const lastShownDate = new Date(lastShown).toDateString();
    const today = new Date().toDateString();

    return lastShownDate !== today;
}

/**
 * Show the welcome modal
 * @param {string} collectionName - Name of current collection
 */
function showWelcomeModal(collectionName) {
    if (!shouldShowWelcomeModal()) return;

    const modal = document.getElementById('welcomeModal');
    if (!modal) return;

    const collectionNameEl = document.getElementById('welcomeCollectionName');

    if (collectionNameEl) {
        collectionNameEl.textContent = collectionName || (typeof t === 'function' ? t('allVideos') : 'All Videos');
    }

    modal.classList.add('show');
    localStorage.setItem('welcomeModalLastShown', new Date().toISOString());
}

/**
 * Close the welcome modal
 */
function closeWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

/**
 * Reopen the welcome modal (manual trigger)
 */
function reopenWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (!modal) return;

    const collectionName = typeof getCurrentCollectionName === 'function'
        ? getCurrentCollectionName()
        : (typeof t === 'function' ? t('allVideos') : 'All Videos');

    const collectionNameEl = document.getElementById('welcomeCollectionName');
    if (collectionNameEl) {
        collectionNameEl.textContent = collectionName;
    }

    modal.classList.add('show');
}

/**
 * Initialize welcome modal event listeners
 */
function initWelcomeModal() {
    const closeBtn = document.getElementById('welcomeModalClose');
    const overlay = document.getElementById('welcomeModalOverlay');
    const getStartedBtn = document.getElementById('welcomeGetStarted');
    const tabInfoBtn = document.getElementById('tabInfoBtn');

    if (closeBtn) closeBtn.addEventListener('click', closeWelcomeModal);
    if (overlay) overlay.addEventListener('click', closeWelcomeModal);
    if (getStartedBtn) getStartedBtn.addEventListener('click', closeWelcomeModal);
    if (tabInfoBtn) tabInfoBtn.addEventListener('click', reopenWelcomeModal);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWelcomeModal);
} else {
    initWelcomeModal();
}
