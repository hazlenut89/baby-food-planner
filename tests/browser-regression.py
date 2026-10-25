from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8001/v3/',wait_until='domcontentloaded');page.wait_for_function('window.PlannerCore')
 result=page.evaluate('''async()=>{
 const C=PlannerCore,check=(x,m)=>{if(!x)throw Error(m)},passed=[];await C.load();
 await C.settings({babyName:'회귀검증',birthday:'2026-01-01',startDay:180,stage:'middle',mealsPerDay:2});
 await C.saveIngredient({name:'당근',preference:'like',allergy:'none',firstTriedDay:180});
 await C.saveCube([{name:'당근',grams:10,initialQty:3,madeOn:'2026-01-01',storage:'frozen'}]);let c=C.snapshot().cubes[0];check(C.warning(c),'14-day notice');
 const record={foods:[{name:'당근',g:10}],actualIntake:8,allergy:true,slot:1};const picks=[{batchId:c.id,name:'당근',quantity:1}];
 await C.saveMeal(180,'meal-1',record,picks,'메모 보존');await C.saveMeal(180,'meal-1',record,picks,'메모 보존');check(C.snapshot().cubes[0].remainingQty===2,'duplicate deduction');passed.push('meal save/edit, no duplicate deduction');
 const before=JSON.stringify(C.snapshot().days[180]);await C.applyTemplate({stage:'middle',count:2,startDay:180,length:60,offset:1,mode:'empty'});check(JSON.stringify(C.snapshot().days[180])===before,'existing day preserved');check(C.snapshot().babyName==='회귀검증','profile preserved');passed.push('existing meal/intake/allergy/memo/profile preserved during template import');
 await C.removeCube(c.id,false);check(!C.active(C.snapshot().cubes[0]),'removed hidden');check(C.snapshot().cubeUsages[0].quantity===1,'history preserved');
 await C.saveMeal(180,'meal-1',{foods:[],actualIntake:'',slot:1},[],'메모 보존',true);check(C.snapshot().cubes[0].remainingQty===3,'inventory restored');passed.push('soft deletion preserves history; meal deletion restores stock');
 await C.saveCube([{name:'쌀',grams:10,initialQty:1,madeOn:C.todayISO(),storage:'frozen'}]);let z=C.snapshot().cubes.at(-1);await C.adjustCube(z.id,-1);check(!C.active(C.snapshot().cubes.at(-1)),'zero hidden');await C.removeCube(z.id,false);passed.push('zero inventory hidden and deletable');
 const saved=C.backup();await C.restore(JSON.parse(saved),'full');const restored=JSON.parse(C.backup()).state,original=JSON.parse(saved).state;delete restored.updatedAt;delete original.updatedAt;check(JSON.stringify(restored)===JSON.stringify(original),'backup roundtrip');passed.push('JSON backup/restore');return passed;
}''')
 print(json.dumps(result,ensure_ascii=False))
 page.reload();page.wait_for_function('window.PlannerCore');assert page.evaluate('PlannerCore.snapshot().babyName')=='회귀검증'
 page.evaluate("PlannerUI.switchTo('legacy',180)");page.wait_for_url('**/?day=180');page.wait_for_timeout(300)
 assert page.locator('#babyName').input_value()=='회귀검증'
 print('PASS reload and V3 → V1 shared profile compatibility')
 assert not errors,errors
 b.close()
