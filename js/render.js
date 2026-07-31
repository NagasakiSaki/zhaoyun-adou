/* render.js —— canvas 战场渲染：布局缓存 / DPR / 字体预加载 / 汉字水墨 */
Game.Render = (function () {
  var CONFIG = window.CONFIG, DATA = window.DATA;
  var canvas = null, ctx = null;
  var W = 0, H = 0, dpr = 1;
  var lastW = 0, lastH = 0;
  var L = { cellW: 0, cellH: 0 };

  function FONT(px, weight) {
    return (weight || 500) + ' ' + px + 'px "KaiTi","STKaiti","楷体","STZhongsong","SimSun",serif';
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

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
    var cw = canvas.clientWidth || W, ch = canvas.clientHeight || H;
    L.cellW = cw / b.cols;
    L.cellH = ch / b.rows;
    W = cw; H = ch;
  }

  function preloadFonts() {
    try {
      if (document.fonts && document.fonts.load) {
        document.fonts.load('16px "KaiTi"').then(function () {});
        document.fonts.load('600 24px "KaiTi"').then(function () {});
      }
    } catch (e) {}
  }

  /* ================= 绘制 ================= */
  function draw(state) {
    var b = state.battle;
    if (!b || !canvas) return;
    ensureSize();
    layout(b);

    ctx.clearRect(0, 0, W, H);
    // 宣纸底
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f5f0e1');
    grad.addColorStop(1, '#ece2c8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    drawGrid(b);
    drawAdou(b);
    drawUnits(b);
    drawProjectiles(b);
    drawEffects(b);
    drawHighlights(b);
    drawSelection(b);
  }

  function cellRect(b, col, row) {
    return { x: col * L.cellW, y: row * L.cellH, w: L.cellW, h: L.cellH };
  }

  function drawGrid(b) {
    var i, j;
    // 中路分界
    for (j = 0; j < b.rows; j++) {
      for (i = 0; i < b.cols; i++) {
        var r = cellRect(b, i, j);
        var cell = b.cells[j][i];
        if (cell.blocked) {
          if ((j === b.rows - 1 && i === b.centerCol) || (j === 0 && i === b.centerCol)) continue; // 阿斗格另行绘制
          ctx.fillStyle = '#2e2822';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.strokeStyle = 'rgba(0,0,0,.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        } else {
          var isPlayerZone = j >= b.playerZoneMin;
          var isEnemyZone = j <= b.enemyZoneMax;
          ctx.fillStyle = isPlayerZone ? 'rgba(59,74,107,.06)' : (isEnemyZone ? 'rgba(168,59,45,.05)' : 'rgba(0,0,0,.015)');
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.strokeStyle = 'rgba(26,26,26,.08)';
          ctx.lineWidth = 1;
          ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        }
      }
    }
  }

  function drawAdou(b) {
    drawAdouOne(b, 'player', b.rows - 1);
    drawAdouOne(b, 'enemy', 0);
  }
  function drawAdouOne(b, who, row) {
    var col = b.centerCol;
    var r = cellRect(b, col, row);
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    var size = Math.min(r.w, r.h) * 0.72;
    var adou = b.adou[who];
    var isPlayer = who === 'player';
    // 底座
    ctx.fillStyle = isPlayer ? '#3b4a6b' : '#7c2a1e';
    roundRect(cx - size / 2, cy - size / 2, size, size, 8);
    ctx.fill();
    ctx.strokeStyle = isPlayer ? '#2a3550' : '#5a1e14';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 阿斗
    ctx.fillStyle = '#f5f0e1';
    ctx.font = FONT(size * 0.42, 700);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('阿斗', cx, cy - 1);
    // 血条
    var bw = r.w * 0.8, bh = Math.max(4, r.h * 0.08);
    var bx = cx - bw / 2, by = cy + size / 2 + 3;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    roundRect(bx, by, bw, bh, 2); ctx.fill();
    ctx.fillStyle = isPlayer ? '#3b7bd0' : '#c1492f';
    roundRect(bx, by, Math.max(0, bw * (adou.hp / adou.maxHp)), bh, 2); ctx.fill();
  }

  function drawUnits(b) {
    for (var i = 0; i < b.units.length; i++) {
      var u = b.units[i];
      if (u.hp <= 0) continue;
      drawUnit(b, u);
    }
  }

  function drawUnit(b, u) {
    var x = u.col * L.cellW + L.cellW / 2;
    var y = u.row * L.cellH + L.cellH / 2;
    var cell = Math.min(L.cellW, L.cellH);
    var size = cell * (u.isBoss ? 0.9 : u.isHero ? 0.72 : 0.62);
    var half = size / 2;
    var rcol = CONFIG.RARITY_COLOR[u.rarity] || '#ececec';
    var isPlayer = u.side === 'player';

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    roundRect(x - half + 2, y - half + 3, size, size, size * 0.16);
    ctx.fill();

    // 底
    ctx.fillStyle = isPlayer ? '#fbf7ec' : '#3a3228';
    roundRect(x - half, y - half, size, size, size * 0.16);
    ctx.fill();
    // 稀有度描边
    ctx.strokeStyle = rcol;
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.stroke();
    // 内墨线
    ctx.strokeStyle = isPlayer ? 'rgba(26,26,26,.5)' : 'rgba(245,240,225,.5)';
    ctx.lineWidth = 1;
    roundRect(x - half + 2.5, y - half + 2.5, size - 5, size - 5, size * 0.1);
    ctx.stroke();

    // 无敌金光
    if (u.invincibleUntil > b.time) {
      ctx.strokeStyle = 'rgba(201,162,39,.9)';
      ctx.lineWidth = 3;
      roundRect(x - half - 2, y - half - 2, size + 4, size + 4, size * 0.18);
      ctx.stroke();
    }
    // 眩晕
    if (u.stunUntil > b.time) {
      ctx.fillStyle = 'rgba(201,162,39,.25)';
      roundRect(x - half, y - half, size, size, size * 0.16);
      ctx.fill();
    }

    // 文字
    var label = u.isHero ? u.heroDef.name : (DATA.UNITS[u.kind] ? DATA.UNITS[u.kind].ch : u.kind);
    ctx.fillStyle = isPlayer ? '#1a1a1a' : '#f5f0e1';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = FONT(size * (u.isHero ? 0.46 : 0.68), u.isHero ? 700 : 600);
    ctx.fillText(label, x, y - 1);

    // 等级
    if (u.level > 1) {
      ctx.font = FONT(Math.max(9, cell * 0.2), 700);
      ctx.fillStyle = rcol;
      ctx.fillText(u.level, x + half - cell * 0.09, y - half + cell * 0.12);
    }

    // 护盾
    if (u.shield > 0) {
      ctx.strokeStyle = 'rgba(59,74,107,.9)';
      ctx.lineWidth = 2;
      roundRect(x - half - 1.5, y - half - 1.5, size + 3, size + 3, size * 0.16);
      ctx.stroke();
    }

    // 血条
    var bw = size * 0.92, bh = Math.max(3, cell * 0.07);
    var bx = x - bw / 2, by = y + half + 2;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    roundRect(bx, by, bw, bh, 2); ctx.fill();
    ctx.fillStyle = isPlayer ? '#3f9d4f' : '#c1492f';
    roundRect(bx, by, Math.max(0, bw * (u.hp / u.maxHp)), bh, 2); ctx.fill();
  }

  function drawProjectiles(b) {
    for (var i = 0; i < b.projectiles.length; i++) {
      var p = b.projectiles[i];
      var x = p.col * L.cellW + L.cellW / 2;
      var y = p.row * L.cellH + L.cellH / 2;
      var isLance = p.heroSkill === 'lance' || p.heroSkill === 'bounce';
      var size = isLance ? Math.min(L.cellW, L.cellH) * 0.2 : Math.min(L.cellW, L.cellH) * 0.13;
      ctx.fillStyle = p.side === 'player' ? '#1a1a1a' : '#7c2a1e';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      // 尾迹
      ctx.fillStyle = 'rgba(26,26,26,.18)';
      ctx.beginPath();
      ctx.arc(x - (p.side === 'player' ? -1 : 1) * size * 1.6, y, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEffects(b) {
    var effs = Game.Effects.list;
    for (var i = 0; i < effs.length; i++) {
      var e = effs[i];
      var x = e.col * L.cellW + L.cellW / 2;
      var y = e.row * L.cellH + L.cellH / 2;
      var t = e.age / e.life;
      var cell = Math.min(L.cellW, L.cellH);
      switch (e.type) {
        case 'puff': {
          ctx.fillStyle = 'rgba(26,26,26,' + (0.28 * (1 - t)) + ')';
          ctx.beginPath();
          ctx.arc(x, y, cell * (0.15 + t * 0.3) * e.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'burst': {
          var r = cell * (0.2 + t * 0.9) * e.size;
          ctx.fillStyle = 'rgba(168,59,45,' + (0.5 * (1 - t)) + ')';
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(26,26,26,' + (0.35 * (1 - t)) + ')';
          ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'text': {
          ctx.globalAlpha = Math.max(0, 1 - t);
          ctx.fillStyle = e.color;
          ctx.font = FONT(Math.max(10, cell * 0.26), 700);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(e.str, x, y - t * cell * 0.9);
          ctx.globalAlpha = 1;
          break;
        }
        case 'slash': {
          ctx.strokeStyle = e.color;
          ctx.globalAlpha = 1 - t;
          ctx.lineWidth = cell * 0.1;
          ctx.beginPath();
          ctx.moveTo(x - cell * 0.8, y);
          ctx.lineTo(x + cell * 0.8, y);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
          break;
        }
        case 'stun': {
          ctx.strokeStyle = 'rgba(201,162,39,' + (0.8 * (1 - t)) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, cell * (0.2 + t * 0.25), 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
          break;
        }
        case 'wash': {
          ctx.fillStyle = e.color;
          ctx.globalAlpha = e.alpha * (1 - t);
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
  }

  function drawHighlights(b) {
    // 选中的兵营槽位 → 高亮可放置格
    if (b.selBench >= 0 && b.bench[b.selBench]) {
      for (var j = 0; j < b.rows; j++) {
        for (var i = 0; i < b.cols; i++) {
          if (Game.Battle.canPlace(b, i, j)) {
            var r = cellRect(b, i, j);
            ctx.fillStyle = 'rgba(201,162,39,.16)';
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeStyle = 'rgba(201,162,39,.7)';
            ctx.lineWidth = 2;
            ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
          }
        }
      }
    }
    // 神兵符选目标
    if (b.uiSel && b.uiSel.mode === 'unit') {
      for (var k = 0; k < b.units.length; k++) {
        var u = b.units[k];
        if (u.hp <= 0 || u.side !== 'player') continue;
        var x = u.col * L.cellW + L.cellW / 2;
        var y = u.row * L.cellH + L.cellH / 2;
        ctx.strokeStyle = 'rgba(201,162,39,.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, Math.min(L.cellW, L.cellH) * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawSelection(b) {
    // 已放置单位也可回显选中（简单脉冲）
    if (b.uiSel && b.uiSel.mode === 'unit') {
      var t = performance.now() / 400;
      ctx.strokeStyle = 'rgba(201,162,39,' + (0.5 + 0.4 * Math.sin(t)) + ')';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
    }
  }

  return {
    init: function (cv) {
      canvas = cv;
      ensureSize();
      preloadFonts();
    },
    draw: draw,
    getLayout: function () { return L; }
  };
})();
