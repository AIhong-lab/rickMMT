// ===== 檔名：Scheduler.gs =====
// v1 — 觸發器進入點：產文批次、發文時段
// 這兩個函式名字會被時間觸發器叫到，不要改名。

// 每天 09:00 觸發：產一批草稿 → 自檢 → 過關的推到 LINE 待審
function runGeneration() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) { Logger.log('另一程序進行中，略過產文'); return; }
  try {
    const pillars = pickPillarsForBatch_(POOL.GENERATE_BATCH);
    let pushed = 0, skipped = 0;
    for (let i = 0; i < pillars.length; i++) {
      try {
        const draft = generateOne_(pillars[i]);
        if (!draft.passed) { skipped++; continue; } // 沒過自檢不交出去
        const id = insertPending_({
          pillar: draft.pillar, content: draft.content, imageUrl: '',
          fire: draft.fire, neutral: draft.neutral, eyeroll: draft.eyeroll,
        });
        pushDraft_({ id: id, content: draft.content, fire: draft.fire, neutral: draft.neutral, eyeroll: draft.eyeroll, pillar: draft.pillar });
        pushed++;
      } catch (e) {
        Logger.log('產文錯誤 ' + pillars[i].key + '：' + e);
        skipped++;
      }
    }
    pushText_('📝 今日產文完成：' + pushed + ' 篇待你審核' + (skipped ? ('，' + skipped + ' 篇沒過自檢已跳過') : '') + '。');
  } finally {
    lock.releaseLock();
  }
}

// 12:00 / 18:00 / 21:00 各觸發一次：從待發庫存抽最舊一篇雙發
function runPublishSlot() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) { Logger.log('另一程序進行中，略過發文'); return; }
  try {
    if (countPublishedToday_() >= POOL.DAILY_MAX) { Logger.log('已達今日上限，略過'); return; }

    const next = nextApproved_();
    if (!next) { pushText_('⏰ 到發文時段，但待發庫存是空的。要不要補審幾篇？'); return; }

    publishOne_(next.rowIndex, next.data);

    const left = countApproved_();
    if (left <= POOL.LOW_THRESHOLD) {
      pushText_('🪫 待發庫存剩 ' + left + ' 篇（低於 ' + POOL.LOW_THRESHOLD + '）。找時間審一批補進彈藥庫吧。');
    }
  } finally {
    lock.releaseLock();
  }
}

// ---- 本檔函式清單 ----
// runGeneration / runPublishSlot
