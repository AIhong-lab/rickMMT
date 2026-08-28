// ===== 檔名：Sheet.gs =====
// v1 — 內容池（Google Sheet 當資料庫）的讀寫
// 一律整批讀進記憶體再處理，避免逐格 getRange 的效能問題。

function getSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('找不到工作表「' + SHEET_NAME + '」，請先執行 setupSheet_ONCE。');
  return sh;
}

// 一次讀進所有資料列（不含標題），回傳 { rows, sheet, firstDataRow }
function readAll_() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [], sheet: sheet };
  // ⚠️ 一次讀進來
  const rows = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLS).getValues();
  return { rows: rows, sheet: sheet };
}

// 新增一篇待審草稿（往下新增，不覆蓋既有資料）
function insertPending_(post) {
  const sheet = getSheet_();
  const id = newId_();
  const row = new Array(TOTAL_COLS).fill('');
  row[COL.ID] = id;
  row[COL.CREATED] = nowStr_();
  row[COL.PILLAR] = post.pillar;
  row[COL.CONTENT] = post.content;
  row[COL.IMAGE] = post.imageUrl || '';
  row[COL.FIRE] = post.fire;
  row[COL.NEUTRAL] = post.neutral;
  row[COL.EYEROLL] = post.eyeroll;
  row[COL.STATUS] = 'pending';
  // ⚠️ 一次寫入整列
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, TOTAL_COLS).setValues([row]);
  return id;
}

// 依 id 找到資料列，回傳 { rowIndex（實際列號）, data（該列陣列） }，找不到回 null
function findById_(id) {
  const { rows } = readAll_();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][COL.ID]) === String(id)) {
      return { rowIndex: i + 2, data: rows[i] };
    }
  }
  return null;
}

// 更新某列的狀態與時間欄位
function updateRow_(rowIndex, patch) {
  const sheet = getSheet_();
  if (patch.status !== undefined) sheet.getRange(rowIndex, COL.STATUS + 1).setValue(patch.status);
  if (patch.approvedAt !== undefined) sheet.getRange(rowIndex, COL.APPROVED + 1).setValue(patch.approvedAt);
  if (patch.publishedAt !== undefined) sheet.getRange(rowIndex, COL.PUBLISHED + 1).setValue(patch.publishedAt);
  if (patch.result !== undefined) sheet.getRange(rowIndex, COL.RESULT + 1).setValue(patch.result);
}

// 待發庫存裡最舊的一篇（approved，依核准時間排序）
function nextApproved_() {
  const { rows } = readAll_();
  let best = null;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][COL.STATUS] === 'approved') {
      if (!best || String(rows[i][COL.APPROVED]) < String(best.data[COL.APPROVED])) {
        best = { rowIndex: i + 2, data: rows[i] };
      }
    }
  }
  return best;
}

// 待發庫存數
function countApproved_() {
  const { rows } = readAll_();
  return rows.filter(function (r) { return r[COL.STATUS] === 'approved'; }).length;
}

// 今天（台灣）已發布幾篇
function countPublishedToday_() {
  const { rows } = readAll_();
  const today = todayStr_();
  return rows.filter(function (r) {
    return r[COL.STATUS] === 'published' && String(r[COL.PUBLISHED]).indexOf(today) === 0;
  }).length;
}

// ---- 本檔函式清單 ----
// getSheet_ / readAll_ / insertPending_ / findById_ / updateRow_ /
// nextApproved_ / countApproved_ / countPublishedToday_
