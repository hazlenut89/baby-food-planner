/* UI preference is written only by the explicit switch, never by route arrival. */
(function(){
 const key='bamsongi.preferred-ui',current=/\/v3(?:\/|$)/.test(location.pathname)?'v3':'legacy';
 const base=new URL(current==='v3'?'../':'./',location.href);
 function read(){try{return localStorage.getItem(key)}catch(_){return null}}
 function target(choice,day){const url=new URL(choice==='v3'?'v3/':'./',base);if(day)url.searchParams.set('day',day);return url.href;}
 function reconcile(){let chosen=read();if(!['legacy','v3'].includes(chosen)){chosen=current;try{localStorage.setItem(key,current)}catch(_){}}if(chosen&&chosen!==current){document.documentElement.style.visibility='hidden';location.replace(target(chosen,new URLSearchParams(location.search).get('day')));return false;}document.documentElement.style.visibility='';return true;}
 window.PlannerUI={switchTo(choice,day){try{localStorage.setItem(key,choice)}catch(_){alert('화면 선택을 저장할 수 없어요. 브라우저 저장 설정을 확인해 주세요.');return;}location.replace(target(choice,day));},reconcile};
 reconcile();window.addEventListener('pageshow',reconcile);window.addEventListener('popstate',reconcile);
})();
