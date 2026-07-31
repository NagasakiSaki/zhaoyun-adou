/* ui.js —— 屏幕路由 / 拖拽 / HUD / 弹窗 */
Game.UI = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA, U = window.Game.Utils;
  var el = {};
  var pointer = null;   // {source, benchIdx?, startX, startY, dragging}
  var ghost = null;

  function init() {
    el.home = document.getElementById('screen-home');
    el.battle = document.getElementById('screen-battle');
    el.battleTop = document.getElementById('battle-top');
    el.battleBottom = document.getElementById('battle-bottom');
    el.battleStage = document.getElementById('battle-stage');
    el.canvas = document.getElementById('battle-canvas');
    el.modalRoot = document.getElementById('modal-root');
    bindCanvasDrag();
  }

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

  /* ================= 拖拽 ================= */
  function dropTargetAt(cx, cy) {
    var slots = document.querySelectorAll('#bench .bench-slot');
    for (var i = 0; i < slots.length; i++) {
      var r = slots[i].getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return { type: 'bench', idx: i };
    }
    var cr = el.canvas.getBoundingClientRect();
    if (cx >= cr.left && cx <= cr.right && cy >= cr.top && cy <= cr.bottom) {
      var L = Game.Render.getLayout();
      if (!L.cellW) return { type: 'none' };
      var c = Math.floor((cx - cr.left) / L.cellW), rr = Math.floor((cy - cr.top) / L.cellH);
      if (c >= 0 && c < CONFIG.COLS && rr >= 0 && rr < CONFIG.ROWS) return { type: 'cell', c: c, r: rr };
    }
    return { type: 'none' };
  }
  function showGhost() {
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.id = 'drag-ghost';
      ghost.style.cssText = 'position:fixed;z-index:80;pointer-events:none;display:flex;align-items:center;justify-content:center;background:#fbe9b8;border:2px solid #b8860b;border-radius:8px;font-size:20px;font-family:KaiTi,serif;color:#7a2a1a;box-shadow:0 4px 12px rgba(0,0,0,.35)';
      document.body.appendChild(ghost);
    }
    ghost.style.display = 'flex';
  }
  function updateGhost() {
    var d = Game.State.getDrag();
    if (!d || !ghost) return;
    var label = d.unit.kind === 's' ? d.unit.ch : (d.unit.kind === 'g' ? d.unit.name : (d.unit.kind === 'f' ? d.unit.ch : '铲'));
    ghost.textContent = label;
    ghost.style.left = ((d.x || 0) - 22) + 'px';
    ghost.style.top = ((d.y || 0) - 30) + 'px';
    ghost.style.width = '44px';
    ghost.style.height = '52px';
  }
  function hideGhost() { if (ghost) ghost.style.display = 'none'; }

  function bindBenchDrag() {
    var bench = document.getElementById('bench');
    if (!bench) return;
    bench.addEventListener('pointerdown', function (e) {
      var slot = e.target.closest('.bench-slot');
      if (!slot) return;
      var idx = parseInt(slot.dataset.idx, 10);
      pointer = { source: 'bench', benchIdx: idx, startX: e.clientX, startY: e.clientY, dragging: false };
      try { slot.setPointerCapture(e.pointerId); } catch (err) {}
    });
    bench.addEventListener('pointermove', function (e) {
      if (!pointer || pointer.source !== 'bench') return;
      var dx = e.clientX - pointer.startX, dy = e.clientY - pointer.startY;
      if (!pointer.dragging && dx * dx + dy * dy > 64) {
        if (Game.State.beginBenchDrag(pointer.benchIdx)) { pointer.dragging = true; showGhost(); }
      }
      if (pointer.dragging) { Game.State.updateDrag(e.clientX, e.clientY); updateGhost(); }
    });
    bench.addEventListener('pointerup', function (e) {
      if (!pointer || pointer.source !== 'bench') return;
      var p = pointer; pointer = null;
      if (p.dragging) { hideGhost(); Game.State.endDrag(dropTargetAt(e.clientX, e.clientY)); }
      else Game.State.onBenchTap(p.benchIdx);
    });
  }

  function bindCanvasDrag() {
    U.bindPointer(el.canvas, {
      onDown: function (p, e) {
        pointer = { source: 'canvas', startX: e.clientX, startY: e.clientY, startPxX: p.x, startPxY: p.y, dragging: false };
      },
      onMove: function (p, e) {
        if (!pointer || pointer.source !== 'canvas') return;
        var dx = e.clientX - pointer.startX, dy = e.clientY - pointer.startY;
        if (!pointer.dragging && dx * dx + dy * dy > 64) {
          var L = Game.Render.getLayout();
          if (L.cellW) {
            var c = Math.floor(pointer.startPxX / L.cellW), r = Math.floor(pointer.startPxY / L.cellH);
            if (Game.State.beginUnitDrag(c, r)) { pointer.dragging = true; showGhost(); }
          }
        }
        if (pointer.dragging) { Game.State.updateDrag(e.clientX, e.clientY); updateGhost(); }
      },
      onUp: function (p, e) {
        if (!pointer || pointer.source !== 'canvas') return;
        var pt = pointer; pointer = null;
        if (pt.dragging) { hideGhost(); Game.State.endDrag(dropTargetAt(e.clientX, e.clientY)); }
        else { Game.Audio.unlock(); Game.State.onStagePointer(pt.startPxX, pt.startPxY); }
      }
    });
  }

  /* ================= 主页 ================= */
  function currentAvatar(meta) {
    var cur = DATA.AVATARS[0];
    DATA.AVATARS.forEach(function (a) { if (a.key === meta.currentAvatar) cur = a; });
    return cur;
  }
  function buildHome() {
    var st = Game.State.state, meta = st.meta;
    var mapName = DATA.MAPS[DATA.MAP_ORDER[meta.dailyMapIndex]].name;
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
        modeCard('campaign', '线', '主线', '逐关守住阿斗，清完一波又一波', '第 ' + st.slots.campaign.progress.stage + ' 关') +
        modeCard('endless', '∞', '无尽', '敌潮层层加码，守住阿斗红心', '最佳 ' + (st.slots.endless.progress.endlessBestWave || 0) + ' 波') +
        modeCard('arena', '战', '竞技', '与 AI 同受波次，先失守者败', (st.slots.arena.progress.arenaWins || 0) + '胜/' + (st.slots.arena.progress.arenaLosses || 0) + '负') +
      '</div>' +
      '<div class="home-meta"><span class="meta-chip">元宝 <b style="color:#c9a227">' + meta.yuanbao + '</b></span></div>' +
      '<div class="home-buttons main">' +
        '<button class="ink-btn gold" data-act="recruit">招 募</button>' +
        '<button class="ink-btn" data-act="heroes">武 将</button>' +
        '<button class="ink-btn secondary" data-act="deck">牌 组</button>' +
        '<button class="ink-btn secondary" data-act="train">训 练</button>' +
        '<button class="ink-btn secondary" data-act="daily">每日</button>' +
      '</div>' +
      '<div class="home-buttons">' +
        '<button class="ink-btn secondary" data-act="shop">商人</button>' +
        '<button class="ink-btn secondary" data-act="rank">军衔</button>' +
        '<button class="ink-btn secondary" data-act="bag">背包</button>' +
        '<button class="ink-btn secondary" data-act="cheat">金手指</button>' +
        '<button class="ink-btn secondary" data-act="help">帮助</button>' +
        '<button class="ink-btn secondary" data-act="sound">' + (meta.sound ? '音效:开' : '音效:关') + '</button>' +
      '</div>';
    var cards = el.home.querySelectorAll('.mode-card');
    for (var c = 0; c < cards.length; c++) cards[c].addEventListener('click', function () { Game.State.newRun(this.dataset.mode); });
    var acts = el.home.querySelectorAll('[data-act]');
    for (var a = 0; a < acts.length; a++) acts[a].addEventListener('click', function () {
      var act = this.dataset.act;
      if (act === 'shop') openShop();
      else if (act === 'rank') openRank();
      else if (act === 'bag') openBag();
      else if (act === 'cheat') openCheat();
      else if (act === 'help') openHelp();
      else if (act === 'sound') Game.State.toggleSound();
      else if (act === 'recruit') openRecruit();
      else if (act === 'heroes') openHeroes();
      else if (act === 'deck') openDeck();
      else if (act === 'train') openTrain();
      else if (act === 'daily') openDaily();
    });
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
    el.battleTop.innerHTML =
      '<div class="bt-row">' +
        '<button class="bt-tool" id="bt-home">↩</button>' +
        '<div class="bt-wave" id="bt-wave">第1波</div>' +
        '<div class="bt-hearts" id="bt-hearts-p" title="我方阿斗"></div>' +
        '<div class="bt-hearts enemy" id="bt-hearts-e" title="敌方阿斗"></div>' +
        '<button class="bt-tool" id="bt-pause">⏸</button>' +
        '<button class="bt-tool" id="bt-speed">x1</button>' +
      '</div>' +
      '<div class="bt-res">' +
        '<div class="res-item">馒头 <b id="res-buns">30</b></div>' +
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
        '<div id="active-items"></div>' +
      '</div>';
    document.getElementById('bt-home').addEventListener('click', askQuit);
    document.getElementById('bt-pause').addEventListener('click', togglePause);
    document.getElementById('bt-speed').addEventListener('click', toggleSpeed);
    document.getElementById('btn-recruit').addEventListener('click', function () { Game.Audio.unlock(); Game.State.recruit(); });
    document.getElementById('bt-shop').addEventListener('click', openShop);
    bindBenchDrag();
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
    var old = document.getElementById('pause-overlay');
    if (old) old.remove();
    if (flag) {
      var d = document.createElement('div');
      d.id = 'pause-overlay';
      d.className = 'battle-overlay';
      d.innerHTML = '<button class="ink-btn gold" style="font-size:20px">继续作战</button>';
      d.querySelector('button').addEventListener('click', togglePause);
      el.battleStage.appendChild(d);
    }
  }
  function toggleSpeed() {
    var b = Game.State.state.battle;
    if (!b) return;
    b.speed = (b.speed === 1 ? 2 : 1);
    var btn = document.getElementById('bt-speed');
    if (btn) btn.textContent = 'x' + b.speed;
  }

  function benchSlotHTML(b, idx, t) {
    var cls = 'bench-slot';
    if (b.selCard === idx) cls += ' selected';
    var inner = '', style = '';
    if (!t) inner = '<span style="opacity:.22">空</span>';
    else if (t.kind === 's') inner = t.ch + '<span class="slot-lv">Lv' + t.lv + '</span>';
    else if (t.kind === 'f') { inner = t.ch; style = ' style="color:#7a2a1a;background:#fbe9b8;border-color:#b8860b"'; }
    else if (t.kind === 'g') { inner = t.name; style = ' style="color:#7a2a1a;background:#f4d98a;border-color:#b8860b"'; }
    else if (t.kind === 'shovel') inner = '铲';
    return '<div class="' + cls + '" data-idx="' + idx + '"' + style + '>' + inner + '</div>';
  }

  function syncBattle(b) {
    if (!b) return;
    var bench = document.getElementById('bench');
    if (bench) {
      var html = '';
      for (var i = 0; i < b.P.bench.length; i++) html += benchSlotHTML(b, i, b.P.bench[i]);
      bench.innerHTML = html;
    }
    var aiWrap = document.getElementById('active-items');
    if (aiWrap) {
      var ahtml = '';
      for (var a = 0; a < b.activeItems.length; a++) {
        var it = b.activeItems[a];
        if (it) ahtml += '<button class="active-item" data-slot="' + a + '">' + DATA.ITEMS[it.id].name + '<span class="uses">×' + it.uses + '</span></button>';
        else ahtml += '<button class="active-item" style="opacity:.35" data-slot="' + a + '">空位</button>';
      }
      aiWrap.innerHTML = ahtml;
      var abtns = aiWrap.querySelectorAll('.active-item');
      for (var ab = 0; ab < abtns.length; ab++) abtns[ab].addEventListener('click', function () { Game.State.useActiveItem(parseInt(this.dataset.slot, 10)); });
    }
    updateHud();
  }

  function updateHud() {
    var st = Game.State.state, b = st.battle;
    if (!b) return;
    function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
    set('res-buns', b.P.mantou);
    var cost = Game.Battle.recruitCost(b, b.P);
    if (b.dailyBuff && b.dailyBuff.type === 'recruitCost') cost = Math.max(1, Math.round(cost * b.dailyBuff.mul));
    set('res-cost', cost);
    set('btn-cost', cost);
    var hp = document.getElementById('bt-hearts-p'), he = document.getElementById('bt-hearts-e');
    if (hp) hp.textContent = '♥'.repeat(Math.max(0, b.P.hearts));
    if (he) he.textContent = b.solo ? '' : '♥'.repeat(Math.max(0, b.E.hearts));
    var wtext = '';
    if (b.mode === 'endless') wtext = '无尽 · 第 ' + b.wave + ' 波';
    else if (b.mode === 'arena') wtext = '竞技 · 第 ' + b.wave + '/' + b.maxWave + ' 波';
    else wtext = '第 ' + b.wave + '/' + b.maxWave + ' 波';
    set('bt-wave', wtext);
    var hint = '';
    if (b.uiSel && b.uiSel.mode === 'unit') hint = '点击要强化的我方单位';
    else if (b.uiSel && b.uiSel.mode === 'benchChar') hint = '点击备战席要改写的汉字';
    else if (b.unlockMode) hint = '点击亮起的空地解锁建造格';
    else if (b.selCard >= 0) hint = '点/拖到亮起的空地放置';
    else if (b.selInfo && b.selInfo.x == null && b.selInfo.range) hint = '攻击范围 ' + Math.round(b.selInfo.range * 10) / 10 + ' 格';
    else if (b.waveState === 'idle' || b.waveState === 'cleared') hint = '下一波 ' + Math.max(0, b.restTimer).toFixed(1) + 's';
    else hint = '拖动备战席卡牌上阵 · 抵御进攻…';
    set('res-hint', hint);
    var btn = document.getElementById('btn-recruit');
    if (btn) btn.disabled = b.P.mantou < cost || b.P.bench.indexOf(null) < 0;
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
      html += '<div class="shop-item" data-id="' + items[i] + '">' +
        '<div class="item-emoji">' + def.emoji + '</div>' +
        '<div class="item-name">' + def.name + '</div>' +
        '<div class="item-desc">' + def.desc + '</div>' +
        '<div class="item-price">' + def.price + ' 金币</div>' +
        '<button class="ink-btn" style="padding:6px 8px;font-size:14px">购买</button>' +
      '</div>';
    }
    row.innerHTML = html;
    var btns = row.querySelectorAll('.shop-item');
    for (var b = 0; b < btns.length; b++) btns[b].querySelector('button').addEventListener('click', function () {
      Game.State.buyMerchantItem(this.parentNode.dataset.id);
    });
  }
  function refreshShop() {
    if (el.modalRoot.children.length) {
      var title = el.modalRoot.querySelector('.modal-title');
      if (title && title.textContent === '神秘商人') openShop();
    }
  }

  function heroSkillText(h) {
    if (!h) return '';
    var p = '';
    if (h.passive) {
      var pn = DATA.PASSIVE_NAME[h.passive[0]] || '';
      var pv = h.passive[0] === 'waveheal' ? h.passive[1] : Math.round(h.passive[1] * 100) + '%';
      p = '｜被动·' + pn + pv;
    }
    return (h.skillName || '') + '·' + (h.skillDesc || '') + p;
  }

  /* ================= 招募（抽卡） ================= */
  function openRecruit() {
    var meta = Game.State.state.meta;
    var card = openModal(
      '<div class="modal-title">招 募</div>' +
      '<p style="text-align:center;font-size:15px;color:#c9a227">元宝 <b id="rc-yuanbao">' + meta.yuanbao + '</b></p>' +
      '<p style="text-align:center;font-size:12px;color:#8a7d66;margin:6px 0">单抽 ' + CONFIG.GACHA.costSingle + ' · 十连 ' + CONFIG.GACHA.costTen + '<br>已有武将重复获得 → 信物（用于升星）</p>' +
      '<div class="result-actions" style="margin-bottom:10px">' +
        '<button class="ink-btn gold" id="rc-1">单 抽</button>' +
        '<button class="ink-btn gold" id="rc-10">十 连</button>' +
      '</div>' +
      '<div id="gacha-rates" style="font-size:12px;color:#8a7d66;text-align:center;margin-bottom:8px"></div>' +
      '<div class="gacha-result" id="gacha-result"></div>'
    );
    var rates = '';
    for (var r = 1; r <= 4; r++) rates += '<span style="color:' + DATA.RARITY_COLOR[r] + '">' + DATA.RARITY_NAME[r] + ' ' + CONFIG.GACHA.rarityWeight[r] + '%</span>　';
    card.querySelector('#gacha-rates').innerHTML = '掉率：' + rates;
    card.querySelector('#rc-1').addEventListener('click', function () {
      var res = Game.State.gachaPull(1);
      if (res) showGachaResult(card, res);
    });
    card.querySelector('#rc-10').addEventListener('click', function () {
      var res = Game.State.gachaPull(10);
      if (res) showGachaResult(card, res);
    });
  }
  function showGachaResult(card, results) {
    var yb = card.querySelector('#rc-yuanbao');
    if (yb) yb.textContent = Game.State.state.meta.yuanbao;
    var html = '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">';
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var col = DATA.RARITY_COLOR[r.rarity];
      html += '<div style="width:52px;height:60px;border-radius:8px;background:' + col + ';color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:16px;font-weight:bold">' + r.name + '<span style="font-size:9px;opacity:.8">' + (r.isNew ? 'NEW' : '信物') + '</span></div>';
    }
    html += '</div>';
    card.querySelector('#gacha-result').innerHTML = html;
  }

  /* ================= 武将图鉴 / 升星 ================= */
  function openHeroes() {
    var meta = Game.State.state.meta;
    var card = openModal('<div class="modal-title">武将 · 图鉴</div><div id="hero-list"></div>');
    var list = card.querySelector('#hero-list');
    var html = '';
    var names = {};
    for (var k in DATA.HEROES) names[DATA.HEROES[k].name] = true;
    var owned = [];
    for (var n in meta.heroes) if (names[n]) owned.push(n);
    if (!owned.length) html = '<p style="text-align:center;color:#8a7d66">尚未拥有武将，去招募吧</p>';
    for (var i = 0; i < owned.length; i++) {
      var name = owned[i];
      var stars = meta.heroes[name];
      var keeps = meta.keepsakes[name] || 0;
      var rarity = DATA.HERO_RARITY[name] || 1;
      var hero = null;
      for (var k2 in DATA.HEROES) if (DATA.HEROES[k2].name === name) hero = DATA.HEROES[k2];
      html += '<div class="weapon-cell" data-name="' + name + '" style="cursor:pointer">' +
        '<div class="hero-seal" style="background:' + DATA.RARITY_COLOR[rarity] + '">' + name + '</div>' +
        '<div class="w-info"><div class="w-name">' + name + ' <span style="color:#ffd700;font-size:13px">' + '★'.repeat(stars) + '</span></div>' +
        '<div class="w-tag">' + heroSkillText(hero) + '</div></div>' +
        '<div class="w-info" style="text-align:right;flex:none">' +
          '<div class="w-tag">信物 ×' + keeps + '</div>' +
          '<button class="ink-btn" style="padding:4px 8px;font-size:13px">升星</button>' +
        '</div></div>';
    }
    list.innerHTML = html;
    var rows = list.querySelectorAll('[data-name]');
    for (var r2 = 0; r2 < rows.length; r2++) {
      rows[r2].querySelector('button').addEventListener('click', function (e) {
        e.stopPropagation();
        Game.State.starUp(this.parentNode.parentNode.dataset.name);
        openHeroes();
      });
      rows[r2].addEventListener('click', function () { showHeroDetail(this.dataset.name); });
    }
  }
  function showHeroDetail(name) {
    var meta = Game.State.state.meta;
    var stars = meta.heroes[name];
    var keeps = meta.keepsakes[name] || 0;
    var hero = null;
    for (var k in DATA.HEROES) if (DATA.HEROES[k].name === name) hero = DATA.HEROES[k];
    if (!hero) return;
    var traits = DATA.TRAITS[hero.skill];
    var tHtml = '<p style="font-size:12px;color:#8a7d66;margin:6px 0">星级特性：</p>';
    [2, 4, 6].forEach(function (s) {
      var label = s === 2 ? 'C2' : (s === 4 ? 'C4' : 'C6');
      tHtml += '<div style="font-size:13px;' + (stars >= s ? 'color:#c9a227' : 'color:#aaa') + '">' + label + '：' + (traits ? traits['c' + s] : '') + '</div>';
    });
    openModal(
      '<div class="modal-title">' + name + '</div>' +
      '<div style="text-align:center;font-size:20px;color:#ffd700;margin-bottom:6px">' + '★'.repeat(stars) + '</div>' +
      '<p style="text-align:center;font-size:12px;color:#4a443d;margin-bottom:8px">' + heroSkillText(hero) + ' · 信物 ×' + keeps + '</p>' +
      tHtml +
      '<div class="result-actions" style="margin-top:10px">' +
        '<button class="ink-btn" id="hd-up">升星（消耗1信物）</button>' +
      '</div>'
    );
    document.getElementById('hd-up').addEventListener('click', function () {
      Game.State.starUp(name);
      closeModal();
      openHeroes();
    });
  }

  /* ================= 牌组 ================= */
  function openDeck() {
    var meta = Game.State.state.meta;
    var slots = meta.deckSlots || CONFIG.DECK.baseSlots;
    var card = openModal(
      '<div class="modal-title">牌 组</div>' +
      '<p style="font-size:12px;color:#8a7d66;text-align:center">上阵牌组（' + meta.deck.length + '/' + slots + '）：牌库只出牌组里的字，只有牌组武将可上阵。</p>' +
      '<div style="text-align:center;margin:8px 0"><button class="ink-btn secondary" id="deck-unlock">扩容 +1槽（' + CONFIG.DECK.unlockCost + '元宝）</button></div>' +
      '<div id="deck-list"></div>'
    );
    var list = card.querySelector('#deck-list');
    var html = '';
    for (var k in DATA.HEROES) {
      var name = DATA.HEROES[k].name;
      if (meta.heroes[name] === undefined) continue;
      var inDeck = meta.deck.indexOf(name) >= 0;
      var rarity = DATA.HERO_RARITY[name] || 1;
      html += '<div class="weapon-cell" data-name="' + name + '">' +
        '<div class="hero-seal" style="background:' + DATA.RARITY_COLOR[rarity] + '">' + name + '</div>' +
        '<div class="w-info"><div class="w-name">' + name + '</div></div>' +
        '<div style="flex:none">' + (inDeck ? '<span style="color:#3f9d4f;font-size:13px">已入组</span>' : '<span style="color:#aaa;font-size:13px">未入组</span>') + '</div>' +
        '<div class="w-info" style="text-align:right;flex:none">' +
          '<button class="ink-btn" style="padding:4px 8px;font-size:13px">' + (inDeck ? '撤下' : '入组') + '</button>' +
        '</div></div>';
    }
    list.innerHTML = html;
    var btns = list.querySelectorAll('[data-name]');
    for (var j = 0; j < btns.length; j++) btns[j].querySelector('button').addEventListener('click', function (e) {
      e.stopPropagation();
      Game.State.toggleDeck(this.parentNode.parentNode.dataset.name);
      openDeck();
    });
    var un = card.querySelector('#deck-unlock');
    if (un) un.addEventListener('click', function () { Game.State.unlockDeckSlot(); openDeck(); });
  }

  /* ================= 兵种训练 ================= */
  function openTrain() {
    var meta = Game.State.state.meta;
    var card = openModal('<div class="modal-title">兵种训练</div><div id="train-list"></div>' +
      '<p style="font-size:12px;color:#8a7d66;margin-top:8px">每级该兵种伤害 +' + Math.round(CONFIG.TRAINING.dmgPerLv * 100) + '%，上限 ' + CONFIG.TRAINING.maxLv + ' 级。</p>');
    var list = card.querySelector('#train-list');
    var html = '';
    ['刀', '枪', '弓', '骑'].forEach(function (ch) {
      var lv = meta.training[ch] || 0;
      var cost = lv >= CONFIG.TRAINING.maxLv ? 0 : Math.round(CONFIG.TRAINING.costBase * Math.pow(CONFIG.TRAINING.costMul, lv));
      html += '<div class="weapon-cell"><div class="hero-seal">' + ch + '</div>' +
        '<div class="w-info"><div class="w-name">' + DATA.SOLDIERS[ch].name + '</div><div class="w-tag">伤害+' + (lv * 10) + '% · Lv.' + lv + '</div></div>' +
        '<div class="w-info" style="text-align:right;flex:none">' +
          (lv >= CONFIG.TRAINING.maxLv ? '<div class="w-tag">已满级</div>' : '<button class="ink-btn" data-ch="' + ch + '" style="padding:5px 8px;font-size:13px">升级 ' + cost + '金币</button>') +
        '</div></div>';
    });
    list.innerHTML = html;
    var btns = list.querySelectorAll('[data-ch]');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function () {
      Game.State.trainUp(this.dataset.ch);
      openTrain();
    });
  }

  /* ================= 每日 / 成就 ================= */
  function openDaily() {
    var meta = Game.State.state.meta;
    Game.State.resetDaily(meta);
    var card = openModal('<div class="modal-title">每日 · 成就</div>' +
      '<div class="panel-label">每日任务</div><div id="daily-list"></div>' +
      '<div class="panel-label">成就</div><div id="ach-list"></div>');
    var dl = card.querySelector('#daily-list');
    var dhtml = '';
    CONFIG.DAILY.quests.forEach(function (q) {
      var prog = meta.daily.progress[q.key] || 0;
      var done = prog >= q.target;
      var claimed = meta.daily.claimed[q.key];
      dhtml += '<div class="weapon-cell"><div class="w-info"><div class="w-name">' + q.name + '</div><div class="w-tag">' + Math.min(prog, q.target) + '/' + q.target + '</div></div>' +
        '<div class="w-info" style="text-align:right;flex:none"><div class="w-tag">元宝+' + q.reward[0] + '</div>' +
        (claimed ? '<div class="w-tag" style="color:#3f9d4f">已领取</div>' : (done ? '<button class="ink-btn" data-dq="' + q.key + '" style="padding:4px 8px;font-size:13px">领取</button>' : '<div class="w-tag">未完成</div>')) +
        '</div></div>';
    });
    dl.innerHTML = dhtml;
    var db = dl.querySelectorAll('[data-dq]');
    for (var i = 0; i < db.length; i++) db[i].addEventListener('click', function () { Game.State.claimDaily(this.dataset.dq); openDaily(); });
    var al = card.querySelector('#ach-list');
    var ahtml = '';
    CONFIG.ACHIEVEMENTS.forEach(function (a) {
      var done = Game.State.achievementDone(a.key);
      var claimed = meta.achievements.claimed[a.key];
      ahtml += '<div class="weapon-cell"><div class="w-info"><div class="w-name">' + a.name + '</div><div class="w-tag">' + heroSkillText(a) + '</div></div>' +
        '<div class="w-info" style="text-align:right;flex:none"><div class="w-tag">元宝+' + a.reward[0] + '</div>' +
        (claimed ? '<div class="w-tag" style="color:#3f9d4f">已领取</div>' : (done ? '<button class="ink-btn" data-ak="' + a.key + '" style="padding:4px 8px;font-size:13px">领取</button>' : '<div class="w-tag">未达成</div>')) +
        '</div></div>';
    });
    al.innerHTML = ahtml;
    var ab = al.querySelectorAll('[data-ak]');
    for (var j = 0; j < ab.length; j++) ab[j].addEventListener('click', function () { Game.State.claimAchievement(this.dataset.ak); openDaily(); });
  }

  /* ================= 金手指 ================= */
  function openCheat() {
    var meta = Game.State.state.meta;
    var cfg = Game.Cheat.settings(meta);
    function sel(id, label, opts, val) {
      var o = '';
      for (var i = 0; i < opts.length; i++) o += '<option value="' + opts[i] + '"' + (String(val) === String(opts[i]) ? ' selected' : '') + '>' + label + ' ' + opts[i] + '</option>';
      return '<label class="cheat-row"><span>' + label + '</span><select id="' + id + '">' + o + '</select></label>';
    }
    function num(id, label, val) {
      return '<label class="cheat-row"><span>' + label + '</span><input id="' + id + '" type="number" value="' + val + '"></label>';
    }
    var card = openModal(
      '<div class="modal-title">金手指</div>' +
      '<p style="font-size:12px;color:#8a7d66;margin-bottom:8px">单机自定义：改资源 / 抽卡 / 装备 / 挂机 / 难度。改动即时生效（下一局起）。</p>' +
      '<div class="cheat-box">' +
        sel('ch-enable', '启用金手指', ['否', '是'], cfg.enabled ? '是' : '否') +
        num('ch-mantou', '开局馒头', cfg.startMantou == null ? '' : cfg.startMantou) +
        sel('ch-free', '征兵免费', ['否', '是'], cfg.recruitFree ? '是' : '否') +
        num('ch-soldier', '抽卡·士兵权重', cfg.recruitSoldier || '') +
        num('ch-frag', '抽卡·碎片权重', cfg.recruitFrag || '') +
        num('ch-shovel', '抽卡·铲子权重', cfg.recruitShovel || '') +
        sel('ch-slv', '新抽士兵等级', ['1', '2', '3', '4', '5'], cfg.soldierLv || 1) +
        sel('ch-dmg', '己方伤害倍率', ['0.5', '1', '2', '5', '10'], cfg.dmgMul) +
        sel('ch-enemyhp', '敌方血量倍率', ['0.5', '1', '2', '3'], cfg.enemyHpMul) +
        sel('ch-hearts', '阿斗红心', ['3', '5', '10', '20'], cfg.hearts || CONFIG.ECON.hearts) +
        sel('ch-offline', '挂机倍率', ['1', '5', '10', '50'], cfg.offlineMul) +
        sel('ch-wavebonus', '波次馒头倍率', ['1', '2', '5', '10'], cfg.waveBonusMul) +
      '</div>' +
      '<div class="result-actions" style="margin-top:12px">' +
        '<button class="ink-btn" id="ch-save">保存设置</button>' +
        '<button class="ink-btn secondary" id="ch-coins">+1000金币</button>' +
        '<button class="ink-btn secondary" id="ch-yuanbao">+1000元宝</button>' +
        '<button class="ink-btn secondary" id="ch-unlock">全武将解锁</button>' +
        '<button class="ink-btn secondary" id="ch-weapons">武将全满配</button>' +
        '<button class="ink-btn secondary" id="ch-max">满级满军衔</button>' +
      '</div>'
    );
    function read() {
      return {
        enabled: card.querySelector('#ch-enable').value === '是',
        startMantou: card.querySelector('#ch-mantou').value === '' ? null : parseInt(card.querySelector('#ch-mantou').value, 10),
        recruitFree: card.querySelector('#ch-free').value === '是',
        recruitSoldier: card.querySelector('#ch-soldier').value === '' ? null : parseInt(card.querySelector('#ch-soldier').value, 10),
        recruitFrag: card.querySelector('#ch-frag').value === '' ? null : parseInt(card.querySelector('#ch-frag').value, 10),
        recruitShovel: card.querySelector('#ch-shovel').value === '' ? null : parseInt(card.querySelector('#ch-shovel').value, 10),
        soldierLv: parseInt(card.querySelector('#ch-slv').value, 10),
        dmgMul: parseFloat(card.querySelector('#ch-dmg').value),
        enemyHpMul: parseFloat(card.querySelector('#ch-enemyhp').value),
        hearts: parseInt(card.querySelector('#ch-hearts').value, 10),
        offlineMul: parseInt(card.querySelector('#ch-offline').value, 10),
        waveBonusMul: parseInt(card.querySelector('#ch-wavebonus').value, 10)
      };
    }
    card.querySelector('#ch-save').addEventListener('click', function () {
      Game.State.cheatSave(read());
      Game.UI.toast('金手指已保存');
      closeModal();
    });
    card.querySelector('#ch-coins').addEventListener('click', function () { Game.Cheat.addCoins(meta, 1000); Game.UI.toast('金币 +1000'); openCheat(); });
    card.querySelector('#ch-yuanbao').addEventListener('click', function () { Game.Cheat.addYuanbao(meta, 1000); Game.UI.toast('元宝 +1000'); openCheat(); });
    card.querySelector('#ch-unlock').addEventListener('click', function () { Game.Cheat.unlockAllHeroes(meta); Game.UI.toast('已解锁全部武将'); openCheat(); });
    card.querySelector('#ch-weapons').addEventListener('click', function () { Game.Cheat.maxWeapons(meta); Game.UI.toast('武将全部满配神兵'); openCheat(); });
    card.querySelector('#ch-max').addEventListener('click', function () { Game.Cheat.levelUp(meta); Game.UI.toast('已满级满军衔'); openCheat(); });
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
      ahtml += '<div class="avatar-cell' + (meta.currentAvatar === av.key ? ' active' : '') + (unlocked ? '' : ' locked') + '" data-av="' + av.key + '" title="' + av.name + '">' + av.emoji + '</div>';
    }
    ag.innerHTML = ahtml;
    var avs = ag.querySelectorAll('.avatar-cell');
    for (var avi = 0; avi < avs.length; avi++) avs[avi].addEventListener('click', function () { Game.State.setAvatar(this.dataset.av); });
  }

  function openBag() {
    var meta = Game.State.state.meta;
    var card = openModal('<div class="modal-title">背包 · 神兵</div><div id="weapon-list"></div>');
    var list = card.querySelector('#weapon-list');
    var html = '';
    var seen = {};
    for (var k in DATA.HEROES) {
      var h = DATA.HEROES[k];
      if (seen[h.name]) continue; seen[h.name] = true;
      var w = meta.weapons[h.name];
      html += '<div class="weapon-cell">' +
        '<div class="hero-seal">' + h.name + '</div>' +
        '<div class="w-info"><div class="w-name">' + h.name + '</div><div class="w-tag">' + heroSkillText(h) + '</div></div>' +
        '<div class="w-info" style="text-align:right;flex:none">' +
          (w ? '<div class="w-name" style="color:' + DATA.WEAPON_TIER_COLOR[w.tier] + '">' + w.name + '</div><div class="w-tag">' + DATA.WEAPON_TIER_NAME[w.tier] + '品</div>'
             : '<div class="w-tag">未持有神兵</div>') +
        '</div></div>';
    }
    list.innerHTML = html;
  }

  function openHelp() {
    openModal(
      '<div class="modal-title">玩法说明</div>' +
      '<div class="help-box">' +
        '<h4>目标</h4><p>守将（阿斗）有 ' + CONFIG.ECON.hearts + ' 颗红心，漏过一个敌人扣一颗，先掉光的一方落败。</p>' +
        '<h4>征兵</h4><p>花馒头【替换】备战席为 5 张新卡（士兵/汉字碎片/铲子）。</p>' +
        '<h4>拖拽上阵</h4><p>从备战席把卡牌【拖】到亮起的空地上；同字同级士兵可叠到同格升级；点备战席也可看范围。</p>' +
        '<h4>武将觉醒</h4><p>把金色汉字碎片放到【相邻】两格（首字在左、尾字在右），如 赵+云=赵云。拖同字碎片到武将军升级。</p>' +
        '<h4>铲子</h4><p>把铲子拖到/点到一块空地解锁建造格（逐格）。开局每个半场有设计好的初始地块。</p>' +
        '<h4>金手指</h4><p>主页点「金手指」可自定义资源/抽卡/装备/挂机/难度，单机随意调。</p>' +
      '</div>'
    );
  }

  function askQuit() {
    var b = Game.State.state.battle;
    if (!b) return;
    if (b.mode === 'endless') { Game.State.quitBattle(); return; }
    var card = openModal('<div class="modal-title">撤退？</div><p style="text-align:center;margin-bottom:14px;font-size:14px;color:#4a443d">现在撤退将放弃本局奖励。</p>' +
      '<div class="result-actions"><button class="ink-btn" id="q-no">继续作战</button><button class="ink-btn cinnabar" id="q-yes">撤退</button></div>');
    card.querySelector('#q-no').addEventListener('click', closeModal);
    card.querySelector('#q-yes').addEventListener('click', function () { closeModal(); Game.State.quitBattle(); });
  }

  function showResult(b) {
    var r = b.result;
    var win = r.win;
    var title, titleCls;
    if (r.quit) { title = '收兵'; titleCls = 'lose'; }
    else { title = win ? '大获全胜' : '阿斗失守'; titleCls = win ? 'win' : 'lose'; }
    var stars = '';
    for (var i = 0; i < 3; i++) stars += (i < r.stars ? '★' : '☆');
    var dropsHtml = '';
    if (b.drops && b.drops.length) {
      dropsHtml = b.drops.map(function (d) {
        return '<div class="r-row"><span>掉落神兵</span><b style="color:' + DATA.WEAPON_TIER_COLOR[d.tier] + '">' + d.name + ' · 给' + d.hero + '</b></div>';
      }).join('');
    }
    openModal(
      '<div class="result-title ' + titleCls + '">' + title + '</div>' +
      '<div class="result-stars">' + stars + '</div>' +
      '<div class="result-rows">' +
        '<div class="r-row"><span>波次</span><b>' + r.wave + '</b></div>' +
        '<div class="r-row"><span>剩余红心</span><b>' + r.heartsLeft + '/' + CONFIG.ECON.hearts + '</b></div>' +
        '<div class="r-row"><span>金币</span><b>+' + r.coins + '</b></div>' +
        '<div class="r-row"><span>经验</span><b>+' + r.xp + '</b></div>' +
        dropsHtml +
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
    openCheat: openCheat,
    openRecruit: openRecruit,
    openHeroes: openHeroes,
    openDeck: openDeck,
    openTrain: openTrain,
    openDaily: openDaily,
    closeModal: closeModal,
    toast: toast
  };
})();
