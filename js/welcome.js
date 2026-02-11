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
 * @returns {boolean} True if modal was shown
 */
function showWelcomeModal() {
    if (!shouldShowWelcomeModal()) {
        // If modal not shown, trigger swipe hint directly
        if (typeof showSwipeHint === 'function') {
            showSwipeHint();
        }
        return false;
    }

    const modal = document.getElementById('welcomeModal');
    if (!modal) {
        if (typeof showSwipeHint === 'function') {
            showSwipeHint();
        }
        return false;
    }

    modal.classList.add('show');
    localStorage.setItem('welcomeModalLastShown', new Date().toISOString());
    return true;
}

/**
 * Close the welcome modal
 */
function closeWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.classList.remove('show');
    }

    // Show swipe hint after welcome modal closes
    if (typeof showSwipeHint === 'function') {
        showSwipeHint();
    }
}

/**
 * Reopen the welcome modal (manual trigger from "How to Use" tab)
 */
function reopenWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (!modal) return;

    modal.classList.add('show');
}

/**
 * Initialize welcome modal event listeners
 */
function initWelcomeModal() {
    const closeBtn = document.getElementById('welcomeModalClose');
    const overlay = document.getElementById('welcomeModalOverlay');
    const getStartedBtn = document.getElementById('welcomeGetStarted');
    const tabHowToUseBtn = document.getElementById('tabHowToUseBtn');

    if (closeBtn) closeBtn.addEventListener('click', closeWelcomeModal);
    if (overlay) overlay.addEventListener('click', closeWelcomeModal);
    if (getStartedBtn) getStartedBtn.addEventListener('click', closeWelcomeModal);
    if (tabHowToUseBtn) tabHowToUseBtn.addEventListener('click', reopenWelcomeModal);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWelcomeModal);
} else {
    initWelcomeModal();
}
