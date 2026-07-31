/* config.js —— 全部数值常量与曲线 */
window.CONFIG = {
  VERSION: 1,
  BENCH_SIZE: 5,
  MAX_LEVEL: 9,
  MAX_BOARD_UNITS: 60,
  MAX_PROJECTILES: 120,
  STEP: 1 / 60,
  MAX_DT: 0.05,
  FIXED_STEPS_MAX: 6,

  ADOU_HP: 100,
  ADOU_REGEN_PER_WAVE: 12,
  BUNS_START: 100,
  BUNS_PER_WAVE: 16,
  WAVE_INTERMISSION: 4,
  FARMER_BONUS: 6,

  LEVEL_GROWTH: { hp: 1.45, atk: 1.45 },
  RARITY: { white: 1, green: 2, blue: 3, purple: 4, gold: 5 },
  RARITY_MUL: { 1: 1.0, 2: 1.35, 3: 1.8, 4: 2.5, 5: 3.6 },
  // 等级 -> 稀有度
  LEVEL_RARITY: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5 },
  RARITY_NAME: { 1: '白', 2: '绿', 3: '蓝', 4: '紫', 5: '金' },
  RARITY_COLOR: { 1: '#ececec', 2: '#3f9d4f', 3: '#2f6fd0', 4: '#7a4fb0', 5: '#d9a93b' },

  // 征兵费用曲线（平缓：前期便宜，后期上涨）
  RECRUIT_COST: function (n) { return Math.min(999, Math.round(5 * Math.pow(1.10, n))); },
  RECRUIT_DROP: { soldier: 0.70, char: 0.24, shovel: 0.06 },
  SOLDIER_DROP: { jian: 0.28, qiang: 0.26, gong: 0.26, qi: 0.20 },

  HERO_KILLS_FOR_LEVEL: function (lv) { return lv * (lv + 1) * 4; },
  HERO_LEVEL_GROWTH: 0.12,

  // 军衔：每级所需累计星级
  RANK_NEED: function (rank) { return 10 * rank * (rank + 1) / 2; },
  MAX_RANK: 20,
  XP_NEED: function (level) { return 100 * level; },
  MAX_PLAYER_LEVEL: 30,

  OFFLINE: { coinsPerMin: 0.5, minMinutes: 2, capMin: 480 },

  SPEEDS: [1, 2],
  PROJECTILE_SPEED: 7,

  // 无尽模式成长
  ENDLESS: {
    countBase: 3,
    countPer: 0.5,
    hpPerWave: 0.18,
    atkPerWave: 0.10,
    hpCapMul: 12,
    intervalBase: 12,
    intervalDecay: 0.15,
    intervalMin: 3,
    bossEvery: 10
  },

  // 竞技：玩家被动收入 & AI 强度
  ARENA: {
    adouHp: 250,
    playerStartBuns: 140,
    playerPassiveIncome: 3.0,
    aiBunsStart: 24,
    aiPassiveIncome: 0.5,
    aiPassiveIncomePerMin: 0.3,
    aiRecruitCdStart: 9,
    aiRecruitCdMin: 5,
    aiRecruitCdDecayPerMin: 0.25,
    aiUnlockEvery: 26,
    aiUnitStatMul: 0.85,
    aiStarterCount: 2
  },

  DAILY_BUFF_WEIGHTS: [30, 30, 20, 20, 18],

  SAVE_KEYS: {
    meta: 'zyad_meta_v1',
    campaign: 'zyad_campaign_v1',
    endless: 'zyad_endless_v1',
    arena: 'zyad_arena_v1'
  }
};
