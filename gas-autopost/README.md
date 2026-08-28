# MAX HOUSE 自動發文流水線（Google Apps Script 版）

AI 產文 → LINE 一鍵核准 → Threads / FB 排程雙發，全套跑在你的 Google 帳號裡。
免伺服器、免月費、內建排程，**內容池就是一張你看得到、改得動的 Google Sheet**。

排程策略：「內容池 + 每日抽取」——每天早上自動產一批草稿推你審，
核准的進「待發庫存」，每天 12:00 / 18:00 / 21:00 各自動抽最舊一篇雙發，庫存見底 LINE 提醒補稿。

---

## 檔案一覽

| 檔案 | 負責 |
|------|------|
| `Config.gs` | 設定（時段、篇數、門檻、四大支柱 CTA）、機密存取、小工具 |
| `Sheet.gs` | 內容池讀寫（Google Sheet 當資料庫） |
| `Generate.gs` | 產文引擎（Claude + 你的脆文邏輯 + 23 視角自檢） |
| `Line.gs` | LINE 推草稿（兩顆按鈕）、通知、回覆 |
| `Publish.gs` | Threads 兩段式 + FB 雙發、Threads token 自動續期 |
| `Scheduler.gs` | 觸發器進入點：`runGeneration` / `runPublishSlot` |
| `Main.gs` | LINE webhook：`doPost` / `doGet` |
| `Setup.gs` | 一次性安裝（建表、裝觸發器）＋ 測試函式 |
| `appsscript.json` | 時區設 Asia/Taipei、Web App 設定 |

---

## 你要先準備的鑰匙（存進「指令碼屬性」）

| 鍵名 | 哪裡拿 |
|------|--------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → Messaging API |
| `LINE_ADMIN_USER_ID` | 部署後傳訊息給機器人，它會回你（見下方步驟 6） |
| `THREADS_USER_ID` | 見下方「拿 Threads 憑證」 |
| `THREADS_ACCESS_TOKEN` | Meta App → Threads → 長效權杖 |
| `FB_PAGE_ID` | 你的粉專 → 關於 |
| `FB_PAGE_ACCESS_TOKEN` | Graph API Explorer 換長效粉專權杖，或用系統使用者發永久權杖 |

> 註：`LINE_CHANNEL_SECRET` 這版用不到（GAS 無法驗簽章，改用 userId 把關），可不填。

---

## 部署步驟

1. 開一份新的 Google 試算表 → 選單「擴充功能 → Apps Script」。
2. 把本資料夾每個 `.gs` 檔內容，逐一貼進 Apps Script 編輯器（用「＋」新增同名檔案）。
   `appsscript.json` 要在「專案設定 → 顯示 appsscript.json」打開後貼上（確認時區是 `Asia/Taipei`）。
3. **填秘密**：打開 `Config.gs` 的 `setupConfig_ONCE`，把值填進去 → 執行一次 →
   **再把程式碼裡的值清空、存檔**（值已存進指令碼屬性，不必留在程式碼裡）。
4. **建工作表**：執行 `setupSheet_ONCE`（會出現「內容池」分頁）。
5. **部署 Web App**：右上「部署 → 新增部署作業 → 網頁應用程式」，
   執行身分＝我、存取權＝任何人 → 複製網址，貼到
   **LINE Developers → Messaging API → Webhook URL**，開啟「Use webhook」。
6. **拿你的 userId**：把官方帳號加好友，傳一句話給它 → 它回你 userId →
   填進指令碼屬性 `LINE_ADMIN_USER_ID`。
7. **裝觸發器**：執行 `installTriggers_ONCE`（會跳授權，按同意）。
   之後每天 09:00 產文、12/18/21 發文、週一續 token 自動跑。

> ⚠️ 每次改完程式碼，若動到 `doPost`／`doGet`，要「**重新部署為新版本**」才生效——
> 這是最常見的「明明改了卻沒反應」原因。

---

## 拿 Threads 憑證（最容易卡的一關）

1. Threads App 把帳號切成**專業帳號**。
2. Meta App → 加 Threads 產品，開 `threads_basic` + `threads_content_publish`，產長效權杖 → 填 `THREADS_ACCESS_TOKEN`。
3. 拿 token 開這個網址，回傳的 `id` 就是 `THREADS_USER_ID`：
   `https://graph.threads.net/v1.0/me?fields=id,username&access_token=你的TOKEN`

Threads 長效 token 約 60 天到期，系統每週一自動續期並存進 `THREADS_TOKEN_LIVE`，你不用手動換。

---

## 測試方式（不用等排程）

1. `test_pushLine`：驗證 LINE 推播設定對不對——你的 LINE 應收到一則測試訊息。
2. `test_generateOne`：產一篇「老宅延壽」→ 寫進「內容池」→ 推到你 LINE。
   看 Log 有自檢分數，LINE 收到帶兩顆按鈕的草稿，按「✅核准」後回頭看 Sheet 狀態變 `approved`。
3. 手動執行 `runPublishSlot`：把剛核准那篇實際發到 Threads + FB，並回報結果。

---

## 之後你自己可以調（都在 `Config.gs`）

- 發文時段：改 `installTriggers_ONCE` 裡的 `atHour(...)`，再執行一次。
- 一天發幾篇：`POOL.DAILY_MAX`。
- 每次產幾篇：`POOL.GENERATE_BATCH`（GAS 有 6 分鐘上限，別設太大）。
- 補稿提醒門檻：`POOL.LOW_THRESHOLD`。
- 四大支柱 CTA／網址：`PILLARS`。
- 自檢門檻：`SELFCHECK.FIRE_MIN` / `EYEROLL_MAX`。
- 產文模型：`GEN_MODEL`。

---

## 已知限制

- GAS 單次執行上限 6 分鐘。產文每篇要呼叫一次 Claude，`GENERATE_BATCH` 預設 3、`MAX_RETRIES` 預設 1，控在安全範圍；要一次產更多請改用分批續跑。
- GAS `doPost` 拿不到 HTTP 標頭 → 無法驗 LINE 簽章，改用「只認你的 userId」把關。
- FB 對外發文需 App 審核通過；審核前可用開發者角色對自己的粉專測試。
