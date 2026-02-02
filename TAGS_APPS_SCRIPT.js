/**
 * Google Apps Script for Venue Tags & Memos
 * Deploy as Web App: Execute as me, Anyone can access
 *
 * Spreadsheet tabs required:
 *   tags        - timestamp | venue_id | tag_key | user_hash | session_id
 *   memos       - timestamp | venue_id | user_hash | memo_text
 *   rate_limits - timestamp | user_hash | action_type
 */

// === CONFIGURATION ===

var VALID_TAGS = [
  'date_spot', 'business_dinner', 'family_friendly', 'solo_dining',
  'late_night', 'budget_friendly', 'special_occasion', 'quiet_calm',
  'lively_fun', 'pet_friendly', 'great_drinks', 'photogenic'
];

var RATE_LIMITS = { tag: 30, memo: 10 }; // per user_hash per hour
var MEMO_MAX_LENGTH = 500;
var BATCH_MAX_VENUE_IDS = 20;

var ALLOWED_ORIGINS = [
  'https://sncrp437.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

// === CORS HELPERS ===

function _getCorsHeaders(e) {
  var origin = '';
  try {
    origin = e && e.parameter && e.parameter._origin ? e.parameter._origin : '';
  } catch (err) {}

  // Apps Script deployed as web app cannot read request Origin header directly.
  // The frontend sends _origin as a query param for logging, but we return
  // Access-Control-Allow-Origin: * because Apps Script web apps always do.
  // The real protection is the rate limiting and user_hash system.
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON);
}

function _jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function _errorResponse(message, code) {
  return _jsonResponse({ status: 'error', message: message, code: code || 400 });
}

// === RATE LIMITING ===

function _checkRateLimit(userHash, actionType) {
  var sheet = SpreadsheetApp.getActive().getSheetByName('rate_limits');
  if (!sheet) return true; // No rate_limits sheet = no limiting

  var data = sheet.getDataRange().getValues();
  var oneHourAgo = new Date(Date.now() - 3600000);
  var count = 0;

  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    if (new Date(row[0]) < oneHourAgo) break;
    if (row[1] === userHash && row[2] === actionType) count++;
  }

  return count < (RATE_LIMITS[actionType] || 10);
}

function _logRateLimit(userHash, actionType) {
  var sheet = SpreadsheetApp.getActive().getSheetByName('rate_limits');
  if (!sheet) return;
  sheet.appendRow([new Date(), userHash, actionType]);
}

// === VALIDATION ===

function _isValidHash(hash) {
  return hash && typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
}

function _isValidVenueId(id) {
  return id && typeof id === 'string' && id.length > 0 && id.length <= 100;
}

function _sanitizeMemo(text) {
  if (!text || typeof text !== 'string') return '';
  // Strip HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Trim to max length
  return text.substring(0, MEMO_MAX_LENGTH).trim();
}

// === GET HANDLERS ===

function doGet(e) {
  var action = e.parameter.action;

  switch (action) {
    case 'get_tags':
      return _handleGetTags(e);
    case 'get_tags_batch':
      return _handleGetTagsBatch(e);
    case 'get_my_tags':
      return _handleGetMyTags(e);
    case 'get_memo':
      return _handleGetMemo(e);
    default:
      return _errorResponse('Unknown action: ' + action);
  }
}

function _handleGetTags(e) {
  var venueId = e.parameter.venue_id;
  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');

  var sheet = SpreadsheetApp.getActive().getSheetByName('tags');
  if (!sheet) return _jsonResponse({ status: 'ok', venue_id: venueId, tags: {} });

  var data = sheet.getDataRange().getValues();
  var tagCounts = {};

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === venueId) {
      var tagKey = data[i][2];
      tagCounts[tagKey] = (tagCounts[tagKey] || 0) + 1;
    }
  }

  return _jsonResponse({ status: 'ok', venue_id: venueId, tags: tagCounts });
}

function _handleGetTagsBatch(e) {
  var venueIdsStr = e.parameter.venue_ids;
  if (!venueIdsStr) return _errorResponse('Missing venue_ids');

  var venueIds = venueIdsStr.split(',').slice(0, BATCH_MAX_VENUE_IDS);

  var sheet = SpreadsheetApp.getActive().getSheetByName('tags');
  if (!sheet) {
    var emptyResult = {};
    venueIds.forEach(function(id) { emptyResult[id] = {}; });
    return _jsonResponse({ status: 'ok', venues: emptyResult });
  }

  var data = sheet.getDataRange().getValues();
  var result = {};
  venueIds.forEach(function(id) { result[id.trim()] = {}; });

  for (var i = 1; i < data.length; i++) {
    var vid = data[i][1];
    if (result[vid] !== undefined) {
      var tagKey = data[i][2];
      result[vid][tagKey] = (result[vid][tagKey] || 0) + 1;
    }
  }

  return _jsonResponse({ status: 'ok', venues: result });
}

function _handleGetMyTags(e) {
  var venueId = e.parameter.venue_id;
  var userHash = e.parameter.user_hash;
  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');

  var sheet = SpreadsheetApp.getActive().getSheetByName('tags');
  if (!sheet) return _jsonResponse({ status: 'ok', venue_id: venueId, my_tags: [] });

  var data = sheet.getDataRange().getValues();
  var myTags = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === venueId && data[i][3] === userHash) {
      myTags.push(data[i][2]);
    }
  }

  return _jsonResponse({ status: 'ok', venue_id: venueId, my_tags: myTags });
}

function _handleGetMemo(e) {
  var venueId = e.parameter.venue_id;
  var userHash = e.parameter.user_hash;
  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');

  var sheet = SpreadsheetApp.getActive().getSheetByName('memos');
  if (!sheet) return _jsonResponse({ status: 'ok', venue_id: venueId, memo: null });

  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === venueId && data[i][2] === userHash) {
      return _jsonResponse({ status: 'ok', venue_id: venueId, memo: data[i][3] });
    }
  }

  return _jsonResponse({ status: 'ok', venue_id: venueId, memo: null });
}

// === POST HANDLERS ===

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return _errorResponse('Invalid JSON body');
  }

  var action = body.action;

  switch (action) {
    case 'add_tag':
      return _handleAddTag(body);
    case 'remove_tag':
      return _handleRemoveTag(body);
    case 'save_memo':
      return _handleSaveMemo(body);
    default:
      return _errorResponse('Unknown action: ' + action);
  }
}

function _handleAddTag(body) {
  var venueId = body.venue_id;
  var tagKey = body.tag_key;
  var userHash = body.user_hash;
  var sessionId = body.session_id || '';

  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');
  if (VALID_TAGS.indexOf(tagKey) === -1) return _errorResponse('Invalid tag_key');

  // Rate limit check
  if (!_checkRateLimit(userHash, 'tag')) {
    return _errorResponse('Rate limit exceeded. Try again later.', 429);
  }

  var sheet = SpreadsheetApp.getActive().getSheetByName('tags');
  if (!sheet) return _errorResponse('Tags sheet not found');

  // Check for duplicate
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === venueId && data[i][2] === tagKey && data[i][3] === userHash) {
      return _jsonResponse({ status: 'ok', action: 'already_exists' });
    }
  }

  // Add tag
  sheet.appendRow([new Date(), venueId, tagKey, userHash, sessionId]);
  _logRateLimit(userHash, 'tag');

  return _jsonResponse({ status: 'ok', action: 'added' });
}

function _handleRemoveTag(body) {
  var venueId = body.venue_id;
  var tagKey = body.tag_key;
  var userHash = body.user_hash;

  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');
  if (VALID_TAGS.indexOf(tagKey) === -1) return _errorResponse('Invalid tag_key');

  var sheet = SpreadsheetApp.getActive().getSheetByName('tags');
  if (!sheet) return _errorResponse('Tags sheet not found');

  // Find and delete the row
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === venueId && data[i][2] === tagKey && data[i][3] === userHash) {
      sheet.deleteRow(i + 1); // Sheets rows are 1-indexed
      return _jsonResponse({ status: 'ok', action: 'removed' });
    }
  }

  return _jsonResponse({ status: 'ok', action: 'not_found' });
}

function _handleSaveMemo(body) {
  var venueId = body.venue_id;
  var userHash = body.user_hash;
  var memoText = _sanitizeMemo(body.memo_text);

  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');

  // Rate limit check
  if (!_checkRateLimit(userHash, 'memo')) {
    return _errorResponse('Rate limit exceeded. Try again later.', 429);
  }

  var sheet = SpreadsheetApp.getActive().getSheetByName('memos');
  if (!sheet) return _errorResponse('Memos sheet not found');

  // Upsert: find existing row or append new
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === venueId && data[i][2] === userHash) {
      // Update existing memo
      sheet.getRange(i + 1, 1).setValue(new Date());     // timestamp
      sheet.getRange(i + 1, 4).setValue(memoText);        // memo_text
      _logRateLimit(userHash, 'memo');
      return _jsonResponse({ status: 'ok', action: 'updated' });
    }
  }

  // New memo
  sheet.appendRow([new Date(), venueId, userHash, memoText]);
  _logRateLimit(userHash, 'memo');

  return _jsonResponse({ status: 'ok', action: 'saved' });
}
