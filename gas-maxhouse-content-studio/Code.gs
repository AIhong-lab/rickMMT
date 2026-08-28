// ===== 檔名：Code.gs =====
// v3 — 加網頁後台前的最小異動：
//      1) MAX_ROUNDS／PASS_FIRE／MAX_EYEROLL／WRITER_PROVIDER 這 4 個純數值/字串常數，
//         宣告從 const 改成 let——原因：品牌設定頁存的門檻要能在執行時覆寫這幾個值，
//         但 const 不能重新賦值。只改宣告方式，數值、函式邏輯完全沒動。
//         （CTA_TABLE、PERSONAS 是物件/陣列，維持 const，改用清空重填的方式覆寫內容，
//          所以不需要跟著改宣告方式，實際覆寫邏輯在 Settings.gs 的 applySettingsToRuntime_()。）
//      2) 新增 runFour()，依序測 4 組主題/支柱、可在編輯器直接執行，不影響既有 run()。
//      generatePost／buildWriterPrompt_／runAudit_／buildFeedback_／buildReport_／
//      callWriter_／callClaude_／callGemini_／parseJson_／testConnection／run
//      這些既有函式的簽名與內部邏輯一字未動。

// ── 模型設定 ──────────────────────────────
let WRITER_PROVIDER = 'claude';            // 寫手用哪家：'claude' 或 'gemini'。網頁「品牌設定」頁可覆寫這個值
const CLAUDE_MODEL = 'claude-sonnet-5';    // 寫手型號
const TEXT_MODEL = 'gemini-3.6-flash';     // 審稿官型號（Google 淘汰舊型號時改這行）
let MAX_ROUNDS = 3;            // 最多迭代幾輪。網頁「品牌設定」頁可覆寫這個值
let PASS_FIRE = 6;             // 🔥 至少幾個才過關。網頁「品牌設定」頁可覆寫這個值
let MAX_EYEROLL = 3;           // 🙄 最多幾個。網頁「品牌設定」頁可覆寫這個值

// ── 主題 × CTA 對照表 ─────────────────────
const CTA_TABLE = {
  '老宅延壽': { motive: '講座帶你看你家那棟能不能救', url: 'https://reurl.cc/A9x9Z3' },
  '老屋創收': { motive: '填表加 LINE@，帶你拆你手上這間怎麼動', url: 'https://reurl.cc/gr9r5N' },
  '甲醛檢測': { motive: '限量預約，先測先安心、先填先卡位', url: 'https://reurl.cc/Ga7a3Z' },
  'AI小知識': { motive: '加官方 LINE 學更多 AI 文案技巧', url: 'https://lin.ee/HZkET9I' },
  '綜合':     { motive: '雙北老屋規劃諮詢', url: 'https://lin.ee/VvSMM38' }
};

// ── 七種鉤子角度（每輪換一個，避免重寫時原地打轉）──
const HOOK_ANGLES = [
  '損失 framing：點出讀者正在失去什麼、或未來要付的代價',
  '反常識翻面：把以為的好意翻成包袱',
  '具體糟糕情境：用畫面感極強的爛狀況開場',
  '數字／對比反差：同樣的東西落在不同人身上差很多',
  '身分點名：直接點名某種人說過的某句話，讓他對號入座',
  '時間壓力：強調「等發現就來不及」',
  '內幕／同業視角：用「我看過最…」帶出權威感'
];

// ── 23 視角焦點團體 ───────────────────────
const PERSONAS = [
  '1. 53歲・雙北有間40年老公寓的爸爸——孩子不想接老房子，對「傳承變包袱」高度敏感【核心客】',
  '2. 31歲・懷孕6個月的準媽媽——對胎兒風險零容忍，會把內容轉給老公【核心客】',
  '3. 44歲・有過敏兒的媽媽——孩子過敏是死穴，看到甲醛內容會主動私訊【核心客】',
  '4. 36歲・手上有兩間出租房的小包租公——卡在租金要不要再投，務實派【核心客】',
  '5. 32歲・剛買中古屋準備裝潢——延壽和甲醛同時命中，最理想目標客【核心客】',
  '6. 41歲・很養生的家庭主婦——對家裡空氣品質敏感，剛裝潢完有怪味就會行動【核心客】',
  '7. 47歲・卡在中年想要被動收入——被焦慮句打中，但也怕被當韭菜【核心客】',
  '8. 28歲・月薪3萬5的月光族——對「第二間第三間」會出戲，覺得離自己太遠【邊緣客】',
  '9. 38歲・單親媽媽租屋族——房產內容無感，但跟小孩有關的會多看一眼【邊緣客】',
  '10. 60歲・退休、老家有祖厝——內容認同，但看到「報名講座」會警戒是不是要花錢【邊緣客】',
  '11. 58歲・長輩、平常只用LINE——看得懂也認同，但不習慣在脆上點連結【邊緣客】',
  '12. 42歲・養兩隻貓的鏟屎官——對「毛孩不會說不舒服」這種愧疚鉤子沒抵抗力【邊緣客】',
  '13. 22歲・大學生——房子、甲醛、孕婦都跟他無關，純路過【路人】',
  '14. 33歲・正在看預售屋的首購族——煩惱頭期款，這些不是當下痛點【路人】',
  '15. 55歲・有三棟透天的地主——覺得自己早就懂，內容是寫給新手的【路人】',
  '16. 39歲・科技業上班族・沒小孩沒房——生活沒交集，除非鉤子夠有趣才會停【路人】',
  '17. 50歲・房仲同業——一看就知道是同行拉客，會研究鉤子但不會是客戶【同業】',
  '18. 39歲・保險業務——來偷學CTA寫法，比「歡迎報名」高明就記下來【同業】',
  '19. 26歲・經營IG／脆的小編——對AI那篇的Prompt沒抵抗力，有用就存起來【同業】',
  '20. 45歲・行銷主管——AI概念早就在用，會默默存Prompt但不點LINE【同業】',
  '21. 29歲・工程師、數據控——「好幾倍」「90%」沒來源就不信【挑毛病】',
  '22. 27歲・鄉民體質——看到模糊數字會在留言區開嗆，但「想吐槽」也算停留【挑毛病】',
  '23. 36歲・設計師、超討厭業配感——內容好但每篇掛網址看多了像廣告農場【挑毛病】'
];

/**
 * 主入口：改下面兩行，按執行，去「執行記錄」看結果
 */
function run() {
  const 主題 = '老公寓外牆磁磚剝落，屋主以為是小問題';   // ← 改這裡
  const 支柱 = '老宅延壽';                              // ← 老宅延壽 / 老屋創收 / 甲醛檢測 / AI小知識 / 綜合

  const 結果 = generatePost(主題, 支柱);
  Logger.log(結果.report);
}

/**
 * 編輯器測試用：依序跑 4 組主題/支柱（對應一天四更），每篇跑完把 report 印到 Log。
 * 網頁掛掉時，這個跟 run() 都還能在編輯器裡直接用。
 * 要測不同題目就直接改下面陣列裡的值。
 */
function runFour() {
  const 四篇 = [
    { topic: '老公寓外牆磁磚剝落，屋主以為是小問題', pillar: '老宅延壽' },
    { topic: '一間閒置老屋放到爛掉，房東才發現少賺的是機會成本', pillar: '老屋創收' },
    { topic: '裝潢完通風三個月還是有味道，甲醛可能還在超標', pillar: '甲醛檢測' },
    { topic: '用 AI 寫文案前，先搞懂這三個提示詞技巧', pillar: 'AI小知識' }
  ];

  四篇.forEach(function (item, i) {
    const 結果 = generatePost(item.topic, item.pillar);
    Logger.log('════════ 第 ' + (i + 1) + ' 篇 ════════');
    Logger.log(結果.report);
  });
}

/**
 * 產稿主流程：寫 → 檢 → 未過關退回重寫，最多 MAX_ROUNDS 輪
 * 之後要加網頁介面時，直接呼叫這個函式即可，不用重寫產稿邏輯
 * @param {string} topic 這篇要講什麼
 * @param {string} pillar 內容支柱（對應 CTA_TABLE 的 key）
 * @return {{passed:boolean, post:string, audit:Object, rounds:number, report:string}}
 */
function generatePost(topic, pillar) {
  if (!CTA_TABLE[pillar]) {
    throw new Error('支柱名稱錯誤，只能是：' + Object.keys(CTA_TABLE).join('／'));
  }

  let post = '';
  let audit = null;
  let feedback = '';        // 上一輪自檢的修改情報，第一輪為空
  let round = 0;

  while (round < MAX_ROUNDS) {
    round++;
    // 每輪換一個鉤子角度，避免重寫時又寫出同一招
    const angle = HOOK_ANGLES[(round - 1) % HOOK_ANGLES.length];

    post = callWriter_(buildWriterPrompt_(topic, pillar, angle, feedback));   // v2：寫手改走 callWriter_
    audit = runAudit_(post);

    if (audit.passed) break;

    // 把這輪的失敗原因整理成下一輪的修改指令
    feedback = buildFeedback_(audit);
  }

  return {
    passed: audit.passed,
    post: post,
    audit: audit,
    rounds: round,
    report: buildReport_(topic, pillar, post, audit, round)
  };
}

/**
 * 組寫手 prompt
 */
function buildWriterPrompt_(topic, pillar, angle, feedback) {
  const cta = CTA_TABLE[pillar];
  const 修改區 = feedback
    ? '\n【上一版沒過關，這次一定要修掉這些問題】\n' + feedback + '\n'
    : '';

  return [
    '你是包租翁 MAX HOUSE 的 Threads（脆）文案寫手。用流暢的台灣口語中文寫一篇貼文。',
    '',
    '【這篇的主題】' + topic,
    '【內容支柱】' + pillar,
    '【這次指定的鉤子角度】' + angle,
    修改區,
    '【五段結構，每篇都照這個骨架】',
    '1. 黃金三秒鉤子句：第一句必須打破常識、點名痛點、或丟出具體到有畫面的糟糕情境。絕對禁止「哈囉大家好」「今天來分享」「跟大家聊聊」這類開場。',
    '2. 反差展開：把鉤子撕開——把大眾以為的「好意／常識」翻面露出殘酷現實，或用具體情境對比出專業的重要性。',
    '3. ✅ 四點結構：四個 ✅ 開頭的條列，每點是「短標籤：一句說明」。',
    '4. 逼近代價的轉折：條列後丟一句讓人意識到「不處理會怎樣」的轉折句。',
    '5. 低門檻 CTA：融入脆的閒聊／抱團文化，自然帶到網址。',
    '',
    '【CTA 指定】動機是「' + cta.motive + '」，網址完整貼出不縮短：' + cta.url,
    'CTA 用語可以換句話說，但要保留「給對方一個動機」的精神，不要退回「歡迎報名」這種無動機句。',
    '',
    '【硬規則，違反就是失敗】',
    '- 台灣口語。禁止中國用語（視頻、質量、信息、牛逼、給力）和生硬贅字。',
    '- 每段不超過 3 行，善用換行與空行製造呼吸感。',
    '- 表情符號全篇最多 1–2 個，✅ 條列不算在內。',
    '- 禁止捏造數據。沒有實際來源的數字（瀏覽量、濃度倍數、百分比）一律不准寫死；改成不需舉證的說法，或在該處標註「⚠️此處數字需補實測來源」。',
    '- 禁止使用「免費」當誘因。',
    '- 不要寫得太文謅謅。這是社群貼文不是文章，句子長短要有變化，該口語就口語。',
    '',
    '只輸出貼文全文本身，不要任何前言、說明、標題或引號。'
  ].join('\n');
}

/**
 * 跑 23 視角自檢，過關與否由 GAS 自己算（不讓模型自己判斷，模型會替自己護航）
 */
function runAudit_(post) {
  const prompt = [
    '以下是一篇要發在 Threads（脆）的貼文。請用 23 個固定人物各給一個直覺反應。',
    '',
    '【貼文】',
    post,
    '',
    '【23 個人物】',
    PERSONAS.join('\n'),
    '',
    '【反應只能三選一】',
    'fire = 會停下來、想點連結或追蹤',
    'neutral = 直接滑過、無感',
    'eyeroll = 反感、起戒心、或想吐槽',
    '',
    '要誠實，不要替這篇貼文護航。路人滑過就是滑過，同業覺得是同行拉客就直說。',
    '',
    '【輸出格式】只輸出 JSON，不要 markdown 標記、不要任何說明文字：',
    '{"reactions":[{"id":1,"r":"fire","why":"一句理由"}, ...共23筆...],',
    '"fixes":["可修的問題點，例如：數據沒來源／太像廣告／鉤子不夠痛"]}'
  ].join('\n');

  const raw = callGemini_(prompt);
  const data = parseJson_(raw);

  let fire = 0, neutral = 0, eyeroll = 0;
  const fireFromCore = [];   // 🔥 來自核心客(1-7) 才是最健康的
  (data.reactions || []).forEach(function (x) {
    if (x.r === 'fire') { fire++; if (x.id <= 7) fireFromCore.push(x.id); }
    else if (x.r === 'eyeroll') { eyeroll++; }
    else { neutral++; }
  });

  return {
    passed: (fire >= PASS_FIRE && eyeroll <= MAX_EYEROLL),
    fire: fire,
    neutral: neutral,
    eyeroll: eyeroll,
    coreFireCount: fireFromCore.length,
    reactions: data.reactions || [],
    fixes: data.fixes || []
  };
}

/**
 * 把自檢失敗原因轉成給寫手的修改指令
 */
function buildFeedback_(audit) {
  const lines = [];
  if (audit.fire < PASS_FIRE) {
    lines.push('🔥 只有 ' + audit.fire + ' 個（要 ' + PASS_FIRE + ' 個以上）：鉤子不夠痛，換一個角度重寫開頭。');
  }
  if (audit.eyeroll > MAX_EYEROLL) {
    lines.push('🙄 有 ' + audit.eyeroll + ' 個（最多 ' + MAX_EYEROLL + ' 個）：業配感或防禦點太重，把 CTA 講得更像分享、拔掉沒來源的數字。');
  }
  // 挑毛病的人(21-23)的 🙄 是最值錢的修改情報
  audit.reactions.forEach(function (x) {
    if (x.r === 'eyeroll' && x.id >= 21) lines.push('挑毛病視角#' + x.id + ' 的意見：' + x.why);
  });
  (audit.fixes || []).forEach(function (f) { lines.push('可修：' + f); });
  return lines.join('\n');
}

/**
 * 組成 Log 用的報告
 */
function buildReport_(topic, pillar, post, audit, rounds) {
  const out = [];
  out.push('════════ 貼文全文（可直接複製）════════');
  out.push(post);
  out.push('');
  out.push('════════ 自檢結果 ════════');
  out.push('主題：' + topic + '｜支柱：' + pillar + '｜寫手：' + WRITER_PROVIDER + '｜迭代 ' + rounds + ' 輪');
  out.push('🔥 ' + audit.fire + '　😐 ' + audit.neutral + '　🙄 ' + audit.eyeroll);
  out.push('其中來自核心客(1-7)的 🔥：' + audit.coreFireCount + ' 個');
  out.push(audit.passed ? '✅ 過關' : '❌ 迭代 ' + rounds + ' 輪仍未過關，卡點如下，請你自己判斷要不要發：');
  if (!audit.passed) out.push(buildFeedback_(audit));
  if (audit.fixes && audit.fixes.length) {
    out.push('');
    out.push('可優化的點：');
    audit.fixes.forEach(function (f) { out.push('・' + f); });
  }
  if (post.indexOf('⚠️') > -1) {
    out.push('');
    out.push('⚠️ 文中有標註待補實測數據的地方，發文前補上或拿掉。');
  }
  return out.join('\n');
}

/**
 * 寫手分流：依 WRITER_PROVIDER 決定走哪一家
 * 之後要加第三家（GPT）時，只要在這裡多一個分支
 */
function callWriter_(prompt) {
  if (WRITER_PROVIDER === 'gemini') return callGemini_(prompt);
  return callClaude_(prompt);
}

/**
 * 呼叫 Claude（Anthropic Messages API）
 * ⚠️ 請對照官方文件確認端點與參數：https://docs.claude.com/en/api/overview
 */
function callClaude_(prompt) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('找不到 ANTHROPIC_API_KEY，請先到「專案設定 → 指令碼屬性」新增。');

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': key,                    // ⚠️ 金鑰走 header，不放在網址上
      'anthropic-version': '2023-06-01'    // 這個版本字串是固定的，不是日期，不要改
    },
    payload: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,                    // 一篇脆文遠遠用不到，設寬一點免得被截斷
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code !== 200) throw new Error('Claude 回應 ' + code + '：' + body);

  const data = JSON.parse(body);
  if (!data.content || !data.content.length) throw new Error('Claude 沒有回傳內容：' + body);
  return data.content[0].text.trim();
}

/**
 * 呼叫 Gemini 文字模型（審稿官用）
 * ⚠️ 請對照官方文件確認端點與參數（generativelanguage v1beta）
 */
function callGemini_(prompt) {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('找不到 GEMINI_API_KEY，請先到「專案設定 → 指令碼屬性」新增。');

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + TEXT_MODEL + ':generateContent';
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': key },   // ⚠️ 金鑰走 header，不放在網址上，避免出現在 Log
    payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code !== 200) throw new Error('Gemini 回應 ' + code + '：' + body);

  const data = JSON.parse(body);
  if (!data.candidates || !data.candidates.length) throw new Error('Gemini 沒有回傳內容：' + body);
  return data.candidates[0].content.parts[0].text.trim();
}

/**
 * 解析模型回傳的 JSON（模型常會多包一層 ```json，先剝掉）
 */
function parseJson_(text) {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error('自檢結果不是合法 JSON，原始回傳：\n' + text);
  }
}

/**
 * 測試用：兩把金鑰各打一次，確認都通。不產稿、花費極少
 */
function testConnection() {
  try {
    Logger.log('[Gemini] ' + callGemini_('回覆兩個字：正常'));
  } catch (e) {
    Logger.log('[Gemini] 失敗：' + e.message);
  }
  try {
    Logger.log('[Claude] ' + callClaude_('回覆兩個字：正常'));
  } catch (e) {
    Logger.log('[Claude] 失敗：' + e.message);
  }
}

// ── 本檔函式清單 ──────────────────────────
// run / runFour / generatePost / buildWriterPrompt_ / runAudit_ / buildFeedback_
// buildReport_ / callWriter_ / callClaude_ / callGemini_ / parseJson_ / testConnection
