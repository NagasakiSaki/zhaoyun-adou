/* state.js —— 中心状态 + 全部玩法动作（数据流唯一写入口） */
Game.State = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;
  var state = {
    meta: null,
    slots: { campaign: null, endless: null, arena: null },
    screen: 'home',
    mode: null,
    battle: null,
    offlineGain: 0
  };

  /* ================= 每日轮换 / 商人 ================= */
  function pickMerchantItems(rnd) {
    var w = { shenbingfu: 2, gongsufu: 2, maobi: 2, luoyangchan: 2, zhaoxianling: 1, nongmin: 1 };
    var picked = [], keys = Object.keys(w);
    while (picked.length < 3 && keys.length) {
      var k = U.weightedPick(w, rnd);
      delete w[k];
      picked.push(k);
    }
    return picked;
  }
  function ensureDaily(meta) {
    var today = U.todayStr();
    var mapKeys = Object.keys(DATA.MAPS);
    if (meta.dailyDate !== today) {
      meta.dailyDate = today;
      meta.dailyMapIndex = U.hashStr(today) % mapKeys.length;
      var rnd = U.mulberry32(U.hashStr(today));
      var weights = {};
      DATA.DAILY_BUFFS.forEach(function (d, i) { weights[d.key] = CONFIG.DAILY_BUFF_WEIGHTS[i]; });
      meta.dailyBuffKey = U.weightedPick(weights, rnd);
      meta.merchantDate = today;
      meta.merchantItems = pickMerchantItems(rnd);
      Game.Save.saveMeta(meta);
    } else if (!meta.merchantItems || !meta.merchantItems.length) {
      meta.merchantDate = today;
      meta.merchantItems = pickMerchantItems(U.mulberry32(U.hashStr(today)));
      Game.Save.saveMeta(meta);
    }
  }
  function dailyBuffFor(key) {
    for (var i = 0; i < DATA.DAILY_BUFFS.length; i++) {
      if (DATA.DAILY_BUFFS[i].key === key) return DATA.DAILY_BUFFS[i];
    }
    return null;
  }

  /* ================= 初始化 ================= */
  function init() {
    state.meta = Game.Save.loadMeta();
    state.slots = {
      campaign: Game.Save.loadSlot('campaign'),
      endless: Game.Save.loadSlot('endless'),
      arena: Game.Save.loadSlot('arena')
    };
    ensureDaily(state.meta);
    var elapsedMin = (Date.now() - state.meta.offlineTS) / 60000;
    if (elapsedMin >= CONFIG.OFFLINE.minMinutes) {
      var cap = Math.min(CONFIG.OFFLINE.capMin, Math.floor(elapsedMin));
      state.offlineGain = Math.floor(cap * CONFIG.OFFLINE.coinsPerMin);
      if (state.offlineGain < 1) state.offlineGain = 1;
    } else {
      state.offlineGain = 0;
    }
    Game.Save.touchOffline(state.meta);
    Game.Audio.setEnabled(!!state.meta.sound);
  }

  /* ================= 开战 ================= */
  function newRun(mode) {
    if (state.battle) return;
    ensureDaily(state.meta);
    var mapKey = Object.keys(DATA.MAPS)[state.meta.dailyMapIndex];
    var buff = dailyBuffFor(state.meta.dailyBuffKey);
    var stage = state.slots.campaign.progress.stage || 1;
    var b = Game.Battle.setup(mode, mapKey, buff, state.meta, mode === 'campaign' ? stage : 1);
    var pending = state.meta.pendingActiveItems || [];
    for (var i = 0; i < pending.length; i++) addToActiveItems(b, pending[i]);
    state.meta.pendingActiveItems = [];
    state.mode = mode;
    state.battle = b;
    Game.Save.saveMeta(state.meta);
    Game.Save.saveSlot(mode, state.slots[mode]);
    Game.Effects.clear();
    Game.UI.route('battle');
  }

  function goHome() {
    state.battle = null;
    state.mode = null;
    Game.Save.touchOffline(state.meta);
    Game.UI.route('home');
  }

  /* ================= 兵营 ================= */
  function isBenchFull(b) { return b.bench.indexOf(null) < 0; }
  function addToBench(b, tile) {
    for (var i = 0; i < b.bench.length; i++) {
      if (!b.bench[i]) { b.bench[i] = tile; return true; }
    }
    return false;
  }
  function addToActiveItems(b, id) {
    for (var i = 0; i < b.activeItems.length; i++) {
      if (b.activeItems[i] && b.activeItems[i].id === id) { b.activeItems[i].uses++; return true; }
    }
    for (var j = 0; j < b.activeItems.length; j++) {
      if (!b.activeItems[j]) { b.activeItems[j] = { id: id, uses: 1 }; return true; }
    }
    Game.UI.toast('主动道具槽已满');
    return false;
  }
  function consumeItemCharge(b, slot) {
    var it = b.activeItems[slot];
    if (!it) return;
    it.uses--;
    if (it.uses <= 0) b.activeItems[slot] = null;
  }

  function recruit() {
    var b = state.battle;
    if (!b || b.result || b.paused) return;
    autoMerge(b);
    if (isBenchFull(b)) { Game.UI.toast('兵营已满，先合成或上阵'); Game.Audio.play('lose'); return; }
    var cost = CONFIG.RECRUIT_COST(b.recruitCount);
    if (b.dailyBuff && b.dailyBuff.type === 'recruitCost') cost = Math.max(1, Math.round(cost * b.dailyBuff.mul));
    if (b.buns < cost) { Game.UI.toast('馒头不足'); Game.Audio.play('lose'); return; }
    b.buns -= cost;
    b.recruitCount++;
    // 前 3 次征兵必出兵，保证开局基础战力
    var type = b.recruitCount <= 3 ? 'soldier' : U.weightedPick(CONFIG.RECRUIT_DROP);
    var tile;
    if (type === 'soldier') {
      tile = { type: 'soldier', kind: U.weightedPick(CONFIG.SOLDIER_DROP), level: 1, rarity: 1 };
    } else if (type === 'char') {
      tile = { type: 'char', ch: U.weightedPick(DATA.CHARS.weights) };
    } else {
      tile = { type: 'shovel' };
    }
    addToBench(b, tile);
    Game.Audio.play('recruit');
    autoMerge(b);
    Game.UI.syncBattle(b);
  }

  function autoMerge(b) {
    var any = false;
    while (true) {
      var found = false;
      for (var i = 0; i < b.bench.length; i++) {
        var t = b.bench[i];
        if (!t) continue;
        if (t.type === 'soldier') {
          for (var j = i + 1; j < b.bench.length; j++) {
            var t2 = b.bench[j];
            if (t2 && t2.type === 'soldier' && t2.kind === t.kind && t2.level === t.level && t.level < CONFIG.MAX_LEVEL) {
              t.level++;
              t.rarity = CONFIG.LEVEL_RARITY[t.level];
              b.bench[j] = null;
              found = true; any = true;
              Game.Audio.play('merge');
              break;
            }
          }
        } else if (t.type === 'char') {
          for (var k = i + 1; k < b.bench.length; k++) {
            var t3 = b.bench[k];
            if (t3 && t3.type === 'char' && t3.ch === t.ch) {
              var all = Object.keys(DATA.CHARS.weights);
              var nch = U.pick(all);
              if (all.length > 1) { while (nch === t.ch) nch = U.pick(all); }
              t.ch = nch;
              b.bench[k] = null;
              found = true; any = true;
              break;
            }
          }
        }
      }
      if (!found) break;
    }
    return any;
  }

  function availableHeroes(b) {
    var out = [];
    for (var key in DATA.HEROES) {
      var h = DATA.HEROES[key];
      var ok = true;
      for (var i = 0; i < h.recipe.length; i++) {
        var found = false;
        for (var j = 0; j < b.bench.length; j++) {
          if (b.bench[j] && b.bench[j].type === 'char' && b.bench[j].ch === h.recipe[i]) { found = true; break; }
        }
        if (!found) { ok = false; break; }
      }
      if (ok) out.push(key);
    }
    return out;
  }
  function combineHero(heroKey) {
    var b = state.battle;
    if (!b || b.result) return false;
    var h = DATA.HEROES[heroKey];
    var consumed = [];
    for (var i = 0; i < h.recipe.length; i++) {
      var idx = b.bench.findIndex(function (t) { return t && t.type === 'char' && t.ch === h.recipe[i]; });
      if (idx < 0) return false;
      consumed.push(idx);
    }
    // 占位保存，避免重叠字
    consumed.forEach(function (ix) { b.bench[ix] = null; });
    var tile = { type: 'hero', heroKey: heroKey };
    if (!addToBench(b, tile)) {
      consumed.forEach(function (ix) { b.bench[ix] = { type: 'char', ch: h.recipe[consumed.indexOf(ix)] }; });
      return false;
    }
    Game.Audio.play('hero');
    Game.UI.syncBattle(b);
    return true;
  }

  function useShovel(benchIdx) {
    var b = state.battle;
    var t = b.bench[benchIdx];
    if (!t || t.type !== 'shovel') return;
    if (b.playerZoneMin <= 1) { Game.UI.toast('已无可解锁格位'); return; }
    b.playerZoneMin--;
    b.bench[benchIdx] = null;
    Game.Audio.play('merge');
    Game.UI.syncBattle(b);
  }

  function onBenchTap(index) {
    var b = state.battle;
    if (!b || b.result) return;
    var t = b.bench[index];
    if (!t) { b.selBench = -1; Game.UI.syncBattle(b); return; }
    if (b.uiSel && b.uiSel.mode === 'benchChar') {
      if (t.type === 'char') {
        var all = Object.keys(DATA.CHARS.weights);
        var nch = U.pick(all);
        if (all.length > 1) { while (nch === t.ch) nch = U.pick(all); }
        t.ch = nch;
        consumeItemCharge(b, b.uiSel.itemSlot);
        b.uiSel = null;
        Game.Audio.play('merge');
      }
      Game.UI.syncBattle(b);
      return;
    }
    if (t.type === 'shovel') { useShovel(index); return; }
    if (t.type === 'char') { Game.UI.toast('集齐汉字配方可合成武将'); Game.Audio.play('click'); return; }
    b.selBench = (b.selBench === index) ? -1 : index;
    Game.UI.syncBattle(b);
  }

  function place(benchIdx, col, row) {
    var b = state.battle;
    if (!b || b.result) return;
    var tile = b.bench[benchIdx];
    if (!tile) return;
    if (tile.type === 'shovel') { useShovel(benchIdx); return; }
    if (tile.type === 'char') { Game.UI.toast('汉字需按配方合成武将'); return; }
    if (!Game.Battle.canPlace(b, col, row)) { Game.UI.toast('该格无法放置'); return; }
    var pCount = 0;
    for (var i = 0; i < b.units.length; i++) if (b.units[i].side === 'player' && b.units[i].hp > 0) pCount++;
    if (pCount >= CONFIG.MAX_BOARD_UNITS) { Game.UI.toast('单位已达上限'); return; }
    var u = Game.Battle.createPlayerUnit(b, tile, col, row);
    b.units.push(u);
    b.bench[benchIdx] = null;
    b.selBench = -1;
    Game.Audio.play('place');
    Game.UI.syncBattle(b);
  }

  /* ================= 战场点击 ================= */
  function onStagePointer(pxX, pxY) {
    var b = state.battle;
    if (!b || b.result) return;
    var L = Game.Render.getLayout();
    if (!L.cellW) return;
    var col = Math.floor(pxX / L.cellW);
    var row = pxY / L.cellH;
    if (col < 0 || col >= b.cols) return;
    if (b.uiSel && b.uiSel.mode === 'unit') {
      var u = Game.Battle.findUnitAtPixel(b, pxX, pxY, L);
      if (u && u.side === 'player') applyShenbingfu(b, b.uiSel.itemSlot, u);
      else Game.UI.toast('请点击我方单位');
      return;
    }
    if (b.selBench >= 0) place(b.selBench, col, row);
  }

  function applyShenbingfu(b, slot, u) {
    if (u.level < CONFIG.MAX_LEVEL) u.level++;
    if (u.isHero) {
      var st = Game.Battle.heroStats(u.heroKey, u.level, u.weapon, b.dailyBuff);
      u.hp = st.hp; u.maxHp = st.hp; u.atk = st.atk; u.atkRange = st.atkRange; u.atkSpeed = st.atkSpeed;
      u.pierce = st.pierce; u.crit = st.crit; u.lifesteal = st.lifesteal; u.skillInterval = st.skillInterval;
    } else {
      var st2 = Game.Battle.soldierStats(u.kind, u.level, u.rarity, b.dailyBuff);
      u.hp = st2.hp; u.maxHp = st2.hp; u.atk = st2.atk; u.atkRange = st2.atkRange; u.atkSpeed = st2.atkSpeed;
    }
    u.invincibleUntil = b.time + 3;
    consumeItemCharge(b, slot);
    b.uiSel = null;
    Game.Effects.heroSummon(u.col, u.row);
    Game.Audio.play('merge');
    Game.UI.syncBattle(b);
  }

  function useActiveItem(slot) {
    var b = state.battle;
    if (!b || b.result || b.paused) return;
    var item = b.activeItems[slot];
    if (!item || item.uses <= 0) return;
    switch (item.id) {
      case 'gongsufu':
        b.units.forEach(function (u) { if (u.hp > 0 && u.side === 'player') u.atkSpeedBuffUntil = b.time + 8; });
        consumeItemCharge(b, slot);
        Game.Audio.play('skill');
        break;
      case 'shenbingfu':
        b.uiSel = { mode: 'unit', itemSlot: slot };
        Game.UI.toast('点击要强化的我方单位');
        break;
      case 'maobi':
        b.uiSel = { mode: 'benchChar', itemSlot: slot };
        Game.UI.toast('点击兵营中要改写的汉字');
        break;
      case 'zhaoxianling': {
        var keys = Object.keys(DATA.HEROES);
        var hk = U.pick(keys);
        if (!addToBench(b, { type: 'hero', heroKey: hk })) { Game.UI.toast('兵营已满'); return; }
        consumeItemCharge(b, slot);
        Game.Audio.play('hero');
        break;
      }
      case 'luoyangchan':
        if (b.playerZoneMin > 1) { b.playerZoneMin--; consumeItemCharge(b, slot); Game.Audio.play('merge'); }
        else Game.UI.toast('已无可解锁格位');
        break;
    }
    Game.UI.syncBattle(b);
  }

  /* ================= 商店 ================= */
  function buyMerchantItem(id) {
    var meta = state.meta;
    var def = DATA.ITEMS[id];
    if (!def) return;
    if ((meta.merchantItems || []).indexOf(id) < 0) { Game.UI.toast('今日未出售此物'); return; }
    if (meta.coins < def.price) { Game.UI.toast('金币不足'); return; }
    meta.coins -= def.price;
    if (def.type === 'passive') {
      meta.farmerLevel++;
      Game.Audio.play('coin');
    } else {
      var b = state.battle;
      if (b && !b.result) {
        addToActiveItems(b, id);
      } else {
        meta.pendingActiveItems = meta.pendingActiveItems || [];
        meta.pendingActiveItems.push(id);
        if (meta.pendingActiveItems.length > 2) meta.pendingActiveItems.shift();
      }
      Game.Audio.play('coin');
    }
    Game.Save.saveMeta(meta);
    Game.UI.refreshShop();
    Game.UI.syncAll();
  }

  /* ================= 战斗结算 ================= */
  function rollWeapon(stage) {
    var r = Math.random(), tier = null;
    if (stage <= 1) { tier = r < 0.3 ? null : (r < 0.78 ? 1 : 2); }
    else if (stage <= 3) { tier = r < 0.2 ? null : (r < 0.6 ? 2 : 3); }
    else if (stage <= 5) { tier = r < 0.15 ? null : (r < 0.6 ? 3 : 4); }
    else { tier = r < 0.12 ? null : (r < 0.55 ? 4 : 5); }
    if (!tier) return null;
    var candidates = Object.keys(DATA.HEROES).filter(function (k) {
      var cur = state.meta.weapons[k];
      return !cur || cur.tier < tier;
    });
    if (!candidates.length) { state.meta.coins += tier * 20; return null; }
    return { heroKey: U.pick(candidates), tier: tier };
  }
  function addXp(xp) {
    var meta = state.meta;
    meta.xp += xp;
    while (meta.xp >= CONFIG.XP_NEED(meta.playerLevel) && meta.playerLevel < CONFIG.MAX_PLAYER_LEVEL) {
      meta.xp -= CONFIG.XP_NEED(meta.playerLevel);
      meta.playerLevel++;
      meta.coins += 50;
    }
  }
  function checkRankUp() {
    var meta = state.meta;
    while (meta.rank < CONFIG.MAX_RANK && meta.stars >= CONFIG.RANK_NEED(meta.rank)) meta.rank++;
  }

  function onBattleEnd(b) {
    var meta = state.meta;
    var slot = state.slots[b.mode];
    var win = b.result.win;
    var coins = 0, xp = 0, stars = 0, weaponDrop = null;
    if (b.mode === 'campaign') {
      var stage = b.stage;
      if (win) {
        coins = 30 + stage * 10 + b.waveIdx * 2;
        xp = 20 + stage * 5;
        stars = 1 + (stage >= 3 ? 1 : 0) + (b.adou.player.hp / b.adou.player.maxHp > 0.6 ? 1 : 0);
        weaponDrop = rollWeapon(stage);
        slot.progress.maxStage = Math.max(slot.progress.maxStage || 1, stage + 1);
        meta.totalWins++;
      } else {
        xp = 5; coins = Math.round((30 + stage * 10) * 0.3);
      }
    } else if (b.mode === 'endless') {
      var w = b.endlessWave;
      xp = 5 + w; coins = 10 + w * 3;
      slot.progress.endlessBestWave = Math.max(slot.progress.endlessBestWave || 0, w);
      if (w > meta.endlessBest) meta.endlessBest = w;
    } else if (b.mode === 'arena') {
      var rating = slot.progress.arenaRating || 1000;
      slot.progress.arenaRating = Math.max(0, rating + (win ? 18 : -14));
      coins = win ? 50 : 20; xp = win ? 20 : 6;
      stars = win ? 1 + (b.adou.player.hp / b.adou.player.maxHp > 0.5 ? 1 : 0) : 0;
      if (win) { meta.arenaWins++; slot.progress.arenaWins++; meta.totalWins++; }
      else { meta.arenaLosses++; slot.progress.arenaLosses++; }
    }
    meta.coins += coins;
    meta.stars += stars;
    addXp(xp);
    checkRankUp();
    if (weaponDrop) {
      meta.weapons[weaponDrop.heroKey] = { tier: weaponDrop.tier, name: DATA.WEAPONS[weaponDrop.tier].name, type: DATA.HEROES[weaponDrop.heroKey].weapon };
    }
    Game.Save.saveMeta(meta);
    Game.Save.saveSlot(b.mode, slot);
    b.result = Object.assign(b.result, {
      coins: coins, xp: xp, stars: stars, weaponDrop: weaponDrop,
      mode: b.mode, stage: b.stage || 1, wave: b.mode === 'endless' ? b.endlessWave : b.waveIdx
    });
    Game.UI.showResult(b);
    Game.Audio.play(win ? 'win' : 'lose');
  }

  function quitBattle() {
    var b = state.battle;
    if (!b || b.result) return;
    if (b.mode === 'endless') {
      b.result = { win: false, quit: true, time: b.time };
      onBattleEnd(b);
    } else {
      b.result = { win: false, quit: true, time: b.time };
      state.slots[b.mode].lastResult = { quit: true };
      Game.Save.saveSlot(b.mode, state.slots[b.mode]);
      Game.Save.saveMeta(state.meta);
      goHome();
    }
  }

  function claimOffline() {
    if (state.offlineGain > 0) {
      state.meta.coins += state.offlineGain;
      state.offlineGain = 0;
      Game.Save.saveMeta(state.meta);
      Game.Audio.play('coin');
      Game.UI.syncAll();
      Game.UI.toast('已领取离线挂机奖励');
    }
  }

  function setAvatar(key) {
    var meta = state.meta;
    var av = null;
    for (var i = 0; i < DATA.AVATARS.length; i++) if (DATA.AVATARS[i].key === key) av = DATA.AVATARS[i];
    if (av && meta.rank >= av.rankNeed) {
      meta.currentAvatar = key;
      Game.Save.saveMeta(meta);
      Game.UI.syncAll();
    }
  }
  function toggleSound() {
    state.meta.sound = !state.meta.sound;
    Game.Audio.setEnabled(state.meta.sound);
    Game.Save.saveMeta(state.meta);
    Game.UI.syncAll();
  }

  return {
    state: state,
    init: init,
    newRun: newRun,
    goHome: goHome,
    recruit: recruit,
    onBenchTap: onBenchTap,
    place: place,
    combineHero: combineHero,
    availableHeroes: availableHeroes,
    useShovel: useShovel,
    useActiveItem: useActiveItem,
    buyMerchantItem: buyMerchantItem,
    onBattleEnd: onBattleEnd,
    quitBattle: quitBattle,
    claimOffline: claimOffline,
    onStagePointer: onStagePointer,
    setAvatar: setAvatar,
    toggleSound: toggleSound
  };
})();
