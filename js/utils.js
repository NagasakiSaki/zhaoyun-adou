/* utils.js —— 工具函数 + 合成音 */
window.Game = window.Game || {};
Game.Utils = (function () {
  var uidSeq = 1;
  return {
    uid: function () { return 'u' + (uidSeq++); },
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    hashStr: function (s) {
      var h = 2166136261 >>> 0;
      for (var i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h >>> 0;
    },
    mulberry32: function (seed) {
      var a = seed >>> 0;
      return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    },
    weightedPick: function (weights, rnd) {
      rnd = rnd || Math.random;
      var total = 0, keys = Object.keys(weights);
      for (var i = 0; i < keys.length; i++) total += weights[keys[i]];
      var r = rnd() * total;
      for (var j = 0; j < keys.length; j++) {
        r -= weights[keys[j]];
        if (r <= 0) return keys[j];
      }
      return keys[keys.length - 1];
    },
    pick: function (arr, rnd) {
      rnd = rnd || Math.random;
      return arr[Math.floor(rnd() * arr.length)];
    },
    shuffle: function (arr, rnd) {
      rnd = rnd || Math.random;
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    deepClone: function (o) { return JSON.parse(JSON.stringify(o)); },
    esc: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    todayStr: function () {
      var d = new Date();
      var m = d.getMonth() + 1, day = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
    },
    // 统一指针交互：绑定 down/move/up，返回解绑函数
    bindPointer: function (elm, opts) {
      var onDown = opts.onDown, onMove = opts.onMove, onUp = opts.onUp;
      var active = false, pid = null;
      function pos(e) {
        var r = elm.getBoundingClientRect();
        return {
          x: (e.clientX - r.left),
          y: (e.clientY - r.top),
          sx: e.clientX, sy: e.clientY,
          rect: r
        };
      }
      function down(e) {
        if (pid !== null) return;
        pid = e.pointerId;
        active = true;
        elm.setPointerCapture && elm.setPointerCapture(pid);
        if (onDown) onDown(pos(e), e);
      }
      function move(e) {
        if (!active || e.pointerId !== pid) return;
        if (onMove) onMove(pos(e), e);
      }
      function up(e) {
        if (e.pointerId !== pid) return;
        var p = pos(e);
        active = false; pid = null;
        if (onUp) onUp(p, e);
      }
      elm.addEventListener('pointerdown', down);
      elm.addEventListener('pointermove', move);
      elm.addEventListener('pointerup', up);
      elm.addEventListener('pointercancel', up);
      return function () {
        elm.removeEventListener('pointerdown', down);
        elm.removeEventListener('pointermove', move);
        elm.removeEventListener('pointerup', up);
        elm.removeEventListener('pointercancel', up);
      };
    }
  };
})();

/* ---------- 合成音（WebAudio，静默失败） ---------- */
Game.Audio = (function () {
  var ctx = null, enabled = true, master = null;
  var lastPlay = {};
  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) { return false; }
    return true;
  }
  function tone(freq, dur, type, vol, when) {
    if (!ctx || !master) return;
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    click: function () { tone(520, 0.06, 'triangle', 0.12); tone(680, 0.05, 'triangle', 0.08, 0.02); },
    recruit: function () { tone(380, 0.1, 'triangle', 0.16); tone(570, 0.12, 'triangle', 0.12, 0.06); },
    merge: function () { tone(440, 0.08, 'sine', 0.18); tone(660, 0.1, 'sine', 0.14, 0.05); tone(880, 0.12, 'sine', 0.1, 0.1); },
    hero: function () { tone(392, 0.14, 'sine', 0.2); tone(523, 0.14, 'sine', 0.18, 0.08); tone(659, 0.2, 'sine', 0.16, 0.16); },
    hit: function () { tone(180, 0.05, 'square', 0.08); },
    kill: function () { tone(150, 0.12, 'sawtooth', 0.1); tone(90, 0.16, 'sawtooth', 0.1, 0.04); },
    skill: function () { tone(300, 0.18, 'sawtooth', 0.14); tone(450, 0.22, 'sawtooth', 0.1, 0.08); },
    adouHit: function () { tone(120, 0.2, 'sawtooth', 0.2); tone(80, 0.3, 'sawtooth', 0.2, 0.08); },
    win: function () { tone(523, 0.15, 'triangle', 0.2); tone(659, 0.15, 'triangle', 0.2, 0.12); tone(784, 0.3, 'triangle', 0.2, 0.24); },
    lose: function () { tone(330, 0.2, 'sawtooth', 0.16); tone(247, 0.25, 'sawtooth', 0.16, 0.18); tone(165, 0.4, 'sawtooth', 0.16, 0.4); },
    coin: function () { tone(880, 0.06, 'sine', 0.16); tone(1320, 0.1, 'sine', 0.12, 0.04); }
  };
  return {
    init: function () { if (enabled) ensure(); },
    setEnabled: function (v) { enabled = v; if (v) ensure(); else if (ctx) ctx.suspend && ctx.suspend(); },
    isEnabled: function () { return enabled; },
    play: function (name) {
      if (!enabled) return;
      if (!ensure()) return;
      // 简单节流：同名音效 40ms 内只播一次
      var now = Date.now();
      if (now - (lastPlay[name] || 0) < 40) return;
      lastPlay[name] = now;
      var fn = SFX[name];
      if (fn) fn();
    },
    unlock: function () {
      if (!enabled) return;
      if (ensure() && ctx && ctx.state === 'suspended') ctx.resume();
    }
  };
})();
