/* ui.js —— 屏幕路由 / DOM 构建 / HUD 同步 / 弹窗 */
Game.UI = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;
  var el = {};
  var lastBanner = '';
  var hudTimer = 0;

  /* ================= 初始化 ================= */
  function init() {
    el.home = document.getElementById('screen-home');
    el.battle = document.getElementById('screen-battle');
    el.battleTop = document.getElementById('battle-top');
    el.battleBottom = document.getElementById('battle-bottom');
    el.battleStage = document.getElementById('battle-stage');
    el.canvas = document.getElementById('battle-canvas');
    el.modalRoot = document.getElementById('modal-root');
    U.bindPointer(el.canvas, { onDown: function (p) { onStageDown(p); } });
  }

  function onStageDown(p) {
    Game.Audio.unlock();
    Game.State.onStagePointer(p.x, p.y);
  }

  /* ================= 屏幕路由 ================= */
  function route(screen) {
    var st = Game.State.state;
    st.screen = screen;
    if (screen === 'home') {
      el.battle.classList.add('hidden');
      buildHome();
      el.home.classList.remove('hidden');
    } else {
      el.home.classList.add('hidden');
      el.battle.classList.remove('hidden');
      buildBattle();
    }
    closeModal();
  }

  /* ================= 主页 ================= */
  function currentAvatar(meta) {
    var cur = DATA.AVATARS[0];
    DATA.AVATARS.forEach(function (a) { if (a.key === meta.currentAvatar) cur = a; });
    return cur;
  }
  function buildHome() {
    var st = Game.State.state, meta = st.meta;
    var mapKeys = Object.keys(DATA.MAPS);
    var mapName = DATA.MAPS[mapKeys[meta.dailyMapIndex]].name;
    var buff = null;
    for (var i = 0; i < DATA.DAILY_BUFFS.length; i++) if (DATA.DAILY_BUFFS[i].key === meta.dailyBuffKey) buff = DATA.DAILY_BUFFS[i];
    var rankName = DATA.RANK_NAMES[meta.rank - 1] || '大司马';
    el.home.innerHTML =
      '<div class="home-title">' +
        '<div class="seal">赵云与阿斗</div>' +
        '<div class="sub">长坂坡 · 文字塔防</div>' +
      '</div>' +
      '<div class="home-meta">' +
        '<span class="meta-chip">金币 <b>' + meta.coins + '</b></span>' +
        '<span class="meta-chip">军衔 <b>' + rankName + '</b></span>' +
        '<span class="meta-chip">等级 <b>' + meta.playerLevel + '</b></span>' +
        '<span class="meta-chip">今日地图 <b>' + mapName + '</b></span>' +
        '<span class="meta-chip">今日 <b>' + (buff ? buff.name.replace('今日·', '') : '无buff') + '</b></span>' +
      '</div>' +
      (st.offlineGain > 0 ? '<div class="offline-banner" id="offline-claim">离线挂机收获 · 金币 +' + st.offlineGain + '　点击领取</div>' : '') +
      '<div class="home-mode">' +
        modeCard('campaign', '线', '主线', '长坂坡逐关推进，守护阿斗', '第 ' + st.slots.campaign.progress.stage + ' 关') +
        modeCard('endless', '∞', '无尽', '敌潮层层加码，挑战最远纪录', '最佳 ' + (st.slots.endless.progress.endlessBestWave || 0) + ' 波') +
        modeCard('arena', '战', '竞技', '1v1 对阵 AI，先破敌营者胜', (st.slots.arena.progress.arenaWins || 0) + '胜/' + (st.slots.arena.progress.arenaLosses || 0) + '负') +
      '</div>' +
      '<div class="home-buttons">' +
        '<button class="ink-btn secondary" data-act="shop">神秘商人</button>' +
        '<button class="ink-btn secondary" data-act="rank">军衔</button>' +
        '<button class="ink-btn secondary" data-act="bag">背包</button>' +
        '<button class="ink-btn secondary" data-act="help">帮助</button>' +
        '<button class="ink-btn secondary" data-act="sound">' + (meta.sound ? '音效:开' : '音效:关') + '</button>' +
      '</div>';
    var cards = el.home.querySelectorAll('.mode-card');
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener('click', function () { Game.State.newRun(this.dataset.mode); });
    }
    var acts = el.home.querySelectorAll('[data-act]');
    for (var a = 0; a < acts.length; a++) {
      acts[a].addEventListener('click', function () {
        var act = this.dataset.act;
        if (act === 'shop') openShop();
        else if (act === 'rank') openRank();
        else if (act === 'bag') openBag();
        else if (act === 'help') openHelp();
        else if (act === 'sound') Game.State.toggleSound();
      });
    }
    var off = document.getElementById('offline-claim');
    if (off) off.addEventListener('click', function () { Game.State.claimOffline(); });
  }
  function modeCard(mode, seal, name, desc, info) {
    return '<div class="mode-card" data-mode="' + mode + '">' +
      '<div class="mode-seal">' + seal + '</div>' +
      '<div><div class="mode-name">' + name + '</div><div class="mode-desc">' + desc + '</div></div>' +
      '<div class="mode-info">' + info + '</div></div>';
  }

  /* ================= 战局 ================= */
  function buildBattle() {
    var st = Game.State.state, b = st.battle;
    var stageHint = document.getElementById('stage-hint');
    if (!stageHint) {
      var h = document.createElement('div');
      h.id = 'stage-hint';
      h.className = 'stage-hint hidden';
      el.battleStage.appendChild(h);
    }
    el.battleTop.innerHTML =
      '<div class="bt-row">' +
        '<button class="bt-tool" id="bt-home">↩</button>' +
        '<div class="bt-adou enemy"><span class="lbl">敌营</span><div class="bar"><div class="fill" id="adou-enemy"></div></div><span class="num" id="adou-enemy-num">100</span></div>' +
        '<div class="bt-wave" id="bt-wave">第1波</div>' +
        '<div class="bt-adou player"><span class="lbl">我方</span><div class="bar"><div class="fill" id="adou-player"></div></div><span class="num" id="adou-player-num">100</span></div>' +
        '<button class="bt-tool" id="bt-pause">⏸</button>' +
        '<button class="bt-tool" id="bt-speed">x1</button>' +
      '</div>' +
      '<div class="bt-res">' +
        '<div class="res-item">馒头 <b id="res-buns">60</b></div>' +
        '<div class="res-item">金币 <b id="res-coins">120</b></div>' +
        '<div class="res-item">征兵 <b id="res-cost">8</b></div>' +
        '<div class="spacer"></div>' +
        '<div class="hint" id="res-hint"></div>' +
      '</div>';
    el.battleBottom.innerHTML =
      '<div class="bb-row">' +
        '<div class="bench-wrap" id="bench"></div>' +
        '<div class="bb-col">' +
          '<button class="bb-btn" id="btn-recruit">征 兵<span class="cost" id="btn-cost">8</span></button>' +
          '<button class="bb-mini" id="bt-shop">商人</button>' +
        '</div>' +
      '</div>' +
      '<div class="bb-row2">' +
        '<div id="hero-combine"></div>' +
        '<div id="active-items"></div>' +
      '</div>';

    document.getElementById('bt-home').addEventListener('click', function () { askQuit(); });
    document.getElementById('bt-pause').addEventListener('click', togglePause);
    document.getElementById('bt-speed').addEventListener('click', toggleSpeed);
    document.getElementById('btn-recruit').addEventListener('click', function () { Game.Audio.unlock(); Game.State.recruit(); });
    document.getElementById('bt-shop').addEventListener('click', function () { openShop(); });
    document.getElementById('bench').addEventListener('click', function (e) {
      var slot = e.target.closest('.bench-slot');
      if (slot) Game.State.onBenchTap(parseInt(slot.dataset.idx, 10));
    });
    syncBattle(b);
  }

  function togglePause() {
    var b = Game.State.state.battle;
    if (!b) return;
    applyPause(!b.paused);
  }
  function applyPause(flag) {
    var b = Game.State.state.battle;
    if (!b) return;
    b.paused = flag;
    var btn = document.getElementById('bt-pause');
    if (btn) btn.textContent = b.paused ? '▶' : '⏸';
    showPauseOverlay(b.paused);
  }
  function showPauseOverlay(show) {
    var old = document.getElementById('pause-overlay');
    if (old) old.remove();
    if (!show) return;
    var d = document.createElement('div');
    d.id = 'pause-overlay';
    d.className = 'battle-overlay';
    d.innerHTML = '<button class="ink-btn gold" style="font-size:20px">继续作战</button>';
    d.querySelector('button').addEventListener('click', togglePause);
    el.battleStage.appendChild(d);
  }
  function toggleSpeed() {
    var b = Game.State.state.battle;
    if (!b) return;
    b.speed = (b.speed === 1 ? 2 : 1);
    var btn = document.getElementById('bt-speed');
    if (btn) btn.textContent = 'x' + b.speed;
  }

  /* ---------- 战局 DOM 同步（动作后完整刷新） ---------- */
  function syncBattle(b) {
    if (!b) return;
    var st = Game.State.state;
    // 兵营
    var bench = document.getElementById('bench');
    if (bench) {
      var html = '';
      for (var i = 0; i < b.bench.length; i++) html += benchSlotHTML(b, i, b.bench[i]);
      bench.innerHTML = html;
    }
    // 武将合成
    var hc = document.getElementById('hero-combine');
    if (hc) {
      var heroes = Game.State.availableHeroes(b);
      if (heroes.length) {
        var hhtml = '<span class="hc-label">可合成:</span>';
        for (var h = 0; h < heroes.length; h++) {
          var key = heroes[h];
          hhtml += '<button class="hc-btn" data-hk="' + key + '">' + DATA.HEROES[key].name + '</button>';
        }
        hc.innerHTML = hhtml;
        var btns = hc.querySelectorAll('.hc-btn');
        for (var bb = 0; bb < btns.length; bb++) {
          btns[bb].addEventListener('click', function () { Game.State.combineHero(this.dataset.hk); });
        }
      } else hc.innerHTML = '';
    }
    // 主动道具
    var aiWrap = document.getElementById('active-items');
    if (aiWrap) {
      var ahtml = '';
      for (var a = 0; a < b.activeItems.length; a++) {
        var it = b.activeItems[a];
        if (it) {
          ahtml += '<button class="active-item" data-slot="' + a + '">' + DATA.ITEMS[it.id].name + '<span class="uses">×' + it.uses + '</span></button>';
        } else {
          ahtml += '<button class="active-item" style="opacity:.35" data-slot="' + a + '">空位</button>';
        }
      }
      aiWrap.innerHTML = ahtml;
      var abtns = aiWrap.querySelectorAll('.active-item');
      for (var ab = 0; ab < abtns.length; ab++) {
        abtns[ab].addEventListener('click', function () { Game.State.useActiveItem(parseInt(this.dataset.slot, 10)); });
      }
    }
    updateHud();
  }

  function benchSlotHTML(b, idx, t) {
    var cls = 'bench-slot';
    if (b.selBench === idx) cls += ' selected';
    var mergeable = false;
    if (t && t.type === 'soldier') {
      for (var i = 0; i < b.bench.length; i++) {
        var t2 = b.bench[i];
        if (i !== idx && t2 && t2.type === 'soldier' && t2.kind === t.kind && t2.level === t.level && t.level < CONFIG.MAX_LEVEL) { mergeable = true; break; }
      }
    } else if (t && t.type === 'char') {
      for (var j = 0; j < b.bench.length; j++) {
        var t3 = b.bench[j];
        if (j !== idx && t3 && t3.type === 'char' && t3.ch === t.ch) { mergeable = true; break; }
      }
    }
    if (mergeable) cls += ' mergeable';
    var inner = '', rarity = 0;
    if (!t) inner = '<span style="opacity:.22">空</span>';
    else if (t.type === 'soldier') { rarity = t.rarity; inner = DATA.UNITS[t.kind].ch; }
    else if (t.type === 'char') { inner = t.ch; }
    else if (t.type === 'hero') { rarity = DATA.HEROES[t.heroKey].rarity; inner = DATA.HEROES[t.heroKey].name; }
    else if (t.type === 'shovel') { inner = '铲'; }
    var out = '<div class="' + cls + '" data-idx="' + idx + '">' + inner;
    if (t && t.type === 'soldier') out += '<span class="slot-lv">' + t.level + '</span><span class="slot-kind">' + DATA.UNITS[t.kind].name + '</span>';
    if (t && t.type === 'shovel') out += '<span class="slot-kind">铲·解锁</span>';
    if (rarity) out += '<span class="slot-rarity" style="background:' + CONFIG.RARITY_COLOR[rarity] + '"></span>';
    out += '</div>';
    return out;
  }

  /* ---------- HUD 轻量同步（主循环低频调用） ---------- */
  function updateHud() {
    var st = Game.State.state, b = st.battle;
    if (!b) return;
    function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
    set('res-buns', b.buns);
    set('res-coins', st.meta.coins);
    var cost = CONFIG.RECRUIT_COST(b.recruitCount);
    if (b.dailyBuff && b.dailyBuff.type === 'recruitCost') cost = Math.max(1, Math.round(cost * b.dailyBuff.mul));
    set('res-cost', cost);
    set('btn-cost', cost);
    var p = b.adou.player, e = b.adou.enemy;
    var pe = document.getElementById('adou-player'), ee = document.getElementById('adou-enemy');
    if (pe) pe.style.width = (100 * p.hp / p.maxHp) + '%';
    if (ee) ee.style.width = (100 * e.hp / e.maxHp) + '%';
    set('adou-player-num', p.hp);
    set('adou-enemy-num', e.hp);
    var btn = document.getElementById('btn-recruit');
    if (btn) btn.disabled = b.buns < cost || b.bench.indexOf(null) < 0;

    // 波次/提示
    var wtext = '';
    if (b.mode === 'arena') wtext = '竞技 · 破敌阿斗';
    else if (b.mode === 'endless') wtext = '无尽 · 第 ' + b.endlessWave + ' 波';
    else wtext = '第 ' + (b.waveIdx + 1) + '/' + (b.waveList ? b.waveList.length : '?') + ' 波';
    set('bt-wave', wtext);

    var hint = '';
    if (b.uiSel && b.uiSel.mode === 'unit') hint = '点击要强化的我方单位';
    else if (b.uiSel && b.uiSel.mode === 'benchChar') hint = '点击兵营中要改写的汉字';
    else if (b.selBench >= 0) hint = '点击战场空位放置';
    else if (b.mode === 'arena') hint = '守住我方阿斗，击破敌营';
    else if (b.phase === 'intermission') hint = '下一波 ' + Math.max(0, b.intermission).toFixed(1) + 's';
    else hint = '抵御进攻…';
    set('res-hint', hint);

    // 波次横幅
    if (b.bannerText && b.bannerText !== lastBanner) {
      lastBanner = b.bannerText;
      var bd = document.createElement('div');
      bd.className = 'wave-banner';
      bd.textContent = b.bannerText;
      el.battleStage.appendChild(bd);
      setTimeout(function () { bd.remove(); }, 2200);
    }
  }

  function syncAll() {
    var st = Game.State.state;
    if (st.screen === 'home') buildHome();
    if (st.battle) updateHud();
  }

  /* ================= 弹窗 ================= */
  function openModal(html) {
    el.modalRoot.innerHTML = '<div class="modal-mask"><div class="modal-card">' + html + '</div></div>';
    var mask = el.modalRoot.querySelector('.modal-mask');
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
    return el.modalRoot.querySelector('.modal-card');
  }
  function closeModal() { el.modalRoot.innerHTML = ''; }

  function openShop() {
    var st = Game.State.state, meta = st.meta;
    var items = meta.merchantItems || [];
    var card = openModal(
      '<div class="modal-title">神秘商人</div>' +
      '<div style="text-align:right;margin-bottom:10px;font-size:15px">金币 <b style="color:#c9a227">' + meta.coins + '</b></div>' +
      '<div class="shop-row" id="shop-row"></div>' +
      '<p style="font-size:12px;color:#8a7d66;margin-top:6px">今日售罄，明日再来。主动道具开战带入（最多2格）。</p>'
    );
    var row = card.querySelector('#shop-row');
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var def = DATA.ITEMS[items[i]];
      var canBuy = meta.coins >= def.price;
      html += '<div class="shop-item" data-id="' + items[i] + '">' +
        '<div class="item-emoji">' + def.emoji + '</div>' +
        '<div class="item-name">' + def.name + '</div>' +
        '<div class="item-desc">' + def.desc + '</div>' +
        '<div class="item-price">' + def.price + ' 金币</div>' +
        '<button class="ink-btn' + (canBuy ? '' : '') + '" style="padding:6px 8px;font-size:14px">购买</button>' +
      '</div>';
    }
    row.innerHTML = html;
    var btns = row.querySelectorAll('.shop-item');
    for (var b = 0; b < btns.length; b++) {
      btns[b].querySelector('button').addEventListener('click', function () {
        Game.State.buyMerchantItem(this.parentNode.dataset.id);
      });
    }
  }
  function refreshShop() {
    // 若商店开着，重建金币显示
    if (el.modalRoot.children.length) {
      var title = el.modalRoot.querySelector('.modal-title');
      if (title && title.textContent === '神秘商人') openShop();
    }
  }

  function openRank() {
    var meta = Game.State.state.meta;
    var rankName = DATA.RANK_NAMES[meta.rank - 1] || '大司马';
    var need = CONFIG.RANK_NEED(meta.rank);
    var prev = meta.rank > 1 ? CONFIG.RANK_NEED(meta.rank - 1) : 0;
    var pct = Math.min(100, Math.round(100 * (meta.stars - prev) / Math.max(1, need - prev)));
    var card = openModal(
      '<div class="modal-title">军衔</div>' +
      '<div style="text-align:center;font-size:22px;margin-bottom:4px;color:#a83b2d;letter-spacing:3px">' + rankName + '</div>' +
      '<div class="rank-progress">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>星级 ' + meta.stars + '</span><span>升级需 ' + Math.max(0, need - meta.stars) + '</span></div>' +
        '<div class="rank-bar"><div class="rank-fill" style="width:' + pct + '%"></div></div>' +
      '</div>' +
      '<div class="rank-list" id="rank-list"></div>' +
      '<div class="panel-label">头像</div>' +
      '<div class="avatar-grid" id="avatar-grid"></div>'
    );
    var rl = card.querySelector('#rank-list');
    var rhtml = '';
    for (var r = 1; r <= CONFIG.MAX_RANK; r++) {
      var achieved = meta.stars >= CONFIG.RANK_NEED(r);
      rhtml += '<div class="rank-cell' + (achieved ? ' achieved' : '') + (r === meta.rank ? ' current' : '') + '">' +
        '<div style="font-size:12px">' + (DATA.RANK_NAMES[r - 1] || '') + '</div>' +
        '<div style="font-size:11px;color:#8a7d66">' + CONFIG.RANK_NEED(r) + '★</div></div>';
    }
    rl.innerHTML = rhtml;
    var ag = card.querySelector('#avatar-grid');
    var ahtml = '';
    for (var a = 0; a < DATA.AVATARS.length; a++) {
      var av = DATA.AVATARS[a];
      var unlocked = meta.rank >= av.rankNeed;
      ahtml += '<div class="avatar-cell' + (meta.currentAvatar === av.key ? ' active' : '') + (unlocked ? '' : ' locked') + '" data-av="' + av.key + '" title="' + av.name + '">' +
        av.emoji + '</div>';
    }
    ag.innerHTML = ahtml;
    var avs = ag.querySelectorAll('.avatar-cell');
    for (var avi = 0; avi < avs.length; avi++) {
      avs[avi].addEventListener('click', function () { Game.State.setAvatar(this.dataset.av); });
    }
  }

  function openBag() {
    var meta = Game.State.state.meta;
    var card = openModal('<div class="modal-title">背包 · 神兵</div><div id="weapon-list"></div>');
    var list = card.querySelector('#weapon-list');
    var html = '';
    var keys = Object.keys(DATA.HEROES);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var h = DATA.HEROES[k];
      var w = meta.weapons[k];
      html += '<div class="weapon-cell">' +
        '<div class="hero-seal">' + h.name + '</div>' +
        '<div class="w-info">' +
          '<div class="w-name">' + h.name + '</div>' +
          '<div class="w-tag">' + h.skillName + ' · ' + h.skillDesc + '</div>' +
        '</div>' +
        '<div class="w-info" style="text-align:right;flex:none">' +
          (w ? '<div class="w-name" style="color:' + CONFIG.RARITY_COLOR[w.tier] + '">' + w.name + '</div><div class="w-tag">' + CONFIG.RARITY_NAME[w.tier] + '品</div>'
             : '<div class="w-tag">未持有神兵</div>') +
        '</div></div>';
    }
    list.innerHTML = html;
  }

  function openHelp() {
    openModal(
      '<div class="modal-title">玩法说明</div>' +
      '<div class="help-box">' +
        '<h4>目标</h4><p>守住下方我方阿斗，挡住敌军冲击；主线守完3波即胜，竞技则要打爆敌方阿斗。</p>' +
        '<h4>征兵</h4><p>花馒头抽卡，得刀/枪/弓/骑士兵、汉字、铲子。征兵费随次数上涨。</p>' +
        '<h4>合成</h4><p>兵营中两个相同兵种同等级自动升阶（白→绿→蓝→紫→金），9级封顶。</p>' +
        '<h4>武将</h4><p>集齐汉字（如 赵+云）即可合成武将。武将更强并自动放技能：赵云贯穿、关羽横扫、张飞怒吼、黄忠全屏、刘备回血……</p>' +
        '<h4>布阵</h4><p>点兵营槽位，再点战场亮起的高亮格放置。近战放前、弓兵放后。铲子/洛阳铲可向上解锁更多行。</p>' +
        '<h4>装备与道具</h4><p>胜利掉落神兵自动配给武将；商人处用金币买道具：神兵符（升级+无敌）、攻速符、毛笔（改字）、招贤令、农民（+馒头/波）。</p>' +
        '<h4>每日</h4><p>地图与buff每日轮换；离线时自动积累金币。</p>' +
      '</div>'
    );
  }

  function askQuit() {
    var b = Game.State.state.battle;
    if (!b) return;
    if (b.mode === 'endless') {
      Game.State.quitBattle();
      return;
    }
    var card = openModal('<div class="modal-title">撤退？</div><p style="text-align:center;margin-bottom:14px;font-size:14px;color:#4a443d">现在撤退将放弃本局奖励。</p>' +
      '<div class="result-actions"><button class="ink-btn" id="q-no">继续作战</button><button class="ink-btn cinnabar" id="q-yes">撤退</button></div>');
    card.querySelector('#q-no').addEventListener('click', closeModal);
    card.querySelector('#q-yes').addEventListener('click', function () { closeModal(); Game.State.quitBattle(); });
  }

  /* ---------- 结算 ---------- */
  function showResult(b) {
    var r = b.result;
    var win = r.win;
    var title, titleCls;
    if (r.quit) { title = '收兵'; titleCls = 'lose'; }
    else { title = win ? '大获全胜' : '阵前败退'; titleCls = win ? 'win' : 'lose'; }
    var stars = '';
    for (var i = 0; i < 3; i++) stars += (i < r.stars ? '★' : '☆');
    var wdrop = '';
    if (r.weaponDrop) {
      var wd = DATA.WEAPONS[r.weaponDrop.tier];
      wdrop = '<div class="r-row"><span>掉落神兵</span><b style="color:' + CONFIG.RARITY_COLOR[r.weaponDrop.tier] + '">' + wd.name + ' · 给' + DATA.HEROES[r.weaponDrop.heroKey].name + '</b></div>';
    }
    openModal(
      '<div class="result-title ' + titleCls + '">' + title + '</div>' +
      '<div class="result-stars">' + stars + '</div>' +
      '<div class="result-rows">' +
        '<div class="r-row"><span>金币</span><b>+' + r.coins + '</b></div>' +
        '<div class="r-row"><span>经验</span><b>+' + r.xp + '</b></div>' +
        '<div class="r-row"><span>战果</span><b>' + (b.mode === 'endless' ? '第 ' + r.wave + ' 波' : '存活阿斗 ' + Math.round(b.adou.player.hp) + '/100') + '</b></div>' +
        wdrop +
      '</div>' +
      '<div class="result-actions">' +
        '<button class="ink-btn" id="res-again">再来一局</button>' +
        '<button class="ink-btn secondary" id="res-home">返回主页</button>' +
      '</div>'
    );
    var card = el.modalRoot.querySelector('.modal-card');
    card.querySelector('#res-again').addEventListener('click', function () {
      closeModal();
      var mode = b.mode;
      Game.State.state.battle = null;
      Game.State.newRun(mode);
    });
    card.querySelector('#res-home').addEventListener('click', function () { closeModal(); Game.State.goHome(); });
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    var elt = document.createElement('div');
    elt.textContent = msg;
    elt.style.cssText = 'position:fixed;left:50%;bottom:24%;transform:translateX(-50%);background:rgba(26,26,26,.92);color:#f5f0e1;padding:10px 18px;border-radius:20px;font-size:15px;z-index:99;letter-spacing:1px;pointer-events:none;animation:popIn .2s;max-width:80vw;text-align:center';
    document.body.appendChild(elt);
    setTimeout(function () { elt.style.opacity = '0'; elt.style.transition = 'opacity .4s'; }, 1400);
    setTimeout(function () { elt.remove(); }, 1900);
  }

  return {
    init: init,
    route: route,
    applyPause: applyPause,
    syncBattle: syncBattle,
    updateHud: updateHud,
    syncAll: syncAll,
    showResult: showResult,
    openShop: openShop,
    refreshShop: refreshShop,
    closeModal: closeModal,
    toast: toast
  };
})();
