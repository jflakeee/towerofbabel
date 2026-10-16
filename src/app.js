import {exploring,ORIGIN,gateLocation,areaLevel,radialDistance,setWorldView,explorationGuides} from './exploration.js';
const BUILD_TIME='__BUILD_TIME__';
const buildLabel=BUILD_TIME.startsWith('__')?'개발 실행 · 빌드 전':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(BUILD_TIME))+' KST';
import {Game,FLOORS,BOSS_PATTERNS,HEROES,SKILLS,UPGRADES,SLOT_NAMES,RARITIES,defaultProfile,loadProfile,equippedStats,costFor,clamp,allItems,organizeInventory,recordedSkills} from './engine.js';
import {editProfile,upgradeRefund,resetUpgrades,buyUpgrade,sellItem,undoSale,autoEquip,restoreEquipment,optionQuote,changeOptions,savePreset,applyPreset,applyHistoryBuild,prepareRun,advanceStage,socketGem,alchemy,enhanceItem,resetItemEnhancement,settleRun,continuousRunBackup} from './transactions.js';
import {OPTION_DEFS,normalizeItem,normalizeAutomation,optionText,GEM_DEFS,gemKey,LEGENDARY_EFFECTS} from './content.js';
import {DIFFICULTIES,normalizeJourney,gameObstacles} from './world.js';
import {CombatDiagnostics} from './diagnostics.js';
import {MobileJoystick} from './input.js';
import {ProfileStore} from './storage.js';
import {STRATEGIES,resolveChoices,automateAbilities} from './automation.js';
const $=id=>document.getElementById(id),svg=(id,cls='')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='babel-mobile-v1';let storageAvailable=true,profile,store,workerRegistration=null,offlineReady=false,updateRequested=false;const wasControlled=!!navigator.serviceWorker?.controller;
try{store=new ProfileStore(localStorage,navigator.locks,KEY);await store.open();const loaded=store.read();profile=loadProfile(loaded.profile);if(loaded.recovered)document.getElementById('save-banner').textContent='백업 저장에서 복구했습니다.';}catch{profile=defaultProfile();storageAvailable=false;}
let bossSlots=[],game=null,paused=false,modalKind='',lastFocus=null,audio=null,raf=0,lastTime=0,stepAccumulator=0,saveClock=0,hudClock=0,toastTimer,announcementTimer,autoNoticeTimer,musicClock=0,musicStep=0,w=0,h=0,dpr=1,zoom=1;
const ctx=$('canvas').getContext('2d'),input={x:0,y:0},joystick=new MobileJoystick(),diagnostics=new CombatDiagnostics();
function showLobby(visible){$('home').hidden=!visible;$('lobby-header').hidden=!visible;}
function showPauseNotice(message='일시정지 · 화면을 터치하면 계속합니다'){const notice=$('battle-help');notice.textContent=message;notice.classList.add('paused-notice');notice.hidden=false;}
function clearPauseNotice(){const notice=$('battle-help');notice.classList.remove('paused-notice');notice.hidden=true;}
function resumeBattle(){paused=document.hidden;lastTime=performance.now();stepAccumulator=0;if(paused)showPauseNotice();else clearPauseNotice();}
function isArenaPreview(){return game?.encounter==='dual-boss';}
function save(){
 if(isArenaPreview())return true;
 try{if(game&&['playing','choosing'].includes(game.state))profile.run=game.snapshot();store.write(profile);if(!storageAvailable&&store.writable)$('save-banner').hidden=true;storageAvailable=true;return true;}
 catch{
  storageAvailable=false;if(game&&['playing','choosing'].includes(game.state)){paused=true;diagnostics.interrupt();resetInput();showPauseNotice('저장 실패 · 저장 재시도 또는 현재 진행 백업을 선택하세요.');}
  if(store&&!store.writable)blockWrites();else{
   $('save-banner').hidden=false;$('save-banner').innerHTML='저장 실패 · 진행을 일시정지했습니다. 저장 공간을 확보하거나 현재 진행을 백업하세요. <button id="retry-save">저장 재시도</button><button id="pending-save-export">현재 진행 백업</button>';
   $('retry-save').onclick=()=>{if(save()){showPauseNotice('저장 완료 · 화면을 터치하면 계속합니다');toast('현재 진행을 저장했습니다.');}};$('pending-save-export').onclick=exportSave;
  }
  return false;
 }
}

function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function sound(type){
 if(!profile.settings.sound)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();const t=audio.currentTime;const freq={start:220,level:660,hit:90,attack:180,win:550,select:440,dash:300}[type]||220;osc.type=type==='hit'?'sawtooth':'sine';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*(type==='hit'?.4:1.6),t+.12);gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(t+.21);}catch{/* Audio remains optional. */}
}
function musicTick(dt){if(!profile.settings.sound||!profile.settings.music||!audio||audio.state!=='running')return;musicClock+=dt;if(musicClock<.55)return;musicClock=0;const notes=[0,7,3,10,7,12,3,7],base=[130.81,146.83,164.81,174.61,196][game.floor-1];try{const osc=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime;osc.type='triangle';osc.frequency.value=base*Math.pow(2,notes[musicStep++%notes.length]/12);gain.gain.setValueAtTime(.001,time);gain.gain.linearRampToValueAtTime(.008,time+.08);gain.gain.exponentialRampToValueAtTime(.001,time+.48);osc.connect(gain);gain.connect(audio.destination);osc.start(time);osc.stop(time+.5);}catch{}}
function renderHome(){
 $('gold').textContent=profile.gold.toLocaleString();$('floors').innerHTML=FLOORS.map((f,i)=>`<button class="floor ${profile.selectedFloor===i+1?'active':''} ${i+1>profile.unlocked?'locked':''}" data-floor="${i+1}" ${i+1>profile.unlocked?'disabled':''} aria-label="${i+1}층 ${esc(f.name)} ${i+1>profile.unlocked?'잠김':''}" aria-pressed="${profile.selectedFloor===i+1}">${i+1>profile.unlocked?'◇':String(i+1).padStart(2,'0')}<small>${i+1>profile.unlocked?'':'F'}</small></button>`).join('');
 $('floor-name').textContent=FLOORS[profile.selectedFloor-1].name;$('floor-desc').textContent=`${DIFFICULTIES[profile.journey.difficulty].name} · ${profile.journey.mode==='chaos'?'혼돈 '+profile.journey.chaosDepth+'단계':profile.selectedFloor+'층'} · 거리 기반 탐험`;
 $('classes').innerHTML=Object.entries(HEROES).map(([id,v])=>`<button class="class-card ${id===profile.selectedHero?'active':''}" data-hero="${id}" aria-pressed="${id===profile.selectedHero}">${svg(v.icon)}<strong>${v.name}</strong><small>${v.role}</small></button>`).join('');
 $('gear-summary').textContent=allItems(profile).length?`보유 장비 ${allItems(profile).length}개 · 장착 ${Object.values(profile.equipped).filter(Boolean).length}/3`:'획득한 장비로 더 강하게';
 $('upgrade-summary').textContent=`영구 강화 ${Object.values(profile.upgrades).reduce((a,b)=>a+b,0)}단계`;
 $('resume').hidden=!profile.run;$('sound').style.color=profile.settings.sound?'var(--gold)':'';$('sound').setAttribute('aria-label',profile.settings.sound?'소리 끄기':'소리 켜기');
}
$('floors').addEventListener('click',e=>{const b=e.target.closest('[data-floor]');if(!b)return;applyProfileEdit(p=>{p.selectedFloor=Number(b.dataset.floor);});});
$('classes').addEventListener('click',e=>{const b=e.target.closest('[data-hero]');if(!b)return;if(applyProfileEdit(p=>{p.selectedHero=b.dataset.hero;}))sound('select');});
$('sound').onclick=()=>{if(!applyProfileEdit(p=>{p.settings.sound=!p.settings.sound;}))return;sound('select');toast(profile.settings.sound?'사운드 켜짐':'사운드 꺼짐');};
function openModal(kind,html){
 modalKind=kind;lastFocus=document.activeElement;$('dialog').innerHTML=html;$('overlay').hidden=false;$('app').inert=true;resetInput();$('dialog').focus();
}
function closeModal(){modalKind='';$('overlay').hidden=true;$('app').inert=false;if(lastFocus?.isConnected!==false)lastFocus?.focus?.();if(store&&!store.writable)blockWrites();}
function header(kicker,title){return `<div class="dialog-header"><span class="section-kicker">${kicker}</span><button class="close" data-close aria-label="닫기">×</button></div><h2 id="dialog-title">${title}</h2>`;}
$('dialog').addEventListener('click',e=>{if(e.target.closest('[data-close]')){closeModal();if(game&&paused)paused=false;}});
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay')&&['gear','upgrades','settings','research','build','history','options','journey','alchemy','workshop'].includes(modalKind))closeModal();});
$('arena-preview').onclick=showArenaPreviewIntro;$('journey').onclick=showJourney;$('alchemist').onclick=showAlchemy;$('equipment').onclick=showGear;$('upgrades').onclick=showUpgrades;$('settings').onclick=showSettings;$('research').onclick=showResearch;
function itemText(i){return `${RARITIES[i.rarity]} · ${SLOT_NAMES[i.slot]} · ${i.slot==='weapon'?'공격력':i.slot==='armor'?'체력':'치명타'} +${i.value}${i.slot==='charm'?'%':''}${i.enhancement?' · 강화 +'+i.enhancement:''}${i.rarity===4?' · '+LEGENDARY_EFFECTS[i.slot]:''}${(i.sockets||[]).filter(Boolean).map(g=>' · '+gemLabel(g)).join('')}${(i.options||[]).filter(Boolean).map(o=>' · '+optionText(o)).join('')}`;}
function persistTransaction(draft){store.write(draft);}
function applyProfileEdit(edit){const result=editProfile(profile,edit,persistTransaction);transactionResult(result);return result.ok;}
function transactionResult(result){if(!result.ok){toast(result.error);if(store&&!store.writable)blockWrites();}renderHome();}
// Preview the exact transaction on a clone. Cancel never mutates the live profile.
function reviewTransaction(title,details,operation,back){
 const before=JSON.stringify(profile),draft=structuredClone(profile),id=crypto.randomUUID();
 const preview=operation(draft,id,()=>{});if(!preview.ok){toast(preview.error);return;}
 const record=draft.transactions.at(-1),cost=record.cost??record.fee??0;
 openModal('transaction-review',`${header('CONFIRM CHANGE',esc(title))}<p>${details}</p><p>보유 파편 ${profile.gold} → 변경 후 잔액 ${draft.gold}</p><p>${record.refund!==undefined?'반환 원금 '+record.refund+'파편 · ':''}${record.fee!==undefined?'수수료 '+record.fee+'파편':'비용 '+cost+'파편'}${record.payout!==undefined?' · 분해 보상 '+record.payout+'파편':''}</p><p>취소하면 재화와 장비가 그대로 유지됩니다.</p><button id="confirm-transaction" class="primary">내용 확인 · 확정</button><button id="cancel-transaction" class="secondary">취소</button>`);
 let finished=false;$('cancel-transaction').onclick=()=>{finished=true;back();};
 $('confirm-transaction').onclick=()=>{if(finished)return;if(JSON.stringify(profile)!==before){finished=true;toast('보유 상태가 변경되었습니다. 내용을 다시 확인하세요.');back();return;}const result=operation(profile,id,persistTransaction);transactionResult(result);if(result.ok){finished=true;back();}};
}
function equipmentHistory(rows){return Array.isArray(rows)?rows.filter(r=>r&&SLOT_NAMES[r.slot]).slice(0,3).map(r=>`<p>${SLOT_NAMES[r.slot]} · ${esc(r.beforeName||'없음')} → ${esc(r.afterName||'없음')}<br>${esc(r.reason||'')}</p>`).join(''):'';}
function decisionHistory(rows){return (Array.isArray(rows)?rows:[]).map(d=>`<details><summary>${esc(SKILLS.find(s=>s.id===d.id)?.name||d.id)} · ${esc(d.reason)}</summary><p>판단 정책 ${Number(d.policyVersion)||1} · 전투 ${formatTime(Number(d.time)||0)}</p>${(Array.isArray(d.candidates)?d.candidates:[]).slice(0,15).map(c=>`<p>${esc(SKILLS.find(s=>s.id===c.id)?.name||c.id)} · 점수 ${Number.isFinite(c.score)?c.score.toFixed(2):'—'}</p>`).join('')}</details>`).join('');}
function showGear(){
 const items=allItems(profile),stats=equippedStats(profile);openModal('gear',`${header('THE ARMORY','장비 보관함')}<p>자동 장착은 전투 종료 후 적용됩니다. 잠금 부위는 유지하며 모든 획득품을 보존합니다.</p><p>보유 ${items.length}개 · 초과 보관 ${profile.overflow.length}개</p><div class="gear-actions"><button id="auto-equip" class="secondary">추천 장비 장착</button><button id="restore-equip" class="secondary" ${profile.previousEquipment?'':'disabled'}>이전 장비 복원 · 무료</button></div><div class="slot-locks">${Object.entries(SLOT_NAMES).map(([slot,name])=>`<label>${name} 잠금 <input type="checkbox" data-lock="${slot}" ${profile.lockedSlots[slot]?'checked':''}></label>`).join('')}</div><p>추가 공격 +${stats.damage} · 체력 +${stats.hp} · 치명타 +${Math.round(stats.crit*100)}%</p><div id="items">${items.length?[...items].reverse().map(i=>`<div class="item-row"><div><strong class="rarity-${i.rarity}">${esc(i.name)}</strong><p>${itemText(i)}</p></div><button data-equip="${esc(i.id)}">${profile.equipped[i.slot]===i.id?'해제':'장착'}</button><button data-options="${esc(i.id)}">옵션 편집</button><button data-workshop="${esc(i.id)}">강화·소켓</button><button data-sell="${esc(i.id)}" ${profile.equipped[i.slot]===i.id||profile.lockedSlots[i.slot]?'disabled':''}>분해 +${10+i.rarity*15}</button></div>`).join(''):'<p>정예와 수문장을 처치해 장비를 수집하세요.</p>'}</div><div class="build-list"><strong>최근 분해 복원</strong><p>최근 20개 거래만 복원할 수 있습니다. 이전 버전에서 분해한 장비는 복원할 수 없습니다.</p>${profile.transactions.filter(t=>t.type==='sell'&&!t.undone).reverse().map(t=>`<p>${esc(t.item.name)} · 지급 ${t.payout} 반환 + 수수료 10파편 <button data-undo-sale="${esc(t.id)}">${t.payout+10}파편으로 복원</button></p>`).join('')||'<p>복원할 기록이 없습니다.</p>'}</div>`);
 $('dialog').querySelectorAll('[data-workshop]').forEach(b=>b.onclick=()=>showWorkshop(b.dataset.workshop));
 $('dialog').querySelectorAll('[data-options]').forEach(b=>b.onclick=()=>showOptions(b.dataset.options));
 $('auto-equip').onclick=()=>{applyProfileEdit(autoEquip);showGear();};$('restore-equip').onclick=()=>{applyProfileEdit(restoreEquipment);showGear();};
 $('dialog').querySelectorAll('[data-lock]').forEach(b=>b.onchange=()=>{applyProfileEdit(p=>{p.lockedSlots[b.dataset.lock]=b.checked;});showGear();});
 $('dialog').querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{const i=allItems(profile).find(i=>i.id===b.dataset.equip);if(i){applyProfileEdit(p=>{p.equipped[i.slot]=p.equipped[i.slot]===i.id?null:i.id;organizeInventory(p);});showGear();}});
 $('dialog').querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{const item=allItems(profile).find(i=>i.id===b.dataset.sell);if(item)reviewTransaction('장비 분해',`${esc(item.name)}을 분해합니다. 원본은 최근 20개 거래 안에서 보상 반환과 10파편 수수료로 복원할 수 있습니다.`,(p,id,persist)=>sellItem(p,item.id,id,persist),showGear);});
 $('dialog').querySelectorAll('[data-undo-sale]').forEach(b=>b.onclick=()=>{const sale=profile.transactions.find(t=>t.id===b.dataset.undoSale);if(sale)reviewTransaction('분해 장비 복원',`${esc(sale.item.name)} 복원 · 지급액 ${sale.payout} 반환 + 수수료 10파편`,(p,id,persist)=>undoSale(p,sale.id,id,persist),showGear);});
}
function showUpgrades(){const refund=upgradeRefund(profile);openModal('upgrades',`${header('PERMANENT GROWTH','영혼의 강화')}<p>모든 영웅에게 적용되며 다음 전투부터 반영됩니다.</p><p class="modal-gold">보유 파편 ${profile.gold.toLocaleString()}</p>${UPGRADES.map(u=>`<div class="item-row">${svg(u.icon)}<div><strong>${u.name} ${profile.upgrades[u.id]}/${u.max}</strong><p>${u.desc}</p></div><button data-upgrade="${u.id}" ${profile.gold<costFor(profile.upgrades[u.id])||profile.upgrades[u.id]>=u.max?'disabled':''}>${costFor(profile.upgrades[u.id])} 파편</button></div>`).join('')}<div class="build-list"><strong>강화 재설정</strong><p>${refund?`투자 원금 ${refund}파편 반환 · 수수료 20파편<br>재설정 후 잔액 ${profile.gold+refund-20}파편 · 모든 강화 0단계`:'재설정할 강화가 없습니다.'}</p><button id="reset-upgrades" class="secondary" ${!refund||profile.gold<20?'disabled':''}>20파편을 지불하고 재설정</button></div>`);
 $('dialog').querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const u=UPGRADES.find(u=>u.id===b.dataset.upgrade);reviewTransaction('영혼 강화',`${u.name} ${profile.upgrades[u.id]} → ${profile.upgrades[u.id]+1}단계<br>${u.desc}`,(p,id,persist)=>buyUpgrade(p,u.id,id,persist),showUpgrades);});$('reset-upgrades').onclick=()=>reviewTransaction('영혼 강화 재설정','모든 영구 강화를 0단계로 되돌리고 투자 원금을 반환합니다.',(p,id,persist)=>resetUpgrades(p,id,persist),showUpgrades);
}
function exportSave(data=profile,filename='babel-save-backup.json'){if(data?.target)data=profile;const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function importSave(e){const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){toast('백업 파일은 5MB 이하로 선택하세요.');return;}try{const raw=JSON.parse(await file.text());if(!raw||![1,2].includes(raw.version)||!Array.isArray(raw.inventory)||!Number.isFinite(raw.gold)||raw.gold<0)throw Error();const loaded=loadProfile(raw);openModal('import',`${header('RESTORE SAVE','저장 백업을 불러올까요?')}<p>파편 ${loaded.gold} · 장비 ${allItems(loaded).length}개<br>현재 저장을 이 백업으로 교체합니다. 취소하면 그대로 유지됩니다.</p><button id="confirm-import" class="primary">백업으로 교체</button><button id="cancel-import" class="secondary">취소</button>`);$('cancel-import').onclick=showSettings;$('confirm-import').onclick=()=>{try{if(store.corrupt)store.replaceDamaged(loaded);else store.write(loaded);profile=loaded;cancelAnimationFrame(raf);game=null;paused=false;resetInput();$('battle').hidden=true;$('result-page').hidden=true;showLobby(true);document.body.style.overflow='';$('save-banner').hidden=true;storageAvailable=true;renderHome();applyControls();showSettings();toast('저장 백업을 불러왔습니다.');}catch{toast('저장하지 못해 백업을 적용하지 않았습니다.');}};}catch{toast('올바른 게임 백업 JSON을 선택하세요.');}}
function blockWrites(){resetInput();paused=true;$('app').inert=true;$('save-banner').hidden=false;$('save-banner').innerHTML=`저장 보호 모드 · ${esc(store?.reason||'저장 공간에 접근할 수 없습니다.')} <button id="retry-writer">다시 열기</button> <button id="readonly-export">${store?.corrupt?'손상 원본 내보내기':'현재 저장 내보내기'}</button>${store?.corrupt?'<label>복구 백업 선택<input id="recovery-import" type="file" accept="application/json"></label>':''}`;$('retry-writer').onclick=()=>location.reload();$('readonly-export').onclick=()=>{try{exportSave(store?.corrupt?store.raw():profile,store?.corrupt?'babel-damaged-save.json':'babel-save-backup.json');}catch{toast('저장 원본에 접근하지 못했습니다.');}};if($('recovery-import'))$('recovery-import').onchange=importSave;}
function showOptions(itemId){
 const item=allItems(profile).find(i=>i.id===itemId);if(!item)return;const normalized=normalizeItem(item);Object.assign(item,normalized);const quoteId=crypto.randomUUID();
 openModal('options',`${header('ITEM CUSTOM','아이템 옵션 편집')}<p>${esc(item.name)} · 보유 ${profile.gold}파편<br>기본 능력치·등급·아이템은 그대로 유지됩니다.</p>${item.options.map((o,i)=>`<div class="option-row"><label><input type="checkbox" data-option-lock="${i}" ${item.optionLocks[i]?'checked':''} ${!o?'disabled':''}>잠금</label><select data-option-key="${i}" ${item.optionLocks[i]?'disabled':''}>${Object.entries(OPTION_DEFS).map(([key,d])=>`<option value="${key}" ${o?.key===key?'selected':''}>${d.name}</option>`).join('')}</select><input type="number" ${item.optionLocks[i]?'disabled':''} data-option-value="${i}" value="${o?.value||2}" aria-label="옵션 수치"><small>${optionText(o)}</small></div>`).join('')}<p>재추첨 ${10+item.rarity*10}파편 · 지정 변경 ${(10+item.rarity*10)*2}파편<br>재추첨 결과는 미리보기 후 확정합니다.</p><button id="preview-roll" class="secondary" ${item.optionLocks.every(Boolean)?'disabled':''}>재추첨 미리보기</button><button id="preview-custom" class="secondary" ${item.optionLocks.every(Boolean)?'disabled':''}>지정 변경 미리보기</button><div id="option-preview"></div><button id="options-back" class="secondary">장비함으로</button>`);
 $('options-back').onclick=showGear;
 $('dialog').querySelectorAll('[data-option-lock]').forEach(b=>b.onchange=()=>{applyProfileEdit(p=>{const edited=allItems(p).find(i=>i.id===itemId);edited.optionLocks[Number(b.dataset.optionLock)]=b.checked;edited.revision++;});showOptions(itemId);});
 $('dialog').querySelectorAll('[data-option-key]').forEach(b=>{const input=$('dialog').querySelector(`[data-option-value="${b.dataset.optionKey}"]`);const update=()=>{const d=OPTION_DEFS[b.value];input.min=d.min;input.max=d.max;input.value=Math.max(d.min,Math.min(d.max,Number(input.value)||d.min));};b.onchange=update;update();});
 const preview=mode=>{const changes={};for(let i=0;i<item.options.length;i++){const key=$('dialog').querySelector(`[data-option-key="${i}"]`).value;changes[i]={key,value:Number($('dialog').querySelector(`[data-option-value="${i}"]`).value)};}const quote=optionQuote(item,quoteId,mode,changes);if(!quote.ok){toast(quote.error);return;}$('option-preview').innerHTML=`<div class="build-list"><strong>변경 내용</strong>${quote.options.map((o,i)=>`<p>${optionText(quote.before[i])} → ${optionText(o)} ${quote.locks[i]?'(잠금 유지)':''}</p>`).join('')}<p>비용 ${quote.cost}파편 · 변경 후 잔액 ${profile.gold-quote.cost}파편</p><button id="confirm-options" ${profile.gold<quote.cost?'disabled':''}>${quote.cost}파편 지불 · 확정</button><button id="cancel-options">취소</button></div>`;$('cancel-options').onclick=()=>{$('option-preview').innerHTML='';};$('confirm-options').onclick=()=>{transactionResult(changeOptions(profile,quote,persistTransaction));showOptions(itemId);};};
 $('preview-roll').onclick=()=>preview('reroll');$('preview-custom').onclick=()=>preview('custom');
}
function showBuild(){const a=normalizeAutomation(profile.automation);openModal('build',`${header('BUILD PLAN','자동 빌드 편집')}<p>무료 편집 · 다음 전투에 적용. 우선순위가 클수록 먼저 선택합니다. 전용 스킬은 선행 축복을 획득한 뒤 자동 후보에 등장합니다.</p><p>시작 스킬: ${profile.unlocked>=4?'해금됨 · 새 도전 시작 시 잿불·서리·번개·공전 중 현재 성향과 우선순위로 1개 자동 획득':'3층 정복 후 해금'}. 연속 단계·이어하기에서는 추가 지급하지 않습니다.</p>${SKILLS.filter(s=>s.hero===profile.selectedHero).map(s=>`<p><strong>${s.name}</strong> · ${s.description}</p>`).join('')}<div class="build-editor">${SKILLS.filter(s=>!s.hero||s.hero===profile.selectedHero).map(s=>`<label><span>${s.name}${s.requires?' · '+SKILLS.find(k=>k.id===s.requires).name+' 이후':''}</span><input data-priority="${s.id}" type="number" min="0" max="10" value="${a.priority[s.id]}" aria-label="${s.name} 우선순위"><span><input data-excluded="${s.id}" type="checkbox" ${a.excluded.includes(s.id)?'checked':''}>제외</span></label>`).join('')}</div><label class="setting">선호 옵션<select id="preferred">${Object.entries(OPTION_DEFS).map(([id,d])=>`<option value="${id}" ${a.preferred===id?'selected':''}>${d.name}</option>`).join('')}</select></label><label class="setting">회피 성향<select id="dodge-policy"><option value="cautious">보수적</option><option value="normal">균형</option><option value="bold">위험 감수</option></select></label><label class="setting">폭발 사용 적 수<input id="nova-count" type="number" min="2" max="8" value="${a.novaCount}"></label>${Object.entries(a.weights).map(([k,v])=>`<label class="setting">${{damage:'공격',survival:'생존',growth:'성장'}[k]} 가중치<input data-weight="${k}" type="number" min="0" max="3" step="0.1" value="${v}"></label>`).join('')}<label class="setting">전투 시작 시 강화 예산<input id="upgrade-budget" type="number" min="0" value="${a.upgradeBudget}"></label><label class="setting">보존할 파편<input id="reserve-gold" type="number" min="0" value="${a.reserve}"></label><label class="setting">강화 순서<select id="upgrade-order">${[['power','health','fortune'],['health','power','fortune'],['fortune','power','health']].map(order=>`<option value="${order.join(',')}">${order.map(k=>UPGRADES.find(u=>u.id===k).name).join(' → ')}</option>`).join('')}</select></label><p>예산 0은 재화 자동 사용 안 함입니다. 활성 예산은 전투 시작 시 표시 후 사용합니다.</p><button id="save-build" class="primary">빌드 계획 저장 · 무료</button><div class="build-list"><strong>${HEROES[profile.selectedHero].name} 프리셋</strong>${profile.presets[profile.selectedHero].map((preset,i)=>`<p>${i+1}. ${esc(preset?.name||'비어 있음')} <button data-save-preset="${i}">현재 빌드 저장</button><button data-load-preset="${i}" ${preset?'':'disabled'}>불러오기</button></p>`).join('')}</div>`);
 $('dodge-policy').value=a.dodge;$('upgrade-order').value=a.upgradeOrder.join(',');
 const collect=p=>{for(const b of $('dialog').querySelectorAll('[data-priority]'))a.priority[b.dataset.priority]=Number(b.value);a.excluded=[...$('dialog').querySelectorAll('[data-excluded]:checked')].map(b=>b.dataset.excluded);for(const b of $('dialog').querySelectorAll('[data-weight]'))a.weights[b.dataset.weight]=Number(b.value);a.preferred=$('preferred').value;a.dodge=$('dodge-policy').value;a.novaCount=Number($('nova-count').value);a.upgradeBudget=Number($('upgrade-budget').value);a.reserve=Number($('reserve-gold').value);a.upgradeOrder=$('upgrade-order').value.split(',');p.automation=normalizeAutomation(a);p.settings.strategy='custom';};
 $('save-build').onclick=()=>{if(applyProfileEdit(collect))toast('다음 전투의 빌드 계획을 저장했습니다.');};$('dialog').querySelectorAll('[data-save-preset]').forEach(b=>b.onclick=()=>{applyProfileEdit(p=>{collect(p);savePreset(p,Number(b.dataset.savePreset));});showBuild();});$('dialog').querySelectorAll('[data-load-preset]').forEach(b=>b.onclick=()=>{let result;if(applyProfileEdit(p=>{result=applyPreset(p,Number(b.dataset.loadPreset));return result;}))toast(result.missing?'없는 장비는 현재 장비를 유지했습니다.':'프리셋 적용 완료');showBuild();});
}
function battleStageLabel(record){const chaos=record.mode==='chaos',value=chaos?record.depth:record.floor,valid=Number.isInteger(value)&&value>=1&&value<=(chaos?20:5);return `${DIFFICULTIES[record.difficulty]?.name||'일반'} · ${chaos?'혼돈':'탑'} ${valid?value:'미상'}${chaos?'단계':'층'}`;}
function skillHistory(record){const skills=recordedSkills(record);return `<div class="build-list"><strong>${record.skills?'종료 시점 전체 스킬':'이전 기록의 확인 가능한 스킬'}</strong><p>${Object.entries(skills).map(([id,level])=>`${SKILLS.find(s=>s.id===id).name} Lv.${level}`).join(' · ')||'스킬 없음'}</p></div>`;}
function showHistory(){openModal('history',`${header('BATTLE JOURNAL','최근 전투 기록')}<p>최근 20개 전투 · 종료 시점의 전체 스킬 레벨을 다음 빌드의 우선순위로 가져옵니다. 스킬 자체를 미리 지급하지는 않습니다.</p>${[...profile.history].reverse().map(r=>`<div class="history-row"><strong>${battleStageLabel(r)} · ${HEROES[r.hero].name} · ${r.state==='won'?'승리':'도전 종료'}</strong><p>처치 ${r.kills} · 파편 ${r.gold} · ${formatTime(r.time)}</p>${skillHistory(r)}${equipmentHistory(r.equipment)}${decisionHistory(r.decisions)}<button data-history-build="${esc(r.id)}" ${Object.keys(recordedSkills(r)).length?'':'disabled'}>전체 스킬을 다음 빌드로 사용</button></div>`).join('')||'<p>아직 완료한 전투가 없습니다.</p>'}`);$('dialog').querySelectorAll('[data-history-build]').forEach(b=>b.onclick=()=>{if(applyProfileEdit(p=>applyHistoryBuild(p,b.dataset.historyBuild)))showBuild();});}
function showSettings(){openModal('settings',`${header('SETTINGS','플레이 설정')}<label class="setting">자동 선택 성향<select id="s-strategy">${Object.entries(STRATEGIES).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><p>스테이지 종료 후 획득 장비를 포함해 더 좋은 장비를 자동 장착합니다. 승리·패배 모두 적용하며 잠근 부위는 유지합니다.</p><label class="setting">효과음<input id="s-sound" type="checkbox" ${profile.settings.sound?'checked':''}></label><label class="setting">화면 흔들림<input id="s-shake" type="checkbox" ${profile.settings.shake?'checked':''}></label><label class="setting">자동 스킬 상태 표시 <small>왼쪽에 배치</small><input id="s-left" type="checkbox" ${profile.settings.leftHanded?'checked':''}></label><label class="setting">화질<select id="s-quality"><option value="auto">자동</option><option value="low">절전</option><option value="high">높음</option></select></label><label class="setting">배경 음악<input id="s-music" type="checkbox" ${profile.settings.music?'checked':''}></label><button id="open-build" class="secondary">자동 빌드·프리셋 편집</button><button id="open-history" class="secondary">최근 전투 기록</button><button id="open-diagnostics" class="secondary">플레이 성능 확인</button><label class="setting">조이스틱 크기<select id="s-pad-size"><option value="44">작게</option><option value="48">기본</option><option value="56">크게</option><option value="64">최대</option></select></label><label class="setting">큰 글씨<input id="s-text-size" type="checkbox" ${profile.settings.textSize==='large'?'checked':''}></label><label class="setting">피해 숫자<input id="s-damage-numbers" type="checkbox" ${profile.settings.damageNumbers?'checked':''}></label><label class="setting">이펙트 불투명도<input id="s-effects" type="range" min="0.15" max="1" step="0.05" value="${profile.settings.effectOpacity}"></label><button id="export-save" class="secondary">저장 백업 내보내기</button><label class="setting">저장 백업 불러오기<input id="import-save" type="file" accept="application/json"></label><p>전투는 5초마다 자동 저장됩니다. 다른 앱으로 이동하면 자동으로 일시정지합니다.</p><p class="notes">iPhone: Safari 공유 → 홈 화면에 추가<br>Android: 브라우저 메뉴 → 앱 설치<br>오프라인 준비 완료가 표시된 후 인터넷 없이 실행할 수 있습니다.</p><p id="offline-state" role="status">${offlineReady?'오프라인 준비 완료':'오프라인 파일 준비 중 · 인터넷 연결을 유지하세요'}</p><button id="apply-update" class="secondary" ${workerRegistration?.waiting?'':'hidden'}>저장하고 새 버전 적용</button><p class="build-info">최근 빌드 시간<br><time datetime="${BUILD_TIME.startsWith('__')?'':BUILD_TIME}">${buildLabel}</time></p>`);
 $('apply-update').onclick=applyUpdate;if(workerRegistration)checkOfflineReady();$('open-build').onclick=showBuild;$('open-history').onclick=showHistory;$('open-diagnostics').onclick=showDiagnostics;$('export-save').onclick=exportSave;$('import-save').onchange=importSave;
 const settings={music:['music','checked'],sound:['sound','checked'],shake:['shake','checked'],left:['leftHanded','checked'],quality:['quality','value'],strategy:['strategy','value'],'pad-size':['padSize','number'],'text-size':['textSize','text'],'damage-numbers':['damageNumbers','checked'],effects:['effectOpacity','number']};
 for(const [id,[key,type]] of Object.entries(settings)){const control=$('s-'+id);if(type==='value'||type==='number')control.value=profile.settings[key];control.onchange=()=>{const value=type==='checked'?control.checked:type==='number'?Number(control.value):type==='text'?(control.checked?'large':'normal'):control.value;const ok=applyProfileEdit(p=>{p.settings[key]=value;});applyControls();resize();if(!ok)showSettings();};}

}
function showDiagnostics(){
 const current=diagnostics.summary(),rows=profile.history.filter(r=>r.performance).slice(-20);
 const describe=m=>{const n=k=>Number.isFinite(m[k])?m[k]:'—';return `<p>측정 ${n('seconds')}초 · 평균 ${n('fps')} FPS<br>프레임 지연 95% 기준 ${n('p95ms')}${m.p95Capped?'+':''}ms · 최대 ${n('maxFrameMs')}ms<br>50ms 초과 ${n('slowFrames')}회 · 적 최대 ${n('peakEnemies')} · 탄환 최대 ${n('peakProjectiles')}<br>터치 왼쪽 ${n('leftTouches')} / 오른쪽 ${n('rightTouches')} · 취소 ${n('cancellations')}회<br>화면 ${n('width')}×${n('height')} · 화질 ${esc(m.quality||'—')}</p>`;};
 openModal('diagnostics',`${header('PLAY PERFORMANCE','플레이 성능 확인')}<p>FPS는 초당 화면 갱신 횟수입니다. 목표 60, 지속 30 이상을 확인하세요. 앱을 벗어난 시간은 제외합니다. 이어하기는 새 측정 구간입니다.</p><strong>현재 실행 구간</strong>${current.frames?describe(current):'<p>전투를 진행하면 측정값이 표시됩니다.</p>'}${rows.slice().reverse().map(r=>`<div class="history-row"><strong>${battleStageLabel(r)} · ${r.state==='won'?'승리':'도전 종료'}</strong>${describe(r.performance)}</div>`).join('')}<p>기기 안에서만 기록합니다. 발열·배터리·운영체제 제스처는 자동 검사하지 않습니다.</p><button id="export-diagnostics" class="secondary">진단 기록 내보내기</button>`);
 $('export-diagnostics').onclick=()=>exportSave({build:BUILD_TIME,current,history:rows.map(r=>({id:r.id,floor:r.floor,mode:r.mode||'tower',depth:r.depth||1,difficulty:r.difficulty||'normal',hero:r.hero,state:r.state,createdAt:r.createdAt,performance:r.performance}))},'babel-performance.json');
}
function showResearch(){openModal('research',`${header('BENCHMARK NOTES','리서치 노트')}<p>Steam 공식 소개, 유튜브 영상 설명·챕터, 공개 리뷰를 교차 검토했습니다. 영상 재생 화면과 전체 자막은 확보하지 못했습니다.</p><div class="item-row"><div><strong>생존 × 장비 성장</strong><p>군집 전투와 스킬 선택을 유지하고, 획득 장비와 영구 강화를 다음 도전에 연결합니다.</p></div></div><div class="item-row"><div><strong>모바일에 맞춘 재설계</strong><p>세로 화면 · 자동 조준 · 거리 기반 연속 탐험 · 자동 축복 · 전용 스킬 분기 · 장비·보석 커스텀 · 전투 저장</p></div></div><a class="research-card" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=247FHP-4Qj4">The Singleplayer Squad · 데모 설명과 첫인상 ↗<small>2025-05-16 · 성장, 장비, 허브, 전투 챕터</small></a><a class="research-card" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=A9k4x44LRqw">무해설 데모 플레이 영상 ↗<small>재생 화면 분석은 추가 검증 필요</small></a><a class="research-card" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=yvjJV2nTcmY">Gameplay 영상 ↗<small>검색 색인에서 영상 존재 확인</small></a><a class="research-card" target="_blank" rel="noopener" href="https://store.steampowered.com/app/2665680/Tower_of_Babel_Survivors_of_Chaos/?l=koreana">벤치마크 · Steam 공식 소개 ↗<small>원작: NANOO · 본 게임은 독립 프로토타입</small></a><p class="notes">전체 분석과 구현 대응표는 GitHub의 docs/research.md를 참고하세요.</p>`);}
function startGame(resume=false,floor=profile.selectedFloor){
 if(!store?.writable){blockWrites();return;}
 const prepared=prepareRun(profile,{resume,floor,id:crypto.randomUUID()},persistTransaction);
 if(!prepared.ok){transactionResult(prepared);return;}
 game=prepared.game;beginBattle(resume);
}
function beginBattle(resume=false){
 clearPauseNotice();
 bossSlots=game.livingBosses().map(b=>b.id);
 storageAvailable=true;$('result-page').hidden=true;closeModal();showLobby(false);

 diagnostics.start({build:BUILD_TIME,width:window.innerWidth,height:window.innerHeight,quality:profile.settings.quality,resumed:resume});stepAccumulator=0;paused=false;$('battle').hidden=false;document.body.style.overflow='hidden';resize();applyControls();lastTime=performance.now();saveClock=0;hudClock=0;updateHud();draw();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);sound('start');
 if(game.state==='choosing')showChoices();else if(isArenaPreview())announce('투기장 미리보기 · 보스 2체 · 5분');else if(exploring(game))announce('시작점에서 출발 · 수문장 화살표를 따라 탐험');else announce(`${String(game.floor).padStart(2,'0')}F · ${FLOORS[game.floor-1].name}`);
 $('battle-results').textContent=isArenaPreview()?'미리보기 상태 · 종료':'전투 결과 확인';$('battle-results').focus();
 $('battle-help').textContent='화면 어디든 드래그해 이동 · 나머지는 자동';$('battle-help').hidden=false;setTimeout(()=>{if(!paused)$('battle-help').hidden=true;},6000);const starter=game.decisionLog.find(d=>d.source==='starting');$('auto-status').textContent=starter?`시작 스킬 · ${SKILLS.find(s=>s.id===starter.id)?.name}`:`자동 선택 성향 · ${STRATEGIES[game.autoStrategy]||'균형'}`;
}
function arenaScaleLabel(best,difficulty){return `${best>0?`최고 정복 혼돈 ${best}단계`:'혼돈 정복 기록 없음 · 기본 난도'} · ${DIFFICULTIES[difficulty].name}`;}
function showArenaPreviewIntro(){
 const journey=normalizeJourney(profile.journey);
 openModal('arena-intro',`${header('ARENA PREVIEW','투기장 전투 미리보기')}<p>보스 2체와 잡몹을 상대하는 5분 전투입니다. 두 보스를 모두 처치하면 끝납니다.</p><p>현재 영웅·장착 장비·영구 강화·자동 선택 설정으로 레벨 1부터 시작합니다. 적 구성과 수치는 모바일 시험용입니다.</p><p>난도 기준: ${arenaScaleLabel(journey.chaosBestCleared,journey.difficulty)}<br>선택한 층·혼돈 단계 대신 최고 정복 기록에 기존 모바일 배율을 적용합니다. 전장은 고정되며 원작의 정확한 난도 재현은 아닙니다.</p><p>무료 · 보상 지급 없음. 미리보기의 성장과 획득품은 저장되지 않으며, 기존 장비·재화·저장된 전투는 유지됩니다. 새로고침하거나 앱을 완전히 닫으면 미리보기가 종료됩니다.</p><button id="begin-arena-preview" class="primary">무료 미리보기 시작</button><button id="cancel-arena-preview" class="secondary">취소</button>`);
 $('cancel-arena-preview').onclick=closeModal;
 $('begin-arena-preview').onclick=()=>{if(!store?.writable){blockWrites();return;}game=new Game(structuredClone(profile),{encounter:'dual-boss'});beginBattle();};
}
function showArenaPreviewResult(){
 const active=['playing','choosing'].includes(game.state);if(active)pauseGame();
 const outcome=active?'paused':game.state==='won'?'victory':game.player.hp<=0?'defeated':game.time>=game.timeLimit()?'timeout':'ended';
 const outcomeLabel={paused:'일시정지',victory:'승리',defeated:'패배 · 체력 소진',timeout:'패배 · 시간 초과',ended:'종료'}[outcome];
 const metrics=diagnostics.summary(),report={build:BUILD_TIME,preview:true,outcome,encounter:'dual-boss',arenaBestCleared:game.arenaBestCleared,depth:game.depth,difficulty:game.difficulty,hero:game.hero,state:active?'paused':game.state,time:game.time,kills:game.kills,bossesRemaining:game.livingBosses().length,performance:metrics};
 showResultPage(`<span class="section-kicker">ARENA PREVIEW</span><h2 id="dialog-title">투기장 미리보기 · ${outcomeLabel}</h2><p>난도 기준: ${arenaScaleLabel(game.arenaBestCleared,game.difficulty)}</p><p>전투 ${formatTime(game.time)} · 처치 ${game.kills} · 남은 보스 ${report.bossesRemaining}체</p><p>보상 지급 없음 · 기존 저장된 전투와 재화는 유지됩니다.</p><p>평균 ${metrics.fps??'—'} FPS · 화면 지연 95% 기준 ${metrics.p95ms??'—'}${metrics.p95Capped?'+':''}ms</p>${active?'<button id="preview-continue" class="primary">미리보기 계속</button>':'<button id="preview-retry" class="primary">다시 미리보기</button>'}<button id="preview-home" class="secondary">미리보기 종료 · 로비로</button><button id="preview-diagnostics" class="secondary">미리보기 진단 내보내기</button>`);
 if(active)$('preview-continue').onclick=()=>{modalKind='';$('result-page').hidden=true;$('battle').hidden=false;$('battle-results').focus();document.body.style.overflow='hidden';resumeBattle();};
 else $('preview-retry').onclick=()=>{game=new Game(structuredClone(profile),{encounter:'dual-boss'});beginBattle();};
 $('preview-home').onclick=goHome;$('preview-diagnostics').onclick=()=>exportSave(report,'babel-arena-preview.json');
}
$('start').onclick=()=>{
 if(profile.run){openModal('new',`${header('NEW JOURNEY','새 도전을 시작할까요?')}<p>저장된 ${battleStageLabel(profile.run)} 전투는 종료되고 현재까지 획득한 보상이 정산됩니다.</p><button class="primary" id="confirm-new">새 도전 시작</button><button class="secondary" id="continue-old">저장된 전투 이어하기</button>`);$('confirm-new').onclick=()=>{const old=Game.restore(profile,profile.run);if(!old){confirmDiscardRun();return;}if(old){old.state='lost';const settled=settleRun(profile,old,persistTransaction);if(!settled.ok){toast(settled.error);return;}}startGame();};$('continue-old').onclick=()=>startGame(true);}else{openModal('intro',`${header('ENTER THE SPIRE','준비되셨나요?')}<div class="intro-icon">${svg(HEROES[profile.selectedHero].icon)}</div><p><b>${HEROES[profile.selectedHero].name}</b> · ${FLOORS[profile.selectedFloor-1].name}<br>${DIFFICULTIES[profile.journey.difficulty].name} · ${profile.journey.mode==='chaos'?'혼돈 '+profile.journey.chaosDepth+'단계':'탑 도전'}<br>화면 어디든 드래그해 이동하세요.<br>공격·회피·폭발·축복 선택은 자동입니다.<br>시작 지점의 경험치 포인트 8개를 자동 수집합니다.<br>시작점에서 멀수록 적이 강해집니다. 화살표를 따라 수문장을 찾아가세요.<br>처치 후 같은 맵에서 계속 탐험합니다. 적·수문장·구조물은 1,000m 이상 멀어지면 제거되고 재방문 시 다시 생성됩니다.<br>강화 자동 사용 예산 ${profile.automation.upgradeBudget}파편 · 보존 ${profile.automation.reserve}파편</p><button id="enter" class="primary">도전 시작 ${svg('arrow')}</button><p class="notes">모바일 전용 · 전투 중에는 이동만 조작하세요. 자동 선택 성향은 로비 설정에서 바꿀 수 있습니다.</p>`);$('enter').onclick=()=>startGame();}
};
$('resume').onclick=()=>startGame(true);
function confirmDiscardRun(){openModal('damaged-run',`${header('RECOVER JOURNEY','전투 저장을 읽을 수 없습니다')}<p>장비와 파편은 유지됩니다. 새 도전을 시작하면 읽을 수 없는 전투 기록만 삭제되며, 이 전투의 미정산 보상은 복원할 수 없습니다.</p><button id="export-damaged-run" class="secondary">먼저 현재 저장 백업</button><button id="discard-damaged-run" class="primary">전투 기록 삭제 후 새 도전</button><button id="cancel-damaged-run" class="secondary">취소</button>`);$('export-damaged-run').onclick=exportSave;$('cancel-damaged-run').onclick=closeModal;$('discard-damaged-run').onclick=()=>{const previous=profile.run;profile.run=null;if(!save()){profile.run=previous;return;}startGame();};}

function refreshDirection(){
 input.x=joystick.x;input.y=joystick.y;
 $('joystick').classList.toggle('active',joystick.pointerId!==null);
 $('joystick-stick').style.transform=`translate(calc(-50% + ${joystick.dx}px),calc(-50% + ${joystick.dy}px))`;
}
function resetInput(){const id=joystick.pointerId;joystick.reset();refreshDirection();if(id!==null&&$('battle').hasPointerCapture?.(id))$('battle').releasePointerCapture(id);}
function applyControls(){document.documentElement.style.setProperty('--pad-size',`${profile.settings.padSize}px`);document.body.classList.toggle('large-text',profile.settings.textSize==='large');document.querySelector('.controls').style.justifyContent=profile.settings.leftHanded?'flex-end':'flex-start';const abilities=document.querySelector('.auto-abilities');abilities.style.left=profile.settings.leftHanded?'24px':'auto';abilities.style.right=profile.settings.leftHanded?'auto':'24px';}
$('battle').addEventListener('pointerdown',e=>{
 if(e.target?.closest?.('#battle-results'))return;
 if(!game||!['playing','choosing'].includes(game.state)||(e.pointerType==='mouse'&&e.button!==0)||document.hidden||$('battle').hidden||!$('overlay').hidden)return;
 if(!storageAvailable&&!save())return;
 const previousPointer=joystick.pointerId;
 if(!joystick.begin(e.pointerId,e.clientX,e.clientY,$('joystick').getBoundingClientRect()))return;
 if(paused)resumeBattle();
 diagnostics.touch(e.clientX,window.innerWidth);$('joystick').style.left=`${e.clientX}px`;$('joystick').style.top=`${e.clientY}px`;
 if(previousPointer!==null&&previousPointer!==e.pointerId&&$('battle').hasPointerCapture?.(previousPointer))$('battle').releasePointerCapture(previousPointer);
 try{$('battle').setPointerCapture?.(e.pointerId);}catch{/* Window move/up handlers still release input if capture is unavailable. */}
 refreshDirection();e.preventDefault();
});
$('battle').addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('pointermove',e=>{if(joystick.move(e.pointerId,e.clientX,e.clientY)){refreshDirection();e.preventDefault();}},{passive:false});
for(const name of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(name,e=>{if(joystick.end(e.pointerId)){if(name==='pointercancel')diagnostics.cancel();refreshDirection();}});
window.addEventListener('keydown',e=>{
 if(e.key==='Tab'&&!$('overlay').hidden){const f=[...$('dialog').querySelectorAll('button:not(:disabled),a,input,select')];if(f.length){const first=f[0],last=f.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===$('dialog'))){e.preventDefault();first.focus();}}}
 if(e.key==='Escape'&&!game&&!$('overlay').hidden)closeModal();
});
function pauseGame(){if(!game||!['playing','choosing'].includes(game.state)||paused)return;paused=true;diagnostics.interrupt();resetInput();if(save())showPauseNotice();}
function goHome(){save();closeModal();$('result-page').hidden=true;showLobby(true);cancelAnimationFrame(raf);game=null;paused=false;resetInput();$('battle').hidden=true;document.body.style.overflow='';renderHome();$('start').focus();}
function showChoices(){const decisions=resolveChoices(game);if(decisions.length){const last=decisions.at(-1),skill=SKILLS.find(s=>s.id===last.id);$('auto-status').textContent=`자동 선택 · ${skill.name} · ${last.reason}`;clearTimeout(autoNoticeTimer);autoNoticeTimer=setTimeout(()=>{if(game)$('auto-status').textContent=`자동 선택 성향 · ${STRATEGIES[game.autoStrategy]||'균형'}`;},3500);sound('level');save();updateHud();}}
function showResultPage(html){modalKind='result';resetInput();$('battle').hidden=true;showLobby(false);$('result-page').hidden=false;$('result-page').innerHTML=html.replaceAll('id="dialog-title"','id="result-title"');$('result-page').focus();document.body.style.overflow='';}
function finishGame(){
 if(isArenaPreview()){showArenaPreviewResult();return;}
 game.performance=diagnostics.summary();
 const won=game.state==='won',settled=won?advanceStage(profile,game,persistTransaction):settleRun(profile,game,persistTransaction);
 if(!settled.ok){showResultPage(`<h2 id="dialog-title">보상 저장 대기</h2><p>${esc(settled.error)}<br>저장에 성공하면 계속 진행합니다.</p><button id="retry-reward" class="primary">저장 후 계속</button><button id="export-pending" class="secondary">미정산 결과 백업</button>`);$('retry-reward').onclick=finishGame;$('export-pending').onclick=()=>{const backup=continuousRunBackup(profile,game);if(backup.ok)exportSave(backup.profile,'babel-pending-reward.json');else toast(backup.error);};return;}
 renderHome();sound(won?'win':'hit');
 if(won){
  game=settled.game;resize();storageAvailable=true;resumeBattle();modalKind='';$('result-page').hidden=true;$('battle').hidden=false;document.body.style.overflow='hidden';
  diagnostics.start({build:BUILD_TIME,width:window.innerWidth,height:window.innerHeight,quality:profile.settings.quality,resumed:false});
  stepAccumulator=0;saveClock=0;hudClock=0;lastTime=performance.now();updateHud();
  announce(exploring(game)?'수문장 처치 · 자동 장착 완료 · 다음 위치로 탐험':`자동 장착 완료 · ${game.mode==='chaos'?'혼돈 '+game.depth+'단계':game.floor+'층'} 시작`);
  $('battle-results').textContent='전투 결과 확인 · 새 결과';
 }else showBattleResults();
}
function showBattleResults(){
 if(isArenaPreview()){showArenaPreviewResult();return;}
 if(game&&['playing','choosing'].includes(game.state)){pauseGame();if(!storageAvailable)return;}
 const active=game&&['playing','choosing'].includes(game.state);
 const rows=[...profile.history].reverse();
 showResultPage(`<span class="section-kicker">BATTLE RESULTS</span><h2 id="dialog-title">전투 결과 · 자동 장착</h2><p>${active?battleStageLabel(game)+' · 일시정지 중입니다. 계속하면 같은 전투로 돌아갑니다.':'전투가 종료되었습니다.'}</p>${active?'<button id="result-continue" class="primary">전투 계속</button>':''}<button id="result-home" class="secondary">전투 종료 · 로비로</button><p>장비 변경은 로비에서 할 수 있습니다. 최근 20개 단계의 결과입니다.</p>${rows.map(r=>`<section class="history-row"><h3>${battleStageLabel(r)} · ${r.state==='won'?'정복':'종료'}</h3><p>처치 ${r.kills} · 파편 +${r.gold} · ${formatTime(r.time)}</p><div class="build-list"><strong>장비 자동 장착</strong>${equipmentHistory(r.equipment)}</div>${(r.loot||[]).map(i=>{const slot=r.equipment?.find(e=>e.slot===i.slot);return `<div class="item-row"><div><strong>${esc(i.name)}</strong><p>${itemText(i)}</p><p>${slot?.after===i.id?'자동 장착됨':slot?.reason==='잠근 부위 유지'?'보관됨 · 잠금으로 기존 장비 유지':'보관됨 · 더 높은 추천 점수의 장비 유지'}</p></div></div>`;}).join('')}${skillHistory(r)}<details><summary>이 단계의 자동 선택 기록</summary>${decisionHistory(r.decisions)}</details></section>`).join('')||'<p>아직 완료한 단계가 없습니다.</p>'}`);
 $('battle-results').textContent='전투 결과 확인';
 if(active)$('result-continue').onclick=()=>{modalKind='';$('result-page').hidden=true;$('battle').hidden=false;$('battle-results').focus();document.body.style.overflow='hidden';resumeBattle();};
 $('result-home').onclick=()=>{
  if(active){const snapshot=game.snapshot();snapshot.state='lost';snapshot.performance=diagnostics.summary();const copy={state:'lost',runId:game.runId,snapshot:()=>snapshot};const result=settleRun(profile,copy,persistTransaction);if(!result.ok){toast(result.error);return;}game.state='lost';game.rewarded=true;}
  goHome();
 };
}
$('battle-results').onclick=showBattleResults;
function announce(message){$('announcement').textContent=message;$('announcement').classList.add('show');clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>$('announcement').classList.remove('show'),2200);}
function formatTime(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function updateHud(){
 if(!game)return;const p=game.player;$('hp-fill').style.width=`${p.hp/p.maxHp*100}%`;$('hp-text').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('xp-fill').style.width=`${game.xp/game.nextXp*100}%`;$('level').textContent=`LV.${game.level}`;$('b-floor').textContent=`${String(game.floor).padStart(2,'0')}F`;$('b-name').textContent=isArenaPreview()?'투기장 미리보기':(game.mode==='chaos'?'혼돈 '+game.depth+' · ':'')+FLOORS[game.floor-1].name;$('kills').textContent=game.kills;$('run-gold').textContent=isArenaPreview()?'미지급':game.gold;
 $('timer').textContent=exploring(game)?`시작점 ${Math.round(radialDistance(p))}m · 위험 ${areaLevel(p)}`:game.bossSpawned?`보스 제한 ${formatTime(game.timeRemaining())}`:`${formatTime(game.time)} / ${formatTime(game.duration)}`;
 const bosses=game.livingBosses(),dual=isArenaPreview(),tracked=dual?bossSlots.map(id=>bosses.find(b=>b.id===id)):[game.currentBoss()],markers=[];
 for(let i=0;i<2;i++){
  const suffix=i?'-2':'',boss=tracked[i],row=$('boss-hud'+suffix),marker=$('boss-direction'+suffix),label=dual?`보스 ${i+1}`:BOSS_PATTERNS[game.floor-1].name;
  row.hidden=!boss;marker.hidden=true;if(!boss)continue;
  const percent=clamp(boss.hp/boss.maxHp*100,0,100);
  $('boss-fill'+suffix).style.width=`${percent}%`;row.querySelector('span').textContent=`${label} · ${Math.ceil(percent)}%${percent<=40?' · 분노':''}`;
  const dx=(boss.x-p.x)*zoom,dy=(boss.y-p.y)*zoom,rx=Math.max(30,w/2-45),ry=Math.max(30,h/2-70);
  if(!exploring(game)&&['playing','choosing'].includes(game.state)&&(Math.abs(dx)>rx||Math.abs(dy)>ry)){
   const ratio=Math.min(rx/(Math.abs(dx)||1),ry/(Math.abs(dy)||1));let x=w/2+dx*ratio,y=h/2+dy*ratio;
   if(markers.some(m=>Math.abs(m.x-x)<60&&Math.abs(m.y-y)<44))y+=y<h/2?44:-44;
   markers.push({x,y});marker.hidden=false;marker.style.left=`${x}px`;marker.style.top=`${y}px`;marker.querySelector('b').style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;marker.querySelector('span').textContent=dual?label:'보스';marker.setAttribute('aria-label',`화면 밖 ${label} 방향`);
  }
 }
 updateExplorationGuides();
 const active=['playing','choosing'].includes(game.state),lowHp=active&&p.hp>0&&p.hp/p.maxHp<=.25,urgent=active&&game.bossSpawned&&game.timeRemaining()<=15;
 $('battle').classList.toggle('low-health',lowHp);$('timer').classList.toggle('urgent',urgent);
 const warning=$('combat-warning'),warningText=[lowHp?'체력 부족 · 안전한 방향으로 이동하세요':'',urgent?'시간 임박 · 수문장을 처치하세요':''].filter(Boolean).join(' / ');
 warning.hidden=!warningText;if(warning.textContent!==warningText)warning.textContent=warningText;
 for(const [id,cd,label] of [['dash',game.dashCd,'회피'],['nova',game.novaCd,'영혼 폭발']]){const ready=cd<=0&&game.state==='playing';$(id+'-cd').textContent=cd>0?Math.ceil(cd):'';$(id).classList.toggle('ready',ready);$(id).setAttribute('aria-label',`${label} · ${cd>0?Math.ceil(cd)+'초 후 사용 가능':ready?'사용 가능':'전투 대기'}`);}

 const tray=Object.entries(game.skills).filter(([,lv])=>lv>0).map(([id,lv])=>{const s=SKILLS.find(s=>s.id===id);return `<div class="skill-chip" aria-label="${s.name} 레벨 ${lv}">${svg(s.icon)}<small>${lv}</small></div>`;}).join('');if($('skill-tray').innerHTML!==tray)$('skill-tray').innerHTML=tray;
}
function updateExplorationGuides(){
 const markers=[];
 for(const id of ['origin-direction','next-gate-direction','previous-gate-direction'])$(id).hidden=true;
 for(const guide of explorationGuides(game)){
  const marker=$(guide.id),dx=(guide.point.x-game.player.x)*zoom,dy=(guide.point.y-game.player.y)*zoom,rx=Math.max(30,w/2-65),ry=Math.max(30,h/2-95);
  if(Math.abs(dx)<=w/2-25&&Math.abs(dy)<=h/2-25)continue;
  const ratio=Math.min(rx/(Math.abs(dx)||1),ry/(Math.abs(dy)||1));let x=w/2+dx*ratio,y=h/2+dy*ratio;
  for(let i=0;i<3&&markers.some(m=>Math.abs(m.x-x)<105&&Math.abs(m.y-y)<48);i++)y=Math.max(80,Math.min(h-80,y+(y<h/2?52:-52)));
  markers.push({x,y});marker.hidden=false;marker.style.left=`${x}px`;marker.style.top=`${y}px`;
  marker.querySelector('b').style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
  marker.querySelector('span').textContent=`${guide.label} · ${Math.round(Math.hypot(dx,dy)/zoom)}m`;marker.setAttribute('aria-label',marker.querySelector('span').textContent+' 방향');
 }
}
function resize(){w=window.innerWidth;h=window.innerHeight;dpr=profile.settings.quality==='low'?1:Math.min(window.devicePixelRatio||1,2);$('canvas').width=Math.floor(w*dpr);$('canvas').height=Math.floor(h*dpr);zoom=clamp(w/490,.65,1.25);if(w>h)zoom=clamp(h/560,.6,1);if(game&&exploring(game))setWorldView(game,w/(2*zoom),h/(2*zoom));}
window.addEventListener('resize',()=>{
 const dimensionsChanged=w!==window.innerWidth||h!==window.innerHeight;
 if(dimensionsChanged){diagnostics.interrupt();resetInput();pauseGame();}
 resize();if(game)draw();
});
function loop(now){
 if(document.hidden&&game&&['playing','choosing'].includes(game.state)&&!paused)pauseGame();
 const dt=Math.min(Math.max(0,(now-lastTime)/1000),.2);lastTime=now;
 if(game&&!paused&&!document.hidden&&['playing','choosing'].includes(game.state)){
  diagnostics.frame(now,game.enemies.length,game.projectiles.length+game.enemyShots.length);musicTick(dt);stepAccumulator+=dt;while(stepAccumulator>=1/60&&game&&!paused&&['playing','choosing'].includes(game.state)){
   stepAccumulator-=1/60;if(game.state==='choosing')showChoices();if(paused)break;automateAbilities(game,input);if(game.state==='playing')game.update(1/60,input);
   if(game.event==='boss')announce('수문장이 깨어납니다');if(game.event==='hit')sound('hit');if(game.state==='choosing')showChoices();if(['won','lost'].includes(game.state)){finishGame();stepAccumulator=0;break;}
   saveClock+=1/60;if(saveClock>5){save();saveClock=0;}
  }
 }else {stepAccumulator=0;diagnostics.last=null;}
 hudClock+=dt;if(hudClock>.08){updateHud();hudClock=0;}if(game&&!paused&&modalKind!=='result')draw();raf=requestAnimationFrame(loop);
}
function suspendPage(){
 resetInput();if(game&&['playing','choosing'].includes(game.state)){if(!paused)pauseGame();else save();}else save();
}
window.addEventListener('blur',suspendPage);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendPage();else lastTime=performance.now();});
window.addEventListener('pagehide',()=>{suspendPage();store?.close();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
// Canvas art is drawn locally; no third-party images or runtime dependencies.
function path(points,fill,stroke){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
function draw(){
 if(!game||!ctx)return;const p=game.player,color=FLOORS[game.floor-1].color;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0c1519';ctx.fillRect(0,0,w,h);
 ctx.save();let shake=profile.settings.shake&&game.damageFlash>0?Math.sin(game.time*120)*4:0;ctx.translate(w/2+shake,h*.5);ctx.scale(zoom,zoom);ctx.translate(-p.x,-p.y);
 const minX=p.x-w/(2*zoom)-120,maxX=p.x+w/(2*zoom)+120,minY=p.y-h/(2*zoom)-120,maxY=p.y+h/(2*zoom)+120;
 // Staggered stonework, engraved paths and cracks.
 for(let gy=Math.floor(minY/64);gy<=Math.ceil(maxY/64);gy++)for(let gx=Math.floor(minX/96);gx<=Math.ceil(maxX/96);gx++){
  const x=gx*96+(gy%2)*48,y=gy*64,n=Math.abs((gx*17+gy*31)%7);
  if(!exploring(game)&&(x<-96||x>1600||y<-64||y>1600))continue;
  const shades=['#202b2d','#243033','#222e30','#263234','#1e2a2d','#232f31','#212b2e'];
  ctx.fillStyle=shades[n];ctx.fillRect(x+1,y+1,94,62);ctx.strokeStyle='#40515225';ctx.lineWidth=1;ctx.strokeRect(x+3,y+3,90,58);
  if(n===2){ctx.strokeStyle='#0e1b1f66';ctx.beginPath();ctx.moveTo(x+15,y+10);ctx.lineTo(x+35,y+25);ctx.lineTo(x+27,y+35);ctx.lineTo(x+44,y+60);ctx.stroke();}
  if(n===5){ctx.fillStyle='#5575631a';ctx.fillRect(x+6,y+51,28,5);}
 }
 if(!exploring(game)){ctx.strokeStyle='#77908033';ctx.lineWidth=4;ctx.strokeRect(15,15,1570,1570);ctx.strokeStyle='#0b1217';ctx.lineWidth=18;ctx.strokeRect(0,0,1600,1600);}
 ctx.save();ctx.translate(800,800);ctx.rotate(Math.PI/4);ctx.strokeStyle='#b1a77b28';ctx.lineWidth=2;ctx.strokeRect(-100,-100,200,200);ctx.strokeRect(-120,-120,240,240);ctx.restore();circle(800,800,62,null,'#aaab842a');
 if(exploring(game)){
  for(const {point,label,id} of explorationGuides(game)){
   if(point.x<minX||point.x>maxX||point.y<minY||point.y>maxY)continue;
   const tint=id==='origin-direction'?'#8fe8ce':id==='previous-gate-direction'?'#9babb3':'#edba79';
   circle(point.x,point.y,id==='origin-direction'?75:48,'#10272d',tint);
   ctx.save();ctx.translate(point.x,point.y);ctx.rotate(Math.PI/4);ctx.strokeStyle=tint;ctx.lineWidth=3;ctx.strokeRect(-26,-26,52,52);ctx.restore();
   ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle=tint;ctx.fillText(label,point.x,point.y-60);
   if(id==='origin-direction'){ctx.fillStyle='#426c66';ctx.fillRect(point.x-13,point.y-28,26,48);ctx.fillStyle=tint;ctx.fillRect(point.x-8,point.y-33,16,10);}
  }
 }
 // Visible obstacles use the exact collision rectangles.
 for(const o of gameObstacles(game)){if(o.x+o.w<minX||o.x>maxX||o.y+o.h<minY||o.y>maxY)continue;ctx.fillStyle='#0007';ctx.fillRect(o.x+7,o.y+7,o.w,o.h);ctx.fillStyle=exploring(game)?FLOORS[Math.min(4,areaLevel(o)-1)].color:color;ctx.fillRect(o.x,o.y,o.w,o.h);ctx.fillStyle='#17272ac0';ctx.fillRect(o.x+4,o.y+4,o.w-8,o.h-8);ctx.strokeStyle='#9dbaa780';ctx.lineWidth=2;ctx.strokeRect(o.x,o.y,o.w,o.h);}
 for(const e of game.enemies)if(e.telegraph>0){const radius=e.attackRadius||95,pulse=1-e.telegraph/(e.windup||1.1);circle(e.targetX,e.targetY,radius,'#d4695d1a','#dc7d69');circle(e.targetX,e.targetY,radius*pulse,null,'#dcb797');}
 // Experience point drops must remain visible independently of damage-number/effect settings.
 for(const gem of game.gems){
  if(gem.value<=0||gem.x<minX||gem.x>maxX||gem.y<minY||gem.y>maxY)continue;
  const r=gem.value>=6?8:6,bob=Math.sin(game.time*3+gem.x*.03)*1.5;
  circle(gem.x,gem.y,r+5,'#69dcb52a');
  ctx.save();ctx.translate(gem.x,gem.y+bob);path([[0,-r],[r*.75,0],[0,r],[-r*.75,0]],gem.value>=6?'#f0cf78':'#8fe8ce','#eaffdd');circle(-1,-2,1.5,'#ffffff');ctx.restore();
 }
 const entities=[...game.enemies.map(e=>({...e,isPlayer:false})),{...p,isPlayer:true}].sort((a,b)=>a.y-b.y);
 for(const e of entities){if(e.x<minX-60||e.x>maxX+60||e.y<minY-60||e.y>maxY+60)continue;if(e.isPlayer)drawPlayer(e);else drawEnemy(e);}
 for(const b of game.projectiles){ctx.strokeStyle=b.color;ctx.lineWidth=b.r;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(b.x-b.vx*.03,b.y-b.vy*.03);ctx.lineTo(b.x,b.y);ctx.stroke();circle(b.x,b.y,b.r*.7,'#e6dec0');}
 for(const b of game.enemyShots){circle(b.x,b.y,b.r+3,'#bc625b30');circle(b.x,b.y,b.r,'#da8473');circle(b.x-1,b.y-1,2,'#f4c7a0');}
 const orbit=game.skills.orbit||0;for(let i=0;i<orbit;i++){const a=game.time*2.8+i*Math.PI*2/orbit,x=p.x+Math.cos(a)*75,y=p.y+Math.sin(a)*75;ctx.save();ctx.translate(x,y);ctx.rotate(a+.8);path([[-4,-13],[4,-13],[3,10],[-3,10]],'#d1d8c4','#ab9674');ctx.restore();}
 for(const e of game.effects){ctx.save();ctx.globalAlpha=Math.max(0,e.life/e.maxLife)*profile.settings.effectOpacity;ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.lineWidth=3;const progress=1-e.life/e.maxLife;
  if(e.type==='bolt'){ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo((e.x+e.x2)/2+10,(e.y+e.y2)/2-7);ctx.lineTo(e.x2,e.y2);ctx.stroke();}
  else if(e.type==='slash'){ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.beginPath();ctx.arc(0,0,e.r*(.75+progress*.25),-1.15,1.15);ctx.stroke();ctx.globalAlpha*=.16;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,e.r,-1.15,1.15);ctx.closePath();ctx.fill();}
  else if(e.type==='death'){for(let i=0;i<5;i++)circle(e.x+Math.cos(i*1.26)*e.r*progress,e.y+Math.sin(i*1.26)*e.r*progress,3*(1-progress),e.color);}
  else{circle(e.x,e.y,e.r*(.2+progress*.8),null,e.color);ctx.globalAlpha*=.06;circle(e.x,e.y,e.r*(.2+progress*.8),e.color);}
  ctx.restore();
 }
 ctx.font='600 11px system-ui';ctx.textAlign='center';for(const t of profile.settings.damageNumbers?game.texts:[]){ctx.globalAlpha=Math.max(0,t.life/t.maxLife);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);}ctx.globalAlpha=1;ctx.restore();
 const v=ctx.createRadialGradient(w/2,h*.45,Math.min(w,h)*.18,w/2,h*.45,Math.max(w,h)*.68);v.addColorStop(0,'#040c1100');v.addColorStop(1,'#040c11bc');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 if(game.damageFlash>0){ctx.fillStyle=`rgba(179,52,46,${game.damageFlash*.5})`;ctx.fillRect(0,0,w,h);}
}
function drawPlayer(p){
 ctx.save();ctx.translate(p.x,p.y);ellipse(0,6,21,9,'#02080bac');circle(0,0,23,null,'#d0bd7760');
 if(p.invulnerable>0){circle(0,-9,30,null,'#b9d6c77a');if(Math.floor(game.time*20)%2===0)ctx.globalAlpha=.55;}
 const palette=['#9aab9d','#86b9aa','#92b2cf','#bda2de','#e1bc72'],weapon=game.appearance?.weapon,armor=game.appearance?.armor,charm=game.appearance?.charm,color=weapon?palette[weapon.rarity]||HEROES[game.hero].color:HEROES[game.hero].color,armorColor=armor?palette[armor.rarity]||'#637785':game.hero==='knight'?'#8a9290':game.hero==='mage'?'#527e70':'#637785',walk=Math.hypot(input.x,input.y)>.1?Math.sin(game.time*12)*3:0;
 const facing=Math.cos(p.face)<0?-1:1;ctx.scale(facing,1);
 path([[-13,-29],[-21,4],[-10,7],[0,0],[10,7],[17,2],[11,-29]],game.hero==='mage'?'#345954':'#534f41','#111d21');
 path([[-8,-5],[-9,4],[-3,6],[-1,-3]],'#1b2427');path([[3,-5],[5,5+walk],[12,5+walk],[9,-5]],'#1b2427');
 path([[-11,-27],[8,-27],[13,-12],[8,-3],[-9,-3],[-14,-14]],armorColor,'#17282c');
 path([[-12,-22],[-3,-26],[-4,-13],[-10,-9],[-16,-13]],color,'#26352f');
 path([[-7,-38],[2,-43],[12,-37],[11,-27],[-6,-27]],game.hero==='knight'?'#b0b7a5':'#d0baa2','#29382f');
 if(armor){ctx.strokeStyle=armorColor;ctx.lineWidth=2+(armor.enhancement||0)*.4;ctx.strokeRect(-13,-26,25,23);if((armor.archetype||0)%2)path([[-15,-27],[-21,-21],[-14,-17]],armorColor,'#17282c');}
 if(charm)circle(-3,-18,3+(charm.rarity||0)*.5,palette[charm.rarity]||'#86b9aa');
 if(game.hero==='knight'){path([[-8,-38],[3,-45],[13,-37],[10,-32],[-8,-31]],'#859087','#243531');ctx.fillStyle='#101e20';ctx.fillRect(0,-35,10,3);path([[16,-8],[19,-39],[23,-45],[26,-38],[22,-7]],'#cbd1bd','#536563');ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(13,-8);ctx.lineTo(26,-5);ctx.stroke();}
 if(game.hero==='mage'){path([[-12,-35],[2,-53],[14,-34]],'#4c7165','#233a37');ctx.strokeStyle='#ab9270';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(20,4);ctx.lineTo(20,-41);ctx.stroke();circle(20,-44,7,color);circle(20,-44,3,'#d4e9c6');}
 if(game.hero==='ranger'){path([[-9,-37],[2,-47],[13,-39],[8,-33],[-6,-31]],'#536979','#263d43');ctx.strokeStyle='#bea982';ctx.lineWidth=2;ctx.beginPath();ctx.arc(19,-19,17,-1.35,1.35);ctx.stroke();ctx.beginPath();ctx.moveTo(23,-35);ctx.lineTo(23,-3);ctx.stroke();}
 if(weapon){const type=(weapon.archetype||0)%3;if(type===0)path([[16,-37],[29,-44],[34,-32],[18,-28]],color,'#233a37');else if(type===1){circle(22,-42,7,color);circle(22,-42,3,'#eaf1d8');}else{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(17,-42,9,23);}if(weapon.enhancement)circle(22,-31,11,null,color);}
 ctx.restore();
}
function drawEnemy(e){
 ctx.save();ctx.translate(e.x,e.y);const boss=e.type==='boss',elite=e.type==='elite',scale=boss?2:elite?1.4:1;ctx.scale(scale,scale);ellipse(0,5,18,8,'#0006');
 if(e.slow>0){circle(0,0,22,null,'#88c6d58a');}const flash=e.hit>0;
 if(e.type==='runner'){
  path([[-19,2],[-9,-10],[-3,-14],[6,-11],[17,-4],[13,5],[4,1],[-4,6],[-13,5]],flash?'#d0d6b4':'#657c72','#14282b');path([[5,-11],[7,-21],[12,-14],[19,-9],[15,-1]],'#93a390','#20312d');circle(13,-10,2,'#d9a278');
 }else{
  path([[-12,-24],[-18,5],[-6,1],[1,6],[8,1],[17,5],[10,-24]],flash?'#b3bda1':e.type==='caster'?'#5f536b':boss?'#564c48':'#435651','#18292a');
  ctx.strokeStyle=elite||boss?'#a78e66':'#8d9b88';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-7,-14);ctx.lineTo(-8,6);ctx.moveTo(7,-14);ctx.lineTo(9,6);ctx.stroke();
  if(e.type==='caster'){path([[-12,-28],[1,-47],[12,-27]],flash?'#d2c0c8':'#797087','#293038');circle(0,-25,7,'#b8bca3');ctx.strokeStyle='#8b7b71';ctx.beginPath();ctx.moveTo(20,3);ctx.lineTo(20,-31);ctx.stroke();circle(20,-34,5,'#b67b99');}
  else{path([[-11,-34],[-5,-40],[6,-39],[13,-33],[10,-23],[-9,-23]],flash?'#f0e3b1':boss?'#a99881':'#a7ae97','#32443c');ctx.fillStyle='#162625';ctx.fillRect(-7,-33,4,4);ctx.fillRect(4,-33,4,4);ctx.fillRect(-2,-26,4,3);
   ctx.strokeStyle=elite||boss?'#ad926e':'#74866f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(15,-3);ctx.lineTo(22,-31);ctx.stroke();path([[19,-34],[19,-42],[29,-36],[26,-29]],elite||boss?'#ab9676':'#75837a');
  }
  if(boss){circle(0,-28,29,null,FLOORS[game.floor-1].color);path([[-11,-37],[-15,-51],[-5,-43],[0,-55],[5,-43],[15,-51],[11,-37]],'#af976a','#574e3c');circle(-5,-32,2,'#e8a168');circle(6,-32,2,'#e8a168');}
 }
 if(boss&&isArenaPreview()){const slot=bossSlots.indexOf(e.id);ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillStyle=slot===1?'#86b9aa':'#f2a39b';ctx.fillText(`보스 ${slot+1}`,0,23);}
 if(e.hp<e.maxHp&&!boss){ctx.fillStyle='#0b1415';ctx.fillRect(-17,12,34,3);ctx.fillStyle=elite?'#c6a66e':'#ac8173';ctx.fillRect(-17,12,34*Math.max(0,e.hp/e.maxHp),3);}ctx.restore();
}
renderHome();applyControls();resize();if(!store?.writable)blockWrites();else if($('save-banner').textContent)$('save-banner').hidden=false;if('serviceWorker'in navigator&&location.protocol!=='file:'){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(wasControlled||updateRequested){if(store?.writable&&!save())return;location.reload();}});
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{workerRegistration=reg;const refresh=()=>{if(modalKind==='settings'){const button=$('apply-update');if(button)button.hidden=!reg.waiting;} };reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',refresh));refresh();return navigator.serviceWorker.ready;}).then(checkOfflineReady).catch(()=>{if($('offline-state'))$('offline-state').textContent='오프라인 파일을 준비하지 못했습니다. 인터넷 연결 후 다시 열어 주세요.';});
}
function checkOfflineReady(){const worker=workerRegistration?.active;if(!worker)return;offlineReady=false;const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();if($('offline-state'))$('offline-state').textContent='새 버전 적용 후 오프라인 준비 상태를 확인하세요.';},5000);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();offlineReady=event.data?.ready===true&&event.data.build===BUILD_TIME;if($('offline-state'))$('offline-state').textContent=offlineReady?'오프라인 준비 완료':'새 버전 적용 후 오프라인 준비 상태를 확인하세요.';};worker.postMessage({type:'BUNDLE_STATUS'},[channel.port2]);}
function applyUpdate(){if(!workerRegistration?.waiting)return;if(game&&['playing','choosing'].includes(game.state)){toast('전투를 마친 뒤 새 버전을 적용하세요.');return;}if(!save())return;updateRequested=true;workerRegistration.waiting.postMessage({type:'APPLY_UPDATE'});}


function gemLabel(g){return `${GEM_DEFS[g.kind]?.name||'재료'} ${g.tier}등급`;}
function showJourney(){const j=normalizeJourney(profile.journey);openModal('journey',`${header('JOURNEY RULES','난이도·혼돈 던전')}<p>층 해금과 장비·영구 성장은 모든 직업이 공유합니다. 일반 5층 정복 후 어려움과 혼돈 던전, 어려움 5층 정복 후 악몽이 해금됩니다.</p><label class="setting">난이도<select id="journey-difficulty">${Object.entries(DIFFICULTIES).map(([key,d],i)=>`<option value="${key}" ${key===j.difficulty?'selected':''} ${i>j.unlockedDifficulty?'disabled':''}>${d.name}${i>j.unlockedDifficulty?' · 잠김':''}</option>`).join('')}</select></label><label class="setting">도전<select id="journey-mode"><option value="tower" ${j.mode==='tower'?'selected':''}>탑 · 선택한 층</option><option value="chaos" ${j.mode==='chaos'?'selected':''} ${j.chaosUnlocked?'':'disabled'}>혼돈 ${j.chaosDepth}단계 ${j.chaosUnlocked?'':'· 잠김'}</option></select></label><p>최고 정복: ${j.chaosBestCleared?`혼돈 ${j.chaosBestCleared}단계`:'확인된 정복 기록 없음'} · 최고 해금: ${j.chaosUnlocked?j.chaosMaxDepth+'단계':'잠김'}</p><label class="setting">혼돈 시작 단계<select id="journey-depth" ${j.chaosUnlocked?'':'disabled'}>${Array.from({length:20},(_,i)=>`<option value="${i+1}" ${i+1===j.chaosDepth?'selected':''} ${i+1>j.chaosMaxDepth?'disabled':''}>${i+1}단계${i+1>j.chaosMaxDepth?' · 잠김':''}</option>`).join('')}</select></label><p>해금된 혼돈 단계는 자유롭게 선택할 수 있습니다. 5·10·15단계 정복 시 다음 5개 단계가 해금됩니다. 진행 중 전투에는 영향을 주지 않고 새 도전부터 적용됩니다.</p><p>어려움: 적 체력 ×1.55 · 피해 ×1.3 · 전투 파편 ×1.6<br>악몽: 적 체력 ×2.2 · 피해 ×1.6 · 전투 파편 ×2.3<br>혼돈: 20단계까지 진행. 매 단계 적 체력·피해 +8%, 파편 보상 +5%. 희귀 수치와 보석 등급은 난이도·단계에 따라 상승합니다.</p><button id="save-journey" class="primary">도전 설정 저장 · 무료</button>`);$('save-journey').onclick=()=>{if(applyProfileEdit(p=>{p.journey=normalizeJourney({...j,difficulty:$('journey-difficulty').value,mode:$('journey-mode').value,chaosDepth:Number($('journey-depth').value)});}))closeModal();};}
function showWorkshop(itemId){const item=allItems(profile).find(i=>i.id===itemId);if(!item)return;const source=normalizeItem(item),available=Object.entries(profile.materials).filter(([,n])=>n>0),cost=30+source.enhancement*20;
 openModal('workshop',`${header('EQUIPMENT WORKSHOP','장비 강화·소켓')}<p>${esc(item.name)} · 강화 +${source.enhancement}/5<br>보유 ${profile.gold}파편 · ${itemText(item)}</p><p>기본 수치 ${(item.value*(1+source.enhancement*.1)).toFixed(1)} → ${(item.value*(1+Math.min(5,source.enhancement+1)*.1)).toFixed(1)}<br>강화는 기본 능력치만 단계당 10% 증가합니다. 옵션·보석·고유 효과는 중복 강화하지 않습니다.</p><button id="enhance-item" class="secondary" ${source.enhancement>=5||profile.gold<cost?'disabled':''}>강화 ${cost}파편 · 다음 +${Math.min(5,source.enhancement+1)} · 잔액 ${profile.gold-cost}</button><p>투자 원금 ${source.enhanceSpent} 반환 − 수수료 10파편 · 재설정 후 잔액 ${profile.gold+source.enhanceSpent-10}</p><button id="reset-item" class="secondary" ${!source.enhancement||profile.gold<10?'disabled':''}>강화 재설정 · 10파편</button><div class="build-list"><strong>소켓 ${source.sockets.length}개</strong><p>희귀 1개 · 영웅/전설 2개. 교체·회수 비용 5파편. 기존 보석은 재료함으로 반환됩니다.</p>${source.sockets.map((g,i)=>`<label class="setting">${i+1}. ${g?gemLabel(g):'빈 소켓'}<select data-socket-choice="${i}"><option value="">회수 · 빈 소켓</option>${available.map(([key,n])=>{const [kind,tier]=key.split(':');return `<option value="${key}">${gemLabel({kind,tier:Number(tier)})} · ${n}개</option>`;}).join('')}</select></label><button data-socket-apply="${i}" ${profile.gold<5?'disabled':''}>선택 적용 · 5파편 · 잔액 ${profile.gold-5}</button>`).join('')||'<p>이 등급의 장비에는 소켓이 없습니다.</p>'}</div><button id="workshop-back" class="secondary">장비함으로</button>`);
 $('enhance-item').onclick=()=>reviewTransaction('장비 강화',`${esc(item.name)} +${source.enhancement} → +${source.enhancement+1}<br>기본 능력치 ${(item.value*(1+source.enhancement*.1)).toFixed(1)} → ${(item.value*(1+(source.enhancement+1)*.1)).toFixed(1)}`,(p,id,persist)=>enhanceItem(p,itemId,id,persist,source.revision),()=>showWorkshop(itemId));
 $('reset-item').onclick=()=>reviewTransaction('장비 강화 재설정',`${esc(item.name)} +${source.enhancement} → +0 · 옵션과 소켓 유지`,(p,id,persist)=>resetItemEnhancement(p,itemId,id,persist,source.revision),()=>showWorkshop(itemId));$('workshop-back').onclick=showGear;
 $('dialog').querySelectorAll('[data-socket-apply]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.socketApply),value=$('dialog').querySelector(`[data-socket-choice="${index}"]`).value;let gem=null;if(value){const [kind,tier]=value.split(':');gem={kind,tier:Number(tier)};}reviewTransaction('소켓 변경',`${index+1}번 소켓 · ${source.sockets[index]?gemLabel(source.sockets[index]):'빈 소켓'} → ${gem?gemLabel(gem):'빈 소켓'}<br>기존 보석은 반환하며 선택한 보석 ${gem?'1':'0'}개를 사용합니다.`,(p,id,persist)=>socketGem(p,itemId,index,gem,id,persist,source.revision),()=>showWorkshop(itemId));});
}
function showAlchemy(){const owned=Object.entries(profile.materials).filter(([,n])=>n>0);openModal('alchemy',`${header('THE ALCHEMIST','연금술 · 보석·룬')}<p>보유 ${profile.gold}파편. 정예는 1등급 재료, 보스는 난이도에 따른 재료를 자동 보관합니다.</p><div class="build-list">${owned.map(([key,n])=>{const [kind,tier]=key.split(':');return `<p>${gemLabel({kind,tier:Number(tier)})} · ${n}개</p>`;}).join('')||'<p>정예와 보스를 처치해 재료를 획득하세요.</p>'}</div><label class="setting">사용 재료<select id="alchemy-source">${owned.map(([key,n])=>`<option value="${key}">${key.split(':').map((v,i)=>i?v:GEM_DEFS[v].name).join(' · ')} · ${n}개</option>`).join('')}</select></label><label class="setting">변환 종류<select id="alchemy-target">${Object.entries(GEM_DEFS).map(([key,d])=>`<option value="${key}">${d.name}</option>`).join('')}</select></label><p>합성: 같은 재료 3개 + 15파편 → 다음 등급 1개 (최대 3등급)<br>변환: 재료 1개 + 10파편 → 같은 등급의 선택한 종류 1개</p><button id="alchemy-combine" class="secondary" ${owned.length?'':'disabled'}>합성 계획 확인</button><button id="alchemy-convert" class="secondary" ${owned.length?'':'disabled'}>변환 계획 확인</button><div id="alchemy-preview"></div>`);
 const preview=mode=>{const [kind,tier]=$('alchemy-source').value.split(':'),source={kind,tier:Number(tier)},target=$('alchemy-target').value,next={kind:mode==='combine'?kind:target,tier:source.tier+(mode==='combine'?1:0)},cost=mode==='combine'?15:10,count=mode==='combine'?3:1;if(next.tier>3||mode==='convert'&&kind===target){toast('합성은 3등급까지, 변환은 다른 종류로 가능합니다.');return;}const id=crypto.randomUUID();$('alchemy-preview').innerHTML=`<p>${gemLabel(source)} ${count}개 → ${gemLabel(next)} 1개<br>${cost}파편 · 변경 후 잔액 ${profile.gold-cost}</p><button id="confirm-alchemy" ${profile.gold<cost||profile.materials[gemKey(source)]<count?'disabled':''}>지불·확정</button><button id="cancel-alchemy">취소</button>`;$('cancel-alchemy').onclick=()=>{$('alchemy-preview').innerHTML='';};$('confirm-alchemy').onclick=()=>{transactionResult(alchemy(profile,source,target,mode,id,persistTransaction));showAlchemy();};};$('alchemy-combine').onclick=()=>preview('combine');$('alchemy-convert').onclick=()=>preview('convert');
}
