/* ai.js —— 竞技模式对手：规则型运营，防守己方半区 */
Game.AI = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;
  var thinkT = 2.0;

  function init() { thinkT = 2.0; }

  function update(b, dt) {
    if (b.solo || b.result || b.paused) return;
    thinkT -= dt;
    if (thinkT > 0) return;
    thinkT = CONFIG.ARENA.thinkItv;
    if (Math.random() < CONFIG.ARENA.missRate) return;
    step(b, b.E, 'E');
  }

  function key(c, r) { return c + '_' + r; }

  function step(b, S, side) {
    // 1. 手牌内士兵合成
    for (var i = 0; i < S.bench.length; i++) {
      var a = S.bench[i];
      if (!a || a.kind !== 's') continue;
      for (var j = i + 1; j < S.bench.length; j++) {
        var c = S.bench[j];
        if (c && c.kind === 's' && c.ch === a.ch && c.lv === a.lv && a.lv < CONFIG.MAX_LV) {
          a.lv++; S.bench[j] = null;
          return true;
        }
      }
    }
    // 2. 铲子：解锁一块空地（概率）
    for (var s2 = 0; s2 < S.bench.length; s2++) {
      if (S.bench[s2] && S.bench[s2].kind === 'shovel') {
        if (Math.random() < 0.5) {
          var opts = [];
          for (var c2 = 0; c2 < b.cols; c2++) for (var r2 = 0; r2 < Math.floor(b.rows / 2); r2++) {
            if (b.cellType[key(c2, r2)] === 'block') opts.push([c2, r2]);
          }
          if (opts.length) {
            var p = U.pick(opts);
            b.cellType[key(p[0], p[1])] = 'build_e';
            b.buildE.push(p);
            S.bench[s2] = null;
            return true;
          }
        }
        S.bench[s2] = null;
        return true;
      }
    }
    // 3. 士兵/武将上阵到空地（近战贴路优先已由 build_e 布局保证）
    var cells = b.buildE;
    for (var i3 = 0; i3 < S.bench.length; i3++) {
      var u = S.bench[i3];
      if (!u || u.kind === 'f') continue;
      for (var k = 0; k < cells.length; k++) {
        var ck = key(cells[k][0], cells[k][1]);
        if (!S.units[ck]) {
          S.units[ck] = u;
          S.bench[i3] = null;
          return true;
        }
      }
    }
    // 4. 手牌士兵合到阵地
    for (var i4 = 0; i4 < S.bench.length; i4++) {
      var u2 = S.bench[i4];
      if (!u2 || u2.kind !== 's') continue;
      for (var k2 = 0; k2 < cells.length; k2++) {
        var ck2 = key(cells[k2][0], cells[k2][1]);
        var t = S.units[ck2];
        if (t && t.kind === 's' && t.ch === u2.ch && t.lv === u2.lv && t.lv < CONFIG.MAX_LV) {
          t.lv++; S.bench[i4] = null;
          return true;
        }
      }
    }
    // 5. 征兵（席上无可上阵士兵且馒头够）
    var hasPlayable = false;
    for (var bi = 0; bi < S.bench.length; bi++) {
      var bu = S.bench[bi];
      if (bu && (bu.kind === 's' || bu.kind === 'g')) { hasPlayable = true; break; }
    }
    if (!hasPlayable && S.mantou >= Game.Battle.recruitCost(S)) {
      Game.Battle.doRecruit(b, S, false);
      return true;
    }
    return false;
  }

  return { init: init, update: update };
})();
