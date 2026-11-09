/* V3-only meal copy sheet; uses the shared store's atomic, record-preserving copy operation. */
(()=>{'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function open({sourceDay,state,openSheet,dateOf,dayOf,iso,dateLabel}){
  const C=PlannerCore,meals=C.mealsOf(state.days[sourceDay]).filter(m=>m.foods.length);
  if(!meals.length)throw Error('선택한 날짜에 복사할 식단이 없어요.');
  let days=[],review=null,options=null;
  const fullDate=day=>dateOf(day)?iso(dateOf(day))+' · '+dateLabel(day):dateLabel(day);
  const mealLabel=m=>m.type==='snack'?'간식':m.slot+'끼';
  openSheet('식단 복사',`<div class="meal-copy form-stack"><p class="notice">원본: <strong>${esc(fullDate(sourceDay))}</strong><br>식단 구성만 복사해요. 섭취량·반응·메모·큐브 사용 이력은 복사하지 않아요.</p><label>복사 범위<select id="copyScope">${meals.map(m=>`<option value="${esc(m.id)}">${mealLabel(m)} · ${m.kind==='commercial'?'시판':'수제'}</option>`).join('')}<option value="all">하루 전체${meals.some(m=>m.type==='snack')?' (간식 포함)':''}</option></select></label><section id="copySource" aria-label="원본 식단 미리보기"></section><label>대상 ${state.birthday?'날짜':'생후 일수'}<div class="copy-date-entry"><input id="copyDate" ${state.birthday?'type="date"':'type="number" min="1" step="1" inputmode="numeric"'} aria-label="복사 대상 ${state.birthday?'날짜':'생후 일수'}"><button type="button" id="copyAddDate">날짜 추가</button></div></label><p class="note">날짜를 추가해 여러 날짜에 한 번에 복사할 수 있어요.${state.birthday?'':' 생년월일이 없으면 생후 일수로 선택해요.'}</p><div id="copyDates" class="copy-dates" aria-label="선택한 대상 날짜"></div><label id="copySlotLabel">대상 끼니<select id="copySlot"><option value="1">1끼</option><option value="2">2끼</option><option value="3">3끼</option></select></label><p id="copyAllNote" class="note" hidden>하루 전체는 원래 끼니 번호로 복사해요. 대상 날짜별로 유지·교체를 선택할 수 있어요.</p><button type="button" id="copyReview" class="secondary">복사 내용 확인</button><div id="copyReviewResult" aria-live="polite"></div></div>`,async()=>{
   if(!review)throw Error('먼저 복사 내용을 확인해 주세요.');
   const choices=Object.fromEntries([...document.querySelectorAll('[data-copy-choice]')].map(e=>[e.dataset.copyChoice,e.value]));
   if(Object.values(choices).includes('replace')&&!confirm('선택한 미기록 식단을 교체할까요? 기존 섭취·큐브 이력이 있는 끼니는 유지됩니다.'))throw Error('교체를 취소했어요.');
   await C.copyMeals(options,review.token,choices);
  },'복사하기','날짜와 끼니를 선택해 주세요');
  const $=id=>document.getElementById(id),invalidate=()=>{review=null;$('copyReviewResult').replaceChildren();$('saveSheet').disabled=true;};
  function updateSource(){
   const scope=$('copyScope').value,selected=scope==='all'?meals:meals.filter(m=>m.id===scope),snack=selected.length===1&&selected[0].type==='snack';
   $('copySlotLabel').hidden=scope==='all'||snack;$('copyAllNote').hidden=scope!=='all';
   $('copySource').innerHTML=selected.map(m=>`<div class="copy-meal"><h3>${mealLabel(m)} · ${m.kind==='commercial'?'시판':'수제'}</h3>${m.product?`<p>${esc(m.product.brand||'')} ${esc(m.product.name)} · 준비량 ${esc(m.product.grams)}g</p>`:''}<p>${m.foods.map(f=>esc(MealType.displayName(f.name))+' '+esc(f.g)+'g').join(' · ')}</p><small>계획 ${C.intakeMetrics([m]).plan}g</small></div>`).join('');invalidate();
  }
  function updateDays(){
   $('copyDates').innerHTML=days.map(d=>`<button type="button" data-copy-remove="${d}" aria-label="${esc(fullDate(d))} 선택 해제">${esc(fullDate(d))} ×</button>`).join('');invalidate();
  }
  $('copyScope').onchange=updateSource;$('copySlot').onchange=invalidate;
  $('copyAddDate').onclick=()=>{try{
   const v=$('copyDate').value;if(!v)throw Error('대상 날짜를 입력해 주세요.');
   const day=state.birthday?(C.validISO(v)?dayOf(new Date(v+'T12:00:00')):NaN):Number(v);
   if(!Number.isSafeInteger(day)||day<1||day===sourceDay)throw Error('원본과 다른 유효한 날짜를 선택해 주세요.');
   if(!days.includes(day))days.push(day);days.sort((a,b)=>a-b);updateDays();$('sheetError').textContent='';
  }catch(e){$('sheetError').textContent=e.message;}};
  $('copyDates').onclick=e=>{const btn=e.target.closest('[data-copy-remove]');if(btn){days=days.filter(d=>d!==Number(btn.dataset.copyRemove));updateDays();}};
  $('copyReview').onclick=()=>{try{
   const mealId=$('copyScope').value,m=meals.find(m=>m.id===mealId);
   options={sourceDay,mealId,targets:days.map(day=>({day,slot:m?.type==='snack'?m.slot:Number($('copySlot').value)}))};review=C.previewMealCopy(options);
   $('copyReviewResult').innerHTML='<h3>대상별 복사 확인</h3>'+review.rows.map(r=>`<div class="copy-target"><b>${esc(fullDate(r.day))} · ${r.slot>=4?'간식':r.slot+'끼'}</b>${r.status==='protected'?`<p class="note">${esc(r.reason)} 기존 식단을 유지합니다.</p>`:`<label>${r.status==='conflict'?'기존 식단이 있어요':'빈 끼니예요'}<select data-copy-choice="${r.key}" aria-label="${esc(fullDate(r.day))} ${r.slot}끼 복사 여부">${r.status==='conflict'?'<option value="skip">기존 식단 유지</option><option value="replace">기존 식단 교체</option>':'<option value="copy">복사</option><option value="skip">이 끼니 제외</option>'}</select></label>`}</div>`).join('')+'<p class="note">전체 작업을 취소하려면 아래 취소 버튼을 눌러 주세요.</p>';
   $('saveSheet').disabled=!review.rows.some(r=>r.status!=='protected');$('sheetError').textContent='';
  }catch(e){invalidate();$('sheetError').textContent=e.message;}};
  updateSource();
 }
 window.PlannerMealCopy={open};
})();
