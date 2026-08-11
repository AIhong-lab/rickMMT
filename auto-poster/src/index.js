// ============================================================
//  Cloudflare Worker 入口
//   - fetch()     ：接 LINE webhook（你按核准/退回的按鈕）
//   - scheduled() ：cron 觸發產文 / 發文
// ============================================================
import { verifySignature, parsePostback, reply } from './line.js';
import { approve, reject, getPost } from './db.js';
import { runGeneration, runPublishSlot } from './scheduler.js';

export default {
  // ---------- HTTP：LINE webhook ----------
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response('ok', { status: 200 });
    }

    if (url.pathname === '/webhook/line' && request.method === 'POST') {
      const raw = await request.text();
      const sig = request.headers.get('x-line-signature');
      if (!(await verifySignature(env, raw, sig))) {
        return new Response('bad signature', { status: 401 });
      }
      // 先回 200 給 LINE，事件在背景處理（避免逾時）
      ctx.waitUntil(handleLineEvents(env, raw));
      return new Response('ok', { status: 200 });
    }

    return new Response('not found', { status: 404 });
  },

  // ---------- Cron：產文 / 發文 ----------
  async scheduled(event, env, ctx) {
    // 依 cron 字串決定要做什麼（見 wrangler.toml 註解，時間為 UTC）
    // "0 1 * * *"  = 台灣 09:00 → 產文批次
    // "0 4 * * *"  = 台灣 12:00 → 發文
    // "0 10 * * *" = 台灣 18:00 → 發文
    // "0 13 * * *" = 台灣 21:00 → 發文
    if (event.cron === '0 1 * * *') {
      ctx.waitUntil(runGeneration(env));
    } else {
      ctx.waitUntil(runPublishSlot(env));
    }
  },
};

async function handleLineEvents(env, raw) {
  let body;
  try { body = JSON.parse(raw); } catch { return; }
  for (const ev of body.events ?? []) {
    if (ev.type !== 'postback') continue;
    const { action, id } = parsePostback(ev.postback.data);
    const post = await getPost(env, id);

    if (!post) { await reply(env, ev.replyToken, '這篇找不到了（可能已處理過）。'); continue; }
    if (post.status !== 'pending') { await reply(env, ev.replyToken, `這篇已經是「${post.status}」狀態，不用再動它。`); continue; }

    if (action === 'approve') {
      await approve(env, id);
      await reply(env, ev.replyToken, '✅ 已核准，排入待發庫存，時間到會自動雙發。');
    } else if (action === 'reject') {
      await reject(env, id);
      await reply(env, ev.replyToken, '❌ 已退回。下次產文批次會重寫這個主題。');
    }
  }
}
