// Independent mobile exploration rules. No visited-map history is retained.
export const ORIGIN={x:800,y:800},CHUNK_SIZE=384;
const views=new WeakMap(),maps=new WeakMap();
export const exploring=game=>game.worldVersion===2;
export const radialDistance=point=>Math.hypot(point.x-ORIGIN.x,point.y-ORIGIN.y);
export const areaLevel=point=>1+Math.floor(radialDistance(point)/900);
export const areaScale=point=>1+radialDistance(point)/1800;
export function gateLocation(index){const angle=(index-1)*.65,radius=index*900;return {x:ORIGIN.x+Math.cos(angle)*radius,y:ORIGIN.y+Math.sin(angle)*radius};}
export function newExploration(){return {gate:1,previous:null};}
export function validExploration(value){return value&&Number.isSafeInteger(value.gate)&&value.gate>=1&&value.gate<=100000&&(value.previous===null||value.previous&&['x','y'].every(k=>Number.isFinite(value.previous[k])&&Math.abs(value.previous[k])<=1e8));}
export function setWorldView(game,halfWidth,halfHeight){views.set(game,{x:Math.max(100,Math.min(1600,halfWidth)),y:Math.max(100,Math.min(1600,halfHeight))});}
export function worldView(game){return views.get(game)||{x:300,y:650};}
export function inView(game,point,pad=0){const v=worldView(game);return Math.abs(point.x-game.player.x)<=v.x+pad&&Math.abs(point.y-game.player.y)<=v.y+pad;}
function hash(x,y){let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;}
function chunk(x,y){
 const n=hash(x,y),o={x:x*CHUNK_SIZE+90+n%130,y:y*CHUNK_SIZE+80+(n>>>8)%140,w:42+(n>>>16)%30,h:42+(n>>>24)%30};
 const center={x:o.x+o.w/2,y:o.y+o.h/2};
 // Leave landmarks accessible, including checkpoints not yet reached.
 if(radialDistance(center)<170)return [];
 const ring=Math.round(radialDistance(center)/900);
 for(let i=Math.max(1,ring-1);i<=ring+1;i++){const p=gateLocation(i);if(Math.hypot(center.x-p.x,center.y-p.y)<150)return [];}
 return [o];
}
export function residentMap(game){
 const v=worldView(game),p=game.player,left=Math.floor((p.x-v.x)/CHUNK_SIZE),right=Math.floor((p.x+v.x)/CHUNK_SIZE),top=Math.floor((p.y-v.y)/CHUNK_SIZE),bottom=Math.floor((p.y+v.y)/CHUNK_SIZE);
 const key=[left,right,top,bottom].join(':');let cached=maps.get(game);if(cached?.key===key)return cached;
 const chunks=new Map(),obstacles=[];
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){const id=`${x}:${y}`,objects=cached?.chunks.get(id)||chunk(x,y);chunks.set(id,objects);obstacles.push(...objects);}
 cached={key,chunks,obstacles};maps.set(game,cached);return cached;
}
export function releaseOutsideView(game){
 residentMap(game);
 for(const key of ['enemies','projectiles','enemyShots','gems','effects','texts'])game[key]=game[key].filter(e=>inView(game,e,e.r||0));
 if(!game.enemies.some(e=>e.type==='boss'&&e.hp>0)){game.bossSpawned=false;game.bossId=null;}
}
export function explorationGuides(game){if(!exploring(game))return [];return [
 {id:'origin-direction',label:'시작점',point:ORIGIN},
 {id:'next-gate-direction',label:`다음 수문장 ${game.exploration.gate}`,point:game.currentBoss()||gateLocation(game.exploration.gate)},
 ...(game.exploration.previous?[{id:'previous-gate-direction',label:'이전 수문장 · 처치',point:game.exploration.previous}]:[])
 ];}
