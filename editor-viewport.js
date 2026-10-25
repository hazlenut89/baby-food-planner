/* Mobile editor page state. Desktop dialogs keep their native behavior. */
(()=>{
 const mobile=()=>matchMedia('(max-width:768px)').matches;
 for(const id of ['sheet','sharedMealDialog','jumpDialog']){
  const root=document.getElementById(id);if(!root)continue;
  const nativeOpen=root.showModal.bind(root),nativeClose=root.close.bind(root);
  let page=null,hidden=[],origin=0,anchor=null;
  const historyKey="editor-"+id;
  if(id==='jumpDialog')root.addEventListener('cancel',e=>{if(page){e.preventDefault();root.close();}});
  window.addEventListener("popstate",()=>{if(!page||history.state?.editorPage===historyKey)return;root.dispatchEvent(new Event("cancel",{cancelable:true}));if(page)history.pushState({...history.state,editorPage:historyKey},"",location.href);});
  root.showModal=function(){
   if(!mobile()||root.classList.contains('quick-sheet'))return nativeOpen();
   if(page)return;
   origin=scrollY;anchor=document.createComment('editor return');root.before(anchor);
   page=document.createElement('section');page.className='mobile-edit-route';page.setAttribute('aria-label','편집 페이지');
   hidden=[...document.body.children].filter(e=>!['SCRIPT','STYLE','LINK'].includes(e.tagName)).map(e=>[e,e.hidden]);
   hidden.forEach(([e])=>e.hidden=true);root.hidden=false;
   document.body.append(page);page.append(root);root.setAttribute('open','');document.body.classList.add('edit-route-open');
   history.pushState({...history.state,editorPage:historyKey},"",location.href);window.scrollTo(0,0);
  };
  root.close=function(){
   if(!page)return nativeClose();
   root.removeAttribute('open');anchor.after(root);anchor.remove();page.remove();page=null;
   hidden.forEach(([e,value])=>e.hidden=value);hidden=[];
   document.body.classList.remove('edit-route-open');window.scrollTo(0,origin);if(history.state?.editorPage===historyKey)history.back();
  };
 }
})();
