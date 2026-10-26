/* Shared backup preview; validation never writes to storage. */
(function(){
 const C=window.PlannerCore;
 function download(){const f=C.backupBundle(),url=URL.createObjectURL(new Blob([f.text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=f.filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 function open(onRestored){
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.append(input);
  input.oncancel=()=>input.remove();
  input.onchange=async()=>{
   const file=input.files[0];input.remove();if(!file)return;
   let raw,data;
   try{if(file.size>20*1024*1024)throw Error('20MB 이하 JSON 파일을 선택해 주세요.');const text=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error('파일을 읽지 못했어요.'));r.readAsText(file);});data=C.inspectBackup(text);raw=JSON.parse(text.replace(/^\uFEFF/,''));await C.load();}
   catch(e){alert('복원하지 않았어요. 기존 기록은 그대로예요. '+e.message);return;}
   const dialog=document.createElement('dialog');dialog.className='backup-preview-dialog';
   dialog.innerHTML='<style>.backup-preview-dialog{box-sizing:border-box;width:calc(100% - 24px);max-width:440px;max-height:85dvh;overflow:auto;padding:20px 16px max(20px,env(safe-area-inset-bottom));border:1px solid #edeae3;border-radius:18px;background:#fffcf5;color:#292929;font:14px/1.6 sans-serif}.backup-preview-dialog::backdrop{background:#29292966}.backup-preview-dialog h2{font-size:20px;margin:0 0 12px}.backup-preview-dialog dl{background:white;padding:12px;border-radius:12px;overflow-wrap:anywhere}.backup-preview-dialog dt{font-weight:bold}.backup-preview-dialog dd{margin:0 0 8px}.backup-preview-dialog button{min-height:44px;padding:8px 12px;border:1px solid #dedad1;border-radius:12px;background:white;color:#292929;font:inherit;cursor:pointer}.backup-preview-dialog .backup-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.backup-preview-dialog .backup-confirm{background:#f4cd65}.backup-preview-dialog [role=alert]{color:#9b4030}</style><h2>데이터 복원하기</h2><p>선택한 백업 파일의 정보를 확인해 주세요.</p><dl></dl><p><strong>기존 기록이 백업 파일의 기록으로 변경됩니다.</strong></p><p>현재 브라우저의 식단, 섭취량, 큐브, 식재료 기록 등이 백업 데이터로 대체됩니다. 현재 기록을 보관하려면 먼저 데이터 백업을 진행해 주세요.</p><p role="alert"></p><div class="backup-actions"><button data-backup-cancel>취소</button><button data-backup-current>현재 데이터 백업</button><button class="backup-confirm" data-backup-restore>데이터 복원하기</button></div>';
   const created=raw.backupCreatedAt||raw.exportedAt,validDate=typeof created==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(created)&&!isNaN(Date.parse(created));
   const rows=[['파일명',file.name],['백업 생성일',validDate?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'long',timeStyle:'short'}).format(new Date(created)):'백업 생성일 확인 불가'],['아기 이름',data.babyName||'미입력'],['생년월일',data.birthday||'미입력'],['식단 기록',Object.values(data.days).filter(d=>d.memo||d.added||d.allergy||C.mealsOf(d).some(m=>m.foods?.length||m.memo||m.added||m.allergy||(m.actualIntake!==''&&m.actualIntake!=null))).length+'일'],['큐브 기록',data.cubes.length+'건'],['식재료 기록',data.ingredients.length+'개']];
   for(const [key,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;dialog.querySelector('dl').append(dt,dd);}
   document.body.append(dialog);let busy=false;dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>dialog.remove();
   dialog.querySelector('[data-backup-cancel]').onclick=()=>dialog.close();
   dialog.querySelector('[data-backup-current]').onclick=download;
   dialog.querySelector('[data-backup-restore]').onclick=async()=>{
    if(busy||!confirm('현재 기록을 선택한 백업 파일의 기록으로 변경할까요?'))return;
    busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{await C.restore(raw,'full');await onRestored();dialog.querySelector('h2').textContent='데이터 복원이 완료되었어요!';dialog.querySelector('dl').replaceChildren();dialog.querySelectorAll('p').forEach(p=>p.remove());const p=document.createElement('p');p.textContent='백업 파일에 저장된 식단과 기록을 불러왔습니다.';dialog.querySelector('h2').after(p);const actions=dialog.querySelector('.backup-actions');actions.replaceChildren();const done=document.createElement('button');done.textContent='식단 확인하기';done.onclick=()=>{dialog.close();if(location.pathname.includes('/v3'))document.querySelector('[data-page="meal"]')?.click();else document.querySelector('#weekDetail')?.scrollIntoView();};actions.append(done);}
    catch(e){dialog.querySelector('[role=alert]').textContent=e.message;}
    finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
   };
   dialog.showModal();
  };
  input.click();
 }
 window.PlannerBackupUI={open,download};
})();
