-- 內容池資料表。用 Cloudflare D1（SQLite）。
-- 建立：wrangler d1 execute rickmmt-autopost --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,        -- 隨機 id
  pillar        TEXT NOT NULL,           -- 內容支柱 key（longevity / income / ...）
  content       TEXT NOT NULL,           -- 貼文全文（含 CTA 網址）
  image_url     TEXT,                    -- 選填：圖卡網址
  fire          INTEGER DEFAULT 0,       -- 自檢 🔥 數
  neutral       INTEGER DEFAULT 0,       -- 自檢 😐 數
  eyeroll       INTEGER DEFAULT 0,       -- 自檢 🙄 數
  status        TEXT NOT NULL,           -- pending / approved / rejected / published / failed
  created_at    TEXT NOT NULL,           -- ISO 時間
  approved_at   TEXT,
  published_at  TEXT,
  publish_note  TEXT                     -- 發布結果（threads / fb 各自成功或錯誤）
);

CREATE INDEX IF NOT EXISTS idx_posts_status  ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
