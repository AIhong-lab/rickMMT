/*
 * MMT 天賦原理 — 介面與報告產生 (app.js)
 */
(function () {
  'use strict';

  var C = window.MMTCalc;
  var D = window.MMTData;

  var ELEMENT_COLORS = { 風: '#6aa9d9', 火: '#e0715a', 水: '#4fb0a5', 土: '#d3a34e' };
  var ELEMENT_EMOJI = { 風: '🍃', 火: '🔥', 水: '💧', 土: '⛰️' };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function talentBadge(num, label) {
    var t = D.TALENTS[num];
    var elem = t ? t.element : '';
    var color = ELEMENT_COLORS[elem] || '#999';
    var name = t ? t.name : '—';
    var html =
      '<div class="badge" style="--c:' + color + '">' +
        (label ? '<span class="badge-label">' + label + '</span>' : '') +
        '<span class="badge-num">' + num + '</span>' +
        '<span class="badge-name">' + name + '</span>' +
        '<span class="badge-elem">' + (ELEMENT_EMOJI[elem] || '') + elem + '</span>' +
      '</div>';
    return html;
  }

  function listHTML(arr) {
    return '<ul class="tags">' + arr.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
  }

  function esc(s) { return String(s == null ? '' : s); }

  // ---- 合理化排版：把以空白分隔的要點切成乾淨條列 ----
  var PH = ''; // 括號內空白暫存符
  function formatPoints(value) {
    if (value == null) return [];
    var s = Array.isArray(value) ? value.join(' ') : String(value);
    s = s.replace(/　/g, ' ').replace(/[ \t]+/g, ' ').trim();
    if (!s) return [];
    // 保護括號／引號內空白
    s = s.replace(/[（(【「\[][^（()【「\[\])）】」\]]*[)）】」\]]/g, function (m) {
      return m.split(' ').join(PH);
    });
    s = s.replace(/ (?=\d+[.、)])/g, '\n'); // 數字清單標記前斷
    s = s.replace(/ (?=#)/g, '\n');          // hashtag 前斷
    s = s.replace(/ /g, '\n');               // 其餘空白斷
    var parts = s.split('\n').map(function (x) {
      return x.split(PH).join(' ').trim();
    }).filter(Boolean);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (/^\d+[.、)]$/.test(parts[i]) && i + 1 < parts.length) {
        out.push(parts[i] + ' ' + parts[++i]);
      } else {
        out.push(parts[i]);
      }
    }
    return out;
  }

  function ptsHTML(arr, cls) {
    if (!arr.length) return '';
    if (arr.length === 1) return '<p class="' + (cls || '') + '">' + esc(arr[0]) + '</p>';
    return '<ul class="pts ' + (cls || '') + '">' +
      arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }

  // 區塊：非空才輸出。tier = 'keep'（精簡也顯示）或 'extra'（收在展開內）。
  function sec(label, value, cls, tier, focus) {
    var pts = formatPoints(value);
    if (!pts.length) return '';
    var klass = ['tcard-sec', cls || '', tier || 'extra', focus ? 'focus' : ''].join(' ');
    return '<div class="' + klass + '"><h5>' + label + '</h5>' + ptsHTML(pts, cls) + '</div>';
  }
  // 有「主標＋說明」的欄位（潛意識/財富心智/天賦變現）
  function pairSec(label, main, desc, cls, tier, focus) {
    var m = formatPoints(main), d = formatPoints(desc);
    if (!m.length && !d.length) return '';
    var klass = ['tcard-sec pc', cls || '', tier || 'extra', focus ? 'focus' : ''].join(' ');
    return '<div class="' + klass + '"><h5>' + label + '</h5>' +
      (m.length ? ptsHTML(m, 'pc-main') : '') +
      (d.length ? ptsHTML(d, 'pc-desc') : '') + '</div>';
  }

  // focusKeys：本次聚焦的欄位（例如 ['career'] / ['love'] / ['wealth','monetize']）
  function talentCardDetail(num, roleLabel, focusKeys) {
    var t = D.TALENTS[num];
    if (!t) return '';
    focusKeys = focusKeys || [];
    // 該牌是否有此欄位的內容
    function has(k) {
      if (k === 'career') return !!formatPoints(t.career).length;
      if (k === 'love') return !!formatPoints(t.love).length;
      if (k === 'wealth') return !!(formatPoints(t.wealthMind).length || formatPoints(t.wealthMindDesc).length);
      if (k === 'monetize') return !!(formatPoints(t.monetize).length || formatPoints(t.monetizeDesc).length);
      return false;
    }
    // 只保留這張牌有內容的聚焦欄位；若都沒有，退回「職場」。
    var eff = focusKeys.filter(has);
    if (!eff.length) eff = has('career') ? ['career'] : (has('love') ? ['love'] : []);
    function foc(k) { return eff.indexOf(k) >= 0; }
    function tier(k) { return foc(k) ? 'keep' : 'extra'; }
    var color = ELEMENT_COLORS[t.element];
    var tag = (t.numTag ? '（' + t.numTag + '）' : '');

    var blocks = '' +
      // 精簡也一定顯示：優勢、非健康
      sec('天賦優勢', t.advantage, 'adv', 'keep') +
      sec('非健康能量（優勢過頭）', t.unhealthy, 'shadow', 'keep') +
      // 應用類：被聚焦的升為 keep 並高亮
      sec('應用 · 職場（含完全人格）', t.career, 'app', tier('career'), foc('career')) +
      sec('應用 · 兩性', t.love, 'app', tier('love'), foc('love')) +
      pairSec('財富心智（錨定對標）', t.wealthMind, t.wealthMindDesc, 'app', tier('wealth'), foc('wealth')) +
      pairSec('天賦變現', t.monetize, t.monetizeDesc, 'app', tier('monetize'), foc('monetize')) +
      // 其餘一律收在展開內
      '<div class="tcard-cols extra">' +
        sec('占星（行為模式）', t.astrology, 'astro', 'inline') +
        sec('神話人物', t.myth, 'myth', 'inline') +
      '</div>' +
      sec('討論「像 / 不像」', t.likeness, '', 'extra') +
      pairSec('潛意識', t.subconscious, t.subconsciousDesc, '', 'extra') +
      sec('備註', t.note, '', 'extra') +
      sec('總結', t.summary, '', 'extra');

    return '' +
      '<div class="tcard" style="--c:' + color + '">' +
        '<div class="tcard-head">' +
          '<span class="tcard-num">' + t.num + '</span>' +
          '<div class="tcard-title">' +
            '<strong>' + t.name + '</strong>' +
            '<span class="tcard-kw">「' + t.keyword + '」' + tag + '</span>' +
          '</div>' +
          '<span class="tcard-tag">' + ELEMENT_EMOJI[t.element] + t.element + '能量 · ' + t.face + '</span>' +
        '</div>' +
        (roleLabel ? '<div class="tcard-role">' + roleLabel + '</div>' : '') +
        blocks +
        '<button class="tcard-expand" type="button">展開更多 ▾</button>' +
      '</div>';
  }

  // 完全牌區塊
  function completeSection(result) {
    var cc = result.completeCards || [];       // 天賦∩導師
    var pc = result.prominentCards || [];       // ≥2 張（非完全）
    var meta = D.COMPLETE_META || {};
    var body = '<p class="cm-intro">' + esc(meta.intro || '') + '</p>';

    if (!cc.length) {
      body += '<p class="hint">此盤天賦與導師未重疊，<b>沒有完全牌</b>（導師 ' + result.master + ' 未出現在天賦牌中）。</p>';
    } else {
      body += '<div class="ov-row">' + cc.map(function (n) {
        return talentBadge(n, '完全牌');
      }).join('') + '</div>';
      body += cc.map(function (n) {
        var t = D.TALENTS[n];
        if (!t) return '';
        return '<div class="cm-line"><b>完全 ' + n + '　' + t.name + '「' + t.keyword + '」（天賦＝導師）</b>' +
          (t.career ? '<span>' + esc(formatPoints(t.career).join('、')) + '</span>' : '') + '</div>';
      }).join('');
    }

    // 比較明顯（非完全牌）
    if (pc.length) {
      body += '<div class="cm-prominent">' +
        '<h5>比較明顯的號碼（非完全牌）</h5>' +
        '<div class="ov-row">' + pc.map(function (c) {
          return talentBadge(c.num, c.count + ' 張');
        }).join('') + '</div>' +
        '<p class="hint">' + esc(meta.prominentNote || '') + '</p>' +
      '</div>';
    }

    if (meta.notes && meta.notes.length) {
      body += '<ul class="cm-notes">' + meta.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    }
    return body;
  }

  // 家族關係區塊
  function familySection(result) {
    var groups = result.familyGroups || [];
    var FAM = D.FAMILIES || {};
    var TYPE = D.FAMILY_TYPE_DESC || {};
    if (!groups.length) return '<p class="hint">未觸及任何家族。</p>';
    return groups.map(function (g) {
      var f = FAM[g.id] || {};
      var badges = g.members.map(function (n) {
        var on = g.present.indexOf(n) >= 0;
        return talentBadge(n, on ? '有' : '缺');
      }).join('');
      var missionRows = (f.mission ? Object.keys(f.mission).map(function (k) {
        var on = g.present.indexOf(Number(k)) >= 0;
        return '<li class="' + (on ? 'on' : 'off') + '"><b>' + k + '</b> ' + esc(f.mission[k]) + '</li>';
      }).join('') : '');
      return '' +
        '<div class="fam-card' + (g.complete ? ' complete' : '') + '">' +
          '<div class="fam-head">' +
            '<h4>家族 ' + g.id + '　' + esc(f.title || '') + '</h4>' +
            '<span class="fam-type">' + esc(f.type || '') + (g.complete ? ' · 完全家族 ✦' : ' · ' + g.present.length + '/' + g.members.length) + '</span>' +
          '</div>' +
          '<div class="fam-role">' + esc(f.role || '') + '　·　' + esc(f.category || '') + '</div>' +
          '<div class="fam-badges">' + badges + '</div>' +
          (missionRows ? '<ul class="fam-mission">' + missionRows + '</ul>' : '') +
          (f.flow ? '<p class="fam-flow">順流：' + esc(f.flow) + '</p>' : '') +
          (g.missing.length && !g.complete ? '<p class="fam-missing">缺 ' + g.missing.join('、') + '：三位一體會召喚缺的那一張（可刻意練習補足）。</p>' : '') +
          (TYPE[f.type] ? '<p class="hint">' + esc(TYPE[f.type]) + '</p>' : '') +
        '</div>';
    }).join('');
  }

  function energySection(energy) {
    var order = ['風', '火', '水', '土'];
    var bars = order.map(function (e) {
      var d = energy[e];
      var info = D.ELEMENTS[e];
      var levelText = d.level === 'high' ? '高能量' : (d.level === 'zero' ? '0 能量' : '一般');
      var levelClass = d.level;
      var detail = d.level === 'zero' ? info.zero : info.high;
      var showDetail = (d.level === 'high' || d.level === 'zero');
      return '' +
        '<div class="energy-row ' + levelClass + '" style="--c:' + ELEMENT_COLORS[e] + '">' +
          '<div class="energy-top">' +
            '<span class="energy-name">' + ELEMENT_EMOJI[e] + ' ' + e + '（' + info.pursue + '）</span>' +
            '<span class="energy-pct">' + d.percent + '% · ' + d.count + ' 張 · <b>' + levelText + '</b></span>' +
          '</div>' +
          '<div class="energy-bar"><span style="width:' + Math.max(d.percent, 3) + '%"></span></div>' +
          (showDetail ?
            '<div class="energy-detail">' +
              '<p class="et-traits">' + detail.traits.join('、') + '</p>' +
              '<p class="et-task">' + detail.task + '</p>' +
            '</div>' : '') +
        '</div>';
    }).join('');
    return '<div class="energy-wrap">' + bars + '</div>';
  }

  function masterSection(result) {
    var m = result.master;
    var arc = D.MASTER_ARCHETYPE[m] || {};
    var shadow = result.shadow;
    var st = D.TALENTS[shadow];
    var complexKeys = Object.keys(D.COMPLEXES);
    var relatedComplex = D.COMPLEXES[m] || '';
    var famBadges = result.family.map(function (n) { return talentBadge(n); }).join('');

    return '' +
      '<div class="ms-grid">' +
        '<div class="ms-box">' +
          '<h4>導師牌 ' + m + '</h4>' +
          '<p class="ms-arche">原型：<b>' + (arc.archetype || '—') + '</b></p>' +
          '<p>' + (arc.tend || '') + '</p>' +
          '<p class="ms-pursue">核心追求：' + (arc.pursue || '—') + '</p>' +
          (relatedComplex ? '<p class="ms-complex">情節 · ' + relatedComplex + '</p>' : '') +
          '<p class="hint">導師牌＝挖掘藏在潛意識的天賦（約 30~50% 的天賦能量），可靠刻意練習補足。</p>' +
        '</div>' +
        '<div class="ms-box shadow">' +
          '<h4>陰影牌 ' + shadow + '</h4>' +
          (st ? '<p class="ms-arche">' + st.name + '「' + st.keyword + '」· ' + ELEMENT_EMOJI[st.element] + st.element + '</p>' : '') +
          '<p class="hint">陰影＝內在反覆影響自己的暗流；沒有出現的家族號碼即為陰影。跨過之後，黑暗越多、成就也越多。</p>' +
        '</div>' +
        '<div class="ms-box">' +
          '<h4>家族牌</h4>' +
          '<div class="fam-badges">' + famBadges + '</div>' +
          '<p class="hint">同一家族（相同數字根）彼此呼應，三位一體可彌補缺陷。</p>' +
        '</div>' +
      '</div>';
  }

  function yearSection(result) {
    var ys = result.yearStrategy;
    var t = D.TALENTS[ys];
    return '' +
      '<div class="year-box">' +
        '<div class="year-head">' + result.targetYear + ' 年度策略號碼：<b>' + ys + '</b></div>' +
        (t ?
          '<div class="year-body">' +
            '<p><b>' + t.name + '「' + t.keyword + '」</b> · ' + ELEMENT_EMOJI[t.element] + t.element + '能量</p>' +
            '<p>今年可有意識地運用「' + formatPoints(t.advantage).slice(0, 4).join('、') + '」的心智策略。</p>' +
            '<p class="hint">計算：' + result.targetYear + ' + ' + result.birthday.month + ' + ' + result.birthday.day + ' → 反覆數字相加 → ' + ys + '。</p>' +
          '</div>' : '') +
      '</div>';
  }

  function stepsSection() {
    var rows = D.READING_STEPS.map(function (s) {
      return '<li><span class="step-tag">' + s.step + '</span><b>' + s.title + '</b>：' + s.desc + '</li>';
    }).join('');
    return '<ol class="steps">' + rows + '</ol>';
  }

  function sectionCard(title, subtitle, bodyHTML, cls) {
    return '' +
      '<section class="report-section ' + (cls || '') + '">' +
        '<div class="section-head"><h3>' + title + '</h3>' + (subtitle ? '<span>' + subtitle + '</span>' : '') + '</div>' +
        bodyHTML +
      '</section>';
  }

  // ---- 依問題判斷主題，決定聚焦欄位 ----
  var TOPICS = [
    { key: 'love', label: '兩性 · 感情', focus: ['love'],
      kw: ['感情', '愛情', '戀愛', '兩性', '婚姻', '曖昧', '伴侶', '對象', '交往', '分手', '桃花', '另一半', '老公', '老婆', '男友', '女友', '喜歡的人', '喜歡'] },
    { key: 'wealth', label: '財富 · 金錢', focus: ['wealth', 'monetize'],
      kw: ['財富', '金錢', '理財', '投資', '收入', '賺錢', '財務', '變現', '存錢', '財運', '薪水', '報酬', '定價', '收費', '錢'] },
    { key: 'career', label: '工作 · 事業', focus: ['career'],
      kw: ['工作', '職場', '事業', '職涯', '創業', '上班', '老闆', '公司', '轉職', '職業', '產業', '生意', '業務', '升遷', '找工作', '適合', '發展'] },
    { key: 'family', label: '家庭 · 家族', focus: ['love'],
      kw: ['家庭', '家人', '家族', '親子', '小孩', '孩子', '父母', '婆媳', '爸媽', '兄弟', '姊妹', '長輩'] },
    { key: 'learning', label: '學習 · 成長', focus: ['career'],
      kw: ['學習', '成長', '進修', '讀書', '考試', '技能', '證照', '自我成長'] },
    { key: 'emotion', label: '情緒 · 內在', focus: ['love'],
      kw: ['情緒', '心情', '壓力', '焦慮', '憂鬱', '內耗', '心理', '自我'] }
  ];
  function detectTopic(q) {
    q = (q || '').trim();
    if (!q) return { key: 'default', label: '', focus: ['career'], hasQuestion: false };
    for (var i = 0; i < TOPICS.length; i++) {
      for (var j = 0; j < TOPICS[i].kw.length; j++) {
        if (q.indexOf(TOPICS[i].kw[j]) >= 0) {
          return { key: TOPICS[i].key, label: TOPICS[i].label, focus: TOPICS[i].focus, hasQuestion: true };
        }
      }
    }
    return { key: 'general', label: '綜合重點', focus: ['career'], hasQuestion: true, generic: true };
  }

  function render(result, opts) {
    opts = opts || {};
    var topic = detectTopic(opts.question);
    var focusKeys = topic.focus;
    var out = $('#report');
    var innerLabels = ['第一張', '第二張', '第三張'];
    var outerLabels = ['第四張', '第五張', '第六張'];

    var boundaryGroup = (result.boundaryCard != null)
      ? '<div class="ov-group"><h5>天地交界（多一張天賦牌）</h5><div class="ov-row">' +
          talentBadge(result.boundaryCard, '交界') +
        '</div></div>'
      : '';

    var overviewBadges =
      '<div class="overview-cards">' +
        '<div class="ov-group"><h5>內在三張（自身思維設計）</h5><div class="ov-row">' +
          result.inner.map(function (n, i) { return talentBadge(n, innerLabels[i]); }).join('') +
        '</div></div>' +
        '<div class="ov-group"><h5>外在三張（與世界的相處 · 連號）</h5><div class="ov-row">' +
          result.outer.map(function (n, i) { return talentBadge(n, outerLabels[i]); }).join('') +
        '</div></div>' +
        boundaryGroup +
        '<div class="ov-group"><h5>導師 / 陰影</h5><div class="ov-row">' +
          talentBadge(result.master, '導師') + talentBadge(result.shadow, '陰影') +
        '</div></div>' +
      '</div>';

    var b = result.birthday;
    var focusBanner = '';
    if (topic.hasQuestion) {
      var q = esc(opts.question);
      focusBanner = topic.generic
        ? '<div class="focus-banner"><b>🔎 ' + q + '</b><span>未對應到特定主題，顯示綜合重點（可用「感情／工作／財富…」等字詞聚焦）。</span></div>'
        : '<div class="focus-banner"><b>🔎 ' + q + '</b><span>本次聚焦：' + topic.label + '——報表已把相關內容放到最前面並高亮。</span></div>';
    }
    var header =
      '<div class="report-header">' +
        '<h2>' + b.year + ' / ' + pad2(b.month) + ' / ' + pad2(b.day) + ' 的天賦設計</h2>' +
        '<p>查詢年份：' + result.targetYear + '　·　天賦牌：' + result.talentCards.join('、') + '</p>' +
      '</div>' + focusBanner;

    // 內在＋外在六張的詳細解說
    var detailCards = '';
    result.inner.forEach(function (n, i) { detailCards += talentCardDetail(n, '內在 · ' + innerLabels[i], focusKeys); });
    result.outer.forEach(function (n, i) { detailCards += talentCardDetail(n, '外在 · ' + outerLabels[i], focusKeys); });
    if (result.boundaryCard != null) detailCards += talentCardDetail(result.boundaryCard, '天地交界牌', focusKeys);

    var html =
      header +
      '<div class="report-actions"><button id="btn-print" class="btn-print">🖨️ 列印 / 存成 PDF</button></div>' +
      sectionCard('牌陣總覽', '六張天賦牌 + 導師 + 陰影', overviewBadges) +
      sectionCard('四大能量', '六張天賦牌 + 導師牌（共 7 張）· >25% 為高能量，0 張為 0 能量', energySection(result.energy)) +
      sectionCard('完全牌', '天賦與導師重疊的號碼（附：比較明顯的號碼）', completeSection(result)) +
      sectionCard('家族關係', '同數字根的家族群組與使命', '<div class="fam-wrap">' + familySection(result) + '</div>') +
      sectionCard('天賦牌 · 詳細解讀', '內在 3 + 外在 3' + (result.boundaryCard != null ? ' + 天地交界 1' : '') + '（說明取自 MMT上課整理）', '<div class="tcards">' + detailCards + '</div>') +
      sectionCard('導師 · 陰影 · 家族牌', '潛意識與內在暗流', masterSection(result)) +
      sectionCard('年度策略', '今年的心智策略', yearSection(result)) +
      sectionCard('解盤參考順序', '完整解盤的七個步驟', stepsSection(), 'section-ref');

    out.innerHTML = html;
    out.classList.add('has-report');
    out.classList.toggle('concise', opts.level !== 'full');
    var pb = document.getElementById('btn-print');
    if (pb) pb.addEventListener('click', function () { window.print(); });
    // 每張牌的「展開更多／收合」
    Array.prototype.forEach.call(out.querySelectorAll('.tcard-expand'), function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.tcard');
        var open = card.classList.toggle('open');
        btn.innerHTML = open ? '收合 ▴' : '展開更多 ▾';
      });
    });
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pad2(n) { n = Number(n); return (n < 10 ? '0' : '') + n; }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function fillSelects() {
    var ySel = $('#in-year'), mSel = $('#in-month'), dSel = $('#in-day'), tSel = $('#in-target');
    var nowYear = 2026;
    for (var y = nowYear; y >= 1920; y--) ySel.appendChild(new Option(y, y));
    for (var m = 1; m <= 12; m++) mSel.appendChild(new Option(m + ' 月', m));
    for (var d = 1; d <= 31; d++) dSel.appendChild(new Option(d + ' 日', d));
    for (var t = nowYear + 2; t >= 2000; t--) tSel.appendChild(new Option(t + ' 年', t));
    tSel.value = String(nowYear);
    mSel.value = '1';
    dSel.value = '1';
  }

  function clampDay() {
    var y = Number($('#in-year').value), m = Number($('#in-month').value);
    var dSel = $('#in-day');
    if (!y || !m) return;
    var max = daysInMonth(y, m);
    var cur = Number(dSel.value);
    Array.prototype.forEach.call(dSel.options, function (o) {
      o.disabled = Number(o.value) > max;
    });
    if (cur > max) dSel.value = String(max);
  }

  function currentLevel() {
    var r = document.querySelector('input[name="level"]:checked');
    return r ? r.value : 'concise';
  }

  function onGenerate() {
    var y = Number($('#in-year').value);
    var m = Number($('#in-month').value);
    var d = Number($('#in-day').value);
    var t = Number($('#in-target').value);
    if (!y || !m || !d) return;
    if (d > daysInMonth(y, m)) { d = daysInMonth(y, m); $('#in-day').value = String(d); }
    var question = $('#in-question') ? $('#in-question').value : '';
    var result = C.analyze(y, m, d, t);
    render(result, { question: question, level: currentLevel() });
    try {
      localStorage.setItem('mmt:last', JSON.stringify({ y: y, m: m, d: d, t: t }));
    } catch (e) {}
  }

  function restoreLast() {
    try {
      var raw = localStorage.getItem('mmt:last');
      if (!raw) return;
      var v = JSON.parse(raw);
      if (v.y) $('#in-year').value = String(v.y);
      if (v.m) $('#in-month').value = String(v.m);
      clampDay();
      if (v.d) $('#in-day').value = String(v.d);
      if (v.t) $('#in-target').value = String(v.t);
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    fillSelects();
    restoreLast();
    $('#in-year').addEventListener('change', clampDay);
    $('#in-month').addEventListener('change', clampDay);
    $('#btn-generate').addEventListener('click', onGenerate);
    // 顯示詳細度切換：若已有報表，即時重繪
    Array.prototype.forEach.call(document.querySelectorAll('input[name="level"]'), function (r) {
      r.addEventListener('change', function () {
        if ($('#report').classList.contains('has-report')) onGenerate();
      });
    });
    // 問題欄按 Enter 直接生成
    var q = $('#in-question');
    if (q) q.addEventListener('keydown', function (e) { if (e.key === 'Enter') onGenerate(); });
  });
})();
