/* ai.js —— 竞技模式规则型对手（复用敌方单位创建） */
Game.AI = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;

  function init(b) {
    var ai = {
      buns: CONFIG.ARENA.aiBunsStart,
      bench: new Array(CONFIG.BENCH_SIZE).fill(null),
      recruitCd: 1.5,
      recruitCount: 0,
      unlockTimer: CONFIG.ARENA.aiUnlockEvery,
      placeTimer: 0.6,
      passiveBase: CONFIG.ARENA.aiPassiveIncome
    };
    // 初始兵力：避免开局被 rush
    var kinds = ['jian', 'gong'];
    var used = {};
    var n = CONFIG.ARENA.aiStarterCount || 2;
    for (var i = 0; i < n && i < kinds.length; i++) {
      var col = pickStartCol(b, used);
      if (col < 0) break;
      var row = kinds[i] === 'gong' ? Math.max(0, Math.floor(b.enemyZoneMax / 2)) : b.enemyZoneMax;
      var stats = aiUnitStats(b, kinds[i], 1, 1);
      var u = Game.Battle.createEnemyUnit(b, kinds[i], stats, col, row, 1, 1);
      b.units.push(u);
      used[col] = true;
    }
    return ai;
  }
  function pickStartCol(b, used) {
    var opts = [];
    for (var c = 0; c < b.cols; c++) {
      if (used[c]) continue;
      var clear = true;
      for (var r = 0; r <= b.rows - 2; r++) if (b.cells[r][c].blocked) { clear = false; break; }
      if (!clear) continue;
      opts.push(c);
    }
    if (!opts.length) return -1;
    return U.pick(opts);
  }

  function update(b, dt) {
    var ai = b.ai;
    if (!ai) return;
    var income = ai.passiveBase + b.time * CONFIG.ARENA.aiPassiveIncomePerMin / 60;
    ai.buns += income * dt;

    ai.recruitCd -= dt;
    if (ai.recruitCd <= 0) {
      var cost = CONFIG.RECRUIT_COST(ai.recruitCount);
      ai.recruitCd = Math.max(CONFIG.ARENA.aiRecruitCdMin, CONFIG.ARENA.aiRecruitCdStart - b.time * CONFIG.ARENA.aiRecruitCdDecayPerMin / 60);
      if (ai.buns >= cost && ai.bench.indexOf(null) >= 0) {
        ai.buns -= cost;
        ai.recruitCount++;
        aiRecruit(b, ai);
      }
    }

    ai.unlockTimer -= dt;
    if (ai.unlockTimer <= 0) {
      ai.unlockTimer = CONFIG.ARENA.aiUnlockEvery;
      if (b.enemyZoneMax < Math.floor(b.rows / 2) - 1) b.enemyZoneMax++;
    }

    ai.placeTimer -= dt;
    if (ai.placeTimer <= 0) {
      ai.placeTimer = 1.1;
      aiPlace(b, ai);
    }
  }

  function aiRecruit(b, ai) {
    var tile = { type: 'soldier', kind: U.weightedPick(CONFIG.SOLDIER_DROP), level: 1, rarity: 1 };
    var idx = ai.bench.indexOf(null);
    if (idx < 0) return;
    ai.bench[idx] = tile;
    aiAutoMerge(ai);
  }

  function aiAutoMerge(ai) {
    for (var i = 0; i < ai.bench.length; i++) {
      var t = ai.bench[i];
      if (!t || t.type !== 'soldier') continue;
      for (var j = i + 1; j < ai.bench.length; j++) {
        var t2 = ai.bench[j];
        if (t2 && t2.type === 'soldier' && t2.kind === t.kind && t2.level === t.level && t.level < CONFIG.MAX_LEVEL) {
          t.level++;
          t.rarity = CONFIG.LEVEL_RARITY[t.level];
          ai.bench[j] = null;
          return aiAutoMerge(ai);
        }
      }
    }
  }

  function aiUnitStats(b, kind, level, rarity) {
    var s = Game.Battle.soldierStats(kind, level, rarity, null);
    if (b.aiStatMul && b.aiStatMul !== 1) {
      s.hp = Math.round(s.hp * b.aiStatMul);
      s.atk = Math.round(s.atk * b.aiStatMul);
    }
    return s;
  }

  function aiPlace(b, ai) {
    for (var i = 0; i < ai.bench.length; i++) {
      var t = ai.bench[i];
      if (!t || t.type !== 'soldier') continue;
      var preferFront = t.kind === 'qiang' || t.kind === 'jian' || t.kind === 'qi';
      var row = preferFront ? b.enemyZoneMax : Math.max(0, Math.floor(b.enemyZoneMax / 2));
      var placed = false;
      var order = shuffleCols(b);
      for (var c = 0; c < order.length; c++) {
        var col = order[c];
        if (b.cells[row][col].blocked) continue;
        if (row === 0 && col === b.centerCol) continue;
        var occupied = false;
        for (var k = 0; k < b.units.length; k++) {
          var u = b.units[k];
          if (u.hp > 0 && u.col === col && Math.round(u.row) === row) { occupied = true; break; }
        }
        if (occupied) continue;
        var stats = aiUnitStats(b, t.kind, t.level, t.rarity);
        var unit = Game.Battle.createEnemyUnit(b, t.kind, stats, col, row, t.level, t.rarity);
        b.units.push(unit);
        ai.bench[i] = null;
        placed = true;
        break;
      }
      if (placed) { ai.bench[i] = null; }
    }
  }

  function shuffleCols(b) {
    var arr = [];
    for (var c = 0; c < b.cols; c++) arr.push(c);
    return U.shuffle(arr);
  }

  return { init: init, update: update };
})();
