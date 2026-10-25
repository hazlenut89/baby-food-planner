from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  for route in ['/','/v3/']:
   ctx=b.new_context(viewport={'width':width,'height':700},is_mobile=True);page=ctx.new_page();page.goto('http://127.0.0.1:8001'+route,wait_until='domcontentloaded')
   if route=='/':page.evaluate('openSharedMeals(180)');page.locator('[data-edit=new]').click();root='#sharedMealDialog';field='#sharedActual'
   else:page.locator('[data-action=add]').click();page.locator('[data-action=new-meal]').click();root='#sheet';field='#mealActual'
   assert page.locator(root).evaluate('(e)=>getComputedStyle(e).position')=='static'
   assert page.locator(root).evaluate('(e)=>!e.matches(":modal")')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,route)
   assert page.locator(root+' footer').evaluate('(e)=>getComputedStyle(e).position')=='static'
   page.locator(field).fill('10');assert page.locator(field).input_value()=='10'
   print('PASS document editor',width,route);ctx.close()
 ctx=b.new_context();page=ctx.new_page();page.goto('http://127.0.0.1:8001/v3/',wait_until='domcontentloaded');page.wait_for_function('window.PlannerCore')
 print(page.evaluate('''async()=>{const C=PlannerCore;await C.load();const r={type:'snack',slot:4,foods:[{name:'콜리플라워',g:10}],actualIntake:''};let blocked=false;try{await C.saveMeal(180,'snack',r)}catch(e){blocked=true}if(!blocked)throw Error('early snack allowed');await C.settings({babyName:'',birthday:'',startDay:180,stage:'middle',mealsPerDay:2});await C.saveMeal(180,'snack',r);let i=C.snapshot().ingredients.find(i=>i.name==='콜리플라워');if(!i||i.firstTriedDay||i.allergy!=='unknown')throw Error('planned tracking');await C.saveMeal(180,'snack',{...r,actualIntake:5});i=C.snapshot().ingredients.find(i=>i.name==='콜리플라워');if(i.firstTriedDay!==180)throw Error('first intake');await C.saveMeal(180,'snack',{...r,foods:[]},[],'',true);if(C.snapshot().ingredients.find(i=>i.id===i.id).firstTriedDay!==180)throw Error('history lost');return 'PASS optional snacks, auto map, planned/actual distinction and history preservation'}'''))
 b.close()
