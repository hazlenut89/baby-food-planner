/* V3 copy UX; all writes still use the shared atomic, record-preserving copy operation. */
(()=>{'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function open({sourceDay,state,openSheet,closeSheet,dateOf,dayOf,iso,dateLabel,onNavigate}){
  const C=PlannerCore,$=id=>document.getElementById(id);
  let meals=[],review=null,options=null,choices={},targetId=0;
  const fullDate=day=>dateOf(day)?iso(dateOf(day)):dateLabel(day);
  const mealLabel=m=>m.type==='snack'?'간식':m.slot+'끼';
  const inputValue=day=>state.birthday?iso(dateOf(day)):day;
  const inputAttrs=state.birthday?'type="date"':'type="number" min="1" step="1" inputmode="numeric"';
  const readDay=v=>!v?NaN:state.birthday?(C.validISO(v)?dayOf(new Date(v+'T12:00:00')):NaN):Number(v);
  openSheet('식단 복사',`<div class="meal-copy form-stack"><label>원본 ${state.birthday?'날짜':'생후 일수'}<input id="copySourceDate" ${inputAttrs} value="${inputValue(sourceDay)}"></label><label>복사 범위<select id="copyScope"></select></label><section aria-label="복사 대상"><div id="copyTargets"></div><button type="button" id="copyAddDate" class="secondary">＋ 날짜 추가</button><p id="copyAllNote" class="note" hidden>하루 전체는 간식을 포함한 원래 끼니 번호로 복사해요.</p></section><details class="copy-preview" open><summary>복사할 식단</summary><div id="copySource"></div><p class="note">식단 구성과 계획량만 복사돼요. 섭취 기록과 큐브 사용 이력은 복사되지 않아요.</p></details><div id="copyReviewResult" aria-live="polite"></div></div>`,async()=>{
   if(!review)throw Error('원본과 대상 날짜를 확인해 주세요.');
   const selected=review.rows.filter(r=>['copy','replace'].includes(choices[r.key]));
   if(!selected.length)throw Error('복사할 대상 끼니를 선택해 주세요.');
   const replacements=selected.filter(r=>r.status==='conflict');
   if(replacements.length&&!confirm(replacements.map(r=>fullDate(r.day)+' '+mealLabel({slot:r.slot,type:r.slot>=4?'snack':'meal'})).join('\n')+'에 이미 식단이 등록되어 있어요.\n기존 식단을 교체할까요?'))throw Error('식단 교체를 취소했어요.');
   const skipped=review.rows.filter(r=>!selected.includes(r));
   await C.copyMeals(options,review.token,choices);
   const message=selected.length===1?dateLabel(selected[0].day)+' '+mealLabel({slot:selected[0].slot,type:selected[0].slot>=4?'snack':'meal'})+'에 식단을 복사했어요.':new Set(selected.map(r=>r.day)).size+'개 날짜에 '+selected.length+'끼를 복사했어요.';
   return {message,onSaved:()=>{
    $('sheetTitle').textContent='복사 완료';$('saveSheet').hidden=true;$('cancelSheet').textContent='닫기';$('sheetContent').innerHTML=`<div class="form-stack"><p>${esc(message)}</p><h3>복사한 날짜</h3>${[...new Set(selected.map(r=>r.day))].map(day=>`<button type="button" data-copy-open="${day}">${esc(fullDate(day))} · ${selected.filter(r=>r.day===day).map(r=>r.slot>=4?'간식':r.slot+'끼').join(', ')} 식단 보기 →</button>`).join('')}${skipped.length?'<h3>복사하지 않은 끼니</h3>'+skipped.map(r=>`<p class="note">${esc(fullDate(r.day))} ${r.slot>=4?'간식':r.slot+'끼'} · ${esc(r.reason||'기존 식단 유지 또는 제외 선택')}</p>`).join(''):''}</div>`;
    document.querySelectorAll('[data-copy-open]').forEach(b=>b.onclick=()=>{closeSheet(true);onNavigate(Number(b.dataset.copyOpen));});
   }};
  },'복사하기');
  $('closeSheet').textContent='←';
  function range(){return $('copyScope').value;}
  function selectedMeal(){return meals.find(m=>m.id===range());}
  function refreshTargets(){
   const all=range()==='all',snack=selectedMeal()?.type==='snack';$('copyAllNote').hidden=!all;
   document.querySelectorAll('.copy-target-input').forEach(row=>{
    const select=row.querySelector('[data-copy-slot]'),previous=select.value;
    select.innerHTML=snack?`<option value="${selectedMeal().slot}">간식</option>`:[1,2,3].map(n=>`<option value="${n}">${n}끼</option>`).join('');
    if([...select.options].some(o=>o.value===previous))select.value=previous;
    select.parentElement.hidden=all;
   });
  }
  function addTarget(day){
   const id=++targetId;
   $('copyTargets').insertAdjacentHTML('beforeend',`<div class="copy-target-input" data-target="${id}"><label>대상 ${state.birthday?'날짜':'생후 일수'}<input data-copy-date ${inputAttrs} value="${Number.isSafeInteger(day)?inputValue(day):''}"></label><label>대상 끼니<select data-copy-slot></select></label><button type="button" data-copy-remove="${id}" class="copy-remove" aria-label="이 복사 대상 제외">×</button></div>`);
   refreshTargets();refresh();
  }
  function sourceChanged(){
   const previous=selectedMeal(),wasAll=range()==='all';sourceDay=readDay($('copySourceDate').value);
   meals=Number.isSafeInteger(sourceDay)&&sourceDay>0?C.mealsOf(C.snapshot().days[sourceDay]).filter(m=>m.foods.length):[];
   $('copyScope').innerHTML=meals.length?meals.map(m=>`<option value="${esc(m.id)}">${mealLabel(m)} · ${m.kind==='commercial'?'시판':'수제'}</option>`).join('')+'<option value="all">하루 전체 (간식 포함)</option>':'<option value="">등록된 식단 없음</option>';
   $('copyScope').disabled=!meals.length;
   if(wasAll&&meals.length)$('copyScope').value='all';
   else {const matching=meals.find(m=>m.slot===previous?.slot&&m.type===previous?.type);if(matching)$('copyScope').value=matching.id;}
   sourcePreview();
  }
  function sourcePreview(){
   const selected=range()==='all'?meals:meals.filter(m=>m.id===range());
   $('copySource').innerHTML=selected.length?selected.map(m=>`<div class="copy-meal"><h3>${mealLabel(m)} · ${m.kind==='commercial'?'시판':'수제'}</h3>${m.product?`<p>${esc(m.product.brand||'')} ${esc(m.product.name)} · 준비량 ${esc(m.product.grams)}g</p>`:''}<ul>${m.foods.map(f=>`<li>${esc(MealType.displayName(f.name))} <b>${esc(f.g)}g</b></li>`).join('')}</ul><small>총 ${C.intakeMetrics([{...m,type:'meal'}]).plan}g</small></div>`).join(''):'<p class="note">이 날짜에는 등록된 식단이 없어요. 다른 원본 날짜를 선택해 주세요.</p>';
   refreshTargets();refresh();
  }
  function refresh(){
   review=null;choices={};$('saveSheet').disabled=true;$('sheetError').textContent='';$('copyReviewResult').replaceChildren();
   if(!meals.length)return;
   const targets=[...document.querySelectorAll('.copy-target-input')].map(row=>({day:readDay(row.querySelector('[data-copy-date]').value),slot:Number(row.querySelector('[data-copy-slot]').value)}));
   if(!targets.length||targets.some(t=>!Number.isSafeInteger(t.day)||t.day<1)){ $('copyReviewResult').textContent='대상 날짜를 입력해 주세요.';return;}
   try{
    options={sourceDay,mealId:range(),targets};review=C.previewMealCopy(options);
    $('copyReviewResult').innerHTML=review.rows.map(r=>{
     choices[r.key]=r.status==='empty'?'copy':'skip';
     return `<div class="copy-target"><b>${esc(fullDate(r.day))} · ${r.slot>=4?'간식':r.slot+'끼'}</b>${r.status==='protected'?`<p class="note">${esc(r.reason)} 이 끼니는 복사에서 제외돼요.</p>`:`<label>${r.status==='conflict'?'이미 식단이 등록되어 있어요.':'새 식단으로 복사해요.'}<select data-copy-choice="${r.key}">${r.status==='conflict'?'<option value="skip">기존 식단 유지</option><option value="replace">식단 교체</option>':'<option value="copy">복사</option><option value="skip">이 끼니 제외</option>'}</select></label>`}</div>`;
    }).join('');updateSave();
   }catch(e){review=null;$('copyReviewResult').textContent=e.message;}
  }
  function updateSave(){ $('saveSheet').disabled=!review||!Object.values(choices).some(v=>v==='copy'||v==='replace');}
  $('copySourceDate').oninput=sourceChanged;$('copyScope').onchange=sourcePreview;
  $('copyTargets').oninput=refresh;
  $('copyTargets').onchange=refresh;
  $('copyTargets').onclick=e=>{const b=e.target.closest('[data-copy-remove]');if(b){b.closest('.copy-target-input').remove();refresh();}};
  $('copyAddDate').onclick=()=>{addTarget();document.querySelector('.copy-target-input:last-child input').focus();};
  $('copyReviewResult').onchange=e=>{if(e.target.dataset.copyChoice){choices[e.target.dataset.copyChoice]=e.target.value;updateSave();}};
  sourceChanged();addTarget(sourceDay+1);
 }
 window.PlannerMealCopy={open};
})();
