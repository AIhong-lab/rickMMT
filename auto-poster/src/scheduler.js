// ============================================================
//  排程邏輯（策略 C：內容池 + 每日抽取）
//   - runGeneration：產一批草稿 → 自檢 → 過關的推到 LINE 待審
//   - runPublishSlot：時段一到，從待發庫存抽最舊一篇雙發
// ============================================================
import { POOL, pickPillarsForBatch, PILLARS } from './config.js';
import { generateOne } from './generate.js';
import { insertPending, nextApproved, countApproved, countPublishedToday } from './db.js';
import { pushDraft, pushText } from './line.js';
import { publishPost } from './publisher.js';

const pillarLabel = (key) => PILLARS.find((p) => p.key === key)?.name ?? key;

// —— 產文批次 ——
export async function runGeneration(env) {
  const pillars = pickPillarsForBatch(POOL.GENERATE_BATCH);
  let pushed = 0, skipped = 0;

  for (const pillar of pillars) {
    try {
      const draft = await generateOne(env, pillar);
      if (!draft.passed) { skipped++; continue; } // 自檢沒過關，不交出去

      const id = await insertPending(env, {
        pillar: draft.pillar,
        content: draft.content,
        imageUrl: null,
        fire: draft.fire, neutral: draft.neutral, eyeroll: draft.eyeroll,
      });
      await pushDraft(env, {
        id, content: draft.content,
        fire: draft.fire, neutral: draft.neutral, eyeroll: draft.eyeroll,
        pillarLabel: pillarLabel(draft.pillar),
      });
      pushed++;
    } catch (e) {
      console.error('generate error', pillar.key, e);
      skipped++;
    }
  }

  await pushText(env, `📝 今日產文完成：${pushed} 篇待你審核${skipped ? `，${skipped} 篇沒過自檢已跳過` : ''}。`);
}

// —— 單一發文時段 ——
export async function runPublishSlot(env) {
  const publishedToday = await countPublishedToday(env);
  if (publishedToday >= POOL.DAILY_MAX) {
    console.log('已達今日上限，跳過此時段');
    return;
  }

  const post = await nextApproved(env);
  if (!post) {
    await pushText(env, '⏰ 到發文時段，但待發庫存是空的。要不要補審幾篇？');
    return;
  }

  await publishPost(env, post);

  // 庫存偏低就提醒補稿
  const left = await countApproved(env);
  if (left <= POOL.LOW_THRESHOLD) {
    await pushText(env, `🪫 待發庫存剩 ${left} 篇（低於 ${POOL.LOW_THRESHOLD}）。找時間審一批補進彈藥庫吧。`);
  }
}
