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
        collectBtn: 'Want to Go!',

        // Collect page
        backBtn: 'Back',
        collectionTitle: 'Your Collection',
        collectedTitle: 'Item Collected!',
        collectedMessage: 'Your item has been successfully added to your collection.',
        continueBrowsing: 'Continue Browsing',

        // Collections
        allVideos: 'All Videos',
        allAreas: 'All',
        noVideosInCollection: 'No videos in this collection',

        // Welcome Modal
        welcomeTitle: 'Welcome to Omochi',
        welcomeSubtitle: 'Collect places you want to go from videos and posts!',
        welcomeHowToTitle: 'How it Works',
        welcomeSwipe: 'Swipe to browse videos',
        welcomeCollect: 'Push the save button to collect',
        welcomeCollections: 'Find your saved spots instantly',
        welcomeReserve: 'Reserve directly and get perks',
        welcomeTip: 'Register to keep saves forever!',
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
        phonePlaceholder: 'Phone Number',
        prefecturePlaceholder: 'Country, City',
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
        collected: 'Saved!',
        removeVenue: 'Remove',

        // Errors
        networkError: 'Network error. Please check your connection.',

        // Bottom tab bar
        howToUseTab: 'How to Use',
        homeTab: 'Home',
        collectionsTab: 'Collections',

        // Settings drawer
        settingsTitle: 'Settings',
        languageLabel: 'Language',
        termsLink: 'Terms of Service',
        privacyLink: 'Privacy Policy',
        legalLink: 'Legal Notice',
        contactLink: 'Contact',
        couponLink: 'Coupon Terms',

        // Policy page titles
        termsPageTitle: 'Terms of Service',
        privacyPageTitle: 'Privacy Policy',
        legalPageTitle: 'Legal Notice',
        contactPageTitle: 'Contact',
        couponPageTitle: 'Coupon Terms',

        // Auth status
        loggedIn: 'Logged in!',

        // Toast / Local collections
        collectSaved: 'Saved to collection!',
        alreadyCollected: 'Already in your collection',
        registerToKeepCollections: 'Register (free) to keep your collections permanently and access them from any device.',

        // Expiration warning banner (guest users)
        expirationRegister: 'Register Free',

        // Collection filters
        allGenres: 'All',
        allLocations: 'All',
        cuisineLabel: 'Cuisine',
        areaLabel: 'Area',

        // AI Smart Search (Dedicated Search Bar)
        aiSearchPlaceholder: 'AI Search your collections...',
        aiSearchInputPlaceholder: 'What are you looking for?',
        aiSearchGo: 'Search',
        aiSearchCancel: 'Cancel',
        aiSearchClear: 'Clear',
        aiSorting: 'Searching with AI...',
        aiResultsCount: 'results',
        aiPickedBadge: 'AI ✓',
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
        venueDetails: 'Venue Details',

        // Venue bottom sheet - action buttons
        callBtn: 'Call',
        webReserveBtn: 'Reserve',
        notAvailable: 'Not Available',
        noReservation: 'No Reservation',
        callTaxiBtn: 'Get a Ride',

        // Venue bottom sheet - map
        mapLabel: 'Location',
        openInGoogleMaps: 'Open in Google Maps',

        // Venue bottom sheet - details
        hoursLabel: 'Hours',
        dineIn: 'Dine-in',
        takeout: 'Takeout',
        reservationAvailable: 'Reservation',

        // Venue bottom sheet - memo redesign
        myNoteTitle: 'My Note',
        memoPrivateHint: 'Only you can see this',
        memoPlaceholderFriendly: 'What did you think? Add your personal note...',
        memoLoginPrompt: 'Tap to add your personal note',
        memoLoginHint: 'Log in to save private notes',

        // Category selector
        categoryFood: 'Food',
        categoryNightlife: 'Nightlife',
        categoryEntertainment: 'Entertainment',
        categoryShopping: 'Shopping',
        categoryBeauty: 'Beauty',
        categoryTravel: 'Travel',
        categoryComingSoon: 'Coming soon!',

        // Branched filter
        combinedPillSeparator: ' x ',

        // Swipe hint
        swipeHint: 'Swipe up',

        // Folders
        myFolders: 'My Folders',
        createFolder: 'Create Folder',
        editFolder: 'Edit Folder',
        editFolders: 'Edit Folders',
        deleteFolder: 'Delete Folder',
        folderNamePlaceholder: 'Folder name',
        uncategorized: 'Uncategorized',
        selectFolder: 'Select Folder',
        changeFolder: 'Change',
        newFolder: 'New',
        cancelBtn: 'Cancel',
        folderPromptSaved: 'Saved!',
        folderPromptQuestion: 'Add to a folder?',
        folderPromptHint: '(You can also find it later with filters & AI search)',
        folderPromptSkip: 'Skip for now',
        savedToFolder: 'Saved to {folder}',
        movedToFolder: 'Moved to {folder}',
        removedFromFolder: 'Removed from folder',

        // Taxi / Rides
        taxiBtn: 'Get a Ride',
        selectRideService: 'Choose a Service',
        uberDesc: 'Address copied - paste to destination',
        goTaxiDesc: 'Address copied - paste to destination',
        taxiOpening: 'Opening app...',
        addressCopied: 'Address copied to clipboard',

        // NFC/QR Auto-collect
        venueNotFound: 'Venue not found',
        alreadyInCollection: 'Already in your collection',
        tapCardHint: 'Tap card to see details & reserve',
        discoverMoreVenues: 'Discover more venues like this',
        exploreFeed: 'Explore the Feed'
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
        collectBtn: '行きたい！',

        // Collect page
        backBtn: '戻る',
        collectionTitle: 'あなたのコレクション',
        collectedTitle: 'アイテムを追加しました！',
        collectedMessage: 'アイテムがコレクションに正常に追加されました。',
        continueBrowsing: '続けて見る',

        // Collections
        allVideos: 'すべての動画',
        allAreas: 'すべて',
        noVideosInCollection: 'このコレクションには動画がありません',

        // Welcome Modal
        welcomeTitle: 'Omochiへようこそ',
        welcomeSubtitle: '動画や投稿から、自分の「行きたい」を集めよう！',
        welcomeHowToTitle: '使い方',
        welcomeSwipe: 'スワイプして動画を閲覧',
        welcomeCollect: '保存ボタンを押してコレクションに保存',
        welcomeCollections: '保存した場所をすぐ見つかる',
        welcomeReserve: 'コレクションから直接予約＆特典も',
        welcomeTip: '登録すると保存が永久に！',
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
        phonePlaceholder: '電話番号',
        prefecturePlaceholder: '国名、都市名',
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
        collected: '保存済み！',
        removeVenue: '削除',

        // Errors
        networkError: 'ネットワークエラー。接続を確認してください。',

        // Bottom tab bar
        howToUseTab: '使い方',
        homeTab: 'ホーム',
        collectionsTab: 'コレクション',

        // Settings drawer
        settingsTitle: '設定',
        languageLabel: '言語',
        termsLink: '利用規約',
        privacyLink: 'プライバシーポリシー',
        legalLink: '特定商取引法に基づく表記',
        contactLink: 'お問い合わせ',
        couponLink: 'クーポン利用規約',

        // Policy page titles
        termsPageTitle: '利用規約',
        privacyPageTitle: 'プライバシーポリシー',
        legalPageTitle: '特定商取引法に基づく表記',
        contactPageTitle: 'お問い合わせ',
        couponPageTitle: 'クーポン利用規約',

        // Auth status
        loggedIn: 'ログインしました！',

        // Toast / Local collections
        collectSaved: 'コレクションに保存しました！',
        alreadyCollected: 'すでにコレクションに追加済みです',
        registerToKeepCollections: '無料登録でコレクションを永久保存。どのデバイスからでもアクセスできます。',

        // Expiration warning banner (guest users)
        expirationRegister: '無料登録',

        // Collection filters
        allGenres: 'すべて',
        allLocations: 'すべて',
        cuisineLabel: '料理',
        areaLabel: 'エリア',

        // AI Smart Search (Dedicated Search Bar)
        aiSearchPlaceholder: 'AIでコレクションを検索...',
        aiSearchInputPlaceholder: '何をお探しですか？',
        aiSearchGo: '検索',
        aiSearchCancel: '戻る',
        aiSearchClear: 'クリア',
        aiSorting: 'AIで検索中...',
        aiResultsCount: '件',
        aiPickedBadge: 'AI ✓',
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
        venueDetails: '店舗詳細',

        // Venue bottom sheet - action buttons
        callBtn: '電話する',
        webReserveBtn: '予約',
        notAvailable: '予約不可',
        noReservation: '予約不可',
        callTaxiBtn: '配車する',

        // Venue bottom sheet - map
        mapLabel: '場所',
        openInGoogleMaps: 'Google マップで開く',

        // Venue bottom sheet - details
        hoursLabel: '営業時間',
        dineIn: 'イートイン',
        takeout: 'テイクアウト',
        reservationAvailable: '予約可',

        // Venue bottom sheet - memo redesign
        myNoteTitle: 'マイメモ',
        memoPrivateHint: '自分だけに見えます',
        memoPlaceholderFriendly: 'どうでしたか？メモを追加...',
        memoLoginPrompt: 'タップしてメモを追加',
        memoLoginHint: 'ログインしてメモを保存',

        // Category selector
        categoryFood: '飲食',
        categoryNightlife: 'ナイトライフ',
        categoryEntertainment: 'エンタメ',
        categoryShopping: 'ショッピング',
        categoryBeauty: '美容',
        categoryTravel: '旅行',
        categoryComingSoon: '近日公開！',

        // Branched filter
        combinedPillSeparator: ' x ',

        // Swipe hint
        swipeHint: '上にスワイプ',

        // Folders
        myFolders: 'マイフォルダ',
        createFolder: 'フォルダを作成',
        editFolder: 'フォルダを編集',
        editFolders: '編集',
        deleteFolder: 'フォルダを削除',
        folderNamePlaceholder: 'フォルダ名',
        uncategorized: '未分類',
        selectFolder: 'フォルダを選択',
        changeFolder: '変更',
        newFolder: '新規',
        cancelBtn: 'キャンセル',
        folderPromptSaved: '保存しました！',
        folderPromptQuestion: 'フォルダに追加する？',
        folderPromptHint: '（フィルターやAI検索でも後から見つけられます）',
        folderPromptSkip: 'スキップ',
        savedToFolder: '{folder}に保存しました',
        movedToFolder: '{folder}に移動しました',
        removedFromFolder: 'フォルダから削除しました',

        // Taxi / Rides
        taxiBtn: '配車する',
        selectRideService: 'サービスを選択',
        uberDesc: '住所をコピー済み - 目的地に貼り付け',
        goTaxiDesc: '住所をコピー済み - 目的地に貼り付け',
        taxiOpening: 'アプリを開いています...',
        addressCopied: '住所をコピーしました',

        // NFC/QR Auto-collect
        venueNotFound: '店舗が見つかりません',
        alreadyInCollection: 'すでに保存済みです',
        tapCardHint: 'カードをタップして詳細・予約',
        discoverMoreVenues: 'このような店舗をもっと発見',
        exploreFeed: 'フィードを探索'
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

    // Update branched filter names (if branched filter exists)
    if (typeof updateBranchedFilterNames === 'function') {
        updateBranchedFilterNames();
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

    // Update collect button icon (dynamically created) - preserve collected state
    const collectBtns = document.querySelectorAll('.collect-btn');
    collectBtns.forEach(btn => {
        if (btn.classList.contains('collected')) {
            btn.innerHTML = (typeof BOOKMARK_FILLED !== 'undefined' ? BOOKMARK_FILLED : '');
        } else {
            btn.innerHTML = (typeof BOOKMARK_OUTLINE !== 'undefined' ? BOOKMARK_OUTLINE : '');
        }
    });
}

/**
 * Update video captions based on current language
 * Uses sanitizeCaption from app.js for safe HTML rendering with formatting
 */
function updateVideoCaptions() {
    const captions = document.querySelectorAll('.reel-caption');
    captions.forEach(caption => {
        let rawCaption;
        if (currentLanguage === 'ja' && caption.dataset.captionJa) {
            rawCaption = caption.dataset.captionJa;
        } else if (caption.dataset.captionEn) {
            rawCaption = caption.dataset.captionEn;
        }
        if (rawCaption && typeof sanitizeCaption === 'function') {
            caption.innerHTML = sanitizeCaption(rawCaption);
        } else if (rawCaption) {
            caption.textContent = rawCaption;
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
