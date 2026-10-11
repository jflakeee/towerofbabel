import {UPGRADES,SLOT_NAMES,costFor,allItems,organizeInventory} from './engine.js';
export function upgradeRefund(profile){return UPGRADES.reduce((sum,u)=>{for(let i=0;i<profile.upgrades[u.id];i++)sum+=costFor(i);return sum;},0);}
export function transact(profile,id,operation,persist=()=>{}){
 if(profile.transactions.some(t=>t.id===id))return {ok:true,replayed:true};
 const draft=structuredClone(profile);let result;
 try{result=operation(draft);if(!result.ok)return result;draft.transactions.push({id,...result.record});draft.transactions=draft.transactions.slice(-20);persist(draft);}catch{return {ok:false,error:'저장하지 못해 변경과 비용을 취소했습니다.'};}
 Object.assign(profile,draft);return {ok:true};
}
export function resetUpgrades(profile,id,persist){return transact(profile,id,p=>{const refund=upgradeRefund(p);if(!refund)return {ok:false,error:'재설정할 강화가 없습니다.'};if(p.gold<20)return {ok:false,error:'수수료 20파편이 부족합니다.'};p.gold+=refund-20;for(const u of UPGRADES)p.upgrades[u.id]=0;return {ok:true,record:{type:'reset',refund,fee:20}};},persist);}
export function buyUpgrade(profile,key,id,persist){return transact(profile,id,p=>{const u=UPGRADES.find(u=>u.id===key);if(!u||p.upgrades[key]>=u.max||p.gold<costFor(p.upgrades[key]))return {ok:false,error:'강화 조건을 만족하지 않습니다.'};const cost=costFor(p.upgrades[key]);p.gold-=cost;p.upgrades[key]++;return {ok:true,record:{type:'upgrade',key,cost}};},persist);}
export function sellItem(profile,itemId,id,persist){return transact(profile,id,p=>{const item=allItems(p).find(i=>i.id===itemId);if(!item||p.equipped[item.slot]===item.id||p.lockedSlots[item.slot])return {ok:false,error:'장착 또는 잠금 부위의 장비는 분해할 수 없습니다.'};const payout=10+item.rarity*15;p.inventory=p.inventory.filter(i=>i.id!==itemId);p.overflow=p.overflow.filter(i=>i.id!==itemId);p.gold+=payout;organizeInventory(p);return {ok:true,record:{type:'sell',item,payout,undone:false}};},persist);}
export function undoSale(profile,saleId,id,persist){return transact(profile,id,p=>{const sale=p.transactions.find(t=>t.id===saleId&&t.type==='sell'&&!t.undone);if(!sale||!sale.item)return {ok:false,error:'복원 가능한 분해 기록이 없습니다.'};const cost=sale.payout+10;if(p.gold<cost)return {ok:false,error:`복원에 ${cost}파편이 필요합니다.`};if(allItems(p).some(i=>i.id===sale.item.id))return {ok:false,error:'이미 보유한 장비입니다.'};p.gold-=cost;p.inventory.push(sale.item);sale.undone=true;organizeInventory(p);return {ok:true,record:{type:'undo-sale',saleId,cost}};},persist);}
export function autoEquip(profile){
 const previous={...profile.equipped},items=allItems(profile);for(const slot of Object.keys(SLOT_NAMES)){if(profile.lockedSlots[slot])continue;const current=items.find(i=>i.id===profile.equipped[slot]);const best=items.filter(i=>i.slot===slot).sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id))[0];if(best&&(!current||best.value>current.value))profile.equipped[slot]=best.id;}
 const changed=Object.keys(SLOT_NAMES).some(s=>previous[s]!==profile.equipped[s]);if(changed)profile.previousEquipment=previous;organizeInventory(profile);return changed;
}
export function restoreEquipment(profile){if(!profile.previousEquipment)return false;const previous=profile.previousEquipment;for(const slot of Object.keys(SLOT_NAMES)){const id=previous[slot];profile.equipped[slot]=allItems(profile).some(i=>i.id===id&&i.slot===slot)?id:null;}profile.previousEquipment=null;organizeInventory(profile);return true;}
