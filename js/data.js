/* data.js —— 全部静态数据表 */
window.DATA = {
  UNITS: {
    jian: { name: '刀兵', ch: '刀', hp: 120, atk: 15, atkRange: 1.0, atkSpeed: 1.0, moveSpeed: 1.0, note: '均衡近战', knockback: 0.25 },
    qiang: { name: '枪兵', ch: '枪', hp: 90, atk: 18, atkRange: 1.5, atkSpeed: 0.8, moveSpeed: 0.9, note: '穿刺', pierce: 2 },
    gong: { name: '弓兵', ch: '弓', hp: 60, atk: 12, atkRange: 4.0, atkSpeed: 1.2, moveSpeed: 0.9, note: '远程', ranged: true },
    qi: { name: '骑兵', ch: '骑', hp: 150, atk: 20, atkRange: 1.0, atkSpeed: 0.7, moveSpeed: 1.6, note: '高速突进' }
  },

  HEROES: {
    zhaoyun:  { name: '赵云', ch: '云', recipe: ['赵', '云'], weapon: 'qiang', rarity: 5, hp: 260, atk: 34, atkRange: 1.5, atkSpeed: 0.9, skill: 'lance',  skillCd: 6,  skillName: '龙胆突刺', skillDesc: '沿路贯穿4敌·300%攻击' },
    guanyu:   { name: '关羽', ch: '羽', recipe: ['关', '羽'], weapon: 'jian',  rarity: 5, hp: 280, atk: 40, atkRange: 1.0, atkSpeed: 0.9, skill: 'sweep',  skillCd: 5,  skillName: '青龙偃月', skillDesc: '横扫前方2行·200%攻击+击退' },
    zhangfei: { name: '张飞', ch: '飞', recipe: ['张', '飞'], weapon: 'qiang', rarity: 5, hp: 300, atk: 38, atkRange: 1.5, atkSpeed: 0.8, skill: 'roar',   skillCd: 10, skillName: '当阳怒吼', skillDesc: '范围怒吼·250%攻击+眩晕' },
    machao:   { name: '马超', ch: '超', recipe: ['马', '超'], weapon: 'qi',    rarity: 5, hp: 260, atk: 36, atkRange: 1.0, atkSpeed: 0.8, moveSpeed: 1.8, skill: 'charge', skillCd: 9,  skillName: '铁骑冲锋', skillDesc: '冲锋3行·400%攻击' },
    huangzhong: { name: '黄忠', ch: '忠', recipe: ['黄', '忠'], weapon: 'gong', rarity: 5, hp: 180, atk: 40, atkRange: 5.0, atkSpeed: 1.1, skill: 'volley', skillCd: 14, skillName: '百步穿杨', skillDesc: '全屏射击·150%攻击' },
    liubei:   { name: '刘备', ch: '备', recipe: ['刘', '备'], weapon: 'jian',  rarity: 5, hp: 240, atk: 26, atkRange: 1.0, atkSpeed: 0.9, skill: 'heal',   skillCd: 8,  skillName: '仁德之辉', skillDesc: '全队回血25%+阿斗回血15%' },
    caocao:   { name: '曹操', ch: '操', recipe: ['曹', '操'], weapon: 'jian',  rarity: 5, hp: 320, atk: 42, atkRange: 1.0, atkSpeed: 0.8, skill: 'cleave', skillCd: 16, skillName: '乱世枭雄', skillDesc: '全屏斩·180%攻击' },
    guanxing: { name: '关兴', ch: '兴', recipe: ['关', '兴'], weapon: 'jian',  rarity: 4, hp: 170, atk: 24, atkRange: 1.0, atkSpeed: 1.0, skill: 'sweep',  skillCd: 6,  skillName: '父志横扫', skillDesc: '横扫前方2行·180%攻击' },
    zhangbao: { name: '张苞', ch: '苞', recipe: ['张', '苞'], weapon: 'qiang', rarity: 4, hp: 160, atk: 22, atkRange: 1.5, atkSpeed: 1.0, skill: 'roar',   skillCd: 11, skillName: '英魂怒吼', skillDesc: '范围怒吼·200%攻击+眩晕' },
    huangzu:  { name: '黄祖', ch: '祖', recipe: ['黄', '祖'], weapon: 'gong',  rarity: 4, hp: 130, atk: 26, atkRange: 5.0, atkSpeed: 1.1, skill: 'bounce', skillCd: 8,  skillName: '连珠箭', skillDesc: '弹射2敌·160%攻击' },
    huanggai: { name: '黄盖', ch: '盖', recipe: ['黄', '盖'], weapon: 'jian',  rarity: 4, hp: 190, atk: 26, atkRange: 1.0, atkSpeed: 0.9, skill: 'shield', skillCd: 10, skillName: '苦肉铁壁', skillDesc: '自身+护盾与攻击提升' }
  },

  CHARS: {
    weights: {
      '赵': 11, '云': 10, '关': 13, '羽': 10, '张': 13, '飞': 10,
      '马': 9, '超': 9, '黄': 14, '忠': 10, '刘': 8, '备': 8,
      '曹': 8, '操': 8, '兴': 7, '苞': 7, '祖': 7, '盖': 7
    }
  },

  ENEMIES: {
    jian:  { name: '刀兵', ch: '刀', hp: 80, atk: 11, atkRange: 1.0, atkSpeed: 1.0, moveSpeed: 0.9, bounty: 3 },
    qiang: { name: '枪兵', ch: '枪', hp: 65, atk: 13, atkRange: 1.5, atkSpeed: 0.8, moveSpeed: 0.9, bounty: 3, pierce: 2 },
    gong:  { name: '弓兵', ch: '弓', hp: 50, atk: 10, atkRange: 4.0, atkSpeed: 1.1, moveSpeed: 0.8, bounty: 3, ranged: true },
    qi:    { name: '骑兵', ch: '骑', hp: 100, atk: 15, atkRange: 1.0, atkSpeed: 0.7, moveSpeed: 1.4, bounty: 4 },
    boss_huangjin: { name: '黄巾力士', ch: '将', hp: 900, atk: 32, atkRange: 1.0, atkSpeed: 0.8, moveSpeed: 0.7, bounty: 30, isBoss: true }
  },

  WEAPONS: {
    1: { name: '铁脊刃', atkBonus: 0.10, spdBonus: 0, crit: 0, lifesteal: 0, skillCdBonus: 0 },
    2: { name: '百炼锋', atkBonus: 0.20, spdBonus: 0.05, crit: 0, lifesteal: 0, skillCdBonus: 0 },
    3: { name: '青虹宝器', atkBonus: 0.35, spdBonus: 0, crit: 0.10, lifesteal: 0, skillCdBonus: 0 },
    4: { name: '寒光神兵', atkBonus: 0.55, spdBonus: 0, crit: 0.05, lifesteal: 0.05, skillCdBonus: 0.05 },
    5: { name: '龙胆亮银枪', atkBonus: 0.80, spdBonus: 0.05, crit: 0.10, lifesteal: 0.08, skillCdBonus: 0.15 }
  },

  ITEMS: {
    shenbingfu:  { name: '神兵符', type: 'active', price: 120, emoji: '符', desc: '选中我方单位+1级并无敌3秒' },
    gongsufu:    { name: '攻速符', type: 'active', price: 100, emoji: '速', desc: '全体攻速+50%持续8秒' },
    maobi:       { name: '毛笔', type: 'active', price: 80, emoji: '笔', desc: '把兵营一个汉字改写为随机字' },
    zhaoxianling:{ name: '招贤令', type: 'active', price: 300, emoji: '令', desc: '直接招募一名武将入营' },
    nongmin:     { name: '农民', type: 'passive', price: 200, emoji: '农', desc: '永久 +6 馒头/波' },
    luoyangchan: { name: '洛阳铲', type: 'active', price: 150, emoji: '铲', desc: '向上解锁一行格位' }
  },

  DAILY_BUFFS: [
    { key: 'bowAtk', name: '今日·弓兵攻击 +20%', type: 'atkKind', kind: 'gong', mul: 1.2 },
    { key: 'jianHp', name: '今日·刀兵生命 +20%', type: 'hpKind', kind: 'jian', mul: 1.2 },
    { key: 'recruitDisc', name: '今日·征兵消耗 -15%', type: 'recruitCost', mul: 0.85 },
    { key: 'startBuns', name: '今日·开局馒头 +30', type: 'startBuns', val: 30 },
    { key: 'heroSkill', name: '今日·武将技能CD -20%', type: 'skillCd', mul: 0.8 }
  ],

  MAPS: {
    julushou:  { name: '巨鹿', rows: 6, cols: 5, blocked: [] },
    yunmengze: { name: '云梦泽', rows: 7, cols: 6, blocked: [[3, 0], [3, 5]] },
    hulaoguan: { name: '虎牢关', rows: 6, cols: 6, blocked: [[2, 0], [2, 5], [3, 0], [3, 5]] },
    chibi:     { name: '赤壁', rows: 8, cols: 7, blocked: [[3, 0], [3, 6], [4, 0], [4, 6]] }
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

// 主线波次：按关卡程序化生成，每关 3 波，第 3 波带 BOSS
DATA.buildCampaignWaves = function (stage) {
  var waves = [];
  var w1 = [{ k: 'jian', n: 1 + Math.ceil(stage / 2) }, { k: 'gong', n: 1 + Math.floor(stage / 2) }];
  var w2 = [{ k: 'qi', n: 1 + Math.ceil(stage / 2) }, { k: 'qiang', n: 1 + Math.floor(stage / 2) }];
  var w3 = [{ k: 'boss_huangjin', n: 1 }, { k: 'gong', n: 1 + Math.ceil(stage / 2) }, { k: 'jian', n: 1 + Math.floor(stage / 2) }];
  var spread = 12 + stage * 2;
  waves.push({ groups: w1, spread: spread });
  waves.push({ groups: w2, spread: spread });
  waves.push({ groups: w3, spread: spread + 3 });
  return waves;
};

// 无尽模式单波：程序化生成
DATA.buildEndlessWave = function (w) {
  var n = Math.min(40, Math.round(CONFIG.ENDLESS.countBase + w * CONFIG.ENDLESS.countPer));
  var pool = ['jian', 'gong', 'qiang'];
  if (w >= 4) pool.push('qi');
  var groups = [];
  var poolCount = {};
  for (var i = 0; i < n; i++) {
    var k = pool[Math.floor(Math.random() * pool.length)];
    poolCount[k] = (poolCount[k] || 0) + 1;
  }
  for (var key in poolCount) {
    groups.push({ k: key, n: poolCount[key] });
  }
  if (w % CONFIG.ENDLESS.bossEvery === 0 && w > 0) {
    groups.push({ k: 'boss_huangjin', n: 1 + Math.floor(w / CONFIG.ENDLESS.bossEvery) });
  }
  var interval = Math.max(CONFIG.ENDLESS.intervalMin, CONFIG.ENDLESS.intervalBase - w * CONFIG.ENDLESS.intervalDecay);
  return { groups: groups, spread: interval };
};
