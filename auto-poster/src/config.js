// ============================================================
//  全域設定 — 你之後要調就改這裡（時段、每日篇數、門檻、主題）
// ============================================================

// 台灣時區偏移（UTC+8）。Cloudflare cron 跑在 UTC，這裡用來換算「今天」。
export const TZ_OFFSET_HOURS = 8;

// 發文時段（台灣時間）。這裡只是給人看的說明；真正觸發時間在 wrangler.toml 的 cron。
// 若要改時段：同時改這裡 + wrangler.toml 的 [triggers] crons（記得換算成 UTC）。
export const SLOTS = ['12:00', '18:00', '21:00'];

// 內容池（策略 C）參數
export const POOL = {
  DAILY_MAX: 5,          // 一天最多發幾篇（1–5）
  DAILY_MIN: 1,          // 一天至少發幾篇
  LOW_THRESHOLD: 3,      // 待發庫存低於這個數，就 LINE 提醒你補稿
  GENERATE_BATCH: 4,     // 每次自動產文產幾篇草稿（產完先自檢，過關的才推去審）
};

// 23 視角自檢過關標準（沿用你的 skill）
export const SELFCHECK = {
  FIRE_MIN: 6,           // 🔥 至少要幾個
  EYEROLL_MAX: 3,        // 🙄 最多幾個
  MAX_RETRIES: 2,        // 沒過關時，最多重寫幾次
};

// 產文用的模型（可換 claude-opus-5 拚品質，或維持 sonnet 省成本）
export const GEN_MODEL = 'claude-sonnet-5';

// ---- 四大內容支柱 × CTA 對照表（來自你的脆文 skill）----
export const PILLARS = [
  {
    key: 'longevity',
    name: '老宅延壽',
    cta: '講座帶你看你家那棟能不能救',
    url: 'https://reurl.cc/A9x9Z3',
  },
  {
    key: 'income',
    name: '老屋創收',
    cta: '填表加 LINE@，帶你拆你手上這間怎麼動',
    url: 'https://reurl.cc/gr9r5N',
  },
  {
    key: 'formaldehyde',
    name: '甲醛檢測（麥好室）',
    cta: '限量預約，先測先安心、先填先卡位',
    url: 'https://reurl.cc/Ga7a3Z',
  },
  {
    key: 'ai',
    name: 'AI 小知識',
    cta: '加官方 LINE 學更多 AI 文案技巧',
    url: 'https://lin.ee/HZkET9I',
  },
];

// 每次產文批次要涵蓋哪些支柱（輪替，避免同一天全同主題）
export function pickPillarsForBatch(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(PILLARS[i % PILLARS.length]);
  return out;
}

// 台灣「現在」的牆上時鐘（用 UTC 元件表示 TW 當地時間）
export function twNow() {
  return new Date(Date.now() + TZ_OFFSET_HOURS * 3600 * 1000);
}

// 台灣今天的日期字串 YYYY-MM-DD（用來算「今天發了幾篇」）
export function twDateStr(d = twNow()) {
  return d.toISOString().slice(0, 10);
}
