/**
 * Category Selector Module
 * Top-level category switching (Food, Nightlife, Entertainment, etc.)
 * Currently only Food is active; others show "Coming soon!" toast.
 */

const CATEGORIES = [
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

let _currentCategory = 'food';
let _isCategoryStripOpen = false;

/**
 * Initialize category selector
 */
function initCategorySelector() {
    _currentCategory = localStorage.getItem('selectedCategory') || 'food';
    _renderCategoryTrigger();
    _renderCategoryStrip();
    _setupCategoryEvents();
}

/**
 * Render trigger button icon and label
 */
function _renderCategoryTrigger() {
    const category = CATEGORIES.find(c => c.id === _currentCategory);
    if (!category) return;

    const iconEl = document.getElementById('categoryTriggerIcon');
    const labelEl = document.getElementById('categoryTriggerLabel');

    if (iconEl) iconEl.innerHTML = category.icon;
    if (labelEl) {
        labelEl.setAttribute('data-i18n', category.nameKey);
        labelEl.textContent = typeof t === 'function' ? t(category.nameKey) : category.id;
    }
}

/**
 * Render strip with all category options
 */
function _renderCategoryStrip() {
    const stripInner = document.getElementById('categoryStripInner');
    if (!stripInner) return;

    stripInner.innerHTML = '';

    CATEGORIES.forEach(function(category) {
        var option = document.createElement('button');
        option.className = 'category-option';
        option.dataset.categoryId = category.id;

        if (category.id === _currentCategory) option.classList.add('active');
        if (category.comingSoon) option.classList.add('coming-soon');

        var label = typeof t === 'function' ? t(category.nameKey) : category.id;

        option.innerHTML =
            '<span class="category-option-icon">' + category.icon + '</span>' +
            '<span class="category-option-label" data-i18n="' + category.nameKey + '">' + label + '</span>';

        option.addEventListener('click', function() {
            _handleCategoryClick(category);
        });

        stripInner.appendChild(option);
    });
}

/**
 * Handle category click
 */
function _handleCategoryClick(category) {
    if (category.comingSoon) {
        var msg = typeof t === 'function' ? t('categoryComingSoon') : 'Coming soon!';
        if (typeof showToast === 'function') {
            showToast(msg);
        }
        return;
    }

    if (category.id === _currentCategory) {
        _closeCategoryStrip();
        return;
    }

    _currentCategory = category.id;
    localStorage.setItem('selectedCategory', category.id);
    _updateCategoryUI();
    _closeCategoryStrip();

    if (typeof logAnalyticsEvent === 'function') {
        logAnalyticsEvent('category_select', category.id);
    }
}

/**
 * Update active states on trigger and options
 */
function _updateCategoryUI() {
    _renderCategoryTrigger();

    document.querySelectorAll('.category-option').forEach(function(el) {
        el.classList.toggle('active', el.dataset.categoryId === _currentCategory);
    });
}

/**
 * Toggle strip open/close
 */
function _toggleCategoryStrip() {
    if (_isCategoryStripOpen) {
        _closeCategoryStrip();
    } else {
        _openCategoryStrip();
    }
}

function _openCategoryStrip() {
    _isCategoryStripOpen = true;
    var trigger = document.getElementById('categoryTrigger');
    var strip = document.getElementById('categoryStrip');
    var overlay = document.getElementById('categoryStripOverlay');
    var collectionSel = document.getElementById('collectionSelector');
    var locationSel = document.getElementById('locationSelector');

    if (trigger) trigger.classList.add('active');
    if (strip) strip.classList.add('active');
    if (overlay) overlay.classList.add('active');
    if (collectionSel) collectionSel.classList.add('strip-open');
    if (locationSel) locationSel.classList.add('strip-open');
}

function _closeCategoryStrip() {
    _isCategoryStripOpen = false;
    var trigger = document.getElementById('categoryTrigger');
    var strip = document.getElementById('categoryStrip');
    var overlay = document.getElementById('categoryStripOverlay');
    var collectionSel = document.getElementById('collectionSelector');
    var locationSel = document.getElementById('locationSelector');

    if (trigger) trigger.classList.remove('active');
    if (strip) strip.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (collectionSel) collectionSel.classList.remove('strip-open');
    if (locationSel) locationSel.classList.remove('strip-open');
}

/**
 * Set up event listeners
 */
function _setupCategoryEvents() {
    var trigger = document.getElementById('categoryTrigger');
    if (trigger) {
        trigger.addEventListener('click', _toggleCategoryStrip);
    }

    var overlay = document.getElementById('categoryStripOverlay');
    if (overlay) {
        overlay.addEventListener('click', _closeCategoryStrip);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && _isCategoryStripOpen) {
            _closeCategoryStrip();
        }
    });
}

/**
 * Update labels on language change
 */
function updateCategoryNames() {
    _renderCategoryTrigger();

    document.querySelectorAll('.category-option-label').forEach(function(label) {
        var key = label.getAttribute('data-i18n');
        if (key && typeof t === 'function') {
            label.textContent = t(key);
        }
    });
}
