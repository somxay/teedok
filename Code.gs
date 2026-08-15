// ═══════════════════════════════════════════════════════
//  Code.gs — Badminton Finder
//  GitHub Pages version: expose JSON endpoints via doGet/doPost
//  ໄຟລ໌ນີ້ deploy ໃນ Google Apps Script ເປັນ Web App
// ═══════════════════════════════════════════════════════

// ─── CORS helper ───────────────────────────────────────
// ຕ້ອງ return header ນີ້ທຸກ response ເພື່ອໃຫ້ GitHub Pages fetch ໄດ້
function _cors(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function _json(data) {
  return _cors(
    ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON)
  );
}

// ─── doGet — ຮອງຮັບ GET requests ─────────────────────
// URL: .../exec?action=getPosts
// URL: .../exec?action=getCourtData
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  try {
    if (action === 'getCourtData') {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Courts');
      if (!sheet) return _json({ error: 'Courts sheet not found' });
      var data = sheet.getDataRange().getValues();
      return _json(data);
    }

    if (action === 'getPosts') {
      var posts = _getPosts();
      return _json(posts);
    }

    // ຖ້າ action ບໍ່ຕົງ ຫຼື ໂທ URL ໂດຍກົງ — return status ok
    return _json({ status: 'ok', message: 'Badminton Finder API ready' });

  } catch (err) {
    return _json({ error: err.toString() });
  }
}

// ─── doPost — ຮອງຮັບ POST requests ───────────────────
// Body JSON: { action: "savePost", post: {...} }
// Body JSON: { action: "verifyAndDelete", rowIndex: N, code: "XXX" }
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';

    if (action === 'savePost') {
      var code = savePost(body.post);
      return _json({ success: true, deleteCode: code });
    }

    if (action === 'verifyAndDelete') {
      var result = verifyAndDelete(body.rowIndex, body.code);
      return _json(result);
    }

    return _json({ error: 'Unknown action: ' + action });

  } catch (err) {
    return _json({ error: err.toString() });
  }
}

// ─── ຟັງຊັ່ນ Business Logic (ຄືເດີມ) ────────────────

function generateCode() {
  return Math.floor(100 + Math.random() * 900).toString();
}

function savePost(post) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
    new Date(),     // H - ວັນທີປະກາດ
    'ເປີດ',         // I - ສະຖານະ
    deleteCode,     // J - ລະຫັດລົບ
    post.postDate   // K - ວັນທີທີ່ຜູ້ໃຊ້ເລືອກ
  ]);

  return deleteCode;
}

function _getPosts() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Posts');
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  return data.slice(1).map(function(r, i) {
    function formatTime(val) {
      if (!val) return '--:--';
      if (val instanceof Date) {
        var h = val.getHours().toString().padStart(2, '0');
        var m = val.getMinutes().toString().padStart(2, '0');
        return h + ':' + m;
      }
      return val.toString();
    }

    function formatDate(val) {
      if (!val) return '-';
      var d = (val instanceof Date) ? val : new Date(val);
      if (isNaN(d.getTime())) return '-';
      var days = ['ອາທິດ','ຈັນ','ອັງຄານ','ພຸດ','ພະຫັດ','ສຸກ','ເສົາ'];
      var dd = d.getDate().toString().padStart(2, '0');
      var mm = (d.getMonth() + 1).toString().padStart(2, '0');
      var yyyy = d.getFullYear();
      return days[d.getDay()] + ' ' + dd + '/' + mm + '/' + yyyy;
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

function getPosts() {
  return _getPosts();
}

function verifyAndDelete(rowIndex, code) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Posts');
  var data = sheet.getDataRange().getValues();
  var row = data[rowIndex + 1];

  if (!row) return { success: false, message: 'ບໍ່ພົບໂພສນີ້' };

  var saved = String(row[9] || '').trim().toUpperCase();
  var input = String(code || '').trim().toUpperCase();

  if (saved !== input) return { success: false, message: 'ລະຫັດຜິດ! ກະລຸນາກວດຄືນ' };

  sheet.deleteRow(rowIndex + 2);
  return { success: true };
}

function autoDeleteExpiredPosts() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Posts');
  var data = sheet.getDataRange().getValues();
  var now = new Date();

  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    var playDateVal = row[10];
    var startTimeVal = row[5];

    if (!playDateVal || !startTimeVal) continue;

    var startHour, startMin;
    if (startTimeVal instanceof Date) {
      startHour = startTimeVal.getHours();
      startMin  = startTimeVal.getMinutes();
    } else {
      var parts = startTimeVal.toString().split(':');
      startHour = parseInt(parts[0]) || 0;
      startMin  = parseInt(parts[1]) || 0;
    }

    var playDate = new Date(playDateVal);
    var startDateTime = new Date(
      playDate.getFullYear(), playDate.getMonth(), playDate.getDate(),
      startHour, startMin, 0
    );

    if (now >= startDateTime) {
      sheet.deleteRow(i + 1);
      Logger.log('Deleted row ' + (i+1) + ' — expired at ' + startDateTime);
    }
  }
}

function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'autoDeleteExpiredPosts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoDeleteExpiredPosts').timeBased().everyMinutes(5).create();
  Logger.log('Trigger set — checks every 5 min');
}

function getCourtData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Courts');
  var data = sheet.getDataRange().getValues();
  return JSON.stringify(data);
}
