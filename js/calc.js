/*
 * MMT 天賦原理 — 計算引擎 (calc.js)
 * -------------------------------------------------------------
 * 資料來源：Google Drive「MMT課程 / MMT1階-直版天賦原理.pdf」與「MMT上課整理」試算表。
 * 全部計算方式皆依照上述課程原理，僅供個人使用。
 *
 * 天賦號碼範圍：0 ~ 21（共 22 個號碼）。慣例上「22 = 0」。
 * -------------------------------------------------------------
 */
(function (global) {
  'use strict';

  /* =============================================================
   * 1. 基礎工具
   * ============================================================= */

  // 把一串數字字元全部相加，例如 "19840920" -> 1+9+8+4+0+9+2+0 = 33
  function sumDigits(str) {
    return String(str)
      .split('')
      .reduce(function (acc, ch) {
        var n = parseInt(ch, 10);
        return acc + (isNaN(n) ? 0 : n);
      }, 0);
  }

  // 反覆做「數字相加」直到剩下個位數 (1~9)。用於導師牌。
  function digitRoot(n) {
    n = Math.abs(n);
    while (n > 9) {
      n = sumDigits(n);
    }
    return n;
  }

  // 反覆做「數字相加」直到 <= max（用於年度策略，max = 21）。
  function reduceUntil(n, max) {
    n = Math.abs(n);
    while (n > max) {
      n = sumDigits(n);
    }
    return n;
  }

  // 「超過 22 的部分要減去 22，直到 <= 22 即可 (22 = 0)」。
  // 回傳值介於 1~22，其中 22 代表天賦號碼 0。
  function reduce22(n) {
    n = Math.abs(n);
    while (n > 22) {
      n -= 22;
    }
    if (n === 0) n = 22; // 理論上不會發生，保底
    return n;
  }

  // 把 reduce22 的結果（1~22）轉成天賦號碼（0~21），22 -> 0。
  function toCardNumber(v) {
    return v === 22 ? 0 : v;
  }

  /* =============================================================
   * 2. 天賦牌 1 ~ 3（自身內在思維）
   * ============================================================= */

  // 第一張牌 = 生日「日」。1~21 原值；22 = 0；23~31 為各位數字相加。
  var DAY_TABLE = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
    11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18,
    19: 19, 20: 20, 21: 21,
    22: 0,       // 22 = 0
    23: 5,       // 2+3
    24: 6,       // 2+4
    25: 7,       // 2+5
    26: 8,       // 2+6
    27: 9,       // 2+7
    28: 1,       // 2+8 = 10 = 1
    29: 2,       // 2+9 = 11 = 2
    30: 3,       // 3+0
    31: 4        // 3+1
  };

  function card1(day) {
    return DAY_TABLE[day];
  }

  // 第二張牌 = 生日「所有數字」相加，超過 22 減 22。
  function card2(year, month, day) {
    var all = String(year) + pad2(month) + pad2(day);
    return toCardNumber(reduce22(sumDigits(all)));
  }

  // 第三張牌 = 西元年各位數字相加 + 月 + 日（月日不拆），超過 22 減 22。
  function card3(year, month, day) {
    var sum = sumDigits(year) + Number(month) + Number(day);
    return toCardNumber(reduce22(sum));
  }

  /* =============================================================
   * 3. 天賦牌 4 ~ 6（與世界關聯的相處方式，必為連號）
   * -------------------------------------------------------------
   * 依 PDF「年輪」查表：以「月」決定起始號、每一天 +1（在 1~22 之間循環）。
   * 經與 PDF 對照，整張查表可用下列公式完全重現：
   *   grid(月, 日) = ((monthBase[月] - 1 + (日 - 1)) mod 22) + 1   // 值域 1~22，22 = 0
   * monthBase 為每個月「1 日」的號碼。
   *
   * 第四張牌 = grid(月, 日)，第五、六張為其後連號。
   *   例：2/29 -> 連號 (依課程筆記「15、16、17」)。
   *
   * ⚠️ 連號方向待確認：預設採 [grid, grid+1, grid+2]（第四張為起點）。
   *    若你手上的排盤是以查表值為「中間張」，把 OUTER_MODE 改成 'center' 即可。
   * ============================================================= */

  var MONTH_BASE = {
    1: 1, 2: 10, 3: 16, 4: 3, 5: 11, 6: 20,
    7: 6, 8: 15, 9: 2, 10: 10, 11: 19, 12: 5
  };

  // 已依實際排盤校準：查表值為「中間張」，故外在三張 = [g-1, g, g+1]。
  var OUTER_MODE = 'center'; // 'center' = [g-1, g, g+1]（預設）；'forward' = [g, g+1, g+2]

  // 年輪查表：回傳 1~22（22 = 0 由 toCardNumber 處理）
  function gridRaw(month, day) {
    var base = MONTH_BASE[month];
    var v = ((base - 1 + (day - 1)) % 22) + 1;
    return v;
  }

  // 在 1~22 的環上前進 step 步
  function wheelStep(v1to22, step) {
    var v = ((v1to22 - 1 + step) % 22 + 22) % 22 + 1;
    return v;
  }

  function outerCards(month, day) {
    var g = gridRaw(month, day);
    var raw;
    if (OUTER_MODE === 'center') {
      raw = [wheelStep(g, -1), g, wheelStep(g, 1)];
    } else {
      raw = [g, wheelStep(g, 1), wheelStep(g, 2)];
    }
    return raw.map(toCardNumber);
  }

  /* =============================================================
   * 4. 導師牌 / 陰影牌 / 家族牌
   * ============================================================= */

  // 導師牌 = 生日所有數字相加，再反覆相加到個位數 (1~9)。
  function master(year, month, day) {
    var all = String(year) + pad2(month) + pad2(day);
    return digitRoot(sumDigits(all));
  }

  // 家族牌：同「數字根」的家族群組（22 = 0 歸在家族 4）。
  var FAMILIES = {
    1: [1, 10, 19],
    2: [2, 11, 20],
    3: [3, 12, 21],
    4: [4, 13, 0],   // 0(=22) 屬家族 4
    5: [5, 14],
    6: [6, 15],
    7: [7, 16],
    8: [8, 17],
    9: [9, 18]
  };

  function family(masterNum) {
    return (FAMILIES[masterNum] || []).slice();
  }

  // 導師 -> 陰影（原型對照）。陰影 = 該家族中未顯現、藏於潛意識的號碼。
  var SHADOW_MAP = {
    1: 19, 2: 11, 3: 12, 4: 13, 5: 14,
    6: 15, 7: 16, 8: 17, 9: 18
  };

  function shadow(masterNum) {
    return SHADOW_MAP[masterNum];
  }

  /* =============================================================
   * 5. 年度策略
   * -------------------------------------------------------------
   * = 查詢年份 + 月 + 日，反覆數字相加直到 <= 21（22 = 0）。
   *   例：2024 + 1 + 28 = 2053 -> 2+0+5+3 = 10。
   * ============================================================= */
  function yearStrategy(targetYear, month, day) {
    var sum = Number(targetYear) + Number(month) + Number(day);
    var v = reduceUntil(sum, 21);
    return v; // 已在 0~21 範圍
  }

  /* =============================================================
   * 6. 四大能量分佈
   * -------------------------------------------------------------
   * 依六張天賦牌所屬元素（風火水土）統計。
   *   高能量：占比 >= 25%；0 能量：完全沒有出現。
   * ============================================================= */
  var ELEMENT_OF = {
    0: '風', 1: '風', 6: '風', 11: '風', 17: '風', 20: '風',
    4: '火', 8: '火', 14: '火', 16: '火', 19: '火',
    2: '水', 3: '水', 7: '水', 12: '水', 13: '水', 18: '水',
    5: '土', 9: '土', 10: '土', 15: '土', 21: '土'
  };

  function energy(cards) {
    var counts = { 風: 0, 火: 0, 水: 0, 土: 0 };
    cards.forEach(function (n) {
      var e = ELEMENT_OF[n];
      if (e) counts[e] += 1;
    });
    var total = cards.length || 1;
    var result = {};
    ['風', '火', '水', '土'].forEach(function (e) {
      var pct = Math.round((counts[e] / total) * 1000) / 10;
      result[e] = {
        count: counts[e],
        percent: pct,
        level: counts[e] === 0 ? 'zero' : (pct >= 25 ? 'high' : 'normal')
      };
    });
    return result;
  }

  /* =============================================================
   * 7. 對外主函式
   * ============================================================= */
  function pad2(n) {
    n = Number(n);
    return (n < 10 ? '0' : '') + n;
  }

  // 判斷完全設計 / 天賦設計 / 導師設計：
  //   若某天賦牌同時等於導師牌所屬家族的核心（導師號），視為「完全」該號。
  //   這裡以「天賦牌與導師家族是否重疊」做為輔助判讀，詳細仍需人工解盤。
  function analyze(year, month, day, targetYear) {
    year = Number(year);
    month = Number(month);
    day = Number(day);
    targetYear = Number(targetYear);

    var c1 = card1(day);
    var c2 = card2(year, month, day);
    var c3 = card3(year, month, day);
    var outer = outerCards(month, day);
    var talentCards = [c1, c2, c3, outer[0], outer[1], outer[2]];

    var m = master(year, month, day);

    // 四大能量分母 = 六張天賦牌 + 導師牌（共 7 張），已依實際排盤校準。
    var energyCards = talentCards.concat([m]);

    return {
      birthday: { year: year, month: month, day: day },
      targetYear: targetYear,
      talentCards: talentCards,          // 六張天賦牌 [第1..第6]
      inner: [c1, c2, c3],               // 內在三張
      outer: outer,                      // 外在三張（連號）
      master: m,                         // 導師牌 (1~9)
      shadow: shadow(m),                 // 陰影牌
      family: family(m),                 // 家族牌群組
      yearStrategy: yearStrategy(targetYear, month, day),
      energyCards: energyCards,          // 計算能量所用的牌組（含導師）
      energy: energy(energyCards),       // 四大能量（六張天賦牌 + 導師）
      elementOf: ELEMENT_OF
    };
  }

  /* =============================================================
   * 匯出
   * ============================================================= */
  var MMTCalc = {
    analyze: analyze,
    card1: card1,
    card2: card2,
    card3: card3,
    outerCards: outerCards,
    gridRaw: gridRaw,
    master: master,
    shadow: shadow,
    family: family,
    yearStrategy: yearStrategy,
    energy: energy,
    ELEMENT_OF: ELEMENT_OF,
    setOuterMode: function (mode) { OUTER_MODE = mode; }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MMTCalc;
  } else {
    global.MMTCalc = MMTCalc;
  }
})(typeof window !== 'undefined' ? window : this);
