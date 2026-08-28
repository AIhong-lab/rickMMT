// ===== 檔名：Line.gs =====
// v2 — LINE Messaging API：推草稿（兩顆按鈕）、純文字通知、回覆、解析 postback
// ⚠️ 端點與 payload 格式請對照 LINE Messaging API 官方文件確認

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

function lineHeaders_() {
  return { 'Authorization': 'Bearer ' + getConfig_('LINE_CHANNEL_ACCESS_TOKEN') };
}

// 把一篇待審草稿推到你的 LINE（帶「✅核准 / ❌退回」）
function pushDraft_(post) {
  const body = {
    to: getConfig_('LINE_ADMIN_USER_ID'),
    messages: [flexDraft_(post)],
  };
  const res = UrlFetchApp.fetch(LINE_PUSH_URL, {
    method: 'post', contentType: 'application/json',
    headers: lineHeaders_(), payload: JSON.stringify(body), muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) Logger.log('pushDraft 失敗：' + res.getContentText());
}

// 純文字通知（補稿提醒、發布回報）
function pushText_(text) {
  const body = { to: getConfig_('LINE_ADMIN_USER_ID'), messages: [{ type: 'text', text: text }] };
  const res = UrlFetchApp.fetch(LINE_PUSH_URL, {
    method: 'post', contentType: 'application/json',
    headers: lineHeaders_(), payload: JSON.stringify(body), muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) Logger.log('pushText 失敗：' + res.getContentText());
}

// 回覆使用者動作（用 replyToken，不計推播額度）
function replyToLine_(replyToken, text) {
  const body = { replyToken: replyToken, messages: [{ type: 'text', text: text }] };
  UrlFetchApp.fetch(LINE_REPLY_URL, {
    method: 'post', contentType: 'application/json',
    headers: lineHeaders_(), payload: JSON.stringify(body), muteHttpExceptions: true,
  });
}

// Flex 泡泡：內容 + 自檢分數 + 兩顆 postback 按鈕
function flexDraft_(post) {
  const scoreLine = '🔥 ' + post.fire + '　😐 ' + post.neutral + '　🙄 ' + post.eyeroll;
  const preview = post.content.length > 300 ? post.content.slice(0, 300) + '…' : post.content;
  const label = pillarName_(post.pillar);
  return {
    type: 'flex',
    altText: '【待審】' + label + ' 新草稿，請核准或退回',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: '待審草稿 · ' + label, size: 'sm', color: '#B76E17', weight: 'bold' },
          { type: 'text', text: preview, wrap: true, size: 'sm', color: '#20242E' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: scoreLine, size: 'xs', color: '#5C6072', margin: 'md' },
        ],
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', color: '#06C755', height: 'sm',
            action: { type: 'postback', label: '✅ 核准發布', data: 'action=approve&id=' + post.id, displayText: '✅ 核准發布' } },
          { type: 'button', style: 'primary', color: '#E0574F', height: 'sm',
            action: { type: 'postback', label: '❌ 退回重寫', data: 'action=reject&id=' + post.id, displayText: '❌ 退回重寫' } },
        ],
      },
    },
  };
}

// 注意：GAS 的 doPost 拿不到 HTTP 標頭，無法驗 x-line-signature（GAS 先天限制）。
// 改以「只處理你本人的 userId」把關（見 Main.gs），並靠部署網址本身不外流。
// 這對「只影響自己審核佇列」的用途足夠安全。

// 解析 postback data："action=approve&id=xxxx"
function parsePostback_(dataStr) {
  const out = {};
  String(dataStr).split('&').forEach(function (kv) {
    const p = kv.split('=');
    out[p[0]] = decodeURIComponent(p[1] || '');
  });
  return out;
}

// ---- 本檔函式清單 ----
// lineHeaders_ / pushDraft_ / pushText_ / replyToLine_ / flexDraft_ / parsePostback_
