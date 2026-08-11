# MAX HOUSE 自動發文流水線

AI 產文 → LINE 一鍵核准 → Threads / FB 排程雙發。
架構：**Cloudflare Workers**（永遠在線的 webhook + 內建 cron 排程）+ **D1**（內容池）。

排程策略採「**內容池 + 每日抽取**」：
產文與發文解耦——系統每天產一批草稿推你審，核准的進「待發庫存」，
每天在 **12:00 / 18:00 / 21:00**（台灣時間）各自動抽最舊一篇雙發，庫存見底自動 LINE 提醒補稿。

---

## 流程一覽

```
每天 09:00  → AI 產 4 篇草稿 → 23 視角自檢 → 過關的推到你 LINE（帶兩顆按鈕）
你按 ✅核准  → 進待發庫存
你按 ❌退回  → 下批重寫這主題
12/18/21 點 → 各抽庫存最舊一篇 → 同步發 Threads + FB
庫存 ≤ 3 篇 → LINE 提醒你補稿
```

一天發幾篇由 `src/config.js` 的 `DAILY_MAX`（預設 5）與庫存量共同決定：有貨就發、最多 5 篇。

---

## 你要先準備的東西

| # | 項目 | 拿到什麼 |
|---|------|----------|
| 1 | Cloudflare 帳號（免費方案即可） | 部署 Worker + D1 |
| 2 | Anthropic API Key | `ANTHROPIC_API_KEY` |
| 3 | LINE Developers → Messaging API channel | `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、你的 `LINE_ADMIN_USER_ID` |
| 4 | Meta App（你已有）+ Threads 專業帳號 | `THREADS_USER_ID`、`THREADS_ACCESS_TOKEN` |
| 5 | Facebook 粉專（你已有）+ 綁到 Meta App | `FB_PAGE_ID`、`FB_PAGE_ACCESS_TOKEN` |

> ⚠️ Threads 帳號需切換為「專業帳號」並在 Meta App 開通 Threads API；
> 權限需 `threads_basic` + `threads_content_publish`。
> FB 需 `pages_manage_posts` + `pages_read_engagement`，並送 App 審核才能對外發。

---

## 部署步驟

```bash
cd auto-poster
npm install

# 1) 建 D1 資料庫，把回傳的 database_id 貼進 wrangler.toml
npx wrangler d1 create rickmmt-autopost

# 2) 建資料表
npm run db:init

# 3) 設定機密（一個一個貼）
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_ADMIN_USER_ID
npx wrangler secret put THREADS_USER_ID
npx wrangler secret put THREADS_ACCESS_TOKEN
npx wrangler secret put FB_PAGE_ID
npx wrangler secret put FB_PAGE_ACCESS_TOKEN

# 4) 部署
npm run deploy
```

部署後把 Worker 網址填回 LINE：
**LINE Developers → Messaging API → Webhook URL** 設為
`https://rickmmt-autopost.<你的子網域>.workers.dev/webhook/line`，並開啟「Use webhook」。

---

## 拿到各項憑證的快速指引

**LINE_ADMIN_USER_ID**：先把你的官方帳號加為好友，隨便傳一句話，
webhook 收到的 `events[].source.userId` 就是你的 id（可暫時在 `handleLineEvents` 印 log 抓）。

**THREADS_ACCESS_TOKEN**：Meta App → Threads → 產生長效權杖（約 60 天）。
下一階段我會加「自動續期」的 cron，免得你每兩個月手動換。

**FB_PAGE_ACCESS_TOKEN**：Graph API Explorer 取短效 → 換長效粉專權杖，
或用系統使用者（System User）發永久權杖（推薦，最穩）。

---

## 之後你可以自己調的地方（`src/config.js`）

- `SLOTS` / wrangler `crons`：改發文時段（記得換算 UTC）
- `POOL.DAILY_MAX` / `DAILY_MIN`：一天發幾篇
- `POOL.LOW_THRESHOLD`：庫存低於幾篇提醒補稿
- `POOL.GENERATE_BATCH`：每次產幾篇
- `PILLARS`：四大支柱的 CTA 文案與網址
- `SELFCHECK.FIRE_MIN` / `EYEROLL_MAX`：自檢過關門檻
- `GEN_MODEL`：產文模型（拚品質可換 `claude-opus-5`）

---

## 目前狀態與下一階段

**已完成（骨架）**：產文引擎、LINE 兩鍵審核、內容池、12/18/21 排程雙發、失敗重試與回報、補稿提醒。

**下一階段可加**：
- Threads token 自動續期 cron
- LINE 回一句話叫 AI「照這意思改」的微調鍵
- 發文成效回收（讚數/互動）回報
- 圖卡自動產生並帶圖發文
