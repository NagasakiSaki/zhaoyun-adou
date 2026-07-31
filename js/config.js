/* config.js —— 数值常量（对齐参考版：路径塔防 + 红心 + 整手征兵） */
window.CONFIG = {
  VERSION: 1,

  // 地图（参考版 8 列 × 10 行，上敌下半玩家，中央山脊分隔）
  COLS: 8,
  ROWS: 10,

  BENCH_SIZE: 5,
  MAX_LV: 5,
  lvMul: function (lv) { return Math.pow(2.1, lv - 1); },
  // 武将等级（拖同字碎片上武将军升级）
  GEN_MAX_LV: 5,
  GEN_LV_DMG_MUL: function (lv) { return Math.pow(1.5, lv - 1); },
  GEN_LV_ITV_MUL: function (lv) { return Math.pow(0.85, lv - 1); },

  // 金手指默认设置（可被 meta.cheat 覆盖）
  CHEAT_DEFAULT: {
    enabled: false,
    startMantou: null,     // 覆盖开局馒头
    recruitFree: false,    // 征兵免费
    recruitSoldier: null,  // 抽卡权重覆盖
    recruitFrag: null,
    recruitShovel: null,
    soldierLv: null,       // 新抽士兵等级
    dmgMul: 1,             // 己方伤害倍率
    enemyHpMul: 1,         // 敌方血量倍率
    hearts: null,          // 阿斗红心
    offlineMul: 1,         // 挂机速度倍率
    waveBonusMul: 1        // 波次馒头倍率
  },

  // 阿斗红心：漏过一个敌人扣一颗，先掉光的一方落败
  HEARTS: 5,

  STEP: 1 / 60,
  MAX_DT: 0.05,
  FIXED_STEPS_MAX: 6,
  SPEEDS: [1, 2],
  MAX_BULLETS: 200,

  // ---- 兵种（刀枪弓骑，同字同级二合一升级） ----
  SOLDIER_CHARS: ['刀', '枪', '弓', '骑'],

  // ---- 征兵（原版机制：替换整个备战席为 5 张随机卡牌） ----
  RECRUIT_POOL: { soldier: 70, frag: 26, shovel: 4 },
  ECON: {
    startMantou: 30,
    recruitBase: 8,
    recruitInc: 2,
    waveBonus: function (w) { return 8 + w * 2; },
    hearts: 5
  },

  // 每关波数（主线）
  WAVES_PER_STAGE: 5,
  MAX_WAVE: 10,           // 撑过即胜（若对手先失守则提前胜利）
  INTERMISSION: 3.5,

  // ---- 敌人成长 ----
  hpMul: function (wave) {
    return 1 + (wave - 1) * 0.3 + Math.pow(Math.max(0, wave - 6), 1.5) * 0.12;
  },

  // ---- 波次构成（每 5 波出 BOSS） ----
  buildWave: function (w) {
    var q = [];
    function add(type, n) { for (var i = 0; i < n; i++) q.push(type); }
    add('zei', 4 + Math.min(w * 2, 16));
    if (w >= 3) add('fei', Math.floor(w * 0.6));
    if (w >= 4) add('dao', Math.floor(w * 0.7));
    if (w >= 7) add('kou', Math.floor((w - 5) * 0.7));
    for (var i = q.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = q[i]; q[i] = q[j]; q[j] = t;
    }
    if (w % 5 === 0) q.push('boss');
    return q;
  },

  // ---- 竞技 AI 难度（简版：固定一档，偏弱，玩家友好） ----
  ARENA: {
    thinkItv: 1.5,
    missRate: 0.18,
    luck: 0.2,
    unlockChance: 0.3
  },

  // ---- 道具 / 武器 / 军衔（保留原系统） ----
  FARMER_BONUS: 3,
  ADOU_REGEN: 1,           // 每清一波阿斗回 1 心（至上限）
  OFFLINE: { coinsPerMin: 0.5, minMinutes: 2, capMin: 480 },
  XP_NEED: function (level) { return 100 * level; },
  MAX_PLAYER_LEVEL: 30,
  RANK_NEED: function (rank) { return 10 * rank * (rank + 1) / 2; },
  MAX_RANK: 20,
  DAILY_BUFF_WEIGHTS: [30, 30, 20, 20, 18],
  SAVE_KEYS: {
    meta: 'zyad_meta_v1',
    campaign: 'zyad_campaign_v1',
    endless: 'zyad_endless_v1',
    arena: 'zyad_arena_v1'
  }
};
