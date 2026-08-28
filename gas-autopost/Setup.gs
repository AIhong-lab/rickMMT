// ===== 檔名：Setup.gs =====
// v1 — 一次性安裝：建內容池工作表、裝時間觸發器；另附測試函式
// 順序：setupConfig_ONCE（填秘密）→ setupSheet_ONCE → installTriggers_ONCE

// 建立「內容池」工作表與標題列（已存在就只補標題）
function setupSheet_ONCE() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  sh.getRange(1, 1, 1, TOTAL_COLS).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);
  Logger.log('已建立／更新工作表「' + SHEET_NAME + '」');
}

// 安裝全部時間觸發器（會先清掉本專案舊的，避免重複）
function installTriggers_ONCE() {
  // 清掉舊觸發器
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });

  // 每天 09:00 產文
  ScriptApp.newTrigger('runGeneration').timeBased().everyDays(1).atHour(9).create();
  // 每天 12/18/21 各發一篇
  ScriptApp.newTrigger('runPublishSlot').timeBased().everyDays(1).atHour(12).create();
  ScriptApp.newTrigger('runPublishSlot').timeBased().everyDays(1).atHour(18).create();
  ScriptApp.newTrigger('runPublishSlot').timeBased().everyDays(1).atHour(21).create();
  // 每週一 10 點 Threads token 續期
  ScriptApp.newTrigger('runTokenMaintenance').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(10).create();

  Logger.log('已安裝觸發器：產文(09) / 發文(12,18,21) / 續期(週一10)。時區以專案設定 Asia/Taipei 為準。');
}

// —— 測試函式（手動執行驗證，不用等排程）——

// 只產一篇「老宅延壽」看看，會寫進 Sheet 並推 LINE
function test_generateOne() {
  const draft = generateOne_(PILLARS[0]);
  Logger.log('自檢：🔥' + draft.fire + ' 😐' + draft.neutral + ' 🙄' + draft.eyeroll + ' 過關=' + draft.passed);
  Logger.log(draft.content);
  const id = insertPending_({ pillar: draft.pillar, content: draft.content, imageUrl: '',
    fire: draft.fire, neutral: draft.neutral, eyeroll: draft.eyeroll });
  pushDraft_({ id: id, content: draft.content, fire: draft.fire, neutral: draft.neutral, eyeroll: draft.eyeroll, pillar: draft.pillar });
  Logger.log('已寫入並推 LINE，id=' + id);
}

// 測試推一則純文字到你的 LINE（驗證 LINE token / userId 對不對）
function test_pushLine() {
  pushText_('✅ 測試訊息：LINE 推播設定正確。');
}

// ---- 本檔函式清單 ----
// setupSheet_ONCE / installTriggers_ONCE / test_generateOne / test_pushLine
