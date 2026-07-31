/* state.js —— 中心状态 + 玩法动作（拖拽放置 / 整手征兵 / 铲子 / 结算 / 金手指） */
Game.State = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;
  var state = {
    meta: null,
    slots: { campaign: null, endless: null, arena: null },
    screen: 'home',
    mode: null,
    battle: null,
    offlineGain: 0,
    drag: null
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
    if (meta.dailyDate !== today) {
      meta.dailyDate = today;
      meta.dailyMapIndex = U.hashStr(today) % DATA.MAP_ORDER.length;
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
    for (var i = 0; i < DATA.DAILY_BUFFS.length; i++) if (DATA.DAILY_BUFFS[i].key === key) return DATA.DAILY_BUFFS[i];
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
    ensureDeck(state.meta);
    var elapsedMin = (Date.now() - state.meta.offlineTS) / 60000;
    if (elapsedMin >= CONFIG.OFFLINE.minMinutes) {
      var cap = Math.min(CONFIG.OFFLINE.capMin, Math.floor(elapsedMin));
      var mul = Game.Cheat ? Game.Cheat.offlineMul(state.meta) : 1;
      state.offlineGain = Math.max(1, Math.floor(cap * CONFIG.OFFLINE.coinsPerMin * mul));
    } else state.offlineGain = 0;
    Game.Save.touchOffline(state.meta);
    Game.Audio.setEnabled(!!state.meta.sound);
  }

  /* ================= 开战 ================= */
  function newRun(mode) {
    if (state.battle) return;
    ensureDaily(state.meta);
    var mapKey = DATA.MAP_ORDER[state.meta.dailyMapIndex];
    var buff = dailyBuffFor(state.meta.dailyBuffKey);
    var stage = state.slots.campaign.progress.stage || 1;
    var b = Game.Battle.setup(mode, mapKey, buff, state.meta, mode === 'campaign' ? stage : 1);
    state.mode = mode;
    state.battle = b;
    state.drag = null;
    Game.Save.saveMeta(state.meta);
    Game.Save.saveSlot(mode, state.slots[mode]);
    Game.Effects.clear();
    Game.UI.route('battle');
  }

  function goHome() {
    state.battle = null;
    state.mode = null;
    state.drag = null;
    Game.Save.touchOffline(state.meta);
    Game.UI.route('home');
  }

  /* ================= 征兵 ================= */
  function recruit() {
    var b = state.battle;
    if (!b || b.result) return;
    Game.Battle.doRecruit(b, b.P, true);
    Game.UI.syncBattle(b);
  }

  /* ================= 拖拽 ================= */
  function beginBenchDrag(idx) {
    var b = state.battle;
    if (!b || b.result) return false;
    var card = b.P.bench[idx];
    if (!card) return false;
    b.selCard = -1; b.unlockMode = false; b._shovelIdx = -1;
    state.drag = { type: 'bench', benchIdx: idx, unit: card, moved: false, x: 0, y: 0 };
    return true;
  }
  function beginUnitDrag(c, r) {
    var b = state.battle;
    if (!b || b.result) return false;
    var k = Game.Battle.key(c, r);
    var u = b.P.units[k];
    if (!u) return false;
    if (b.uiSel && b.uiSel.mode === 'unit') return false;
    b.selCard = -1;
    var unit = u;
    if (u.kind === 'g' && u.half != null) {
      var frag = Game.Battle.unlinkGeneral(b, b.P, k);
      if (!frag) return false;
      unit = frag;
    }
    state.drag = { type: 'unit', key: k, unit: unit, moved: false, x: 0, y: 0 };
    return true;
  }
  function updateDrag(x, y) {
    if (state.drag) { state.drag.moved = true; state.drag.x = x; state.drag.y = y; }
  }
  function getDrag() { return state.drag; }
  // dropTarget: {type:'bench',idx} | {type:'cell',c,r} | {type:'none'}
  function endDrag(dropTarget) {
    var d = state.drag;
    state.drag = null;
    if (!d) return;
    var b = state.battle;
    if (!b) { return; }
    var fromKey = d.type === 'bench' ? 'b' + d.benchIdx : d.key;
    if (!dropTarget || dropTarget.type === 'none') {
      if (d.type === 'unit' && !b.P.units[d.key]) b.P.units[d.key] = d.unit;
      Game.UI.syncBattle(b);
      return;
    }
    if (dropTarget.type === 'bench') {
      benchDrop(fromKey, dropTarget.idx);
    } else if (dropTarget.type === 'cell') {
      var res = Game.Battle.dropUnit(b, d.unit, fromKey, dropTarget.c, dropTarget.r);
      if (res === 'fail' && d.type === 'unit' && !b.P.units[d.key]) b.P.units[d.key] = d.unit;
    }
    Game.UI.syncBattle(b);
  }

  function benchDrop(fromKey, toIdx) {
    var b = state.battle;
    if (!b) return;
    var S = b.P;
    var fromB = fromKey.charAt(0) === 'b' ? +fromKey.slice(1) : -1;
    var unit = fromB >= 0 ? S.bench[fromB] : S.units[fromKey];
    if (!unit) return;
    if (fromB === toIdx) return;
    var target = S.bench[toIdx];
    if (!target) {
      if (fromB >= 0) { S.bench[toIdx] = S.bench[fromB]; S.bench[fromB] = null; }
      else { S.bench[toIdx] = unit; delete S.units[fromKey]; }
      return;
    }
    if (unit.kind === 's' && target.kind === 's' && unit.ch === target.ch && unit.lv === target.lv && unit.lv < CONFIG.MAX_LV) {
      target.lv++;
      if (fromB >= 0) S.bench[fromB] = null; else delete S.units[fromKey];
      Game.Audio.play('merge');
      return;
    }
    if (fromB >= 0) { S.bench[fromB] = target; S.bench[toIdx] = unit; }
    else { S.units[fromKey] = target; S.bench[toIdx] = unit; }
  }

  /* ================= 备战席点击（tap 兜底） ================= */
  function onBenchTap(idx) {
    var b = state.battle;
    if (!b || b.result) return;
    var card = b.P.bench[idx];
    if (b.uiSel && b.uiSel.mode === 'benchChar') {
      if (card && card.kind === 'f') {
        var all = Object.keys(DATA.FRAG_WEIGHTS);
        var nch = U.pick(all);
        if (all.length > 1) while (nch === card.ch) nch = U.pick(all);
        card.ch = nch;
        Game.Battle.consumeItem(b, b.uiSel.itemSlot);
        b.uiSel = null;
        Game.Audio.play('merge');
      }
      Game.UI.syncBattle(b);
      return;
    }
    if (!card) { b.selCard = -1; Game.UI.syncBattle(b); return; }
    if (card.kind === 'shovel') {
      b.unlockMode = true; b._shovelIdx = idx; b.selCard = -1;
      Game.UI.toast('点击一块空地解锁建造格');
      Game.UI.syncBattle(b);
      return;
    }
    if (card.kind === 'f') { Game.UI.toast('拖动碎片到相邻空地可拼字觉醒武将'); return; }
    b.selCard = (b.selCard === idx) ? -1 : idx;
    b.unlockMode = false; b._shovelIdx = -1;
    // 点手牌看攻击范围
    if (b.selCard >= 0 && (card.kind === 's' || card.kind === 'g')) {
      b.selInfo = { range: Game.Battle.unitStats(card, 'P', b).range };
    } else b.selInfo = null;
    Game.UI.syncBattle(b);
  }

  /* ================= 战场点击（tap 兜底） ================= */
  function onStagePointer(pxX, pxY) {
    var b = state.battle;
    if (!b || b.result) return;
    var L = Game.Render.getLayout();
    if (!L.cellW) return;
    var c = Math.floor(pxX / L.cellW), r = Math.floor(pxY / L.cellH);
    if (c < 0 || c >= b.cols || r < 0 || r >= b.rows) return;
    if (b.uiSel && b.uiSel.mode === 'unit') {
      var u0 = b.P.units[Game.Battle.key(c, r)];
      if (u0) applyShenbingfu(b, b.uiSel.itemSlot, u0, c, r);
      else Game.UI.toast('请点击我方单位');
      return;
    }
    // 点击我方单位 → 查看攻击范围
    var cu = b.P.units[Game.Battle.key(c, r)];
    if (cu && !b.unlockMode && b.selCard < 0) {
      b.selInfo = { x: c + 0.5, y: r + 0.5, range: Game.Battle.unitStats(cu, 'P', b).range };
      Game.UI.syncBattle(b);
      return;
    }
    if (b.unlockMode) {
      if (Game.Battle.canUnlock(b, c, r)) {
        if (Game.Battle.unlockCell(b, c, r)) {
          if (b._shovelIdx >= 0) { b.P.bench[b._shovelIdx] = null; b._shovelIdx = -1; }
          b.unlockMode = false;
          Game.UI.toast('已解锁新空地！');
          Game.UI.syncBattle(b);
        }
      } else Game.UI.toast('该格不可解锁');
      return;
    }
    if (b.selCard >= 0) {
      var res = Game.Battle.dropUnit(b, b.P.bench[b.selCard], 'b' + b.selCard, c, r);
      if (res !== 'fail') b.selCard = -1;
      b.selInfo = null;
      Game.UI.syncBattle(b);
    }
  }

  function applyShenbingfu(b, slot, u, c, r) {
    if (u.kind === 's' && u.lv < CONFIG.MAX_LV) u.lv++;
    else if (u.kind === 'g') u.dmgBonus = (u.dmgBonus || 0) + 0.15;
    Game.Battle.consumeItem(b, slot);
    b.uiSel = null;
    Game.Effects.heroSummon(c + 0.5, r + 0.5);
    Game.Audio.play('merge');
    Game.UI.syncBattle(b);
  }

  function useActiveItem(slot) {
    var b = state.battle;
    if (!b || b.result) return;
    Game.Battle.useActiveItem(b, slot);
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
    } else {
      var b = state.battle;
      if (b && !b.result) {
        Game.Battle.addActiveItem(b, id);
      } else {
        meta.pendingActiveItems = meta.pendingActiveItems || [];
        meta.pendingActiveItems.push(id);
        if (meta.pendingActiveItems.length > 2) meta.pendingActiveItems.shift();
      }
    }
    Game.Audio.play('coin');
    Game.Save.saveMeta(meta);
    Game.UI.refreshShop();
    Game.UI.syncAll();
  }

  /* ================= 战斗结算 ================= */
  function rollWeaponDrop(b) {
    // BOSS 固定元宝 + 信物概率
    state.meta.yuanbao = (state.meta.yuanbao || 0) + CONFIG.DROP.yuanbaoBoss;
    if (Math.random() < CONFIG.DROP.bossKeepsakeChance) {
      var allHeroes = Object.keys(DATA.HEROES).map(function (k) { return DATA.HEROES[k].name; });
      var kn = U.pick(allHeroes);
      state.meta.keepsakes[kn] = (state.meta.keepsakes[kn] || 0) + 1;
      b.drops.push({ kind: 'keepsake', hero: kn, name: kn + '信物' });
      Game.Effects.text(b.pathP[0][0] + 0.5, b.pathP[0][1] + 0.5 + 0.5, kn + '信物×1', '#7a4fb0');
    }
    if (Math.random() > 0.5) return;
    var tier = 1;
    var r = Math.random();
    if (b.wave >= 8) tier = r < 0.3 ? 5 : (r < 0.6 ? 4 : 3);
    else if (b.wave >= 5) tier = r < 0.4 ? 4 : (r < 0.7 ? 3 : 2);
    else if (b.wave >= 3) tier = r < 0.4 ? 3 : 2;
    var names = Object.keys(DATA.HEROES).map(function (k) { return DATA.HEROES[k].name; });
    var name = U.pick(names);
    var cur = state.meta.weapons[name];
    if (cur && cur.tier >= tier) return;
    var drop = { hero: name, tier: tier, name: DATA.WEAPONS[tier].name };
    b.drops.push(drop);
    state.meta.weapons[name] = { tier: tier, name: drop.name };
    Game.Effects.text(b.pathP[0][0] + 0.5, b.pathP[0][1] + 0.5, '掉落神兵：' + drop.name + '！', '#d9a93b');
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
    var coins = 0, xp = 0, stars = 0;
    var firstClear = false;
    if (b.mode === 'campaign') {
      var stage = b.stage;
      if (win) {
        coins = 30 + stage * 15;
        xp = 20 + stage * 6;
        stars = 1 + (b.P.hearts >= 3 ? 1 : 0) + (b.P.hearts >= 4 ? 1 : 0);
        firstClear = (slot.progress.maxStage || 1) <= stage;
        slot.progress.maxStage = Math.max(slot.progress.maxStage || 1, stage + 1);
        meta.totalWins++;
        dailyProgress(meta, 'win', 1);
      } else {
        xp = 5; coins = 10;
      }
    } else if (b.mode === 'endless') {
      var w = b.wave;
      xp = 5 + w; coins = 8 + w * 2;
      slot.progress.endlessBestWave = Math.max(slot.progress.endlessBestWave || 0, w);
      if (w > meta.endlessBest) meta.endlessBest = w;
    } else if (b.mode === 'arena') {
      var rating = slot.progress.arenaRating || 1000;
      slot.progress.arenaRating = Math.max(0, rating + (win ? 18 : -14));
      coins = win ? 50 : 15; xp = win ? 20 : 6;
      stars = win ? 1 + (b.P.hearts >= 3 ? 1 : 0) : 0;
      if (win) { meta.arenaWins++; slot.progress.arenaWins++; meta.totalWins++; dailyProgress(meta, 'win', 1); }
      else { meta.arenaLosses++; slot.progress.arenaLosses++; }
    }
    // 元宝掉落
    var yuanbao = 0;
    if (b.mode === 'campaign' && win) {
      yuanbao += CONFIG.DROP.yuanbaoStage;
      if (firstClear) yuanbao += CONFIG.DROP.yuanbaoStage;
    } else if (b.mode === 'endless') {
      yuanbao += b.wave * 2;
    } else if (b.mode === 'arena' && win) {
      yuanbao += CONFIG.DROP.yuanbaoBoss;
    }
    meta.yuanbao += yuanbao;
    if (b.P.kills) dailyProgress(meta, 'kill', b.P.kills);
    meta.coins += coins;
    meta.stars += stars;
    addXp(xp);
    checkRankUp();
    Game.Save.saveMeta(meta);
    Game.Save.saveSlot(b.mode, slot);
    b.result = Object.assign(b.result, {
      coins: coins, xp: xp, stars: stars,
      mode: b.mode, stage: b.stage || 1, wave: b.wave, heartsLeft: b.P.hearts
    });
    Game.UI.showResult(b);
    Game.Audio.play(win ? 'win' : 'lose');
  }

  function quitBattle() {
    var b = state.battle;
    if (!b || b.result) return;
    b.result = { win: false, quit: true, time: b.time };
    if (b.mode === 'endless') {
      onBattleEnd(b);
    } else {
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

  /* ================= 金手指 ================= */
  function cheatSave(cfg) {
    state.meta.cheat = cfg;
    Game.Save.saveMeta(state.meta);
    Game.UI.syncAll();
  }

  /* ================= 局外系统：抽卡/升星/训练/每日/成就 ================= */
  function resetDaily(meta) {
    var t = U.todayStr();
    if (!meta.daily || meta.daily.date !== t) {
      meta.daily = { date: t, progress: {}, claimed: {} };
      Game.Save.saveMeta(meta);
    }
  }
  function dailyProgress(meta, key, add) {
    resetDaily(meta);
    meta.daily.progress[key] = (meta.daily.progress[key] || 0) + add;
  }

  function gachaPull(count) {
    var meta = state.meta;
    count = count === 10 ? 10 : 1;
    var cost = count === 10 ? CONFIG.GACHA.costTen : CONFIG.GACHA.costSingle;
    if (meta.yuanbao < cost) { Game.UI.toast('元宝不足'); return null; }
    meta.yuanbao -= cost;
    var results = [];
    for (var i = 0; i < count; i++) results.push(pullOne(meta));
    dailyProgress(meta, 'gacha', count);
    Game.Save.saveMeta(meta);
    return results;
  }
  function pullOne(meta) {
    var rar = +U.weightedPick(CONFIG.GACHA.rarityWeight);
    var pool = [];
    for (var k in DATA.HEROES) {
      var nm = DATA.HEROES[k].name;
      if ((DATA.HERO_RARITY[nm] || 1) === rar) pool.push(nm);
    }
    var name = U.pick(pool);
    if (!name) { name = DATA.HEROES[U.pick(Object.keys(DATA.HEROES))].name; rar = DATA.HERO_RARITY[name] || 1; }
    var isNew = meta.heroes[name] === undefined;
    if (isNew) {
      meta.heroes[name] = 0;
      // 抽到新武将自动入组（有牌组空位时）
      if (!meta.deck) meta.deck = [];
      if (meta.deck.length < (meta.deckSlots || CONFIG.DECK.baseSlots)) meta.deck.push(name);
    } else {
      meta.keepsakes[name] = (meta.keepsakes[name] || 0) + 1;
    }
    return { name: name, rarity: rar, isNew: isNew };
  }

  /* ---- 牌组 ---- */
  function ensureDeck(meta) {
    if (!meta.deck) meta.deck = [];
    var owned = meta.heroes || {};
    var maxSlots = meta.deckSlots || CONFIG.DECK.baseSlots;
    meta.deck = meta.deck.filter(function (n) { return owned[n] !== undefined; });
    for (var n in owned) {
      if (meta.deck.length >= maxSlots) break;
      if (meta.deck.indexOf(n) < 0) meta.deck.push(n);
    }
    Game.Save.saveMeta(meta);
  }
  function toggleDeck(name) {
    var meta = state.meta;
    if (meta.heroes[name] === undefined) { Game.UI.toast('未拥有该武将'); return; }
    var maxSlots = meta.deckSlots || CONFIG.DECK.baseSlots;
    var idx = meta.deck.indexOf(name);
    if (idx >= 0) { meta.deck.splice(idx, 1); }
    else {
      if (meta.deck.length >= maxSlots) { Game.UI.toast('牌组已满，可用元宝扩容'); return; }
      meta.deck.push(name);
    }
    Game.Save.saveMeta(meta);
    Game.UI.toast(idx >= 0 ? name + ' 已撤下' : name + ' 已入组');
  }
  function unlockDeckSlot() {
    var meta = state.meta;
    if ((meta.deckSlots || CONFIG.DECK.baseSlots) >= CONFIG.DECK.maxSlots) { Game.UI.toast('牌组已达上限'); return; }
    if (meta.yuanbao < CONFIG.DECK.unlockCost) { Game.UI.toast('元宝不足'); return; }
    meta.yuanbao -= CONFIG.DECK.unlockCost;
    meta.deckSlots = (meta.deckSlots || CONFIG.DECK.baseSlots) + 1;
    ensureDeck(meta);
    Game.Audio.play('coin');
    Game.Save.saveMeta(meta);
  }
  function starUp(name) {
    var meta = state.meta;
    if (meta.heroes[name] === undefined) { Game.UI.toast('未拥有该武将'); return; }
    if (meta.heroes[name] >= CONFIG.STAR.max) { Game.UI.toast('已满星'); return; }
    if ((meta.keepsakes[name] || 0) < 1) { Game.UI.toast('信物不足，需抽到重复武将'); return; }
    meta.keepsakes[name]--;
    meta.heroes[name]++;
    Game.Save.saveMeta(meta);
    Game.UI.toast(name + ' 升至 ' + meta.heroes[name] + ' 星');
  }
  function trainUp(ch) {
    var meta = state.meta;
    var lv = meta.training[ch] || 0;
    if (lv >= CONFIG.TRAINING.maxLv) { Game.UI.toast('已满级'); return; }
    var cost = Math.round(CONFIG.TRAINING.costBase * Math.pow(CONFIG.TRAINING.costMul, lv));
    if (meta.coins < cost) { Game.UI.toast('金币不足'); return; }
    meta.coins -= cost;
    meta.training[ch] = lv + 1;
    dailyProgress(meta, 'train', 1);
    Game.Audio.play('coin');
    Game.Save.saveMeta(meta);
  }
  function canClaimDaily(key) {
    var meta = state.meta;
    resetDaily(meta);
    var q = null;
    for (var i = 0; i < CONFIG.DAILY.quests.length; i++) if (CONFIG.DAILY.quests[i].key === key) q = CONFIG.DAILY.quests[i];
    if (!q) return false;
    return (meta.daily.progress[key] || 0) >= q.target && !meta.daily.claimed[key];
  }
  function claimDaily(key) {
    var meta = state.meta;
    resetDaily(meta);
    if (!canClaimDaily(key)) { Game.UI.toast('未完成或已领取'); return; }
    var q = null;
    for (var i = 0; i < CONFIG.DAILY.quests.length; i++) if (CONFIG.DAILY.quests[i].key === key) q = CONFIG.DAILY.quests[i];
    meta.daily.claimed[key] = true;
    meta.yuanbao += q.reward[0];
    meta.coins += q.reward[1];
    Game.Save.saveMeta(meta);
    Game.UI.toast('领取成功！元宝 +' + q.reward[0]);
  }
  function achievementDone(key) {
    var meta = state.meta;
    switch (key) {
      case 'firstwin': return meta.totalWins >= 1;
      case 'hero10': { var n = 0; for (var k in meta.heroes) n++; return n >= 10; }
      case 'star1': { for (var k2 in meta.heroes) if (meta.heroes[k2] >= 1) return true; return false; }
      case 'endless20': return meta.endlessBest >= 20;
      case 'tier5': { for (var w in meta.weapons) if (meta.weapons[w].tier >= 5) return true; return false; }
    }
    return false;
  }
  function canClaimAch(key) {
    var meta = state.meta;
    return meta.achievements.claimed[key] === undefined && achievementDone(key);
  }
  function claimAchievement(key) {
    var meta = state.meta;
    if (!canClaimAch(key)) { Game.UI.toast('未达成或已领取'); return; }
    meta.achievements.claimed[key] = true;
    var a = null;
    for (var i = 0; i < CONFIG.ACHIEVEMENTS.length; i++) if (CONFIG.ACHIEVEMENTS[i].key === key) a = CONFIG.ACHIEVEMENTS[i];
    meta.yuanbao += a.reward[0];
    meta.coins += a.reward[1];
    Game.Save.saveMeta(meta);
    Game.UI.toast('成就达成！元宝 +' + a.reward[0]);
  }

  return {
    state: state,
    init: init,
    newRun: newRun,
    goHome: goHome,
    recruit: recruit,
    beginBenchDrag: beginBenchDrag,
    beginUnitDrag: beginUnitDrag,
    updateDrag: updateDrag,
    endDrag: endDrag,
    getDrag: getDrag,
    onBenchTap: onBenchTap,
    useActiveItem: useActiveItem,
    buyMerchantItem: buyMerchantItem,
    onBattleEnd: onBattleEnd,
    rollWeaponDrop: rollWeaponDrop,
    quitBattle: quitBattle,
    claimOffline: claimOffline,
    onStagePointer: onStagePointer,
    setAvatar: setAvatar,
    toggleSound: toggleSound,
    cheatSave: cheatSave,
    gachaPull: gachaPull,
    starUp: starUp,
    trainUp: trainUp,
    canClaimDaily: canClaimDaily,
    claimDaily: claimDaily,
    canClaimAch: canClaimAch,
    claimAchievement: claimAchievement,
    resetDaily: resetDaily,
    achievementDone: achievementDone,
    ensureDeck: ensureDeck,
    toggleDeck: toggleDeck,
    unlockDeckSlot: unlockDeckSlot
  };
})();
