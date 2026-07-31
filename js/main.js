/* main.js —— 启动器：载档 → init → route → rAF 主循环 → resize/visibility */
(function () {
  var Game = window.Game;
  var last = 0;

  function loop(ts) {
    requestAnimationFrame(loop);
    try {
      if (!last) last = ts;
      var dt = (ts - last) / 1000;
      last = ts;
      if (dt > 0.1) dt = 0.1;
      Game.Effects.update(dt);
      var st = Game.State.state;
      if (st.battle) {
        Game.Battle.update(st.battle, dt);
        Game.Render.draw(st);
        if (!st._hud || ts - st._hud > 120) {
          st._hud = ts;
          Game.UI.updateHud();
        }
      }
    } catch (e) {
      // 任何一帧异常都不允许卡死游戏
      if (window.__errCount) window.__errCount++; else window.__errCount = 1;
      if (window.__errCount <= 5) console.error('[loop]', e);
    }
  }

  function boot() {
    try {
      window.addEventListener('error', function (ev) {
        var msg = ev && ev.message ? ev.message : '未知错误';
        if (Game.UI && Game.UI.toast) Game.UI.toast('出错：' + msg);
        console.error(ev);
      });
      Game.Audio.init();
      Game.State.init();
      Game.UI.init();
      var cv = document.getElementById('battle-canvas');
      Game.Render.init(cv);
      document.addEventListener('pointerdown', function () { Game.Audio.unlock(); }, { once: true });
      document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
      Game.UI.route('home');
      requestAnimationFrame(loop);
    } catch (e) {
      console.error(e);
      document.body.innerHTML = '<div style="padding:40px;font-size:16px;line-height:2">启动出错：' + (e && e.message ? e.message : e) + '</div>';
    }
  }

  document.addEventListener('visibilitychange', function () {
    var st = Game.State.state;
    if (document.hidden && st.battle && !st.battle.result) {
      Game.UI.applyPause(true);
    }
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    boot();
  } else {
    window.addEventListener('load', boot);
  }
})();
