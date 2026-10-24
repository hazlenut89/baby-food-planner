/* One visual viewport and one scrolling body per mobile editor. */
(()=>{
 const mobile=matchMedia('(max-width:768px)');
 let frame=0,active=null;
 const selector='#mobile-editor-page:not([hidden]),#sharedMealDialog[open],#sheet.input-screen[open]';
 function update(){
  cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const next=mobile.matches?document.querySelector(selector):null;
   if(active&&active!==next){active.style.removeProperty('--editor-height');active.style.removeProperty('--editor-top');active.classList.remove('keyboard-visible');}
   active=next;if(!active)return;
   const v=window.visualViewport;if(v&&Math.abs(v.scale-1)>.01)return;
   const height=v?v.height:innerHeight,top=v?v.offsetTop:0;
   active.style.setProperty('--editor-height',height+'px');
   active.style.setProperty('--editor-top',top+'px');
   active.classList.toggle('keyboard-visible',document.documentElement.clientHeight-height>120);
   const field=document.activeElement;
   if(!active.contains(field)||!field.matches('input,textarea,select'))return;
   const scroller=field.closest('.input-content,.shared-content,.sheet-content');if(!scroller)return;
   const r=field.getBoundingClientRect(),s=scroller.getBoundingClientRect();
   if(r.bottom>s.bottom-12)scroller.scrollTop+=r.bottom-s.bottom+12;
   else if(r.top<s.top+12)scroller.scrollTop-=s.top-r.top+12;
  });
 }
 new MutationObserver(update).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden','class']});
 window.visualViewport?.addEventListener('resize',update,{passive:true});
 window.visualViewport?.addEventListener('scroll',update,{passive:true});
 window.addEventListener('resize',update,{passive:true});
 document.addEventListener('focusin',update);document.addEventListener('focusout',update);update();
})();
