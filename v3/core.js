/* Existing V2 persistence, normalizer and backup algorithms are retained below.
   V3 adds meal identity; legacy daily fields continue to mirror the first meal. */
(function(global){'use strict';
const DB='bam-weaning-db', STORE='planner', KEY='main';
let state={babyName:'',birthday:'',startDay:180,days:{},cubes:[],cubeUsages:[],ingredients:[],preferences:{}}, storageReady=false;
const ingredientKey=name=>name.trim().normalize('NFC').toLocaleLowerCase('ko');
function parseDate(v){if(!v)return null;const p=v.split('-').map(Number);if(p.length!==3)return null;return new Date(Date.UTC(p[0],p[1]-1,p[2]));}
function openDB(){
 return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
let saveQueue=Promise.resolve(),persistedFingerprint,sessionArchived=false;
const clone=value=>JSON.parse(JSON.stringify(value));
function txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('저장이 취소됐어요.'));});}
async function getStored(key){const db=await openDB();try{return await new Promise((res,rej)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}finally{db.close();}}
async function putStored(value,key){const db=await openDB();try{const tx=db.transaction(STORE,'readwrite');const done=txDone(tx);tx.objectStore(STORE).put(value,key);await done;}finally{db.close();}}
function queueWrite(value,reason){
 if(!storageReady)return Promise.reject(new Error('기존 기록을 읽지 못해 저장을 중단했어요. 새로고침 후 다시 확인해 주세요.'));
 const snapshot=clone(value);snapshot.schemaVersion=5;snapshot.updatedAt=Math.max(Date.now(),Number(state.updatedAt||0)+1);
 const job=saveQueue.catch(()=>{}).then(async()=>{
  const db=await openDB();let conflict=false;
  try{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),done=txDone(tx);
   const req=store.get(KEY);
   req.onsuccess=()=>{
    if(JSON.stringify(req.result)!==persistedFingerprint){conflict=true;tx.abort();return;}
    // Backup and replacement commit atomically: backup/quota failure aborts both.
    if(req.result&&(!sessionArchived||reason))store.put(req.result,'backup-'+(reason||'before-edit')+'-'+Date.now()+'-'+Math.random().toString(36).slice(2));
    if(!sessionArchived){try{const raw=localStorage.getItem(KEY);if(raw&&raw!==JSON.stringify(req.result))store.put({rawLocalStorage:raw},'backup-local-fallback-'+Date.now());}catch(_){} }
    store.put(snapshot,KEY);
   };
   await done;persistedFingerprint=JSON.stringify(snapshot);sessionArchived=true;
   try{localStorage.setItem(KEY,JSON.stringify(snapshot));}catch(_){}
   return snapshot;
  }catch(e){throw new Error(conflict?'다른 창에서 기록이 변경됐어요. 덮어쓰지 않았습니다. 현재 내용을 데이터 백업한 뒤 새로고침해 주세요.':'저장하지 못했어요. 기존 기록은 유지됩니다. 데이터 백업 후 저장 공간과 브라우저 설정을 확인해 주세요.');}
  finally{db.close();}
 });saveQueue=job;return job;
}
async function saveState(){const saved=await queueWrite(state);state.schemaVersion=5;state.updatedAt=saved.updatedAt;}
async function commitState(next,reason){const saved=await queueWrite(next,reason);state=saved;return saved;}
function validISO(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(parseDate(v))&&parseDate(v).toISOString().slice(0,10)===v;}
function normalize(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||!v.days||typeof v.days!=='object'||Array.isArray(v.days))throw new Error('식단 데이터 형식이 올바르지 않아요.');
 if(v.schemaVersion!=null&&(!Number.isInteger(v.schemaVersion)||v.schemaVersion>5))throw new Error('지원하지 않는 데이터 버전이에요.');
 if(v.babyName!=null&&typeof v.babyName!=='string'||v.birthday!=null&&typeof v.birthday!=='string')throw new Error('아기 정보 형식이 올바르지 않아요.');
 const out={...v,babyName:typeof v.babyName==='string'?v.babyName:'',birthday:typeof v.birthday==='string'?v.birthday:'',startDay:v.startDay==null?180:Number(v.startDay),days:{},preferences:{},ingredients:[],cubes:[],cubeUsages:[]};
 if(!Number.isSafeInteger(out.startDay)||out.startDay<1)throw new Error('시작 일수가 올바르지 않아요.');
 if(out.birthday&&!validISO(out.birthday))throw new Error('생일 형식이 올바르지 않아요.');
 function validateMeal(m){
  if(!m||!Array.isArray(m.foods)||m.foods.some(f=>!f||typeof f.name!=='string'||(f.icon!=null&&typeof f.icon!=='string')||!Number.isFinite(Number(f.g))||Number(f.g)<0))throw new Error('음식 기록 형식이 올바르지 않아요.');
  if(m.actualIntake!=null&&m.actualIntake!==''&&(!Number.isFinite(Number(m.actualIntake))||Number(m.actualIntake)<0))throw new Error('섭취량 형식이 올바르지 않아요.');
 }
 for(const [k,d] of Object.entries(v.days)){
  if(!/^\d+$/.test(k)||!Number.isSafeInteger(Number(k))||Number(k)<1||!d||typeof d!=='object'||Array.isArray(d))throw new Error('날짜별 기록 형식이 올바르지 않아요.');
  if(d.memo!=null&&typeof d.memo!=='string')throw new Error('메모 형식이 올바르지 않아요.');
  if(d.meals!=null){if(!Array.isArray(d.meals))throw new Error('식사 목록 형식이 올바르지 않아요.');d.meals.forEach(validateMeal);}
  const legacy=Array.isArray(d.foods)?d:d.meals?.[0];validateMeal(legacy);
  out.days[k]=Array.isArray(d.foods)?{...d}:{...d,foods:legacy.foods,added:legacy.added||'',actualIntake:legacy.actualIntake??'',allergy:!!legacy.allergy};
 }
 if(v.preferences!=null&&(typeof v.preferences!=='object'||Array.isArray(v.preferences)))throw new Error('선호도 형식이 올바르지 않아요.');
 for(const [k,val] of Object.entries(v.preferences||{})){if(!['unknown','like','okay','dislike'].includes(val))throw new Error('선호도 값이 올바르지 않아요.');Object.defineProperty(out.preferences,k,{value:val,enumerable:true,writable:true,configurable:true});}
 if(v.ingredients!=null&&!Array.isArray(v.ingredients))throw new Error('식재료 맵 형식이 올바르지 않아요.');
 const ids=new Set();
 for(const ing of v.ingredients||[]){
  if(!ing||typeof ing.id!=='string'||!ing.id||ids.has(ing.id)||typeof ing.name!=='string'||!ing.name.trim()||!['unknown','like','okay','dislike'].includes(ing.preference)||!['unknown','none','suspected','confirmed'].includes(ing.allergy))throw new Error('식재료 항목 형식이 올바르지 않아요.');
  if(ing.firstTriedOn&&!validISO(ing.firstTriedOn))throw new Error('첫 섭취일 형식이 올바르지 않아요.');
  if(ing.firstTriedDay!=null&&(!Number.isSafeInteger(ing.firstTriedDay)||ing.firstTriedDay<1))throw new Error('첫 섭취 일수가 올바르지 않아요.');
  ids.add(ing.id);out.ingredients.push({...ing});
 }
 if(v.cubes!=null&&!Array.isArray(v.cubes))throw new Error('큐브 보관함 형식이 올바르지 않아요.');
 const cubeIds=new Set();
 for(const c of v.cubes||[]){
  if(!c||typeof c.id!=='string'||!c.id||cubeIds.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.ingredientId!=null&&typeof c.ingredientId!=='string'||!validISO(c.madeOn)||!['frozen','refrigerated'].includes(c.storage)||!Number.isFinite(c.grams)||c.grams<=0||!Number.isSafeInteger(c.initialQty)||c.initialQty<1||!Number.isSafeInteger(c.remainingQty)||c.remainingQty<0||c.remainingQty>c.initialQty)throw new Error('큐브 기록 형식이 올바르지 않아요.');
  cubeIds.add(c.id);out.cubes.push({...c});
 }
 if(v.cubeUsages!=null&&!Array.isArray(v.cubeUsages))throw new Error('큐브 사용 기록 형식이 올바르지 않아요.');
 const usageIds=new Set();
 for(const u of v.cubeUsages||[]){
  if(!u||typeof u.id!=='string'||!u.id||usageIds.has(u.id)||!Number.isSafeInteger(u.mealDay)||u.mealDay<1||typeof u.cubeBatchId!=='string'||typeof u.foodName!=='string'||!Number.isFinite(u.cubeGrams)||u.cubeGrams<=0||!Number.isSafeInteger(u.quantity)||u.quantity<1||!['planned','used'].includes(u.status))throw new Error('큐브 사용 이력 값이 올바르지 않아요.');
  usageIds.add(u.id);out.cubeUsages.push({...u});
 }
 out.schemaVersion=5;
 return out;
}
function parseBackup(text){
 let parsed;try{parsed=JSON.parse(text.replace(/^\uFEFF/,''));}catch(e){throw new Error('JSON 파일을 읽지 못했어요. 압축을 풀고 원본 .json 백업을 선택해 주세요.');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('백업 데이터 형식이 올바르지 않아요.');
 if(parsed.format!=null&&(parsed.format!=='bamsongi-planner'||![2,3,4].includes(parsed.version)))throw new Error('지원하지 않는 백업 형식 또는 버전이에요.');
 const raw=clone(parsed.state??parsed);
 for(const i of (Array.isArray(raw.ingredients)?raw.ingredients:[])){if(typeof i.firstTriedDay==='string'&&/^[0-9]+$/.test(i.firstTriedDay))i.firstTriedDay=Number(i.firstTriedDay);}
 for(const c of (Array.isArray(raw.cubes)?raw.cubes:[])){for(const key of ['grams','initialQty','remainingQty'])if(typeof c[key]==='string'&&c[key].trim()!==''&&Number.isFinite(Number(c[key])))c[key]=Number(c[key]);}
 for(const u of (Array.isArray(raw.cubeUsages)?raw.cubeUsages:[])){for(const key of ['mealDay','cubeGrams','quantity'])if(typeof u[key]==='string'&&u[key].trim()!==''&&Number.isFinite(Number(u[key])))u[key]=Number(u[key]);}
 const restored=normalize(raw);validateRestoreInventory(restored);return restored;
}
function validateRestoreInventory(data){
 const batches=new Map(data.cubes.map(c=>[c.id,c])),reserved=new Map(),used=new Map();
 for(const u of data.cubeUsages){const c=batches.get(u.cubeBatchId);if(!c)throw new Error('제조 기록이 없는 큐브 사용 이력이 있어요. 기록을 버리지 않고 복원을 중단했습니다.');if(u.cubeGrams!==c.grams)throw new Error('큐브 사용 중량과 제조 기록이 일치하지 않아요.');const map=u.status==='planned'?reserved:used;map.set(c.id,(map.get(c.id)||0)+u.quantity);}
 for(const c of data.cubes){if((used.get(c.id)||0)>c.initialQty-c.remainingQty)throw new Error('큐브 사용 이력과 남은 재고가 일치하지 않아요.');}
 return data;
}
function mergeRecords(current,incoming){
 if(current.birthday&&incoming.birthday&&current.birthday!==incoming.birthday)throw new Error('아기 생일이 달라 기록을 합칠 수 없어요. 파일을 확인하거나 전체 교체를 선택해 주세요.');
 const merged=clone(current);let kept=0,added=0;
 for(const [day,value] of Object.entries(incoming.days)){if(!hasRecord(merged.days[day])){merged.days[day]=clone(value);if(hasRecord(value))added++;}else if(hasRecord(value))kept++;}
 merged.preferences={...incoming.preferences,...merged.preferences};
 const ids=new Set(merged.ingredients.map(i=>i.id)),names=new Map(merged.ingredients.map(i=>[ingredientKey(i.name),i.id])),ingredientMap=new Map();
 for(const ing of incoming.ingredients){if(ids.has(ing.id)){ingredientMap.set(ing.id,ing.id);continue;}if(names.has(ingredientKey(ing.name))){ingredientMap.set(ing.id,names.get(ingredientKey(ing.name)));continue;}merged.ingredients.push(clone(ing));ids.add(ing.id);names.set(ingredientKey(ing.name),ing.id);ingredientMap.set(ing.id,ing.id);}
 const cubeIds=new Set(merged.cubes.map(c=>c.id)),importedIds=new Set();
 for(const c of incoming.cubes){if(cubeIds.has(c.id))continue;const batch=clone(c);if(batch.ingredientId&&ingredientMap.has(batch.ingredientId))batch.ingredientId=ingredientMap.get(batch.ingredientId);merged.cubes.push(batch);cubeIds.add(c.id);importedIds.add(c.id);}
 const usageIds=new Set(merged.cubeUsages.map(u=>u.id));
 for(const u of incoming.cubeUsages){if(!importedIds.has(u.cubeBatchId))continue;if(u.status==='planned'&&hasRecord(current.days[u.mealDay])&&JSON.stringify(current.days[u.mealDay].foods)!==JSON.stringify(incoming.days[u.mealDay]?.foods))throw new Error('이미 기록된 날짜에 다른 식단의 큐브 연결이 있어 합치기를 중단했어요. 파일을 확인하거나 전체 교체를 선택해 주세요.');if(usageIds.has(u.id))throw new Error('다른 큐브 묶음에 같은 사용 이력 ID가 있어요. 기존 기록을 유지하고 합치기를 중단했어요.');merged.cubeUsages.push(clone(u));usageIds.add(u.id);}
 if(!merged.babyName)merged.babyName=incoming.babyName;if(!merged.birthday)merged.birthday=incoming.birthday;
 validateRestoreInventory(merged);return {merged,kept,added,newCubes:importedIds.size};
}
function hasRecord(d){return !!d&&(Object.keys(d).some(k=>!['foods','added','actualIntake','allergy','memo','meals'].includes(k))||(d.foods||[]).length>0||!!d.added||d.actualIntake!==''&&d.actualIntake!=null||!!d.allergy||!!d.memo||!!d.meals?.length||(d.meals||[]).some(m=>(m.foods||[]).length||m.added||m.actualIntake!==''&&m.actualIntake!=null||m.allergy));}
const SEED={"foods": {"180": [["🍚", "쌀미음", 10]], "181": [["🍚", "쌀미음", 20]], "182": [["🍚", "쌀", 20], ["🥩", "소고기", 10]], "183": [["🍚", "쌀", 20], ["🥩", "소고기", 10]], "184": [["🌾", "쌀+오트밀", 30], ["🥩", "소고기", 10]], "185": [["🌾", "쌀+오트밀", 30], ["🥩", "소고기", 10]], "186": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥒", "애호박", 10]], "187": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥒", "애호박", 10]], "188": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "청경채", 5]], "189": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "청경채", 5]], "190": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥦", "브로콜리", 10]], "191": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥦", "브로콜리", 10]], "192": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "양배추", 10]], "193": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "양배추", 10]], "194": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "시금치", 5]], "195": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "시금치", 5]], "196": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥕", "당근", 10]], "197": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥕", "당근", 10]], "198": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🎃", "단호박", 10]], "199": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🎃", "단호박", 10]], "200": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥔", "감자", 10]], "201": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥔", "감자", 10]], "202": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥒", "오이", 5]], "203": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥒", "오이", 5]], "204": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "배추", 10]], "205": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "배추", 10]], "206": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🍠", "고구마", 10]], "207": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🍠", "고구마", 10]], "208": [["🌾", "곡류", 30], ["🥚", "완숙계란", 5], ["🥒", "애호박", 5]], "209": [["🌾", "곡류", 30], ["🥚", "완숙계란", 10], ["🥦", "브로콜리", 5]], "210": [["🌾", "곡류", 30], ["🥩", "소고기", 10], ["🥬", "시금치", 5], ["🥕", "당근", 5]]}, "added": {"180": "시작", "181": "적응", "182": "🥩 소고기 10g", "183": "🥩 소고기 10g", "184": "🌾 오트밀 20g", "185": "🌾 오트밀 20g", "186": "🥒 애호박 10g", "187": "🥒 애호박 10g", "188": "🥬 청경채 5g", "189": "🥬 청경채 5g", "190": "🥦 브로콜리 10g", "191": "🥦 브로콜리 10g", "192": "🥬 양배추 10g", "193": "🥬 양배추 10g", "194": "🥬 시금치 5g", "195": "🥬 시금치 5g", "196": "🥕 당근 10g", "197": "🥕 당근 10g", "198": "🎃 단호박 10g", "199": "🎃 단호박 10g", "200": "🥔 감자 10g", "201": "🥔 감자 10g", "202": "🥒 오이 5g", "203": "🥒 오이 5g", "204": "🥬 배추 10g", "205": "🥬 배추 10g", "206": "🍠 고구마 10g", "207": "🍠 고구마 10g", "208": "🥚 완숙계란 5g", "209": "🥚 완숙계란 10g", "210": "조합"}};
const todayISO=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const uid=prefix=>prefix+'-'+crypto.randomUUID();
const emptyMeal=id=>({id,foods:[],actualIntake:'',added:'',allergy:false});
function mealsOf(day){if(!day)return [];return day.meals?.length?clone(day.meals).map((m,i)=>({...m,id:m.id||'meal-'+(i+1),slot:m.slot||i+1})):(hasRecord(day)?[{...emptyMeal('meal-1'),slot:1,foods:clone(day.foods||[]),actualIntake:day.actualIntake??'',added:day.added||'',allergy:!!day.allergy}]:[]);}
function protectedDay(d){return !!d&&(d.v3Multi===true||d.meals?.length>1);}
function active(c){return c.remainingQty>0&&!c.cabinetRemovedAt&&!c.discardedAt;}
function age(c){return validISO(c.madeOn)?Math.round((parseDate(todayISO())-parseDate(c.madeOn))/86400000):null;}
function warning(c){return active(c)&&(c.storage==='refrigerated'||age(c)>=14);}
function validateV3(s){
 for(const [day,d] of Object.entries(s.days)){const ids=new Set();for(const m of d.meals||[]){if(m.id!=null&&(typeof m.id!=='string'||!m.id||ids.has(m.id)))throw Error('끼니 식별자가 중복되거나 잘못됐어요.');if(m.id)ids.add(m.id);if(m.slot!=null&&!(m.type==='snack'?Number.isSafeInteger(m.slot)&&m.slot>=4:[1,2,3].includes(m.slot)))throw Error('끼니 번호가 올바르지 않아요.');}if(new Set((d.meals||[]).map((m,i)=>m.slot||i+1)).size!==(d.meals||[]).length)throw Error('끼니 번호가 중복됐어요.');
 if(d.v3Multi&&(!Array.isArray(d.meals)||!d.meals.length))throw Error('다중 끼니 기록 구조를 확인해 주세요.');
 }
 for(const u of s.cubeUsages){if(u.mealId!=null){const ms=mealsOf(s.days[u.mealDay]);if(typeof u.mealId!=='string'||!ms.some(m=>m.id===u.mealId))throw Error('끼니와 큐브 사용 연결을 확인해 주세요.');}}
 if(s.cubeChanges!=null&&!Array.isArray(s.cubeChanges))throw Error('재고 변경 이력 형식을 확인해 주세요.');
 return s;
}
let busy=false;
async function transaction(fn,reason){if(busy)throw Error('저장 중이에요. 잠시 후 다시 시도해 주세요.');busy=true;try{const next=clone(state);await fn(next);validateV3(normalize(next));validateRestoreInventory(next);await commitState(next,reason);return clone(state);}finally{busy=false;}}
function logChange(s,id,delta,reason,day,mealId){if(!delta)return;s.cubeChanges=s.cubeChanges||[];s.cubeChanges.push({id:uid('change'),cubeBatchId:id,delta,reason,mealDay:day??null,mealId:mealId??null,createdAt:new Date().toISOString()});}
function scopeUsages(s,day,mealId){const ms=mealsOf(s.days[day]),first=ms[0]?.id||'meal-1';return s.cubeUsages.filter(u=>u.mealDay===Number(day)&&(u.mealId?u.mealId===mealId:mealId===first));}
function selections(day,mealId){return scopeUsages(state,day,mealId).map(u=>({batchId:u.cubeBatchId,name:u.foodName,quantity:u.quantity}));}
async function saveMeal(day,mealId,record,picks=[],memo=undefined,remove=false){
 if(!Number.isSafeInteger(day)||day<1)throw Error('날짜를 확인해 주세요.');
 return transaction(next=>{
 const prior=next.days[day]||{foods:[],actualIntake:'',added:'',allergy:false},ms=mealsOf(prior);let index=ms.findIndex(m=>m.id===mealId);
 if(remove&&index<0)throw Error('삭제할 끼니가 없어요.');
 if(index<0&&record.type!=='snack'&&ms.filter(m=>m.type!=='snack').length>=3)throw Error('하루 최대 세 끼까지 기록할 수 있어요.');
 if(!record||!Array.isArray(record.foods)||record.foods.some(f=>!f.name?.trim()||!Number.isFinite(Number(f.g))||Number(f.g)<0))throw Error('식재료명과 중량을 확인해 주세요.');
 if(!remove&&record.slot&&ms.some(m=>m.id!==mealId&&m.slot===record.slot))throw Error('이미 기록된 끼니예요. 다른 끼니를 선택해 주세요.');
 if(record.actualIntake!==''&&(!Number.isFinite(Number(record.actualIntake))||Number(record.actualIntake)<0))throw Error('섭취량을 확인해 주세요.');
 if(!remove&&record.type==='snack'&&index<0&&!['middle','late'].includes(stageForDay(next,day)))throw Error('중기부터 간식을 선택적으로 추가할 수 있어요.');
 const old=scopeUsages(next,day,mealId),key=u=>JSON.stringify([u.cubeBatchId,ingredientKey(u.foodName)]),requested=new Map();
 const names=new Set(record.foods.map(f=>ingredientKey(f.name)));
 if(!remove)for(const p of picks){if(!Number.isSafeInteger(p.quantity)||p.quantity<1)throw Error('큐브 수량을 확인해 주세요.');if(!names.has(ingredientKey(p.name)))throw Error('선택한 큐브의 식재료가 식단에 없어요.');const k=JSON.stringify([p.batchId,ingredientKey(p.name)]),r=requested.get(k)||{id:p.batchId,name:p.name,qty:0};r.qty+=p.quantity;requested.set(k,r);}
 const confirmed=new Map(),historical=new Map();for(const u of old){const map=u.status==='used'?confirmed:historical,k=key(u);map.set(k,(map.get(k)||0)+u.quantity);}
 for(const [k,qty] of historical)if((requested.get(k)?.qty||0)<qty)throw Error('이전 큐브 기록은 차감 여부를 확인해야 줄일 수 있어요. 기존 기록을 유지했습니다.');
 const desired=new Map();for(const [k,r] of requested){const qty=r.qty-(historical.get(k)||0);if(qty>0)desired.set(k,{...r,qty});}
 // A cube-linked weight cannot exceed its food's planned weight.
 for(const name of names){const grams=[...requested.values()].filter(r=>ingredientKey(r.name)===name).reduce((n,r)=>n+(next.cubes.find(c=>c.id===r.id)?.grams||0)*r.qty,0);const prepared=record.foods.filter(f=>ingredientKey(f.name)===name).reduce((n,f)=>n+Number(f.g),0);if(grams>prepared+1e-8)throw Error('큐브 중량보다 식재료 중량이 작아요. 큐브 선택 수량을 먼저 줄여 주세요.');}
 const deltas=new Map();for(const [k,qty] of confirmed){const id=JSON.parse(k)[0];deltas.set(id,(deltas.get(id)||0)-qty);}for(const r of desired.values())deltas.set(r.id,(deltas.get(r.id)||0)+r.qty);
 for(const [id,qty] of deltas){const c=next.cubes.find(c=>c.id===id);if(!c||qty>0&&(c.cabinetRemovedAt||c.discardedAt))throw Error('보관함에서 제외된 큐브는 추가 사용할 수 없어요.');const remaining=c.remainingQty-qty;if(!Number.isSafeInteger(remaining)||remaining<0||remaining>c.initialQty)throw Error('큐브 재고가 부족하거나 복구 수량이 맞지 않아요.');if(qty){c.remainingQty=remaining;c.updatedAt=new Date().toISOString();logChange(next,id,-qty,remove?'meal-delete':'meal-save',day,mealId);}}
 const oldIds=new Set(old.filter(u=>u.status==='used').map(u=>u.id));next.cubeUsages=next.cubeUsages.filter(u=>!oldIds.has(u.id));
 for(const [k,r] of desired){let remaining=r.qty;for(const previous of old.filter(u=>u.status==='used'&&key(u)===k)){const kept=Math.min(previous.quantity,remaining);if(kept>0)next.cubeUsages.push({...previous,mealId,quantity:kept,...(kept!==previous.quantity?{updatedAt:new Date().toISOString()}:{} )});remaining-=kept;}if(remaining>0)next.cubeUsages.push({id:uid('usage'),mealDay:day,mealId,foodName:r.name,cubeBatchId:r.id,cubeGrams:next.cubes.find(c=>c.id===r.id).grams,quantity:remaining,status:'used',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});}
 // Give legacy, unscoped history an explicit first-meal owner before reordering.
 const first=ms[0]?.id||mealId;for(const u of next.cubeUsages)if(u.mealDay===day&&!u.mealId)u.mealId=first;
 if(remove)ms.splice(index,1);else{const value={...(index>=0?ms[index]:emptyMeal(mealId)),...clone(record),id:mealId,slot:record.slot||(index>=0?ms[index].slot:[1,2,3].find(n=>!ms.some(m=>m.slot===n)))};if(index>=0)ms[index]=value;else ms.push(value);}
 if(!remove)registerMealIngredients(next,day,record);
 if(!ms.length)ms.push({...emptyMeal('meal-1'),slot:1});ms.sort((a,b)=>a.slot-b.slot);
 next.days[day]={...prior,meals:ms,memo:memo===undefined?(prior.memo||''):memo,v3Multi:!!prior.v3Multi||ms.length>1||ms.some(m=>m.type==='snack'),foods:clone(ms[0].foods),actualIntake:ms[0].actualIntake??'',added:ms[0].added||'',allergy:!!ms[0].allergy};
 });
}
function registerMealIngredients(s,day,record){
 for(const f of record.foods){if(f.productEntry||!f.name?.trim())continue;
 const key=foodHistoryKey(f.name);let ing=s.ingredients.find(i=>foodHistoryKey(i.name)===key);
 if(!ing){ing={id:uid('ingredient'),name:f.name.trim(),category:'unknown',preference:'unknown',allergy:'unknown',firstPlannedDay:day};s.ingredients.push(ing);}
 if(!ing.firstPlannedDay)ing.firstPlannedDay=day;
 if(!ing.firstPlannedOn&&s.birthday){const date=parseDate(s.birthday);date.setUTCDate(date.getUTCDate()+ing.firstPlannedDay-1);ing.firstPlannedOn=date.toISOString().slice(0,10);}
 if(!ing.firstTriedDay&&!ing.firstTriedOn)ing.intakeStatus=record.actualIntake===''||record.actualIntake==null?'unknown':Number(record.actualIntake)>0?'recorded':'not-eaten';
 if(Number(record.actualIntake)>0&&Number(f.g)>0){if(!ing.firstTriedDay&&!ing.firstTriedOn){ing.firstTriedDay=day;if(s.birthday){const d=parseDate(s.birthday);d.setUTCDate(d.getUTCDate()+day-1);ing.firstTriedOn=d.toISOString().slice(0,10);}}}
 }
}
async function saveCube(rows,id){return transaction(next=>{const now=new Date().toISOString();for(const row of rows){const name=row.name.trim(),grams=Number(row.grams),qty=Number(row.initialQty);if(!name||!validISO(row.madeOn)||row.madeOn>todayISO()||!['frozen','refrigerated'].includes(row.storage)||!Number.isFinite(grams)||grams<=0||!Number.isSafeInteger(qty)||qty<1)throw Error('식재료명·제조일·중량·수량을 확인해 주세요.');const c=next.cubes.find(c=>c.id===id);const ing=next.ingredients.find(i=>!i.archivedAt&&ingredientKey(i.name)===ingredientKey(name));if(c){const used=c.initialQty-c.remainingQty;if(next.cubeUsages.some(u=>u.cubeBatchId===id)&&grams!==c.grams)throw Error('사용 이력이 있는 큐브 중량은 변경할 수 없어요.');if(qty<used)throw Error('이미 차감한 수량보다 제조 수량이 적어요.');const remaining=row.remainingQty==null?qty-used:Number(row.remainingQty);if(!Number.isSafeInteger(remaining)||remaining<0||remaining>qty)throw Error('남은 수량을 확인해 주세요.');logChange(next,c.id,remaining-c.remainingQty,'batch-edit');Object.assign(c,{name,grams,initialQty:qty,remainingQty:remaining,madeOn:row.madeOn,storage:row.storage,ingredientId:ing?.id||null,updatedAt:now});}else{const c={id:uid('cube'),name,grams,initialQty:qty,remainingQty:qty,madeOn:row.madeOn,storage:row.storage,ingredientId:ing?.id||null,createdAt:now,updatedAt:now};next.cubes.push(c);logChange(next,c.id,qty,'manufacture');}}});}
async function adjustCube(id,delta){return transaction(next=>{const c=next.cubes.find(c=>c.id===id);if(!c||!active(c))throw Error('보관함의 큐브를 확인해 주세요.');const n=c.remainingQty+delta;if(!Number.isSafeInteger(n)||n<0||n>c.initialQty)throw Error('재고는 0개부터 제조 수량까지 입력할 수 있어요.');c.remainingQty=n;logChange(next,id,delta,'manual');});}
async function removeCube(id,discard){return transaction(next=>{const c=next.cubes.find(c=>c.id===id);if(!c||c.cabinetRemovedAt||c.discardedAt)throw Error('이미 보관함에서 제외된 큐브예요.');if(discard){if(!warning(c))throw Error('폐기 안내 대상이 아니에요.');logChange(next,id,-c.remainingQty,'discard');c.remainingQty=0;c.discardedAt=new Date().toISOString();}else c.cabinetRemovedAt=new Date().toISOString();c.updatedAt=new Date().toISOString();});}
async function saveIngredient(value){return transaction(next=>{const name=value.name.trim();if(!name)throw Error('식재료명을 입력해 주세요.');if(next.ingredients.some(i=>i.id!==value.id&&!i.archivedAt&&ingredientKey(i.name)===ingredientKey(name)))throw Error('이미 등록한 재료예요.');const prior=next.ingredients.find(i=>i.id===value.id),item={...prior,...value,name,id:prior?.id||uid('ingredient')};if(prior)Object.assign(prior,item);else next.ingredients.push(item);});}
async function archiveIngredient(id,restore=false){return transaction(next=>{const i=next.ingredients.find(i=>i.id===id);if(!i)throw Error('재료를 찾지 못했어요.');if(restore){if(next.ingredients.some(x=>x.id!==id&&!x.archivedAt&&ingredientKey(x.name)===ingredientKey(i.name)))throw Error('같은 이름의 재료가 있어요.');delete i.archivedAt;}else i.archivedAt=new Date().toISOString();});}
function stageBoundary(data,months){
 if(!validISO(data.birthday))return '';
 const birth=parseDate(data.birthday),first=new Date(Date.UTC(birth.getUTCFullYear(),birth.getUTCMonth()+months,1)),last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 first.setUTCDate(birth.getUTCDate()<=last?birth.getUTCDate():last+1);return first.toISOString().slice(0,10);
}
function stageForDay(data,day){
 if(Number(day)<data.startDay)return 'before';if(!validISO(data.birthday))return 'unknown';
 const date=parseDate(data.birthday);date.setUTCDate(date.getUTCDate()+Number(day)-1);const selected=date.toISOString().slice(0,10),transitions=data.v3Settings?.stageTransitions||{};
 const middle=transitions.middle||stageBoundary(data,7),late=transitions.late||stageBoundary(data,10);
 return selected>=late?'late':selected>=middle?'middle':'early';
}
async function settings(value){return transaction(next=>{
 if(value.birthday&&!validISO(value.birthday))throw Error('생년월일을 확인해 주세요.');
 if(!Number.isSafeInteger(value.startDay)||value.startDay<1)throw Error('시작 일수를 확인해 주세요.');
 next.babyName=value.babyName.trim();next.birthday=value.birthday;next.startDay=value.startDay;
 // Keep legacy stage/count values for compatibility; they no longer drive dated views.
 next.v3Settings={...next.v3Settings};
 if(value.stage!=null){if(!['early','middle','late'].includes(value.stage))throw Error('단계를 확인해 주세요.');next.v3Settings.stage=value.stage;}
 if(value.mealsPerDay!=null){if(![1,2,3].includes(value.mealsPerDay))throw Error('식사 횟수를 확인해 주세요.');next.v3Settings.mealsPerDay=value.mealsPerDay;}
 const transitions=value.stageTransitions??next.v3Settings.stageTransitions;
 if(transitions){
  for(const key of ['middle','late'])if(transitions[key]&&(!next.birthday||!validISO(transitions[key])))throw Error('생년월일과 전환일을 확인해 주세요.');
  if(next.birthday){const start=parseDate(next.birthday);start.setUTCDate(start.getUTCDate()+next.startDay-1);const startISO=start.toISOString().slice(0,10);
   if(['middle','late'].some(k=>transitions[k]&&transitions[k]<startISO))throw Error('전환일은 이유식 시작일 이후로 설정해 주세요.');
   const middle=transitions.middle||stageBoundary(next,7),late=transitions.late||stageBoundary(next,10);
   if((transitions.middle||transitions.late)&&late<=middle)throw Error('후기 시작일은 중기 시작일보다 뒤여야 해요.');
  }
  next.v3Settings.stageTransitions={middle:transitions.middle||'',late:transitions.late||''};
 }
});}
let backupMinute='',backupSequence=0;
function backupBundle(value=state,now=new Date()){
 const kst=new Date(now.getTime()+9*3600000).toISOString(),stamp=kst.slice(0,10)+'_'+kst.slice(11,16).replace(':','');
 backupSequence=stamp===backupMinute?backupSequence+1:0;backupMinute=stamp;
 return {filename:'밤송이맘_전체백업_'+stamp+(backupSequence?'_'+(backupSequence+1):'')+'.json',text:JSON.stringify({format:'bamsongi-planner',version:4,exportedAt:now.toISOString(),backupCreatedAt:kst.slice(0,23)+'+09:00',state:clone(value)},null,2)};
}
function backup(){return backupBundle().text;}
function inspectBackup(text){return validateV3(parseBackup(text));}
async function restore(data,mode){const validated=validateV3(parseBackup(JSON.stringify(data)));return transaction(next=>{const existingBatches=new Set(next.cubes.map(c=>c.id));const raw=data.state??data;const restored=mode==='merge'?mergeRecords(next,validated).merged:{...next,...validated};if(mode!=='merge'){for(const key of Object.keys(next))if(!(key in raw)&&!['days','cubes','cubeUsages','ingredients','preferences','cubeChanges'].includes(key))restored[key]=clone(next[key]);if(raw.v3Settings)restored.v3Settings={...next.v3Settings,...raw.v3Settings};}if(mode==='merge'){const ids=new Set((restored.cubeChanges||[]).map(x=>x.id));restored.cubeChanges=[...(restored.cubeChanges||[]),...(validated.cubeChanges||[]).filter(x=>!ids.has(x.id)&&!existingBatches.has(x.cubeBatchId)&&restored.cubes.some(c=>c.id===x.cubeBatchId))];}for(const key of Object.keys(next))delete next[key];Object.assign(next,restored);},'before-'+mode+'-restore');}
async function seed(){return transaction(next=>{for(let i=0;i<31;i++){const d=next.startDay+i;if(hasRecord(next.days[d]))continue;next.days[d]={foods:(SEED.foods[180+i]||[]).map(f=>({icon:f[0],name:f[1],g:f[2]})),added:SEED.added[180+i]||'',actualIntake:'',allergy:false};}});}
async function reset(){return transaction(next=>{Object.assign(next,{days:{},cubes:[],cubeUsages:[],ingredients:[],preferences:{},cubeChanges:[]});},'before-reset');}
async function load(){const stored=await getStored(KEY);persistedFingerprint=JSON.stringify(stored);let fallback;try{fallback=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){if(!stored)throw e;}state=validateV3(normalize(stored||fallback||state));storageReady=true;return clone(state);}
function intakeMetrics(ms){const plan=ms.reduce((n,m)=>n+(m.foods||[]).reduce((a,f)=>a+Number(f.g||0),0),0),recorded=ms.filter(m=>m.actualIntake!==''&&m.actualIntake!=null),actual=recorded.reduce((n,m)=>n+Number(m.actualIntake),0);return {plan,actual,recorded:recorded.length,complete:ms.length>0&&recorded.length===ms.length,rate:ms.length>0&&recorded.length===ms.length&&plan>0?actual/plan*100:null};}
function foodHistoryKey(name){const raw=ingredientKey(name).replace(/\s/g,'');const n=raw==='쇠고기'?'소고기':raw;return n.includes("밀가루")?"밀":n.includes("땅콩")?"땅콩":["완숙계란","완숙달걀","계란"].includes(n)?"달걀":n;}
function firstFoods(s=state){const first={};const put=(name,day,meal)=>{if(!Number.isSafeInteger(day)||day<1)return;const key=foodHistoryKey(name);if(!first[key]||day<first[key].day)first[key]={day,mealId:meal,name};};
 for(const [day,d] of Object.entries(s.days).sort((a,b)=>Number(a[0])-Number(b[0])))for(const m of mealsOf(d))if(m.actualIntake!==''&&m.actualIntake!=null&&Number(m.actualIntake)>0)for(const f of m.foods)if(Number(f.g)>0&&!f.productEntry)put(f.name,Number(day),m.id);
 for(const i of s.ingredients||[]){let day=i.firstTriedDay;if(!day&&validISO(i.firstTriedOn)&&validISO(s.birthday))day=Math.round((parseDate(i.firstTriedOn)-parseDate(s.birthday))/86400000)+1;if(day)put(i.name,Number(day),null);}return first;
}
function templateRows(options){const {stage,count,startDay,length=60,offset=1}=options;if(!['early','middle'].includes(stage)||!Number.isSafeInteger(startDay)||startDay<1||!Number.isSafeInteger(length)||length<1||!Number.isSafeInteger(offset)||offset<1)throw Error('식단 단계·시작일·기간을 확인해 주세요.');
 if(stage==='middle'&&![2,3].includes(count))throw Error('중기 1끼는 직접 구성해 주세요. 기존 식단은 유지돼요.');
 const source=stage==='middle'?global.MiddlePlan?.plans[String(count)]:Array.from({length:31},(_,i)=>({day:i+1,meals:[{slot:1,foods:(SEED.foods[180+i]||[]).map(f=>({icon:f[0],name:f[1],g:f[2]}))}]}));if(!source||offset+length-1>source.length)throw Error('원본 식단 범위 안에서 기간을 선택해 주세요.');return source.slice(offset-1,offset-1+length).map((r,i)=>({...clone(r),targetDay:startDay+i}));
}
function templatePreview(options){const rows=templateRows(options);return rows.map(r=>({...r,existing:mealsOf(state.days[r.targetDay]).filter(m=>m.foods.length).map(m=>m.slot)}));}
async function applyTemplate(options){const rows=templateRows(options),mode=options.mode;if(!['empty','range','replace'].includes(mode))throw Error('적용 방식을 확인해 주세요.');return transaction(next=>{
 for(const row of rows){const day=row.targetDay,prior=next.days[day]||{},original=mealsOf(prior);if(mode==='empty'&&(original.some(m=>m.foods.length||m.actualIntake!==''&&m.actualIntake!=null||m.allergy||m.added||m.memo)||prior.memo))continue;
 let ms=original.filter(m=>m.foods.length||m.actualIntake!==''||m.allergy||m.added||m.memo);const incomingSlots=new Set(row.meals.map(m=>m.slot));
 if(mode==='replace'){
 const ids=new Set(original.filter(m=>incomingSlots.has(m.slot)).map(m=>m.id));const old=next.cubeUsages.filter(u=>u.mealDay===day&&(u.mealId?ids.has(u.mealId):ids.has(original[0]?.id)));
 if(old.some(u=>u.status!=='used'))throw Error('과거 차감 여부가 확인되지 않은 큐브 기록은 교체할 수 없어요.');
 for(const u of old){const c=next.cubes.find(c=>c.id===u.cubeBatchId);if(!c||c.remainingQty+u.quantity>c.initialQty)throw Error('큐브 복구 수량을 확인해 주세요.');c.remainingQty+=u.quantity;logChange(next,c.id,u.quantity,'template-replace',day,u.mealId||original[0]?.id);}
 const oldIds=new Set(old.map(u=>u.id));next.cubeUsages=next.cubeUsages.filter(u=>!oldIds.has(u.id));ms=ms.filter(m=>!incomingSlots.has(m.slot));
 }
 for(const m of row.meals){if(ms.some(x=>x.slot===m.slot))continue;const previous=mode==='replace'?original.find(x=>x.slot===m.slot):null;ms.push({...emptyMeal(uid('meal')),...(previous?{id:previous.id,actualIntake:previous.actualIntake,memo:previous.memo,allergy:previous.allergy}:{}),slot:m.slot,foods:clone(m.foods),template:{version:global.MiddlePlan?.version,plannedNew:clone(m.plannedNew||[]),stage:options.stage,day:row.day,introduction:row.introduction||'',allergyNote:row.allergyNote||'',note:row.note||''}});}
 ms.sort((a,b)=>a.slot-b.slot);if(!ms.length)continue;const first=ms[0];next.days[day]={...prior,meals:ms,v3Multi:!!prior.v3Multi||ms.length>1||ms.some(m=>m.type==='snack'),foods:clone(first.foods),actualIntake:first.actualIntake??'',added:first.added||'',allergy:!!first.allergy};
 }next.v3Settings={...next.v3Settings,stage:options.stage,mealsPerDay:options.stage==='early'?1:options.count,middleStartDay:options.stage==='middle'?options.startDay:next.v3Settings?.middleStartDay};
 },mode==='replace'?'before-template-replace':'before-template-add');}

global.PlannerCore={foodHistoryKey,intakeMetrics,firstFoods,templatePreview,applyTemplate,load,snapshot:()=>clone(state),saveMeal,mealsOf,selections,saveCube,adjustCube,removeCube,saveIngredient,archiveIngredient,settings,stageForDay,stageBoundary,backup,backupBundle,inspectBackup,restore,seed,reset,active,age,warning,todayISO,validISO,protectedDay,newId:uid};
})(window);
