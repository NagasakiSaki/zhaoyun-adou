/* battle.js —— 战斗引擎：网格/实体/固定步长/lane交战/弹道/技能/波次/胜负 */
Game.Battle = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;
  var STEP = CONFIG.STEP;
  var uidSeq = 1;
  function newId() { return uidSeq++; }

  /* ================= 数值计算 ================= */
  function soldierStats(kind, level, rarity, buff) {
    var u = DATA.UNITS[kind];
    var g = CONFIG.LEVEL_GROWTH, m = CONFIG.RARITY_MUL[rarity] || 1;
    var hp = u.hp * Math.pow(g.hp, level - 1) * m;
    var atk = u.atk * Math.pow(g.atk, level - 1) * m;
    if (buff) {
      if (buff.type === 'hpKind' && buff.kind === kind) hp *= buff.mul;
      if (buff.type === 'atkKind' && buff.kind === kind) atk *= buff.mul;
    }
    return { hp: Math.round(hp), atk: Math.round(atk), atkRange: u.atkRange, atkSpeed: u.atkSpeed, moveSpeed: u.moveSpeed, ranged: !!u.ranged, pierce: u.pierce || 1, knockback: u.knockback || 0 };
  }
  function heroStats(heroKey, level, weapon, buff) {
    var h = DATA.HEROES[heroKey];
    var g = CONFIG.LEVEL_GROWTH, m = CONFIG.RARITY_MUL[h.rarity] || 1;
    var hp = h.hp * Math.pow(g.hp, level - 1) * m * 1.1;
    var atk = h.atk * Math.pow(g.atk, level - 1) * m * 1.1;
    var atkSpeed = h.atkSpeed, crit = 0, lifesteal = 0, skillCdMul = 1;
    if (weapon) {
      var w = DATA.WEAPONS[weapon.tier];
      atk *= (1 + w.atkBonus);
      atkSpeed *= (1 + (w.spdBonus || 0));
      crit = w.crit || 0; lifesteal = w.lifesteal || 0;
      skillCdMul *= (1 - (w.skillCdBonus || 0));
    }
    if (buff && buff.type === 'skillCd') skillCdMul *= buff.mul;
    return {
      hp: Math.round(hp), atk: Math.round(atk), atkRange: h.atkRange, atkSpeed: atkSpeed,
      moveSpeed: h.moveSpeed || 1, ranged: h.weapon === 'gong', pierce: h.weapon === 'qiang' ? 2 : 1,
      crit: crit, lifesteal: lifesteal, skillCdMul: skillCdMul, heroDef: h, weaponType: h.weapon
    };
  }
  function enemyStats(kind, hpMul, atkMul, wave) {
    var e = DATA.ENEMIES[kind];
    var hp = e.hp * hpMul * (1 + 0.04 * wave);
    var atk = e.atk * atkMul * (1 + 0.02 * wave);
    return { hp: Math.round(hp), atk: Math.round(atk), atkRange: e.atkRange, atkSpeed: e.atkSpeed, moveSpeed: e.moveSpeed, ranged: !!e.ranged, pierce: e.pierce || 1 };
  }

  /* ================= 实体 ================= */
  function makeUnit(cfg) {
    var s = cfg.stats;
    return {
      id: newId(), side: cfg.side, kind: cfg.kind,
      isHero: !!cfg.heroKey, heroKey: cfg.heroKey || null,
      level: cfg.level || 1, rarity: cfg.rarity || 1,
      col: cfg.col, row: cfg.row,
      hp: s.hp, maxHp: s.hp, atk: s.atk,
      atkRange: s.atkRange, atkSpeed: s.atkSpeed, atkCd: Math.random() * 0.3,
      moveSpeed: cfg.moveSpeed !== undefined ? cfg.moveSpeed : (s.moveSpeed || 1),
      ranged: !!s.ranged, pierce: s.pierce || 1,
      skill: s.skill || null,
      skillCd: (s.skillInterval || 0) ? s.skillInterval * 0.6 : 0,
      skillInterval: s.skillInterval || 0,
      skillName: s.heroDef ? s.heroDef.skillName : null,
      heroDef: s.heroDef || null,
      weaponType: s.weaponType || null, weapon: cfg.weapon || null,
      crit: s.crit || 0, lifesteal: s.lifesteal || 0,
      invincibleUntil: 0, atkSpeedBuffUntil: 0, stunUntil: 0, shield: 0,
      assault: false, // 已抵达敌方阿斗，持续冲击
      bounty: cfg.bounty || 0, isBoss: !!cfg.isBoss,
      knockback: s.knockback || 0,
      dead: false
    };
  }

  function buildCells(map) {
    var cells = [];
    for (var r = 0; r < map.rows; r++) {
      var row = [];
      for (var c = 0; c < map.cols; c++) row.push({ blocked: false });
      cells.push(row);
    }
    (map.blocked || []).forEach(function (b) { cells[b[0]][b[1]].blocked = true; });
    // 阿斗格不标记为障碍（否则会挡住出生路径），单独在放置/出生时排除
    return cells;
  }

  /* ================= 对局建立 ================= */
  function setup(mode, mapKey, dailyBuff, meta, stage) {
    var map = DATA.MAPS[mapKey];
    var b = {
      mode: mode, mapKey: mapKey, map: map, rows: map.rows, cols: map.cols,
      cells: buildCells(map), centerCol: Math.floor(map.cols / 2),
      playerZoneMin: Math.max(1, map.rows - 2 - (meta.shovelBonus || 0)),
      enemyZoneMax: 1,
      time: 0, speed: 1, paused: false,
      buns: (mode === 'arena' ? CONFIG.ARENA.playerStartBuns : CONFIG.BUNS_START) + (dailyBuff && dailyBuff.type === 'startBuns' ? dailyBuff.val : 0),
      recruitCount: 0,
      bench: new Array(CONFIG.BENCH_SIZE).fill(null),
      dailyBuff: dailyBuff || null,
      units: [], projectiles: [],
      adou: (function () {
        var hp = mode === 'arena' ? CONFIG.ARENA.adouHp : CONFIG.ADOU_HP;
        return { player: { hp: hp, maxHp: hp }, enemy: { hp: hp, maxHp: hp } };
      })(),
      activeItems: [null, null],
      farmerIncome: (meta.farmerLevel || 0) * CONFIG.FARMER_BONUS,
      weapons: meta.weapons || {},
      aiStatMul: mode === 'arena' ? CONFIG.ARENA.aiUnitStatMul : 1,
      waveIdx: 0, phase: mode === 'arena' ? 'active' : 'intermission',
      intermission: CONFIG.WAVE_INTERMISSION,
      spawnQueue: [], spawnTotal: 0, spawned: 0, enemyAlive: 0,
      passiveIncome: mode === 'arena' ? CONFIG.ARENA.playerPassiveIncome : 0,
      ai: null, result: null, selBench: -1,
      uiSel: null, // {mode:'unit'|'benchChar', itemSlot:0}
      endlessWave: 0, stage: stage || 1, bannerText: null,
      _acc: 0
    };
    if (mode === 'campaign') {
      b.waveList = DATA.buildCampaignWaves(stage);
    }
    if (mode === 'arena') {
      b.ai = Game.AI.init(b);
    }
    return b;
  }

  /* ================= 主循环 ================= */
  function update(b, dt) {
    if (b.result) return;
    if (b.paused) return;
    dt = Math.min(dt, CONFIG.MAX_DT) * b.speed;
    b._acc = (b._acc || 0) + dt;
    var steps = 0;
    while (b._acc >= STEP && steps < CONFIG.FIXED_STEPS_MAX) {
      step(b);
      b._acc -= STEP;
      steps++;
    }
  }

  function step(b) {
    b.time += STEP;
    if (b.mode === 'arena') {
      b.buns += b.passiveIncome * STEP;
      Game.AI.update(b, STEP);
    } else {
      updateWaves(b);
    }
    updateUnits(b);
    updateProjectiles(b);
    cleanup(b);
    checkEnd(b);
  }

  /* ================= 波次 ================= */
  function updateWaves(b) {
    if (b.phase === 'intermission') {
      b.intermission -= STEP;
      if (b.intermission <= 0) beginWave(b);
    } else if (b.phase === 'spawning') {
      while (b.spawnQueue.length && b.spawnQueue[0].at <= b.time) {
        var s = b.spawnQueue.shift();
        spawnEnemy(b, s);
      }
      if (!b.spawnQueue.length && b.spawned >= b.spawnTotal && b.enemyAlive <= 0) {
        waveCleared(b);
      }
    }
  }

  function beginWave(b) {
    var spec;
    if (b.mode === 'campaign') {
      spec = b.waveList[b.waveIdx];
    } else {
      b.endlessWave++;
      spec = DATA.buildEndlessWave(b.endlessWave);
    }
    b.phase = 'spawning';
    b.spawnTotal = 0; b.spawned = 0; b.enemyAlive = 0;
    b.spawnQueue = [];
    var at = 0.5, spread = spec.spread || 12;
    spec.groups.forEach(function (g) {
      var per = spread / Math.max(1, g.n);
      for (var i = 0; i < g.n; i++) {
        b.spawnQueue.push({ at: at + i * per, kind: g.k });
        b.spawnTotal++;
      }
      at += 1.4;
    });
    b.bannerText = (b.mode === 'endless' ? '第 ' + b.endlessWave + ' 波' : '第 ' + (b.waveIdx + 1) + ' 波');
  }

  // 只在"整条通路无障碍"的列出生，避免敌人卡在边路死巷导致波次无法清空
  function randomOpenEnemyCol(b) {
    var opts = [];
    for (var c = 0; c < b.cols; c++) {
      var clear = true;
      for (var r = 0; r <= b.rows - 2; r++) {
        if (b.cells[r][c].blocked) { clear = false; break; }
      }
      if (clear) opts.push(c);
    }
    if (!opts.length) return -1;
    return U.pick(opts);
  }

  function spawnEnemy(b, spec) {
    var col = randomOpenEnemyCol(b);
    b.spawned++;
    if (col < 0) return;
    var e = DATA.ENEMIES[spec.kind];
    var hpMul = 1, atkMul = 1;
    if (b.mode === 'campaign') {
      hpMul = Math.pow(1.22, b.stage - 1);
      atkMul = Math.pow(1.15, b.stage - 1);
    } else {
      var w = b.endlessWave;
      hpMul = Math.min(CONFIG.ENDLESS.hpCapMul, 1 + CONFIG.ENDLESS.hpPerWave * w);
      atkMul = 1 + CONFIG.ENDLESS.atkPerWave * w;
    }
    var stats = enemyStats(spec.kind, hpMul, atkMul, b.waveIdx);
    var u = makeUnit({ side: 'enemy', kind: spec.kind, stats: stats, col: col, row: 0.35, bounty: e.bounty, isBoss: !!e.isBoss });
    b.units.push(u);
    b.enemyAlive++;
    if (e.isBoss) {
      Game.Effects.burst(col, 0.35, '#a83b2d', 2.2);
      Game.Audio.play('skill');
    }
  }

  function waveCleared(b) {
    var bonus = CONFIG.BUNS_PER_WAVE + b.farmerIncome;
    b.buns += bonus;
    var adou = b.adou.player;
    adou.hp = Math.min(adou.maxHp, adou.hp + CONFIG.ADOU_REGEN_PER_WAVE);
    Game.Effects.text(b.centerCol, b.rows - 1, '馒头 +' + bonus + ' · 阿斗回血', '#c9a227');
    Game.Audio.play('coin');
    b.waveIdx++;
    if (b.mode === 'campaign' && b.waveIdx >= b.waveList.length) {
      endBattle(b, true);
      return;
    }
    b.phase = 'intermission';
    b.intermission = CONFIG.WAVE_INTERMISSION;
    b.bannerText = null;
  }

  /* ================= 单位行动 ================= */
  function updateUnits(b) {
    var lanes = {};
    for (var i = 0; i < b.units.length; i++) {
      var u = b.units[i];
      if (u.hp <= 0) continue;
      (lanes[u.col] = lanes[u.col] || []).push(u);
    }
    for (var c in lanes) updateLane(b, lanes[c]);
  }

  function updateLane(b, list) {
    var player = [], enemy = [];
    for (var i = 0; i < list.length; i++) {
      (list[i].side === 'player' ? player : enemy).push(list[i]);
    }
    player.sort(function (a, b2) { return a.row - b2.row; });
    enemy.sort(function (a, b2) { return b2.row - a.row; });
    for (var p = 0; p < player.length; p++) actUnit(b, player[p], 'player', player, enemy);
    for (var q = 0; q < enemy.length; q++) actUnit(b, enemy[q], 'enemy', enemy, player);
  }

  function actUnit(b, u, side, friends, foes) {
    if (u.stunUntil > b.time) return;
    // 英雄技能
    if (u.isHero && u.skill && u.skillInterval) {
      u.skillCd -= STEP;
      if (u.skillCd <= 0) {
        u.skillCd = u.skillInterval;
        castSkill(b, u);
      }
    }
    var frontFriend = friends[0];
    var frontFoe = foes[0];
    var target = null;
    var speedMul = u.atkSpeedBuffUntil > b.time ? 1.5 : 1;
    if (u.ranged) {
      var best = null, bestDist = Infinity;
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i];
        var dist = side === 'player' ? (u.row - f.row) : (f.row - u.row);
        if (dist > 0 && dist <= u.atkRange && dist < bestDist) { best = f; bestDist = dist; }
      }
      target = best;
    } else if (frontFriend === u && frontFoe) {
      var d2 = side === 'player' ? (u.row - frontFoe.row) : (frontFoe.row - u.row);
      if (d2 >= 0 && d2 <= u.atkRange) target = frontFoe;
    }
    if (target) {
      u.atkCd -= STEP * speedMul;
      if (u.atkCd <= 0) {
        u.atkCd = 1 / u.atkSpeed;
        performAttack(b, u, target, side);
      }
    } else if (u.assault) {
      u.atkCd -= STEP * speedMul;
      if (u.atkCd <= 0) {
        u.atkCd = 1 / u.atkSpeed;
        assaultAdou(b, u, side === 'player' ? 'enemy' : 'player');
      }
    } else {
      marchUnit(b, u, side);
    }
  }

  function marchUnit(b, u, side) {
    var dir = side === 'player' ? -1 : 1;
    if (side === 'player' && u.row <= 1.0) {
      u.row = 1.0;
      u.assault = (b.mode === 'arena'); // 竞技才冲击敌方阿斗；主线/无尽在上方前线驻守
      return;
    }
    if (side === 'enemy' && u.row >= b.rows - 2.0) {
      u.row = b.rows - 2.0;
      if (b.mode === 'arena') u.assault = true;   // 竞技：持续冲击
      else hitAdouOnce(b, 'player', u);            // 主线/无尽：漏怪一次伤后消失
      return;
    }
    var nextR = Math.round(u.row + dir * 0.6);
    if (cellBlocked(b, u.col, nextR)) return;
    if (friendlyAt(b, u, side, u.col, nextR)) return;
    u.row += dir * u.moveSpeed * STEP;
  }

  function cellBlocked(b, col, row) {
    if (row < 0 || row >= b.rows || col < 0 || col >= b.cols) return true;
    return b.cells[row][col].blocked;
  }

  function friendlyAt(b, u, side, col, row) {
    for (var i = 0; i < b.units.length; i++) {
      var o = b.units[i];
      if (o.hp <= 0 || o.side !== side || o.id === u.id) continue;
      if (o.col === col && Math.round(o.row) === row) return true;
    }
    return false;
  }

  function performAttack(b, u, target, side) {
    var dmg = u.atk, crit = false;
    if (u.crit && Math.random() < u.crit) { dmg = Math.round(dmg * 2); crit = true; }
    if (u.ranged) {
      if (b.projectiles.length >= CONFIG.MAX_PROJECTILES) return;
      b.projectiles.push({
        id: newId(), side: side, col: u.col, row: u.row, targetId: target.id,
        targetRow: target.row, speed: CONFIG.PROJECTILE_SPEED, dmg: dmg,
        pierce: u.pierce || 1, crit: crit, heroSkill: false
      });
    } else {
      damageUnit(b, target, dmg, u, crit);
      if (target.hp > 0 && u.knockback) {
        // 击退位移钳制在棋盘内，避免把单位打出地图外造成死局
        target.row = U.clamp(target.row + (u.side === 'player' ? -1 : 1) * u.knockback, 0.05, b.rows - 1.05);
      }
    }
  }

  function damageUnit(b, target, dmg, src, crit) {
    if (target.hp <= 0) return;
    if (target.invincibleUntil > b.time) {
      Game.Effects.text(target.col, target.row, '免疫', '#8a7d66');
      return;
    }
    var shown = dmg;
    if (target.shield > 0) {
      var absorbed = Math.min(target.shield, dmg);
      target.shield -= absorbed;
      dmg -= absorbed;
    }
    target.hp -= dmg;
    if (target.hp <= 0) {
      target.hp = 0;
      Game.Effects.text(target.col, target.row, (crit ? '暴击' : '') + Math.max(0, Math.round(shown)), crit ? '#c9a227' : '#a83b2d');
      Game.Effects.hit(target.col, target.row);
      killUnit(b, target, src);
    } else {
      Game.Effects.text(target.col, target.row, Math.max(0, Math.round(dmg)), crit ? '#c9a227' : '#a83b2d');
      Game.Effects.hit(target.col, target.row);
      Game.Audio.play('hit');
      if (src && src.lifesteal > 0 && src.hp > 0 && src.side === 'player') {
        src.hp = Math.min(src.maxHp, src.hp + Math.round(dmg * src.lifesteal));
      }
    }
  }

  function killUnit(b, u, src) {
    u.dead = true;
    Game.Effects.kill(u.col, u.row, !!u.isBoss);
    Game.Audio.play('kill');
    if (u.side === 'enemy') b.enemyAlive = Math.max(0, b.enemyAlive - 1);
    if (src) {
      src.kills++;
      if (src.isHero && src.heroDef && src.level < CONFIG.MAX_LEVEL) {
        if (src.kills >= CONFIG.HERO_KILLS_FOR_LEVEL(src.level)) {
          src.level++;
          var st = heroStats(src.heroKey, src.level, src.weapon, b.dailyBuff);
          src.hp = src.maxHp = st.hp;
          src.atk = st.atk; src.atkRange = st.atkRange; src.atkSpeed = st.atkSpeed;
          src.pierce = st.pierce; src.crit = st.crit; src.lifesteal = st.lifesteal;
          src.skillInterval = st.skillInterval;
          Game.Effects.text(src.col, src.row, '升 ' + src.level + ' 级', '#c9a227');
          Game.Audio.play('merge');
        }
      }
      if (src.side === 'player' && u.bounty > 0) {
        b.buns += u.bounty;
        Game.Effects.text(u.col, u.row, '馒头 +' + u.bounty, '#c9a227');
      }
      if (b.mode === 'arena' && src.side === 'enemy' && b.ai && u.bounty > 0) {
        b.ai.buns += u.bounty;
      }
    }
  }

  // 主线/无尽：漏怪到阿斗一次伤，随即移除
  function hitAdouOnce(b, who, u) {
    var adou = b.adou[who];
    adou.hp = Math.max(0, adou.hp - u.atk);
    var r = who === 'player' ? b.rows - 1 : 0;
    Game.Effects.burst(u.col, r, '#a83b2d', 1.8);
    Game.Effects.text(u.col, r, '阿斗 -' + u.atk, '#a83b2d');
    Game.Audio.play('adouHit');
    u.dead = true;
    if (u.side === 'enemy') b.enemyAlive = Math.max(0, b.enemyAlive - 1);
    checkEnd(b);
  }

  // 单位抵达阿斗后的持续冲击（可被防御方击杀打断）
  function assaultAdou(b, u, who) {
    var adou = b.adou[who];
    var dmg = u.atk;
    if (u.crit && Math.random() < u.crit) dmg = Math.round(dmg * 2);
    adou.hp = Math.max(0, adou.hp - dmg);
    var r = who === 'player' ? b.rows - 1 : 0;
    Game.Effects.burst(u.col, r, '#a83b2d', 1.4);
    Game.Effects.text(u.col, r, '阿斗 -' + dmg, '#a83b2d');
    Game.Audio.play('adouHit');
    checkEnd(b);
  }

  /* ================= 英雄技能 ================= */
  function enemiesAhead(b, u, range) {
    var out = [];
    for (var i = 0; i < b.units.length; i++) {
      var o = b.units[i];
      if (o.hp <= 0 || o.side === u.side || o.col !== u.col) continue;
      var dist = u.side === 'player' ? (u.row - o.row) : (o.row - u.row);
      if (dist >= 0 && dist <= range) out.push(o);
    }
    return out;
  }
  function enemiesAround(b, u, range) {
    var out = [];
    for (var i = 0; i < b.units.length; i++) {
      var o = b.units[i];
      if (o.hp <= 0 || o.side === u.side) continue;
      if (Math.abs(o.col - u.col) > 1) continue;
      var dist = u.side === 'player' ? (u.row - o.row) : (o.row - u.row);
      if (dist >= 0 && dist <= range) out.push(o);
    }
    return out;
  }
  function pushProjectile(b, p) {
    if (b.projectiles.length >= CONFIG.MAX_PROJECTILES) return;
    b.projectiles.push(p);
  }
  function castSkill(b, u) {
    var atk = u.atk;
    Game.Audio.play('skill');
    Game.Effects.burst(u.col, u.row, '#1a1a1a', 1.6);
    switch (u.skill) {
      case 'lance':
        pushProjectile(b, { id: newId(), side: u.side, col: u.col, row: u.row, targetId: null, targetRow: u.side === 'player' ? 0 : b.rows - 1, speed: CONFIG.PROJECTILE_SPEED * 1.4, dmg: Math.round(atk * 3), pierce: 4, crit: false, heroSkill: 'lance' });
        Game.Effects.slash(u.col, u.row, '#1a1a1a');
        break;
      case 'sweep': {
        var foes = enemiesAhead(b, u, 2);
        foes.forEach(function (f) {
          damageUnit(b, f, Math.round(atk * 2), u, false);
          if (f.hp > 0) f.row += (u.side === 'player' ? -1 : 1) * 0.5;
        });
        Game.Effects.slash(u.col, u.row, '#a83b2d');
        break;
      }
      case 'roar': {
        enemiesAround(b, u, 2).forEach(function (f) {
          damageUnit(b, f, Math.round(atk * 2.5), u, false);
          if (f.hp > 0) { f.stunUntil = b.time + 1.5; Game.Effects.stun(f.col, f.row); }
        });
        Game.Effects.burst(u.col, u.row, '#a83b2d', 2.6);
        break;
      }
      case 'charge': {
        enemiesAhead(b, u, 4).forEach(function (f) { damageUnit(b, f, Math.round(atk * 4), u, false); });
        u.row += (u.side === 'player' ? -1 : 1) * 1.5;
        Game.Effects.slash(u.col, u.row, '#1a1a1a');
        break;
      }
      case 'volley': {
        b.units.forEach(function (o) {
          if (o.hp > 0 && o.side !== u.side) damageUnit(b, o, Math.round(atk * 1.5), u, false);
        });
        Game.Effects.screenWash('#a83b2d', 0.24);
        break;
      }
      case 'cleave': {
        b.units.forEach(function (o) {
          if (o.hp > 0 && o.side !== u.side) damageUnit(b, o, Math.round(atk * 1.8), u, false);
        });
        Game.Effects.screenWash('#1a1a1a', 0.3);
        break;
      }
      case 'heal': {
        var healSide = u.side;
        b.units.forEach(function (o) {
          if (o.hp > 0 && o.side === healSide) o.hp = Math.min(o.maxHp, o.hp + Math.round(o.maxHp * 0.25));
        });
        var key = healSide === 'player' ? 'player' : 'enemy';
        b.adou[key].hp = Math.min(b.adou[key].maxHp, b.adou[key].hp + Math.round(b.adou[key].maxHp * 0.15));
        Game.Effects.screenWash('#3f9d4f', 0.18);
        break;
      }
      case 'bounce':
        pushProjectile(b, { id: newId(), side: u.side, col: u.col, row: u.row, targetId: null, targetRow: u.side === 'player' ? 0 : b.rows - 1, speed: CONFIG.PROJECTILE_SPEED * 1.3, dmg: Math.round(atk * 1.6), pierce: 2, crit: false, heroSkill: 'bounce' });
        break;
      case 'shield':
        u.shield = Math.round(u.maxHp * 0.5);
        u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.3));
        Game.Effects.burst(u.col, u.row, '#3b4a6b', 2.2);
        break;
    }
  }

  /* ================= 弹道 ================= */
  function updateProjectiles(b) {
    for (var i = b.projectiles.length - 1; i >= 0; i--) {
      var p = b.projectiles[i];
      var dir = p.side === 'player' ? -1 : 1;
      p.row += dir * p.speed * STEP;
      var hit = false;
      if (p.targetId) {
        var t = findById(b, p.targetId);
        if (t && t.hp > 0 && t.col === p.col && Math.abs(t.row - p.row) <= 0.45) {
          damageUnit(b, t, p.dmg, null, p.crit);
          p.pierce--;
          if (p.pierce <= 0) hit = true;
        }
      }
      if (!hit && p.pierce > 0) {
        var closest = null, bestD = 0.45;
        for (var j = 0; j < b.units.length; j++) {
          var o = b.units[j];
          if (o.hp <= 0 || o.side === p.side || o.col !== p.col) continue;
          // 只命中前进方向上的敌人
          if (dir < 0 && o.row > p.row) continue;
          if (dir > 0 && o.row < p.row) continue;
          var d = Math.abs(o.row - p.row);
          if (d <= bestD) { closest = o; bestD = d; }
        }
        if (closest) {
          damageUnit(b, closest, p.dmg, null, p.crit);
          p.pierce--;
          if (p.pierce <= 0) hit = true;
        }
      }
      if (hit || p.row < 0 || p.row > b.rows - 1) {
        b.projectiles.splice(i, 1);
      }
    }
  }
  function findById(b, id) {
    for (var i = 0; i < b.units.length; i++) if (b.units[i].id === id) return b.units[i];
    return null;
  }

  function cleanup(b) {
    b.units = b.units.filter(function (u) { return !u.dead && u.hp > 0; });
  }

  /* ================= 胜负 ================= */
  function checkEnd(b) {
    if (b.result) return;
    if (b.adou.player.hp <= 0) endBattle(b, false);
    else if (b.adou.enemy.hp <= 0) endBattle(b, true);
  }
  function endBattle(b, win) {
    if (b.result) return;
    b.result = { win: win, time: b.time };
    Game.State.onBattleEnd(b);
  }

  /* ================= 玩家动作支撑 ================= */
  function canPlace(b, col, row) {
    if (col < 0 || col >= b.cols || row < 0 || row >= b.rows) return false;
    if (row < b.playerZoneMin || row > b.rows - 1) return false;
    if (row === b.rows - 1 && col === b.centerCol) return false;
    if (b.cells[row][col].blocked) return false;
    for (var i = 0; i < b.units.length; i++) {
      var u = b.units[i];
      if (u.hp > 0 && u.col === col && Math.round(u.row) === row) return false;
    }
    return true;
  }

  function createPlayerUnit(b, tile, col, row) {
    var stats, heroKey = null, weapon = null, rarity, level, kind;
    if (tile.type === 'hero') {
      heroKey = tile.heroKey;
      var mw = b.weapons[heroKey];
      weapon = mw ? { tier: mw.tier, name: mw.name } : null;
      stats = heroStats(heroKey, 1, weapon, b.dailyBuff);
      rarity = DATA.HEROES[heroKey].rarity;
      level = 1;
      kind = DATA.HEROES[heroKey].weapon;
    } else {
      stats = soldierStats(tile.kind, tile.level, tile.rarity, b.dailyBuff);
      rarity = tile.rarity; level = tile.level;
      kind = tile.kind;
    }
    var u = makeUnit({
      side: 'player', kind: kind, stats: stats, col: col, row: row,
      level: level, rarity: rarity, heroKey: heroKey, weapon: weapon,
      bounty: tile.type === 'hero' ? 4 : 2
    });
    if (tile.type === 'hero') Game.Effects.heroSummon(col, row);
    return u;
  }

  function createEnemyUnit(b, kind, stats, col, row, level, rarity, bounty) {
    var e = DATA.ENEMIES[kind] || {};
    return makeUnit({
      side: 'enemy', kind: kind, stats: stats, col: col, row: row,
      level: level || 1, rarity: rarity || 1,
      bounty: bounty !== undefined ? bounty : (e.bounty || 2),
      isBoss: !!e.isBoss
    });
  }

  /* 主动道具：神兵符 目标选择 */
  function findUnitAtPixel(b, pxX, pxY, L) {
    var col = Math.floor(pxX / L.cellW);
    var row = pxY / L.cellH;
    for (var i = 0; i < b.units.length; i++) {
      var u = b.units[i];
      if (u.hp <= 0) continue;
      if (u.col === col && Math.abs(u.row - row) <= 0.7) return u;
    }
    return null;
  }

  return {
    setup: setup,
    update: update,
    canPlace: canPlace,
    createPlayerUnit: createPlayerUnit,
    createEnemyUnit: createEnemyUnit,
    findUnitAtPixel: findUnitAtPixel,
    newId: newId,
    enemyStats: enemyStats,
    soldierStats: soldierStats,
    heroStats: heroStats
  };
})();
