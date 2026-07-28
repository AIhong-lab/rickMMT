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

  // 文字區塊：非空才輸出
  function textSec(label, value, cls) {
    if (!value) return '';
    return '<div class="tcard-sec ' + (cls || '') + '"><h5>' + label + '</h5><p>' + esc(value) + '</p></div>';
  }
  // 標籤列區塊：非空才輸出
  function tagSec(label, arr, cls) {
    if (!arr || !arr.length) return '';
    return '<div class="tcard-sec ' + (cls || '') + '"><h5>' + label + '</h5>' + listHTML(arr) + '</div>';
  }
  // 附說明的欄位（潛意識/財富心智/天賦變現）
  function pairCell(label, main, desc) {
    if (!main && !desc) return '';
    return '<div><h6>' + label + '</h6>' +
      (main ? '<p class="pc-main">' + esc(main) + '</p>' : '') +
      (desc ? '<p class="pc-desc">' + esc(desc) + '</p>' : '') + '</div>';
  }

  function talentCardDetail(num, roleLabel) {
    var t = D.TALENTS[num];
    if (!t) return '';
    var color = ELEMENT_COLORS[t.element];
    var tag = (t.numTag ? '（' + t.numTag + '）' : '');
    var grid = pairCell('潛意識', t.subconscious, t.subconsciousDesc) +
               pairCell('財富心智（錨定對標）', t.wealthMind, t.wealthMindDesc) +
               pairCell('天賦變現', t.monetize, t.monetizeDesc);
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
        textSec('底層邏輯 · 占星（行為模式）', t.astrology) +
        textSec('底層邏輯 · 神話人物', t.myth) +
        tagSec('天賦優勢', t.advantage) +
        tagSec('非健康能量（優勢過頭）', t.unhealthy, 'shadow') +
        textSec('討論「像 / 不像」', t.likeness) +
        textSec('應用 · 職場（含完全人格）', t.career) +
        textSec('應用 · 兩性', t.love) +
        textSec('備註', t.note) +
        textSec('總結', t.summary) +
        (grid ? '<div class="tcard-grid">' + grid + '</div>' : '') +
      '</div>';
  }

  // 完全牌區塊
  function completeSection(result) {
    var cc = result.completeCards || [];
    var meta = D.COMPLETE_META || {};
    var body = '<p class="cm-intro">' + esc(meta.intro || '') + '</p>';
    if (!cc.length) {
      body += '<p class="hint">這張盤沒有重複出現的天賦號（無明顯完全牌）。可留意天賦與導師是否重疊。</p>';
    } else {
      body += '<div class="ov-row">' + cc.map(function (c) {
        return talentBadge(c.num, '完全 · ' + c.count + ' 張');
      }).join('') + '</div>';
      body += cc.map(function (c) {
        var t = D.TALENTS[c.num];
        if (!t) return '';
        return '<div class="cm-line"><b>完全 ' + c.num + '　' + t.name + '「' + t.keyword + '」</b>' +
          (t.career ? '<span>' + esc(t.career) + '</span>' : '') + '</div>';
      }).join('');
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
            '<p>今年可有意識地運用「' + (t.advantage || []).slice(0, 4).join('、') + '」的心智策略。</p>' +
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

  function sectionCard(title, subtitle, bodyHTML) {
    return '' +
      '<section class="report-section">' +
        '<div class="section-head"><h3>' + title + '</h3>' + (subtitle ? '<span>' + subtitle + '</span>' : '') + '</div>' +
        bodyHTML +
      '</section>';
  }

  function render(result) {
    var out = $('#report');
    var innerLabels = ['第一張', '第二張', '第三張'];
    var outerLabels = ['第四張', '第五張', '第六張'];

    var overviewBadges =
      '<div class="overview-cards">' +
        '<div class="ov-group"><h5>內在三張（自身思維設計）</h5><div class="ov-row">' +
          result.inner.map(function (n, i) { return talentBadge(n, innerLabels[i]); }).join('') +
        '</div></div>' +
        '<div class="ov-group"><h5>外在三張（與世界的相處 · 連號）</h5><div class="ov-row">' +
          result.outer.map(function (n, i) { return talentBadge(n, outerLabels[i]); }).join('') +
        '</div></div>' +
        '<div class="ov-group"><h5>導師 / 陰影</h5><div class="ov-row">' +
          talentBadge(result.master, '導師') + talentBadge(result.shadow, '陰影') +
        '</div></div>' +
      '</div>';

    var b = result.birthday;
    var header =
      '<div class="report-header">' +
        '<h2>' + b.year + ' / ' + pad2(b.month) + ' / ' + pad2(b.day) + ' 的天賦設計</h2>' +
        '<p>查詢年份：' + result.targetYear + '　·　六張天賦牌：' + result.talentCards.join('、') + '</p>' +
      '</div>';

    // 內在＋外在六張的詳細解說
    var detailCards = '';
    result.inner.forEach(function (n, i) { detailCards += talentCardDetail(n, '內在 · ' + innerLabels[i]); });
    result.outer.forEach(function (n, i) { detailCards += talentCardDetail(n, '外在 · ' + outerLabels[i]); });

    var html =
      header +
      '<div class="report-actions"><button id="btn-print" class="btn-print">🖨️ 列印 / 存成 PDF</button></div>' +
      sectionCard('牌陣總覽', '六張天賦牌 + 導師 + 陰影', overviewBadges) +
      sectionCard('四大能量', '六張天賦牌 + 導師牌（共 7 張）· >25% 為高能量，0 張為 0 能量', energySection(result.energy)) +
      sectionCard('完全牌', '重複出現、能量完全發揮的號碼', completeSection(result)) +
      sectionCard('家族關係', '同數字根的家族群組與使命', '<div class="fam-wrap">' + familySection(result) + '</div>') +
      sectionCard('六張天賦牌 · 詳細解讀', '內在 3 張 + 外在 3 張（說明取自 MMT上課整理）', '<div class="tcards">' + detailCards + '</div>') +
      sectionCard('導師 · 陰影 · 家族牌', '潛意識與內在暗流', masterSection(result)) +
      sectionCard('年度策略', '今年的心智策略', yearSection(result)) +
      sectionCard('解盤參考順序', '完整解盤的七個步驟', stepsSection());

    out.innerHTML = html;
    out.classList.add('has-report');
    var pb = document.getElementById('btn-print');
    if (pb) pb.addEventListener('click', function () { window.print(); });
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

  function onGenerate() {
    var y = Number($('#in-year').value);
    var m = Number($('#in-month').value);
    var d = Number($('#in-day').value);
    var t = Number($('#in-target').value);
    if (!y || !m || !d) return;
    if (d > daysInMonth(y, m)) { d = daysInMonth(y, m); $('#in-day').value = String(d); }
    var result = C.analyze(y, m, d, t);
    render(result);
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
  });
})();
