"""Release regression against the runtime-only artifact; isolated browser storage."""
import os
from urllib.request import build_opener, ProxyHandler
urlopen=build_opener(ProxyHandler({})).open
from urllib.error import HTTPError
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8050')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();page.goto(BASE+'/v3/?day=230');page.wait_for_selector('.week-date')
 print(page.evaluate("""async()=>{
 const C=PlannerCore,check=(v,m)=>{if(!v)throw Error(m)},eq=(a,b,m)=>check(JSON.stringify(a)===JSON.stringify(b),m);
 await C.restore({schemaVersion:5,birthday:'2026-03-26',startDay:180,days:{},cubes:[],cubeUsages:[],cubeChanges:[],ingredients:[],preferences:{}},'replace');
 const cases={'아몬드':'견과류','아몬드버터':'견과류','땅콩':'땅콩','땅콩버터':'땅콩','캐슈넛버터':'견과류','일반 유제품 버터':'우유','무염 유제품 버터':'우유','우유':'우유','플레인 우유 요거트':'우유','치즈':'우유','밀가루':'밀','달걀':'달걀','가자미':'생선','새우':'갑각류','두부':'대두'};
 const product=names=>({kind:'commercial',slot:1,product:{name:'제품명은 우유새우달걀',grams:100,ingredients:names},foods:[{name:'제품명은 우유새우달걀',g:100,productEntry:true}],actualIntake:''});
 const classes=m=>MealAllergens.guidance({days:{230:{meals:[m]}},ingredients:[]},230).map(x=>x.name);
 for(const [name,group] of Object.entries(cases)){
  const food={name,g:1};
  for(const m of [{foods:[food]},{...product([name])},{...product([]),foods:[...product([]).foods,food]},{type:'snack',foods:[food]},{...product([name]),type:'snack'},{foods:[food],template:{plannedNew:[name]}}])
   eq(classes(m),[group],name+' route classification');
  check(MealAllergens.isAllergen(name),name+' direct ingredient filter');
 }
 eq(classes(product([])),[],'do not infer product name');
 eq(classes(product(['아몬드버터','우유'])),['우유','견과류'],'compound ingredients');
 eq(classes({foods:[{name:'아몬드버터 우유',g:2}]}),['우유','견과류'],'explicit dairy remains');
 eq(classes({foods:[{name:'밀',g:1}]}),['밀'],'legacy wheat alias');
 eq(C.foodHistoryKey('밀'),C.foodHistoryKey('밀가루'),'wheat history identity');
 await C.saveCube([{name:'캐슈넛버터',grams:1,initialQty:3,madeOn:C.todayISO(),storage:'frozen'}]);
 const cube=C.snapshot().cubes[0];
 await C.saveMeal(229,'cube',{slot:1,foods:[{name:cube.name,g:1}],actualIntake:''},[{batchId:cube.id,name:cube.name,quantity:1}]);
 eq(MealAllergens.guidance(C.snapshot(),229).map(x=>x.name),['견과류'],'actual cube path');
 await C.saveIngredient({id:'manual',name:'우유',preference:'dislike',allergy:'confirmed',firstTriedDay:200,firstTriedOn:'2026-10-11'});
 const before=JSON.stringify(C.snapshot());MealAllergens.guidance(C.snapshot(),229);eq(JSON.stringify(C.snapshot()),before,'guidance does not write');
 for(const [day,names] of [[230,['가자미']],[231,['새송이버섯']],[232,['보리','열무']]]){
  await C.saveMeal(day,'commercial',product(names));
  const s=C.snapshot(),m=C.mealsOf(s.days[day])[0];eq(C.newFoods(s,day,m).planned,names,'commercial NEW');
  for(const n of names)check(s.ingredients.some(i=>i.name===n&&!i.firstTriedDay),'planned registration '+n);
  await C.saveMeal(day,m.id,{...m,actualIntake:0});check(!C.firstFoods(C.snapshot())[C.foodHistoryKey(names[0])],'0g not tasted');
 }
 await C.saveMeal(233,'snack',{...product(['배']),type:'snack',slot:4});
 await C.saveMeal(234,'home',{slot:1,foods:[{name:'가지',g:2}],actualIntake:''});
 eq(C.newFoods(C.snapshot(),233,C.mealsOf(C.snapshot().days[233])[0]).planned,['배'],'snack pear');
 const manual=C.snapshot().ingredients.find(i=>i.name==='우유');check(manual.allergy==='confirmed'&&manual.firstTriedDay===200&&manual.preference==='dislike','manual data retained');
 return 'PASS 15 allergen cases across meal paths; compound/no recipe inference; cube; legacy wheat; NEW registration/0g/manual data';
 }"""))
 for day,label in [(230,'NEW · 가자미'),(231,'NEW · 새송이버섯'),(232,'NEW · 보리, 열무'),(233,'NEW · 배'),(234,'NEW · 가지')]:
  page.goto(BASE+f'/v3/?day={day}');page.wait_for_selector('.week-date')
  assert page.locator('.new-badge').all_text_contents()==[label],label
 print('PASS explicit NEW UI fixtures')
 b.close()
for path in ['tests/new-foods.py','reports/final-qa-20261026.md','previews/icons.png','navigation-cubes-results.json','scripts/build-static.cjs','.env','.git/config']:
 try:
  urlopen(BASE+'/'+path)
  raise AssertionError('Development file served: '+path)
 except HTTPError as e:assert e.code==404,(path,e.code)
print('PASS development paths return 404 from built artifact')
