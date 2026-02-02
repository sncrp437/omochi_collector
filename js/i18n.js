/**
 * Internationalization (i18n) module for language switching
 * Supports English and Japanese
 */

// Language translations
const translations = {
    en: {
        // Index page
        loading: 'Loading...',
        noVideos: 'No videos available',
        errorLoading: 'Error loading videos',
        signInTitle: 'Sign in to continue',
        signInMessage: 'Please log in or register to collect videos and save your favorites.',
        loginBtn: 'Log In',
        registerBtn: 'Register',
        collectBtn: 'Collect',

        // Collect page
        backBtn: 'Back',
        collectionTitle: 'Your Collection',
        collectedTitle: 'Item Collected!',
        collectedMessage: 'Your item has been successfully added to your collection.',
        continueBrowsing: 'Continue Browsing',

        // Collections
        allVideos: 'All Videos',
        noVideosInCollection: 'No videos in this collection',

        // Welcome Modal
        welcomeTitle: 'Welcome to Food Discovery',
        welcomeAboutTitle: 'About',
        welcomeAboutText: 'Discover amazing restaurants and food venues through vertical video stories.',
        welcomeHowToTitle: 'How to Use',
        welcomeSwipe: 'Swipe up/down to browse videos',
        welcomeCollect: 'Tap "Collect" to save favorites',
        welcomeCollections: 'Select collections at the top to filter',
        welcomeLanguage: 'Switch languages in the top right',
        welcomeNowShowing: 'Now showing:',
        welcomeGetStarted: 'Get Started',

        // Language selector
        language: 'Language',
        english: 'English',
        japanese: '日本語',

        // Auth forms
        loginTitle: 'Log In',
        registerTitle: 'Create Account',
        emailPlaceholder: 'Email',
        passwordPlaceholder: 'Password',
        passwordConfirmPlaceholder: 'Confirm Password',
        firstNamePlaceholder: 'First Name',
        lastNamePlaceholder: 'Last Name',
        phonePlaceholder: 'Phone Number',
        prefecturePlaceholder: 'Prefecture',
        cityPlaceholder: 'City',
        addressDetailPlaceholder: 'Address Detail',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        logoutBtn: 'Log Out',
        loginError: 'Invalid email or password',
        registerError: 'Registration failed. Please check your details.',
        passwordMismatch: 'Passwords do not match',
        passwordLength: 'Password must be 6-12 characters',

        // My Collections page
        myCollectionsTitle: 'My Collections',
        loginToViewCollections: 'Please log in to view your saved venues.',
        noSavedVenues: "You haven't saved any venues yet.",
        discoverVenues: 'Discover Venues',
        collected: 'Collected!',
        removeVenue: 'Remove',

        // Errors
        networkError: 'Network error. Please check your connection.',

        // Bottom tab bar
        infoTab: 'Info',
        homeTab: 'Home',
        collectionsTab: 'Collections',

        // Auth status
        loggedIn: 'Logged in!',

        // Toast / Local collections
        collectSaved: 'Saved to collection!',
        alreadyCollected: 'Already in your collection',
        registerToKeepCollections: 'Register (free) to keep your collections permanently and access them from any device.',

        // Collection filters
        allGenres: 'All',
        allLocations: 'All',
        cuisineLabel: 'Cuisine',
        areaLabel: 'Area',

        // AI Smart Search
        aiSearchPlaceholder: 'What are you in the mood for?',
        aiSearchGo: 'Go',
        aiSearchCancel: 'Cancel',
        aiSorting: 'Finding best matches...',
        aiUnavailable: 'AI search is loading, please try again shortly.',
        aiNoMatches: 'No matching venues found',
        aiFilterLabel: 'AI',

        // Puter disclaimer
        puterDisclaimerTitle: 'AI Search Disclaimer',
        puterDisclaimerText: 'AI search is powered by Puter.js. You may be asked to create a free Puter account (one-time only). No personal information from this app is shared — only restaurant names are sent for searching.',
        puterDisclaimerContinue: 'Continue',
        puterDisclaimerCancel: 'Cancel',

        // Venue tags & memos
        communityTags: 'Community Tags',
        myNotes: 'My Notes',
        memoPlaceholder: 'Add a personal note about this venue...',
        saveMemo: 'Save',
        memoSaved: 'Note saved!',
        memoSaveFailed: 'Failed to save note',
        tagAdded: 'Tag added!',
        tagRemoved: 'Tag removed',
        tagFailed: 'Failed to update tag',
        loginToTag: 'Log in to add tags',
        loginToMemo: 'Log in to save notes',
        noTagsYet: 'No community tags yet. Be the first!',
        tagCount: 'person',
        tagCountPlural: 'people',
        closeBtn: 'Close',
        venueDetails: 'Venue Details'
    },
    ja: {
        // Index page
        loading: '読み込み中...',
        noVideos: '動画がありません',
        errorLoading: '動画の読み込みエラー',
        signInTitle: 'ログインしてください',
        signInMessage: 'ビデオをコレクションに追加してお気に入りを保存するには、ログインまたは登録してください。',
        loginBtn: 'ログイン',
        registerBtn: '登録',
        collectBtn: 'コレクション',

        // Collect page
        backBtn: '戻る',
        collectionTitle: 'あなたのコレクション',
        collectedTitle: 'アイテムを追加しました！',
        collectedMessage: 'アイテムがコレクションに正常に追加されました。',
        continueBrowsing: '続けて見る',

        // Collections
        allVideos: 'すべての動画',
        noVideosInCollection: 'このコレクションには動画がありません',

        // Welcome Modal
        welcomeTitle: 'フードディスカバリーへようこそ',
        welcomeAboutTitle: 'について',
        welcomeAboutText: '縦型動画で素晴らしいレストランや飲食店を発見しましょう。',
        welcomeHowToTitle: '使い方',
        welcomeSwipe: '上下にスワイプして動画を閲覧',
        welcomeCollect: '「コレクション」をタップしてお気に入りを保存',
        welcomeCollections: '上部でコレクションを選択してフィルタリング',
        welcomeLanguage: '右上で言語を切り替え',
        welcomeNowShowing: '現在表示中:',
        welcomeGetStarted: '始める',

        // Language selector
        language: '言語',
        english: 'English',
        japanese: '日本語',

        // Auth forms
        loginTitle: 'ログイン',
        registerTitle: 'アカウント作成',
        emailPlaceholder: 'メールアドレス',
        passwordPlaceholder: 'パスワード',
        passwordConfirmPlaceholder: 'パスワード確認',
        firstNamePlaceholder: '名',
        lastNamePlaceholder: '姓',
        phonePlaceholder: '電話番号',
        prefecturePlaceholder: '都道府県',
        cityPlaceholder: '市区町村',
        addressDetailPlaceholder: '番地・建物名',
        noAccount: 'アカウントをお持ちでない方',
        hasAccount: 'アカウントをお持ちの方',
        logoutBtn: 'ログアウト',
        loginError: 'メールアドレスまたはパスワードが正しくありません',
        registerError: '登録に失敗しました。入力内容をご確認ください。',
        passwordMismatch: 'パスワードが一致しません',
        passwordLength: 'パスワードは6〜12文字で入力してください',

        // My Collections page
        myCollectionsTitle: 'マイコレクション',
        loginToViewCollections: '保存した店舗を表示するにはログインしてください。',
        noSavedVenues: 'まだ保存した店舗がありません。',
        discoverVenues: '店舗を探す',
        collected: 'コレクション済み！',
        removeVenue: '削除',

        // Errors
        networkError: 'ネットワークエラー。接続を確認してください。',

        // Bottom tab bar
        infoTab: '情報',
        homeTab: 'ホーム',
        collectionsTab: 'コレクション',

        // Auth status
        loggedIn: 'ログインしました！',

        // Toast / Local collections
        collectSaved: 'コレクションに保存しました！',
        alreadyCollected: 'すでにコレクションに追加済みです',
        registerToKeepCollections: '無料登録でコレクションを永久保存。どのデバイスからでもアクセスできます。',

        // Collection filters
        allGenres: 'すべて',
        allLocations: 'すべて',
        cuisineLabel: '料理',
        areaLabel: 'エリア',

        // AI Smart Search
        aiSearchPlaceholder: 'どんな気分？',
        aiSearchGo: '検索',
        aiSearchCancel: '戻る',
        aiSorting: 'おすすめを検索中...',
        aiUnavailable: 'AI検索を読み込み中です。しばらくしてからお試しください。',
        aiNoMatches: '一致する店舗が見つかりません',
        aiFilterLabel: 'AI',

        // Puter disclaimer
        puterDisclaimerTitle: 'AI検索について',
        puterDisclaimerText: 'AI検索はPuter.jsを利用しています。無料のPuterアカウント作成が求められる場合があります（初回のみ）。このアプリの個人情報は一切共有されません。検索のためにレストラン名のみが送信されます。',
        puterDisclaimerContinue: '続ける',
        puterDisclaimerCancel: 'キャンセル',

        // Venue tags & memos
        communityTags: 'みんなのタグ',
        myNotes: 'マイメモ',
        memoPlaceholder: 'この店舗についてメモを追加...',
        saveMemo: '保存',
        memoSaved: 'メモを保存しました！',
        memoSaveFailed: 'メモの保存に失敗しました',
        tagAdded: 'タグを追加しました！',
        tagRemoved: 'タグを削除しました',
        tagFailed: 'タグの更新に失敗しました',
        loginToTag: 'タグを追加するにはログインしてください',
        loginToMemo: 'メモを保存するにはログインしてください',
        noTagsYet: 'まだタグがありません。最初のタグを追加しましょう！',
        tagCount: '人',
        tagCountPlural: '人',
        closeBtn: '閉じる',
        venueDetails: '店舗詳細'
    }
};

// Current language (default: English)
let currentLanguage = localStorage.getItem('language') || 'en';

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
function t(key) {
    return translations[currentLanguage][key] || key;
}

/**
 * Set language and update UI
 * @param {string} lang - Language code ('en' or 'ja')
 */
function setLanguage(lang) {
    if (!translations[lang]) {
        console.error(`Language '${lang}' not supported`);
        return;
    }

    currentLanguage = lang;
    localStorage.setItem('language', lang);

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update all elements with data-i18n attribute
    updateTranslations();

    // Update collection pill names (if collections exist)
    if (typeof updateCollectionNames === 'function') {
        updateCollectionNames();
    }

    // Update language selector state
    updateLanguageSelector();
}

/**
 * Update all translations in the DOM
 */
function updateTranslations() {
    // Update UI elements with data-i18n attribute
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.dataset.i18n;
        const translation = t(key);

        // Update text content or placeholder based on element type
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else {
            element.textContent = translation;
        }
    });

    // Update video captions based on language
    updateVideoCaptions();

    // Update collect button text (dynamically created) - preserve collected state
    const collectBtns = document.querySelectorAll('.collect-btn');
    collectBtns.forEach(btn => {
        if (btn.classList.contains('collected')) {
            btn.textContent = t('collected');
        } else {
            btn.textContent = t('collectBtn');
        }
    });
}

/**
 * Update video captions based on current language
 */
function updateVideoCaptions() {
    const captions = document.querySelectorAll('.reel-caption');
    captions.forEach(caption => {
        if (currentLanguage === 'ja' && caption.dataset.captionJa) {
            caption.textContent = caption.dataset.captionJa;
        } else if (caption.dataset.captionEn) {
            caption.textContent = caption.dataset.captionEn;
        }
    });
}

/**
 * Update language selector button states
 */
function updateLanguageSelector() {
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        if (btn.dataset.lang === currentLanguage) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Initialize language system
 */
function initLanguage() {
    // Set initial language
    document.documentElement.lang = currentLanguage;

    // Update initial translations
    updateTranslations();

    // Set up language selector buttons
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = btn.dataset.lang;
            setLanguage(lang);
        });
    });

    // Update selector state
    updateLanguageSelector();
}

/**
 * Get current language
 * @returns {string} Current language code
 */
function getCurrentLanguage() {
    return currentLanguage;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
} else {
    initLanguage();
}
