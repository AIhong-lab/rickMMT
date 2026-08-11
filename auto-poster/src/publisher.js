// ============================================================
//  發布協調器 — 同時發 Threads + Facebook，容忍單邊失敗、回報到 LINE
// ============================================================
import { publishThreads } from './threads.js';
import { publishFacebook } from './facebook.js';
import { markPublished, markFailed } from './db.js';
import { pushText } from './line.js';

// 發一篇 post 到雙平台。回傳 { ok, note }
export async function publishPost(env, post) {
  const [th, fb] = await Promise.allSettled([
    publishThreads(env, post.content, post.image_url),
    publishFacebook(env, post.content, post.image_url),
  ]);

  const thOk = th.status === 'fulfilled';
  const fbOk = fb.status === 'fulfilled';
  const note = JSON.stringify({
    threads: thOk ? `ok:${th.value}` : `err:${String(th.reason).slice(0, 200)}`,
    facebook: fbOk ? `ok:${fb.value}` : `err:${String(fb.reason).slice(0, 200)}`,
  });

  if (thOk || fbOk) {
    // 只要有一邊成功就算發出（避免重複發已成功那邊）。若一邊失敗，通知你手動補。
    await markPublished(env, post.id, note);
    const flag = thOk && fbOk ? '✅ 雙平台都成功' : '⚠️ 有一邊失敗';
    await pushText(env, `${flag}\nThreads：${thOk ? '成功' : '失敗'}｜FB：${fbOk ? '成功' : '失敗'}\n${post.content.slice(0, 40)}…`);
    return { ok: true, note };
  }

  // 兩邊都失敗：留在庫存，下個時段自動重試，並提醒你
  await markFailed(env, post.id, note);
  await pushText(env, `❌ 發文兩邊都失敗，已保留待重試。\n${note}`);
  return { ok: false, note };
}
