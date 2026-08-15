// ═══════════════════════════════════════════════════════
//  Code.gs — Badminton Finder (JSONP version)
//  ໃຊ້ JSONP ແທນ fetch() ເພື່ອ bypass CORS
//  deploy: Execute as Me, Who has access: Anyone with Google Account
// ═══════════════════════════════════════════════════════

// ─── JSONP wrapper ─────────────────────────────────────
// ຕ້ອງ wrap ທຸກ response ດ້ວຍ callback() function call
function _jsonp(callback, data) {
  var json = JSON.stringify(data);
  var output = callback
    ? ContentService.createTextOutput(callback + '(' + json + ');')
    : ContentService.createTextOutput(json);
  return output.setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ─── doGet — GET requests (ຮອງຮັບ JSONP) ─────────────
// URL: .../exec?action=getPosts&callback=_cb1_123456
// URL: .../exec?action=getCourtData&callback=_cb2_123456
function doGet(e) {
  var params   = (e && e.parameter) ? e.parameter : {};
  var action   = params.action   || '';
  var callback = params.callback || '';

  try {
    if (action === 'getCourtData') {
      var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Courts');
      if (!sheet) return _jsonp(callback, { error: 'Courts sheet not found' });
      var data = sheet.getDataRange().getValues();
      return _jsonp(callback, data);
    }

    if (action === 'getPosts') {
      var posts = _getPosts();
      return _jsonp(callback, posts);
    }

    return _jsonp(callback, { status: 'ok', message: 'Badminton Finder API ready' });

  } catch (err) {
    return _jsonp(callback, { error: err.toString() });
  }
}

// ─── doPost — POST requests (ຈາກ hidden form) ─────────
// ຮັບຄ່າຜ່ານ e.parameter (ບໍ່ແມ່ນ e.postData)
function doPost(e) {
  var params   = (e && e.parameter) ? e.parameter : {};
  var action   = params.action   || '';
  var callback = params.callback || '';

  try {
    if (action === 'savePost') {
      var post = JSON.parse(params.payload || '{}');
      var code = savePost(post);
      return _jsonp(callback, { success: true, deleteCode: code });
    }

    if (action === 'verifyAndDelete') {
      var rowIndex = parseInt(params.rowIndex);
      var code = params.code || '';
      var result = verifyAndDelete(rowIndex, code);
      return _jsonp(callback, result);
    }

    return _jsonp(callback, { error: 'Unknown action: ' + action });

  } catch (err) {
    return _jsonp(callback, { error: err.toString() });
  }
}

// ─── ຕັ້ງ Spreadsheet ID ──────────────────────────────
// *** ໃສ່ ID ຂອງ Google Sheet ທ່ານ ບ່ອນນີ້ ***
// (ຈາກ URL: docs.google.com/spreadsheets/d/ THIS_PART /edit)
var SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';

// ─── Business Logic ───────────────────────────────────

function generateCode() {
  return Math.floor(100 + Math.random() * 900).toString();
}

function savePost(post) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Posts');
  if (!sheet) throw new Error("ບໍ່ພົບ sheet 'Posts'");

  var deleteCode = generateCode();
  sheet.appendRow([
    post.name,      // A
    post.whatsapp,  // B
    post.courtName, // C
    post.level,     // D
    post.people,    // E
    post.startTime, // F
    post.endTime,   // G
    new Date(),     // H
    'ເປີດ',         // I
    deleteCode,     // J
    post.postDate   // K
  ]);
  return deleteCode;
}

function _getPosts() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Posts');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  return data.slice(1).map(function(r, i) {
    function formatTime(val) {
      if (!val) return '--:--';
      if (val instanceof Date) {
        return val.getHours().toString().padStart(2,'0') + ':' +
               val.getMinutes().toString().padStart(2,'0');
      }
      return val.toString();
    }
    function formatDate(val) {
      if (!val) return '-';
      var d = (val instanceof Date) ? val : new Date(val);
      if (isNaN(d.getTime())) return '-';
      var days = ['ອາທິດ','ຈັນ','ອັງຄານ','ພຸດ','ພະຫັດ','ສຸກ','ເສົາ'];
      return days[d.getDay()] + ' ' +
             d.getDate().toString().padStart(2,'0') + '/' +
             (d.getMonth()+1).toString().padStart(2,'0') + '/' +
             d.getFullYear();
    }
    return {
      rowIndex:   i,
      name:       String(r[0]),
      whatsapp:   String(r[1]),
      courtName:  String(r[2]),
      level:      String(r[3]),
      people:     String(r[4]),
      startTime:  formatTime(r[5]),
      endTime:    formatTime(r[6]),
      postedDate: formatDate(r[10])
    };
  });
}

function getPosts() { return _getPosts(); }

function verifyAndDelete(rowIndex, code) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Posts');
  var data  = sheet.getDataRange().getValues();
  var row   = data[rowIndex + 1];
  if (!row) return { success: false, message: 'ບໍ່ພົບໂພສນີ້' };
  var saved = String(row[9] || '').trim().toUpperCase();
  var input = String(code   || '').trim().toUpperCase();
  if (saved !== input) return { success: false, message: 'ລະຫັດຜິດ!' };
  sheet.deleteRow(rowIndex + 2);
  return { success: true };
}

function autoDeleteExpiredPosts() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Posts');
  var data  = sheet.getDataRange().getValues();
  var now   = new Date();
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    var playDateVal  = row[10];
    var startTimeVal = row[5];
    if (!playDateVal || !startTimeVal) continue;
    var h, m;
    if (startTimeVal instanceof Date) {
      h = startTimeVal.getHours(); m = startTimeVal.getMinutes();
    } else {
      var parts = startTimeVal.toString().split(':');
      h = parseInt(parts[0]) || 0; m = parseInt(parts[1]) || 0;
    }
    var d = new Date(playDateVal);
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);
    if (now >= start) sheet.deleteRow(i + 1);
  }
}

function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'autoDeleteExpiredPosts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoDeleteExpiredPosts').timeBased().everyMinutes(5).create();
}

function getCourtData() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Courts');
  return JSON.stringify(sheet.getDataRange().getValues());
}
