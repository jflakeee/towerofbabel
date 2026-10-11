import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile,loadProfile,allItems,organizeInventory,Game,grantRewards} from '../src/engine.js';
import {autoEquip,restoreEquipment,buyUpgrade,resetUpgrades,upgradeRefund,sellItem,undoSale} from '../src/transactions.js';
const item=(id,value=10,slot='weapon')=>({id,name:id,slot,value,rarity:2,floor:1});
test('v1 migration preserves every valid item, equipment, gold and saved run',()=>{
 const old={...defaultProfile(),version:1,gold:50,inventory:Array.from({length:130},(_,i)=>item(String(i))),equipped:{weapon:'0',armor:null,charm:null},run:new Game(defaultProfile()).snapshot()};const p=loadProfile(old);assert.equal(p.version,2);assert.equal(allItems(p).length,130);assert.equal(p.inventory.length,100);assert.equal(p.overflow.length,30);assert.equal(p.equipped.weapon,'0');assert.equal(p.gold,50);assert.ok(Game.restore(p,p.run));assert.equal(allItems(loadProfile(JSON.parse(JSON.stringify(p)))).length,130);
});
test('automatic equipment protects locked slots and can restore previous gear free',()=>{
 const p=defaultProfile();p.inventory=[item('old',2),item('new',20),item('a',10,'armor')];p.equipped.weapon='old';p.lockedSlots.weapon=true;autoEquip(p);assert.equal(p.equipped.weapon,'old');p.lockedSlots.weapon=false;autoEquip(p);assert.equal(p.equipped.weapon,'new');assert.equal(restoreEquipment(p),true);assert.equal(p.equipped.weapon,'old');assert.equal(p.gold,0);assert.equal(restoreEquipment(p),false);
});
test('rewards and repeated reloads retain overflowing inventory',()=>{
 const p=defaultProfile();p.inventory=Array.from({length:200},(_,i)=>item(String(i)));organizeInventory(p);const run=new Game(p);run.state='won';run.loot=[item('reward')];grantRewards(p,run);assert.equal(allItems(p).length,201);assert.equal(allItems(loadProfile(p)).length,201);assert.equal(grantRewards(p,run),false);assert.equal(allItems(p).length,201);
});
test('reset returns actual investment less fee exactly once across reload',()=>{
 let p=defaultProfile();p.gold=1000;buyUpgrade(p,'power','buy1');buyUpgrade(p,'power','buy2');const invested=upgradeRefund(p),before=p.gold;assert.equal(invested,165);assert.ok(resetUpgrades(p,'reset1').ok);assert.equal(p.gold,before+165-20);assert.equal(p.upgrades.power,0);p=loadProfile(JSON.parse(JSON.stringify(p)));assert.ok(resetUpgrades(p,'reset1').replayed);assert.equal(p.gold,before+165-20);
});
test('insufficient balance and storage failure change neither gold nor upgrades',()=>{
 const p=defaultProfile();p.upgrades.power=1;p.gold=19;const before=structuredClone(p);assert.equal(resetUpgrades(p,'low').ok,false);assert.deepEqual(p,before);p.gold=30;const funded=structuredClone(p);assert.equal(resetUpgrades(p,'fail',()=>{throw Error('quota');}).ok,false);assert.deepEqual(p,funded);
});
test('sale undo returns exact item and cannot generate currency or duplicates',()=>{
 const p=defaultProfile();p.gold=100;p.inventory=[item('unique',17)];assert.ok(sellItem(p,'unique','sale1').ok);assert.equal(p.gold,140);assert.equal(allItems(p).length,0);assert.ok(undoSale(p,'sale1','undo1').ok);assert.equal(p.gold,90);assert.equal(allItems(p)[0].value,17);undoSale(p,'sale1','undo1');assert.equal(p.gold,90);assert.equal(allItems(p).length,1);assert.equal(undoSale(p,'sale1','undo2').ok,false);
});
test('equipped and locked gear cannot be disassembled; undo requires full payment',()=>{
 const p=defaultProfile();p.inventory=[item('x')];p.equipped.weapon='x';assert.equal(sellItem(p,'x','a').ok,false);p.equipped.weapon=null;p.lockedSlots.weapon=true;assert.equal(sellItem(p,'x','b').ok,false);p.lockedSlots.weapon=false;sellItem(p,'x','c');assert.equal(undoSale(p,'c','d').ok,false);assert.equal(allItems(p).length,0);
});
test('transaction save failure restores item and payout; upgrades cannot charge twice',()=>{
 const p=defaultProfile();p.gold=100;p.inventory=[item('x')];const before=structuredClone(p);assert.equal(sellItem(p,'x','fail',()=>{throw Error('quota');}).ok,false);assert.deepEqual(p,before);buyUpgrade(p,'power','buy');buyUpgrade(p,'power','buy');assert.equal(p.gold,40);assert.equal(p.upgrades.power,1);
});
