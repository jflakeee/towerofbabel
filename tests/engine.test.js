import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile,loadProfile,seededRandom,grantRewards,makeLoot,SKILLS,equippedStats} from '../src/engine.js';
const makeGame=(seed=123,hero='knight')=>{const p=defaultProfile();p.selectedHero=hero;return new Game(p,{rng:seededRandom(seed)});};
test('all heroes move within arena bounds; diagonal movement is normalized',()=>{
 for(const hero of ['knight','mage','ranger']){const a=makeGame(1,hero),b=makeGame(1,hero);a.update(.05,{x:1,y:0});b.update(.05,{x:1,y:1});assert.ok(Math.abs(Math.hypot(a.player.x-800,a.player.y-800)-Math.hypot(b.player.x-800,b.player.y-800))<1e-9);a.player.x=1565;a.player.y=35;a.update(.05,{x:1,y:-1});assert.equal(a.player.x,1565);assert.equal(a.player.y,35);}
});
test('level-up freezes simulation and only offered skills can be selected',()=>{
 const g=makeGame();g.gainXp(100);assert.equal(g.state,'choosing');const time=g.time;g.update(.05,{x:1,y:0});assert.equal(g.time,time);assert.equal(g.choices.length,3);assert.equal(new Set(g.choices).size,3);assert.equal(g.choose('invalid'),false);const skill=g.choices[0];assert.equal(g.choose(skill),true);assert.equal(g.skills[skill],1);while(g.state==='choosing')g.choose(g.choices[0]);assert.equal(g.pendingLevels,0);assert.equal(g.state,'playing');
});
test('maxed skills are excluded and reroll can only be used once',()=>{
 const g=makeGame();for(const s of SKILLS)g.skills[s.id]=s.max;g.skills.power=4;g.pendingLevels=1;g.offerChoices();assert.deepEqual(g.choices,['power']);assert.equal(g.reroll(),true);assert.equal(g.reroll(),false);g.choose('power');g.gainXp(1000);assert.equal(g.state,'playing');assert.equal(g.pendingLevels,0);
});
test('dash grants temporary protection and obeys cooldown',()=>{
 const g=makeGame();assert.equal(g.dash({x:1,y:0}),true);g.hitPlayer(999);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.dash(),false);for(let i=0;i<70;i++)g.update(.05,{x:0,y:0});assert.equal(g.dash(),true);
});
test('boss appears once at 90 seconds and dies into a victory with rare loot',()=>{
 const g=makeGame();g.time=89.99;g.update(.02);const boss=g.enemies.find(e=>e.type==='boss');assert.ok(boss);g.update(.05);assert.equal(g.enemies.filter(e=>e.type==='boss').length,1);g.damageEnemy(boss,1e6);assert.equal(g.state,'won');assert.equal(g.loot.length,1);assert.ok(g.loot[0].rarity>=2);
});
test('boss phase has a 60-second deadline',()=>{const g=makeGame();g.time=149.99;g.spawn('boss');g.update(.05);assert.equal(g.state,'lost');});
test('rewards settle once; wins unlock next floor and defeat retains earned loot',()=>{
 for(const state of ['won','lost']){const p=defaultProfile(),g=makeGame();g.state=state;g.gold=45;g.kills=12;g.loot=[makeLoot(1,seededRandom(2))];assert.equal(grantRewards(p,g),true);const gold=p.gold;assert.equal(grantRewards(p,g),false);assert.equal(p.gold,gold);assert.equal(p.inventory.length,1);assert.equal(p.unlocked,state==='won'?2:1);assert.equal(p.run,null);}
});
test('snapshot restores combat, pending choices, loot, and cooldowns',()=>{
 const p=defaultProfile(),g=makeGame();g.dash({x:1,y:0});g.update(.05);g.loot.push(makeLoot(1,seededRandom(2)));g.gainXp(8);const restored=Game.restore(p,JSON.parse(JSON.stringify(g.snapshot())));assert.ok(restored);assert.equal(restored.player.x,g.player.x);assert.equal(restored.dashCd,g.dashCd);assert.deepEqual(restored.choices,g.choices);assert.deepEqual(restored.loot,g.loot);assert.equal(restored.state,'choosing');assert.equal(Game.restore(p,{version:1}),null);
});
test('invalid profile values and stale equipment are repaired on load',()=>{
 const p=loadProfile({version:1,gold:-5,unlocked:99,selectedHero:'x',upgrades:{power:99},inventory:[{slot:'weapon',value:NaN}],equipped:{weapon:'missing'}});assert.equal(p.gold,0);assert.equal(p.unlocked,5);assert.equal(p.selectedHero,'knight');assert.equal(p.upgrades.power,10);assert.equal(p.inventory.length,0);assert.equal(p.equipped.weapon,null);
});
test('gear and permanent upgrades modify next-run base stats only',()=>{
 const p=defaultProfile();p.inventory=[{id:'w',slot:'weapon',value:9},{id:'a',slot:'armor',value:20},{id:'c',slot:'charm',value:12}];p.equipped={weapon:'w',armor:'a',charm:'c'};p.upgrades.power=2;p.upgrades.health=3;assert.deepEqual(equippedStats(p),{damage:9,hp:20,crit:.12});const g=new Game(p);assert.equal(g.player.maxHp,196);assert.equal(g.player.damage,23*1.16+9);assert.ok(Math.abs(g.player.crit-.17)<1e-12);
});
test('full simulation stays finite and bounded for every class',()=>{
 for(const hero of ['knight','mage','ranger']){const g=makeGame(78,hero);g.player.hp=g.player.maxHp=1e7;for(let i=0;i<3100&&g.state!=='won'&&g.state!=='lost';i++){while(g.state==='choosing')g.choose(g.choices.find(id=>['fire','lightning','power','orbit'].includes(id))||g.choices[0]);const angle=i*.012;g.update(.05,{x:Math.cos(angle),y:Math.sin(angle)});if(g.novaCd===0)g.nova();assert.ok(Number.isFinite(g.player.hp));assert.ok(g.enemies.length<=101);assert.ok(g.gems.length<=351);}assert.ok(g.bossSpawned);assert.ok(['won','lost'].includes(g.state));}
});
test('manual nova can end a boss fight outside the update loop',()=>{
 const g=makeGame(),boss=g.spawn('boss');boss.x=g.player.x+100;boss.y=g.player.y;boss.hp=50;assert.equal(g.nova(),true);assert.equal(g.state,'won');assert.equal(g.event,'won');
});
test('first floor is beatable by each unupgraded hero with movement and active skills',()=>{
 for(const hero of ['knight','mage','ranger']){const g=makeGame(1,hero);for(let i=0;i<3100&&['playing','choosing'].includes(g.state);i++){
  while(g.state==='choosing')g.choose(['vitality','fire','orbit','lightning','power','magnet','crit','haste','ice'].find(id=>g.choices.includes(id)));
  let x=Math.cos(i*.06),y=Math.sin(i*.06);const boss=g.enemies.find(e=>e.type==='boss');if(boss){const dx=boss.x-g.player.x,dy=boss.y-g.player.y,d=Math.hypot(dx,dy)||1,range=hero==='knight'?65:170;if(boss.telegraph>0&&Math.hypot(g.player.x-boss.targetX,g.player.y-boss.targetY)<110){x=-dy/d;y=dx/d;if(g.dashCd===0)g.dash({x,y});}else if(d>range+10){x=dx/d;y=dy/d;}else if(d<range-10){x=-dx/d;y=-dy/d;}else{x=-dy/d;y=dx/d;}}
  g.update(.05,{x,y});if(g.novaCd===0)g.nova();
 }assert.equal(g.state,'won',`${hero} should have a viable first-floor path`);}
});
