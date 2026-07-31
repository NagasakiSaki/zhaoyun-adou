/* battle.js —— 路径塔防引擎（参考版模型）：红心守将 / 同波镜像 / 静态塔输出 */
Game.Battle = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;
  var STEP = CONFIG.STEP;

  function key(c, r) { return c + '_' + r; }
  function mirrorPoint(p) { return [CONFIG.COLS - 1 - p[0], CONFIG.ROWS - 1 - p[1]]; }
  function heroByName(name) {
    for (var k in DATA.HEROES) if (DATA.HEROES[k].name === name) return DATA.HEROES[k];
    return null;
  }

  /* ================= 对局建立 ================= */
  function setup(mode, mapKey, dailyBuff, meta, stage) {
    var map = DATA.MAPS[mapKey];
    var pathP = map.pPath;
    var pathE = map.pPath.map(mirrorPoint);
    var buildP = map.pBuild;
    var buildE = map.pBuild.map(mirrorPoint);
    var pathPPts = pathP.map(function (q) { return [q[0] + 0.5, q[1] + 0.5]; });
    var pathEPts = pathE.map(function (q) { return [q[0] + 0.5, q[1] + 0.5]; });
    var cellType = {};
    for (var c = 0; c < CONFIG.COLS; c++) for (var r = 0; r < CONFIG.ROWS; r++) cellType[key(c, r)] = 'block';
    pathP.concat(pathE).forEach(function (p) { cellType[key(p[0], p[1])] = 'path'; });
    buildP.forEach(function (p) { cellType[key(p[0], p[1])] = 'build_p'; });
    buildE.forEach(function (p) { cellType[key(p[0], p[1])] = 'build_e'; });

    var b = {
      mode: mode, mapKey: mapKey, map: map,
      cols: CONFIG.COLS, rows: CONFIG.ROWS,
      pathP: pathP, pathE: pathE, buildP: buildP, buildE: buildE,
      pathPPts: pathPPts, pathEPts: pathEPts, cellType: cellType,
      solo: mode !== 'arena',
      P: newSide(dailyBuff), E: newSide(dailyBuff),
      enemies: [], bullets: [],
      wave: 0, waveState: 'idle', spawnQueue: [], spawnTimer: 0,
      restTimer: CONFIG.INTERMISSION,
      maxWave: mode === 'endless' ? Infinity : (mode === 'arena' ? CONFIG.MAX_WAVE : CONFIG.WAVES_PER_STAGE),
      stageOffset: mode === 'campaign' ? (stage - 1) * CONFIG.WAVES_PER_STAGE : 0,
      stage: stage || 1,
      dailyBuff: dailyBuff, farmerIncome: (meta.farmerLevel || 0) * CONFIG.FARMER_BONUS,
      activeItems: [null, null], weapons: meta.weapons || {},
      drops: [],
      time: 0, speed: 1, paused: false, result: null,
      selCard: -1, unlockMode: false, uiSel: null,
      _acc: 0, _auraP: 1, _auraE: 1
    };
    // AI 初始手牌
    if (!b.solo) {
      for (var i = 0; i < b.E.bench.length; i++) b.E.bench[i] = rollCard(b.E, CONFIG.ARENA.luck);
    }
    var pending = meta.pendingActiveItems || [];
    for (var j = 0; j < pending.length; j++) addActiveItem(b, pending[j]);
    return b;
  }

  function newSide(dailyBuff) {
    return {
      mantou: CONFIG.ECON.startMantou + (dailyBuff && dailyBuff.type === 'startBuns' ? dailyBuff.val : 0),
      recruitCount: 0,
      bench: new Array(CONFIG.BENCH_SIZE).fill(null),
      units: {}, hearts: CONFIG.ECON.hearts, shakeT: 0
    };
  }

  /* ================= 单位属性 ================= */
  function unitStats(u, side, b) {
    if (u.kind === 's') {
      var s = DATA.SOLDIERS[u.ch];
      var dmg = s.dmg * CONFIG.lvMul(u.lv);
      if (b.dailyBuff && b.dailyBuff.type === 'atkChar' && b.dailyBuff.ch === u.ch) dmg *= b.dailyBuff.mul;
      return { dmg: Math.round(dmg), itv: s.itv, range: s.range, ch: u.ch };
    }
    if (u.kind === 'g') {
      var h = heroByName(u.name);
      if (!h) return { inert: true };
      var dmg = h.dmg;
      if (side === 'P' && b.weapons[u.name]) dmg += DATA.WEAPONS[b.weapons[u.name].tier].dmg;
      if (u.dmgBonus) dmg *= (1 + u.dmgBonus);
      if (b.dailyBuff && b.dailyBuff.type === 'heroAtk') dmg *= b.dailyBuff.mul;
      return { dmg: Math.round(dmg), itv: h.itv, range: h.range, skill: h.skill, hero: true, name: u.name };
    }
    return { inert: true };
  }

  function auraOf(b, side) {
    var S = side === 'P' ? b.P : b.E;
    var m = 1;
    for (var k in S.units) {
      var u = S.units[k];
      if (u.kind === 'g' && u.name === '刘备') m += 0.15;
      if (u.kind === 'g' && u.name === '黄盖') m += 0.10;
    }
    return m;
  }

  /* ================= 征兵（整手替换） ================= */
  function recruitCost(S) { return CONFIG.ECON.recruitBase + S.recruitCount * CONFIG.ECON.recruitInc; }

  function ownedFragChars(S) {
    var own = {};
    for (var i = 0; i < S.bench.length; i++) if (S.bench[i] && S.bench[i].kind === 'f') own[S.bench[i].ch] = true;
    return own;
  }
  function rollCard(S, luck) {
    luck = Math.max(0, Math.min(1, luck || 0));
    var wShovel = 4 * (1 - luck * 0.75);
    var wFrag = 26 + luck * 6;
    var wSoldier = 70;
    var total = wSoldier + wShovel + wFrag;
    var roll = Math.random() * total;
    var acc = 0;
    acc += wSoldier;
    if (roll < acc) return { kind: 's', ch: U.pick(CONFIG.SOLDIER_CHARS), lv: 1, cd: 0 };
    acc += wShovel;
    if (roll < acc) return { kind: 'shovel', ch: '铲', cd: 0 };
    // 碎片：尽量补全已有碎片配对的另一半
    var own = ownedFragChars(S);
    var wants = [];
    for (var hk in DATA.HEROES) {
      var h = DATA.HEROES[hk];
      if (own[h.recipe[0]] && !own[h.recipe[1]]) wants.push(h.recipe[1]);
      if (own[h.recipe[1]] && !own[h.recipe[0]]) wants.push(h.recipe[0]);
    }
    var pairChance = 0.75 + luck * 0.2;
    var fc = (wants.length && Math.random() < pairChance) ? U.pick(wants) : U.weightedPick(DATA.FRAG_WEIGHTS);
    return { kind: 'f', ch: fc, lv: 0, cd: 0 };
  }

  function doRecruit(b, S, isPlayer) {
    var cost = recruitCost(S);
    if (S.mantou < cost) { if (isPlayer) Game.UI.toast('馒头不足'); return false; }
    S.mantou -= cost;
    S.recruitCount++;
    for (var i = 0; i < CONFIG.BENCH_SIZE; i++) S.bench[i] = rollCard(S, isPlayer ? 0 : CONFIG.ARENA.luck);
    autoMergeBench(b, S);
    if (isPlayer) Game.Audio.play('recruit');
    return true;
  }

  // 手牌自动合并：相同兵种同字同级 → 升级；相同碎片 → 随机改写
  function autoMergeBench(b, S) {
    for (var i = 0; i < S.bench.length; i++) {
      var a = S.bench[i];
      if (!a) continue;
      if (a.kind === 's') {
        for (var j = i + 1; j < S.bench.length; j++) {
          var c = S.bench[j];
          if (c && c.kind === 's' && c.ch === a.ch && c.lv === a.lv && a.lv < CONFIG.MAX_LV) {
            a.lv++; S.bench[j] = null; i = -1;
            if (S === b.P) Game.Audio.play('merge');
            break;
          }
        }
      } else if (a.kind === 'f') {
        for (var k = i + 1; k < S.bench.length; k++) {
          var d = S.bench[k];
          if (d && d.kind === 'f' && d.ch === a.ch) {
            var all = Object.keys(DATA.FRAG_WEIGHTS);
            var nch = U.pick(all);
            if (all.length > 1) while (nch === a.ch) nch = U.pick(all);
            a.ch = nch; S.bench[k] = null; i = -1;
            break;
          }
        }
      }
    }
  }

  /* ================= 部署 / 合成 / 铲子 ================= */
  function canPlaceUnit(b, c, r) { return b.cellType[key(c, r)] === 'build_p'; }
  function canUnlock(b, c, r) {
    return b.cellType[key(c, r)] === 'block' && r >= Math.floor(CONFIG.ROWS / 2);
  }

  // 放置手牌到格：'placed' | 'merged' | 'hero' | 'fail'
  function placeCard(b, cardIdx, c, r) {
    var k = key(c, r);
    if (b.cellType[k] !== 'build_p') return 'fail';
    var card = b.P.bench[cardIdx];
    if (!card) return 'fail';
    if (card.kind === 'shovel') return 'fail';
    if (card.kind === 'f') { Game.UI.toast('碎片需拼字成武将再上阵'); return 'fail'; }
    var target = b.P.units[k];
    if (target) {
      if (target.kind === 's' && card.kind === 's' && target.ch === card.ch && target.lv === card.lv && target.lv < CONFIG.MAX_LV) {
        target.lv++;
        b.P.bench[cardIdx] = null;
        Game.Effects.burst(c + 0.5, r + 0.5, '#c9a227', 1.4);
        Game.Audio.play('merge');
        return 'merged';
      }
      Game.UI.toast('该格已有单位，需同字同级才能合成');
      return 'fail';
    }
    b.P.units[k] = card;
    b.P.bench[cardIdx] = null;
    b.P.units[k].cd = 0; b.P.units[k].attackT = 0;
    if (card.kind === 'g') { Game.Effects.heroSummon(c + 0.5, r + 0.5); Game.Audio.play('hero'); }
    else { Game.Effects.burst(c + 0.5, r + 0.5, '#1a1a1a', 1); Game.Audio.play('place'); }
    return 'placed';
  }

  function unlockCell(b, c, r) {
    var k = key(c, r);
    if (b.cellType[k] !== 'block' || r < Math.floor(CONFIG.ROWS / 2)) return false;
    b.cellType[k] = 'build_p';
    b.buildP.push([c, r]);
    Game.Effects.burst(c + 0.5, r + 0.5, '#3f9d4f', 1.4);
    Game.Audio.play('merge');
    return true;
  }

  // 可合成武将
  function availableHeroes(b) {
    var out = [];
    for (var k in DATA.HEROES) {
      var h = DATA.HEROES[k];
      var ok = true;
      for (var i = 0; i < h.recipe.length; i++) {
        var found = false;
        for (var j = 0; j < b.P.bench.length; j++) {
          if (b.P.bench[j] && b.P.bench[j].kind === 'f' && b.P.bench[j].ch === h.recipe[i]) { found = true; break; }
        }
        if (!found) { ok = false; break; }
      }
      if (ok) out.push(h.name);
    }
    return out;
  }
  function combineHero(b, name) {
    var h = heroByName(name);
    if (!h) return false;
    var used = [];
    for (var i = 0; i < h.recipe.length; i++) {
      var idx = b.P.bench.findIndex(function (t) { return t && t.kind === 'f' && t.ch === h.recipe[i]; });
      if (idx < 0) return false;
      used.push(idx);
    }
    var empty = b.P.bench.indexOf(null);
    if (empty < 0) { Game.UI.toast('备战席已满'); return false; }
    used.forEach(function (ix) { b.P.bench[ix] = null; });
    b.P.bench[empty] = { kind: 'g', name: name, ch: h.recipe[0], cd: 0, attackT: 0 };
    Game.Effects.heroSummon(0, 0);
    Game.Audio.play('hero');
    return true;
  }

  /* ================= 主动道具 ================= */
  function addActiveItem(b, id) {
    for (var i = 0; i < b.activeItems.length; i++) {
      if (b.activeItems[i] && b.activeItems[i].id === id) { b.activeItems[i].uses++; return true; }
    }
    for (var j = 0; j < b.activeItems.length; j++) {
      if (!b.activeItems[j]) { b.activeItems[j] = { id: id, uses: 1 }; return true; }
    }
    return false;
  }
  function consumeItem(b, slot) {
    var it = b.activeItems[slot];
    if (!it) return;
    it.uses--;
    if (it.uses <= 0) b.activeItems[slot] = null;
  }
  function useActiveItem(b, slot) {
    if (b.result || b.paused) return;
    var item = b.activeItems[slot];
    if (!item || item.uses <= 0) return;
    switch (item.id) {
      case 'gongsufu':
        for (var k in b.P.units) { b.P.units[k].cd = Math.min(b.P.units[k].cd, 0.1); }
        b._atkSpeedBuff = (b.time || 0) + 8;
        consumeItem(b, slot); Game.Audio.play('skill'); break;
      case 'shenbingfu':
        b.uiSel = { mode: 'unit', itemSlot: slot }; Game.UI.toast('点击要强化的我方单位'); break;
      case 'maobi':
        b.uiSel = { mode: 'benchChar', itemSlot: slot }; Game.UI.toast('点击备战席要改写的汉字'); break;
      case 'zhaoxianling': {
        var names = Object.keys(DATA.HEROES).map(function (k) { return DATA.HEROES[k].name; });
        var name = U.pick(names);
        var empty = b.P.bench.indexOf(null);
        if (empty < 0) { Game.UI.toast('备战席已满'); return; }
        b.P.bench[empty] = { kind: 'g', name: name, ch: heroByName(name).recipe[0], cd: 0, attackT: 0 };
        consumeItem(b, slot); Game.Audio.play('hero'); break;
      }
      case 'luoyangchan':
        b.unlockMode = true; Game.UI.toast('点击一块空地解锁'); break;
    }
  }

  /* ================= 主循环 ================= */
  function update(b, dt) {
    if (b.result || b.paused) return;
    dt = Math.min(dt, CONFIG.MAX_DT) * b.speed;
    b._acc = (b._acc || 0) + dt;
    var steps = 0;
    while (b._acc >= STEP && steps < CONFIG.FIXED_STEPS_MAX) { step(b); b._acc -= STEP; steps++; }
  }

  function step(b) {
    b.time += STEP;
    updateWaves(b);
    updateEnemies(b, STEP);
    updateSide(b, 'P', STEP);
    if (!b.solo) { updateSide(b, 'E', STEP); Game.AI.update(b, STEP); }
    updateBullets(b, STEP);
    cleanup(b);
    checkEnd(b);
  }

  /* ================= 波次 ================= */
  function updateWaves(b) {
    if (b.waveState === 'idle' || b.waveState === 'cleared') {
      if (b.wave >= b.maxWave) { if (b.solo) endBattle(b, true); return; }
      b.restTimer -= STEP;
      if (b.restTimer <= 0) startNextWave(b);
    }
    if (b.waveState === 'spawning') {
      b.spawnTimer -= STEP;
      if (b.spawnTimer <= 0 && b.spawnQueue.length) {
        var type = b.spawnQueue.shift();
        spawn(b, type, 'P');
        if (!b.solo) spawn(b, type, 'E');
        b.spawnTimer = Math.max(0.4, 1.5 - b.wave * 0.07);
      }
      if (!b.spawnQueue.length) b.waveState = 'fighting';
    }
    if (b.waveState === 'fighting' && !b.enemies.length) {
      b.waveState = 'cleared';
      var bonus = CONFIG.ECON.waveBonus(b.wave) + b.farmerIncome;
      b.P.mantou += bonus;
      if (!b.solo) b.E.mantou += bonus;
      if (b.P.hearts < CONFIG.ECON.hearts) b.P.hearts += 1;
      Game.UI.toast('第 ' + b.wave + ' 波告破 · 犒赏 ' + bonus + ' 馒头');
      Game.Audio.play('coin');
      if (b.wave >= b.maxWave) { endBattle(b, true); return; }
      b.restTimer = CONFIG.INTERMISSION;
    }
  }

  function startNextWave(b) {
    b.wave++;
    b.waveState = 'spawning';
    b.spawnQueue = CONFIG.buildWave(b.wave);
    b.spawnTimer = 0.5;
    if (b.wave % 5 === 0) Game.Audio.play('boss');
  }

  function spawn(b, type, side) {
    var base = DATA.ENEMIES[type];
    var effWave = b.wave + (b.mode === 'campaign' ? b.stageOffset : 0);
    var hp = Math.round(base.hp * CONFIG.hpMul(effWave));
    var pts = side === 'P' ? b.pathPPts : b.pathEPts;
    b.enemies.push({
      side: side, type: type, ch: base.ch, boss: !!base.boss,
      hp: hp, maxHp: hp, spd: base.spd, mantou: base.mantou, size: base.size,
      seg: 0, segT: 0, x: pts[0][0], y: pts[0][1],
      slowT: 0, stunT: 0, flashT: 0, dead: false
    });
  }

  /* ================= 敌人推进 ================= */
  function updateEnemies(b, dt) {
    for (var i = 0; i < b.enemies.length; i++) {
      var e = b.enemies[i];
      if (e.dead) continue;
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      var spd = e.spd * (e.slowT > 0 ? 0.5 : 1);
      if (e.slowT > 0) e.slowT -= dt;
      var pts = e.side === 'P' ? b.pathPPts : b.pathEPts;
      var move = spd * dt;
      while (move > 0 && e.seg < pts.length - 1) {
        var a = pts[e.seg], bb = pts[e.seg + 1];
        var segLen = Math.max(1, Math.hypot(bb[0] - a[0], bb[1] - a[1]));
        var remain = (1 - e.segT) * segLen;
        if (move < remain) { e.segT += move / segLen; move = 0; }
        else { move -= remain; e.seg++; e.segT = 0; }
      }
      var p1 = pts[e.seg], p2 = pts[Math.min(e.seg + 1, pts.length - 1)];
      e.x = p1[0] + (p2[0] - p1[0]) * e.segT;
      e.y = p1[1] + (p2[1] - p1[1]) * e.segT;
      if (e.seg >= pts.length - 1) {
        e.dead = true;
        var S = e.side === 'P' ? b.P : b.E;
        S.hearts--;
        S.shakeT = 0.5;
        var adou = pts[pts.length - 1];
        Game.Effects.burst(adou[0], adou[1], '#a83b2d', 2.2);
        Game.Effects.text(adou[0], adou[1] - 0.6, '漏怪！-1心', '#a83b2d');
        Game.Audio.play('adouHit');
      }
    }
  }

  /* ================= 塔攻击 ================= */
  function enemiesOf(b, side) {
    var out = [];
    for (var i = 0; i < b.enemies.length; i++) if (!b.enemies[i].dead && b.enemies[i].side === side) out.push(b.enemies[i]);
    return out;
  }
  function mostAdvanced(list, x, y, range) {
    var best = null, bs = -1;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var d = Math.hypot(e.x - x, e.y - y);
      if (d > range) continue;
      var prog = e.seg + e.segT;
      if (prog > bs) { bs = prog; best = e; }
    }
    return best;
  }
  function damage(b, e, dmg, opt) {
    if (e.dead) return;
    opt = opt || {};
    e.hp -= dmg;
    e.flashT = 0.1;
    if (opt.stun) e.stunT = Math.max(e.stunT, opt.stun);
    if (opt.slow) e.slowT = Math.max(e.slowT, opt.slow);
    Game.Effects.hit(e.x, e.y);
    if (e.hp <= 0) kill(b, e);
  }
  function kill(b, e) {
    e.dead = true;
    var S = e.side === 'P' ? b.P : b.E;
    S.mantou += e.mantou;
    Game.Effects.kill(e.x, e.y, !!e.boss);
    Game.Effects.text(e.x, e.y - 0.5, '+' + e.mantou, '#c9a227');
    if (e.boss && e.side === 'P') Game.State.rollWeaponDrop(b);
    Game.Audio.play('kill');
  }

  function updateSide(b, side, dt) {
    var S = side === 'P' ? b.P : b.E;
    var enemies = enemiesOf(b, side);
    var aura = auraOf(b, side);
    for (var k in S.units) {
      var u = S.units[k];
      var st = unitStats(u, side, b);
      if (st.inert) continue;
      if (u.attackT > 0) u.attackT -= dt;
      u.cd -= dt;
      if (u.cd > 0) continue;
      if (!enemies.length) { u.cd = 0.08; continue; }
      var cr = k.split('_');
      var px = +cr[0] + 0.5, py = +cr[1] + 0.5;
      var range = st.range;
      var dmg = Math.round(st.dmg * aura);
      var atkSpeedBuff = b._atkSpeedBuff && b.time < b._atkSpeedBuff;

      // 技能分支
      if (st.skill === 'stun') {
        var hitAny = false;
        for (var i = 0; i < enemies.length; i++) {
          if (Math.hypot(enemies[i].x - px, enemies[i].y - py) <= range) { damage(b, enemies[i], dmg, { stun: 1.0 }); hitAny = true; }
        }
        if (hitAny) { u.cd = st.itv; u.attackT = 0.35; Game.Effects.burst(px, py, '#a83b2d', 2); }
        else u.cd = 0.08;
        continue;
      }
      if (st.skill === 'pierce') {
        var t0 = mostAdvanced(enemies, px, py, range);
        if (!t0) { u.cd = 0.08; continue; }
        u.cd = st.itv; u.attackT = 0.35;
        var ang = Math.atan2(t0.y - py, t0.x - px);
        Game.Effects.slash(px, py, '#1a1a1a');
        for (var j = 0; j < enemies.length; j++) {
          var e2 = enemies[j];
          var d2 = Math.hypot(e2.x - px, e2.y - py);
          if (d2 > range) continue;
          var a2 = Math.atan2(e2.y - py, e2.x - px);
          var diff = Math.abs(((a2 - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (diff < 0.45) damage(b, e2, dmg);
        }
        continue;
      }
      if (st.skill === 'volley' || st.skill === 'sweep') {
        var hitAny2 = false;
        for (var k2 = 0; k2 < enemies.length; k2++) {
          if (Math.hypot(enemies[k2].x - px, enemies[k2].y - py) <= range) { damage(b, enemies[k2], dmg); hitAny2 = true; }
        }
        if (hitAny2) { u.cd = st.itv; u.attackT = 0.35; Game.Effects.burst(px, py, '#c9a227', 2.2); }
        else u.cd = 0.08;
        continue;
      }
      if (st.skill === 'smash' || st.skill === 'fortify') {
        var t1 = mostAdvanced(enemies, px, py, range);
        if (!t1) { u.cd = 0.08; continue; }
        u.cd = st.itv; u.attackT = 0.35;
        damage(b, t1, Math.round(dmg * 1.6));
        Game.Effects.burst(t1.x, t1.y, '#a83b2d', 1.6);
        continue;
      }

      // 普通攻击（含 snipe 超远速射）
      var target = mostAdvanced(enemies, px, py, range);
      if (!target) { u.cd = 0.08; continue; }
      u.cd = (atkSpeedBuff ? st.itv * 0.6 : st.itv);
      u.attackT = 0.35;
      var snipe = st.skill === 'snipe';
      if (b.bullets.length < CONFIG.MAX_BULLETS) {
        b.bullets.push({
          x: px, y: py, target: target,
          spd: (snipe ? 16 : 11), dmg: dmg,
          arrow: (u.kind === 's' && u.ch === '弓') || snipe,
          gold: u.kind === 'g', ang: 0
        });
      }
    }
  }

  /* ================= 弹道 ================= */
  function updateBullets(b, dt) {
    for (var i = b.bullets.length - 1; i >= 0; i--) {
      var bl = b.bullets[i];
      if (bl.target.dead) { b.bullets.splice(i, 1); continue; }
      var dx = bl.target.x - bl.x, dy = bl.target.y - bl.y;
      var d = Math.hypot(dx, dy);
      var step = bl.spd * dt;
      if (d <= step) {
        damage(b, bl.target, bl.dmg);
        Game.Effects.hit(bl.target.x, bl.target.y);
        b.bullets.splice(i, 1);
      } else {
        bl.ang = Math.atan2(dy, dx);
        bl.x += dx / d * step;
        bl.y += dy / d * step;
      }
    }
  }

  function cleanup(b) {
    b.enemies = b.enemies.filter(function (e) { return !e.dead; });
  }

  /* ================= 胜负 ================= */
  function checkEnd(b) {
    if (b.result) return;
    if (b.solo) {
      if (b.P.hearts <= 0) return endBattle(b, false);
      return;
    }
    if (b.P.hearts <= 0) return endBattle(b, false);
    if (b.E.hearts <= 0) return endBattle(b, true);
  }
  function endBattle(b, win) {
    if (b.result) return;
    b.result = { win: win, time: b.time };
    Game.State.onBattleEnd(b);
  }

  /* ================= 暴露 ================= */
  return {
    setup: setup,
    update: update,
    unitStats: unitStats,
    recruitCost: recruitCost,
    doRecruit: doRecruit,
    rollCard: rollCard,
    autoMergeBench: autoMergeBench,
    canPlaceUnit: canPlaceUnit,
    canUnlock: canUnlock,
    placeCard: placeCard,
    unlockCell: unlockCell,
    availableHeroes: availableHeroes,
    combineHero: combineHero,
    addActiveItem: addActiveItem,
    consumeItem: consumeItem,
    useActiveItem: useActiveItem,
    heroByName: heroByName,
    key: key
  };
})();
