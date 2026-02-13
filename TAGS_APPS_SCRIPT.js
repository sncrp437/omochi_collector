/**
 * Google Apps Script for Venue Tags, Memos & Folders
 * Deploy as Web App: Execute as me, Anyone can access
 *
 * Spreadsheet tabs required:
 *   tags          - timestamp | venue_id | tag_key | user_hash | session_id
 *   memos         - timestamp | venue_id | user_hash | memo_text
 *   folders       - timestamp | folder_id | user_hash | folder_name | color | order
 *   venue_folders - timestamp | venue_id | folder_id | user_hash
 *   visit_status  - timestamp | venue_id | user_hash | status | visit_count
 *   rate_limits   - timestamp | user_hash | action_type
 */

// === CONFIGURATION ===

var VALID_TAGS = [
  'date_spot', 'business_dinner', 'family_friendly', 'solo_dining',
  'late_night', 'budget_friendly', 'special_occasion', 'quiet_calm',
  'lively_fun', 'pet_friendly', 'great_drinks', 'photogenic'
];

var RATE_LIMITS = { tag: 30, memo: 10, folder: 20, visit: 30 }; // per user_hash per hour
var VALID_VISIT_STATUSES = ['went', 'want_to_go'];
var MEMO_MAX_LENGTH = 500;
var FOLDER_NAME_MAX_LENGTH = 20;
var MAX_FOLDERS_PER_USER = 20;
var BATCH_MAX_VENUE_IDS = 20;

var FOLDER_COLORS = [
  '#FF6B9D', // Pink
  '#4A90D9', // Blue
  '#50C878', // Green
  '#FFB347', // Orange
  '#9B59B6', // Purple
  '#F39C12', // Gold
  '#1ABC9C', // Teal
  '#E74C3C'  // Red
];

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

function _sanitizeFolderName(name) {
  if (!name || typeof name !== 'string') return '';
  // Strip HTML tags
  name = name.replace(/<[^>]*>/g, '');
  // Trim to max length
  return name.substring(0, FOLDER_NAME_MAX_LENGTH).trim();
}

function _isValidFolderId(id) {
  return id && typeof id === 'string' && /^folder_\d+$/.test(id);
}

function _isValidColor(color) {
  return color && typeof color === 'string' && FOLDER_COLORS.indexOf(color) !== -1;
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
    case 'get_folders':
      return _handleGetFolders(e);
    case 'get_venue_folders':
      return _handleGetVenueFolders(e);
    case 'get_visit_status':
      return _handleGetVisitStatus(e);
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

function _handleGetFolders(e) {
  var userHash = e.parameter.user_hash;
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');

  var sheet = SpreadsheetApp.getActive().getSheetByName('folders');
  if (!sheet) return _jsonResponse({ status: 'ok', folders: [] });

  var data = sheet.getDataRange().getValues();
  var folders = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === userHash) {
      folders.push({
        id: data[i][1],
        name: data[i][3],
        color: data[i][4],
        order: data[i][5] || 0
      });
    }
  }

  // Sort by order
  folders.sort(function(a, b) { return a.order - b.order; });

  return _jsonResponse({ status: 'ok', folders: folders });
}

function _handleGetVenueFolders(e) {
  var userHash = e.parameter.user_hash;
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');

  var sheet = SpreadsheetApp.getActive().getSheetByName('venue_folders');
  if (!sheet) return _jsonResponse({ status: 'ok', venue_folders: {} });

  var data = sheet.getDataRange().getValues();
  var venueFolders = {};

  for (var i = 1; i < data.length; i++) {
    if (data[i][3] === userHash) {
      venueFolders[data[i][1]] = data[i][2]; // venue_id -> folder_id
    }
  }

  return _jsonResponse({ status: 'ok', venue_folders: venueFolders });
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
    case 'save_folder':
      return _handleSaveFolder(body);
    case 'delete_folder':
      return _handleDeleteFolder(body);
    case 'set_venue_folder':
      return _handleSetVenueFolder(body);
    case 'remove_venue_folder':
      return _handleRemoveVenueFolder(body);
    case 'set_visit_status':
      return _handleSetVisitStatus(body);
    case 'remove_visit_status':
      return _handleRemoveVisitStatus(body);
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

// === FOLDER HANDLERS ===

function _handleSaveFolder(body) {
  var folderId = body.folder_id;
  var userHash = body.user_hash;
  var folderName = _sanitizeFolderName(body.folder_name);
  var color = body.color;
  var order = typeof body.order === 'number' ? body.order : 0;

  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');
  if (!folderName) return _errorResponse('Folder name is required');
  if (!_isValidColor(color)) color = FOLDER_COLORS[0]; // Default to first color

  // Rate limit check
  if (!_checkRateLimit(userHash, 'folder')) {
    return _errorResponse('Rate limit exceeded. Try again later.', 429);
  }

  var sheet = SpreadsheetApp.getActive().getSheetByName('folders');
  if (!sheet) return _errorResponse('Folders sheet not found');

  var data = sheet.getDataRange().getValues();

  // Count existing folders for this user
  var userFolderCount = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === userHash) userFolderCount++;
  }

  // If new folder (no folderId), check limit
  if (!folderId && userFolderCount >= MAX_FOLDERS_PER_USER) {
    return _errorResponse('Maximum folder limit reached (' + MAX_FOLDERS_PER_USER + ')');
  }

  // Generate new folder ID if not provided
  if (!folderId) {
    folderId = 'folder_' + Date.now();
  } else if (!_isValidFolderId(folderId)) {
    return _errorResponse('Invalid folder_id format');
  }

  // Check if updating existing folder
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === folderId && data[i][2] === userHash) {
      // Update existing folder
      sheet.getRange(i + 1, 1).setValue(new Date());      // timestamp
      sheet.getRange(i + 1, 4).setValue(folderName);       // folder_name
      sheet.getRange(i + 1, 5).setValue(color);            // color
      sheet.getRange(i + 1, 6).setValue(order);            // order
      _logRateLimit(userHash, 'folder');
      return _jsonResponse({ status: 'ok', action: 'updated', folder_id: folderId });
    }
  }

  // New folder
  sheet.appendRow([new Date(), folderId, userHash, folderName, color, order]);
  _logRateLimit(userHash, 'folder');

  return _jsonResponse({ status: 'ok', action: 'created', folder_id: folderId });
}

function _handleDeleteFolder(body) {
  var folderId = body.folder_id;
  var userHash = body.user_hash;

  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');
  if (!_isValidFolderId(folderId)) return _errorResponse('Invalid folder_id');

  var sheet = SpreadsheetApp.getActive().getSheetByName('folders');
  if (!sheet) return _errorResponse('Folders sheet not found');

  // Find and delete the folder
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === folderId && data[i][2] === userHash) {
      sheet.deleteRow(i + 1);

      // Also remove all venue-folder associations for this folder
      _removeAllVenueFolderAssociations(folderId, userHash);

      return _jsonResponse({ status: 'ok', action: 'deleted' });
    }
  }

  return _jsonResponse({ status: 'ok', action: 'not_found' });
}

function _removeAllVenueFolderAssociations(folderId, userHash) {
  var sheet = SpreadsheetApp.getActive().getSheetByName('venue_folders');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  // Delete from bottom to top to avoid index shifting issues
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][2] === folderId && data[i][3] === userHash) {
      sheet.deleteRow(i + 1);
    }
  }
}

function _handleSetVenueFolder(body) {
  var venueId = body.venue_id;
  var folderId = body.folder_id;
  var userHash = body.user_hash;

  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');
  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidFolderId(folderId)) return _errorResponse('Invalid folder_id');

  // Rate limit check
  if (!_checkRateLimit(userHash, 'folder')) {
    return _errorResponse('Rate limit exceeded. Try again later.', 429);
  }

  var sheet = SpreadsheetApp.getActive().getSheetByName('venue_folders');
  if (!sheet) return _errorResponse('Venue folders sheet not found');

  var data = sheet.getDataRange().getValues();

  // Check if venue already has a folder assignment
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === venueId && data[i][3] === userHash) {
      // Update existing assignment
      sheet.getRange(i + 1, 1).setValue(new Date());       // timestamp
      sheet.getRange(i + 1, 3).setValue(folderId);          // folder_id
      _logRateLimit(userHash, 'folder');
      return _jsonResponse({ status: 'ok', action: 'updated' });
    }
  }

  // New assignment
  sheet.appendRow([new Date(), venueId, folderId, userHash]);
  _logRateLimit(userHash, 'folder');

  return _jsonResponse({ status: 'ok', action: 'assigned' });
}

function _handleRemoveVenueFolder(body) {
  var venueId = body.venue_id;
  var userHash = body.user_hash;

  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');
  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');

  var sheet = SpreadsheetApp.getActive().getSheetByName('venue_folders');
  if (!sheet) return _errorResponse('Venue folders sheet not found');

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === venueId && data[i][3] === userHash) {
      sheet.deleteRow(i + 1);
      return _jsonResponse({ status: 'ok', action: 'removed' });
    }
  }

  return _jsonResponse({ status: 'ok', action: 'not_found' });
}

// === VISIT STATUS HANDLERS ===

function _handleGetVisitStatus(e) {
  var venueId = e.parameter.venue_id;
  var userHash = e.parameter.user_hash;
  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');

  var sheet = SpreadsheetApp.getActive().getSheetByName('visit_status');
  if (!sheet) return _jsonResponse({ status: 'ok', venue_id: venueId, visit_status: null, visit_count: 0 });

  var data = sheet.getDataRange().getValues();

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === venueId && data[i][2] === userHash) {
      return _jsonResponse({
        status: 'ok',
        venue_id: venueId,
        visit_status: data[i][3],
        visit_count: data[i][4] || 0
      });
    }
  }

  return _jsonResponse({ status: 'ok', venue_id: venueId, visit_status: null, visit_count: 0 });
}

function _handleSetVisitStatus(body) {
  var venueId = body.venue_id;
  var userHash = body.user_hash;
  var visitStatus = body.visit_status;
  var visitCount = typeof body.visit_count === 'number' ? body.visit_count : null;

  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');
  if (VALID_VISIT_STATUSES.indexOf(visitStatus) === -1) return _errorResponse('Invalid visit_status');

  // Rate limit check
  if (!_checkRateLimit(userHash, 'visit')) {
    return _errorResponse('Rate limit exceeded. Try again later.', 429);
  }

  var sheet = SpreadsheetApp.getActive().getSheetByName('visit_status');
  if (!sheet) return _errorResponse('visit_status sheet not found');

  var data = sheet.getDataRange().getValues();

  // Check for existing entry
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === venueId && data[i][2] === userHash) {
      // Update existing
      sheet.getRange(i + 1, 1).setValue(new Date());          // timestamp
      sheet.getRange(i + 1, 4).setValue(visitStatus);          // status
      var count = visitCount !== null ? visitCount : (visitStatus === 'went' ? (data[i][4] || 0) + 1 : 0);
      sheet.getRange(i + 1, 5).setValue(count);                // visit_count
      _logRateLimit(userHash, 'visit');
      return _jsonResponse({ status: 'ok', action: 'updated', visit_count: count });
    }
  }

  // New entry
  var newCount = visitCount !== null ? visitCount : (visitStatus === 'went' ? 1 : 0);
  sheet.appendRow([new Date(), venueId, userHash, visitStatus, newCount]);
  _logRateLimit(userHash, 'visit');

  return _jsonResponse({ status: 'ok', action: 'set', visit_count: newCount });
}

function _handleRemoveVisitStatus(body) {
  var venueId = body.venue_id;
  var userHash = body.user_hash;

  if (!_isValidVenueId(venueId)) return _errorResponse('Invalid venue_id');
  if (!_isValidHash(userHash)) return _errorResponse('Invalid user_hash');

  var sheet = SpreadsheetApp.getActive().getSheetByName('visit_status');
  if (!sheet) return _errorResponse('visit_status sheet not found');

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === venueId && data[i][2] === userHash) {
      sheet.deleteRow(i + 1);
      return _jsonResponse({ status: 'ok', action: 'removed' });
    }
  }

  return _jsonResponse({ status: 'ok', action: 'not_found' });
}
