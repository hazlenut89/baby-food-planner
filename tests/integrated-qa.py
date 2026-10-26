from playwright.sync_api import sync_playwright
import json
URL='http://127.0.0.1:8001'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Seoul',accept_downloads=True);pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto(URL+'/v3/?day=215',wait_until='domcontentloaded');pg.wait_for_function('window.PlannerCore')
 pg.evaluate('''async()=>{const C=PlannerCore;await C.load();await C.settings({babyName:'통합 QA',birthday:'2026-03-26',startDay:180,stage:'middle',mealsPerDay:2});await C.saveMeal(215,'base',{slot:1,foods:[{name:'쌀',g:60}],actualIntake:50,memo:'기존 메모'},[],'날짜 메모');await C.saveMeal(214,'old',{slot:1,foods:[{name:'당근',g:10}],actualIntake:9,allergy:true,memo:'이전 날짜'});await C.saveCube([{name:'소고기',grams:10,initialQty:5,madeOn:'2026-10-26',storage:'frozen'},{name:'배',grams:10,initialQty:4,madeOn:'2026-10-26',storage:'frozen'}]);}''');pg.reload(wait_until='domcontentloaded')
 old=pg.evaluate('JSON.stringify(PlannerCore.snapshot().days[214])');stock=pg.evaluate('JSON.stringify(PlannerCore.snapshot().cubes)');ids=pg.evaluate('PlannerCore.snapshot().cubes.map(c=>c.id)');beef,pear=ids
 pg.locator('[data-meal=base]').click()
 for _ in range(2):pg.locator('[data-pick="'+beef+'"][data-delta="1"]').click()
 pg.locator('[data-pick="'+pear+'"][data-delta="1"]').click();assert '90' in pg.locator('#draftTotal').inner_text()
 for _ in range(2):pg.locator('[data-pick="'+beef+'"][data-delta="-1"]').click()
 assert '소고기' not in pg.locator('.food-name').evaluate_all('(es)=>es.map(e=>e.value)');assert '70' in pg.locator('#draftTotal').inner_text();assert pg.evaluate('JSON.stringify(PlannerCore.snapshot().cubes)')==stock
 pg.locator('#saveSheet').click();pg.wait_for_function('!document.querySelector("#sheet").open');assert pg.evaluate('JSON.stringify(PlannerCore.snapshot().days[214])')==old
 pg.locator('[data-meal=base]').click();assert '소고기' not in pg.locator('.food-name').evaluate_all('(es)=>es.map(e=>e.value)')
 # A manually supplied amount remains after cube quantity is returned to zero.
 pg.locator('[data-action=add-food]').click();pg.locator('.food-name').last.fill('소고기');pg.locator('.food-grams').last.fill('7')
 for _ in range(2):pg.locator('[data-pick="'+beef+'"][data-delta="1"]').click()
 for _ in range(2):pg.locator('[data-pick="'+beef+'"][data-delta="-1"]').click()
 assert pg.locator('.food-grams').last.input_value()=='7';pg.locator('#saveSheet').click();pg.wait_for_function('!document.querySelector("#sheet").open');assert pg.evaluate('PlannerCore.snapshot().cubes[0].remainingQty')==5
 # Removing the only saved cube food is also savable without a zero-gram placeholder.
 pg.evaluate('''async()=>{const C=PlannerCore,c=C.snapshot().cubes[0];await C.saveMeal(215,'only',{slot:2,foods:[{name:'소고기',g:20}],actualIntake:'',memo:'남겨둘 메모'},[{batchId:c.id,name:c.name,quantity:2}]);}''');pg.reload(wait_until='domcontentloaded');pg.locator('[data-meal=only]').click()
 for _ in range(2):pg.locator('[data-pick="'+beef+'"][data-delta="-1"]').click()
 assert pg.locator('.food-row').count()==0;pg.locator('#saveSheet').click();pg.wait_for_function('!document.querySelector("#sheet").open');assert pg.evaluate('PlannerCore.snapshot().days[215].meals.find(m=>m.id==="only").foods.length')==0;assert pg.evaluate('PlannerCore.snapshot().days[215].meals.find(m=>m.id==="only").memo')=='남겨둘 메모'
 # Persisted duplicate-name rows do not identify cube provenance; preserve their total manual remainder.
 pg.evaluate('''async()=>{const C=PlannerCore,c=C.snapshot().cubes[0];await C.saveMeal(216,'split',{slot:1,foods:[{name:'소고기',g:7},{name:'소고기',g:20}],actualIntake:''},[{batchId:c.id,name:c.name,quantity:2}]);}''');pg.goto(URL+'/v3/?day=216',wait_until='domcontentloaded');pg.locator('[data-meal=split]').click()
 for _ in range(2):pg.locator('[data-pick="'+beef+'"][data-delta="-1"]').click()
 assert pg.locator('.food-grams').evaluate_all('(es)=>es.reduce((n,e)=>n+Number(e.value),0)')==7
 pg.locator('#saveSheet').click();pg.wait_for_function('!document.querySelector("#sheet").open');assert pg.evaluate('PlannerCore.snapshot().days[216].meals[0].foods.reduce((n,f)=>n+f.g,0)')==7
 pg.evaluate('''async()=>{const C=PlannerCore,c=C.snapshot().cubes[0];await C.saveMeal(217,'legacy-split',{slot:1,foods:[{name:'소고기',g:7},{name:'소고기',g:20}],actualIntake:''},[{batchId:c.id,name:c.name,quantity:2}]);}''');pg.evaluate("PlannerUI.switchTo('legacy',217)");pg.wait_for_url('**/?day=217');pg.locator('[data-edit-meal=legacy-split]').click()
 for _ in range(2):pg.locator('#sharedMealDialog [data-pick="'+beef+'"][data-delta="-1"]').click()
 assert pg.locator('#sharedFoods [name=g]').evaluate_all('(es)=>es.reduce((n,e)=>n+Number(e.value),0)')==7
 pg.locator('#sharedMealDialog [type=submit]').click();pg.wait_for_function('!document.querySelector("#sharedMealDialog").open');pg.evaluate("PlannerUI.switchTo('v3',215)");pg.wait_for_url('**/v3/?day=215')
 print('PASS cube 2→1→0, immediate total, saved/reopened removal, manual 7g preservation, other day and stock integrity')
 # Template warnings must follow actual names, not stale source text; metadata is never mutated.
 pg.evaluate('''async()=>{await PlannerCore.applyTemplate({stage:'middle',count:2,startDay:201,offset:1,length:60,mode:'empty'});}''')
 result=pg.evaluate('''()=>{const C=PlannerCore,s=C.snapshot(),before=JSON.stringify(s);const result={};for(const d of [203,205,215,221])result[d]=MealAllergens.guidance(s,d);if(before!==JSON.stringify(s))throw Error('guidance mutated state');return result;}''')
 assert any(x['name']=='밀' for x in result['203']);assert any(x['name']=='땅콩' for x in result['205']);assert not any(x['name']=='밀' for d in ['215','221'] for x in result[d])
 # Current ingredient matching works across all stages and compound/commercial ingredient fields.
 checks=pg.evaluate('''()=>{const C=PlannerCore,s=C.snapshot(),foods=['밀가루(익힌 밀 함유 재료)','땅콩버터','완숙계란','두부','우유','연어','참깨','아몬드','새우','바지락','메밀'];const r={};for(const stage of ['early','middle','late']){const x=structuredClone(s);x.v3Settings.stage=stage;x.days[300]={meals:[{id:'x',slot:1,foods:foods.map(name=>({name,g:1})),actualIntake:'',template:{allergyNote:'없는 재료 안내'}}]};r[stage]=MealAllergens.guidance(x,300).map(n=>n.name)}const x=structuredClone(s);x.days[301]={meals:[{id:'p',slot:1,kind:'commercial',product:{name:'밀 제품명은 분석하지 않음',grams:80,ingredients:[' 소고기, 애호박 ']},foods:[{name:'시판 · 밀제품',g:80,productEntry:true}],actualIntake:''}]};r.product=MealAllergens.guidance(x,301);return r;}''')
 assert all(len(checks[stage])==11 for stage in ['early','middle','late']);assert checks['product']==[]
 pg.goto(URL+'/v3/?day=203',wait_until='domcontentloaded');assert '밀 알레르기 안내' in pg.locator('#main').inner_text();assert '예시 도입 일정' not in pg.locator('#main').inner_text();assert '도입 예정' in pg.locator('.allergy-guidance').inner_text()
 pg.evaluate('''async()=>{await PlannerCore.saveIngredient({name:'밀',preference:'like',allergy:'suspected',firstTriedDay:190});}''');pg.reload(wait_until='domcontentloaded');assert '이전 섭취 기록 있음' in pg.locator('.allergy-guidance').first.inner_text();assert '의심 반응 기록' in pg.locator('#main').inner_text()
 pg.evaluate('''async()=>{const C=PlannerCore;await C.saveIngredient({...C.snapshot().ingredients.find(i=>i.name==='소고기'),name:'소고기',preference:'like',allergy:'none',firstTriedDay:180});const original=C.snapshot().ingredients.find(i=>i.name==='소고기');await C.saveMeal(290,'alias',{slot:1,foods:[{name:'소 고기',g:10},{name:'쇠고기',g:5}],actualIntake:''});const matches=C.snapshot().ingredients.filter(i=>C.foodHistoryKey(i.name)==='소고기');if(matches.length!==1||matches[0].id!==original.id||matches[0].allergy!=='none'||matches[0].firstTriedDay!==180)throw Error('alias duplicated or history overwritten');if(MealType.plannedNames({foods:[{name:'쌀',g:10}],template:{plannedNew:['밀']}},C.snapshot(),300).length)throw Error('absent planned NEW');const s=C.snapshot();s.days[300]={meals:[{id:'negative',slot:1,foods:[{name:'오트밀',g:20},{name:'땅콩버터',g:1}],actualIntake:''}]};const warnings=MealAllergens.guidance(s,300);if(warnings.some(x=>['밀','우유'].includes(x.name)))throw Error('false allergen');s.days[301]={meals:[{id:'mixed',slot:1,foods:[{name:'쌀+밀',g:20}],actualIntake:''}]};if(!MealAllergens.guidance(s,301).some(x=>x.name==='밀'))throw Error('compound wheat');await C.settings({...C.snapshot(),stage:'late',mealsPerDay:3});await C.saveMeal(302,'late',{slot:1,foods:[{name:'달걀',g:10}],actualIntake:5,memo:'후기 기록'});if(!MealAllergens.guidance(C.snapshot(),302).some(x=>x.name==='달걀'))throw Error('late guidance');}''')
 print('PASS wheat/peanut dates, 11 allergen groups across 3 stages, history precedence, commercial field boundaries, obsolete introduction text removed')
 # V1/V3 age follows selected date, including every requested navigation route.
 pg.locator('#legacyLink').click();pg.wait_for_url('**/?day=203');assert pg.locator('#v3Switch').get_attribute('aria-checked')=='true'
 for date,age in [('2026-10-24',213),('2026-10-25',214),('2026-10-26',215),('2026-11-01',221)]:
  pg.locator('#openJump').click();pg.locator('#jumpDate').fill(date);pg.locator('#jumpDateBtn').click();assert f'생후 {age}일' in pg.locator('#babyProfileSummary').inner_text()
 pg.locator('#prevWeek').click();prev=int(pg.locator('#jumpDay').input_value());assert prev<221 and f'생후 {prev}일' in pg.locator('#babyProfileSummary').inner_text();pg.locator('#nextWeek').click();nxt=int(pg.locator('#jumpDay').input_value());assert nxt>prev and f'생후 {nxt}일' in pg.locator('#babyProfileSummary').inner_text();pg.locator('.weekday').first.click();selected=pg.locator('#jumpDay').input_value();assert f'생후 {selected}일' in pg.locator('#babyProfileSummary').inner_text()
 pg.locator('#allTab').click();pg.locator('.daybtn[data-day="215"]').click();pg.wait_for_selector('#sharedMealDialog[open]');assert '생후 215일' in pg.locator('#babyProfileSummary').inner_text();pg.locator('#sharedMealDialog header [data-close]').click()
 pg.locator('#v3Switch').click();pg.wait_for_url('**/v3/?day=215');assert '생후 215일' in pg.locator('#profileLine').inner_text();assert pg.locator('#legacyLink').get_attribute('aria-checked')=='false';pg.reload(wait_until='domcontentloaded');assert '/v3/' in pg.url
 print('PASS selected age example dates, week/month/jump navigation, V1 ON/V3 OFF, UI switch and reload')
 # Deleted batches disappear from general manufacturing displays, retained in backup and usage ledger.
 before=pg.evaluate('PlannerCore.snapshot().cubeUsages');pg.evaluate('(id)=>PlannerCore.removeCube(id,false)',pear);pg.reload(wait_until='domcontentloaded');pg.evaluate("document.querySelector('[data-page=cube]').click()");pg.locator('[data-action=cube-history]').click();assert '배 ·' not in pg.locator('#sheetContent').inner_text();pg.locator('#closeSheet').click();pg.locator('#legacyLink').click();pg.wait_for_url('**/?day=215');assert not pg.locator('[data-week-cube-id="'+pear+'"]').count();assert '재고에서 삭제됨' not in pg.locator('#weekDetail').inner_text()
 pg.evaluate('''async()=>{const C=PlannerCore;await C.load();const backup=JSON.parse(C.backup());await C.restore(backup,'full');}''');assert pg.evaluate('(id)=>!!PlannerCore.snapshot().cubes.find(c=>c.id===id).cabinetRemovedAt',pear);assert pg.evaluate('PlannerCore.snapshot().cubeUsages')==before
 print('PASS deleted batch visibility V1/V3, backup/restore deletion marker and usage history')
 # Popover stays beside trigger, outside click dismisses, no independent editor is opened.
 pg.locator('#v3Switch').click();pg.wait_for_url('**/v3/?day=215')
 for width in [320,375,390,430]:
  pg.set_viewport_size({'width':width,'height':844});pg.locator('[data-action=export]').click();assert pg.locator('#exportMenu').is_visible();assert not pg.locator('.mobile-edit-route').count();r=pg.locator('#exportMenu').bounding_box();assert r['x']>=0 and r['x']+r['width']<=width;pg.locator('.page-heading h1').click();assert not pg.locator('#exportMenu').is_visible()
 pg.locator('[data-action=export]').click()
 with pg.expect_download() as d:pg.locator('[data-action=export-day]').click()
 d.value.save_as('/tmp/integrated-day.png');assert not pg.locator('#exportMenu').is_visible()
 print('PASS anchored export popover, 4 widths, outside dismiss and real PNG download')
 assert not errors,errors;b.close()
