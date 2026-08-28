// ===== 檔名：WebApp.gs =====
// v1 — 新檔案，不動 Code.gs 任何既有函式。
//      負責網頁介面的進入點（doGet），以及前端 google.script.run 會呼叫的包裝函式。
//      包裝函式一律回傳 {ok:true/false, ...}，不讓例外整包丟給前端的 withFailureHandler，
//      這樣前端不用分兩套邏輯處理「呼叫失敗」跟「呼叫成功但沒過關」。

/**
 * 網頁進入點。部署為 Web App 後開啟網址會跑到這裡。
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('包租翁 MAX HOUSE｜自動寫手後台')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 「生成貼文」頁用：每次呼叫先套用目前存的品牌設定，再呼叫既有的 generatePost()。
 * 前端一次只會呼叫一篇（見 Index.html），不會四篇一起送，避免撞 6 分鐘執行上限。
 * @param {string} topic
 * @param {string} pillar
 * @return {{ok:boolean, data?:Object, error?:string}}
 */
function generatePostForWeb(topic, pillar) {
  try {
    if (!topic || !topic.trim()) throw new Error('主題不能是空的。');
    applySettingsToRuntime_();
    var result = generatePost(topic.trim(), pillar);
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 「系統檢查」頁用：Gemini、Claude 分開測，各自回傳成功或錯誤訊息，
 * 一把壞掉不會連帶讓另一把也顯示失敗。
 * @return {{gemini:Object, claude:Object, models:Object}}
 */
function testConnectionForWeb() {
  var result = {
    gemini: { ok: false, message: '' },
    claude: { ok: false, message: '' },
    models: { claude: CLAUDE_MODEL, gemini: TEXT_MODEL, writerProvider: WRITER_PROVIDER }
  };

  try {
    result.gemini.message = callGemini_('回覆兩個字：正常');
    result.gemini.ok = true;
  } catch (e) {
    result.gemini.message = e.message;
  }

  try {
    result.claude.message = callClaude_('回覆兩個字：正常');
    result.claude.ok = true;
  } catch (e) {
    result.claude.message = e.message;
  }

  return result;
}

/**
 * 「品牌設定」「焦點團體」頁載入時用：讀目前存的設定。
 */
function getSettingsForWeb() {
  return getSettings();
}

/**
 * 「品牌設定」「焦點團體」頁的儲存按鈕用。
 * @param {Object} newSettings
 * @return {{ok:boolean, data?:Object, error?:string}}
 */
function saveSettingsForWeb(newSettings) {
  try {
    var clean = saveSettings(newSettings);
    return { ok: true, data: clean };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── 本檔函式清單 ──────────────────────────
// doGet / generatePostForWeb / testConnectionForWeb / getSettingsForWeb / saveSettingsForWeb
