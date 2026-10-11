const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const valid=p=>p&&[1,2].includes(p.version)&&Array.isArray(p.inventory)&&Number.isFinite(p.gold)&&p.gold>=0&&(p.revision===undefined||Number.isSafeInteger(p.revision)&&p.revision>=0);
export function readStored(storage,key){
 const primaryRaw=storage.getItem(key),backupRaw=storage.getItem(key+'-backup'),primaryValue=parse(primaryRaw),backupValue=parse(backupRaw);
 const unsupported=primaryValue&&Number.isInteger(primaryValue.version)&&primaryValue.version>2;
 const primary=valid(primaryValue)?primaryValue:null,backup=valid(backupValue)?backupValue:null;
 const blocked=!!unsupported||(!primary&&!backup&&(primaryRaw!==null||backupRaw!==null));
 return {profile:blocked?null:primary||backup,recovered:!blocked&&!primary&&!!backup,blocked,unsupported:!!unsupported};
}
export class ProfileStore{
 constructor(storage,locks,key='babel-mobile-v1'){this.storage=storage;this.locks=locks;this.key=key;this.writable=false;this.hasLock=false;this.corrupt=false;this.revision=0;this.release=null;this.reason='다른 탭에서 게임을 사용 중입니다.';}
 async open(){if(!this.locks){this.reason='이 브라우저에서는 안전한 저장 잠금을 사용할 수 없습니다. 최신 모바일 브라우저로 열어 주세요.';return false;}return new Promise(resolve=>{this.locks.request(this.key+'-writer',{ifAvailable:true},async lock=>{if(!lock){resolve(false);return;}this.hasLock=true;try{const loaded=this.read();this.revision=loaded.profile?.revision||0;this.corrupt=loaded.blocked;this.writable=!loaded.blocked;if(loaded.blocked)this.reason=loaded.unsupported?'더 새로운 버전의 저장입니다. 최신 게임으로 열거나 보유한 백업을 불러오세요.':'저장 원본과 백업을 읽지 못했습니다. 원본을 보존했습니다. 복구 파일을 불러오세요.';}catch{this.writable=false;this.reason='브라우저 저장 공간에 접근하지 못했습니다.';}resolve(this.writable);await new Promise(done=>{this.release=done;});this.writable=false;this.hasLock=false;}).catch(()=>resolve(false));});}
 read(){return readStored(this.storage,this.key);}
 raw(){return {primary:this.storage.getItem(this.key),backup:this.storage.getItem(this.key+'-backup')};}
 write(profile){if(!this.writable)throw Error('저장 쓰기가 잠겨 있습니다.');const loaded=this.read();if(loaded.blocked){this.corrupt=true;this.writable=false;this.reason='저장이 손상되어 원본을 보존하고 쓰기를 중지했습니다.';throw Error(this.reason);}const current=loaded.profile,revision=current?.revision||0;if(revision!==this.revision){this.writable=false;this.reason='저장 버전이 달라졌습니다. 새로고침해 최신 저장을 불러오세요.';throw Error('저장 버전이 달라져 쓰기를 중지했습니다.');}const draft={...profile,revision:revision+1};const old=this.storage.getItem(this.key);if(old&&current)this.storage.setItem(this.key+'-backup',JSON.stringify(current));this.storage.setItem(this.key,JSON.stringify(draft));this.revision=draft.revision;profile.revision=draft.revision;}
 replaceDamaged(profile){if(!this.hasLock||!this.corrupt||!valid(profile)||!this.read().blocked)throw Error('손상 복구 조건이 달라졌습니다. 다시 열어 주세요.');const original=this.raw();let suffix=Date.now();while(this.storage.getItem(`${this.key}-damaged-${suffix}`)!==null)suffix++;this.storage.setItem(`${this.key}-damaged-${suffix}`,JSON.stringify(original));const draft={...profile,revision:this.revision+1};this.storage.setItem(this.key,JSON.stringify(draft));this.revision=draft.revision;profile.revision=draft.revision;this.corrupt=false;this.writable=true;}
 close(){this.release?.();this.writable=false;this.hasLock=false;}
}
