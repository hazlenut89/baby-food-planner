# Run with a local HTTP server at BASE_URL (default http://127.0.0.1:8001).
# Uses isolated browser storage; never opens the user's browser profile.
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE_URL','http://127.0.0.1:8001')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 dialogs=[];page.on('dialog',lambda d:(dialogs.append(d.message),d.accept()))
 page.goto(BASE+'/v3/?day=220');page.wait_for_selector('.week-date')
 result=page.evaluate('''async()=>{
 const C=PlannerCore,eq=(a,b,msg)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(msg)},ok=(x,msg)=>{if(!x)throw Error(msg)};
 const home={id:'home',slot:1,kind:'homemade',foods:[{name:'소고기',g:20,icon:'🥩'},{name:'쌀죽',g:60}],actualIntake:50,allergy:true,memo:'섭취 메모',completed:true,history:['old']};
 const product={id:'product',slot:2,kind:'commercial',foods:[{name:'시판 제품',g:100,productEntry:true},{name:'브로콜리',g:10}],product:{brand:'브랜드',name:'제품명',grams:100,ingredients:['쌀','소고기']},actualIntake:0};
 const meal=(id,slot,actualIntake='')=>({id,slot,foods:[{name:'감자',g:10}],actualIntake,allergy:false});
 const day=ms=>({foods:ms[0].foods,actualIntake:ms[0].actualIntake,allergy:!!ms[0].allergy,meals:ms,memo:'날짜 메모',v3Multi:ms.length>1});
 const fixture={schemaVersion:5,babyName:'복사검증',birthday:'2026-03-26',startDay:180,days:{220:day([home,product,meal('third',3)]),221:day([meal('existing',2)]),222:day([meal('recorded',2,0)]),223:day([meal('cubed',2)]),224:day([meal('memo',2)])},ingredients:[],preferences:{},cubes:[{id:'cube',name:'감자',grams:10,initialQty:10,remainingQty:9,madeOn:'2026-11-01',storage:'frozen'}],cubeUsages:[{id:'usage',mealDay:223,mealId:'cubed',cubeBatchId:'cube',foodName:'감자',cubeGrams:10,quantity:1,status:'used'}],cubeChanges:[]};
 fixture.days[224].meals[0].memo='보호할 기록';
 await C.restore(fixture,'replace');const before=C.snapshot();
 let options={sourceDay:220,mealId:'home',targets:[{day:225,slot:2},{day:226,slot:1},{day:221,slot:2},{day:222,slot:2},{day:223,slot:2},{day:224,slot:2}]},r=C.previewMealCopy(options);
 eq(r.rows.map(x=>x.status),['empty','empty','conflict','protected','protected','protected'],'conflicts');
 await C.copyMeals(options,r.token,{'225:2':'copy','226:1':'copy','221:2':'skip'});
 let after=C.snapshot();eq(after.days[220],before.days[220],'source changed');eq(after.days[221],before.days[221],'skip changed');
 const copied=C.mealsOf(after.days[225])[0];eq(copied.foods,home.foods,'food weights');ok(copied.id!==home.id&&copied.id!==C.mealsOf(after.days[226])[0].id,'unique ids');ok(copied.actualIntake===''&&!copied.allergy&&!copied.memo&&!copied.completed&&!copied.history,'history leaked');
 for(const k of ['cubes','cubeUsages','cubeChanges','ingredients','preferences'])eq(after[k],before[k],k+' changed');
 r=C.previewMealCopy(options);await C.copyMeals(options,r.token,{'221:2':'replace'});ok(C.mealsOf(C.snapshot().days[221])[0].id!=='existing','replace failed');
 for(const d of [222,223,224]){let rejected=false;try{await C.copyMeals(options,C.previewMealCopy(options).token,{[d+':2']:'replace'})}catch(e){rejected=true}ok(rejected,'protected overwrite');eq(C.snapshot().days[d],before.days[d],'protected data changed');}
 options={sourceDay:220,mealId:'product',targets:[{day:227,slot:1}]};r=C.previewMealCopy(options);await C.copyMeals(options,r.token,{'227:1':'copy'});const cm=C.mealsOf(C.snapshot().days[227])[0];eq(cm.product,product.product,'product lost');eq(cm.foods,product.foods,'toppings lost');ok(cm.actualIntake==='','zero copied');
 options={sourceDay:220,mealId:'all',targets:[{day:228},{day:229}]};r=C.previewMealCopy(options);await C.copyMeals(options,r.token,Object.fromEntries(r.rows.map(r=>[r.key,'copy'])));ok(C.mealsOf(C.snapshot().days[228]).length===3,'all meals');
 r=C.previewMealCopy(options);await C.saveMeal(229,C.mealsOf(C.snapshot().days[229])[0].id,{...C.mealsOf(C.snapshot().days[229])[0],actualIntake:1});let stale=false;try{await C.copyMeals(options,r.token,{'229:1':'replace'})}catch(e){stale=true}ok(stale,'stale review');
 const backup=C.backup(),saved=C.snapshot();await C.restore(JSON.parse(backup),'replace');for(const key of ['days','cubes','cubeUsages','cubeChanges','ingredients','preferences'])eq(C.snapshot()[key],saved[key],'restore '+key);
 return {checks:'homemade,commercial,remapped slot,whole day,multiple dates,skip,replace,0g protection,cube protection,memo protection,unique IDs,stale review,backup/restore PASS',source:before.days[220],state:C.snapshot()};
 }''')
 page.reload();page.wait_for_selector('.week-date')
 assert page.locator('.meal-toolbar [data-action="copy-meal"]').count()==0
 assert page.locator('.daily-heading [data-action="copy-meal"]').count()==1
 # Same day, different meal allowed; self-copy remains blocked in the shared core.
 page.evaluate('''async()=>{const C=PlannerCore,o={sourceDay:227,mealId:C.mealsOf(C.snapshot().days[227])[0].id,targets:[{day:227,slot:2}]};let r=C.previewMealCopy(o);await C.copyMeals(o,r.token,{'227:2':'copy'});if(C.mealsOf(C.snapshot().days[227]).length!==2)throw Error('same day copy');o.targets[0].slot=1;if(C.previewMealCopy(o).rows[0].status!=='protected')throw Error('self copy');}''')
 page.click('[data-action="copy-meal"]')
 assert page.locator('#copyReview').count()==0
 page.fill('#copySourceDate','2026-12-01');assert page.locator('#saveSheet').is_disabled();assert '등록된 식단이 없어요' in page.locator('#copySource').inner_text()
 page.fill('#copySourceDate','2026-10-31');page.select_option('#copyScope','product')
 page.locator('[data-copy-date]').fill('2026-11-20');page.locator('[data-copy-slot]').select_option('1')
 page.click('#copyAddDate');page.locator('[data-copy-date]').nth(1).fill('2026-11-21');page.locator('[data-copy-slot]').nth(1).select_option('2')
 assert page.locator('#saveSheet').is_enabled()
 page.click('#saveSheet');page.wait_for_function('document.querySelector("#sheetTitle").textContent==="복사 완료"')
 assert page.locator('[data-copy-open]').count()==2
 page.click('[data-copy-open="240"]');page.wait_for_function('!document.querySelector("#sheet").open')
 assert '11월 20일 식단' in page.locator('.daily-title').inner_text()
 assert page.evaluate('PlannerCore.mealsOf(PlannerCore.snapshot().days[241])[0].slot')==2
 # Snack and whole-day copy retain meal composition but never feeding records.
 page.evaluate('''async()=>{const C=PlannerCore;await C.saveMeal(220,'snack-test',{slot:4,type:'snack',kind:'homemade',foods:[{name:'배',g:20}],actualIntake:10,memo:'먹은 기록'});let o={sourceDay:220,mealId:'all',targets:[{day:250}]},r=C.previewMealCopy(o);await C.copyMeals(o,r.token,Object.fromEntries(r.rows.map(x=>[x.key,'copy'])));const ms=C.mealsOf(C.snapshot().days[250]);if(ms.length!==4||ms[3].type!=='snack'||ms[3].actualIntake!==''||ms[3].memo)throw Error('snack/day copy');}''')
 # Monthly access and no-write cancel.
 page.click('[data-view="month"]');page.click('[data-action="copy-meal"]')
 before=page.evaluate('PlannerCore.snapshot()');page.click('#cancelSheet');assert before==page.evaluate('PlannerCore.snapshot()')
 page.click('[data-view="week"]')
 for width in [320,375,390,430]:
  page.set_viewport_size({'width':width,'height':844});page.reload();page.wait_for_selector('.week-date')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  box=page.locator('.daily-title').bounding_box();button=page.locator('.meal-copy-launch').bounding_box();assert box['x']+box['width']<=button['x']
  page.click('[data-action="copy-meal"]')
  assert page.locator('#copySourceDate').input_value()=='2026-10-31'
  assert page.locator('#saveSheet').bounding_box()['y']<844
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'/tmp/copy-ux-{width}.png')
  page.set_viewport_size({'width':width,'height':500});page.locator('[data-copy-date]').focus()
  assert page.locator('#saveSheet').bounding_box()['y']+page.locator('#saveSheet').bounding_box()['height']<=500
  page.click('#cancelSheet');page.set_viewport_size({'width':width,'height':844})
 # Protected target and explicit replacement are visible in the actual sheet.
 page.click('[data-action="copy-meal"]');page.locator('[data-copy-date]').fill('2026-11-02');page.locator('[data-copy-slot]').select_option('2')
 assert '교체할 수 없어요' in page.locator('#copyReviewResult').inner_text();assert page.locator('#saveSheet').is_disabled()
 page.locator('[data-copy-date]').fill('2026-11-01');assert '이미 식단이 등록' in page.locator('#copyReviewResult').inner_text();assert page.locator('#saveSheet').is_disabled()
 page.select_option('[data-copy-choice]','replace');page.click('#saveSheet');page.wait_for_function('document.querySelector("#sheetTitle").textContent==="복사 완료"')
 assert any('교체할까요' in d for d in dialogs)
 page.click('#cancelSheet')
 print('PASS copy core protection, source change/empty, multi-date per-slot, same-day, monthly access, cancel, destination navigation, 4 widths and reduced viewport')
 # Deterministic weekly fixture: ingredient counts vs meal counts, snacks included, 0g excluded.
 page.evaluate('''async()=>{const C=PlannerCore,m=(id,slot,names,actualIntake,type='meal')=>({id,slot,type,foods:names.map(name=>({name,g:10})),actualIntake}),d=ms=>({foods:ms[0].foods,actualIntake:ms[0].actualIntake,meals:ms,v3Multi:true});await C.restore({schemaVersion:5,birthday:'2026-03-26',babyName:'요약 검증',startDay:180,days:{220:d([m('a',1,['쌀','소고기','당근'],20),m('b',2,['쌀','두부','사과'],20)]),221:d([m('c',4,['사과','쌀'],10,'snack'),m('z',1,['브로콜리'],0),m('u',2,['시금치'],'')])},cubes:[],cubeUsages:[],cubeChanges:[],ingredients:[],preferences:{}},'replace');}''')
 page.reload();page.wait_for_selector('.week-date');page.evaluate("PlannerIngredientStats.handle('today',null,'2026-10-31')")
 page.click('#moreButton');page.click('#moreMenu [data-page="stats"]');page.click('[data-analysis-tab="ingredient"]')
 for category,count,records,name,times in [('all',5,3,'쌀',3),('grain',1,3,'쌀',3),('protein',2,2,'두부',1),('vegetable',1,1,'당근',1),('fruit',1,2,'사과',2),('allergen',1,1,'두부',1)]:
  page.click('[data-istats="filter"][data-value="'+category+'"]')
  kpi=page.locator('.ingredient-summary strong').all_text_contents()
  assert kpi==[str(count)+'종',str(records)+'끼',name+' '+str(times)+'회'],(category,kpi)
  assert name+' · '+str(times)+'회' in page.locator('.ingredient-week-summary').inner_text()
  assert page.locator('.ingredient-week-summary').bounding_box()['y']<page.locator('.ingredient-bars').bounding_box()['y']
  assert page.locator('.ingredient-method').bounding_box()['y']>page.locator('.ingredient-bars').bounding_box()['y']
 for width in [320,375,390,430]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/summary-ux-{width}.png')
 page.click('[data-istats="next"]');assert '없어요' in page.locator('.ingredient-week-summary').inner_text();assert page.locator('.ingredient-summary strong').all_text_contents()==['0종','0끼','0건']
 page.click('[data-istats="prev"]');assert '두부 · 1회' in page.locator('.ingredient-week-summary').inner_text()
 assert not errors,errors
 print('PASS all 6 filters: KPI/summary/list consistency, non-duplicated meals, week navigation, empty period, summary order and mobile layout')
 b.close()
