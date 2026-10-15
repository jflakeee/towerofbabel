import {safeSpawn} from './world.js';
import {grantStartingSkill,resolveChoices} from './automation.js';
import {normalizeItem,rollOption,OPTION_DEFS,itemStats,normalizeAutomation,normalizeGem,gemKey} from './content.js';
import {Game,UPGRADES,SLOT_NAMES,costFor,allItems,organizeInventory,seededRandom,grantRewards,recordedSkills} from './engine.js';
export function upgradeRefund(profile){return UPGRADES.reduce((sum,u)=>{for(let i=0;i<profile.upgrades[u.id];i++)sum+=costFor(i);return sum;},0);}
export function transact(profile,id,operation,persist=()=>{}){
 if(profile.appliedTransactionIds?.includes(id)||profile.transactions.some(t=>t.id===id))return {ok:true,replayed:true};
 const draft=structuredClone(profile);let result;
 try{result=operation(draft);if(!result.ok)return result;draft.appliedTransactionIds||=[];draft.appliedTransactionIds.push(id);draft.transactions.push({id,...result.record});draft.transactions=draft.transactions.slice(-20);persist(draft);}catch{return {ok:false,error:'저장하지 못해 변경과 비용을 취소했습니다.'};}
 Object.assign(profile,draft);return {ok:true};
}
export function editProfile(profile,edit,persist){
 const draft=structuredClone(profile);try{const result=edit(draft);if(result?.ok===false)return result;persist(draft);Object.assign(profile,draft);return {ok:true,...(result&&typeof result==='object'?result:{})};}catch{return {ok:false,error:'저장하지 못해 변경을 적용하지 않았습니다.'};}
}
export function resetUpgrades(profile,id,persist){return transact(profile,id,p=>{const refund=upgradeRefund(p);if(!refund)return {ok:false,error:'재설정할 강화가 없습니다.'};if(p.gold<20)return {ok:false,error:'수수료 20파편이 부족합니다.'};p.gold+=refund-20;for(const u of UPGRADES)p.upgrades[u.id]=0;return {ok:true,record:{type:'reset',refund,fee:20}};},persist);}
export function buyUpgrade(profile,key,id,persist){return transact(profile,id,p=>{const u=UPGRADES.find(u=>u.id===key);if(!u||p.upgrades[key]>=u.max||p.gold<costFor(p.upgrades[key]))return {ok:false,error:'강화 조건을 만족하지 않습니다.'};const cost=costFor(p.upgrades[key]);p.gold-=cost;p.upgrades[key]++;return {ok:true,record:{type:'upgrade',key,cost}};},persist);}
export function sellItem(profile,itemId,id,persist){return transact(profile,id,p=>{const item=allItems(p).find(i=>i.id===itemId);if(!item||p.equipped[item.slot]===item.id||p.lockedSlots[item.slot])return {ok:false,error:'장착 또는 잠금 부위의 장비는 분해할 수 없습니다.'};const payout=10+item.rarity*15;p.inventory=p.inventory.filter(i=>i.id!==itemId);p.overflow=p.overflow.filter(i=>i.id!==itemId);p.gold+=payout;organizeInventory(p);return {ok:true,record:{type:'sell',item,payout,undone:false}};},persist);}
export function undoSale(profile,saleId,id,persist){return transact(profile,id,p=>{const sale=p.transactions.find(t=>t.id===saleId&&t.type==='sell'&&!t.undone);if(!sale||!sale.item)return {ok:false,error:'복원 가능한 분해 기록이 없습니다.'};const cost=sale.payout+10;if(p.gold<cost)return {ok:false,error:`복원에 ${cost}파편이 필요합니다.`};if(allItems(p).some(i=>i.id===sale.item.id))return {ok:false,error:'이미 보유한 장비입니다.'};p.gold-=cost;p.inventory.push(sale.item);sale.undone=true;organizeInventory(p);return {ok:true,record:{type:'undo-sale',saleId,cost}};},persist);}
export function autoEquip(profile,policy=profile){
 const previous={...profile.equipped},items=allItems(profile);for(const slot of Object.keys(SLOT_NAMES)){if(profile.lockedSlots[slot])continue;const current=items.find(i=>i.id===profile.equipped[slot]);const best=items.filter(i=>i.slot===slot).sort((a,b)=>itemScore(policy,b)-itemScore(policy,a)||a.id.localeCompare(b.id))[0];if(best&&(!current||itemScore(policy,best)>itemScore(policy,current)))profile.equipped[slot]=best.id;}
 const changed=Object.keys(SLOT_NAMES).some(s=>previous[s]!==profile.equipped[s]);if(changed)profile.previousEquipment=previous;organizeInventory(profile);return changed;
}
export function restoreEquipment(profile){if(!profile.previousEquipment)return false;const previous=profile.previousEquipment;for(const slot of Object.keys(SLOT_NAMES)){const id=previous[slot];profile.equipped[slot]=allItems(profile).some(i=>i.id===id&&i.slot===slot)?id:null;}profile.previousEquipment=null;organizeInventory(profile);return true;}
export function optionQuote(item,id,mode='reroll',changes={}){
 const source=normalizeItem(item),indices=source.options.map((_,i)=>i).filter(i=>!source.optionLocks[i]);if(!indices.length)return {ok:false,error:'모든 옵션이 잠겨 있습니다.'};
 if(!['reroll','custom'].includes(mode))return {ok:false,error:'잘못된 변경 방식입니다.'};
 const seed=[...`${item.id}:${source.optionRoll}`].reduce((s,c)=>Math.imul(s^c.charCodeAt(0),16777619)>>>0,2166136261),rng=seededRandom(seed),options=structuredClone(source.options);
 const rolled=source.options.map(()=>rollOption(rng));for(const i of indices){if(mode==='reroll')options[i]=rolled[i];else{const o=changes[i],def=OPTION_DEFS[o?.key];if(!def||!Number.isInteger(o.value)||o.value<def.min||o.value>def.max)return {ok:false,error:'허용 범위의 옵션을 선택하세요.'};options[i]={key:o.key,value:o.value};}}
 return {ok:true,itemId:item.id,revision:source.revision,id,cost:(10+source.rarity*10)*(mode==='custom'?2:1),mode,options,before:source.options,locks:source.optionLocks};
}
export function changeOptions(profile,quote,persist){if(!quote?.ok)return {ok:false,error:quote?.error||'변경 계획이 없습니다.'};return transact(profile,quote.id,p=>{
 const item=allItems(p).find(i=>i.id===quote.itemId);if(!item)return {ok:false,error:'보유 아이템이 없습니다.'};const normalized=normalizeItem(item);if(normalized.revision!==quote.revision||JSON.stringify(normalized.options)!==JSON.stringify(quote.before)||JSON.stringify(normalized.optionLocks)!==JSON.stringify(quote.locks))return {ok:false,error:'아이템이 변경되었습니다. 미리보기를 다시 확인하세요.'};
 const expected=optionQuote(item,quote.id,quote.mode,Object.fromEntries(quote.options.map((o,i)=>[i,o])));if(!expected.ok||expected.cost!==quote.cost||JSON.stringify(expected.options)!==JSON.stringify(quote.options))return {ok:false,error:'유효하지 않은 변경 계획입니다.'};if(p.gold<quote.cost)return {ok:false,error:'파편이 부족합니다.'};p.gold-=quote.cost;item.options=quote.options;item.optionLocks=quote.locks;item.revision=normalized.revision+1;item.optionRoll=normalized.optionRoll+1;return {ok:true,record:{type:'options',itemId:item.id,mode:quote.mode,cost:quote.cost,before:quote.before,after:quote.options,revision:item.revision}};
 },persist);}
export function itemScore(profile,item){const stats=itemStats(item),a=normalizeAutomation(profile.automation);let score=stats.damage*3+stats.hp*.35+stats.crit*120+stats.haste*1.3+stats.magnet*.15+stats.fortune*.5;for(const id of ['fire','ice','lightning'])score+=stats[id]*(.3+(a.priority[id]||0)*.12);if(profile.settings.strategy==='survival')score+=stats.hp*.55;if(profile.settings.strategy==='farming')score+=stats.magnet*.4+stats.fortune;if(profile.settings.strategy==='attack')score+=stats.damage+stats.haste*.5;score+=(stats.echo||0)*12+(stats.regen||0)*15+(stats.novaHaste||0)*12;score+=(stats[a.preferred]||0)*(a.preferred==='crit'?100:1);return score;}
export function savePreset(profile,index,name){if(index<0||index>2)return false;profile.presets[profile.selectedHero][index]={name:name?.slice(0,40)||`빌드 ${index+1}`,strategy:profile.settings.strategy,automation:structuredClone(profile.automation),equipped:{...profile.equipped},lockedSlots:{...profile.lockedSlots}};return true;}
export function applyPreset(profile,index){const preset=profile.presets[profile.selectedHero]?.[index];if(!preset)return {ok:false,error:'저장된 프리셋이 없습니다.'};profile.settings.strategy=preset.strategy;profile.automation=normalizeAutomation(preset.automation);profile.lockedSlots={...preset.lockedSlots};let missing=0;for(const slot of Object.keys(SLOT_NAMES)){const id=preset.equipped[slot];if(id&&!allItems(profile).some(i=>i.id===id&&i.slot===slot)){missing++;continue;}profile.equipped[slot]=id;}organizeInventory(profile);return {ok:true,missing};}
export function autoUpgrade(profile,id,persist){return transact(profile,id,p=>{const a=normalizeAutomation(p.automation);let budget=Math.min(a.upgradeBudget,Math.max(0,p.gold-a.reserve)),spent=0;const before={...p.upgrades};for(let n=0;n<30;n++){const key=a.upgradeOrder.find(key=>{const u=UPGRADES.find(u=>u.id===key);return p.upgrades[key]<u.max&&costFor(p.upgrades[key])<=budget;});if(!key)break;const cost=costFor(p.upgrades[key]);p.upgrades[key]++;p.gold-=cost;budget-=cost;spent+=cost;}return {ok:true,record:{type:'auto-upgrade',cost:spent,before,after:{...p.upgrades}}};},persist);}

export function socketGem(profile,itemId,index,gem,id,persist,revision){return transact(profile,id,p=>{
 const item=allItems(p).find(i=>i.id===itemId);if(!item)return {ok:false,error:'보유 장비가 없습니다.'};const source=normalizeItem(item);if(source.revision!==revision||!Number.isInteger(index)||index<0||index>=source.sockets.length)return {ok:false,error:'장비가 변경되었습니다. 다시 확인하세요.'};const next=gem===null?null:normalizeGem(gem);if(gem!==null&&!next)return {ok:false,error:'유효하지 않은 보석입니다.'};const old=source.sockets[index];if(JSON.stringify(old)===JSON.stringify(next))return {ok:false,error:'같은 보석은 변경할 필요가 없습니다.'};if(p.gold<5||next&&!(p.materials[gemKey(next)]>0))return {ok:false,error:'파편 또는 보석이 부족합니다.'};p.gold-=5;if(next)p.materials[gemKey(next)]--;if(old)p.materials[gemKey(old)]++;source.sockets[index]=next;source.revision++;Object.assign(item,source);return {ok:true,record:{type:'socket',itemId,index,cost:5,before:old,after:next}};
 },persist);}
export function alchemy(profile,source,target,mode,id,persist){return transact(profile,id,p=>{
 const gem=normalizeGem(source);if(!gem)return {ok:false,error:'재료를 선택하세요.'};const next=mode==='combine'?normalizeGem({kind:gem.kind,tier:gem.tier+1}):mode==='convert'?normalizeGem({kind:target,tier:gem.tier}):null;if(!next||mode==='convert'&&next.kind===gem.kind)return {ok:false,error:'허용되지 않는 연금술입니다.'};const count=mode==='combine'?3:1,cost=mode==='combine'?15:10,key=gemKey(gem);if(p.gold<cost||p.materials[key]<count)return {ok:false,error:'파편 또는 재료가 부족합니다.'};p.gold-=cost;p.materials[key]-=count;p.materials[gemKey(next)]++;return {ok:true,record:{type:'alchemy',cost,source:gem,count,result:next}};
 },persist);}
export function enhanceItem(profile,itemId,id,persist,revision){return transact(profile,id,p=>{
 const item=allItems(p).find(i=>i.id===itemId);if(!item)return {ok:false,error:'장비가 없습니다.'};const source=normalizeItem(item),cost=30+source.enhancement*20;if(source.revision!==revision||source.enhancement>=5||p.gold<cost)return {ok:false,error:'강화 조건이 변경되었거나 파편이 부족합니다.'};p.gold-=cost;source.enhancement++;source.enhanceSpent+=cost;source.revision++;Object.assign(item,source);return {ok:true,record:{type:'item-enhance',itemId,cost,level:source.enhancement}};
 },persist);}
export function resetItemEnhancement(profile,itemId,id,persist,revision){return transact(profile,id,p=>{
 const item=allItems(p).find(i=>i.id===itemId);if(!item)return {ok:false,error:'장비가 없습니다.'};const source=normalizeItem(item);if(source.revision!==revision||!source.enhancement||source.enhanceSpent<10||p.gold<10)return {ok:false,error:'재설정할 투자금 또는 수수료가 부족합니다.'};const refund=source.enhanceSpent;p.gold+=refund-10;source.enhancement=0;source.enhanceSpent=0;source.revision++;Object.assign(item,source);return {ok:true,record:{type:'item-reset',itemId,refund,fee:10}};
 },persist);}

export function settleRun(profile,run,persist){if(!['won','lost'].includes(run.state))return {ok:false,error:'종료된 전투만 정산할 수 있습니다.'};const id=`reward:${run.runId}`;const result=transact(profile,id,p=>{const copy=structuredClone(run.snapshot());if(copy.encounter&&copy.encounter!=='stage')return {ok:false,error:'투기장 입장·보상 규칙은 아직 준비 중입니다.'};if(!grantRewards(p,copy))return {ok:true,record:{type:'reward',runId:run.runId,duplicate:true}};const before={...p.equipped};autoEquip(p,{settings:{strategy:copy.autoStrategy||p.settings.strategy},automation:copy.automation||p.automation});const equipment=Object.keys(SLOT_NAMES).map(slot=>({slot,before:before[slot],after:p.equipped[slot],beforeName:allItems(p).find(i=>i.id===before[slot])?.name||'없음',afterName:allItems(p).find(i=>i.id===p.equipped[slot])?.name||'없음',reason:p.lockedSlots[slot]?'잠근 부위 유지':before[slot]!==p.equipped[slot]?'추천 점수 개선':'현재 장비 유지'}));const history=p.history.find(r=>r.id===run.runId);if(history){history.equipment=equipment;history.loot=structuredClone(copy.loot||[]);history.level=copy.level;if(copy.performance)history.performance=structuredClone(copy.performance);}return {ok:true,record:{type:'reward',runId:run.runId,gold:copy.gold,materials:copy.materialLoot}};},persist);if(result.ok)run.rewarded=true;return result;}

// Preparation commits one draft: automatic spending cannot outlive a failed run save.
export function prepareRun(profile,{resume=false,floor=profile.selectedFloor,id}={},persist){
 return editProfile(profile,p=>{
  if(resume){if(p.run?.encounter&&p.run.encounter!=='stage')return {ok:false,error:'투기장 입장·보상 규칙은 아직 준비 중입니다.'};const game=Game.restore(p,p.run);if(!game)return {ok:false,error:'전투 저장을 읽지 못했습니다. 백업을 내보낸 뒤 새 도전을 시작하세요.'};if(game.worldVersion!==2){game.worldVersion=2;game.exploration={gate:1,previous:null};for(const entity of [game.player,...game.enemies])Object.assign(entity,safeSpawn(game,entity.x,entity.y,entity.r));}p.run=game.snapshot();return {ok:true,game};}
  if(p.run)return {ok:false,error:'저장된 전투를 먼저 이어하거나 정산하세요.'};
  if(!Number.isInteger(floor)||floor<1||floor>p.unlocked)return {ok:false,error:'아직 도전할 수 없는 층입니다.'};
  p.selectedFloor=floor;
  if(p.automation.upgradeBudget>0){if(typeof id!=='string'||!id)return {ok:false,error:'도전 준비 식별자가 없습니다.'};const upgraded=autoUpgrade(p,id,()=>{});if(!upgraded.ok)return upgraded;}
  const game=new Game(p,{exploration:true});if(p.unlocked>=4)grantStartingSkill(game);
  // Independent mobile tuning: eight visible points fund the first level-up.
  game.gems=Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return {x:game.player.x+Math.cos(angle)*80,y:game.player.y+Math.sin(angle)*80,value:1};});
  p.run=game.snapshot();return {ok:true,game};
 },persist);
}

// Build a fully settled recovery file without changing the live run or profile.
export function settledRunBackup(profile,run){
 const draft=structuredClone(profile),copy={state:run.state,runId:run.runId,rewarded:run.rewarded,snapshot:()=>run.snapshot()};
 const result=settleRun(draft,copy,()=>{});return result.ok?{ok:true,profile:draft}:result;
}

// Stage rewards, equipped gear and the next stage are one durable transition.
export function advanceStage(profile,run,persist){
 if(run.encounter&&run.encounter!=='stage')return {ok:false,error:'투기장 입장·보상 규칙은 아직 준비 중입니다.'};
 if(run.state!=='won')return {ok:false,error:'승리한 단계만 계속 진행할 수 있습니다.'};
 const result=editProfile(profile,p=>{
  if(p.appliedTransactionIds.includes(`reward:${run.runId}`)){
   const game=Game.restore(p,p.run);return game?{ok:true,game,replayed:true}:{ok:false,error:'이미 정산된 전투입니다.'};
  }
  // Sweep remaining experience on a private copy, so a failed write can retry safely.
  const copy=Game.restore(p,{...run.snapshot(),state:'playing'});
  if(!copy)return {ok:false,error:'전투 상태를 복원하지 못했습니다. 결과 백업을 보관하세요.'};
  if(run.performance)copy.performance=structuredClone(run.performance);
  copy.state='won';
  copy.gainXp(copy.gems.reduce((sum,gem)=>sum+Math.max(0,gem.value),0));copy.gems=[];
  if(copy.pendingLevels){copy.state='playing';copy.offerChoices();resolveChoices(copy);}
  copy.state='won';
  const settled=settleRun(p,copy,()=>{});if(!settled.ok)return settled;
  if(run.mode==='tower'&&run.floor<5)p.selectedFloor=run.floor+1;
  else if(run.mode==='tower'){p.journey.mode='chaos';p.journey.chaosDepth=1;}
  // Keep the live build and apply only newly equipped gear, without paid upgrades.
  const game=Game.continueStage(p,copy);p.run=game.snapshot();return {ok:true,game};
 },persist);
 if(result.ok)run.rewarded=true;return result;
}

// Recovery mirrors continuous victory without mutating the live game or its RNG.
export function continuousRunBackup(profile,run){
 if(run.state!=='won')return settledRunBackup(profile,run);
 const draft=structuredClone(profile),copy=Game.restore(draft,{...run.snapshot(),state:'playing'});
 if(!copy)return {ok:false,error:'전투 상태를 백업하지 못했습니다. 저장을 다시 시도하세요.'};
 copy.state='won';if(run.performance)copy.performance=structuredClone(run.performance);
 const result=advanceStage(draft,copy,()=>{});
 return result.ok?{ok:true,profile:draft}:result;
}

export function applyHistoryBuild(profile,historyId){
 const record=profile.history.find(r=>r.id===historyId),skills=recordedSkills(record);
 if(!record||!Object.keys(skills).length)return {ok:false,error:'가져올 스킬 기록이 없습니다. 현재 빌드를 유지합니다.'};
 profile.selectedHero=record.hero;profile.automation.priority=Object.fromEntries(Object.entries(skills).map(([id,level])=>[id,Math.min(10,level*2)]));profile.automation.excluded=[];profile.settings.strategy='custom';
 return {ok:true};
}
