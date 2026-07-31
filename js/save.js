/* save.js —— localStorage 存档：读写/迁移/离线时间戳 */
Game.Save = (function () {
  var KEYS = window.CONFIG.SAVE_KEYS;

  function canUseLS() {
    try {
      localStorage.setItem('__zyad_test__', '1');
      localStorage.removeItem('__zyad_test__');
      return true;
    } catch (e) { return false; }
  }
  var useLS = canUseLS();
  var memory = {};

  function readRaw(key) {
    if (useLS) {
      try {
        var s = localStorage.getItem(key);
        return s ? JSON.parse(s) : null;
      } catch (e) { return null; }
    }
    return memory[key] ? JSON.parse(memory[key]) : null;
  }
  function writeRaw(key, obj) {
    var s = JSON.stringify(obj);
    if (useLS) {
      try { localStorage.setItem(key, s); } catch (e) { /* 存储满等，忽略 */ }
    } else {
      memory[key] = s;
    }
  }

  /* ---------- 默认结构 ---------- */
  function defaultMeta() {
    return {
      version: CONFIG.VERSION,
      coins: 120,
      playerLevel: 1, xp: 0,
      rank: 1, stars: 0,
      currentAvatar: 'default',
      weapons: {},                 // 武将名 -> {tier, name}
      farmerLevel: 0,              // 农民被动：每级 +3 馒头/波
      yuanbao: 100,                // 元宝（抽卡货币）
      heroes: { '刘备': 0, '关羽': 0, '张飞': 0 },   // 拥有武将 -> 星数(0~6)
      keepsakes: {},               // 信物（重复抽到）: 武将名 -> 数量
      training: { '刀': 0, '枪': 0, '弓': 0, '骑': 0 }, // 兵种局外训练等级
      deck: ['刘备', '关羽', '张飞'], // 上阵牌组（牌库只出牌组里的字）
      deckSlots: 8,                // 牌组槽位（可用元宝扩容）
      dailyDate: '', dailyMapIndex: 0, dailyBuffKey: null,
      merchantDate: '', merchantItems: [],
      daily: { date: '', progress: {}, claimed: {} }, // 每日任务
      achievements: { claimed: {} }, // 成就
      offlineTS: Date.now(),
      sound: true,
      endlessBest: 0,
      arenaWins: 0, arenaLosses: 0,
      totalWins: 0,
      helpSeen: false
    };
  }
  function defaultSlot(mode) {
    return {
      version: CONFIG.VERSION,
      mode: mode,
      progress: { stage: 1, maxStage: 1, endlessBestWave: 0, arenaWins: 0, arenaLosses: 0, arenaRating: 1000 },
      // 战局实时数据不持久化；结束时写入统计
      lastResult: null
    };
  }

  function normalizeMeta(raw) {
    var m = defaultMeta();
    if (raw && typeof raw === 'object') {
      for (var k in m) if (raw[k] !== undefined) m[k] = raw[k];
    }
    return m;
  }
  function normalizeSlot(raw, mode) {
    var s = defaultSlot(mode);
    if (raw && typeof raw === 'object') {
      for (var k in s) if (raw[k] !== undefined) s[k] = raw[k];
      if (!s.progress) s.progress = defaultSlot(mode).progress;
      else for (var p in defaultSlot(mode).progress) if (s.progress[p] === undefined) s.progress[p] = defaultSlot(mode).progress[p];
    }
    return s;
  }

  return {
    useLS: useLS,
    loadMeta: function () { return normalizeMeta(readRaw(KEYS.meta)); },
    saveMeta: function (meta) { writeRaw(KEYS.meta, meta); },
    loadSlot: function (mode) { return normalizeSlot(readRaw(KEYS[mode]), mode); },
    saveSlot: function (mode, slot) { writeRaw(KEYS[mode], slot); },
    touchOffline: function (meta) { meta.offlineTS = Date.now(); writeRaw(KEYS.meta, meta); },
    clearAll: function () {
      for (var k in KEYS) {
        if (useLS) { try { localStorage.removeItem(KEYS[k]); } catch (e) {} }
        delete memory[KEYS[k]];
      }
    }
  };
})();
