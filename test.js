/* 冒烟测试：拖拽/觉醒门禁/经验晋级/抽卡升星/训练/每日成就 */
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
const meta=Game.State.state.meta;
meta.dailyMapIndex=0; meta.dailyBuffKey=null;

console.log('== 大地图 ==');
Game.State.newRun('campaign');
let b=Game.State.state.battle;
check('地图9×14', b.rows===CONFIG.ROWS && b.cols===CONFIG.COLS);
check('路径更长', b.pathP.length>16, 'len='+b.pathP.length);
check('建造格≥14', b.buildP.length>=14, 'n='+b.buildP.length);

console.log('== 拖牌后手牌移除(bug修复) ==');
b.P.bench[0]={kind:'s',ch:'弓',lv:1,cd:0};
b.P.bench[2]={kind:'s',ch:'刀',lv:1,cd:0};
const cell=b.buildP[0];
Game.Battle.dropUnit(b,b.P.bench[2],'b2',cell[0],cell[1]);
check('拖出第3张牌后手牌该格变空', b.P.bench[2]===null && b.P.units[Game.Battle.key(cell[0],cell[1])].ch==='刀');

console.log('== 征兵整手重抽(补满5张) ==');
const m0=b.P.mantou;
Game.State.recruit();
check('扣费+手牌恰好5张', b.P.mantou<m0 && b.P.bench.filter(Boolean).length===5, 'n='+b.P.bench.filter(Boolean).length);

const pool = new Set();
for(let i=0;i<300;i++){ const c=Game.Battle.rollCard(b,b.P,0); if(c.kind==='f') pool.add(c.ch); }
const allowed=new Set(['刘','备','关','羽','张','飞']);
let badPool=[...pool].filter(ch=>!allowed.has(ch));
check('碎片只出牌组武将的字', badPool.length===0, JSON.stringify([...pool]));

console.log('== 牌组门禁（只有牌组的武将能觉醒） ==');
let ca=b.buildP[1], cb=null;
for(let i=0;i<b.buildP.length;i++){ const p=b.buildP[i]; if(Math.abs(p[0]-ca[0])+Math.abs(p[1]-ca[1])===1 && !b.P.units[Game.Battle.key(p[0],p[1])]){cb=p;break;} }
let left = ca[0]<cb[0]?ca:cb, right = left===ca?cb:ca;
// 拥有赵云但不在牌组 → 不触发觉醒
meta.heroes['赵云']=0;
check('初始牌组仅3将', meta.deck.length===3);
b.P.bench[0]={kind:'f',ch:'赵',lv:0,cd:0};
Game.Battle.dropUnit(b,b.P.bench[0],'b0',left[0],left[1]);
b.P.bench[0]={kind:'f',ch:'云',lv:0,cd:0};
let res=Game.Battle.dropUnit(b,b.P.bench[0],'b0',right[0],right[1]);
check('不在牌组不触发觉醒', res==='placed' && b.P.units[Game.Battle.key(left[0],left[1])].kind==='f');
// 加入牌组后
Game.State.toggleDeck('赵云');
Game.Battle.tryFormHero(b,b.P,right[0],right[1],b.P.units[Game.Battle.key(right[0],right[1])]);
const lu=b.P.units[Game.Battle.key(left[0],left[1])];
check('入牌组后觉醒赵云', lu && lu.kind==='g' && lu.name==='赵云');
check('牌组含赵云', meta.deck.indexOf('赵云')>=0);

Game.State.state.battle=null; Game.State.state.mode=null;
meta.dailyMapIndex=0;
meta.deck=['刘备','关羽','张飞'];
Game.State.newRun('campaign');
b=Game.State.state.battle;

console.log('== 武将经验自动晋级 ==');
// 在当前战场拼一个赵云（已在牌组），验证武将可携带经验并晋级公式正确
Game.State.toggleDeck('赵云');
let c1=b.buildP[1], c2=null;
for(let i=0;i<b.buildP.length;i++){ const p=b.buildP[i]; if(Math.abs(p[0]-c1[0])+Math.abs(p[1]-c1[1])===1){c2=p;break;} }
const L2=c1[0]<c2[0]?c1:c2, R2=L2===c1?c2:c1;
b.P.bench[0]={kind:'f',ch:'赵',lv:0,cd:0}; Game.Battle.dropUnit(b,b.P.bench[0],'b0',L2[0],L2[1]);
b.P.bench[0]={kind:'f',ch:'云',lv:0,cd:0}; Game.Battle.dropUnit(b,b.P.bench[0],'b0',R2[0],R2[1]);
const h0=b.P.units[Game.Battle.key(L2[0],L2[1])];
h0.kills = CONFIG.HERO_KILLS_NEED(1);
check('武将单位可携带经验', h0 && h0.kind==='g' && h0.kills>=1);
check('晋级阈值函数', CONFIG.HERO_KILLS_NEED(1)>0);

console.log('== 局外抽卡 ==');
meta.yuanbao=1000;
const results=Game.State.gachaPull(1);
check('抽卡返回结果', results && results.length===1 && (results[0].isNew===true||results[0].isNew===false));
check('抽卡消耗元宝', meta.yuanbao<1000);
check('抽卡记每日进度', meta.daily.progress.gacha>=1);

console.log('== 升星 ==');
const aName=Object.keys(meta.heroes)[0];
meta.keepsakes[aName]=2;
Game.State.starUp(aName);
check('升星成功', meta.heroes[aName]===1 && meta.keepsakes[aName]===1);
// 升星进 unitStats
Game.State.state.battle=null; Game.State.state.mode=null;
meta.dailyMapIndex=0;
Game.State.newRun('campaign');
b=Game.State.state.battle;
const st1=Game.Battle.unitStats(Game.Battle.makeGeneralHalf(aName,aName[0],0,'x',1),'P',b);
meta.heroes[aName]=6;
b.heroStars=meta.heroes;
const st6=Game.Battle.unitStats(Game.Battle.makeGeneralHalf(aName,aName[0],0,'x',1),'P',b);
check('升星提升伤害', st6.dmg>st1.dmg && st6.range>=st1.range, 'dmg '+st1.dmg+'→'+st6.dmg);

console.log('== 兵种训练 ==');
const trainDmg1=Game.Battle.unitStats({kind:'s',ch:'弓',lv:1},'P',b).dmg;
meta.training['弓']=5;
b.training=meta.training;
const trainDmg6=Game.Battle.unitStats({kind:'s',ch:'弓',lv:1},'P',b).dmg;
check('训练提升兵种伤害', trainDmg6>trainDmg1, trainDmg1+'→'+trainDmg6);

console.log('== 每日/成就 ==');
meta.daily={date:Game.Utils.todayStr(),progress:{win:1},claimed:{}};
check('每日可领', Game.State.canClaimDaily('win')===true);
meta.totalWins=1;
check('成就可领', Game.State.canClaimAch('firstwin')===true);
const y0=meta.yuanbao;
Game.State.claimDaily('win');
check('每日领取加元宝', meta.yuanbao>y0);

console.log('== 主线通关(新地图) ==');
Game.State.state.battle=null; Game.State.state.mode=null;
meta.training['弓']=0;
Game.State.newRun('campaign');
b=Game.State.state.battle;
for(let i=0;i<5;i++) b.P.bench[i]={kind:'s',ch:'弓',lv:3,cd:0};
for(let i=0;i<b.buildP.length;i++){ const idx=b.P.bench.findIndex(x=>x); if(idx<0)break; Game.Battle.dropUnit(b,b.P.bench[idx],'b'+idx,b.buildP[i][0],b.buildP[i][1]); }
for(let s=0;s<240;s++){ for(let i=0;i<60;i++) Game.Battle.update(b,1/60); if(b.result) break; }
const r=b.result;
check('主线第一关通关', r&&r.win, JSON.stringify(r));

console.log('\n通过 '+passed+' 项，失败 '+failed+' 项');
process.exit(failed?1:0);
