// ===== 檔名：Settings.gs =====
// v1 — 新檔案，不動 Code.gs 任何既有函式。
//      負責品牌設定（CTA 對照表／過關門檻／23 人物／寫手選擇）讀寫進 PropertiesService，
//      以及把存起來的設定，在每次網頁呼叫產文前灌回 Code.gs 的全域變數。
//      能灌得回去，是因為 Code.gs 已經把 PASS_FIRE／MAX_EYEROLL／MAX_ROUNDS／WRITER_PROVIDER
//      這 4 個純數值/字串的宣告方式從 const 改成 let；CTA_TABLE／PERSONAS 本來就是物件/陣列，
//      用清空重填內容的方式覆寫，不需要改宣告方式。

var SETTINGS_PROP_KEY = 'APP_SETTINGS';

/**
 * 設定值第一次是空的時候（Script Properties 裡還沒有 APP_SETTINGS），
 * 用 Code.gs 現有常數的內容當預設值寫進去。
 */
function ensureDefaults_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(SETTINGS_PROP_KEY)) return;

  var defaults = {
    ctaTable: JSON.parse(JSON.stringify(CTA_TABLE)),   // 深複製，避免直接參照到 Code.gs 的物件
    thresholds: {
      passFire: PASS_FIRE,
      maxEyeroll: MAX_EYEROLL,
      maxRounds: MAX_ROUNDS
    },
    writerProvider: WRITER_PROVIDER,
    personas: PERSONAS.slice()
  };
  props.setProperty(SETTINGS_PROP_KEY, JSON.stringify(defaults));
}

/**
 * 給網頁讀目前設定。不含任何 API 金鑰。
 * @return {{ctaTable:Object, thresholds:Object, writerProvider:string, personas:Array<string>}}
 */
function getSettings() {
  ensureDefaults_();
  var raw = PropertiesService.getScriptProperties().getProperty(SETTINGS_PROP_KEY);
  return JSON.parse(raw);
}

/**
 * 給網頁存設定。只做基本檢查，避免存進去空表或壞掉的門檻值；
 * 細節格式（例如網址對不對）交給前端表單和使用者自行判斷。
 * @param {Object} newSettings 前端組好的完整設定物件
 * @return {Object} 實際存進去、清理過的設定物件
 */
function saveSettings(newSettings) {
  if (!newSettings || typeof newSettings !== 'object') {
    throw new Error('設定格式錯誤。');
  }
  if (!newSettings.ctaTable || Object.keys(newSettings.ctaTable).length === 0) {
    throw new Error('CTA 對照表不能是空的，至少要留一個支柱。');
  }
  if (!newSettings.personas || newSettings.personas.length === 0) {
    throw new Error('焦點團體人物設定不能是空的。');
  }

  var t = newSettings.thresholds || {};
  var passFire = Number(t.passFire);
  var maxEyeroll = Number(t.maxEyeroll);
  var maxRounds = Number(t.maxRounds);
  if (!isFinite(passFire) || passFire < 1) throw new Error('🔥 下限要是 1 以上的數字。');
  if (!isFinite(maxEyeroll) || maxEyeroll < 0) throw new Error('🙄 上限要是 0 以上的數字。');
  if (!isFinite(maxRounds) || maxRounds < 1) throw new Error('最多重寫輪數要是 1 以上的數字。');

  var writerProvider = (newSettings.writerProvider === 'gemini') ? 'gemini' : 'claude';

  var clean = {
    ctaTable: newSettings.ctaTable,
    thresholds: { passFire: passFire, maxEyeroll: maxEyeroll, maxRounds: maxRounds },
    writerProvider: writerProvider,
    personas: newSettings.personas
  };

  PropertiesService.getScriptProperties().setProperty(SETTINGS_PROP_KEY, JSON.stringify(clean));
  return clean;
}

/**
 * 每次網頁呼叫 generatePost() 之前先跑這個，把存起來的設定灌進 Code.gs 的全域變數，
 * 這樣品牌設定頁改的門檻／CTA／人物／寫手，才會真的影響產文結果。
 */
function applySettingsToRuntime_() {
  var s = getSettings();

  // CTA_TABLE 是 const 物件，不能整包替換，用清空後重填內容的方式覆寫
  Object.keys(CTA_TABLE).forEach(function (k) { delete CTA_TABLE[k]; });
  Object.keys(s.ctaTable).forEach(function (k) { CTA_TABLE[k] = s.ctaTable[k]; });

  // PERSONAS 是 const 陣列，同樣用清空後重填的方式覆寫
  PERSONAS.length = 0;
  s.personas.forEach(function (p) { PERSONAS.push(p); });

  PASS_FIRE = s.thresholds.passFire;
  MAX_EYEROLL = s.thresholds.maxEyeroll;
  MAX_ROUNDS = s.thresholds.maxRounds;
  WRITER_PROVIDER = s.writerProvider;
}

// ── 本檔函式清單 ──────────────────────────
// ensureDefaults_ / getSettings / saveSettings / applySettingsToRuntime_
