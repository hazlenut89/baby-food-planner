/* V3 editor-only controls. Stored records change only through the existing save transaction. */
(()=>{'use strict';
 const brands=['스푼타임','베베쿡','엘빈즈','루솔','짱죽','푸드케어(클레)','풀무원 베이비밀','베이비본죽','맘마밀'];
 const label=name=>name==='푸드케어'?'푸드케어(클레)':String(name||'');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function choose(text,choices){return new Promise(resolve=>{const prior=document.activeElement,d=document.createElement('dialog');d.className='commercial-confirm';d.setAttribute('aria-label','끼니 유형 변경 확인');d.innerHTML='<p>'+esc(text)+'</p><div>'+choices.map(([value,title,disabled])=>'<button type="button" data-choice="'+value+'" '+(disabled?'disabled':'')+'>'+esc(title)+'</button>').join('')+'</div>';let value='cancel';d.addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(b&&!b.disabled){value=b.dataset.choice;d.close();}});d.addEventListener('close',()=>{d.remove();prior?.focus({preventScroll:true});resolve(value);},{once:true});document.body.append(d);d.showModal();});}
 function mount(root,options){const select=root.querySelector('[data-meal-type]'),fields=root.querySelector('[data-product-fields]');
  if(!fields.querySelector('[data-brand]')){const saved=String(options.meal?.product?.brand||''),known=brands.includes(label(saved));fields.insertAdjacentHTML('afterbegin','<label>업체명<select data-brand><option value="">선택 안 함</option>'+brands.map(b=>'<option '+(known&&label(saved)===b?'selected':'')+'>'+b+'</option>').join('')+'<option value="other" '+(saved&&!known?'selected':'')+'>기타 (직접 입력)</option></select></label><label data-other-brand-label>업체명 직접 입력<input data-other-brand maxlength="100" value="'+esc(saved&&!known?saved:'')+'"></label>');select.dataset.acceptedType=select.value;}
  const brand=fields.querySelector('[data-brand]'),other=fields.querySelector('[data-other-brand]');
  function updateBrand(){const commercial=select.value==='commercial';brand.disabled=!commercial;other.disabled=!commercial||brand.value!=='other';other.required=!other.disabled;fields.querySelector('[data-other-brand-label]').hidden=brand.value!=='other';}
  brand.onchange=()=>{updateBrand();options.onChange();};updateBrand();
  const original=select.onchange;
  select.onchange=async()=>{const before=select.dataset.acceptedType||'homemade',next=select.value;if(before===next){original?.();updateBrand();return;}select.value=before;
   if(next==='commercial'&&options.hasFoods()){
    const linked=options.hasCubeLinks();const choice=await choose(linked?'이 끼니에 저장된 큐브 사용 이력이 연결되어 있어 식재료를 삭제할 수 없어요. 재고와 사용 이력을 보존하면서 기존 식재료를 유지한 채 시판 이유식으로 전환할 수 있어요.':'기존 식재료가 등록되어 있습니다. 시판 이유식으로 변경하면서 식재료를 삭제할까요?',[['delete','기존 식재료 삭제',linked],['keep','식재료 유지'],['cancel','취소']]);
    if(choice==='cancel')return;if(choice==='delete')options.onDelete();
   }else if(next==='homemade'&&(fields.querySelector('[data-product-name]').value||fields.querySelector('[data-product-grams]').value)){
    if(await choose('수제로 변경하면 저장 시 시판 제품 정보는 제외됩니다. 별도 식재료는 유지됩니다. 변경할까요?',[['keep','수제로 변경'],['cancel','취소']])==='cancel')return;
   }
   select.value=next;select.dataset.acceptedType=next;original?.();updateBrand();options.onChange();
  };
 }
 function value(root){const field=root.querySelector('[data-brand]');if(!field)return null;const raw=field.value==='other'?root.querySelector('[data-other-brand]').value.trim():field.value;if(field.value==='other'&&!raw)throw Error('업체명을 입력해 주세요.');return label(raw);}
 window.PlannerCommercial={brands,label,mount,value};
})();
