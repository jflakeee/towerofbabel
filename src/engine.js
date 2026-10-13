import {normalizeItem,rollOption,itemStats,defaultAutomation,normalizeAutomation,normalizeMaterials,GEM_DEFS,gemKey,ITEM_BASES,ITEM_PREFIXES} from './content.js';
import {DIFFICULTIES,defaultJourney,normalizeJourney,gameObstacles,moveEntity,clearLine,firstWallTime,segmentCircleTime,safeSpawn,pursue} from './world.js';
export const FLOORS = [
 {name:'망각의 문',subtitle:'잊힌 자들이 깨어나는 곳',color:'#638477'},
 {name:'균열의 회랑',subtitle:'돌 틈에서 번지는 혼돈',color:'#678592'},
 {name:'불씨의 성소',subtitle:'꺼지지 않는 잿빛 불꽃',color:'#aa7857'},
 {name:'침묵의 심연',subtitle:'빛을 삼키는 오래된 그림자',color:'#827091'},
 {name:'혼돈의 왕좌',subtitle:'탑의 마지막 수문장',color:'#ae925d'}
];
export const BOSS_PATTERNS = [
 {name:'문지기의 파동',radius:95,windup:1.1,interval:3.1,shots:8,speed:115},
 {name:'회랑의 나선',radius:80,windup:.9,interval:2.8,shots:12,speed:125},
 {name:'성소의 폭발',radius:135,windup:1.4,interval:3.8,shots:6,speed:155},
 {name:'심연의 추격',radius:105,windup:1,interval:2.6,shots:10,speed:140},
 {name:'왕좌의 혼돈',radius:120,windup:1.2,interval:3,shots:16,speed:130}
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
export const CLASS_SKILLS=[
 {id:'guardian',hero:'knight',requires:'vitality',name:'수호자의 맹세',icon:'shield',tags:['기사','피해 감소'],max:4,description:'불굴의 심장 이후 · 받는 피해 −8%/레벨',color:'#86b9aa'},
 {id:'cleave',hero:'knight',requires:'power',name:'대지 가르기',icon:'sword',tags:['기사','근접'],max:4,description:'강철의 의지 이후 · 근접 사거리 +15/레벨',color:'#cbae73'},
 {id:'focus',hero:'mage',requires:'haste',name:'마력 집중',icon:'gem',tags:['술사','광역'],max:4,description:'시간의 균열 이후 · 폭발 범위 +15 · 공격 간격 −5%/레벨',color:'#86b9aa'},
 {id:'meteor',hero:'mage',requires:'fire',name:'유성 낙하',icon:'flame',tags:['술사','화염'],max:4,description:'잿불 고리 이후 · 3.5초마다 목표 주변 45피해/레벨',color:'#dd9463'},
 {id:'barrage',hero:'ranger',requires:'haste',name:'갈래 화살',icon:'bolt',tags:['추적자','다중 발사'],max:3,description:'시간의 균열 이후 · 추가 화살 +1/레벨 · 각 화살 65%피해',color:'#92b2cf'},
 {id:'pierce',hero:'ranger',requires:'crit',name:'꿰뚫는 화살',icon:'sword',tags:['추적자','관통'],max:3,description:'꿰뚫는 시선 이후 · 화살 관통 +1/레벨',color:'#d3b668'}
];
SKILLS.push(...CLASS_SKILLS);
export function availableSkills(game){return SKILLS.filter(s=>(!s.hero||s.hero===game.hero)&&(!s.requires||(game.skills[s.requires]||0)>0));}
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
export function seededRandom(seed=Date.now()) {let s=seed>>>0;const next=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};next.getState=()=>s;next.setState=v=>{s=v>>>0;};return next;}
// Full end-of-stage builds take precedence; older records fall back to known decisions.
export function recordedSkills(record){
 const full=record?.skills&&typeof record.skills==='object'&&!Array.isArray(record.skills),counts={};
 if(!full)for(const d of record?.decisions||[])if(d&&typeof d.id==='string')counts[d.id]=(counts[d.id]||0)+1;
 const source=full?record.skills:counts;
 return Object.fromEntries(SKILLS.filter(s=>(!s.hero||s.hero===record?.hero)&&Number.isInteger(source[s.id])&&source[s.id]>0).map(s=>[s.id,Math.min(s.max,source[s.id])]));
}
export function defaultProfile(){return {version:2,gold:0,materials:normalizeMaterials(),journey:defaultJourney(),unlocked:1,selectedHero:'knight',selectedFloor:1,upgrades:{power:0,health:0,fortune:0},inventory:[],overflow:[],transactions:[],appliedTransactionIds:[],previousEquipment:null,automation:defaultAutomation(),presets:{knight:[null,null,null],mage:[null,null,null],ranger:[null,null,null]},history:[],rewardIds:[],lockedSlots:{weapon:false,armor:false,charm:false},equipped:{weapon:null,armor:null,charm:null},settings:{sound:false,music:true,quality:'auto',leftHanded:false,shake:true,strategy:'balanced',autoEquip:true,padSize:48,textSize:'normal',damageNumbers:true,effectOpacity:1},best:{kills:0,clears:0},run:null};}
export function loadProfile(raw){
 const p=defaultProfile(); if(!raw||![1,2].includes(raw.version)) return p;
 p.materials=normalizeMaterials(raw.materials);p.journey=normalizeJourney(raw.journey);
 p.gold=clamp(Number(raw.gold)||0,0,1e8);p.unlocked=clamp(Math.floor(Number(raw.unlocked)||1),1,5);
 p.selectedHero=HEROES[raw.selectedHero]?raw.selectedHero:'knight';p.selectedFloor=clamp(Math.floor(Number(raw.selectedFloor)||1),1,p.unlocked);
 for(const u of UPGRADES)p.upgrades[u.id]=clamp(Math.floor(Number(raw.upgrades?.[u.id])||0),0,u.max);
 const valid=i=>i&&SLOT_NAMES[i.slot]&&Number.isFinite(i.value)&&i.value>=0&&typeof i.name==='string'&&typeof i.id==='string'&&Number.isInteger(i.rarity)&&i.rarity>=0&&i.rarity<5;
 p.inventory=[...(Array.isArray(raw.overflow)?raw.overflow:[]),...(Array.isArray(raw.inventory)?raw.inventory:[])].filter(valid).map(normalizeItem);
 p.transactions=Array.isArray(raw.transactions)?raw.transactions.filter(t=>t&&typeof t.id==='string'&&['sell','undo-sale','reset','upgrade','options','auto-upgrade','socket','alchemy','item-enhance','item-reset','reward'].includes(t.type)&&(t.type!=='sell'||(valid(t.item)&&Number.isFinite(t.payout)&&t.payout>=0))).slice(-20):[];
 p.automation=normalizeAutomation(raw.automation);
 for(const hero of Object.keys(HEROES))p.presets[hero]=Array.from({length:3},(_,i)=>{const preset=raw.presets?.[hero]?.[i];return preset&&typeof preset.name==='string'?{name:preset.name.slice(0,40),strategy:['balanced','survival','attack','farming','custom'].includes(preset.strategy)?preset.strategy:'balanced',automation:normalizeAutomation(preset.automation),equipped:Object.fromEntries(Object.keys(SLOT_NAMES).map(slot=>[slot,typeof preset.equipped?.[slot]==='string'?preset.equipped[slot]:null])),lockedSlots:Object.fromEntries(Object.keys(SLOT_NAMES).map(slot=>[slot,preset.lockedSlots?.[slot]===true]))}:null;});
 p.history=Array.isArray(raw.history)?raw.history.filter(r=>r&&typeof r.id==='string'&&HEROES[r.hero]&&['won','lost'].includes(r.state)&&['floor','time','kills','gold'].every(k=>Number.isFinite(r[k]))).slice(-20).map(r=>({...r,skills:r.skills&&typeof r.skills==='object'&&!Array.isArray(r.skills)?recordedSkills(r):undefined,decisions:Array.isArray(r.decisions)?r.decisions.filter(d=>d&&SKILLS.some(s=>s.id===d.id)&&typeof d.reason==='string').slice(-200):[]})):[];p.rewardIds=Array.isArray(raw.rewardIds)?raw.rewardIds.filter(id=>typeof id==='string').slice(-100):[];
 // Only explicit victories establish cleared depth; an unlocked/selected stage is not proof.
 for(const r of p.history)if(r.mode==='chaos'&&r.state==='won'&&Number.isInteger(r.depth)&&r.depth>=1&&r.depth<=20)p.journey.chaosBestCleared=Math.max(p.journey.chaosBestCleared,r.depth);
 p.appliedTransactionIds=[...new Set([...(Array.isArray(raw.appliedTransactionIds)?raw.appliedTransactionIds.filter(id=>typeof id==='string'):[]),...p.transactions.map(t=>t.id)])];
 p.previousEquipment=raw.previousEquipment&&typeof raw.previousEquipment==='object'?raw.previousEquipment:null;
 for(const slot of Object.keys(SLOT_NAMES))p.lockedSlots[slot]=raw.lockedSlots?.[slot]===true;
 for(const slot of Object.keys(SLOT_NAMES))p.equipped[slot]=p.inventory.find(i=>i.id===raw.equipped?.[slot]&&i.slot===slot)?.id||null;
 organizeInventory(p);p.settings={...p.settings,...raw.settings};if(!['auto','low','high'].includes(p.settings.quality))p.settings.quality='auto';
 p.settings.music=p.settings.music!==false;p.settings.autoEquip=p.settings.autoEquip!==false;p.settings.padSize=clamp(Math.round(Number(p.settings.padSize)||48),44,64);p.settings.textSize=p.settings.textSize==='large'?'large':'normal';p.settings.damageNumbers=p.settings.damageNumbers!==false;p.settings.effectOpacity=Number.isFinite(Number(p.settings.effectOpacity))?clamp(Number(p.settings.effectOpacity),.15,1):1;for(const k of ['sound','shake','leftHanded'])p.settings[k]=p.settings[k]===true;
 if(!['balanced','survival','attack','farming','custom'].includes(p.settings.strategy))p.settings.strategy='balanced';
 p.best={kills:Math.max(0,Number(raw.best?.kills)||0),clears:Math.max(0,Number(raw.best?.clears)||0)};
 p.run=raw.run&&[1,2].includes(raw.run.version)?raw.run:null;return p;
}
export function allItems(profile){return [...profile.inventory,...(profile.overflow||[])];}
// Overflow precedes the active bag so repeated organization keeps newest rewards in the bag.
export function organizeInventory(profile){const unique=[...new Map([...(profile.overflow||[]),...(profile.inventory||[])].map(i=>[i.id,i])).values()],worn=new Set(Object.values(profile.equipped));const protectedItems=unique.filter(i=>worn.has(i.id)),rest=unique.filter(i=>!worn.has(i.id));const room=Math.max(0,100-protectedItems.length);profile.inventory=[...protectedItems,...rest.slice(-room)];profile.overflow=rest.slice(0,Math.max(0,rest.length-room));}
export function equippedStats(profile){const stats={damage:0,hp:0,crit:0,haste:0,magnet:0,fortune:0,fire:0,ice:0,lightning:0,echo:0,regen:0,novaHaste:0};for(const slot of Object.keys(SLOT_NAMES)){const i=allItems(profile).find(i=>i.id===profile.equipped[slot]);if(i){const value=itemStats(i);for(const key of Object.keys(stats))stats[key]+=value[key]||0;}}return stats;}
export function makeLoot(floor,rng=Math.random,forceRare=false){
 const roll=rng(),rarity=forceRare?Math.min(4,2+Math.floor(rng()*3)):roll>.98?4:roll>.9?3:roll>.68?2:roll>.35?1:0;
 const slot=['weapon','armor','charm'][Math.floor(rng()*3)],prefix=ITEM_PREFIXES[rarity][Math.floor(rng()*2)];
 const archetype=Math.floor(rng()*ITEM_BASES[slot].length),base=slot==='weapon'?4:slot==='armor'?10:3;
 return normalizeItem({id:`${Date.now().toString(36)}-${Math.floor(rng()*1e9).toString(36)}`,name:`${prefix} ${ITEM_BASES[slot][archetype]}`,archetype,slot,rarity,value:Math.round(base*(1+rarity*.55+floor*.18)*(1+rng()*.3)),floor,options:Array.from({length:rarity>=2?3:2},()=>rollOption(rng))});
}
export function grantRewards(profile,run){
 if(run.state!=='won'&&run.state!=='lost')return false;
 if(run.rewarded||(run.runId&&profile.rewardIds.includes(run.runId)))return false;run.rewarded=true;if(run.runId)profile.rewardIds=[...profile.rewardIds,run.runId].slice(-100);
 profile.gold+=run.gold+ (run.state==='won'?60*run.floor:15);
 for(const gem of run.materialLoot||[]){const key=gemKey(gem);if(key in profile.materials)profile.materials[key]++;}
 profile.inventory.push(...run.loot);organizeInventory(profile);
 if(run.state==='won'){profile.unlocked=Math.max(profile.unlocked,Math.min(5,run.floor+1));profile.best.clears++;if(run.mode==='chaos'){profile.journey=normalizeJourney(profile.journey);profile.journey.chaosBestCleared=Math.max(profile.journey.chaosBestCleared,run.depth||1);profile.journey.chaosMaxDepth=Math.max(profile.journey.chaosMaxDepth,Math.min(20,(Math.floor((run.depth||1)/5)+1)*5));profile.journey.chaosDepth=Math.min(20,(run.depth||1)+1);}else if(run.floor===5){profile.journey.chaosUnlocked=true;profile.journey.chaosMaxDepth=Math.max(5,profile.journey.chaosMaxDepth||1);const rank=Object.keys(DIFFICULTIES).indexOf(run.difficulty||'normal');profile.journey.unlockedDifficulty=Math.min(2,Math.max(profile.journey.unlockedDifficulty,rank+1));}}
 profile.history.push({id:run.runId||`legacy-${Date.now()}`,hero:run.hero,floor:run.floor,state:run.state,time:run.time,kills:run.kills,gold:run.gold+(run.state==='won'?60*run.floor:15),difficulty:run.difficulty||'normal',mode:run.mode||'tower',depth:run.depth||1,materials:structuredClone(run.materialLoot||[]),strategy:run.autoStrategy,skills:structuredClone(run.skills||{}),decisions:structuredClone(run.decisionLog||[]),createdAt:new Date().toISOString()});profile.history=profile.history.slice(-20);profile.best.kills=Math.max(profile.best.kills,run.kills);profile.run=null;return true;
}
let runSequence=0;
export class Game {
 constructor(profile,options={}){
  const seed=options.seed??Math.floor(Math.random()*4294967296);this.rng=options.rng||seededRandom(seed);this.lootRng=seededRandom(seed^0x9e3779b9);this.runId=options.runId||globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${seed.toString(36)}-${++runSequence}`;this.lootCount=0;this.floor=options.floor||profile.selectedFloor;this.hero=options.hero||profile.selectedHero;
  const journey=normalizeJourney(profile.journey);this.mode=journey.mode;this.difficulty=journey.difficulty;this.depth=journey.chaosDepth;if(this.mode==='chaos')this.floor=(this.depth-1)%5+1;this.worldVersion=1;this.appearance=Object.fromEntries(Object.keys(SLOT_NAMES).map(slot=>[slot,structuredClone(allItems(profile).find(i=>i.id===profile.equipped[slot])||null)]));this.materialLoot=[];this.materialCount=0;
  const h=HEROES[this.hero],gear=equippedStats(profile);
  this.player={x:800,y:800,r:15,hp:h.hp+profile.upgrades.health*12+gear.hp,maxHp:h.hp+profile.upgrades.health*12+gear.hp,damage:h.damage*(1+profile.upgrades.power*.08)+gear.damage,speed:h.speed,crit:.05+gear.crit,face:0,invulnerable:0};
  this.gearStats=gear;this.automation=normalizeAutomation(profile.automation);this.nextEliteAt=23;this.targetId=null;
  this.autoStrategy=profile.settings.strategy||'balanced';this.decisionLog=[];
  this.fortune=1+profile.upgrades.fortune*.1+gear.fortune/100;this.state='playing';this.time=0;this.duration=90;this.kills=0;this.gold=0;this.level=1;this.xp=0;this.nextXp=8;
  this.skills={};this.enemies=[];this.projectiles=[];this.enemyShots=[];this.gems=[];this.effects=[];this.texts=[];this.loot=[];this.choices=[];
  this.regenClock=0;this.spawnClock=0;this.attackClock=.2;this.skillClocks={fire:1,ice:2,lightning:1,orbit:.4,meteor:2};this.dashCd=0;this.novaCd=0;this.dashTime=0;this.dashDir={x:1,y:0};this.pendingLevels=0;this.rerolls=1;this.bossSpawned=false;this.bossId=null;this.id=0;this.rewarded=false;this.event=null;this.damageFlash=0;
 }
 static continueStage(profile,previous){
  // Lobby edits apply to a fresh journey, never to the next stage of a saved run.
  const mode=previous.mode==='chaos'||previous.floor===5?'chaos':'tower';
  const journey={...profile.journey,mode,difficulty:previous.difficulty,chaosDepth:previous.mode==='chaos'?Math.min(20,previous.depth+1):1};
  const game=new Game({...profile,journey},{hero:previous.hero,floor:Math.min(5,previous.floor+1)});
  for(const key of ['regenClock','skills','level','xp','nextXp','pendingLevels','rerolls','automation','autoStrategy','attackClock','skillClocks','dashCd','novaCd','dashTime','dashDir'])game[key]=structuredClone(previous[key]);
  // Apply only the equipment difference; do not replay healing or level-up effects.
  const oldGear=previous.gearStats,newGear=game.gearStats;
  game.player.maxHp=previous.player.maxHp-oldGear.hp+newGear.hp;
  game.player.hp=Math.min(previous.player.hp,game.player.maxHp);
  game.player.damage=previous.player.damage-oldGear.damage+newGear.damage;
  game.player.crit=previous.player.crit-oldGear.crit+newGear.crit;
  for(const key of ['speed','face','invulnerable'])game.player[key]=previous.player[key];
  game.fortune=previous.fortune+(newGear.fortune-oldGear.fortune)/100;
  game.rng.setState(previous.rng.getState());game.lootRng.setState(previous.lootRng.getState());
  if(game.pendingLevels)game.offerChoices();
  return game;
 }
 static restore(profile,snapshot){
  if(!snapshot||![1,2].includes(snapshot.version)||!HEROES[snapshot.hero]||!['playing','choosing'].includes(snapshot.state)||!snapshot.player||!Number.isFinite(snapshot.player.hp)||snapshot.player.hp<=0||!Number.isFinite(snapshot.time)||snapshot.time<0||snapshot.floor<1||snapshot.floor>5||!Array.isArray(snapshot.enemies))return null;
  if(!Number.isFinite(snapshot.player.r)||snapshot.player.r<1||snapshot.player.r>60||snapshot.player.speed<0||snapshot.player.speed>1000||snapshot.enemies.length>101)return null;
  const arrays=['projectiles','enemyShots','gems','loot','choices'];if(arrays.some(k=>!Array.isArray(snapshot[k])))return null;
  if(!Number.isInteger(snapshot.floor)||!Number.isFinite(snapshot.player.maxHp)||snapshot.player.maxHp<=0||['x','y','damage','speed','crit','face','invulnerable'].some(k=>!Number.isFinite(snapshot.player[k])))return null;
  if(!snapshot.skills||SKILLS.some(s=>snapshot.skills[s.id]!==undefined&&(!Number.isInteger(snapshot.skills[s.id])||snapshot.skills[s.id]<0||snapshot.skills[s.id]>s.max||s.hero&&s.hero!==snapshot.hero&&snapshot.skills[s.id]>0||s.requires&&snapshot.skills[s.id]>0&&!(snapshot.skills[s.requires]>0))))return null;
  if(snapshot.state==='choosing'&&(!snapshot.choices.length||snapshot.choices.some(id=>!SKILLS.some(s=>s.id===id&&(!s.hero||s.hero===snapshot.hero)&&(!s.requires||(snapshot.skills?.[s.requires]||0)>0)))))return null;
  if(['enemies','projectiles','enemyShots','gems'].some(k=>snapshot[k].some(o=>!o||!Number.isFinite(o.x)||!Number.isFinite(o.y))))return null;
  const numeric=['duration','kills','gold','level','xp','nextXp','fortune','spawnClock','attackClock','dashCd','novaCd','dashTime','pendingLevels','rerolls','id','damageFlash'];if(numeric.some(k=>!Number.isFinite(snapshot[k]))||snapshot.duration<=0||snapshot.level<1||snapshot.nextXp<=0||snapshot.pendingLevels<0)return null;
  if(!snapshot.dashDir||!Number.isFinite(snapshot.dashDir.x)||!Number.isFinite(snapshot.dashDir.y)||!snapshot.skillClocks||['fire','ice','lightning','orbit'].some(k=>!Number.isFinite(snapshot.skillClocks[k])))return null;
  if(snapshot.enemies.some(e=>e?.route&&['x','y','until','px','py'].some(key=>!Number.isFinite(e.route[key]))))return null;
  if(snapshot.enemies.some(e=>e.attackRadius!==undefined&&(!Number.isFinite(e.attackRadius)||e.attackRadius<40||e.attackRadius>200)||e.windup!==undefined&&(!Number.isFinite(e.windup)||e.windup<.2||e.windup>3)))return null;
  if(snapshot.enemies.some(e=>!['grunt','runner','caster','elite','boss'].includes(e.type)||['id','r','hp','maxHp','speed','damage','slow','hit','cooldown','telegraph','targetX','targetY'].some(k=>!Number.isFinite(e[k])))||['projectiles','enemyShots'].some(k=>snapshot[k].some(b=>['vx','vy','r','damage','life'].some(f=>!Number.isFinite(b[f]))))||snapshot.gems.some(g=>!Number.isFinite(g.value)))return null;
  if(snapshot.enemies.some(e=>e.r<1||e.r>60||e.speed<0||e.speed>1000)||snapshot.projectiles.length>500||snapshot.enemyShots.length>1000||snapshot.gems.length>351||['projectiles','enemyShots'].some(k=>snapshot[k].some(b=>Math.abs(b.vx)>5000||Math.abs(b.vy)>5000||b.r<1||b.r>64)))return null;
  if(snapshot.regenClock!==undefined&&(!Number.isFinite(snapshot.regenClock)||snapshot.regenClock<0||snapshot.regenClock>=3))return null;
  const game=new Game(profile);game.difficulty='normal';game.mode='tower';game.depth=1;game.appearance={};for(const key of Object.keys(game)){if(!['rng','lootRng'].includes(key)&&snapshot[key]!==undefined)game[key]=snapshot[key];}if(Number.isInteger(snapshot.rngState))game.rng.setState(snapshot.rngState);if(Number.isInteger(snapshot.lootRngState))game.lootRng.setState(snapshot.lootRngState);game.automation=normalizeAutomation(game.automation);game.gearStats=game.gearStats&&typeof game.gearStats==='object'?game.gearStats:equippedStats(defaultProfile());for(const key of Object.keys(equippedStats(defaultProfile())))if(!Number.isFinite(game.gearStats?.[key]))game.gearStats[key]=0;
  if(!['balanced','survival','attack','farming','custom'].includes(game.autoStrategy))game.autoStrategy='balanced';game.decisionLog=Array.isArray(game.decisionLog)?game.decisionLog.filter(d=>d&&typeof d.id==='string'&&typeof d.reason==='string').slice(-200):[];if(!DIFFICULTIES[game.difficulty])return null;if(!['tower','chaos'].includes(game.mode)||!Number.isInteger(game.depth)||game.depth<1||game.depth>20)return null;game.worldVersion=snapshot.worldVersion===1?1:0;game.appearance=Object.fromEntries(Object.keys(SLOT_NAMES).map(slot=>{const item=game.appearance?.[slot];return [slot,item&&item.slot===slot&&Number.isInteger(item.rarity)&&item.rarity>=0&&item.rarity<=4&&Number.isFinite(item.value)?normalizeItem(item):null];}));game.materialLoot=Array.isArray(game.materialLoot)?game.materialLoot.filter(g=>GEM_DEFS[g?.kind]&&Number.isInteger(g.tier)&&g.tier>=1&&g.tier<=3):[];game.skillClocks.meteor=Number.isFinite(game.skillClocks.meteor)?game.skillClocks.meteor:2;for(const entity of [game.player,...game.enemies])Object.assign(entity,safeSpawn(game,entity.x,entity.y,entity.r));game.event=null;game.effects=[];game.texts=[];return game;
 }
 snapshot(){const o={version:2,rngState:this.rng.getState?.(),lootRngState:this.lootRng.getState?.()};for(const k of Object.keys(this))if(!['rng','lootRng','event'].includes(k))o[k]=this[k];return JSON.parse(JSON.stringify(o));}
 spawn(kind){
  const boss=kind==='boss',elite=kind==='elite',angle=this.rng()*Math.PI*2,p=this.player;
  const x=clamp(p.x+Math.cos(angle)*(boss?310:420+this.rng()*100),40,1560),y=clamp(p.y+Math.sin(angle)*(boss?310:420+this.rng()*100),40,1560);
  const f=this.floor,progress=this.time/this.duration,composition=[[.22,.3],[.28,.35],[.18,.5],[.32,.4],[.35,.5]][f-1],type=kind|| (this.rng()<composition[0]?'runner':this.rng()<composition[1]?'caster':'grunt');
  const hp=boss?650+f*250:elite?100+f*50: (type==='runner'?18:28)*(1+f*.25+progress*.7);
  const difficulty=DIFFICULTIES[this.difficulty],scale=this.mode==='chaos'?1+(this.depth-1)*.08:1;
  const enemy={id:++this.id,x,y,r:boss?35:elite?24:type==='runner'?12:16,hp,maxHp:hp,type,speed:boss?48:elite?62:type==='runner'?102: type==='caster'?46:60,damage:boss?18+f*3:elite?10+f:4+f*2,slow:0,hit:0,cooldown:boss?2.5:2+this.rng()*2,telegraph:0,targetX:0,targetY:0};
  enemy.hp*=difficulty.hp*scale;enemy.maxHp=enemy.hp;enemy.damage*=difficulty.damage*scale;enemy.speed*=difficulty.speed;Object.assign(enemy,safeSpawn(this,x,y,enemy.r));this.enemies.push(enemy);if(boss){this.bossId=enemy.id;this.bossSpawned=true;this.event='boss';}return enemy;
 }
 livingBosses(){return this.enemies.filter(e=>e.type==='boss'&&e.hp>0);}
 currentBoss(){const bosses=this.livingBosses();return bosses.find(e=>e.id===this.bossId)||bosses[0]||null;}
 rollLoot(rare=false){const item=makeLoot(this.floor+DIFFICULTIES[this.difficulty].loot+(this.mode==='chaos'?Math.floor(this.depth/4):0),this.lootRng,rare);item.id=`${this.runId}-loot-${++this.lootCount}`;return item;}
 nearest(range=Infinity){let nearest=null,d=range;for(const e of this.enemies)if(e.hp>0&&distance(e,this.player)<d&&clearLine(this,this.player,e)){d=distance(e,this.player);nearest=e;}return nearest;}
 combatTarget(range){const candidates=this.enemies.filter(e=>e.hp>0&&distance(e,this.player)<range&&clearLine(this,this.player,e));const score=e=>distance(e,this.player)-(e.telegraph>0?60:0)-(e.type==='caster'?30:0);candidates.sort((a,b)=>score(a)-score(b)||a.id-b.id);const best=candidates[0],current=candidates.find(e=>e.id===this.targetId);const target=current&&best&&score(current)<=score(best)+25?current:best;this.targetId=target?.id||null;return target||null;}
 addEffect(type,x,y,r,color,life=.4,angle=0){this.effects.push({type,x,y,r,color,life,maxLife:life,angle});}
 damageEnemy(e,amount,critAllowed=true){
  if(e.hp<=0||['won','lost'].includes(this.state))return;const crit=critAllowed&&this.rng()<this.player.crit+(this.skills.crit||0)*.1;
  const dmg=amount*(1+(this.skills.power||0)*.2)*(crit?2:1);e.hp-=dmg;e.hit=.1;
  if(this.texts.length<35)this.texts.push({x:e.x,y:e.y-18,text:String(Math.round(dmg)),color:crit?'#e8c67d':'#c8d4c7',life:.6,maxLife:.6});
  if(e.hp<=0){this.kills++;if(this.kills%15===0&&this.player.hp>0){this.player.hp=Math.min(this.player.maxHp,this.player.hp+12);this.addEffect('ring',this.player.x,this.player.y,40,'#86b9aa',.4);}this.gold+=Math.round((e.type==='boss'?25:e.type==='elite'?10:1)*this.fortune*DIFFICULTIES[this.difficulty].reward*(this.mode==='chaos'?1+this.depth*.05:1));this.gems.push({x:e.x,y:e.y,value:e.type==='elite'?6:1});
   if(e.type==='elite'){this.loot.push(this.rollLoot());this.rollMaterial();}
   if(e.type==='boss'){this.rollMaterial(true);this.loot.push(this.rollLoot(true));this.bossId=this.currentBoss()?.id||null;if(!this.livingBosses().length&&this.player.hp>0&&this.state==='playing'){this.state='won';this.event='won';}}
   this.addEffect('death',e.x,e.y,e.r,'#8ea899',.35);
  }
 }
 rollMaterial(boss=false){const kinds=Object.keys(GEM_DEFS),kind=kinds[Math.floor(this.lootRng()*kinds.length)],tier=boss?Math.min(3,1+DIFFICULTIES[this.difficulty].loot+(this.mode==='chaos'&&this.depth>=8?1:0)):1;this.materialLoot.push({kind,tier});this.materialCount++;}
 hitPlayer(damage){damage*=1-(this.skills.guardian||0)*.08;if(this.player.invulnerable>0||this.state!=='playing')return;this.player.hp=Math.max(0,this.player.hp-damage);this.player.invulnerable=.65;this.damageFlash=.18;this.event='hit';if(this.player.hp<=0){this.state='lost';this.event='lost';}}
 attack(){
  const p=this.player,h=HEROES[this.hero],range=h.range+(this.skills.cleave||0)*15,target=this.combatTarget(range),damage=p.damage*(1+(this.gearStats.echo||0)*.15); if(!target)return;
  const a=Math.atan2(target.y-p.y,target.x-p.x);p.face=a;
  if(this.hero==='knight'){
   this.addEffect('slash',p.x,p.y,105,'#d8bc7e',.25,a);
   for(const e of this.enemies)if(distance(e,p)<range+e.r&&clearLine(this,p,e)&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-a),Math.cos(Math.atan2(e.y-p.y,e.x-p.x)-a)))<1.5){this.damageEnemy(e,damage);moveEntity(this,e,Math.cos(a)*12,Math.sin(a)*12);}
  }else{const extra=this.hero==='ranger'?(this.skills.barrage||0):0;for(let i=0;i<=extra;i++){const angle=a+(i-extra/2)*.13;this.projectiles.push({x:p.x,y:p.y,vx:Math.cos(angle)*490,vy:Math.sin(angle)*490,r:this.hero==='mage'?8:4,damage:damage*(extra?.65:1),life:1.1,aoe:this.hero==='mage'?60+(this.skills.focus||0)*15:0,color:h.color,pierce:this.skills.pierce||0,hitIds:[]});}}
 }
 gainXp(value){this.xp+=value*(1+(this.skills.magnet||0)*.15);while(this.xp>=this.nextXp){this.xp-=this.nextXp;this.level++;this.nextXp=Math.round(this.nextXp*1.18+3);this.pendingLevels++;}if(this.pendingLevels&&this.state==='playing')this.offerChoices();}
 offerChoices(){const pool=availableSkills(this).filter(s=>(this.skills[s.id]||0)<s.max);if(!pool.length){const healing=25*this.pendingLevels;this.pendingLevels=0;this.state='playing';this.choices=[];this.player.hp=Math.min(this.player.maxHp,this.player.hp+healing);return;}for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}this.choices=pool.slice(0,3).map(s=>s.id);this.state='choosing';this.event='level';}
 choose(id){if(this.state!=='choosing'||!this.choices.includes(id)||!availableSkills(this).some(s=>s.id===id&&(this.skills[id]||0)<s.max))return false;this.skills[id]=(this.skills[id]||0)+1;if(id==='vitality'){this.player.maxHp+=25;this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);}this.pendingLevels=Math.max(0,this.pendingLevels-1);this.state='playing';this.choices=[];if(this.pendingLevels)this.offerChoices();return true;}
 reroll(){if(this.state!=='choosing'||!this.rerolls)return false;this.rerolls--;this.offerChoices();return true;}
 dash(input={x:0,y:0}){if(this.state!=='playing'||this.dashCd>0)return false;let {x,y}=input;const mag=Math.hypot(x,y);if(mag){x/=mag;y/=mag;}else{x=Math.cos(this.player.face);y=Math.sin(this.player.face);}this.dashDir={x,y};this.dashTime=.18;this.dashCd=3;this.player.invulnerable=.4;this.addEffect('ring',this.player.x,this.player.y,45,'#ced8b8',.3);return true;}
 nova(){if(this.state!=='playing'||this.novaCd>0)return false;this.novaCd=12*(1-(this.gearStats.novaHaste||0)*.2);this.player.invulnerable=.4;this.addEffect('ring',this.player.x,this.player.y,240,'#d5ae71',.7);for(const e of this.enemies)if(distance(e,this.player)<240&&clearLine(this,this.player,e)){this.damageEnemy(e,100+this.level*7);const a=Math.atan2(e.y-this.player.y,e.x-this.player.x);moveEntity(this,e,Math.cos(a)*55,Math.sin(a)*55);}return true;}
 update(delta,input={x:0,y:0}){
  if(this.state!=='playing')return;const dt=clamp(delta,0,.05),p=this.player;this.time+=dt;this.event=null;
  this.regenClock+=dt;if(this.regenClock>=3-1e-9){this.regenClock=Math.max(0,this.regenClock-3);p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.01);}
  for(const k of ['dashCd','novaCd','dashTime','damageFlash'])this[k]=Math.max(0,this[k]-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
  const mag=Math.hypot(input.x,input.y),mx=mag>1?input.x/mag:input.x,my=mag>1?input.y/mag:input.y;
  if(mag>.05)p.face=Math.atan2(my,mx);
  moveEntity(this,p,(this.dashTime>0?this.dashDir.x*670:mx*p.speed)*dt,(this.dashTime>0?this.dashDir.y*670:my*p.speed)*dt);if(this.gearStats.regen)p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.005*dt);
  this.spawnClock-=dt;
  if(this.time<this.duration&&this.spawnClock<=0&&this.enemies.length<100){const elite=this.time>=this.nextEliteAt;if(elite)this.nextEliteAt+=23;this.spawn(elite?'elite':undefined);this.spawnClock=Math.max(.22,1.1-this.time*.006-this.floor*.07);}
  if(this.time>=this.duration&&!this.bossSpawned){this.enemies=[];this.enemyShots=[];p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.2);this.spawn('boss');}
  if(this.bossSpawned&&this.time>=this.duration+60&&this.state==='playing'){this.state='lost';this.event='lost';return;}
  this.attackClock-=dt;if(this.attackClock<=0){this.attack();this.attackClock=HEROES[this.hero].interval*Math.pow(.9,this.skills.haste||0)*Math.pow(.95,this.skills.focus||0)/(1+(this.gearStats.haste||0)/100);}
  if(this.state!=='playing')return;
  for(const e of this.enemies){
   if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.cooldown-=dt;
   if(e.telegraph>0){e.telegraph-=dt;if(e.telegraph<=0){this.addEffect('ring',e.targetX,e.targetY,e.attackRadius||95,'#d96b62',.45);if(distance(p,{x:e.targetX,y:e.targetY})<(e.attackRadius||95)+p.r)this.hitPlayer(e.damage*1.5);}}
   else{const d=distance(e,p)||1;if(e.type!=='caster'||d>235){pursue(this,e,p,e.speed*(e.slow>0?.38:1)*dt);}
    if(e.type==='boss'&&e.cooldown<=0){const pattern=BOSS_PATTERNS[this.floor-1],enraged=e.hp/e.maxHp<=.4;e.targetX=p.x;e.targetY=p.y;e.attackRadius=pattern.radius;e.windup=pattern.windup;e.telegraph=e.windup;e.cooldown=pattern.interval*(enraged?.75:1);const count=pattern.shots+(enraged?4:0),speed=pattern.speed*(enraged?1.15:1);for(let i=0;i<count;i++){const a=i*Math.PI*2/count+this.time;this.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:7,damage:Math.round(e.damage*.62),life:4});}}
    if(e.type==='caster'&&e.cooldown<=0&&clearLine(this,e,p)){const a=Math.atan2(p.y-e.y,p.x-e.x);this.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*145,vy:Math.sin(a)*145,r:5,damage:e.damage,life:3.5});e.cooldown=3;}
   }if(distance(e,p)<e.r+p.r)this.hitPlayer(e.damage);
  }
  if(this.state==='lost')return;
  for(const bullet of this.projectiles){
   if(bullet.life<=0)continue;
   const before={x:bullet.x,y:bullet.y},step=Math.min(dt,bullet.life),end={x:bullet.x+bullet.vx*step,y:bullet.y+bullet.vy*step},wall=firstWallTime(this,before,end,bullet.r);
   bullet.life-=dt;bullet.hitIds||=[];
   const hits=this.enemies.filter(e=>e.hp>0&&!bullet.hitIds.includes(e.id)).map(e=>({enemy:e,t:segmentCircleTime(before,end,e,e.r+bullet.r)})).filter(hit=>hit.t<wall&&hit.t<=1).sort((a,b)=>a.t-b.t||a.enemy.id-b.enemy.id);
   let stop=wall;
   for(const hit of hits){
    const e=hit.enemy;if(e.hp<=0)continue;const impact={x:before.x+(end.x-before.x)*hit.t,y:before.y+(end.y-before.y)*hit.t};
    if(bullet.aoe){this.addEffect('ring',impact.x,impact.y,bullet.aoe,bullet.color,.25);for(const target of this.enemies)if((target===e||distance(target,impact)<bullet.aoe)&&clearLine(this,impact,target))this.damageEnemy(target,bullet.damage);}
    else this.damageEnemy(e,bullet.damage);
    bullet.hitIds.push(e.id);if((bullet.pierce||0)>0)bullet.pierce--;else{bullet.life=0;stop=hit.t;}
    if(this.state!=='playing')return;
    if(stop===hit.t)break;
   }
   if(wall!==Infinity)bullet.life=0;
   const t=Math.min(1,stop);bullet.x=before.x+(end.x-before.x)*t;bullet.y=before.y+(end.y-before.y)*t;
  }
  for(const b of this.enemyShots){
   if(b.life<=0)continue;
   const before={x:b.x,y:b.y},step=Math.min(dt,b.life),end={x:b.x+b.vx*step,y:b.y+b.vy*step},wall=firstWallTime(this,before,end,b.r),hit=segmentCircleTime(before,end,p,b.r+p.r);
   b.life-=dt;const t=Math.min(1,wall,hit);b.x=before.x+(end.x-before.x)*t;b.y=before.y+(end.y-before.y)*t;
   if(hit<wall&&hit<=1){this.hitPlayer(b.damage);b.life=0;}else if(wall<=1)b.life=0;
   if(this.state!=='playing')return;
  }
  for(const id of ['fire','ice','lightning','orbit']){
   const lv=this.skills[id]||0;this.skillClocks[id]-=dt;if(!lv||this.skillClocks[id]>0)continue;
   if(id==='fire'){this.addEffect('ring',p.x,p.y,125+lv*10,'#dd9463',.5);for(const e of this.enemies)if(distance(e,p)<125+lv*10&&clearLine(this,p,e))this.damageEnemy(e,26*lv*(1+(this.gearStats.fire||0)/100));this.skillClocks[id]=3;}
   if(id==='ice'){this.addEffect('ring',p.x,p.y,180,'#88c6d5',.6);for(const e of this.enemies)if(distance(e,p)<180&&clearLine(this,p,e)){this.damageEnemy(e,15*lv*(1+(this.gearStats.ice||0)/100));e.slow=2;}this.skillClocks[id]=4;}
   if(id==='lightning'){const enemies=this.enemies.filter(e=>e.hp>0&&distance(e,p)<400&&clearLine(this,p,e)).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,2+lv);let prev=p;for(const e of enemies){this.effects.push({type:'bolt',x:prev.x,y:prev.y,x2:e.x,y2:e.y,life:.22,maxLife:.22,color:'#bda2de'});this.damageEnemy(e,30*lv*(1+(this.gearStats.lightning||0)/100));prev=e;}this.skillClocks[id]=2;}
   if(id==='orbit'){for(let i=0;i<lv;i++){const a=this.time*2.8+i*Math.PI*2/lv,orb={x:p.x+Math.cos(a)*75,y:p.y+Math.sin(a)*75};for(const e of this.enemies)if(distance(e,orb)<e.r+17&&clearLine(this,p,e))this.damageEnemy(e,18);}this.skillClocks[id]=.25;}
  }
  if(this.state!=='playing')return;
  this.skillClocks.meteor-=dt;if(this.skills.meteor&&this.skillClocks.meteor<=0){const target=this.nearest(450);if(target){this.addEffect('ring',target.x,target.y,100,'#dd9463',.5);for(const e of this.enemies)if(distance(e,target)<100&&clearLine(this,target,e))this.damageEnemy(e,45*this.skills.meteor*(1+(this.gearStats.fire||0)/100));}this.skillClocks.meteor=3.5;}
  if(this.state!=='playing')return;
  for(const gem of this.gems){const d=distance(gem,p),radius=125+(this.skills.magnet||0)*35+(this.gearStats.magnet||0);if(d<radius&&clearLine(this,gem,p)){const step=Math.min(d,350*dt);gem.x+=(p.x-gem.x)/(d||1)*step;gem.y+=(p.y-gem.y)/(d||1)*step;}if(d<20){this.gainXp(gem.value);gem.value=0;}}
  // Aggregate distant experience instead of silently discarding progression.
  if(this.gems.length>350){const combined=this.gems.splice(0,this.gems.length-300);this.gems.push({x:combined[0].x,y:combined[0].y,value:combined.reduce((s,g)=>s+g.value,0)});}
  this.enemies=this.enemies.filter(e=>e.hp>0);this.projectiles=this.projectiles.filter(b=>b.life>0);this.enemyShots=this.enemyShots.filter(b=>b.life>0);this.gems=this.gems.filter(g=>g.value>0);
  for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0).slice(-80);
  for(const t of this.texts){t.life-=dt;t.y-=22*dt;}this.texts=this.texts.filter(t=>t.life>0);
 }
}
