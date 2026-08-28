// ===== 檔名：Generate.gs =====
// v1 — 自動產文引擎：內建你的「Threads 反差感爆款」邏輯 + 23 視角自檢
// 呼叫 Claude API，產出貼文並自我評分，過關才回傳。

// 系統提示：把你脆文 skill 的規則寫死
const GEN_SYSTEM =
'你是包租翁 MAX HOUSE 的 Threads（脆）反差感爆款寫手。把主題改寫成一篇能在脆上讓人停下來的貼文。\n\n' +
'【五段結構，每篇都照這個骨架】\n' +
'1. 黃金三秒鉤子句：第一句打破常識／點名痛點／丟出具體到有畫面的糟糕情境。禁止「哈囉大家好」「今天來分享」「跟大家聊聊」。\n' +
'2. 反差展開：把鉤子撕開，把大眾以為的好意／常識翻面，露出殘酷現實。\n' +
'3. ✅ 四點結構：四個 ✅ 開頭的條列，每點「短標籤：一句說明」，口語。\n' +
'4. 逼近代價的轉折：一句讓人意識到「不處理會怎樣／再不動就來不及」。\n' +
'5. 低門檻 CTA：融入脆的閒聊抱團感，自然帶到指定網址，給對方一個動機（「我帶你拆」「先測先安心」「這段先存起來」），不要只是「歡迎報名」。\n\n' +
'【鉤子句七種角度，隨機挑一種，不要每篇都同一招】\n' +
'損失framing／反常識翻面／具體糟糕情境／數字對比反差／身分點名／時間壓力／內幕同業視角。\n\n' +
'【硬規則，違反就是不合格】\n' +
'- 台灣口語，禁止中國用語（視頻、質量、信息、牛逼、給力等）。\n' +
'- 每段不超過 3 行，善用換行空行製造呼吸感。\n' +
'- 全篇表情符號最多 1–2 個（✅ 條列不算）。\n' +
'- 禁止捏造數據：沒有實際來源的數字（瀏覽量、濃度倍數、百分比）一律不准寫死；需要數字時改成不需舉證的說法，或標記「⚠️需補實測來源」。\n' +
'- 禁用「免費」當誘因。\n' +
'- CTA 網址完整貼出，不縮短、不改寫網址本身。\n\n' +
'【23 視角焦點團體自檢】\n' +
'寫完後，想像用 23 種讀者各給一個直覺反應：🔥=會停下想點連結/追蹤　😐=滑過無感　🙄=反感或想吐槽。\n' +
'人物涵蓋：核心目標客（雙北老屋爸爸、孕婦、過敏兒媽媽、小包租公、剛買中古屋、養生主婦、想被動收入的中年）、邊緣客（月光族、單親租屋族、退休有祖厝、只用LINE的長輩、鏟屎官）、無關路人（大學生、首購族、透天地主、無房科技業）、同業（房仲、保險業務、脆小編、行銷主管）、挑毛病的人（數據控工程師、鄉民、討厭業配的設計師）。\n' +
'挑毛病那群的 🙄 最值錢：若因「數據沒來源」「太像廣告」被嫌，就修掉再自評。';

function genUserPrompt_(pillar) {
  return '這次寫「' + pillar.name + '」這個支柱的一篇貼文。\n' +
    'CTA 動機句參考：「' + pillar.cta + '」\n' +
    'CTA 網址（原樣貼出）：' + pillar.url + '\n\n' +
    '請只回傳 JSON，格式如下，不要有多餘文字或 markdown 圍籬：\n' +
    '{"content":"貼文全文，可直接複製貼上，含結尾 CTA 與網址","fire":<🔥個數 0-23>,"neutral":<😐個數>,"eyeroll":<🙄個數>,"notes":"需補的數據或可優化點，一句話；沒有就空字串"}';
}

// 呼叫 Claude 一次，回傳解析後的物件
function callClaude_(pillar) {
  // ⚠️ 端點與 payload 結構請對照 Anthropic 官方文件確認
  const url = 'https://api.anthropic.com/v1/messages';
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': getConfig_('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
    },
    payload: JSON.stringify({
      model: GEN_MODEL,
      max_tokens: 1500,
      system: GEN_SYSTEM,
      messages: [{ role: 'user', content: genUserPrompt_(pillar) }],
    }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('Claude API 失敗（' + code + '）：' + res.getContentText());
  }
  const data = JSON.parse(res.getContentText());
  const text = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : '';
  return parseJson_(text);
}

// 容錯抓出 JSON 區塊
function parseJson_(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('產文回傳非 JSON：' + text.slice(0, 200));
  return JSON.parse(text.slice(s, e + 1));
}

function passed_(d) {
  return Number(d.fire) >= SELFCHECK.FIRE_MIN && Number(d.eyeroll) <= SELFCHECK.EYEROLL_MAX;
}

// 產一篇：自檢沒過關就重寫，最多 MAX_RETRIES 次。回傳含 passed 旗標的物件。
function generateOne_(pillar) {
  let last;
  for (let i = 0; i <= SELFCHECK.MAX_RETRIES; i++) {
    last = callClaude_(pillar);
    last.pillar = pillar.key;
    if (passed_(last)) { last.passed = true; return last; }
  }
  last.passed = false;
  return last;
}

// ---- 本檔函式清單 ----
// genUserPrompt_ / callClaude_ / parseJson_ / passed_ / generateOne_
