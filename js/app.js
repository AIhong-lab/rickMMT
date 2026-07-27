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

  function talentCardDetail(num, roleLabel) {
    var t = D.TALENTS[num];
    if (!t) return '';
    var color = ELEMENT_COLORS[t.element];
    return '' +
      '<div class="tcard" style="--c:' + color + '">' +
        '<div class="tcard-head">' +
          '<span class="tcard-num">' + t.num + '</span>' +
          '<div class="tcard-title">' +
            '<strong>' + t.name + '</strong>' +
            '<span class="tcard-kw">「' + t.keyword + '」</span>' +
          '</div>' +
          '<span class="tcard-tag">' + ELEMENT_EMOJI[t.element] + t.element + '能量 · ' + t.face + '</span>' +
        '</div>' +
        (roleLabel ? '<div class="tcard-role">' + roleLabel + '</div>' : '') +
        '<div class="tcard-meta">占星：' + t.planet + '　·　神話：' + t.myth + '</div>' +
        '<div class="tcard-sec"><h5>天賦優勢</h5>' + listHTML(t.traits) + '</div>' +
        '<div class="tcard-sec shadow"><h5>非健康能量（優勢過頭）</h5>' + listHTML(t.shadowTraits) + '</div>' +
        '<div class="tcard-sec"><h5>完全人格</h5><p>' + t.complete + '</p></div>' +
        '<div class="tcard-grid">' +
          '<div><h6>職場應用</h6><p>' + t.career + '</p></div>' +
          '<div><h6>兩性應用</h6><p>' + t.love + '</p></div>' +
          '<div><h6>財富心智</h6><p>' + t.wealth + '</p></div>' +
        '</div>' +
      '</div>';
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
            '<p>今年可有意識地運用「' + t.traits.slice(0, 4).join('、') + '」的心智策略。</p>' +
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
      sectionCard('牌陣總覽', '六張天賦牌 + 導師 + 陰影', overviewBadges) +
      sectionCard('四大能量', '風火水土分佈（>25% 為高能量，0 張為 0 能量）', energySection(result.energy)) +
      sectionCard('六張天賦牌 · 詳細解讀', '內在 3 張 + 外在 3 張', '<div class="tcards">' + detailCards + '</div>') +
      sectionCard('導師 · 陰影 · 家族', '潛意識與內在暗流', masterSection(result)) +
      sectionCard('年度策略', '今年的心智策略', yearSection(result)) +
      sectionCard('解盤參考順序', '完整解盤的七個步驟', stepsSection());

    out.innerHTML = html;
    out.classList.add('has-report');
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
