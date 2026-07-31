/* 冒烟测试：路径塔防 + 拖拽 + 相邻觉醒 + 金手指 */
'use strict';
const fs = require('fs'); const path = require('path');
function FakeEl(id){this.id=id||'';this.children=[];this.innerHTML='';this.textContent='';this.className='';this.clientWidth=360;this.clientHeight=600;this.style={};this.dataset={};this.disabled=false;}
FakeEl.prototype.querySelector=function(){return new FakeEl();};FakeEl.prototype.querySelectorAll=function(){return [];};
FakeEl.prototype.addEventListener=function(){};FakeEl.prototype.removeEventListener=function(){};FakeEl.prototype.appendChild=function(c){return c;};
FakeEl.prototype.removeChild=function(){};FakeEl.prototype.remove=function(){};FakeEl.prototype.setPointerCapture=function(){};
FakeEl.prototype.classList={add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}};
FakeEl.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:360,height:600};};
FakeEl.prototype.getContext=function(){return new Proxy({},{get:function(t,p){return p==='canvas'?null:function(){}},set:function(){return true;}});};
const store={};global.localStorage={getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
global.window=global;global.addEventListener=function(){};
global.document={readyState:'loading',fonts:{load:function(){return Promise.resolve();}},getElementById:function(id){return new FakeEl(id);},createElement:function(){return new FakeEl();},addEventListener:function(){},body:{appendChild:function(){},style:{}}};
global.performance={now:function(){return Date.now();}};global.setTimeout=function(){};
['config','data','utils','save','cheat','effects','render','state','battle','ai','ui','main'].forEach(f=>{(0,eval)(fs.readFileSync(path.join(__dirname,'js',f+'.js'),'utf8'));});

let passed=0,failed=0;
function check(name,cond,extra){ if(cond){passed++;console.log('  ✓ '+name);} else {failed++;console.log('  ✗ '+name+(extra?' → '+extra:''));} }

Game.State.init(); Game.UI.init();
const meta = Game.State.state.meta;
meta.dailyMapIndex = 0;
meta.dailyBuffKey = null;

console.log('== 地图与开局 ==');
Game.State.newRun('campaign');
let b = Game.State.state.battle;
check('战局创建', !!b && b.rows===CONFIG.ROWS);
check('路径>8 / 建造格≥8', b.pathP.length>8 && b.buildP.length>=8);
check('守将红心', b.P.hearts===CONFIG.ECON.hearts);

console.log('== 征兵整手重抽 ==');
const m0=b.P.mantou;
Game.State.recruit();
check('扣费+满手', b.P.mantou<m0 && b.P.bench.filter(Boolean).length>=3);

console.log('== 拖拽落子 dropUnit ==');
// 清空战场，准备一块空地
const cell=b.buildP[0];
b.P.bench[0]={kind:'s',ch:'弓',lv:1,cd:0};
let res=Game.Battle.dropUnit(b,b.P.bench[0],'b0',cell[0],cell[1]);
check('放置士兵', res==='placed' && b.P.units[Game.Battle.key(cell[0],cell[1])]);
// 同格合并
b.P.bench[0]={kind:'s',ch:'弓',lv:1,cd:0};
res=Game.Battle.dropUnit(b,b.P.bench[0],'b0',cell[0],cell[1]);
check('同格合成升级', res==='merged' && b.P.units[Game.Battle.key(cell[0],cell[1])].lv===2);

console.log('== 武将相邻觉醒 ==');
// 找两个相邻的建造格
let ca=b.buildP[1], cb=null;
for(let i=0;i<b.buildP.length;i++){
  const p=b.buildP[i];
  if((p[0]===ca[0]+1 && p[1]===ca[1])||(p[0]===ca[0]-1 && p[1]===ca[1])||(p[0]===ca[0] && p[1]===ca[1]+1)||(p[0]===ca[0] && p[1]===ca[1]-1)){ cb=p; break; }
}
if(cb){
  // 左 赵 / 右 云
  const left = ca[0] < cb[0] || (ca[0]===cb[0] && ca[1]<cb[1]) ? ca : cb;
  const right = left===ca ? cb : ca;
  b.P.bench[0]={kind:'f',ch:'赵',lv:0,cd:0};
  Game.Battle.dropUnit(b,b.P.bench[0],'b0',left[0],left[1]);
  b.P.bench[0]={kind:'f',ch:'云',lv:0,cd:0};
  res=Game.Battle.dropUnit(b,b.P.bench[0],'b0',right[0],right[1]);
  const lu=b.P.units[Game.Battle.key(left[0],left[1])];
  const ru=b.P.units[Game.Battle.key(right[0],right[1])];
  check('相邻觉醒赵云', res==='hero' && lu && lu.kind==='g' && lu.name==='赵云' && ru && ru.kind==='g' && ru.half!=null, 'res='+res);
  // 拆分半身
  const frag=Game.Battle.unlinkGeneral(b,b.P,Game.Battle.key(left[0],left[1]));
  const other=b.P.units[Game.Battle.key(right[0],right[1])];
  check('拆分后半身变碎片', frag && frag.kind==='f' && other.kind==='f');
  // 重新放回
  b.P.units[Game.Battle.key(left[0],left[1])]=Game.Battle.makeFrag('赵',1);
} else {
  console.log('  - 无相邻建造格，跳过');
}

console.log('== 铲子逐格解锁 ==');
let blockCell=null;
outer: for(let c=0;c<b.cols;c++) for(let r=Math.floor(b.rows/2);r<b.rows;r++){
  if(b.cellType[Game.Battle.key(c,r)]==='block'){ blockCell=[c,r]; break outer; }
}
const beforeBuild=b.buildP.length;
check('铲子解锁一格', !!blockCell && Game.Battle.unlockCell(b,blockCell[0],blockCell[1]) && b.buildP.length===beforeBuild+1);

console.log('== 战斗推进 ==');
function runSeconds(bb,sec){ for(let s=0;s<sec;s++){ for(let i=0;i<60;i++) Game.Battle.update(bb,1/60); if(bb.result) break; } }
b.P.bench = new Array(5).fill(null).map(()=>({kind:'s',ch:'弓',lv:3,cd:0}));
for(let i=0;i<b.buildP.length;i++){
  const idx=b.P.bench.findIndex(x=>x);
  if(idx<0) break;
  Game.Battle.dropUnit(b,b.P.bench[idx],'b'+idx,b.buildP[i][0],b.buildP[i][1]);
}
runSeconds(b,60);
check('战斗推进/波次', b.time>5 && b.wave>=1, 'wave='+b.wave);

console.log('== 主线通关 ==');
Game.State.state.battle=null; Game.State.state.mode=null;
Game.State.newRun('campaign');
b=Game.State.state.battle;
for(let i=0;i<5;i++) b.P.bench[i]={kind:'s',ch:'弓',lv:3,cd:0};
for(let i=0;i<b.buildP.length;i++){ const idx=b.P.bench.findIndex(x=>x); if(idx<0)break; Game.Battle.dropUnit(b,b.P.bench[idx],'b'+idx,b.buildP[i][0],b.buildP[i][1]); }
runSeconds(b,180);
const r=b.result;
check('主线第一关通关', r&&r.win, JSON.stringify(r));

console.log('== 竞技 ==');
Game.State.state.battle=null; Game.State.state.mode=null;
Game.State.newRun('arena');
b=Game.State.state.battle;
for(let i=0;i<5;i++) b.P.bench[i]={kind:'s',ch:'弓',lv:3,cd:0};
for(let i=0;i<b.buildP.length;i++){ const idx=b.P.bench.findIndex(x=>x); if(idx<0)break; Game.Battle.dropUnit(b,b.P.bench[idx],'b'+idx,b.buildP[i][0],b.buildP[i][1]); }
runSeconds(b,300);
const ar=b.result;
check('竞技分出胜负', !!ar, 'win='+(ar?ar.win:'none')+' P='+b.P.hearts+' E='+b.E.hearts);

console.log('== 金手指 ==');
meta.cheat = { enabled:true, startMantou:200, enemyHpMul:0.5, dmgMul:2, hearts:10, recruitFree:true };
Game.State.state.battle=null; Game.State.state.mode=null;
Game.State.newRun('campaign');
b=Game.State.state.battle;
check('开局馒头覆盖', b.P.mantou===200);
check('红心覆盖', b.P.hearts===10);
check('征兵免费', Game.Battle.recruitCost(b,b.P)===0);
check('己方伤害倍率', Game.Battle.unitStats({kind:'s',ch:'弓',lv:1},'P',b).dmg > DATA.SOLDIERS['弓'].dmg*1.9);
// 触发一波，检查敌方血量倍率
Game.Battle.doRecruit(b,b.P,true);
b.waveState='idle'; b.restTimer=0;
for(let i=0;i<60;i++) Game.Battle.update(b,1/60);
const spawnHp = b.enemies.length ? b.enemies[0].maxHp : null;
check('敌方血量倍率生效', spawnHp!=null && spawnHp < DATA.ENEMIES.zei.hp, 'hp='+spawnHp);

console.log('\n通过 '+passed+' 项，失败 '+failed+' 项');
process.exit(failed?1:0);
