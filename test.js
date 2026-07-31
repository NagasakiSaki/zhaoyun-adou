/* 冒烟测试：路径塔防新模型 */
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
['config','data','utils','save','effects','render','state','battle','ai','ui','main'].forEach(f=>{(0,eval)(fs.readFileSync(path.join(__dirname,'js',f+'.js'),'utf8'));});

let passed=0,failed=0;
function check(name,cond,extra){ if(cond){passed++;console.log('  ✓ '+name);} else {failed++;console.log('  ✗ '+name+(extra?' → '+extra:''));} }

Game.State.init(); Game.UI.init();
const meta = Game.State.state.meta;
meta.dailyMapIndex = 0;
meta.dailyBuffKey = null;

console.log('== 地图与开局 ==');
Game.State.newRun('campaign');
let b = Game.State.state.battle;
check('战局创建', !!b && b.rows===CONFIG.ROWS && b.cols===CONFIG.COLS);
check('路径长度>8', b.pathP.length>8, 'len='+b.pathP.length);
check('初始建造格≥8', b.buildP.length>=8, 'n='+b.buildP.length);
check('敌军路径为镜像', b.pathE.length===b.pathP.length && b.pathE[0][0]===CONFIG.COLS-1-b.pathP[0][0] && b.pathE[0][1]===CONFIG.ROWS-1-b.pathP[0][1]);
check('出怪口在路径起点', b.cellType[Game.Battle.key(b.pathP[0][0],b.pathP[0][1])]==='path');
check('守将红心', b.P.hearts===CONFIG.ECON.hearts);

console.log('== 征兵（整手重抽） ==');
const m0 = b.P.mantou;
Game.State.recruit();
check('馒头扣费', b.P.mantou < m0);
check('手牌≥3张(合成后)', b.P.bench.filter(Boolean).length>=3, 'n='+b.P.bench.filter(Boolean).length);
const cost = Game.Battle.recruitCost(b.P);
Game.State.recruit();
check('二次征兵可再抽', b.P.mantou < m0 - CONFIG.ECON.recruitBase && b.P.recruitCount>=1);
// 手牌合成
b.P.bench = [{kind:'s',ch:'刀',lv:1},{kind:'s',ch:'刀',lv:1},{kind:'s',ch:'弓',lv:1},null,null];
Game.Battle.autoMergeBench(b,b.P);
check('手牌自动合成', b.P.bench.filter(Boolean).length===2 && b.P.bench.some(x=>x&&x.kind==='s'&&x.ch==='刀'&&x.lv===2));

console.log('== 部署与合成 ==');
const cell = b.buildP[0];
const cardIdx = b.P.bench.findIndex(x=>x&&x.kind==='s');
Game.State.onBenchTap(cardIdx);
let res = Game.Battle.placeCard(b, cardIdx, cell[0], cell[1]);
check('放置士兵', res==='placed' && b.P.units[Game.Battle.key(cell[0],cell[1])]);
// 再放一个同字同级到同一格 → 合成
b.P.bench = [{kind:'s',ch:'刀',lv:2},null,null,null,null];
const sameCell = b.buildP[0];
const res2 = Game.Battle.placeCard(b, 0, sameCell[0], sameCell[1]);
check('同格合成升级', res2==='merged' && b.P.units[Game.Battle.key(sameCell[0],sameCell[1])].lv===3);

console.log('== 铲子逐格解锁 ==');
let blockCell=null;
outer: for(let c=0;c<b.cols;c++) for(let r=Math.floor(b.rows/2);r<b.rows;r++){
  if(b.cellType[Game.Battle.key(c,r)]==='block'){ blockCell=[c,r]; break outer; }
}
check('存在可解锁空地', !!blockCell);
const beforeBuild = b.buildP.length;
check('铲子解锁一格', Game.Battle.canUnlock(b,blockCell[0],blockCell[1]) && Game.Battle.unlockCell(b,blockCell[0],blockCell[1]) && b.buildP.length===beforeBuild+1);

console.log('== 武将拼字 ==');
b.P.bench = [{kind:'f',ch:'赵'},{kind:'f',ch:'云'},null,null,null];
Game.Battle.autoMergeBench(b,b.P);
let avail = Game.Battle.availableHeroes(b);
check('可觉醒赵云', avail.indexOf('赵云')>=0, JSON.stringify(avail));
Game.Battle.combineHero(b,'赵云');
check('武将入席', b.P.bench.some(x=>x&&x.kind==='g'&&x.name==='赵云'));
// 放武将上阵
const gidx = b.P.bench.findIndex(x=>x&&x.kind==='g');
let placed=false;
for(let i=0;i<b.buildP.length;i++){ const cc=b.buildP[i]; if(!b.P.units[Game.Battle.key(cc[0],cc[1])]){ const rr=Game.Battle.placeCard(b,gidx,cc[0],cc[1]); if(rr!=='fail'){placed=true;break;} } }
check('武将上阵', placed);

console.log('== 战斗推进 ==');
function runSeconds(bb, sec){ for(let s=0;s<sec;s++){ for(let i=0;i<60;i++) Game.Battle.update(bb,1/60); if(bb.result) break; } }
// 把己方所有建造格铺满强兵
b.P.bench = new Array(5).fill(null).map(()=>({kind:'s',ch:'弓',lv:3,cd:0}));
for(let i=0;i<b.buildP.length;i++){
  const idx=b.P.bench.findIndex(x=>x);
  if(idx<0) break;
  const cc=b.buildP[i];
  if(b.P.units[Game.Battle.key(cc[0],cc[1])]) continue;
  Game.Battle.placeCard(b, idx, cc[0], cc[1]);
}
runSeconds(b, 60);
check('战斗有推进', b.time>5);
check('敌人沿路推进过', b.wave>0 || b.enemies.length>0 || b.P.hearts<CONFIG.ECON.hearts, 'wave='+b.wave+' enemies='+b.enemies.length);
check('波次有进展', b.wave>=1 || b.result, 'wave='+b.wave);
check('未崩溃', true);

console.log('== 主线可通关 ==');
Game.State.state.battle=null; Game.State.state.mode=null;
Game.State.newRun('campaign');
b = Game.State.state.battle;
// 全部上弓兵3级，铺满
for(let i=0;i<5;i++) b.P.bench[i]={kind:'s',ch:'弓',lv:3,cd:0};
for(let i=0;i<b.buildP.length;i++){
  const idx=b.P.bench.findIndex(x=>x);
  if(idx<0) break;
  Game.Battle.placeCard(b, idx, b.buildP[i][0], b.buildP[i][1]);
}
runSeconds(b, 180);
const r = b.result;
console.log('   结果: '+(r?(r.win?'WIN':'LOSE'):'RUNNING')+' wave='+b.wave+' hearts='+b.P.hearts);
check('主线第一关通关', r && r.win, JSON.stringify(r));

console.log('== 竞技（AI） ==');
Game.State.state.battle=null; Game.State.state.mode=null;
Game.State.newRun('arena');
b = Game.State.state.battle;
check('AI有手牌', b.E.bench.filter(Boolean).length===5);
for(let i=0;i<5;i++) b.P.bench[i]={kind:'s',ch:'弓',lv:3,cd:0};
for(let i=0;i<b.buildP.length;i++){
  const idx=b.P.bench.findIndex(x=>x);
  if(idx<0) break;
  Game.Battle.placeCard(b, idx, b.buildP[i][0], b.buildP[i][1]);
}
runSeconds(b, 300);
const ar = b.result;
check('竞技双方互攻有胜负', !!ar && ar.win, 'win='+(ar?ar.win:'none')+' Phearts='+b.P.hearts+' Ehearts='+b.E.hearts+' wave='+b.wave);

console.log('\n通过 '+passed+' 项，失败 '+failed+' 项');
process.exit(failed?1:0);
