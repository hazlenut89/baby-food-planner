/* Optional product metadata; the supplied product weight is one food entry for legacy totals. */
window.MealType={
 names(meal){return [...(meal.product?.ingredients||[]).flatMap(n=>String(n).split(',')),...(meal.foods||[]).filter(f=>!f.productEntry).map(f=>f.name)].map(n=>n.trim()).filter(Boolean);},
 reduceCubeFoods(foods,name,grams){let remaining=grams;const matches=foods.filter(f=>f.name.trim()===name.trim()).sort((a,b)=>Number(b.g)-Number(a.g));for(const f of matches){const amount=Math.min(Math.max(0,Number(f.g)||0),remaining);f.g=Math.max(0,(Number(f.g)||0)-amount);remaining-=amount;if(remaining<=0)break;}return foods.filter(f=>!matches.includes(f)||Number(f.g)>0);},
 plannedNames(meal,state,day){const C=window.PlannerCore,first=C.firstFoods(state),present=new Set(this.names({...meal,foods:(meal.foods||[]).filter(f=>Number(f.g)>0)}).map(C.foodHistoryKey));return (meal.template?.plannedNew||[]).filter(n=>present.has(C.foodHistoryKey(n))&&!(first[C.foodHistoryKey(n)]?.day<=day));},
 icons(meal,size=32){return this.names(meal).map(n=>window.PlannerFoodIcons?.html(n,size)||'').join('');},
 markup(meal={}){const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return `<section class="meal-type-fields"><label>끼니 유형<select data-meal-type><option value="homemade">수제</option><option value="commercial" ${meal.kind==='commercial'?'selected':''}>시판</option></select></label><div data-product-fields ${meal.kind==='commercial'?'':'hidden'}><label>제품명<input data-product-name maxlength="100" value="${e(meal.product?.name)}"></label><label>제품 준비량(g)<input data-product-grams type="number" min="0.1" step="any" inputmode="decimal" value="${e(meal.product?.grams)}"></label><label>포함 식재료 (선택 · 쉼표로 구분)<input data-product-ingredients value="${e((meal.product?.ingredients||[]).join(', '))}"></label></div></section>`;},
 mount(root){const select=root.querySelector('[data-meal-type]');const update=()=>{const product=select.value==='commercial';root.querySelector('[data-product-fields]').hidden=!product;for(const key of ['name','grams']){const input=root.querySelector('[data-product-'+key+']');input.disabled=!product;input.required=product;}root.querySelector('[data-product-ingredients]').disabled=!product;root.querySelectorAll('.food-row input,.shared-food input').forEach(i=>i.required=!product);};select.onchange=update;update();},
 extras(meal){return (meal.foods||[]).filter(f=>!f.productEntry);},
 grams(root){return root.querySelector('[data-meal-type]')?.value==='commercial'?Number(root.querySelector('[data-product-grams]').value||0):0;},
 record(root,foods,allowEmpty=false){const commercial=root.querySelector('[data-meal-type]').value==='commercial';const clean=foods.filter(f=>String(f.name||'').trim()||String(f.g??'')!=='');if(clean.some(f=>!String(f.name||'').trim()||String(f.g??'')===''||!Number.isFinite(Number(f.g))||Number(f.g)<=0))throw Error('추가 식재료명과 중량을 함께 입력해 주세요.');const extras=clean.map(f=>({...f,name:f.name.trim(),g:Number(f.g)}));if(!commercial){if(!extras.length&&!allowEmpty)throw Error('식재료를 한 개 이상 입력해 주세요.');return {kind:'homemade',product:null,foods:extras};}const name=root.querySelector('[data-product-name]').value.trim(),grams=Number(root.querySelector('[data-product-grams]').value);if(!name||!Number.isFinite(grams)||grams<=0)throw Error('제품명과 제품 준비량을 입력해 주세요.');return {kind:'commercial',product:{name,grams,ingredients:root.querySelector('[data-product-ingredients]').value.split(',').map(s=>s.trim()).filter(Boolean)},foods:[{name:'시판 · '+name,g:grams,productEntry:true},...extras]};}
};
/* Read-only guidance: current ingredients determine warnings, never template prose. */
(()=>{
 const key=n=>String(n||'').normalize('NFC').replace(/\s/g,'');
 const groups=[
 ['밀',n=>/밀|소맥|^빵$|파스타/.test(n.replace(/오트밀|메밀|밀크/g,'')),'충분히 익힌 형태로 제공하고, 처음이면 낮 시간에 소량부터 반응을 확인하세요. 생반죽은 제공하지 마세요.'],
 ['땅콩',n=>/땅콩|피넛/.test(n),'무가당·매끈한 땅콩버터를 죽 등에 충분히 희석해 소량부터 제공하세요. 통땅콩·덩어리는 피하고, 중증 습진·달걀 알레르기 등 고위험군은 도입 전 의료진과 상담하세요.'],
 ['달걀',n=>/달걀|계란|난황|난백/.test(n),'완전히 익혀 제공하고 처음이면 소량부터 반응을 확인하세요.'],
 ['대두',n=>/대두|두부|두유|된장|간장/.test(n)||/^(콩|콩가루|검은콩|백태|서리태)$/.test(n),'대두 함유 여부를 확인하고 처음이면 소량부터 반응을 확인하세요. 다른 콩을 먹은 이력만으로 안전하다고 판단하지 마세요.'],
 ['우유',n=>/우유|밀크|치즈|요거트|요구르트|버터|분유/.test(n.replace(/땅콩버터/g,'')),'우유 단백질 포함 여부와 개별 알레르기를 확인하세요. 돌 전 생우유를 주 음료로 제공하지 마세요.'],
 ['생선',n=>/생선|연어|대구|명태|가자미|고등어|참치|멸치|광어|조기/.test(n),'완전히 익히고 가시를 제거하세요. 다른 생선을 먹었더라도 처음 먹는 종류는 소량부터 확인하세요.'],
 ['참깨',n=>/참깨|검은깨|흑임자|참기름|타히니/.test(n),'입자와 형태를 안전하게 조절하고 처음이면 소량부터 반응을 확인하세요.'],
 ['견과류',n=>/아몬드|호두|잣|캐슈|피스타치오|헤이즐넛|마카다미아/.test(n),'통째·덩어리 형태는 피하고 곱게 갈거나 묽게 섞어 제공하세요. 종류별 알레르기를 확인하세요.'],
 ['갑각류',n=>/새우|꽃게|대게|랍스터|^게$/.test(n),'완전히 익혀 안전한 크기와 질감으로 제공하고 처음이면 소량부터 확인하세요.'],
 ['조개류',n=>/조개|바지락|홍합|전복|가리비|^굴$/.test(n),'완전히 익혀 안전한 크기와 질감으로 제공하고 처음이면 소량부터 확인하세요.'],
 ['메밀',n=>/메밀/.test(n),'메밀은 밀과 별도로 알레르기를 확인하고 처음이면 소량부터 제공하세요.']
 ];
 const names=m=>[...(m.foods||[]).filter(f=>!f.productEntry&&Number(f.g)>0).map(f=>f.name),...(Number(m.product?.grams)>0?(m.product.ingredients||[]).flatMap(n=>String(n).split(',')):[])].map(key).filter(Boolean);
 function guidance(state,day){
  const C=window.PlannerCore,meals=C.mealsOf(state.days[day]),present=meals.flatMap(names),out=[];
  for(const [name,match,text] of groups){
   if(!present.some(match))continue;
   const specific=['생선','견과류','갑각류','조개류'].includes(name),current=present.filter(match),historyMatch=n=>match(n)&&(!specific||current.some(x=>x===n||x.includes(n)||n.includes(x)));
   let first=Infinity;
   for(const [d,record] of Object.entries(state.days))if(Number(d)<=day)for(const m of C.mealsOf(record))if(Number(m.actualIntake)>0&&names(m).some(historyMatch))first=Math.min(first,Number(d));
   for(const i of state.ingredients||[]){if(!historyMatch(key(i.name)))continue;let d=Number(i.firstTriedDay);if(!d&&i.firstTriedOn&&state.birthday)d=Math.round((Date.parse(i.firstTriedOn+'T00:00:00Z')-Date.parse(state.birthday+'T00:00:00Z'))/86400000)+1;if(d>0&&d<=day)first=Math.min(first,d);}
   const planned=meals.some(m=>(m.template?.plannedNew||[]).some(n=>match(key(n))));
   out.push({name,status:first===day?'실제 첫 섭취 기록':first<day?'이전 섭취 기록 있음':planned?'도입 예정 · 실제 섭취 확인 필요':'첫 섭취 여부 확인 필요',text});
  }
  for(const i of state.ingredients||[])if(['suspected','confirmed'].includes(i.allergy)&&present.some(n=>C.foodHistoryKey(n)===C.foodHistoryKey(key(i.name))))out.push({name:i.name,status:i.allergy==='confirmed'?'확인된 알레르기 기록':'의심 반응 기록',text:'저장된 개별 반응 기록이 있어요. 제공 여부를 의료진과 확인하세요.'});
  return out;
 }
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.MealAllergens={guidance,html(state,day){return guidance(state,day).map(x=>'<p class="notice allergy-guidance"><strong>'+esc(x.name)+' 알레르기 안내 · '+esc(x.status)+'</strong><br>'+esc(x.text)+'</p>').join('');}};
})();
