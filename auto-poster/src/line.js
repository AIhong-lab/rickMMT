// ============================================================
//  LINE Messaging API — 推播草稿（兩顆按鈕）+ 接收你的核准/退回
// ============================================================

const LINE_PUSH = 'https://api.line.me/v2/bot/message/push';
const LINE_REPLY = 'https://api.line.me/v2/bot/message/reply';

function headers(env) {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
  };
}

// 把一篇待審草稿推到你的 LINE，底下帶「✅核准 / ❌退回」兩顆按鈕
export async function pushDraft(env, post) {
  const body = {
    to: env.LINE_ADMIN_USER_ID,
    messages: [flexDraft(post)],
  };
  const res = await fetch(LINE_PUSH, { method: 'POST', headers: headers(env), body: JSON.stringify(body) });
  if (!res.ok) console.error('LINE push draft failed', res.status, await res.text());
}

// 純文字通知（補稿提醒、發布成功/失敗回報）
export async function pushText(env, text) {
  const body = { to: env.LINE_ADMIN_USER_ID, messages: [{ type: 'text', text }] };
  const res = await fetch(LINE_PUSH, { method: 'POST', headers: headers(env), body: JSON.stringify(body) });
  if (!res.ok) console.error('LINE push text failed', res.status, await res.text());
}

// 回覆使用者按鈕動作（用 replyToken，免費不計入推播額度）
export async function reply(env, replyToken, text) {
  const body = { replyToken, messages: [{ type: 'text', text }] };
  const res = await fetch(LINE_REPLY, { method: 'POST', headers: headers(env), body: JSON.stringify(body) });
  if (!res.ok) console.error('LINE reply failed', res.status, await res.text());
}

// Flex 泡泡：內容 + 自檢分數 + 兩顆 postback 按鈕
function flexDraft(post) {
  const scoreLine = `🔥 ${post.fire}　😐 ${post.neutral}　🙄 ${post.eyeroll}`;
  const preview = post.content.length > 300 ? post.content.slice(0, 300) + '…' : post.content;
  return {
    type: 'flex',
    altText: `【待審】${post.pillarLabel ?? ''} 新草稿，請核准或退回`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: `待審草稿 · ${post.pillarLabel ?? ''}`, size: 'sm', color: '#B76E17', weight: 'bold' },
          { type: 'text', text: preview, wrap: true, size: 'sm', color: '#20242E' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: scoreLine, size: 'xs', color: '#5C6072', margin: 'md' },
        ],
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', color: '#06C755', height: 'sm',
            action: { type: 'postback', label: '✅ 核准發布', data: `action=approve&id=${post.id}`, displayText: '✅ 核准發布' },
          },
          {
            type: 'button', style: 'primary', color: '#E0574F', height: 'sm',
            action: { type: 'postback', label: '❌ 退回重寫', data: `action=reject&id=${post.id}`, displayText: '❌ 退回重寫' },
          },
        ],
      },
    },
  };
}

// 驗證 LINE webhook 簽章（HMAC-SHA256，用 Workers 內建 Web Crypto）
export async function verifySignature(env, rawBody, signature) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.LINE_CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

// 解析 postback data："action=approve&id=xxxx" -> { action, id }
export function parsePostback(dataStr) {
  const p = new URLSearchParams(dataStr);
  return { action: p.get('action'), id: p.get('id') };
}
