// ===== 檔名：Config.gs =====
// v1 — 全域設定、機密存取、共用小工具
// 你之後要調時段/篇數/門檻/CTA，大多改這裡就好。

// ---- 內容池工作表 ----
const SHEET_NAME = '內容池';

// 欄位對應（0-based，對應 A、B、C…）。改欄位順序只要改這裡。
const COL = {
  ID: 0,         // A 隨機 id
  CREATED: 1,    // B 建立時間
  PILLAR: 2,     // C 支柱
  CONTENT: 3,    // D 貼文全文
  IMAGE: 4,      // E 圖片網址（選填）
  FIRE: 5,       // F 🔥
  NEUTRAL: 6,    // G 😐
  EYEROLL: 7,    // H 🙄
  STATUS: 8,     // I 狀態：pending/approved/rejected/published/failed
  APPROVED: 9,   // J 核准時間
  PUBLISHED: 10, // K 發布時間
  RESULT: 11,    // L 發布結果
};
const HEADERS = ['id', '建立時間', '支柱', '貼文全文', '圖片網址', '🔥', '😐', '🙄', '狀態', '核准時間', '發布時間', '發布結果'];
const TOTAL_COLS = HEADERS.length;

// ---- 內容池策略 C 參數 ----
const POOL = {
  DAILY_MAX: 5,        // 一天最多發幾篇
  LOW_THRESHOLD: 3,    // 待發庫存低於這個數就 LINE 提醒補稿
  GENERATE_BATCH: 3,   // 每次產文產幾篇（顧及 GAS 6 分鐘上限，先設 3）
};

// ---- 23 視角自檢過關標準（沿用你的脆文 skill）----
const SELFCHECK = {
  FIRE_MIN: 6,       // 🔥 至少幾個
  EYEROLL_MAX: 3,    // 🙄 最多幾個
  MAX_RETRIES: 1,    // 沒過關重寫幾次（每次都要呼叫 API，設高會逼近 6 分鐘上限）
};

// 產文模型。拚品質可換 'claude-opus-5'。
// ⚠️ 模型名稱請對照 Anthropic 官方文件確認
const GEN_MODEL = 'claude-sonnet-5';

// ---- 四大內容支柱 × CTA 對照表（來自你的脆文 skill）----
const PILLARS = [
  { key: 'longevity',    name: '老宅延壽',        cta: '講座帶你看你家那棟能不能救',       url: 'https://reurl.cc/A9x9Z3' },
  { key: 'income',       name: '老屋創收',        cta: '填表加 LINE@，帶你拆你手上這間怎麼動', url: 'https://reurl.cc/gr9r5N' },
  { key: 'formaldehyde', name: '甲醛檢測（麥好室）', cta: '限量預約，先測先安心、先填先卡位',   url: 'https://reurl.cc/Ga7a3Z' },
  { key: 'ai',           name: 'AI 小知識',       cta: '加官方 LINE 學更多 AI 文案技巧',    url: 'https://lin.ee/HZkET9I' },
];

// 這批產文輪替涵蓋哪些支柱（避免同批同主題）
function pickPillarsForBatch_(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(PILLARS[i % PILLARS.length]);
  return out;
}

function pillarName_(key) {
  const p = PILLARS.find(function (x) { return x.key === key; });
  return p ? p.name : key;
}

// ---- 機密存取（一律放 Script Properties，不寫死在程式碼）----

/**
 * 讀取設定值，找不到就明確報錯
 * @param {string} key 設定鍵名
 * @return {string} 設定值
 */
function getConfig_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error('找不到設定值「' + key + '」，請執行 setupConfig_ONCE 或到「專案設定 → 指令碼屬性」新增。');
  }
  return value;
}

/**
 * 一次性設定：填好值 → 執行這個函式一次 → 把值清空再存檔
 */
function setupConfig_ONCE() {
  PropertiesService.getScriptProperties().setProperties({
    'ANTHROPIC_API_KEY': '把值貼這裡，執行一次後清空',
    'LINE_CHANNEL_ACCESS_TOKEN': '',
    'LINE_CHANNEL_SECRET': '',
    'LINE_ADMIN_USER_ID': '',   // 你的 LINE userId（傳訊息給機器人會回你，見 Main.gs）
    'THREADS_USER_ID': '',
    'THREADS_ACCESS_TOKEN': '', // 首次用；之後自動續期會存到 THREADS_TOKEN_LIVE
    'FB_PAGE_ID': '',
    'FB_PAGE_ACCESS_TOKEN': '',
  });
  Logger.log('已寫入設定範本，請填值後再執行一次，最後把程式碼裡的值清空存檔。');
}

// ---- 時間小工具（專案時區已設 Asia/Taipei）----
function nowStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}
function todayStr_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function newId_() {
  return Utilities.getUuid().slice(0, 12);
}
