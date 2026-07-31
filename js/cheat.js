/* cheat.js —— 金手指：单机自定义（资源/抽卡/装备/挂机/难度） */
Game.Cheat = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;

  function settings(meta) {
    return Object.assign({}, CONFIG.CHEAT_DEFAULT, meta.cheat || {});
  }
  function save(meta, cfg) {
    meta.cheat = cfg;
    Game.Save.saveMeta(meta);
  }

  // 应用对战局：红心/馒头/倍率
  function applyBattle(b, meta) {
    var cfg = settings(meta);
    if (cfg.hearts) {
      b.P.hearts = Math.min(cfg.hearts, 20);
      b.E.hearts = Math.min(cfg.hearts, 20);
    }
    if (cfg.startMantou != null) {
      b.P.mantou = cfg.startMantou;
      b.E.mantou = cfg.startMantou;
    }
    b._dmgMul = cfg.dmgMul || 1;
    b._enemyHpMul = cfg.enemyHpMul || 1;
    b._waveBonusMul = cfg.waveBonusMul || 1;
    b._recruitFree = !!cfg.recruitFree;
    b._recruitSoldier = cfg.recruitSoldier || null;
    b._recruitFrag = cfg.recruitFrag || null;
    b._recruitShovel = cfg.recruitShovel || null;
    b._soldierLv = cfg.soldierLv || null;
  }

  // 快进：直接给资源
  function addCoins(meta, n) { meta.coins = Math.max(0, meta.coins + n); Game.Save.saveMeta(meta); }
  function maxWeapons(meta) {
    var names = {};
    for (var k in DATA.HEROES) names[DATA.HEROES[k].name] = true;
    for (var n in names) meta.weapons[n] = { tier: 5, name: DATA.WEAPONS[5].name };
    Game.Save.saveMeta(meta);
  }
  function levelUp(meta) {
    meta.playerLevel = CONFIG.MAX_PLAYER_LEVEL;
    meta.stars = CONFIG.RANK_NEED(CONFIG.MAX_RANK);
    meta.rank = CONFIG.MAX_RANK;
    meta.coins += 5000;
    Game.Save.saveMeta(meta);
  }

  return {
    settings: settings,
    save: save,
    applyBattle: applyBattle,
    addCoins: addCoins,
    maxWeapons: maxWeapons,
    levelUp: levelUp,
    offlineMul: function (meta) { return settings(meta).offlineMul || 1; }
  };
})();
