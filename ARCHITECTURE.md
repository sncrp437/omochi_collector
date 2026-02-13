# Omochi Food Discovery App - Architecture Reference

Standalone Reels-style food discovery frontend. This document covers the discovery app only, not the Omochi Django backend or React frontend reference copies (`omochi-be-master*/`, `omochi-fe-master*/`).

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript (no frameworks, no build process)
- **Hosting:** GitHub Pages (static site)
- **Backend APIs:** Omochi Django REST on AWS Lambda + Google Sheets via Apps Script
- **AI:** Puter.js (Kimi K2 model, client-side, no API key)

---

## File Structure

```
index.html                  Main video feed (Reels-style)
my-collections.html         Saved venues page (filters, AI search, bottom sheet)
collect.html                Static collect confirmation (fallback)
cors-test.html              CORS testing utility
css/
  styles.css                All styles (~2100 lines, dark theme, mobile-first)
js/
  i18n.js                   EN/JA translations (~100 keys)
  api.js                    Omochi backend API client (auto Bearer, auto 401 refresh)
  auth.js                   Login, register, logout, modal management
  data.js                   Google Sheets video data fetching + sample fallback
  collections.js            Genre & location filtering on index page
  categories.js             Top-level category selector (Food, Nightlife, etc.)
  welcome.js                Welcome modal (once per day)
  analytics.js              Analytics tracking (page_load, video_view, collect, etc.)
  local-collections.js      localStorage CRUD for collections + toast notifications
  ai-sort.js                AI venue filtering via Puter.js
  venue-tags.js             Community tags & private memos (Google Sheets backend)
  app.js                    Main feed logic, video rendering, autoplay, collect button
  my-collections.js         Collections page (dual source, filters, AI, bottom sheet)
TAGS_APPS_SCRIPT.js         Google Apps Script for venue tags/memos (deploy to Google)
```

---

## Script Loading Order

### index.html
```
i18n.js -> api.js -> auth.js -> data.js -> collections.js -> categories.js -> welcome.js -> analytics.js -> local-collections.js -> app.js
```

### my-collections.html
```
puter.js (CDN) -> i18n.js -> api.js -> auth.js -> local-collections.js -> analytics.js -> venue-tags.js -> ai-sort.js -> my-collections.js
```

### collect.html
```
i18n.js
```

---

## Module Reference

### js/i18n.js
**Purpose:** EN/JA language switching and translation lookups.

| Function | Description |
|----------|-------------|
| `t(key)` | Get translated string for current language |
| `setLanguage(lang)` | Switch language, save to localStorage, update DOM |
| `getCurrentLanguage()` | Return `'en'` or `'ja'` |
| `updateTranslations()` | Update all `[data-i18n]` elements in DOM |
| `initLanguage()` | Setup language buttons, restore saved preference |

**localStorage:** `language`
**DOM:** `.lang-btn`, `[data-i18n]`

---

### js/api.js
**Purpose:** HTTP client for Omochi Django backend with automatic Bearer token and 401 refresh.

| Function | Description |
|----------|-------------|
| `apiRequest(endpoint, options)` | Core request: auto-adds auth header, retries on 401 |
| `apiGet(endpoint)` | GET shorthand |
| `apiPost(endpoint, body)` | POST shorthand |
| `apiPut(endpoint, body)` | PUT shorthand |
| `apiDelete(endpoint)` | DELETE shorthand |

**Constants:**
- `API_BASE_URL` = `https://5w1pl59sr9.execute-api.ap-northeast-1.amazonaws.com/dev`

**localStorage:** `access_token`, `refresh_token`
**Internal:** `_tryRefreshToken()` deduplicates concurrent refresh calls via `_isRefreshing` flag

---

### js/auth.js
**Purpose:** Authentication modal, login/register forms, token management.

| Function | Description |
|----------|-------------|
| `isLoggedIn()` | Check if `access_token` exists in localStorage |
| `getUser()` | Parse and return `user` object from localStorage |
| `login(email, password)` | POST `/api/auth/login-user/`, store tokens + user |
| `register(formData)` | POST `/api/auth/register/`, auto-login on success |
| `logout()` | Clear all auth data from localStorage, update UI |
| `showAuthModal(mode)` | Show modal in `'login'` or `'register'` mode |
| `hideAuthModal()` | Close modal |
| `updateAuthUI()` | Toggle auth status indicator, logout button |
| `initAuthModal()` | Setup all modal event listeners |

**Post-login:** Calls `syncLocalCollectionsToApi()`, `syncLocalMemosToApi()`, `syncLocalTagsToApi()`, `syncLocalFoldersToApi()`, then `invalidateFolderCache()`.

**localStorage:** `access_token`, `refresh_token`, `user` (JSON: `{id, email, first_name, last_name}`)

**DOM:** `#authModal`, `#loginForm`, `#registerForm`, `#loginEmail`, `#loginPassword`, `#regFirstName`, `#regLastName`, `#regEmail`, `#regPhone`, `#regPassword`, `#regPasswordConfirm`, `#regPrefecture`, `#regCity`, `#regAddressDetail`, `#authStatus`, `#logoutBtn`

**API:** `POST /api/auth/login-user/`, `POST /api/auth/register/`

---

### js/data.js
**Purpose:** Fetch video + collection data from Google Sheets via Apps Script. Falls back to hardcoded sample data.

| Function | Description |
|----------|-------------|
| `fetchVideoData()` | Async fetch from Google Sheets, returns `{videos, collections}` |
| `getSampleData()` | Return hardcoded sample data (3 venues) |
| `parseVideoData(rawData)` | Validate & normalize video objects |

**Constants:** `GOOGLE_SHEETS_API_URL` (placeholder, needs real URL)

**Video object fields:** `id`, `url`, `caption_en`, `caption_ja`, `venue_name`, `genre`, `address`, `nearest_station`, `nearest_station_en`, `tags`, `collection`, `priority`, `venue_uuid`, `reservation_url`

**Collection object fields:** `collection_id`, `name_en`, `name_ja`, `icon`, `display_order`, `active`

---

### js/app.js
**Purpose:** Main video feed rendering, autoplay via Intersection Observer, collect button logic.

| Function | Description |
|----------|-------------|
| `init()` | Entry point: fetch data, render feed, setup observer, show welcome |
| `renderVideoFeed(videosToRender)` | Populate `#reelsContainer` with reel items |
| `createReelItem(video, index)` | Create single reel div (iframe + overlay) |
| `createVideoIframe(video, index)` | Create YouTube iframe element |
| `createOverlay(video)` | Create caption + collect button overlay |
| `setupIntersectionObserver()` | Autoplay video when scrolled into view |
| `playVideo(iframe)` / `pauseVideo(iframe)` | PostMessage to YouTube iframe API |
| `collectVenue(video, buttonEl)` | Save to localStorage + optional API sync |

**Collect flow:** Save to localStorage immediately (no auth required) -> show toast -> if logged in + has venue_uuid, silently POST to `/api/stocked-venues/`

**DOM:** `#reelsContainer`, `#loading`
**API:** `POST /api/stocked-venues/` (when logged in)

---

### js/collections.js
**Purpose:** Genre (collection) and location (station) filtering on the index page.

| Function | Description |
|----------|-------------|
| `initCollections(videosData, collectionsData)` | Parse collections, render pills, return filtered videos |
| `renderCollectionSelector()` | Create genre pill buttons in `#collectionSelector` |
| `selectCollection(collectionId)` | Set genre filter, re-render feed |
| `filterVideosByCollection(collectionId)` | Apply genre + location AND filter |
| `filterAndRerenderFeed(collectionId)` | Fade out, clear, rerender, fade in |
| `initLocationFilter(videosData)` | Extract unique stations, render pills in `#locationSelector` |
| `selectLocation(station)` | Set location filter, re-render feed |
| `updateCollectionNames()` | Update pill text on language change |

**localStorage:** `selectedCollection`, `selectedLocation`
**DOM:** `#collectionSelector`, `#locationSelector`, `.collection-pill`

---

### js/categories.js
**Purpose:** Top-level category selector (Food, Nightlife, Entertainment, etc.). Only Food is active; others show "Coming soon!" toast.

| Function | Description |
|----------|-------------|
| `initCategorySelector()` | Setup trigger button & expandable strip |
| `_handleCategoryClick(category)` | Switch category or show coming soon toast |
| `_openCategoryStrip()` / `_closeCategoryStrip()` | Toggle strip visibility, shift filter rows |
| `updateCategoryNames()` | Update labels on language change |

**Categories:** food, nightlife, entertainment, shopping, beauty, travel (only food active)

**localStorage:** `selectedCategory`
**DOM:** `#categoryTrigger`, `#categoryStrip`, `#categoryStripInner`, `#categoryStripOverlay`

---

### js/welcome.js
**Purpose:** Welcome onboarding modal shown once per day.

| Function | Description |
|----------|-------------|
| `shouldShowWelcomeModal()` | Check if shown today |
| `showWelcomeModal(collectionName)` | Display modal |
| `closeWelcomeModal()` | Hide modal |
| `reopenWelcomeModal()` | Reopen from Info tab |
| `initWelcomeModal()` | Setup event listeners |

**localStorage:** `welcomeModalLastShown`
**DOM:** `#welcomeModal`, `#welcomeModalClose`, `#welcomeGetStarted`, `#tabInfoBtn`

---

### js/analytics.js
**Purpose:** Log page views, video views, collect events, and custom events to Google Sheets.

| Function | Description |
|----------|-------------|
| `initAnalytics()` | Generate session ID, log page_load |
| `logPageLoad()` | POST page_load event |
| `logVideoView(videoId)` | POST video_view (once per video per session) |
| `logCollectEvent(videoId)` | POST collect event |
| `logAnalyticsEvent(eventType, videoId)` | Generic event logger |

**Event types:** `page_load`, `video_view`, `collect`, `venue_detail_view`, `venue_call`, `venue_web_reserve`, `venue_view_app`

**Constants:** `ANALYTICS_API_URL` (placeholder), `ENABLE_FRONTEND_ANALYTICS`

**Event payload:** `{event_type, video_id, session_id, user_agent, referrer, screen_size, is_mobile}`

---

### js/local-collections.js
**Purpose:** Browser-level venue collection storage (no auth required) with toast notifications and 7-day expiration for guest users.

| Function | Description |
|----------|-------------|
| `getLocalCollections()` | Parse localStorage array |
| `saveLocalCollection(video)` | Add venue with 7-day expiry, return true if new |
| `removeLocalCollection(localId)` | Delete by local ID |
| `isLocallyCollected(videoId)` | Check if already saved |
| `syncLocalCollectionsToApi()` | POST unsynced items to `/api/stocked-venues/` |
| `markLocalCollectionSynced(videoId)` | Set `synced: true` |
| `getUnsyncedCollections()` | Get items with venue_uuid not yet synced |
| `showToast(message, duration)` | Display toast notification |
| `cleanupExpiredCollections()` | Remove expired items from localStorage |
| `getExpirationInfo()` | Get count and days until soonest expiry (all data types) |
| `initExpirationBanner()` | Initialize warning banner + event listeners |
| `updateExpirationBanner()` | Update banner text/urgency based on expiry |
| `hideExpirationBanner()` | Hide the warning banner |

**Expiration info** includes counts for all guest data types: `{count, collections, memos, tags, folders, daysLeft}`. Banner shows itemized breakdown.

**localStorage:** `omochi_local_collections` (JSON array)

**Collection item shape:**
```javascript
{
  id: "local_timestamp",
  video_id, venue_uuid, venue_name, genre, genre_en,
  address, nearest_station, nearest_station_en,
  caption_en, caption_ja, video_url, reservation_url,
  date_added, expires_at, synced: false
}
```

**DOM:** `#toast`, `#toastMessage`, `#toastContainer`, `#expirationBanner`, `#expirationMessage`, `#expirationRegisterBtn`, `#expirationDismissBtn`
**API:** `POST /api/stocked-venues/` (during sync)

---

### js/ai-sort.js
**Purpose:** AI-powered venue filtering using Puter.js (Kimi K2 model, runs client-side).

| Function | Description |
|----------|-------------|
| `aiSortCollections(query, venues)` | Returns array of matching venue indices |
| `isAiSortAvailable()` | Check if puter.js is loaded |

**Dependency:** `puter.js` CDN (`https://js.puter.com/v2/`)
**Model:** `moonshotai/kimi-k2`

---

### js/venue-tags.js
**Purpose:** Community tags and private memos stored in a separate Google Sheet.

| Function | Description |
|----------|-------------|
| `isTagsApiConfigured()` | Check if TAGS_API_URL is set |
| `getUserHash()` | SHA-256 hash of user email (null for guests) |
| `getTagLabel(tagKey)` / `getTagIcon(tagKey)` | Get translated label / SVG icon |
| `fetchVenueTags(venueId)` | GET aggregated tag counts |
| `fetchVenueTagsBatch(venueIds)` | GET batch tag counts |
| `fetchMyTags(venueId)` | GET user's tags (localStorage for guests, API for logged-in) |
| `fetchMemo(venueId)` | GET user's memo (localStorage for guests, API for logged-in) |
| `addVenueTag(venueId, tagKey)` | Save to localStorage + API sync if logged in |
| `removeVenueTag(venueId, tagKey)` | Remove from localStorage + API sync if logged in |
| `saveMemo(venueId, memoText)` | Save to localStorage + API sync if logged in |
| `getLocalMemos()` / `setLocalMemos(memos)` | localStorage helpers for guest memos |
| `getLocalTags()` / `setLocalTags(tags)` | localStorage helpers for guest tags |
| `cleanupExpiredMemos()` | Remove expired local memos |
| `cleanupExpiredTags()` | Remove expired local tags |
| `cleanupExpiredFolders()` | Remove expired folders + orphaned venue-folder links |
| `cleanupAllExpiredGuestData()` | Clean all expired guest data (memos + tags + folders) |
| `syncLocalMemosToApi()` | Upload unsynced local memos to Tags API |
| `syncLocalTagsToApi()` | Upload unsynced local tags to Tags API |
| `syncLocalFoldersToApi()` | Upload unsynced folders + venue-folder mappings to Tags API |

**12 predefined tags:** date_spot, business_dinner, family_friendly, solo_dining, late_night, budget_friendly, special_occasion, quiet_calm, lively_fun, pet_friendly, great_drinks, photogenic

**Constants:** `TAGS_API_URL` (placeholder, needs real URL), `LOCAL_MEMOS_KEY`, `LOCAL_TAGS_KEY`, `GUEST_EXPIRY_DAYS` (7)
**Cache:** Session-level caches with 5-minute TTL (`_tagsCache`, `_memosCache`, `_myTagsCache`)

---

### js/my-collections.js
**Purpose:** Collections page logic: dual-source data (localStorage + API), genre/location/AI filtering, venue detail bottom sheet.

| Function | Description |
|----------|-------------|
| `initCollectionsPage()` | Load local + API collections, merge, render |
| `_mergeCollections(local, api)` | Dedup by venue_uuid, API items take priority |
| `_renderAllCards()` | Create venue card grid |
| `_getFilteredItems()` | Apply genre + location + AI filters (AND logic) |
| `_createUnifiedCard(item)` | Create venue card element |
| `_renderGenreFilters()` | Build cuisine filter pills |
| `_renderLocationFilters()` | Build area filter pills |
| `_showAiInputInline()` | Show inline AI search input in pills row |
| `_executeAiFilter(query)` | Call aiSortCollections, update UI |
| `_clearAiFilter()` | Reset AI search |
| `_removeItem(item, cardElement)` | DELETE from API or remove from localStorage |
| `_openVenueSheet(item)` | Open bottom sheet with venue details |
| `_renderSheetMemo()` | Memo textarea for all users (guests save to localStorage) |
| `_renderActionButtons()` | Call / Reserve / Taxi buttons |
| `_renderVenueDetails()` | Description, hours, services, announcement |
| `_logVenueAction(actionType, venueId)` | Log to analytics |

**localStorage:** `collectionsGenreFilter`, `collectionsLocationFilter`
**DOM:** `#venueCardsList`, `#genreFilterPills`, `#locationFilterPills`, `#venueSheet`, `#venueSheetOverlay`, `#venueSheetMemoSection`, `#venueSheetActions`, `#venueSheetDetails`, `#venueSheetTags`, `#registerPromptBanner`, `#collectionsLoading`, `#collectionsEmpty`, `#collectionsAuthRequired`
**API:** `GET /api/stocked-venues/`, `DELETE /api/stocked-venues/{id}/`

---

## CSS Structure (css/styles.css)

Major sections (~2100 lines, dark theme, mobile-first):

| Section | Description |
|---------|-------------|
| Base & Reset | Dark background (#000), fixed viewport |
| Auth Status | Green dot indicator (top-left) |
| Language Selector | EN/JA buttons (top-center, fixed) |
| Category Selector | Trigger button + expandable strip with glass morphism |
| Collection/Location Filters | Horizontal scrolling pill rows (transparent background) |
| Collection Pills | Pill button styles (inactive: translucent white, active: solid white) |
| Video Feed | `.reel-item` full-viewport, `.reel-overlay` caption + collect button |
| Auth Modal | Login/register form overlay |
| Welcome Modal | Onboarding modal |
| Toast | Slide-in notification bar |
| Bottom Tab Bar | Home + Collections navigation (fixed bottom) |
| Collections Page | Venue card grid, filter sections, empty/loading states |
| Venue Bottom Sheet | Drawer from bottom with memo, tags, action buttons, details |
| AI Search | Inline input in filter row, loading pill, result pill |
| Responsive | Media queries for tablets/desktop |

---

## Data Flow

### Page Load (index.html)
```
DOM ready
 -> i18n: restore language
 -> auth: init modal, update UI
 -> app.init():
    -> data.fetchVideoData() (Google Sheets or sample fallback)
    -> collections.initCollections() (render genre pills)
    -> collections.initLocationFilter() (render station pills)
    -> categories.initCategorySelector() (render trigger + strip)
    -> renderVideoFeed() (create reel items with iframes)
    -> setupIntersectionObserver() (autoplay on scroll)
    -> welcome: show modal if not shown today
 -> analytics: log page_load
```

### Collect Button (index.html)
```
User clicks collect
 -> analytics.logCollectEvent(videoId)
 -> local-collections.saveLocalCollection(video) -> toast "Saved!"
 -> button icon: outline -> filled
 -> if isLoggedIn() && venue_uuid:
      POST /api/stocked-venues/ (silent, no UI feedback)
      markLocalCollectionSynced(videoId)
```

### Collections Page Load (my-collections.html)
```
DOM ready
 -> auth: init modal, update UI
 -> my-collections.initCollectionsPage():
    -> getLocalCollections() from localStorage
    -> if isLoggedIn():
        GET /api/stocked-venues/
        syncLocalCollectionsToApi() (upload unsynced items)
    -> _mergeCollections(local, api) (dedup by venue_uuid)
    -> _renderGenreFilters() + _renderLocationFilters()
    -> _renderAllCards()
    -> show registerPromptBanner if not logged in
```

### Auth Flow
```
User action requires auth -> showAuthModal('login')
 -> login(email, password)
    -> POST /api/auth/login-user/
    -> store access_token, refresh_token, user
    -> syncLocalCollectionsToApi()
    -> hideAuthModal()

On 401 response:
 -> _tryRefreshToken()
    -> POST /api/auth/refresh-token/ with refresh_token
    -> if success: store new access_token, retry original request
    -> if fail: clear tokens, show auth modal
```

### AI Search (my-collections.html)
```
User taps "AI" pill -> _showAiInputInline()
 -> inline text input replaces pill row
 -> user types query, presses Enter
 -> _executeAiFilter(query):
    -> aiSortCollections(query, venues) via Puter.js + Kimi K2
    -> model returns matching venue indices
    -> store in _aiFilteredIndices
    -> re-render filtered cards
 -> active "AI: query" pill shown; tap to clear
```

---

## API Endpoints

### Omochi Backend (DEV)
Base: `https://5w1pl59sr9.execute-api.ap-northeast-1.amazonaws.com/dev`

| Endpoint | Method | Auth | Used By |
|----------|--------|------|---------|
| `/api/auth/login-user/` | POST | No | auth.js |
| `/api/auth/register/` | POST | No | auth.js |
| `/api/auth/refresh-token/` | POST | No | api.js |
| `/api/auth/me/` | GET | Bearer | (available, not actively used) |
| `/api/stocked-venues/` | GET | Bearer | my-collections.js |
| `/api/stocked-venues/` | POST | Bearer | app.js, local-collections.js |
| `/api/stocked-venues/{id}/` | DELETE | Bearer | my-collections.js |

### Google Sheets Apps Scripts

| Script | Purpose | Module |
|--------|---------|--------|
| Video Data API | GET videos + collections | data.js |
| Analytics API | POST events (page_load, video_view, collect, etc.) | analytics.js |
| Tags & Memos API | GET/POST tags, memos | venue-tags.js |

---

## localStorage Keys

| Key | Module | Type | Description |
|-----|--------|------|-------------|
| `language` | i18n.js | `'en'`/`'ja'` | Current language |
| `access_token` | auth.js | string | JWT access token |
| `refresh_token` | auth.js | string | JWT refresh token |
| `user` | auth.js | JSON | `{id, email, first_name, last_name}` |
| `selectedCollection` | collections.js | string | Current genre filter on index |
| `selectedLocation` | collections.js | string | Current station filter on index |
| `selectedCategory` | categories.js | string | Top-level category (default: `'food'`) |
| `welcomeModalLastShown` | welcome.js | ISO string | Timestamp of last welcome modal |
| `omochi_local_collections` | local-collections.js | JSON array | Saved venues (browser-level, with `expires_at`) |
| `collectionsGenreFilter` | my-collections.js | string | Cuisine filter on collections page |
| `collectionsLocationFilter` | my-collections.js | string | Area filter on collections page |
| `omochi_user_folders` | venue-tags.js | JSON array | User-created folders (with `expires_at`, `synced`) |
| `omochi_venue_folders` | venue-tags.js | JSON object | `{venueId: {folder_id, expires_at, synced}}` |
| `omochi_local_memos` | venue-tags.js | JSON array | Guest memos `[{venue_id, memo_text, expires_at, synced}]` |
| `omochi_local_tags` | venue-tags.js | JSON array | Guest tags `[{venue_id, tag_key, expires_at, synced}]` |
| `collectionsFolderFilter` | my-collections.js | string | Active folder filter on collections page |

**sessionStorage Keys:**
| Key | Module | Description |
|-----|--------|-------------|
| `expirationBannerDismissed` | local-collections.js | Banner dismissed for this session |

---

## Guest Data Expiration

All guest data (collections, memos, tags, folders) is stored in localStorage with a 7-day expiration to encourage registration:

- **On save**: Each item gets `expires_at` = current time + 7 days
- **On page load**: `cleanupExpiredCollections()` + `cleanupAllExpiredGuestData()` remove expired items
- **Warning banner**: Shows dynamic countdown with itemized breakdown ("3 venues, 2 memos, 1 tag")
- **On register**: All data syncs to APIs → stored permanently (no expiration)
- **Post-login sync**: `syncLocalCollectionsToApi()`, `syncLocalMemosToApi()`, `syncLocalTagsToApi()`, `syncLocalFoldersToApi()`

**Banner messaging progression:**
| Days Left | Message | Style |
|-----------|---------|-------|
| 7-2 | "Your [itemized list] will expire in Y days..." | Orange gradient |
| 1 | "⚠️ Your data expires TOMORROW!" | Red + pulse animation |
| 0 | "🚨 Last chance! Your data expires TODAY" | Dark red + fast pulse |

---

## Module Dependencies

```
index.html
  i18n.js          (standalone)
  api.js           (standalone)
  auth.js          -> i18n, api, local-collections (syncLocalCollectionsToApi)
  data.js          (standalone)
  collections.js   -> i18n, app (createReelItem, setupIntersectionObserver)
  categories.js    -> i18n, analytics, local-collections (showToast)
  welcome.js       -> i18n, collections (getCurrentCollectionName)
  analytics.js     (standalone)
  local-collections.js  (standalone)
  app.js           -> all above

my-collections.html
  puter.js         (external CDN)
  i18n.js          (standalone)
  api.js           (standalone)
  auth.js          -> i18n, api, local-collections
  local-collections.js  (standalone)
  analytics.js     (standalone)
  venue-tags.js    -> i18n, auth (getUser, isLoggedIn)
  ai-sort.js       -> puter.js
  my-collections.js -> all above
```

---

## Security Model

1. **JWT Tokens** - Access + refresh in localStorage. Auto-refresh on 401 with dedup. Logout = clear client-side.
2. **User Privacy** - Tags/memos use SHA-256 hash of email (no persistent user ID). Analytics uses random session ID. No IP tracking. No cookies.
3. **CORS** - Backend configured for `https://sncrp437.github.io`. Local dev auto-detected.
4. **Input Validation** - Password 6-12 chars. Memo max 500 chars with HTML stripping. Rate limits: 30 tags/hour, 10 memos/hour per user.
5. **Separation** - Video data, analytics, and tags/memos use separate Google Sheets with separate Apps Scripts. No cross-access.

---

*Last updated: 2026-02-13*
