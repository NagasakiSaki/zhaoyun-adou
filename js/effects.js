/* effects.js —— 水墨粒子/飘字/全屏晕染（坐标基于网格，渲染时换算像素） */
Game.Effects = (function () {
  var list = [];

  function add(e) { list.push(e); }

  return {
    update: function (dt) {
      for (var i = list.length - 1; i >= 0; i--) {
        var e = list[i];
        e.age += dt;
        if (e.age >= e.life) list.splice(i, 1);
      }
    },
    get list() { return list; },
    clear: function () { list.length = 0; },

    hit: function (col, row) {
      add({ type: 'puff', col: col, row: row, age: 0, life: 0.26, color: '#4a443d', size: 1 });
    },
    kill: function (col, row, big) {
      add({ type: 'burst', col: col, row: row, age: 0, life: big ? 0.65 : 0.4, color: '#a83b2d', size: big ? 2.2 : 1.2 });
      add({ type: 'puff', col: col, row: row, age: 0, life: 0.3, color: '#1a1a1a', size: 1 });
    },
    text: function (col, row, str, color) {
      add({ type: 'text', col: col, row: row, age: 0, life: 0.75, str: str, color: color || '#a83b2d' });
    },
    burst: function (col, row, color, size) {
      add({ type: 'burst', col: col, row: row, age: 0, life: 0.5, color: color || '#a83b2d', size: size || 1 });
    },
    slash: function (col, row, color) {
      add({ type: 'slash', col: col, row: row, age: 0, life: 0.38, color: color || '#1a1a1a' });
    },
    screenWash: function (color, alpha) {
      add({ type: 'wash', col: 0, row: 0, age: 0, life: 0.6, color: color || '#1a1a1a', alpha: alpha || 0.28 });
    },
    stun: function (col, row) {
      add({ type: 'stun', col: col, row: row, age: 0, life: 0.9 });
    },
    heroSummon: function (col, row) {
      add({ type: 'burst', col: col, row: row, age: 0, life: 0.7, color: '#c9a227', size: 2.4 });
      add({ type: 'puff', col: col, row: row, age: 0, life: 0.5, color: '#c9a227', size: 1.4 });
    }
  };
})();
