/* data.js —— 数据表：路径地图 / 兵种 / 武将 / 敌人 / 武器 / 道具 / 军衔 */
window.DATA = {

  // ---- 兵种：刀枪弓骑，同字同级二合一升级（1~5级） ----
  SOLDIERS: {
    '刀': { name: '刀兵', dmg: 16, itv: 0.75, range: 1.35, hp: 120 },
    '枪': { name: '枪兵', dmg: 24, itv: 0.95, range: 1.8,  hp: 110 },
    '弓': { name: '弓兵', dmg: 13, itv: 0.55, range: 3.2,  hp: 80  },
    '骑': { name: '骑兵', dmg: 34, itv: 1.15, range: 1.5,  hp: 150 }
  },

  // ---- 武将：征兵抽金色单字碎片，拼齐姓名觉醒 ----
  HEROES: {
    zhaoyun:  { name: '赵云', recipe: ['赵', '云'], dmg: 90,  itv: 0.70, range: 3.2, skill: 'pierce',  desc: '龙胆·贯穿直线' },
    guanyu:   { name: '关羽', recipe: ['关', '羽'], dmg: 80,  itv: 0.90, range: 2.2, skill: 'sweep',   desc: '青龙·横扫前方' },
    zhangfei: { name: '张飞', recipe: ['张', '飞'], dmg: 70,  itv: 1.20, range: 2.0, skill: 'stun',    desc: '当阳·范围眩晕' },
    machao:   { name: '马超', recipe: ['马', '超'], dmg: 130, itv: 1.30, range: 2.4, skill: 'smash',   desc: '神威·重击单敌' },
    huangzhong: { name: '黄忠', recipe: ['黄', '忠'], dmg: 55, itv: 0.40, range: 4.5, skill: 'snipe',  desc: '百步·超远速射' },
    liubei:   { name: '刘备', recipe: ['刘', '备'], dmg: 30,  itv: 1.00, range: 2.5, skill: 'aura',    desc: '仁德·友军攻击+' },
    caocao:   { name: '曹操', recipe: ['曹', '操'], dmg: 60,  itv: 1.10, range: 3.5, skill: 'volley',  desc: '乱世·全屏斩击' },
    guanxing: { name: '关兴', recipe: ['关', '兴'], dmg: 55,  itv: 0.95, range: 2.0, skill: 'sweep',   desc: '父志·横扫' },
    zhangbao: { name: '张苞', recipe: ['张', '苞'], dmg: 50,  itv: 1.10, range: 1.8, skill: 'stun',    desc: '英魂·范围眩晕' },
    huanggai: { name: '黄盖', recipe: ['黄', '盖'], dmg: 45,  itv: 1.20, range: 1.6, skill: 'fortify', desc: '苦肉·己方增伤' }
  },

  // 碎片字权重
  FRAG_WEIGHTS: {
    '赵': 11, '云': 10, '关': 12, '羽': 10, '张': 12, '飞': 10,
    '马': 9, '超': 9, '黄': 13, '忠': 10, '刘': 8, '备': 8,
    '曹': 8, '操': 8, '兴': 7, '苞': 7, '盖': 7
  },

  // ---- 敌人（双方同时受波；沿各自路径冲向守将，漏怪扣心） ----
  ENEMIES: {
    zei:  { ch: '贼', hp: 60,   spd: 1.05, mantou: 2, size: 0.62 },
    fei:  { ch: '匪', hp: 150,  spd: 1.5,  mantou: 4, size: 0.60 },
    dao:  { ch: '盗', hp: 130,  spd: 0.9,  mantou: 3, size: 0.66 },
    kou:  { ch: '寇', hp: 280,  spd: 0.75, mantou: 5, size: 0.70 },
    boss: { ch: '将', hp: 1100, spd: 0.5,  mantou: 30, size: 0.95, boss: true }
  },

  // ---- 地图（参考版：8×10，玩家侧路径 + 建造格；敌方=180°镜像） ----
  // pPath: 从出怪口(上)到守将(下)的单条连续路径；pBuild: 初始建造格(≥8)
  MAPS: {
    julushou: {
      name: '巨鹿', theme: 'volcano',
      pPath: [
        [0, 9], [1, 9], [2, 9], [3, 9], [3, 8], [3, 7], [4, 7], [5, 7], [6, 7], [6, 8], [6, 9], [7, 9]
      ],
      pBuild: [
        [1, 8], [2, 8], [4, 8], [5, 8], [1, 6], [2, 6], [4, 6], [5, 6]
      ]
    },
    yunmengze: {
      name: '云梦泽', theme: 'sand',
      pPath: [
        [0, 9], [1, 9], [1, 8], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [6, 8], [6, 9], [7, 9]
      ],
      pBuild: [
        [0, 8], [2, 8], [4, 8], [5, 8], [7, 8], [0, 6], [2, 6], [4, 6], [5, 6], [7, 6]
      ]
    },
    hulaoguan: {
      name: '虎牢关', theme: 'cave',
      pPath: [
        [0, 9], [0, 8], [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [7, 8], [7, 9]
      ],
      pBuild: [
        [2, 9], [5, 9], [2, 8], [4, 8], [5, 8], [1, 6], [3, 6], [4, 6], [6, 6]
      ]
    },
    chibi: {
      name: '赤壁', theme: 'water',
      pPath: [
        [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [4, 8], [4, 7], [5, 7], [6, 7], [7, 7], [7, 8], [7, 9]
      ],
      pBuild: [
        [5, 9], [6, 9], [0, 8], [1, 8], [2, 8], [3, 8], [5, 8], [6, 8], [1, 6], [4, 6], [6, 6]
      ]
    },
    changbanpo: {
      name: '长坂坡', theme: 'petal',
      pPath: [
        [0, 9], [1, 9], [2, 9], [2, 8], [2, 7], [3, 7], [4, 7], [5, 7], [5, 8], [5, 9], [6, 9], [7, 9]
      ],
      pBuild: [
        [0, 8], [1, 8], [3, 8], [4, 8], [6, 8], [7, 8], [0, 6], [1, 6], [3, 6], [4, 6], [6, 6], [7, 6]
      ]
    }
  },
  MAP_ORDER: ['julushou', 'yunmengze', 'hulaoguan', 'chibi', 'changbanpo'],

  // ---- 每日 buff（适配新模型：兵种攻击/征兵/馒头/武技） ----
  DAILY_BUFFS: [
    { key: 'bowAtk', name: '今日·弓兵攻击 +20%', type: 'atkChar', ch: '弓', mul: 1.2 },
    { key: 'jianAtk', name: '今日·刀兵攻击 +20%', type: 'atkChar', ch: '刀', mul: 1.2 },
    { key: 'recruitDisc', name: '今日·征兵消耗 -15%', type: 'recruitCost', mul: 0.85 },
    { key: 'startBuns', name: '今日·开局馒头 +30', type: 'startBuns', val: 30 },
    { key: 'heroAtk', name: '今日·武将攻击 +15%', type: 'heroAtk', mul: 1.15 }
  ],

  // ---- 武器（保留原系统：每英雄按品阶配神兵） ----
  WEAPONS: {
    1: { name: '铁脊刃', dmg: 8,  quality: 1 },
    2: { name: '百炼锋', dmg: 18, quality: 2 },
    3: { name: '青虹宝器', dmg: 30, quality: 3 },
    4: { name: '寒光神兵', dmg: 50, quality: 4 },
    5: { name: '龙胆亮银枪', dmg: 80, quality: 5 }
  },
  WEAPON_TIER_NAME: { 1: '白', 2: '绿', 3: '蓝', 4: '紫', 5: '金' },
  WEAPON_TIER_COLOR: { 1: '#ececec', 2: '#3f9d4f', 3: '#2f6fd0', 4: '#7a4fb0', 5: '#d9a93b' },

  // ---- 道具（神秘商人） ----
  ITEMS: {
    shenbingfu:  { name: '神兵符', type: 'active', price: 120, emoji: '符', desc: '选中我方单位+1级并无敌3秒' },
    gongsufu:    { name: '攻速符', type: 'active', price: 100, emoji: '速', desc: '全体攻击速度+50%持续8秒' },
    maobi:       { name: '毛笔', type: 'active', price: 80, emoji: '笔', desc: '把备战席一个汉字改写为随机字' },
    zhaoxianling:{ name: '招贤令', type: 'active', price: 300, emoji: '令', desc: '直接招募一名武将入席' },
    nongmin:     { name: '农民', type: 'passive', price: 200, emoji: '农', desc: '永久 +3 馒头/波' },
    luoyangchan: { name: '洛阳铲', type: 'active', price: 150, emoji: '铲', desc: '解锁一块空地建造格' }
  },

  AVATARS: [
    { key: 'default', emoji: '子', rankNeed: 1, name: '白袍将' },
    { key: 'pioneer', emoji: '锋', rankNeed: 3, name: '先锋' },
    { key: 'shooting', emoji: '帅', rankNeed: 5, name: '三军主' },
    { key: 'guard', emoji: '王', rankNeed: 8, name: '一镇诸侯' },
    { key: 'tiger', emoji: '虎', rankNeed: 12, name: '五虎上将' },
    { key: 'wizard', emoji: '仙', rankNeed: 16, name: '卧龙出山' },
    { key: 'heaven', emoji: '帝', rankNeed: 20, name: '昭烈帝' }
  ],

  RANK_NAMES: ['白身', '什长', '百夫长', '军司马', '校尉', '中郎将', '偏将军', '裨将军', '安国将军', '镇国将军', '骠骑将军', '车骑将军', '大将军', '前将军', '左将军', '右将军', '后将军', '上柱国', '丞相', '大司马']
};
