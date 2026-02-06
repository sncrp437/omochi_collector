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
        welcomeTitle: 'Welcome to Food Discovery',
        welcomeAboutTitle: 'About',
        welcomeAboutText: 'Discover amazing restaurants and food venues through vertical video stories.',
        welcomeHowToTitle: 'How to Use',
        welcomeSwipe: 'Swipe up/down to browse videos',
        welcomeCollect: 'Tap "Want to Go!" to save favorites',
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
        venueDetails: 'Venue Details',

        // Venue bottom sheet - action buttons
        callBtn: 'Call',
        webReserveBtn: 'Reserve',
        viewOnAppBtn: 'Omochi App',

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
        uberDesc: 'Open with destination set',
        goTaxiDesc: 'Japan\'s largest taxi app',
        didiDesc: 'Available in 15 prefectures',
        srideDesc: 'Tokyo area taxis',
        taxiOpening: 'Opening app...',
        addressCopied: 'Address copied to clipboard'
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
        welcomeTitle: 'フードディスカバリーへようこそ',
        welcomeAboutTitle: 'について',
        welcomeAboutText: '縦型動画で素晴らしいレストランや飲食店を発見しましょう。',
        welcomeHowToTitle: '使い方',
        welcomeSwipe: '上下にスワイプして動画を閲覧',
        welcomeCollect: '「行きたい！」をタップしてお気に入りを保存',
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
        venueDetails: '店舗詳細',

        // Venue bottom sheet - action buttons
        callBtn: '電話する',
        webReserveBtn: '予約',
        viewOnAppBtn: 'Omochiアプリ',

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
        uberDesc: '目的地を設定して開く',
        goTaxiDesc: '日本最大のタクシーアプリ',
        didiDesc: '15都道府県で利用可能',
        srideDesc: '東京エリアのタクシー',
        taxiOpening: 'アプリを開いています...',
        addressCopied: '住所をコピーしました'
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
