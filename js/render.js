/* render.js —— canvas 战场渲染：路径 / 建造格 / 守将红心 / 塔 / 敌人 / 弹道 */
Game.Render = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA;
  var canvas = null, ctx = null;
  var W = 0, H = 0, dpr = 1;
  var lastW = 0, lastH = 0;
  var L = { cellW: 0, cellH: 0 };

  var THEMES = {
    volcano: { bg: '#efe3d0', road: '#a9744a', roadDark: '#7a4e2a', build: 'rgba(59,74,107,.10)' },
    sand: { bg: '#f2ecd8', road: '#c8a86a', roadDark: '#9a7a3e', build: 'rgba(59,74,107,.10)' },
    cave: { bg: '#e6e0d2', road: '#8a7a66', roadDark: '#5e5242', build: 'rgba(59,74,107,.10)' },
    water: { bg: '#e8edf0', road: '#6a94a0', roadDark: '#4a6a76', build: 'rgba(59,74,107,.10)' },
    petal: { bg: '#f4e8e6', road: '#c8929a', roadDark: '#a06a72', build: 'rgba(59,74,107,.10)' }
  };

  function FONT(px, weight) {
    return (weight || 500) + ' ' + px + 'px "KaiTi","STKaiti","楷体","STZhongsong","SimSun",serif';
  }
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }
  function cellPx(c, r) { return { x: (c + 0.5) * L.cellW, y: (r + 0.5) * L.cellH }; }

  function ensureSize() {
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (cw === lastW && ch === lastH) return;
    lastW = cw; lastH = ch;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function layout(b) {
    L.cellW = (canvas.clientWidth || W) / b.cols;
    L.cellH = (canvas.clientHeight || H) / b.rows;
    W = canvas.clientWidth; H = canvas.clientHeight;
  }
  function preloadFonts() {
    try { if (document.fonts && document.fonts.load) { document.fonts.load('16px "KaiTi"'); } } catch (e) {}
  }

  /* ================= 主绘制 ================= */
  function draw(state) {
    var b = state.battle;
    if (!b || !canvas) return;
    ensureSize();
    layout(b);
    var theme = THEMES[b.map.theme] || THEMES.volcano;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    drawCells(b, theme);
    drawPaths(b, theme);
    drawBases(b);
    drawUnits(b);
    drawEnemies(b);
    drawBullets(b);
    drawEffects(b);
    drawHighlights(b);
  }

  function drawCells(b, theme) {
    for (var c = 0; c < b.cols; c++) {
      for (var r = 0; r < b.rows; r++) {
        var t = b.cellType[Game.Battle.key(c, r)];
        var p = cellPx(c, r);
        var x = p.x - L.cellW / 2 + 1, y = p.y - L.cellH / 2 + 1;
        var w = L.cellW - 2, h = L.cellH - 2;
        if (t === 'build_p') {
          ctx.fillStyle = 'rgba(59,74,107,.12)';
          roundRect(x, y, w, h, 5); ctx.fill();
          ctx.strokeStyle = 'rgba(59,74,107,.5)';
          ctx.lineWidth = 1.5;
          roundRect(x, y, w, h, 5); ctx.stroke();
        } else if (t === 'build_e') {
          ctx.fillStyle = 'rgba(168,59,45,.10)';
          roundRect(x, y, w, h, 5); ctx.fill();
          ctx.strokeStyle = 'rgba(168,59,45,.4)';
          ctx.lineWidth = 1.5;
          roundRect(x, y, w, h, 5); ctx.stroke();
        } else if (t === 'block') {
          ctx.fillStyle = 'rgba(0,0,0,.03)';
          ctx.fillRect(x, y, w, h);
        }
      }
    }
  }

  function drawPaths(b, theme) {
    // 双方路径统一画成土路
    var drawOne = function (path) {
      for (var i = 0; i < path.length; i++) {
        var p = cellPx(path[i][0], path[i][1]);
        ctx.fillStyle = theme.road;
        ctx.fillRect(p.x - L.cellW / 2, p.y - L.cellH / 2, L.cellW, L.cellH);
        ctx.fillStyle = theme.roadDark;
        ctx.fillRect(p.x - L.cellW / 2 + L.cellW * 0.14, p.y - L.cellH / 2 + L.cellH * 0.14, L.cellW * 0.72, L.cellH * 0.72);
        // 连接（虚线标记行进方向：从出怪口指向守将）
        if (i < path.length - 1) {
          var n = cellPx(path[i + 1][0], path[i + 1][1]);
          ctx.strokeStyle = 'rgba(245,240,225,.5)';
          ctx.lineWidth = Math.min(L.cellW, L.cellH) * 0.08;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
    };
    drawOne(b.pathP);
    drawOne(b.pathE);
  }

  function drawBases(b) {
    // 守将（阿斗）在路径终点，出怪口在起点
    drawBaseOne(b, b.pathP, 'P', false);
    drawBaseOne(b, b.pathE, 'E', true);
  }
  function drawBaseOne(b, path, side, isEnemy) {
    var adou = path[path.length - 1];
    var spawn = path[0];
    var pA = cellPx(adou[0], adou[1]);
    var pS = cellPx(spawn[0], spawn[1]);
    var S = side === 'P' ? b.P : b.E;
    var cell = Math.min(L.cellW, L.cellH);
    // 出怪口
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    var sw = cell * 0.5, sh = cell * 0.5;
    ctx.moveTo(pS.x - sw, pS.y - sh); ctx.lineTo(pS.x + sw, pS.y - sh);
    ctx.lineTo(pS.x, pS.y + sh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5f0e1';
    ctx.font = FONT(cell * 0.3, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('出', pS.x, pS.y - 1);
    // 守将（阿斗 + 红心）
    var shake = S.shakeT > 0 ? (Math.random() - 0.5) * 4 : 0;
    ctx.fillStyle = isEnemy ? '#7c2a1e' : '#3b4a6b';
    roundRect(pA.x - cell * 0.42 + shake, pA.y - cell * 0.42, cell * 0.84, cell * 0.84, 8);
    ctx.fill();
    ctx.fillStyle = '#f5f0e1';
    ctx.font = FONT(cell * 0.32, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('阿斗', pA.x + shake, pA.y - 1);
    // 红心
    var n = CONFIG.ECON.hearts;
    var hw = cell * 0.16, gap = cell * 0.04;
    var hx0 = pA.x - (n * hw + (n - 1) * gap) / 2;
    for (var i = 0; i < n; i++) {
      var cx = hx0 + i * (hw + gap);
      ctx.fillStyle = i < S.hearts ? '#e04a3a' : 'rgba(0,0,0,.22)';
      ctx.beginPath();
      ctx.moveTo(cx, pA.y + cell * 0.46);
      ctx.bezierCurveTo(cx - hw / 2, pA.y + cell * 0.46 - hw * 0.9, cx - hw, pA.y + cell * 0.46 - hw * 0.9, cx - hw, pA.y + cell * 0.46 - hw * 0.2);
      ctx.bezierCurveTo(cx - hw, pA.y + cell * 0.46 + hw * 0.4, cx - hw / 2, pA.y + cell * 0.46 + hw * 0.5, cx, pA.y + cell * 0.46);
      ctx.bezierCurveTo(cx + hw / 2, pA.y + cell * 0.46 + hw * 0.5, cx + hw, pA.y + cell * 0.46 + hw * 0.4, cx + hw, pA.y + cell * 0.46 - hw * 0.2);
      ctx.bezierCurveTo(cx + hw, pA.y + cell * 0.46 - hw * 0.9, cx + hw / 2, pA.y + cell * 0.46 - hw * 0.9, cx, pA.y + cell * 0.46);
      ctx.fill();
    }
  }

  function drawUnits(b) {
    for (var side in { P: 1, E: 1 }) {
      var S = b[side];
      for (var k in S.units) {
        var u = S.units[k];
        var cr = k.split('_');
        drawTower(b, side === 'P', u, +cr[0], +cr[1]);
      }
    }
  }
  function drawTower(b, isPlayer, u, c, r) {
    var p = cellPx(c, r);
    var cell = Math.min(L.cellW, L.cellH);
    var isHero = u.kind === 'g';
    var isHalf = isHero && u.half != null;
    var size = cell * (isHero ? 0.7 : (u.kind === 'f' ? 0.55 : 0.62));
    var half = size / 2;
    var isGold = isHero || u.kind === 'f';
    var scale = u.attackT > 0 ? 1.15 : 1;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    // 底座
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    roundRect(-half + 2, -half + 3, size, size, size * 0.15); ctx.fill();
    // 牌面
    ctx.fillStyle = isGold ? (isHalf ? (u.half === 0 ? '#fbe9b8' : '#f4d98a') : '#fbe9b8') : (isPlayer ? '#fbf7ec' : '#3a3228');
    roundRect(-half, -half, size, size, size * 0.15); ctx.fill();
    ctx.strokeStyle = isGold ? '#b8860b' : (isPlayer ? '#1a1a1a' : '#f5f0e1');
    ctx.lineWidth = isGold ? 2.5 : 2;
    roundRect(-half, -half, size, size, size * 0.15); ctx.stroke();
    // 半身连接边
    if (isHalf) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (u.half === 0) { ctx.moveTo(half - 2, -half + 4); ctx.lineTo(half - 2, half - 4); }
      else { ctx.moveTo(-half + 2, -half + 4); ctx.lineTo(-half + 2, half - 4); }
      ctx.stroke();
    }
    // 字
    var label = isHero ? (isHalf ? u.ch : u.name) : u.ch;
    ctx.fillStyle = isGold ? '#7a2a1a' : (isPlayer ? '#1a1a1a' : '#f5f0e1');
    ctx.font = FONT(size * (isHero ? (isHalf ? 0.55 : 0.42) : 0.62), 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, -1);
    // 等级
    if ((u.kind === 's' && u.lv > 1) || (isHero && (u.lv || 1) > 1)) {
      ctx.fillStyle = '#b8860b';
      ctx.font = FONT(cell * 0.17, 700);
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('Lv' + (u.lv || 1), half - cell * 0.05, -half + cell * 0.03);
    }
    // 星级角标
    if (isHero) {
      var stars = (b.heroStars && b.heroStars[u.name]) || 0;
      if (stars > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.font = FONT(cell * 0.15, 700);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('★'.repeat(Math.min(6, stars)), -half + cell * 0.04, -half + cell * 0.02);
      }
    }
    // 经验条（武将半身0：杀敌自动晋级进度）
    if (isHalf && u.half === 0 && (u.lv || 1) < CONFIG.GEN_MAX_LV) {
      var need = CONFIG.HERO_KILLS_NEED(u.lv || 1);
      var prog = Math.min(1, (u.kills || 0) / need);
      var bw = size * 0.9, bh = Math.max(3, cell * 0.06);
      var bx = -bw / 2, by = half + 4;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      roundRect(bx, by, bw, bh, 2); ctx.fill();
      ctx.fillStyle = '#c9a227';
      roundRect(bx, by, Math.max(0, bw * prog), bh, 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemies(b) {
    for (var i = 0; i < b.enemies.length; i++) {
      var e = b.enemies[i];
      if (e.dead) continue;
      var p = { x: e.x * L.cellW, y: e.y * L.cellH };
      var cell = Math.min(L.cellW, L.cellH);
      var size = cell * e.size * (e.boss ? 1.3 : 1);
      var half = size / 2;
      ctx.save();
      if (e.flashT > 0) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
      ctx.fillStyle = '#3a2a1e';
      roundRect(p.x - half, p.y - half, size, size, size * 0.15); ctx.fill();
      ctx.fillStyle = '#5a2e20';
      ctx.strokeStyle = e.boss ? '#d9a93b' : '#2a1a12';
      ctx.lineWidth = e.boss ? 3 : 1.5;
      roundRect(p.x - half, p.y - half, size, size, size * 0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f5f0e1';
      ctx.font = FONT(size * 0.6, 700);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.ch, p.x, p.y - 1);
      // 血条
      var bw = size * 1.1, bh = Math.max(3, cell * 0.07);
      var bx = p.x - bw / 2, by = p.y + half + 2;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      roundRect(bx, by, bw, bh, 2); ctx.fill();
      ctx.fillStyle = '#e04a3a';
      roundRect(bx, by, Math.max(0, bw * (e.hp / e.maxHp)), bh, 2); ctx.fill();
      if (e.stunT > 0) {
        ctx.fillStyle = '#8a6d1f';
        ctx.font = FONT(cell * 0.24, 700);
        ctx.textAlign = 'center';
        ctx.fillText('晕', p.x + half * 0.6, p.y - half * 0.8);
      }
      ctx.restore();
    }
  }

  function drawBullets(b) {
    for (var i = 0; i < b.bullets.length; i++) {
      var bl = b.bullets[i];
      var p = { x: bl.x * L.cellW, y: bl.y * L.cellH };
      var cell = Math.min(L.cellW, L.cellH);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(bl.ang || 0);
      ctx.fillStyle = bl.gold ? '#b8860b' : '#3a3126';
      if (bl.arrow) {
        ctx.fillRect(-cell * 0.18, -cell * 0.03, cell * 0.3, cell * 0.06);
        ctx.fillStyle = '#c8c8d0';
        ctx.beginPath();
        ctx.moveTo(cell * 0.12, -cell * 0.07); ctx.lineTo(cell * 0.26, 0); ctx.lineTo(cell * 0.12, cell * 0.07);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, cell * (bl.gold ? 0.09 : 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawEffects(b) {
    var effs = Game.Effects.list;
    for (var i = 0; i < effs.length; i++) {
      var e = effs[i];
      var p = { x: e.col * L.cellW, y: e.row * L.cellH };
      var t = e.age / e.life;
      var cell = Math.min(L.cellW, L.cellH);
      switch (e.type) {
        case 'puff':
          ctx.fillStyle = 'rgba(26,26,26,' + (0.28 * (1 - t)) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, cell * (0.15 + t * 0.3) * e.size, 0, Math.PI * 2); ctx.fill();
          break;
        case 'burst':
          ctx.fillStyle = 'rgba(168,59,45,' + (0.5 * (1 - t)) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, cell * (0.2 + t * 0.9) * e.size, 0, Math.PI * 2); ctx.fill();
          break;
        case 'text':
          ctx.globalAlpha = Math.max(0, 1 - t);
          ctx.fillStyle = e.color;
          ctx.font = FONT(Math.max(10, cell * 0.26), 700);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(e.str, p.x, p.y - t * cell * 0.9);
          ctx.globalAlpha = 1;
          break;
        case 'slash':
          ctx.strokeStyle = e.color;
          ctx.globalAlpha = 1 - t;
          ctx.lineWidth = cell * 0.1;
          ctx.beginPath();
          ctx.moveTo(p.x - cell * 0.8, p.y);
          ctx.lineTo(p.x + cell * 0.8, p.y);
          ctx.stroke();
          ctx.lineWidth = 1; ctx.globalAlpha = 1;
          break;
        case 'stun':
          ctx.strokeStyle = 'rgba(201,162,39,' + (0.8 * (1 - t)) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, cell * (0.2 + t * 0.25), 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 1;
          break;
        case 'wash':
          ctx.fillStyle = e.color;
          ctx.globalAlpha = e.alpha * (1 - t);
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
          break;
      }
    }
  }

  function drawHighlights(b) {
    var cell = Math.min(L.cellW, L.cellH);
    // 部署选中/拖拽中：高亮可放空地
    var dragging = Game.State.getDrag && Game.State.getDrag();
    if (b.selCard >= 0 || dragging) {
      for (var i = 0; i < b.buildP.length; i++) {
        var c = b.buildP[i][0], r = b.buildP[i][1];
        if (b.P.units[Game.Battle.key(c, r)]) continue;
        var p = cellPx(c, r);
        ctx.fillStyle = 'rgba(201,162,39,.18)';
        roundRect(p.x - L.cellW / 2, p.y - L.cellH / 2, L.cellW, L.cellH, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(201,162,39,.8)';
        ctx.lineWidth = 2;
        roundRect(p.x - L.cellW / 2, p.y - L.cellH / 2, L.cellW, L.cellH, 5); ctx.stroke();
      }
    }
    // 铲地模式：高亮可解锁空地
    if (b.unlockMode) {
      for (var c2 = 0; c2 < b.cols; c2++) {
        for (var r2 = Math.floor(b.rows / 2); r2 < b.rows; r2++) {
          if (b.cellType[Game.Battle.key(c2, r2)] !== 'block') continue;
          var p2 = cellPx(c2, r2);
          ctx.fillStyle = 'rgba(63,157,79,.20)';
          roundRect(p2.x - L.cellW / 2, p2.y - L.cellH / 2, L.cellW, L.cellH, 5); ctx.fill();
          ctx.strokeStyle = 'rgba(63,157,79,.8)';
          ctx.lineWidth = 2;
          roundRect(p2.x - L.cellW / 2, p2.y - L.cellH / 2, L.cellW, L.cellH, 5); ctx.stroke();
        }
      }
    }
    // 神兵符选目标：高亮我方单位
    if (b.uiSel && b.uiSel.mode === 'unit') {
      for (var k in b.P.units) {
        var cr = k.split('_');
        var p3 = cellPx(+cr[0], +cr[1]);
        ctx.strokeStyle = 'rgba(201,162,39,.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p3.x, p3.y, cell * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  return {
    init: function (cv) { canvas = cv; ensureSize(); preloadFonts(); },
    draw: draw,
    getLayout: function () { return L; }
  };
})();
