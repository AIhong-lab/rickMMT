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
    var narrative = (D.NARRATIVE && D.NARRATIVE[num]) ? D.NARRATIVE[num] : '';
    var narrBlock = narrative ? '<div class="tcard-narr keep">' + esc(narrative) + '</div>' : '';

    var blocks = narrBlock +
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
      body += '<p class="hint"><b>沒有完全牌</b>（導師 ' + result.masterCards.join('、') + ' 未出現在天賦牌中）。生命靈數 14 以上必有完全牌。</p>';
    } else {
      body += '<div class="ov-row">' + cc.map(function (n) {
        return talentBadge(n, '完全牌');
      }).join('') + '</div>';
      body += cc.map(function (n) {
        var t = D.TALENTS[n];
        if (!t) return '';
        var narr = (D.NARRATIVE && D.NARRATIVE[n]) ? formatPoints(D.NARRATIVE[n])[0] : (t.career ? formatPoints(t.career).join('、') : '');
        return '<div class="cm-line"><b>完全 ' + n + '　' + t.name + '「' + t.keyword + '」（導師＝天賦）</b>' +
          (narr ? '<span>' + esc(narr) + '</span>' : '') + '</div>';
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
    var shadow = result.shadow; // 陣列
    var relatedComplex = D.COMPLEXES[m] || '';
    var famBadges = result.family.map(function (n) { return talentBadge(n); }).join('');
    var masterNums = result.masterCards.join('、');
    var isMulti = result.masterCards.length > 1;
    var shadowNums = shadow.length ? shadow.join('、') : '無';
    var archOf = D.SHADOW_ARCH || {};
    var shadowDetail = shadow.map(function (n) {
      var st = D.TALENTS[n]; var a = archOf[n];
      return (st ? '<p class="ms-arche">陰' + n + ' ' + st.name + '「' + st.keyword + '」' + (a ? '· 原型：<b>' + a.name + '</b>' : '') + '</p>' : '') +
        (a && a.text ? '<p class="ms-narr">' + esc(a.text) + '</p>' : '');
    }).join('');
    // 導師情節敘述（主導師）
    var mn = (D.MASTER_NARRATIVE && D.MASTER_NARRATIVE[m]) ? D.MASTER_NARRATIVE[m] : null;

    return '' +
      '<div class="ms-grid">' +
        '<div class="ms-box">' +
          '<h4>導師牌 ' + masterNums + (isMulti ? '（雙導師）' : '') + '</h4>' +
          '<p class="ms-pursue">主導師 ' + m + '（' + (arc.archetype || '') + '）　·　生命靈數：' + result.lifeNumber + '</p>' +
          (mn ? '<p class="ms-arche"><b>' + esc(mn.title) + '</b></p><p class="ms-narr">' + esc(mn.text) + '</p>'
              : '<p class="hint">導師牌＝隱藏在潛意識、只發揮 25~40% 的天賦，可靠刻意練習長成天賦牌。</p>') +
          (isMulti ? '<p class="hint">生命靈數 10~22，出現多張導師；其中與天賦重疊者即為完全牌。</p>' : '') +
        '</div>' +
        '<div class="ms-box shadow">' +
          '<h4>陰影牌 ' + shadowNums + '</h4>' +
          shadowDetail +
          '<p class="hint">陰影＝導師家族中未成為導師、且屬於十二陰影原型（0、11–21）的號碼；10 不作陰影，靈數 14 以上無陰影。陰影不能練，只能和解——黑暗越多，走過去成就也越多。</p>' +
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
    var ystr = (D.YEAR_STRATEGY && D.YEAR_STRATEGY[ys]) ? D.YEAR_STRATEGY[ys] : null;
    var t = D.TALENTS[ys];
    return '' +
      '<div class="year-box">' +
        '<div class="year-head">' + result.targetYear + ' 年度策略號碼：<b>' + ys + '</b>' +
          (ystr ? '　' + esc(ystr.title.replace(/（[^）]*）$/, '')) : (t ? '　' + t.name : '')) + '</div>' +
        '<div class="year-body">' +
          (ystr ? '<p class="year-narr">' + esc(ystr.text) + '</p>'
                : (t ? '<p>今年可運用「' + formatPoints(t.advantage).slice(0, 4).join('、') + '」的心智策略。</p>' : '')) +
          '<p class="hint">年度策略只分析心智狀態、不分析事件結果。計算：' + result.targetYear + ' + ' + result.birthday.month + ' + ' + result.birthday.day + ' → 反覆數字相加 → ' + ys + '。</p>' +
        '</div>' +
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

  // ---- 依問題判斷主題，決定聚焦欄位（可同時命中多個主題）----
  var FOCUS_NAME = { career: '職場', love: '兩性', wealth: '財富心智', monetize: '天賦變現' };
  var TOPICS = [
    { key: 'love', label: '兩性 · 感情', focus: ['love'],
      kw: ['感情', '愛情', '戀愛', '兩性', '婚姻', '曖昧', '伴侶', '對象', '交往', '分手', '桃花', '另一半',
           '老公', '老婆', '男友', '女友', '喜歡的人', '告白', '追求', '結婚', '離婚', '單身', '脫單', '喜歡'] },
    { key: 'wealth', label: '財富 · 變現', focus: ['wealth', 'monetize'],
      kw: ['財富', '金錢', '理財', '投資', '收入', '賺錢', '賺', '財務', '變現', '存錢', '財運', '薪水', '報酬',
           '定價', '收費', '獲利', '盈利', '被動收入', '現金流', '商業模式', '收益', '營收', '漲價', 'money', '錢'] },
    { key: 'business', label: '事業 · 副業 · 創業', focus: ['career', 'wealth', 'monetize'],
      kw: ['副業', '兼職', '斜槓', '接案', '創業', '開店', '做生意', '生意', '自由工作', '自雇', '當老闆',
           '個人品牌', '自媒體', '經營', '開公司', '第二收入', '轉行', '轉職', '職涯', '事業', '發展方向'] },
    { key: 'brand', label: '行銷 · 品牌 · AI', focus: ['career', 'monetize'],
      kw: ['行銷', '品牌', '電商', '團購', '帶貨', '網紅', 'KOL', '粉絲', '流量', '社群', '短影音', '直播',
           'IG', 'FB', 'YT', 'youtube', '廣告', '曝光', 'AI', '人工智慧', '自動化', '工具', '軟體', '科技', '產品'] },
    { key: 'career', label: '工作 · 職場', focus: ['career'],
      kw: ['工作', '職場', '上班', '老闆', '公司', '職業', '產業', '業務', '升遷', '找工作', '適合', '發展',
           '方向', '同事', '主管', '團隊', '專案', '職務', '該不該', '要不要', '適不適合'] },
    { key: 'family', label: '家庭 · 家族', focus: ['love'],
      kw: ['家庭', '家人', '家族', '親子', '小孩', '孩子', '父母', '婆媳', '爸媽', '兄弟', '姊妹', '長輩', '教養', '家裡'] },
    { key: 'learning', label: '學習 · 成長', focus: ['career'],
      kw: ['學習', '成長', '進修', '讀書', '考試', '技能', '證照', '自我成長', '精進', '學什麼'] },
    { key: 'emotion', label: '情緒 · 內在', focus: ['love'],
      kw: ['情緒', '心情', '壓力', '焦慮', '憂鬱', '內耗', '心理', '覺察', '課題', '迷惘', '迷茫'] }
  ];
  function detectTopic(q) {
    q = (q || '').trim();
    if (!q) return { label: '', focus: ['career'], hasQuestion: false };
    var focus = [], labels = [];
    TOPICS.forEach(function (tp) {
      var hit = tp.kw.some(function (k) { return q.toLowerCase().indexOf(k.toLowerCase()) >= 0; });
      if (hit) {
        labels.push(tp.label);
        tp.focus.forEach(function (f) { if (focus.indexOf(f) < 0) focus.push(f); });
      }
    });
    if (!focus.length) {
      // 沒對到關鍵字：預設聚焦「職場・變現」（多數提問屬此），仍是有效聚焦。
      return { label: '綜合（職場・變現）', focus: ['career', 'wealth', 'monetize'], hasQuestion: true, generic: true };
    }
    var names = focus.map(function (f) { return FOCUS_NAME[f]; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; });
    return { label: labels.join('／'), focusNames: names.join('、'), focus: focus, hasQuestion: true };
  }

  // ============ 客戶版簡易報告（用於輸出 PDF）============
  function clientReportHTML(result) {
    var b = result.birthday;
    var order = ['風', '火', '水', '土'];
    // 牌陣徽章
    var cardBadges = result.talentCards.map(function (n) {
      var t = D.TALENTS[n]; var c = ELEMENT_COLORS[t.element];
      return '<div class="crb" style="--c:' + c + '">' +
        '<span class="crb-n">' + n + '</span>' +
        '<span class="crb-name">' + t.name + '</span>' +
        '<span class="crb-e">' + ELEMENT_EMOJI[t.element] + t.element + '</span></div>';
    }).join('');
    // 能量條
    var energyBars = order.map(function (e) {
      var d = result.energy[e];
      var lv = d.level === 'high' ? '高能量' : (d.level === 'zero' ? '0 能量' : '');
      return '<div class="cre-row" style="--c:' + ELEMENT_COLORS[e] + '">' +
        '<span class="cre-name">' + ELEMENT_EMOJI[e] + ' ' + e + '（' + D.ELEMENTS[e].pursue + '）</span>' +
        '<span class="cre-bar"><i style="width:' + Math.max(d.percent, 3) + '%"></i></span>' +
        '<span class="cre-pct">' + d.percent + '%' + (lv ? ' · ' + lv : '') + '</span></div>';
    }).join('');
    // 能量一句話
    var hi = order.slice().sort(function (a, c) { return result.energy[c].percent - result.energy[a].percent; })[0];
    var zeros = order.filter(function (e) { return result.energy[e].level === 'zero'; });
    var energyNote = '你的主導能量是 <b>' + hi + '（' + D.ELEMENTS[hi].pursue + '）</b>：' +
      D.ELEMENTS[hi].high.traits.slice(0, 4).join('、') + '。' +
      (zeros.length ? '　' + zeros.join('、') + ' 能量較低，' + D.ELEMENTS[zeros[0]].zero.task : '');
    // 完全牌
    var completeLine = result.completeCards.length
      ? '<div class="cr-complete">✦ 你的完全天賦：' + result.completeCards.map(function (n) {
          var t = D.TALENTS[n]; return '<b>' + n + ' ' + t.name + '</b>';
        }).join('、') + '　（能量可完全發揮）</div>'
      : '';
    // 每個「不重複」的天賦號碼
    var seen = {}, distinct = [];
    result.talentCards.forEach(function (n) { if (!seen[n]) { seen[n] = 1; distinct.push(n); } });
    var talentBlocks = distinct.map(function (n) {
      var t = D.TALENTS[n]; if (!t) return '';
      var c = ELEMENT_COLORS[t.element];
      var isComp = result.completeCards.indexOf(n) >= 0;
      var adv = formatPoints(t.advantage).slice(0, 4);   // 只取重點 4 項
      var career = formatPoints(t.career).slice(0, 3).join('、');
      return '<div class="crt" style="--c:' + c + '">' +
        '<div class="crt-h"><span class="crt-n">' + n + '</span>' +
        '<span class="crt-t"><b>' + t.name + '</b>「' + t.keyword + '」' +
          '<i>' + ELEMENT_EMOJI[t.element] + t.element + (isComp ? ' · ✦完全' : '') + '</i></span></div>' +
        (adv.length ? '<ul class="crt-adv">' + adv.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        (career ? '<p class="crt-dir"><b>適合：</b>' + esc(career) + '</p>' : '') +
        '</div>';
    }).join('');

    return '<div id="client-report">' +
      '<div class="cr-head"><div class="cr-brand">✦ 天賦原理 · 個人天賦報告</div>' +
        '<div class="cr-date">生日　' + b.year + ' / ' + pad2(b.month) + ' / ' + pad2(b.day) + '</div></div>' +
      '<div class="cr-sec"><h2>你的天賦牌陣</h2><div class="cr-badges">' + cardBadges + '</div>' +
        '<div class="cr-master">導師牌 ' + result.masterCards.join('、') +
        (result.shadow.length ? '　·　陰影牌 ' + result.shadow.join('、') : '') + '</div>' + completeLine + '</div>' +
      '<div class="cr-sec"><h2>四大能量分佈</h2>' + energyBars +
        '<p class="cr-enote">' + energyNote + '</p></div>' +
      '<div class="cr-sec"><h2>你的核心天賦</h2><div class="cr-talents">' + talentBlocks + '</div></div>' +
      '<div class="cr-foot">本報告依 MMT 天賦原理製作，作為自我覺察與潛能發展參考。</div>' +
      '</div>';
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
        '<div class="ov-group"><h5>導師' + (result.masterCards.length > 1 ? '（雙導師）' : '') + ' / 陰影</h5><div class="ov-row">' +
          result.masterCards.map(function (n) { return talentBadge(n, '導師'); }).join('') +
          (result.shadow.length
            ? result.shadow.map(function (n) { return talentBadge(n, '陰影'); }).join('')
            : '<div class="badge" style="--c:#666"><span class="badge-label">陰影</span><span class="badge-num">—</span><span class="badge-name">無</span></div>') +
        '</div></div>' +
      '</div>';

    var b = result.birthday;
    var focusBanner = '';
    if (topic.hasQuestion) {
      var q = esc(opts.question);
      var names = topic.focusNames || '職場、財富心智、天賦變現';
      focusBanner = topic.generic
        ? '<div class="focus-banner"><b>🔎 ' + q + '</b><span>未對應到特定主題，改顯示綜合重點 · 高亮欄位：' + names + '</span></div>'
        : '<div class="focus-banner"><b>🔎 ' + q + '</b><span>本次聚焦：' + esc(topic.label) + ' · 高亮欄位：' + names + '</span></div>';
    }
    var header =
      '<div class="report-header">' +
        '<h2>' + b.year + ' / ' + pad2(b.month) + ' / ' + pad2(b.day) + ' 的天賦設計</h2>' +
        '<p>天賦牌：' + result.talentCards.join('、') + '</p>' +
      '</div>' + focusBanner;

    // 內在＋外在六張的詳細解說
    var detailCards = '';
    result.inner.forEach(function (n, i) { detailCards += talentCardDetail(n, '內在 · ' + innerLabels[i], focusKeys); });
    result.outer.forEach(function (n, i) { detailCards += talentCardDetail(n, '外在 · ' + outerLabels[i], focusKeys); });
    if (result.boundaryCard != null) detailCards += talentCardDetail(result.boundaryCard, '天地交界牌', focusKeys);

    var html =
      header +
      '<div class="report-actions">' +
        '<button id="btn-client" class="btn-print btn-client">📄 輸出客戶版 PDF</button>' +
        '<button id="btn-print" class="btn-print">🖨️ 列印完整版</button>' +
      '</div>' +
      sectionCard('牌陣總覽', '六張天賦牌 + 導師 + 陰影', overviewBadges) +
      sectionCard('四大能量', '六張天賦牌 + 導師牌（共 7 張）· >25% 為高能量，0 張為 0 能量', energySection(result.energy)) +
      sectionCard('完全牌', '導師與天賦出現同一號碼（附：比較明顯）', completeSection(result)) +
      sectionCard('家族關係', '同數字根的家族群組與使命', '<div class="fam-wrap">' + familySection(result) + '</div>') +
      sectionCard('天賦牌 · 詳細解讀', '內在 3 + 外在 3' + (result.boundaryCard != null ? ' + 天地交界 1' : '') + '（說明取自 MMT上課整理）', '<div class="tcards">' + detailCards + '</div>') +
      sectionCard('導師 · 陰影 · 家族牌', '潛意識與內在暗流', masterSection(result)) +
      sectionCard('解盤參考順序', '完整解盤的七個步驟', stepsSection(), 'section-ref') +
      clientReportHTML(result);

    out.innerHTML = html;
    out.classList.add('has-report');
    out.classList.toggle('concise', opts.level !== 'full');
    var pb = document.getElementById('btn-print');
    if (pb) pb.addEventListener('click', function () {
      document.body.classList.remove('print-client');
      window.print();
    });
    var cb = document.getElementById('btn-client');
    if (cb) cb.addEventListener('click', function () {
      document.body.classList.add('print-client');
      window.print();
    });
    window.onafterprint = function () { document.body.classList.remove('print-client'); };
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
    if (tSel) {
      for (var t = nowYear + 2; t >= 2000; t--) tSel.appendChild(new Option(t + ' 年', t));
      tSel.value = String(nowYear);
    }
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
    var t = $('#in-target') ? Number($('#in-target').value) : 2026;
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
      if (v.t && $('#in-target')) $('#in-target').value = String(v.t);
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
