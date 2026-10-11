export const FLOORS = [
 {name:'망각의 문',subtitle:'잊힌 자들이 깨어나는 곳',color:'#638477'},
 {name:'균열의 회랑',subtitle:'돌 틈에서 번지는 혼돈',color:'#678592'},
 {name:'불씨의 성소',subtitle:'꺼지지 않는 잿빛 불꽃',color:'#aa7857'},
 {name:'침묵의 심연',subtitle:'빛을 삼키는 오래된 그림자',color:'#827091'},
 {name:'혼돈의 왕좌',subtitle:'탑의 마지막 수문장',color:'#ae925d'}
];
export const HEROES = {
 knight:{name:'기사',role:'근접 · 생존',icon:'sword',color:'#cbae73',hp:140,damage:23,speed:172,interval:.62,range:100},
 mage:{name:'술사',role:'원거리 · 광역',icon:'flame',color:'#86b9aa',hp:100,damage:20,speed:180,interval:.75,range:390},
 ranger:{name:'추적자',role:'속사 · 기동',icon:'bolt',color:'#92b2cf',hp:110,damage:15,speed:205,interval:.38,range:430}
};
export const SKILLS = [
 {id:'power',name:'강철의 의지',icon:'sword',tags:['모든 공격','피해'],max:5,description:'공격 피해 +20%',color:'#cbae73'},
 {id:'haste',name:'시간의 균열',icon:'bolt',tags:['기본 공격','공격 속도'],max:5,description:'기본 공격 간격 −10%',color:'#92b2cf'},
 {id:'fire',name:'잿불 고리',icon:'flame',tags:['화염','광역','주기 공격'],max:5,description:'3초마다 주변 적에게 26 피해 · 레벨마다 +26',color:'#dd9463'},
 {id:'ice',name:'서리 파동',icon:'gem',tags:['냉기','제어','주기 공격'],max:5,description:'4초마다 주변 적에게 15 피해 · 2초 둔화',color:'#88c6d5'},
 {id:'lightning',name:'연쇄 번개',icon:'bolt',tags:['번개','연쇄','주기 공격'],max:5,description:'2초마다 최대 3마리에게 30 피해 · 레벨마다 +1 대상',color:'#bda2de'},
 {id:'orbit',name:'수호의 칼날',icon:'shield',tags:['물리','지속','근접'],max:4,description:'회전 칼날 +1 · 접촉 시 18 피해',color:'#cbae73'},
 {id:'magnet',name:'영혼의 인력',icon:'gem',tags:['수집','경험치'],max:4,description:'수집 반경 +35 · 경험치 +15%',color:'#86b9aa'},
 {id:'vitality',name:'불굴의 심장',icon:'shield',tags:['생존','회복'],max:4,description:'최대 체력 +25 · 체력 35 회복',color:'#d46d66'},
 {id:'crit',name:'꿰뚫는 시선',icon:'sword',tags:['모든 공격','치명타'],max:4,description:'치명타 확률 +10% · 치명타 피해 2배',color:'#d3b668'}
];
export const SLOT_NAMES={weapon:'무기',armor:'방어구',charm:'부적'};
export const RARITIES=['일반','고급','희귀','영웅','전설'];
export const UPGRADES = [
 {id:'power',name:'영혼의 힘',icon:'sword',desc:'기본 공격력 +8%',max:10},
 {id:'health',name:'수호의 맹세',icon:'shield',desc:'시작 체력 +12',max:10},
 {id:'fortune',name:'탑의 축복',icon:'gem',desc:'전투 파편 보상 +10%',max:10}
];
export const costFor = level => 60 + level * 45;
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function seededRandom(seed=Date.now()) {let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
export function defaultProfile(){return {version:1,gold:0,unlocked:1,selectedHero:'knight',selectedFloor:1,upgrades:{power:0,health:0,fortune:0},inventory:[],equipped:{weapon:null,armor:null,charm:null},settings:{sound:false,quality:'auto',leftHanded:false,shake:true,strategy:'balanced'},best:{kills:0,clears:0},run:null};}
export function loadProfile(raw){
 const p=defaultProfile(); if(!raw||raw.version!==1) return p;
 p.gold=clamp(Number(raw.gold)||0,0,1e8);p.unlocked=clamp(Math.floor(Number(raw.unlocked)||1),1,5);
 p.selectedHero=HEROES[raw.selectedHero]?raw.selectedHero:'knight';p.selectedFloor=clamp(Number(raw.selectedFloor)||1,1,p.unlocked);
 for(const u of UPGRADES)p.upgrades[u.id]=clamp(Math.floor(Number(raw.upgrades?.[u.id])||0),0,u.max);
 p.inventory=Array.isArray(raw.inventory)?raw.inventory.filter(i=>i&&SLOT_NAMES[i.slot]&&Number.isFinite(i.value)&&i.value>=0&&typeof i.name==='string'&&typeof i.id==='string'&&Number.isInteger(i.rarity)&&i.rarity>=0&&i.rarity<5).slice(-100):[];
 for(const slot of Object.keys(SLOT_NAMES))p.equipped[slot]=p.inventory.find(i=>i.id===raw.equipped?.[slot]&&i.slot===slot)?.id||null;
 p.settings={...p.settings,...raw.settings};if(!['auto','low','high'].includes(p.settings.quality))p.settings.quality='auto';
 if(!['balanced','survival','attack','farming'].includes(p.settings.strategy))p.settings.strategy='balanced';
 p.best={kills:Math.max(0,Number(raw.best?.kills)||0),clears:Math.max(0,Number(raw.best?.clears)||0)};
 p.run=raw.run&&raw.run.version===1?raw.run:null;return p;
}
export function equippedStats(profile){const stats={damage:0,hp:0,crit:0};for(const slot of Object.keys(SLOT_NAMES)){const i=profile.inventory.find(i=>i.id===profile.equipped[slot]);if(i){if(slot==='weapon')stats.damage+=i.value;if(slot==='armor')stats.hp+=i.value;if(slot==='charm')stats.crit+=i.value/100;}}return stats;}
export function makeLoot(floor,rng=Math.random,forceRare=false){
 const roll=rng(),rarity=forceRare?Math.min(4,2+Math.floor(rng()*3)):roll>.98?4:roll>.9?3:roll>.68?2:roll>.35?1:0;
 const slot=['weapon','armor','charm'][Math.floor(rng()*3)],prefix=['낡은','깨어난','서리빛','심연의','여명의'][rarity];
 const base=slot==='weapon'?4:slot==='armor'?10:3;
 return {id:`${Date.now().toString(36)}-${Math.floor(rng()*1e9).toString(36)}`,name:`${prefix} ${slot==='weapon'?'검':slot==='armor'?'갑주':'인장'}`,slot,rarity,value:Math.round(base*(1+rarity*.55+floor*.18)*(1+rng()*.3)),floor};
}
export function grantRewards(profile,run){
 if(run.state!=='won'&&run.state!=='lost')return false;
 if(run.rewarded)return false;run.rewarded=true;
 profile.gold+=run.gold+ (run.state==='won'?60*run.floor:15);
 profile.inventory.push(...run.loot);const worn=new Set(Object.values(profile.equipped));const protectedItems=profile.inventory.filter(i=>worn.has(i.id));profile.inventory=[...protectedItems,...profile.inventory.filter(i=>!worn.has(i.id)).slice(-(100-protectedItems.length))];
 if(run.state==='won'){profile.unlocked=Math.max(profile.unlocked,Math.min(5,run.floor+1));profile.best.clears++;}
 profile.best.kills=Math.max(profile.best.kills,run.kills);profile.run=null;return true;
}
export class Game {
 constructor(profile,options={}){
  this.rng=options.rng||Math.random;this.floor=options.floor||profile.selectedFloor;this.hero=options.hero||profile.selectedHero;
  const h=HEROES[this.hero],gear=equippedStats(profile);
  this.player={x:800,y:800,r:15,hp:h.hp+profile.upgrades.health*12+gear.hp,maxHp:h.hp+profile.upgrades.health*12+gear.hp,damage:h.damage*(1+profile.upgrades.power*.08)+gear.damage,speed:h.speed,crit:.05+gear.crit,face:0,invulnerable:0};
  this.autoStrategy=profile.settings.strategy||'balanced';this.decisionLog=[];
  this.fortune=1+profile.upgrades.fortune*.1;this.state='playing';this.time=0;this.duration=90;this.kills=0;this.gold=0;this.level=1;this.xp=0;this.nextXp=8;
  this.skills={};this.enemies=[];this.projectiles=[];this.enemyShots=[];this.gems=[];this.effects=[];this.texts=[];this.loot=[];this.choices=[];
  this.spawnClock=0;this.attackClock=.2;this.skillClocks={fire:1,ice:2,lightning:1,orbit:.4};this.dashCd=0;this.novaCd=0;this.dashTime=0;this.dashDir={x:1,y:0};this.pendingLevels=0;this.rerolls=1;this.bossSpawned=false;this.bossId=null;this.id=0;this.rewarded=false;this.event=null;this.damageFlash=0;
 }
 static restore(profile,snapshot){
  if(!snapshot||snapshot.version!==1||!HEROES[snapshot.hero]||!['playing','choosing'].includes(snapshot.state)||!snapshot.player||!Number.isFinite(snapshot.player.hp)||snapshot.player.hp<=0||!Number.isFinite(snapshot.time)||snapshot.time<0||snapshot.floor<1||snapshot.floor>5||!Array.isArray(snapshot.enemies))return null;
  const arrays=['projectiles','enemyShots','gems','loot','choices'];if(arrays.some(k=>!Array.isArray(snapshot[k])))return null;
  if(!Number.isInteger(snapshot.floor)||!Number.isFinite(snapshot.player.maxHp)||snapshot.player.maxHp<=0||['x','y','damage','speed','crit','face','invulnerable'].some(k=>!Number.isFinite(snapshot.player[k])))return null;
  if(!snapshot.skills||SKILLS.some(s=>snapshot.skills[s.id]!==undefined&&(!Number.isInteger(snapshot.skills[s.id])||snapshot.skills[s.id]<0||snapshot.skills[s.id]>s.max)))return null;
  if(snapshot.state==='choosing'&&(!snapshot.choices.length||snapshot.choices.some(id=>!SKILLS.some(s=>s.id===id))))return null;
  if(['enemies','projectiles','enemyShots','gems'].some(k=>snapshot[k].some(o=>!o||!Number.isFinite(o.x)||!Number.isFinite(o.y))))return null;
  const game=new Game(profile);for(const key of Object.keys(game)){if(key!=='rng'&&snapshot[key]!==undefined)game[key]=snapshot[key];}if(!['balanced','survival','attack','farming'].includes(game.autoStrategy))game.autoStrategy='balanced';game.decisionLog=Array.isArray(game.decisionLog)?game.decisionLog.filter(d=>d&&typeof d.id==='string'&&typeof d.reason==='string').slice(-200):[];game.event=null;game.effects=[];game.texts=[];return game;
 }
 snapshot(){const o={version:1};for(const k of Object.keys(this))if(k!=='rng'&&k!=='event')o[k]=this[k];return JSON.parse(JSON.stringify(o));}
 spawn(kind){
  const boss=kind==='boss',elite=kind==='elite',angle=this.rng()*Math.PI*2,p=this.player;
  const x=clamp(p.x+Math.cos(angle)*(boss?310:420+this.rng()*100),40,1560),y=clamp(p.y+Math.sin(angle)*(boss?310:420+this.rng()*100),40,1560);
  const f=this.floor,progress=this.time/this.duration,type=kind|| (this.rng()<.22?'runner':this.rng()<.3?'caster':'grunt');
  const hp=boss?650+f*250:elite?100+f*50: (type==='runner'?18:28)*(1+f*.25+progress*.7);
  const enemy={id:++this.id,x,y,r:boss?35:elite?24:type==='runner'?12:16,hp,maxHp:hp,type,speed:boss?48:elite?62:type==='runner'?102: type==='caster'?46:60,damage:boss?18+f*3:elite?10+f:4+f*2,slow:0,hit:0,cooldown:boss?2.5:2+this.rng()*2,telegraph:0,targetX:0,targetY:0};
  this.enemies.push(enemy);if(boss){this.bossId=enemy.id;this.bossSpawned=true;this.event='boss';}return enemy;
 }
 nearest(range=Infinity){let nearest=null,d=range;for(const e of this.enemies)if(e.hp>0&&distance(e,this.player)<d){d=distance(e,this.player);nearest=e;}return nearest;}
 addEffect(type,x,y,r,color,life=.4,angle=0){this.effects.push({type,x,y,r,color,life,maxLife:life,angle});}
 damageEnemy(e,amount,critAllowed=true){
  if(e.hp<=0)return;const crit=critAllowed&&this.rng()<this.player.crit+(this.skills.crit||0)*.1;
  const dmg=amount*(1+(this.skills.power||0)*.2)*(crit?2:1);e.hp-=dmg;e.hit=.1;
  if(this.texts.length<35)this.texts.push({x:e.x,y:e.y-18,text:String(Math.round(dmg)),color:crit?'#e8c67d':'#c8d4c7',life:.6,maxLife:.6});
  if(e.hp<=0){this.kills++;if(this.kills%15===0&&this.player.hp>0){this.player.hp=Math.min(this.player.maxHp,this.player.hp+12);this.addEffect('ring',this.player.x,this.player.y,40,'#86b9aa',.4);}this.gold+=Math.round((e.type==='boss'?25:e.type==='elite'?10:1)*this.fortune);this.gems.push({x:e.x,y:e.y,value:e.type==='elite'?6:1});
   if(e.type==='elite')this.loot.push(makeLoot(this.floor,this.rng));
   if(e.type==='boss'){this.loot.push(makeLoot(this.floor,this.rng,true));if(this.player.hp>0&&this.state==='playing'){this.state='won';this.event='won';}}
   this.addEffect('death',e.x,e.y,e.r,'#8ea899',.35);
  }
 }
 hitPlayer(damage){if(this.player.invulnerable>0||this.state!=='playing')return;this.player.hp=Math.max(0,this.player.hp-damage);this.player.invulnerable=.65;this.damageFlash=.18;this.event='hit';if(this.player.hp<=0){this.state='lost';this.event='lost';}}
 attack(){
  const p=this.player,h=HEROES[this.hero],target=this.nearest(h.range);if(!target)return;
  const a=Math.atan2(target.y-p.y,target.x-p.x);p.face=a;
  if(this.hero==='knight'){
   this.addEffect('slash',p.x,p.y,105,'#d8bc7e',.25,a);
   for(const e of this.enemies)if(distance(e,p)<h.range+e.r&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-a),Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-a)))<1.5){this.damageEnemy(e,p.damage);e.x+=Math.cos(a)*12;e.y+=Math.sin(a)*12;}
  }else this.projectiles.push({x:p.x,y:p.y,vx:Math.cos(a)*490,vy:Math.sin(a)*490,r:this.hero==='mage'?8:4,damage:p.damage,life:1.1,aoe:this.hero==='mage'?60:0,color:h.color});
 }
 gainXp(value){this.xp+=value*(1+(this.skills.magnet||0)*.15);while(this.xp>=this.nextXp){this.xp-=this.nextXp;this.level++;this.nextXp=Math.round(this.nextXp*1.18+3);this.pendingLevels++;}if(this.pendingLevels&&this.state==='playing')this.offerChoices();}
 offerChoices(){const pool=SKILLS.filter(s=>(this.skills[s.id]||0)<s.max);if(!pool.length){this.pendingLevels=0;this.player.hp=Math.min(this.player.maxHp,this.player.hp+25);return;}for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}this.choices=pool.slice(0,3).map(s=>s.id);this.state='choosing';this.event='level';}
 choose(id){if(this.state!=='choosing'||!this.choices.includes(id))return false;this.skills[id]=(this.skills[id]||0)+1;if(id==='vitality'){this.player.maxHp+=25;this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);}this.pendingLevels=Math.max(0,this.pendingLevels-1);this.state='playing';this.choices=[];if(this.pendingLevels)this.offerChoices();return true;}
 reroll(){if(this.state!=='choosing'||!this.rerolls)return false;this.rerolls--;this.offerChoices();return true;}
 dash(input={x:0,y:0}){if(this.state!=='playing'||this.dashCd>0)return false;let {x,y}=input;const mag=Math.hypot(x,y);if(mag){x/=mag;y/=mag;}else{x=Math.cos(this.player.face);y=Math.sin(this.player.face);}this.dashDir={x,y};this.dashTime=.18;this.dashCd=3;this.player.invulnerable=.4;this.addEffect('ring',this.player.x,this.player.y,45,'#ced8b8',.3);return true;}
 nova(){if(this.state!=='playing'||this.novaCd>0)return false;this.novaCd=12;this.player.invulnerable=.4;this.addEffect('ring',this.player.x,this.player.y,240,'#d5ae71',.7);for(const e of this.enemies)if(distance(e,this.player)<240){this.damageEnemy(e,100+this.level*7);const a=Math.atan2(e.y-this.player.y,e.x-this.player.x);e.x+=Math.cos(a)*55;e.y+=Math.sin(a)*55;}return true;}
 update(delta,input={x:0,y:0}){
  if(this.state!=='playing')return;const dt=clamp(delta,0,.05),p=this.player;this.time+=dt;this.event=null;
  for(const k of ['dashCd','novaCd','dashTime','damageFlash'])this[k]=Math.max(0,this[k]-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
  const mag=Math.hypot(input.x,input.y),mx=mag>1?input.x/mag:input.x,my=mag>1?input.y/mag:input.y;
  if(mag>.05)p.face=Math.atan2(my,mx);
  p.x=clamp(p.x+(this.dashTime>0?this.dashDir.x*670:mx*p.speed)*dt,35,1565);p.y=clamp(p.y+(this.dashTime>0?this.dashDir.y*670:my*p.speed)*dt,35,1565);
  this.spawnClock-=dt;
  if(this.time<this.duration&&this.spawnClock<=0&&this.enemies.length<100){this.spawn(this.time>20&&Math.floor(this.time)%23===0?'elite':undefined);this.spawnClock=Math.max(.22,1.1-this.time*.006-this.floor*.07);}
  if(this.time>=this.duration&&!this.bossSpawned){this.enemies=[];this.enemyShots=[];p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.2);this.spawn('boss');}
  if(this.bossSpawned&&this.time>=this.duration+60&&this.state==='playing'){this.state='lost';this.event='lost';return;}
  this.attackClock-=dt;if(this.attackClock<=0){this.attack();this.attackClock=HEROES[this.hero].interval*Math.pow(.9,this.skills.haste||0);}
  if(this.state!=='playing')return;
  for(const e of this.enemies){
   if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.cooldown-=dt;
   if(e.telegraph>0){e.telegraph-=dt;if(e.telegraph<=0){this.addEffect('ring',e.targetX,e.targetY,95,'#d96b62',.45);if(distance(p,{x:e.targetX,y:e.targetY})<95)this.hitPlayer(e.damage*1.5);}}
   else{const d=distance(e,p)||1;if(e.type!=='caster'||d>235){e.x+=(p.x-e.x)/d*e.speed*(e.slow>0?.38:1)*dt;e.y+=(p.y-e.y)/d*e.speed*(e.slow>0?.38:1)*dt;}
    if(e.type==='boss'&&e.cooldown<=0){e.targetX=p.x;e.targetY=p.y;e.telegraph=1.1;e.cooldown=3.1;for(let i=0;i<8;i++){const a=i*Math.PI/4+this.time;this.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*115,vy:Math.sin(a)*115,r:7,damage:13,life:4});}}
    if(e.type==='caster'&&e.cooldown<=0){const a=Math.atan2(p.y-e.y,p.x-e.x);this.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*145,vy:Math.sin(a)*145,r:5,damage:e.damage,life:3.5});e.cooldown=3;}
   }if(distance(e,p)<e.r+p.r)this.hitPlayer(e.damage);
  }
  if(this.state==='lost')return;
  for(const bullet of this.projectiles){bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;bullet.life-=dt;for(const e of this.enemies)if(e.hp>0&&distance(e,bullet)<e.r+bullet.r){if(bullet.aoe){this.addEffect('ring',bullet.x,bullet.y,bullet.aoe,bullet.color,.25);for(const target of this.enemies)if(distance(target,bullet)<bullet.aoe)this.damageEnemy(target,bullet.damage);}else this.damageEnemy(e,bullet.damage);bullet.life=0;break;}}
  for(const b of this.enemyShots){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(distance(b,p)<b.r+p.r){this.hitPlayer(b.damage);b.life=0;}}
  for(const id of ['fire','ice','lightning','orbit']){
   const lv=this.skills[id]||0;this.skillClocks[id]-=dt;if(!lv||this.skillClocks[id]>0)continue;
   if(id==='fire'){this.addEffect('ring',p.x,p.y,125+lv*10,'#dd9463',.5);for(const e of this.enemies)if(distance(e,p)<125+lv*10)this.damageEnemy(e,26*lv);this.skillClocks[id]=3;}
   if(id==='ice'){this.addEffect('ring',p.x,p.y,180,'#88c6d5',.6);for(const e of this.enemies)if(distance(e,p)<180){this.damageEnemy(e,15*lv);e.slow=2;}this.skillClocks[id]=4;}
   if(id==='lightning'){const enemies=this.enemies.filter(e=>e.hp>0&&distance(e,p)<400).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,2+lv);let prev=p;for(const e of enemies){this.effects.push({type:'bolt',x:prev.x,y:prev.y,x2:e.x,y2:e.y,life:.22,maxLife:.22,color:'#bda2de'});this.damageEnemy(e,30*lv);prev=e;}this.skillClocks[id]=2;}
   if(id==='orbit'){for(let i=0;i<lv;i++){const a=this.time*2.8+i*Math.PI*2/lv,orb={x:p.x+Math.cos(a)*75,y:p.y+Math.sin(a)*75};for(const e of this.enemies)if(distance(e,orb)<e.r+17)this.damageEnemy(e,18);}this.skillClocks[id]=.25;}
  }
  for(const gem of this.gems){const d=distance(gem,p),radius=125+(this.skills.magnet||0)*35;if(d<radius){gem.x+=(p.x-gem.x)/(d||1)*350*dt;gem.y+=(p.y-gem.y)/(d||1)*350*dt;}if(d<20){this.gainXp(gem.value);gem.value=0;}}
  // Aggregate distant experience instead of silently discarding progression.
  if(this.gems.length>350){const combined=this.gems.splice(0,this.gems.length-300);this.gems.push({x:combined[0].x,y:combined[0].y,value:combined.reduce((s,g)=>s+g.value,0)});}
  this.enemies=this.enemies.filter(e=>e.hp>0);this.projectiles=this.projectiles.filter(b=>b.life>0);this.enemyShots=this.enemyShots.filter(b=>b.life>0);this.gems=this.gems.filter(g=>g.value>0);
  for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0).slice(-80);
  for(const t of this.texts){t.life-=dt;t.y-=22*dt;}this.texts=this.texts.filter(t=>t.life>0);
 }
}
