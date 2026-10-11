const BUILD_TIME='__BUILD_TIME__';
const buildLabel=BUILD_TIME.startsWith('__')?'개발 실행 · 빌드 전':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(BUILD_TIME))+' KST';
import {Game,FLOORS,HEROES,SKILLS,UPGRADES,SLOT_NAMES,RARITIES,defaultProfile,loadProfile,equippedStats,costFor,grantRewards,clamp} from './engine.js';
const $=id=>document.getElementById(id),svg=(id,cls='')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='babel-mobile-v1';let storageAvailable=true,profile;
try{profile=loadProfile(JSON.parse(localStorage.getItem(KEY)));}catch{profile=defaultProfile();}
let game=null,paused=false,modalKind='',lastFocus=null,audio=null,raf=0,lastTime=0,saveClock=0,hudClock=0,toastTimer,announcementTimer,w=0,h=0,dpr=1,zoom=1;
const ctx=$('canvas').getContext('2d'),input={x:0,y:0},keys=new Set();let pointerId=null,pointerOrigin=null;
function save(){try{if(game&&['playing','choosing'].includes(game.state))profile.run=game.snapshot();localStorage.setItem(KEY,JSON.stringify(profile));}catch{if(storageAvailable){storageAvailable=false;toast('저장 공간을 사용할 수 없습니다. 이번 플레이는 계속할 수 있습니다.');}}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function sound(type){
 if(!profile.settings.sound)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();const t=audio.currentTime;const freq={start:220,level:660,hit:90,attack:180,win:550,select:440,dash:300}[type]||220;osc.type=type==='hit'?'sawtooth':'sine';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*(type==='hit'?.4:1.6),t+.12);gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(t+.21);}catch{/* Audio remains optional. */}
}
function renderHome(){
 $('gold').textContent=profile.gold.toLocaleString();$('floors').innerHTML=FLOORS.map((f,i)=>`<button class="floor ${profile.selectedFloor===i+1?'active':''} ${i+1>profile.unlocked?'locked':''}" data-floor="${i+1}" ${i+1>profile.unlocked?'disabled':''} aria-label="${i+1}층 ${esc(f.name)} ${i+1>profile.unlocked?'잠김':''}" aria-pressed="${profile.selectedFloor===i+1}">${i+1>profile.unlocked?'◇':String(i+1).padStart(2,'0')}<small>${i+1>profile.unlocked?'':'F'}</small></button>`).join('');
 $('floor-name').textContent=FLOORS[profile.selectedFloor-1].name;$('floor-desc').textContent=`90초 생존 · ${profile.selectedFloor}층 수문장`;
 $('classes').innerHTML=Object.entries(HEROES).map(([id,v])=>`<button class="class-card ${id===profile.selectedHero?'active':''}" data-hero="${id}" aria-pressed="${id===profile.selectedHero}">${svg(v.icon)}<strong>${v.name}</strong><small>${v.role}</small></button>`).join('');
 $('gear-summary').textContent=profile.inventory.length?`보유 장비 ${profile.inventory.length}개 · 장착 ${Object.values(profile.equipped).filter(Boolean).length}/3`:'획득한 장비로 더 강하게';
 $('upgrade-summary').textContent=`영구 강화 ${Object.values(profile.upgrades).reduce((a,b)=>a+b,0)}단계`;
 $('resume').hidden=!profile.run;$('sound').style.color=profile.settings.sound?'var(--gold)':'';$('sound').setAttribute('aria-label',profile.settings.sound?'소리 끄기':'소리 켜기');
}
$('floors').addEventListener('click',e=>{const b=e.target.closest('[data-floor]');if(!b)return;profile.selectedFloor=Number(b.dataset.floor);save();renderHome();});
$('classes').addEventListener('click',e=>{const b=e.target.closest('[data-hero]');if(!b)return;profile.selectedHero=b.dataset.hero;save();renderHome();sound('select');});
$('sound').onclick=()=>{profile.settings.sound=!profile.settings.sound;save();renderHome();sound('select');toast(profile.settings.sound?'사운드 켜짐':'사운드 꺼짐');};
function openModal(kind,html){
 modalKind=kind;lastFocus=document.activeElement;$('dialog').innerHTML=html;$('overlay').hidden=false;$('app').inert=true;resetInput();$('dialog').focus();
}
function closeModal(){modalKind='';$('overlay').hidden=true;$('app').inert=false;lastFocus?.focus?.();}
function header(kicker,title){return `<div class="dialog-header"><span class="section-kicker">${kicker}</span><button class="close" data-close aria-label="닫기">×</button></div><h2 id="dialog-title">${title}</h2>`;}
$('dialog').addEventListener('click',e=>{if(e.target.closest('[data-close]')){closeModal();if(game&&paused)paused=false;}});
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay')&&['gear','upgrades','settings','research'].includes(modalKind))closeModal();});
$('equipment').onclick=showGear;$('upgrades').onclick=showUpgrades;$('settings').onclick=showSettings;$('research').onclick=showResearch;
function itemText(i){return `${RARITIES[i.rarity]} · ${SLOT_NAMES[i.slot]} · ${i.slot==='weapon'?'공격력':i.slot==='armor'?'체력':'치명타'} +${i.value}${i.slot==='charm'?'%':''}`;}
function showGear(){
 const stats=equippedStats(profile);openModal('gear',`${header('THE ARMORY','장비 보관함')}<p>장착한 장비는 다음 도전부터 적용됩니다.</p><div class="stats-grid"><div><span>추가 공격력</span><strong>+${stats.damage}</strong></div><div><span>추가 체력 / 치명타</span><strong>+${stats.hp} <small style="font-size:12px">/ ${Math.round(stats.crit*100)}%</small></strong></div></div><div id="items">${profile.inventory.length?[...profile.inventory].reverse().map(i=>`<div class="item-row"><span class="rarity-${i.rarity}">${svg(i.slot==='weapon'?'sword':i.slot==='armor'?'shield':'gem')}</span><div><strong class="rarity-${i.rarity}">${esc(i.name)}</strong><p>${itemText(i)}</p></div><button data-equip="${esc(i.id)}">${profile.equipped[i.slot]===i.id?'장착 해제':'장착'}</button><button data-sell="${esc(i.id)}" ${profile.equipped[i.slot]===i.id?'disabled':''}>분해 +${10+i.rarity*15}</button></div>`).join(''):'<p>탑의 정예와 수문장을 처치하면 장비를 얻습니다.<br>장비 등급은 일반부터 전설까지 5단계입니다.</p>'}</div>`);
 $('items').onclick=e=>{const equip=e.target.closest('[data-equip]'),sell=e.target.closest('[data-sell]');if(equip){const i=profile.inventory.find(i=>i.id===equip.dataset.equip);if(i)profile.equipped[i.slot]=profile.equipped[i.slot]===i.id?null:i.id;}if(sell){const i=profile.inventory.find(i=>i.id===sell.dataset.sell);if(i&&profile.equipped[i.slot]!==i.id){profile.gold+=10+i.rarity*15;profile.inventory=profile.inventory.filter(g=>g.id!==i.id);}}save();renderHome();showGear();};
}
function showUpgrades(){openModal('upgrades',`${header('PERMANENT GROWTH','영혼의 강화')}<p>쓰러져도 사라지지 않는 힘. 모든 영웅에게 적용됩니다.</p><p class="modal-gold">보유 파편 ${profile.gold.toLocaleString()}</p>${UPGRADES.map(u=>`<div class="item-row">${svg(u.icon)}<div><strong>${u.name} <span class="lv-tag">${profile.upgrades[u.id]}/${u.max}</span></strong><p>${u.desc} · 현재 +${profile.upgrades[u.id]*(u.id==='power'?8:u.id==='health'?12:10)}${u.id==='health'?'':'%'}</p></div><button data-upgrade="${u.id}" ${profile.gold<costFor(profile.upgrades[u.id])||profile.upgrades[u.id]>=u.max?'disabled':''}>${profile.upgrades[u.id]>=u.max?'최대 강화':`${costFor(profile.upgrades[u.id])} 파편`}</button></div>`).join('')}`);
 $('dialog').querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const id=b.dataset.upgrade,u=UPGRADES.find(u=>u.id===id),cost=costFor(profile.upgrades[id]);if(profile.gold>=cost&&profile.upgrades[id]<u.max){profile.gold-=cost;profile.upgrades[id]++;save();renderHome();showUpgrades();sound('level');}});
}
function showSettings(){openModal('settings',`${header('SETTINGS','플레이 설정')}<label class="setting">효과음<input id="s-sound" type="checkbox" ${profile.settings.sound?'checked':''}></label><label class="setting">화면 흔들림<input id="s-shake" type="checkbox" ${profile.settings.shake?'checked':''}></label><label class="setting">왼손 모드 <small>이동 오른쪽</small><input id="s-left" type="checkbox" ${profile.settings.leftHanded?'checked':''}></label><label class="setting">화질<select id="s-quality"><option value="auto">자동</option><option value="low">절전</option><option value="high">높음</option></select></label><p>전투는 5초마다 자동 저장됩니다. 다른 앱으로 이동하면 자동으로 일시정지합니다.</p><p class="notes">iPhone: Safari 공유 → 홈 화면에 추가<br>Android: 브라우저 메뉴 → 앱 설치<br>처음 접속한 후에는 오프라인으로도 플레이할 수 있습니다.</p><p class="build-info">최근 빌드 시간<br><time datetime="${BUILD_TIME.startsWith('__')?'':BUILD_TIME}">${buildLabel}</time></p>`);
 $('s-quality').value=profile.settings.quality;for(const id of ['sound','shake','left','quality'])$(`s-${id}`).onchange=()=>{profile.settings.sound=$('s-sound').checked;profile.settings.shake=$('s-shake').checked;profile.settings.leftHanded=$('s-left').checked;profile.settings.quality=$('s-quality').value;save();renderHome();applyControls();resize();};
}
function showResearch(){openModal('research',`${header('BENCHMARK NOTES','리서치 노트')}<p>Steam 공식 소개, 유튜브 영상 설명·챕터, 공개 리뷰를 교차 검토했습니다. 영상 재생 화면과 전체 자막은 확보하지 못했습니다.</p><div class="item-row"><div><strong>생존 × 장비 성장</strong><p>군집 전투와 스킬 선택을 유지하고, 획득 장비와 영구 강화를 다음 도전에 연결합니다.</p></div></div><div class="item-row"><div><strong>모바일에 맞춘 재설계</strong><p>세로 화면 · 자동 조준 · 90초 웨이브 · 수치와 태그가 있는 스킬 카드 · 전투 저장</p></div></div><a class="research-card" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=247FHP-4Qj4">The Singleplayer Squad · 데모 설명과 첫인상 ↗<small>2025-05-16 · 성장, 장비, 허브, 전투 챕터</small></a><a class="research-card" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=A9k4x44LRqw">무해설 데모 플레이 영상 ↗<small>재생 화면 분석은 추가 검증 필요</small></a><a class="research-card" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=yvjJV2nTcmY">Gameplay 영상 ↗<small>검색 색인에서 영상 존재 확인</small></a><a class="research-card" target="_blank" rel="noopener" href="https://store.steampowered.com/app/2665680/Tower_of_Babel_Survivors_of_Chaos/?l=koreana">벤치마크 · Steam 공식 소개 ↗<small>원작: NANOO · 본 게임은 독립 프로토타입</small></a><p class="notes">전체 분석과 구현 대응표는 GitHub의 docs/research.md를 참고하세요.</p>`);}
function startGame(resume=false){
 closeModal();if(resume){game=Game.restore(profile,profile.run);if(!game){profile.run=null;save();renderHome();toast('저장된 전투를 복원할 수 없습니다. 새 도전을 시작하세요.');return;}}else game=new Game(profile);
 paused=false;$('battle').hidden=false;document.body.style.overflow='hidden';resize();applyControls();lastTime=performance.now();saveClock=0;hudClock=0;updateHud();draw();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);save();sound('start');
 if(game.state==='choosing')showChoices();else announce(`${String(game.floor).padStart(2,'0')}F · ${FLOORS[game.floor-1].name}`);
 $('battle-help').hidden=false;setTimeout(()=>$('battle-help').hidden=true,6000);
}
$('start').onclick=()=>{
 if(profile.run){openModal('new',`${header('NEW JOURNEY','새 도전을 시작할까요?')}<p>저장된 ${profile.run.floor}층 전투는 종료됩니다. 획득 보상은 전투 결과 화면에서만 정산됩니다.</p><button class="primary" id="confirm-new">새 도전 시작</button><button class="secondary" id="continue-old">저장된 전투 이어하기</button>`);$('confirm-new').onclick=()=>startGame();$('continue-old').onclick=()=>startGame(true);}else{openModal('intro',`${header('ENTER THE SPIRE','준비되셨나요?')}<div class="intro-icon">${svg(HEROES[profile.selectedHero].icon)}</div><p><b>${HEROES[profile.selectedHero].name}</b> · ${FLOORS[profile.selectedFloor-1].name}<br>왼쪽을 드래그하면 이동하며 공격은 자동입니다.<br>회피로 포위를 벗어나고, 폭발로 주변 적을 밀어내세요.<br>90초 후 등장하는 수문장을 60초 안에 처치하세요.</p><button id="enter" class="primary">도전 시작 ${svg('arrow')}</button><p class="notes">PC: WASD / 방향키 이동 · Space 회피 · E 폭발 · Esc 일시정지</p>`);$('enter').onclick=()=>startGame();}
};
$('resume').onclick=()=>startGame(true);
function resetInput(){input.x=0;input.y=0;keys.clear();pointerId=null;pointerOrigin=null;$('stick').style.transform='';$('joystick').style.left='';$('joystick').style.top='';$('joystick').style.position='';}
function applyControls(){document.querySelector('.controls').style.flexDirection=profile.settings.leftHanded?'row-reverse':'row';}
function pointerStart(e){
 if(!game||paused||game.state!=='playing'||pointerId!==null)return;
 if(e.button!==0||e.target.closest('button')||e.target.closest('.battle-hud'))return;const isJoy=e.target.closest('#joystick');if(!isJoy&&(profile.settings.leftHanded?e.clientX<w*.35:e.clientX>w*.65))return;
 pointerId=e.pointerId;pointerOrigin={x:e.clientX,y:e.clientY};e.target.setPointerCapture?.(e.pointerId);$('joystick').style.position='fixed';$('joystick').style.left=`${e.clientX-56}px`;$('joystick').style.top=`${e.clientY-56}px`;e.preventDefault();
}
$('battle').addEventListener('pointerdown',pointerStart);
window.addEventListener('pointermove',e=>{if(e.pointerId!==pointerId||!pointerOrigin)return;const dx=e.clientX-pointerOrigin.x,dy=e.clientY-pointerOrigin.y,mag=Math.hypot(dx,dy),n=Math.min(mag,40)/(mag||1);input.x=dx*n/40;input.y=dy*n/40;$('stick').style.transform=`translate(${dx*n}px,${dy*n}px)`;e.preventDefault();},{passive:false});
for(const name of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(name,e=>{if(e.pointerId===pointerId)resetInput();});
$('dash').addEventListener('pointerdown',e=>{e.preventDefault();if(!paused&&game?.dash(input))sound('dash');});$('nova').addEventListener('pointerdown',e=>{e.preventDefault();if(!paused&&game?.nova())sound('attack');});
// Keyboard activation remains available for the visible action buttons.
$('dash').onclick=e=>{if(e.detail===0&&!paused&&game?.dash(input))sound('dash');};$('nova').onclick=e=>{if(e.detail===0&&!paused&&game?.nova())sound('attack');};
window.addEventListener('keydown',e=>{
 if(e.key==='Tab'&&!$('overlay').hidden){const focusable=[...$('dialog').querySelectorAll('button:not(:disabled),a,input,select')];if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('dialog'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===$('dialog'))){e.preventDefault();first.focus();}}return;}
 if(e.key==='Escape'){if(modalKind==='pause'){closeModal();paused=false;}else if(game&&game.state==='playing'&&!paused)pauseGame();else if(['gear','upgrades','settings','research','intro','new'].includes(modalKind))closeModal();return;}
 if(!game||paused||!$('overlay').hidden)return;
 const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' ','e'].includes(key)){e.preventDefault();keys.add(key);}
 if(key===' '&&!e.repeat)game.dash(input);if(key==='e'&&!e.repeat)game.nova();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function pauseGame(){if(!game||game.state!=='playing'||paused)return;paused=true;save();openModal('pause',`${header('TAKE A BREATH','잠시, 숨을 고르세요')}<p>전투를 저장했습니다. 준비되면 도전을 계속하세요.</p><div class="build-list">${SKILLS.filter(s=>game.skills[s.id]).map(s=>`<div><strong>${esc(s.name)} · LV.${game.skills[s.id]}</strong><p>${s.description}</p></div>`).join('')||'<p>레벨을 올려 첫 축복을 선택하세요.</p>'}</div><button id="unpause" class="primary">계속하기</button><button id="exit-battle" class="secondary">저장 후 로비로</button>`);$('unpause').onclick=()=>{closeModal();paused=false;lastTime=performance.now();};$('exit-battle').onclick=goHome;}
$('pause').onclick=pauseGame;
function goHome(){save();closeModal();cancelAnimationFrame(raf);game=null;paused=false;resetInput();$('battle').hidden=true;document.body.style.overflow='';renderHome();}
function showChoices(){
 sound('level');openModal('choice',`<span class="section-kicker">BLESSING OF THE TOWER · LEVEL ${game.level}</span><h2 id="dialog-title">어떤 힘을 선택할까요?</h2><p>이번 층에서 사용할 축복을 하나 선택하세요.</p><div class="choice-list">${game.choices.map(id=>{const s=SKILLS.find(s=>s.id===id);return `<button class="skill-choice" data-skill="${id}" style="border-left-color:${s.color}">${svg(s.icon)}<div><strong>${s.name}</strong><span class="lv-tag">LV.${game.skills[id]||0} → ${(game.skills[id]||0)+1}</span><p>${s.description}</p>${s.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div></button>`;}).join('')}</div><button class="secondary" id="reroll" ${game.rerolls?'':'disabled'}>선택지 새로고침 · ${game.rerolls}회 남음</button>`);
 $('dialog').querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{game.choose(b.dataset.skill);closeModal();save();updateHud();sound('select');if(game.state==='choosing')showChoices();});$('reroll').onclick=()=>{if(game.reroll()){save();showChoices();}};
}
function finishGame(){
 const won=game.state==='won';grantRewards(profile,game);save();renderHome();sound(won?'win':'hit');
 openModal('result',`<span class="section-kicker">${won?'FLOOR CONQUERED':'THE TOWER REMEMBERS'}</span><h2 id="dialog-title" class="game-over-title">${won?'탑이 당신을 인정합니다.':'성장은, 사라지지 않습니다.'}</h2><p>${game.floor}층 · ${FLOORS[game.floor-1].name} ${won?'정복':'도전 종료'}${won&&game.floor===5?' · 모든 층을 정복했습니다!':''}</p><div class="stats-grid"><div><span>처치한 적</span><strong>${game.kills}</strong></div><div><span>획득 파편</span><strong>+${game.gold+(won?60*game.floor:15)}</strong></div><div><span>도달 레벨</span><strong>${game.level}</strong></div><div><span>생존 시간</span><strong>${formatTime(game.time)}</strong></div></div>${game.loot.map(i=>{const old=profile.inventory.find(g=>g.id===profile.equipped[i.slot]);return `<div class="item-row"><span class="rarity-${i.rarity}">${svg(i.slot==='weapon'?'sword':i.slot==='armor'?'shield':'gem')}</span><div><strong class="rarity-${i.rarity}">${esc(i.name)}</strong><p>${itemText(i)} · 현재 ${old?.value||0} → ${i.value}</p></div><button data-result-equip="${esc(i.id)}">장착</button></div>`;}).join('')}<button class="primary" id="result-home">보상 확인 · 로비로 ${svg('arrow')}</button>${won&&game.floor<5?'<button class="secondary" id="next-floor">다음 층 도전하기</button>':''}`);
 $('dialog').querySelectorAll('[data-result-equip]').forEach(b=>b.onclick=()=>{const i=profile.inventory.find(i=>i.id===b.dataset.resultEquip);if(i){profile.equipped[i.slot]=i.id;save();b.textContent='장착 완료';b.disabled=true;toast('다음 전투부터 장비 효과가 적용됩니다.');}});
 $('result-home').onclick=goHome;if($('next-floor'))$('next-floor').onclick=()=>{profile.selectedFloor=Math.min(5,game.floor+1);startGame();};
}
function announce(message){$('announcement').textContent=message;$('announcement').classList.add('show');clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>$('announcement').classList.remove('show'),2200);}
function formatTime(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
function updateHud(){
 if(!game)return;const p=game.player;$('hp-fill').style.width=`${p.hp/p.maxHp*100}%`;$('hp-text').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('xp-fill').style.width=`${game.xp/game.nextXp*100}%`;$('level').textContent=`LV.${game.level}`;$('b-floor').textContent=`${String(game.floor).padStart(2,'0')}F`;$('b-name').textContent=FLOORS[game.floor-1].name;$('kills').textContent=game.kills;$('run-gold').textContent=game.gold;
 $('timer').textContent=game.bossSpawned?`보스 제한 ${formatTime(Math.max(0,150-game.time))}`:`${formatTime(game.time)} / 01:30`;
 const boss=game.enemies.find(e=>e.id===game.bossId);$('boss-hud').hidden=!boss;if(boss)$('boss-fill').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;
 const marker=$('boss-direction');marker.hidden=true;if(boss&&boss.hp>0){const dx=(boss.x-p.x)*zoom,dy=(boss.y-p.y)*zoom;const rx=Math.max(30,w/2-45),ry=Math.max(30,h/2-70);if(Math.abs(dx)>rx||Math.abs(dy)>ry){const scale=Math.min(rx/(Math.abs(dx)||1),ry/(Math.abs(dy)||1));marker.hidden=false;marker.style.left=`${w/2+dx*scale}px`;marker.style.top=`${h/2+dy*scale}px`;marker.querySelector('b').style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;}}
 const active=['playing','choosing'].includes(game.state),lowHp=active&&p.hp>0&&p.hp/p.maxHp<=.25,urgent=active&&game.bossSpawned&&150-game.time<=15;
 $('battle').classList.toggle('low-health',lowHp);$('timer').classList.toggle('urgent',urgent);
 const warning=$('combat-warning'),warningText=[lowHp?'체력 부족 · 회피로 거리를 벌리세요':'',urgent?'시간 임박 · 수문장을 처치하세요':''].filter(Boolean).join(' / ');
 warning.hidden=!warningText;if(warning.textContent!==warningText)warning.textContent=warningText;
 for(const [id,cd,label] of [['dash',game.dashCd,'회피'],['nova',game.novaCd,'영혼 폭발']]){const ready=cd<=0&&game.state==='playing';$(id+'-cd').textContent=cd>0?Math.ceil(cd):'';$(id).classList.toggle('ready',ready);$(id).setAttribute('aria-label',`${label} · ${cd>0?Math.ceil(cd)+'초 후 사용 가능':ready?'사용 가능':'전투 대기'}`);$(id).setAttribute('aria-disabled',String(!ready));}

 const tray=Object.entries(game.skills).filter(([,lv])=>lv>0).map(([id,lv])=>{const s=SKILLS.find(s=>s.id===id);return `<div class="skill-chip" aria-label="${s.name} 레벨 ${lv}">${svg(s.icon)}<small>${lv}</small></div>`;}).join('');if($('skill-tray').innerHTML!==tray)$('skill-tray').innerHTML=tray;
}
function resize(){w=window.innerWidth;h=window.innerHeight;dpr=profile.settings.quality==='low'?1:Math.min(window.devicePixelRatio||1,2);$('canvas').width=Math.floor(w*dpr);$('canvas').height=Math.floor(h*dpr);zoom=clamp(w/490,.65,1.25);if(w>h)zoom=clamp(h/560,.6,1);}
window.addEventListener('resize',()=>{resetInput();resize();if(game)draw();});
function loop(now){
 const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
 if(game&&!paused&&game.state==='playing'){
  if(pointerId===null){input.x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);input.y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);}
  game.update(dt,input);if(game.event==='boss')announce('수문장이 깨어납니다');if(game.event==='hit')sound('hit');if(game.state==='choosing'){save();showChoices();}else if(['won','lost'].includes(game.state))finishGame();saveClock+=dt;if(saveClock>5){save();saveClock=0;}
 }
 if(game&&['won','lost'].includes(game.state)&&modalKind!=='result')finishGame();
 hudClock+=dt;if(hudClock>.08){updateHud();hudClock=0;}if(game&&!paused&&modalKind!=='choice'&&modalKind!=='result')draw();raf=requestAnimationFrame(loop);
}
window.addEventListener('blur',()=>{resetInput();if(game&&game.state==='playing')pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(game&&game.state==='playing')pauseGame();save();}else lastTime=performance.now();});window.addEventListener('pagehide',save);
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
  if(x<-96||x>1600||y<-64||y>1600)continue;
  const shades=['#202b2d','#243033','#222e30','#263234','#1e2a2d','#232f31','#212b2e'];
  ctx.fillStyle=shades[n];ctx.fillRect(x+1,y+1,94,62);ctx.strokeStyle='#40515225';ctx.lineWidth=1;ctx.strokeRect(x+3,y+3,90,58);
  if(n===2){ctx.strokeStyle='#0e1b1f66';ctx.beginPath();ctx.moveTo(x+15,y+10);ctx.lineTo(x+35,y+25);ctx.lineTo(x+27,y+35);ctx.lineTo(x+44,y+60);ctx.stroke();}
  if(n===5){ctx.fillStyle='#5575631a';ctx.fillRect(x+6,y+51,28,5);}
 }
 ctx.strokeStyle='#77908033';ctx.lineWidth=4;ctx.strokeRect(15,15,1570,1570);ctx.strokeStyle='#0b1217';ctx.lineWidth=18;ctx.strokeRect(0,0,1600,1600);
 ctx.save();ctx.translate(800,800);ctx.rotate(Math.PI/4);ctx.strokeStyle='#b1a77b28';ctx.lineWidth=2;ctx.strokeRect(-100,-100,200,200);ctx.strokeRect(-120,-120,240,240);ctx.restore();circle(800,800,62,null,'#aaab842a');
 // Pillars and braziers frame the chamber.
 for(let x=160;x<1600;x+=320)for(let y=160;y<1600;y+=320){
  if(x<minX-60||x>maxX+60||y<minY-60||y>maxY+60)continue;
  ellipse(x+9,y+8,28,15,'#0005');path([[x-23,y],[x,y+13],[x+23,y],[x,y-13]],'#3c4c4b','#566661');path([[x-14,y-1],[x-14,y-40],[x,y-47],[x+14,y-40],[x+14,y-1],[x,y+5]],'#344345','#536561');path([[x,y-47],[x+14,y-40],[x+14,y-1],[x,y+5]],'#263337');
  ellipse(x,y-41,19,10,'#526561');ellipse(x,y-44,15,7,'#18282a');
  if(profile.settings.quality!=='low'){const glow=ctx.createRadialGradient(x,y-51,2,x,y-51,80);glow.addColorStop(0,'#d5b77722');glow.addColorStop(1,'#d5b77700');ctx.fillStyle=glow;ctx.fillRect(x-80,y-131,160,160);}
  const flicker=Math.sin(game.time*7+x)*3;path([[x-7,y-46],[x-5,y-58],[x+flicker,y-69],[x+7,y-55],[x+5,y-46]],'#d1a86b');path([[x-3,y-46],[x,y-58],[x+3,y-46]],'#eee0ad');
 }
 for(const g of game.gems){if(g.x<minX||g.x>maxX||g.y<minY||g.y>maxY)continue;const r=g.value>1?6:4;path([[g.x,g.y-r-2],[g.x+r,g.y],[g.x,g.y+r+2],[g.x-r,g.y]],g.value>1?'#d3b46c':'#76b3a5','#c3dfc18a');}
 for(const e of game.enemies)if(e.telegraph>0){const pulse=(1.1-e.telegraph)/1.1;circle(e.targetX,e.targetY,95,'#d4695d1a','#dc7d69');circle(e.targetX,e.targetY,95*pulse,null,'#dcb797');}
 const entities=[...game.enemies.map(e=>({...e,isPlayer:false})),{...p,isPlayer:true}].sort((a,b)=>a.y-b.y);
 for(const e of entities){if(e.x<minX-60||e.x>maxX+60||e.y<minY-60||e.y>maxY+60)continue;if(e.isPlayer)drawPlayer(e);else drawEnemy(e);}
 for(const b of game.projectiles){ctx.strokeStyle=b.color;ctx.lineWidth=b.r;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(b.x-b.vx*.03,b.y-b.vy*.03);ctx.lineTo(b.x,b.y);ctx.stroke();circle(b.x,b.y,b.r*.7,'#e6dec0');}
 for(const b of game.enemyShots){circle(b.x,b.y,b.r+3,'#bc625b30');circle(b.x,b.y,b.r,'#da8473');circle(b.x-1,b.y-1,2,'#f4c7a0');}
 const orbit=game.skills.orbit||0;for(let i=0;i<orbit;i++){const a=game.time*2.8+i*Math.PI*2/orbit,x=p.x+Math.cos(a)*75,y=p.y+Math.sin(a)*75;ctx.save();ctx.translate(x,y);ctx.rotate(a+.8);path([[-4,-13],[4,-13],[3,10],[-3,10]],'#d1d8c4','#ab9674');ctx.restore();}
 for(const e of game.effects){ctx.save();ctx.globalAlpha=Math.max(0,e.life/e.maxLife);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.lineWidth=3;const progress=1-e.life/e.maxLife;
  if(e.type==='bolt'){ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo((e.x+e.x2)/2+10,(e.y+e.y2)/2-7);ctx.lineTo(e.x2,e.y2);ctx.stroke();}
  else if(e.type==='slash'){ctx.translate(e.x,e.y);ctx.rotate(e.angle);ctx.beginPath();ctx.arc(0,0,e.r*(.75+progress*.25),-1.15,1.15);ctx.stroke();ctx.globalAlpha*=.16;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,e.r,-1.15,1.15);ctx.closePath();ctx.fill();}
  else if(e.type==='death'){for(let i=0;i<5;i++)circle(e.x+Math.cos(i*1.26)*e.r*progress,e.y+Math.sin(i*1.26)*e.r*progress,3*(1-progress),e.color);}
  else{circle(e.x,e.y,e.r*(.2+progress*.8),null,e.color);ctx.globalAlpha*=.06;circle(e.x,e.y,e.r*(.2+progress*.8),e.color);}
  ctx.restore();
 }
 ctx.font='600 11px system-ui';ctx.textAlign='center';for(const t of game.texts){ctx.globalAlpha=Math.max(0,t.life/t.maxLife);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,t.y);}ctx.globalAlpha=1;ctx.restore();
 const v=ctx.createRadialGradient(w/2,h*.45,Math.min(w,h)*.18,w/2,h*.45,Math.max(w,h)*.68);v.addColorStop(0,'#040c1100');v.addColorStop(1,'#040c11bc');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 if(game.damageFlash>0){ctx.fillStyle=`rgba(179,52,46,${game.damageFlash*.5})`;ctx.fillRect(0,0,w,h);}
}
function drawPlayer(p){
 ctx.save();ctx.translate(p.x,p.y);ellipse(0,6,21,9,'#02080bac');circle(0,0,23,null,'#d0bd7760');
 if(p.invulnerable>0){circle(0,-9,30,null,'#b9d6c77a');if(Math.floor(game.time*20)%2===0)ctx.globalAlpha=.55;}
 const color=HEROES[game.hero].color,walk=Math.hypot(input.x,input.y)>.1?Math.sin(game.time*12)*3:0;
 const facing=Math.cos(p.face)<0?-1:1;ctx.scale(facing,1);
 path([[-13,-29],[-21,4],[-10,7],[0,0],[10,7],[17,2],[11,-29]],game.hero==='mage'?'#345954':'#534f41','#111d21');
 path([[-8,-5],[-9,4],[-3,6],[-1,-3]],'#1b2427');path([[3,-5],[5,5+walk],[12,5+walk],[9,-5]],'#1b2427');
 path([[-11,-27],[8,-27],[13,-12],[8,-3],[-9,-3],[-14,-14]],game.hero==='knight'?'#8a9290':game.hero==='mage'?'#527e70':'#637785','#17282c');
 path([[-12,-22],[-3,-26],[-4,-13],[-10,-9],[-16,-13]],color,'#26352f');
 path([[-7,-38],[2,-43],[12,-37],[11,-27],[-6,-27]],game.hero==='knight'?'#b0b7a5':'#d0baa2','#29382f');
 if(game.hero==='knight'){path([[-8,-38],[3,-45],[13,-37],[10,-32],[-8,-31]],'#859087','#243531');ctx.fillStyle='#101e20';ctx.fillRect(0,-35,10,3);path([[16,-8],[19,-39],[23,-45],[26,-38],[22,-7]],'#cbd1bd','#536563');ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(13,-8);ctx.lineTo(26,-5);ctx.stroke();}
 if(game.hero==='mage'){path([[-12,-35],[2,-53],[14,-34]],'#4c7165','#233a37');ctx.strokeStyle='#ab9270';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(20,4);ctx.lineTo(20,-41);ctx.stroke();circle(20,-44,7,color);circle(20,-44,3,'#d4e9c6');}
 if(game.hero==='ranger'){path([[-9,-37],[2,-47],[13,-39],[8,-33],[-6,-31]],'#536979','#263d43');ctx.strokeStyle='#bea982';ctx.lineWidth=2;ctx.beginPath();ctx.arc(19,-19,17,-1.35,1.35);ctx.stroke();ctx.beginPath();ctx.moveTo(23,-35);ctx.lineTo(23,-3);ctx.stroke();}
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
  if(boss){path([[-11,-37],[-15,-51],[-5,-43],[0,-55],[5,-43],[15,-51],[11,-37]],'#af976a','#574e3c');circle(-5,-32,2,'#e8a168');circle(6,-32,2,'#e8a168');}
 }
 if(e.hp<e.maxHp&&!boss){ctx.fillStyle='#0b1415';ctx.fillRect(-17,12,34,3);ctx.fillStyle=elite?'#c6a66e':'#ac8173';ctx.fillRect(-17,12,34*Math.max(0,e.hp/e.maxHp),3);}ctx.restore();
}
renderHome();applyControls();resize();if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{/* Online game remains available. */});
