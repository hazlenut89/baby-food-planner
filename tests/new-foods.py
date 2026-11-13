"""NEW and first-taste regression. Run against an isolated local HTTP server."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8001')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/v3/?day=230');page.wait_for_selector('.week-date')
 print(page.evaluate('''async()=>{
 const C=PlannerCore,check=(v,m)=>{if(!v)throw Error(m)},eq=(a,b,m)=>check(JSON.stringify(a)===JSON.stringify(b),m);
 await C.restore({schemaVersion:5,birthday:'2026-03-26',startDay:180,babyName:'NEW 검증',days:{},cubes:[],cubeUsages:[],cubeChanges:[],ingredients:[{id:'registered',name:'배',category:'fruit',preference:'like',allergy:'none'}],preferences:{}},'replace');
 const home=(name,slot=1,type='meal',actualIntake='')=>({slot,type,kind:'homemade',foods:[{name,g:2}],actualIntake});
 const commercial=(name,slot=1,type='meal',actualIntake='')=>({slot,type,kind:'commercial',product:{brand:'확인 브랜드',name:'한우새송이버섯죽',grams:150,ingredients:[name]},foods:[{name:'시판 한우새송이버섯죽',g:150,productEntry:true}],actualIntake});
 for(const [id,m] of [['home',home('가지')],['commercial',commercial('새송이버섯',2)],['snack',home('사과',4,'snack')],['product-snack',commercial('배',5,'snack')]])await C.saveMeal(230,id,m);
 let s=C.snapshot();for(const [id,name] of [['home','가지'],['commercial','새송이버섯'],['snack','사과'],['product-snack','배']])check(C.newFoods(s,230,C.mealsOf(s.days[230]).find(m=>m.id===id)).planned.includes(name),id+' planned badge');
 check(!C.firstFoods(s)[C.foodHistoryKey('배')],'unrecorded taste');check(!s.ingredients.find(i=>i.name==='배').firstTriedDay,'registered != tasted');
 const topped=commercial('새송이버섯');topped.product.ingredients.push('새송이버섯');topped.foods.push({name:'새송이버섯',g:1},{name:'청경채',g:2});await C.saveMeal(231,'topping',topped);eq(C.mealIngredients(topped),['새송이버섯','청경채'],'deduplicate toppings/product');
 const unknown=commercial('');unknown.product.ingredients=[];await C.saveMeal(232,'unknown',unknown);eq(C.newFoods(C.snapshot(),232,C.mealsOf(C.snapshot().days[232])[0]).planned,[],'never infer recipe');
 await C.saveCube([{name:'당근',grams:2,initialQty:3,madeOn:C.todayISO(),storage:'frozen'}]);let cube=C.snapshot().cubes[0];await C.saveMeal(233,'cube',home('당근'),[{batchId:cube.id,name:'당근',quantity:1}]);check(C.newFoods(C.snapshot(),233,C.mealsOf(C.snapshot().days[233])[0]).planned.includes('당근'),'cube NEW');
 const stock=JSON.stringify(C.snapshot().cubes),ledger=JSON.stringify(C.snapshot().cubeUsages);
 let pear=C.mealsOf(s.days[230]).find(m=>m.id==='product-snack');await C.saveMeal(230,pear.id,{...pear,actualIntake:0});check(!C.firstFoods(C.snapshot())[C.foodHistoryKey('배')],'0g is not consumed');
 await C.saveMeal(230,pear.id,{...pear,actualIntake:2});s=C.snapshot();check(s.ingredients.find(i=>i.name==='배').firstTriedDay===230,'store first day');check(s.ingredients.find(i=>i.name==='배').firstTriedOn==='2026-11-10','store first date');eq(C.newFoods(s,230,C.mealsOf(s.days[230]).find(m=>m.id===pear.id)).actual,['배'],'first actual badge');
 await C.saveMeal(235,'later',commercial('배',1,'meal',2));eq(C.newFoods(C.snapshot(),235,C.mealsOf(C.snapshot().days[235])[0]),{planned:[],actual:[]},'prior taste suppresses NEW');
 await C.saveMeal(228,'earlier',home('배',1,'meal',1));check(C.snapshot().ingredients.find(i=>i.name==='배').firstTriedDay===228,'backdated recalculation');
 await C.saveMeal(228,'earlier',{foods:[],actualIntake:''},[],undefined,true);check(C.snapshot().ingredients.find(i=>i.name==='배').firstTriedDay===230,'delete earliest recalculation');
 await C.saveMeal(230,pear.id,pear);check(C.snapshot().ingredients.find(i=>i.name==='배').firstTriedDay===235,'unrecord earlier recalculation');
 await C.saveMeal(235,'later',{foods:[],actualIntake:''},[],undefined,true);check(!C.snapshot().ingredients.find(i=>i.name==='배').firstTriedDay,'remove last taste');check(C.newFoods(C.snapshot(),230,pear).planned.includes('배'),'NEW returns');
 await C.saveMeal(230,'commercial',{...commercial('새송이버섯',2),actualIntake:100});check(C.snapshot().ingredients.some(i=>i.name==='새송이버섯'&&i.firstTriedDay===230),'product registration');
 check(!C.snapshot().ingredients.some(i=>i.name.includes('한우새송이버섯죽')),'product not ingredient');
 // Explicit manually recorded history survives meal deletion and backup/restore.
 await C.saveIngredient({id:'manual',name:'감자',preference:'like',allergy:'none',firstTriedDay:180,firstTriedOn:'2026-09-21'});await C.saveMeal(230,'potato',home('감자',3));eq(C.newFoods(C.snapshot(),230,C.mealsOf(C.snapshot().days[230]).find(m=>m.id==='potato')).planned,[],'manual history');
 eq(JSON.stringify(C.snapshot().cubes),stock,'inventory changed by history');eq(JSON.stringify(C.snapshot().cubeUsages),ledger,'ledger changed by history');
 // Existing raw records are recalculated on restore/load; manual dates remain independent.
 let legacy=C.snapshot();legacy.ingredients.push({id:'old-auto',name:'새송이버섯 별칭 아님',preference:'unknown',allergy:'unknown',firstPlannedDay:220,firstTriedDay:220,intakeStatus:'recorded'});await C.restore(legacy,'replace');check(!C.snapshot().ingredients.find(i=>i.id==='old-auto').firstTriedDay,'stale legacy auto history');
 let mushroom=C.snapshot().ingredients.find(i=>i.name==='새송이버섯');await C.saveIngredient({...mushroom,firstTriedDay:200,firstTriedOn:'2026-10-11'});await C.load();check(C.snapshot().ingredients.find(i=>i.id===mushroom.id).firstTriedDay===200,'manual override preserved on load');
 // Restore auto-derived mushroom for the first-taste UI assertion below.
 await C.saveIngredient({...C.snapshot().ingredients.find(i=>i.id===mushroom.id),firstTriedDay:null,firstTriedOn:''});
 const saved=C.snapshot();await C.restore(JSON.parse(C.backup()),'replace');for(const key of ['days','ingredients','cubes','cubeUsages','preferences'])eq(C.snapshot()[key],saved[key],'backup '+key);
 const analysis=PlannerIngredientStats.collect(C.snapshot(),day=>{let d=new Date('2026-03-26T12:00:00');d.setDate(d.getDate()+day-1);return d;},d=>d.toISOString().slice(0,10));check(analysis.records.some(r=>r.names.includes('새송이버섯')),'analysis includes eaten product');check(!analysis.records.some(r=>r.names.includes('배')),'analysis excludes unrecorded snack');
 return 'PASS all 6 ingredient paths, unrecorded/0g, first taste save, backdated edit/delete, manual history, deduplication, no recipe guessing, inventory preservation and backup';
 }'''))
 page.evaluate("async()=>{const C=PlannerCore,m=C.mealsOf(C.snapshot().days[230]).find(m=>m.id==='home');await C.saveMeal(230,m.id,{...m,foods:[...m.foods,{name:'배추',g:2},{name:'비타민채',g:2}]});}")
 page.reload();page.wait_for_selector('.week-date')
 assert page.locator('[data-meal="home"] .new-badge').all_text_contents()==['NEW']
 assert page.locator('[data-meal="product-snack"] .new-badge').all_text_contents()==['NEW']
 assert page.locator('[data-meal="commercial"] .new-badge').all_text_contents()==['NEW']
 for width in [320,375,390,430]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('#legacyLink').click();page.wait_for_url('**/?day=230');page.wait_for_timeout(300)
 assert '새송이버섯' in page.locator('#weekDetail').inner_text()
 assert 'NEW' in page.locator('#weekDetail').inner_text()
 assert page.locator('#weekDetail .legacy-meal-group').evaluate_all('(es)=>es.every(e=>e.querySelectorAll(".new-food-badge").length<=1)')
 assert all(t=='NEW' for t in page.locator('#weekDetail .new-food-badge').all_text_contents())
 assert not errors,errors
 print('PASS V3 meal/snack NEW rendering, 4 mobile widths, V1 shared record rendering')
 b.close()
