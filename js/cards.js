/*
 * 圖卡產生器 (cards.js)
 * 獨立功能：不改動排盤輸入、報告生成、白話報告、列印。
 * 圖卡配色以模板為準（深藍漸層 + 金 #D9B65C + Noto Sans TC），與網站 --gold/--accent 分離。
 */
(function () {
  'use strict';
  var D = window.MMTData || {};
  var STORE_KEY = 'mmt:cards';

  // ---------- 小工具 ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inputVal(id) { var n = document.getElementById(id); return n ? n.value.trim() : ''; }
  function fmtNums(str) {
    return String(str || '').split(/[^0-9]+/).filter(function (x) { return x !== ''; }).join('・');
  }
  function firstNum(str) { var m = String(str || '').match(/\d+/); return m ? m[0] : ''; }
  function sentence1(text) {
    if (!text) return '';
    var s = String(text).replace(/^[^　]*　/, '').replace(/^導\d+/, '').replace(/^陰\d+/, '');
    var parts = s.split(/(?<=[。！？])/).filter(function (x) { return x.trim(); });
    return (parts[0] || '').replace(/[。！？]+$/, '').trim();
  }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) : s; }
  function lastResult() { return window.__mmtLastResult || null; }
  function talentGist(num) {
    var narr = (D.NARRATIVE && D.NARRATIVE[num]) ? D.NARRATIVE[num] : '';
    return sentence1(narr.replace(/^\s*\d+號・[^｜]*｜\s*/, ''));
  }
  function distinctTalents(r) {
    var seen = {}, out = [];
    (r && r.talentCards || []).forEach(function (n) { if (!seen[n]) { seen[n] = 1; out.push(n); } });
    return out;
  }
  function isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function ymd() {
    var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }
  function safeName(s) { return String(s || '').replace(/[\\/:*?"<>|\s]+/g, '') || '天賦盤'; }

  // ---------- 自動草稿（從報告內容抓核心天賦，抓不到留空） ----------
  function draftA() {
    var d = { axis: '', o1t: '', o1d: '', o2t: '', o2d: '', o3t: '', o3d: '', practice: '' };
    var r = lastResult(); if (!r) return d;
    var order = ['風', '火', '水', '土'];
    var top = order.slice().sort(function (a, b) {
      return (r.energy[b] ? r.energy[b].percent : 0) - (r.energy[a] ? r.energy[a].percent : 0);
    })[0];
    var pursue = (D.ELEMENTS && D.ELEMENTS[top]) ? D.ELEMENTS[top].pursue : '';
    var star = (r.completeCards && r.completeCards[0] != null) ? r.completeCards[0]
      : ((r.prominentCards && r.prominentCards[0]) ? r.prominentCards[0].num : r.talentCards[0]);
    var st = D.TALENTS && D.TALENTS[star];
    if (pursue && st) d.axis = clip('以「' + pursue + '」發光的' + st.name + '型天賦', 40);
    var obs = distinctTalents(r).slice(0, 3).map(function (n) {
      var t = D.TALENTS[n];
      return { t: clip(t ? t.name + '「' + t.keyword + '」' : ('' + n), 12), d: clip(talentGist(n), 40) };
    });
    if (obs[0]) { d.o1t = obs[0].t; d.o1d = obs[0].d; }
    if (obs[1]) { d.o2t = obs[1].t; d.o2d = obs[1].d; }
    if (obs[2]) { d.o3t = obs[2].t; d.o3d = obs[2].d; }
    var m = (r.masterCards && r.masterCards[0] != null) ? r.masterCards[0] : null;
    if (m != null && D.MASTER_NARRATIVE && D.MASTER_NARRATIVE[m]) {
      var pr = D.MASTER_NARRATIVE[m].text.match(/練習方向是([^。]*)。/);
      if (pr) d.practice = clip(pr[1], 45);
    }
    return d;
  }
  function draftB() {
    var d = { highlight: '', v1t: '', v1d: '', v2t: '', v2d: '' };
    var r = lastResult(); if (!r) return d;
    var dt = distinctTalents(r);
    var st = D.TALENTS && D.TALENTS[dt[0]];
    if (st) d.highlight = clip(st.name + '「' + st.keyword + '」', 25);
    var v = dt.slice(0, 2).map(function (n) {
      var t = D.TALENTS[n];
      return { t: clip(t ? t.name : ('' + n), 12), d: clip(talentGist(n), 35) };
    });
    if (v[0]) { d.v1t = v[0].t; d.v1d = v[0].d; }
    if (v[1]) { d.v2t = v[1].t; d.v2d = v[1].d; }
    return d;
  }

  // ---------- 欄位設定 ----------
  var FIELDS = {
    a: [
      { k: 'axis', label: '主軸一句話', max: 40, ta: true },
      { k: 'o1t', label: '觀察一 · 標題', max: 12 },
      { k: 'o1d', label: '觀察一 · 說明', max: 40, ta: true },
      { k: 'o2t', label: '觀察二 · 標題', max: 12 },
      { k: 'o2d', label: '觀察二 · 說明', max: 40, ta: true },
      { k: 'o3t', label: '觀察三 · 標題', max: 12 },
      { k: 'o3d', label: '觀察三 · 說明', max: 40, ta: true },
      { k: 'practice', label: '本週練習', max: 45, ta: true }
    ],
    b: [
      { k: 'nick', label: '暱稱', max: 8 },
      { k: 'rep', label: '代表號碼', max: 2, digits: true },
      { k: 'highlight', label: '天賦亮點一句話', max: 25, ta: true },
      { k: 'v1t', label: '樣貌一 · 標題', max: 12 },
      { k: 'v1d', label: '樣貌一 · 說明', max: 35, ta: true },
      { k: 'v2t', label: '樣貌二 · 標題', max: 12 },
      { k: 'v2d', label: '樣貌二 · 說明', max: 35, ta: true }
    ]
  };

  // ---------- 狀態 ----------
  var state = { a: {}, b: {} };
  var card = 'a';
  var built = false;

  function loadStore() {
    try { var v = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); if (v && typeof v === 'object') return v; } catch (e) {}
    return {};
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  // 自動帶入的 profile（卡 A 用；每次開啟以現有輸入為準）
  function profileA() {
    return {
      nick: inputVal('in-name') || '你',
      inner: fmtNums(inputVal('in-inner')),
      outer: fmtNums(inputVal('in-outer')),
      master: fmtNums(inputVal('in-master')),
      shadow: fmtNums(inputVal('in-shadow'))
    };
  }

  // ---------- 卡片 HTML（1080×1350） ----------
  var FOOT = '<div class="gc-foot"><span class="gc-star">✦</span>&nbsp;瑞爸&nbsp;@rickdad.tw&nbsp;｜&nbsp;MMT 認證諮詢師</div>';

  function pill(label, v) {
    if (!v) return '';
    return '<span class="gc-pill">' + esc(label) + '<b>' + esc(v) + '</b></span>';
  }
  function obsRow(i, t, d) {
    if (!t && !d) return '';
    return '<div class="gc-obs">' +
      '<div class="gc-obs-num">' + i + '</div>' +
      '<div class="gc-obs-body">' +
        (t ? '<div class="gc-obs-title">' + esc(t) + '</div>' : '') +
        (d ? '<div class="gc-obs-desc">' + esc(d) + '</div>' : '') +
      '</div></div>';
  }
  function renderCardA() {
    var p = profileA(), s = state.a;
    var pills = pill('內在', p.inner) + pill('外在', p.outer) + pill('導師', p.master) + pill('陰影', p.shadow);
    var obs = obsRow(1, s.o1t, s.o1d) + obsRow(2, s.o2t, s.o2d) + obsRow(3, s.o3t, s.o3d);
    return '<div class="gc gc-a"><div class="gc-pad">' +
      '<div class="gc-topline">天賦解盤重點卡</div>' +
      '<div class="gc-a-name">' + esc(p.nick) + '<span class="gc-a-name-sub">的天賦重點</span></div>' +
      (pills ? '<div class="gc-pills">' + pills + '</div>' : '') +
      (s.axis ? '<div class="gc-axis">「' + esc(s.axis) + '」</div>' : '<div class="gc-axis gc-dim">「主軸一句話」</div>') +
      (obs ? '<div class="gc-obs-list">' + obs + '</div>' : '') +
      '<div class="gc-practice"><span class="gc-practice-tag">本週練習</span>' +
        '<div class="gc-practice-body">' + (s.practice ? esc(s.practice) : '<span class="gc-dim">填入一個可以練習的小行動</span>') + '</div></div>' +
      FOOT +
      '</div></div>';
  }
  function renderCardB() {
    var s = state.b;
    var nick = s.nick || (inputVal('in-name') || '你');
    var rep = s.rep || firstNum(inputVal('in-inner'));
    return '<div class="gc gc-b"><div class="gc-pad">' +
      '<div class="gc-topline">免費天賦速讀卡</div>' +
      '<div class="gc-b-hero">' +
        '<div class="gc-b-circle">' + esc(rep || '?') + '</div>' +
        '<div class="gc-b-heroname">' + esc(nick) + '</div>' +
      '</div>' +
      (s.highlight ? '<div class="gc-b-highlight">「' + esc(s.highlight) + '」</div>'
                   : '<div class="gc-b-highlight gc-dim">「天賦亮點一句話」</div>') +
      '<div class="gc-b-traits">' +
        traitB(s.v1t, s.v1d) + traitB(s.v2t, s.v2d) +
      '</div>' +
      FOOT +
      '</div></div>';
  }
  function traitB(t, d) {
    if (!t && !d) return '';
    return '<div class="gc-b-trait">' +
      (t ? '<div class="gc-b-tt">' + esc(t) + '</div>' : '') +
      (d ? '<div class="gc-b-td">' + esc(d) + '</div>' : '') + '</div>';
  }

  // ---------- 建立工作區 UI ----------
  var root, stage, scaleEl, statusEl, dlBtn;

  function fieldHTML(f) {
    var control = f.ta
      ? '<textarea class="cs-in" data-k="' + f.k + '" data-max="' + f.max + '" rows="2"></textarea>'
      : '<input class="cs-in" data-k="' + f.k + '" data-max="' + f.max + '" type="text"' +
        (f.digits ? ' inputmode="numeric"' : '') + '>';
    return '<label class="cs-field">' +
      '<span class="cs-flabel">' + esc(f.label) +
        '<span class="cs-count" data-count="' + f.k + '">0/' + f.max + '</span></span>' +
      control + '</label>';
  }

  function build() {
    root = document.getElementById('card-studio');
    if (!root) return;
    root.innerHTML =
      '<div class="section-head cs-head"><h3>🎴 圖卡產生器</h3><span>做成可分享的天賦圖卡（1080×1350）</span></div>' +
      '<div class="cs-tabs">' +
        '<button type="button" class="cs-tab active" data-card="a">卡型 A · 天賦解盤重點卡</button>' +
        '<button type="button" class="cs-tab" data-card="b">卡型 B · 免費天賦速讀卡</button>' +
      '</div>' +
      '<div class="cs-note" id="cs-note"></div>' +
      '<div class="cs-body">' +
        '<div class="cs-form" id="cs-form"></div>' +
        '<div class="cs-preview">' +
          '<div class="cs-stage" id="cs-stage"><div class="cs-scale" id="cs-scale"></div></div>' +
          '<div class="cs-actions">' +
            '<button type="button" class="btn-generate cs-dl" id="cs-dl">⬇︎ 下載 PNG</button>' +
            '<div class="cs-status" id="cs-status"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    stage = document.getElementById('cs-stage');
    scaleEl = document.getElementById('cs-scale');
    statusEl = document.getElementById('cs-status');
    dlBtn = document.getElementById('cs-dl');

    root.querySelectorAll('.cs-tab').forEach(function (b) {
      b.addEventListener('click', function () { switchCard(b.getAttribute('data-card')); });
    });
    dlBtn.addEventListener('click', download);
    // 事件委派：欄位輸入
    document.getElementById('cs-form').addEventListener('input', onInput);
    window.addEventListener('resize', computeScale);
    built = true;
  }

  function buildForm() {
    var form = document.getElementById('cs-form');
    form.innerHTML = FIELDS[card].map(fieldHTML).join('');
    // 帶入值
    FIELDS[card].forEach(function (f) {
      var el = form.querySelector('[data-k="' + f.k + '"]');
      if (el) el.value = state[card][f.k] || '';
    });
    updateCounters();
  }

  function switchCard(c) {
    card = c;
    root.querySelectorAll('.cs-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-card') === c);
    });
    buildForm();
    renderPreview();
  }

  function onInput(e) {
    var el = e.target;
    if (!el.classList.contains('cs-in')) return;
    var k = el.getAttribute('data-k');
    if (el.getAttribute('inputmode') === 'numeric') el.value = el.value.replace(/[^0-9]/g, '');
    state[card][k] = el.value;
    saveStore();
    updateCounters();
    renderPreview();
  }

  function updateCounters() {
    var form = document.getElementById('cs-form');
    var over = false;
    FIELDS[card].forEach(function (f) {
      var el = form.querySelector('[data-k="' + f.k + '"]');
      var cnt = form.querySelector('[data-count="' + f.k + '"]');
      var len = el ? el.value.length : 0;
      if (cnt) cnt.textContent = len + '/' + f.max;
      var isOver = len > f.max;
      if (el) el.classList.toggle('cs-over', isOver);
      if (cnt) cnt.classList.toggle('cs-over', isOver);
      if (isOver) over = true;
    });
    dlBtn.disabled = over;
    if (over) setStatus('有欄位超過字數上限，請修正後才能匯出', true);
    else if (statusEl && statusEl.classList.contains('cs-err')) setStatus('');
  }

  function renderPreview() {
    scaleEl.innerHTML = (card === 'a') ? renderCardA() : renderCardB();
    computeScale();
  }
  function computeScale() {
    if (!stage) return;
    var w = stage.clientWidth || 360;
    var s = w / 1080;
    scaleEl.style.transform = 'scale(' + s + ')';
    stage.style.height = (1350 * s) + 'px';
  }

  function setStatus(msg, isErr) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('cs-err', !!isErr);
  }

  // ---------- 匯出 PNG ----------
  function nickForFile() {
    return safeName(card === 'a' ? (inputVal('in-name') || '你') : (state.b.nick || inputVal('in-name') || '你'));
  }
  function download() {
    if (dlBtn.disabled) return;
    if (!window.htmlToImage || typeof window.htmlToImage.toPng !== 'function') {
      setStatus('需要網路連線才能匯出（繪圖元件未載入）。請連網後重新整理再試。', true);
      return;
    }
    setStatus('產生圖片中…');
    var node = scaleEl.querySelector('.gc');
    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      return window.htmlToImage.toPng(node, { width: 1080, height: 1350, pixelRatio: 1, cacheBust: true });
    }).then(function (dataUrl) {
      var fname = (card === 'a' ? '重點卡_' : '速讀卡_') + nickForFile() + '_' + ymd() + '.png';
      savePng(dataUrl, fname);
    }).catch(function (err) {
      setStatus('匯出失敗：' + (err && err.message ? err.message : err), true);
    });
  }
  function savePng(dataUrl, fname) {
    if (isIOS()) {
      var w = window.open('');
      if (w && w.document) {
        w.document.title = fname;
        w.document.body.style.margin = '0';
        w.document.body.style.background = '#071122';
        w.document.body.innerHTML =
          '<img src="' + dataUrl + '" style="width:100%;display:block">' +
          '<p style="font-family:-apple-system,sans-serif;color:#fff;text-align:center;padding:14px">長按上方圖片 → 「加入照片」即可存到相簿</p>';
        setStatus('已開新分頁：長按圖片存到相簿 ✅');
      } else {
        setStatus('請允許彈出視窗後再試（iPhone 需長按圖片儲存）', true);
      }
      return;
    }
    var a = document.createElement('a');
    a.href = dataUrl; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setStatus('已下載：' + fname + ' ✅');
  }

  // ---------- 開啟 ----------
  function open() {
    if (!built) build();
    // profile 每次以現有輸入為準；文字欄位優先用已存的，否則用自動草稿
    var saved = loadStore();
    var da = draftA(), db = draftB();
    state.a = Object.assign({}, da, saved.a || {});
    state.b = Object.assign({}, db, saved.b || {});
    // 代表號碼／暱稱若為空，帶入預設
    if (!state.b.rep) state.b.rep = firstNum(inputVal('in-inner'));
    if (!state.b.nick) state.b.nick = clip(inputVal('in-name') || '你', 8);
    buildForm();
    renderPreview();
    checkCDN();
    root.hidden = false;
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function checkCDN() {
    var note = document.getElementById('cs-note');
    if (!window.htmlToImage) {
      note.innerHTML = '⚠️ 未偵測到繪圖元件（可能離線）。預覽可用，但「下載 PNG」需要網路連線；連網後重新整理即可。';
      note.classList.add('cs-warn');
    } else {
      note.textContent = '';
      note.classList.remove('cs-warn');
    }
  }

  // 委派點擊「製作圖卡」按鈕（報告每次重繪都會產生新按鈕）
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#btn-cards');
    if (b) { e.preventDefault(); open(); }
  });

  window.MMTCards = { open: open };
})();
