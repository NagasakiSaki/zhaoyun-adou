/* data.js —— 数据表：路径地图 / 兵种 / 武将 / 敌人 / 武器 / 道具 / 军衔 */
window.DATA = {

  // ---- 兵种：刀枪弓骑，同字同级二合一升级（1~5级） ----
  SOLDIERS: {
    '刀': { name: '刀兵', dmg: 16, itv: 0.75, range: 1.35, hp: 120 },
    '枪': { name: '枪兵', dmg: 24, itv: 0.95, range: 1.8,  hp: 110 },
    '弓': { name: '弓兵', dmg: 13, itv: 0.55, range: 3.2,  hp: 80  },
    '骑': { name: '骑兵', dmg: 34, itv: 1.15, range: 1.5,  hp: 150 }
  },

  // ---- 武将：征兵抽金色单字碎片，拖到相邻格拼姓名觉醒（首字左、尾字右） ----
  // skill: 专属技能机制；skillName/skillDesc 展示；passive: [类型, 数值] 专属被动
  HEROES: {
    zhaoyun:  { name: '赵云', recipe: ['赵', '云'], dmg: 95,  itv: 0.70, range: 3.2, skill: 'pierce', skillName: '龙胆贯穿', skillDesc: '沿直线贯穿3敌', passive: ['spd', 0.15] },
    guanyu:   { name: '关羽', recipe: ['关', '羽'], dmg: 85,  itv: 0.90, range: 2.2, skill: 'sweep', skillName: '青龙偃月', skillDesc: '横扫前方扇面', passive: ['crit', 0.20] },
    zhangfei: { name: '张飞', recipe: ['张', '飞'], dmg: 75,  itv: 1.20, range: 2.0, skill: 'stun', skillName: '当阳怒吼', skillDesc: '范围怒吼眩晕', passive: ['atk', 0.15] },
    machao:   { name: '马超', recipe: ['马', '超'], dmg: 135, itv: 1.30, range: 2.4, skill: 'smash', skillName: '神威天降', skillDesc: '重击单敌2倍', passive: ['spd', 0.20] },
    huangzhong: { name: '黄忠', recipe: ['黄', '忠'], dmg: 55, itv: 0.40, range: 4.5, skill: 'snipe', skillName: '百步穿杨', skillDesc: '超远距离速射', passive: ['range', 0.15] },
    lübu:     { name: '吕布', recipe: ['吕', '布'], dmg: 150, itv: 1.40, range: 2.0, skill: 'smash', skillVal: 2.5, skillName: '无双乱舞', skillDesc: '重击单敌2.5倍', passive: ['atk', 0.20] },
    caocao:   { name: '曹操', recipe: ['曹', '操'], dmg: 65,  itv: 1.10, range: 3.5, skill: 'volley', skillName: '乱世枭雄', skillDesc: '全屏斩击', passive: ['income', 0.30] },
    liubei:   { name: '刘备', recipe: ['刘', '备'], dmg: 30,  itv: 1.00, range: 2.5, skill: 'aura', skillName: '仁德之辉', skillDesc: '友军攻击+20%', passive: ['waveheal', 1] },
    zhangliao:{ name: '张辽', recipe: ['张', '辽'], dmg: 70,  itv: 0.95, range: 2.2, skill: 'sweep', skillName: '威震逍遥', skillDesc: '横扫前方扇面', passive: ['spd', 0.10] },
    xuchu:    { name: '许褚', recipe: ['许', '褚'], dmg: 95,  itv: 1.20, range: 1.8, skill: 'smash', skillName: '虎痴蛮力', skillDesc: '重击单敌1.8倍', passive: ['atk', 0.10] },
    dianwei:  { name: '典韦', recipe: ['典', '韦'], dmg: 80,  itv: 1.10, range: 1.8, skill: 'fortify', skillName: '恶来守护', skillDesc: '重击+友军增伤', passive: ['spd', 0.10] },
    zhouyu:   { name: '周瑜', recipe: ['周', '瑜'], dmg: 60,  itv: 1.20, range: 3.2, skill: 'burn', skillName: '火烧赤壁', skillDesc: '全屏灼烧持续伤害', passive: ['spd', 0.10] },
    sunce:    { name: '孙策', recipe: ['孙', '策'], dmg: 90,  itv: 1.20, range: 2.0, skill: 'smash', skillName: '小霸王', skillDesc: '重击单敌1.8倍', passive: ['range', 0.10] },
    sunquan:  { name: '孙权', recipe: ['孙', '权'], dmg: 28,  itv: 1.00, range: 2.5, skill: 'aura', skillName: '坐断东南', skillDesc: '友军攻击+12%', passive: ['income', 0.20] },
    luxun:    { name: '陆逊', recipe: ['陆', '逊'], dmg: 55,  itv: 1.10, range: 3.0, skill: 'slow', skillName: '火烧连营', skillDesc: '范围减速', passive: ['spd', 0.10] },
    lvmeng:   { name: '吕蒙', recipe: ['吕', '蒙'], dmg: 60,  itv: 1.30, range: 1.9, skill: 'stun', skillName: '白衣渡江', skillDesc: '范围眩晕', passive: ['crit', 0.10] },
    ganning:  { name: '甘宁', recipe: ['甘', '宁'], dmg: 70,  itv: 0.90, range: 2.6, skill: 'chain', skillName: '锦帆弹射', skillDesc: '弹射2个敌人', passive: ['spd', 0.15] },
    jiangwei: { name: '姜维', recipe: ['姜', '维'], dmg: 65,  itv: 0.95, range: 2.8, skill: 'pierce', skillName: '麒麟刺', skillDesc: '沿直线贯穿3敌', passive: ['range', 0.10] },
    dengai:   { name: '邓艾', recipe: ['邓', '艾'], dmg: 50,  itv: 0.50, range: 4.2, skill: 'snipe', skillName: '偷渡阴平', skillDesc: '超远速射', passive: ['spd', 0.10] },
    guojia:   { name: '郭嘉', recipe: ['郭', '嘉'], dmg: 50,  itv: 1.10, range: 3.2, skill: 'freeze', skillName: '遗计定军', skillDesc: '范围冰冻定身', passive: ['crit', 0.15] },
    pangtong: { name: '庞统', recipe: ['庞', '统'], dmg: 55,  itv: 1.20, range: 3.0, skill: 'mark', skillName: '连环计', skillDesc: '标记易伤+40%', passive: ['spd', 0.10] },
    huanggai: { name: '黄盖', recipe: ['黄', '盖'], dmg: 45,  itv: 1.20, range: 1.6, skill: 'fortify', skillName: '苦肉诈降', skillDesc: '重击+友军增伤', passive: ['atk', 0.10] },
    weiyan:   { name: '魏延', recipe: ['魏', '延'], dmg: 75,  itv: 1.20, range: 2.0, skill: 'smash', skillName: '子午奇袭', skillDesc: '重击单敌1.8倍', passive: ['crit', 0.15] },
    zhangjiao:{ name: '张角', recipe: ['张', '角'], dmg: 55,  itv: 1.30, range: 2.0, skill: 'stun', skillName: '天公将军', skillDesc: '范围眩晕', passive: ['spd', 0.10] },
    dongzhuo: { name: '董卓', recipe: ['董', '卓'], dmg: 80,  itv: 1.30, range: 1.8, skill: 'smash', skillName: '暴虐无道', skillDesc: '重击单敌2倍', passive: ['atk', 0.15] },
    yuanshao: { name: '袁绍', recipe: ['袁', '绍'], dmg: 50,  itv: 1.20, range: 3.0, skill: 'volley', skillName: '四世三公', skillDesc: '全屏斩击', passive: ['income', 0.15] },
    huatuo:   { name: '华佗', recipe: ['华', '佗'], dmg: 25,  itv: 1.10, range: 2.5, skill: 'aura', skillName: '青囊济世', skillDesc: '友军攻击+10%', passive: ['spdAll', 0.05] },
    zhenji:   { name: '甄姬', recipe: ['甄', '姬'], dmg: 45,  itv: 1.00, range: 3.0, skill: 'slow', skillName: '洛神赋', skillDesc: '范围减速', passive: ['crit', 0.10] },
    diaochan: { name: '貂蝉', recipe: ['貂', '蝉'], dmg: 40,  itv: 1.00, range: 2.8, skill: 'multishot', skillName: '闭月连弩', skillDesc: '一次连射3发', passive: ['spd', 0.10] }
  },

  // 根据首字+尾字查武将（自由组合判定）
  heroByRecipe: function (first, last) {
    for (var k in DATA.HEROES) {
      var h = DATA.HEROES[k];
      if (h.recipe[0] === first && h.recipe[1] === last) return h;
    }
    return null;
  },

  // 武将稀有度（1绿 2蓝 3紫 4金，用于抽卡权重/展示）
  HERO_RARITY: {
    '赵云': 4, '关羽': 4, '张飞': 4, '马超': 4, '黄忠': 4, '吕布': 4, '曹操': 4, '刘备': 4,
    '张辽': 3, '许褚': 3, '典韦': 3, '周瑜': 3, '孙策': 3, '孙权': 3, '陆逊': 3, '吕蒙': 3,
    '甘宁': 3, '姜维': 3, '邓艾': 3, '郭嘉': 3, '庞统': 3, '魏延': 3,
    '黄盖': 2, '张角': 2, '董卓': 2, '袁绍': 2, '华佗': 2, '甄姬': 2, '貂蝉': 2
  },
  RARITY_NAME: { 1: '绿', 2: '蓝', 3: '紫', 4: '金' },
  PASSIVE_NAME: { atk: '攻击+', spd: '攻速+', range: '射程+', crit: '暴击+', income: '馒头收入+', waveheal: '每波阿斗回心+', spdAll: '全队攻速+' },
  RARITY_COLOR: { 1: '#3f9d4f', 2: '#2f6fd0', 3: '#7a4fb0', 4: '#d9a93b' },

  // 武将星级特性（C2/C4/C6 解锁，展示用）
  TRAITS: {
    pierce: { c2: '贯穿伤害+10%', c4: '射程+15%', c6: '贯穿再+20%伤害' },
    sweep: { c2: '横扫伤害+10%', c4: '射程+15%', c6: '横扫再+20%伤害' },
    stun: { c2: '眩晕伤害+10%', c4: '射程+15%', c6: '眩晕再+20%伤害' },
    smash: { c2: '重击伤害+10%', c4: '射程+15%', c6: '重击再+20%伤害' },
    snipe: { c2: '速射伤害+10%', c4: '射程+15%', c6: '速射再+20%伤害' },
    aura: { c2: '光环效果+10%', c4: '射程+15%', c6: '光环再+20%' },
    volley: { c2: '全屏伤害+10%', c4: '射程+15%', c6: '全屏再+20%伤害' },
    slow: { c2: '减速伤害+10%', c4: '射程+15%', c6: '减速再+20%伤害' },
    fortify: { c2: '重击伤害+10%', c4: '射程+15%', c6: '重击再+20%伤害' },
    burn: { c2: '灼烧伤害+10%', c4: '射程+15%', c6: '灼烧再+20%伤害' },
    chain: { c2: '弹射伤害+10%', c4: '射程+15%', c6: '弹射+1个目标' },
    freeze: { c2: '冰冻伤害+10%', c4: '射程+15%', c6: '冰冻再+20%伤害' },
    mark: { c2: '标记易伤+10%', c4: '射程+15%', c6: '易伤再+20%' },
    multishot: { c2: '连射伤害+10%', c4: '射程+15%', c6: '连射+1发' }
  },

  // 碎片字权重
  FRAG_WEIGHTS: {
    '赵': 10, '云': 9, '关': 12, '羽': 9, '张': 12, '飞': 9, '马': 8, '超': 8,
    '黄': 13, '忠': 9, '吕': 7, '布': 6, '曹': 8, '操': 8, '刘': 8, '备': 8,
    '辽': 7, '许': 6, '褚': 5, '典': 5, '韦': 5, '周': 7, '瑜': 7, '孙': 7,
    '策': 6, '权': 6, '陆': 5, '逊': 5, '蒙': 6, '甘': 5, '宁': 5, '姜': 5,
    '维': 5, '邓': 4, '艾': 4, '郭': 5, '嘉': 5, '庞': 4, '统': 4, '盖': 7,
    '魏': 5, '延': 5, '角': 5, '董': 5, '卓': 4, '袁': 5, '绍': 4, '华': 4,
    '佗': 4, '甄': 4, '姬': 4, '貂': 4, '蝉': 3
  },

  // ---- 敌人（双方同时受波；沿各自路径冲向守将，漏怪扣心） ----
  ENEMIES: {
    zei:  { ch: '贼', hp: 60,   spd: 1.05, mantou: 2, size: 0.62 },
    fei:  { ch: '匪', hp: 150,  spd: 1.5,  mantou: 4, size: 0.60 },
    dao:  { ch: '盗', hp: 130,  spd: 0.9,  mantou: 3, size: 0.66 },
    kou:  { ch: '寇', hp: 280,  spd: 0.75, mantou: 5, size: 0.70 },
    boss: { ch: '将', hp: 1100, spd: 0.5,  mantou: 30, size: 0.95, boss: true }
  },

  // ---- 地图（9×14，玩家侧路径；敌方=180°镜像；建造格由路径程序生成） ----
  // pPath: 玩家半场内从出怪口(底左)到守将(底右)的单条不重访连续路径
  MAPS: {
    julushou: {
      name: '巨鹿', theme: 'volcano',
      pPath: [
        [0, 13], [1, 13], [2, 13], [3, 13], [4, 13], [4, 12], [4, 11], [4, 10],
        [3, 10], [2, 10], [1, 10], [1, 9], [1, 8], [2, 8], [3, 8], [4, 8],
        [5, 8], [5, 9], [5, 10], [5, 11], [6, 11], [7, 11], [8, 11], [8, 12], [8, 13]
      ]
    },
    yunmengze: {
      name: '云梦泽', theme: 'sand',
      pPath: [
        [0, 13], [1, 13], [2, 13], [2, 12], [2, 11], [3, 11], [4, 11], [5, 11],
        [5, 10], [5, 9], [4, 9], [3, 9], [2, 9], [2, 8], [2, 7], [3, 7],
        [4, 7], [5, 7], [6, 7], [6, 8], [6, 9], [7, 9], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13]
      ]
    },
    hulaoguan: {
      name: '虎牢关', theme: 'cave',
      pPath: [
        [0, 13], [0, 12], [0, 11], [0, 10], [0, 9], [0, 8], [1, 8], [2, 8],
        [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13]
      ]
    },
    chibi: {
      name: '赤壁', theme: 'water',
      pPath: [
        [0, 13], [0, 12], [1, 12], [2, 12], [2, 11], [2, 10], [3, 10], [4, 10],
        [4, 9], [4, 8], [5, 8], [6, 8], [6, 9], [6, 10], [7, 10], [8, 10],
        [8, 11], [8, 12], [7, 12], [6, 12], [5, 12], [5, 13], [6, 13], [7, 13], [8, 13]
      ]
    },
    changbanpo: {
      name: '长坂坡', theme: 'petal',
      pPath: [
        [0, 13], [1, 13], [2, 13], [2, 12], [2, 11], [2, 10], [3, 10], [4, 10],
        [5, 10], [5, 9], [5, 8], [6, 8], [7, 8], [7, 9], [7, 10], [8, 10],
        [8, 11], [8, 12], [8, 13]
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
