"""Commercial editor layout and disclosure regression; isolated browser storage."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844})
 page.goto(os.environ.get('BASE_URL','http://127.0.0.1:8015')+'/v3/?day=237')
 page.wait_for_selector('.week-date')
 page.evaluate("""async()=>{const C=PlannerCore;await C.restore({schemaVersion:5,birthday:'2026-03-26',startDay:180,days:{},cubes:[],ingredients:[],cubeUsages:[],cubeChanges:[]},'replace');await C.saveMeal(237,'qa',{slot:1,kind:'commercial',product:{brand:'푸드케어(클레)',name:'채소죽',grams:150,ingredients:['가지']},foods:[{name:'시판 채소죽',g:150,productEntry:true}],actualIntake:''});await C.saveCube([{name:'당근',grams:10,initialQty:3,madeOn:C.todayISO(),storage:'frozen'}]);}""")
 page.reload();page.locator('[data-meal=qa]').first.click()
 foods=page.locator('.meal-extra-section').nth(0);cubes=page.locator('.meal-extra-section').nth(1)
 assert not foods.evaluate('(e)=>e.open') and not cubes.evaluate('(e)=>e.open')
 for w in [320,375,390,430]:
  page.set_viewport_size({'width':w,'height':844})
  boxes=[page.locator(x).bounding_box() for x in ['[data-meal-type]','[data-brand]','[data-product-name]','[data-product-grams]']]
  assert max(x['width'] for x in boxes)-min(x['width'] for x in boxes)<1
  assert boxes[0]['x']==boxes[2]['x'] and boxes[1]['x']==boxes[3]['x']
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'/tmp/commercial-fold-{w}.png',full_page=True)
 foods.locator('summary').click()
 page.locator('.food-name').fill('케일');page.locator('.food-grams').fill('5')
 foods.locator('summary').click()
 assert '1개' in foods.locator('summary').inner_text()
 assert page.locator('#draftTotal').inner_text()=='155g'
 cubes.locator('summary').click();page.locator('[data-pick][data-delta="1"]').click()
 cubes.locator('summary').click()
 assert '1개' in cubes.locator('summary').inner_text()
 assert page.locator('#draftTotal').inner_text()=='165g'
 assert page.evaluate('PlannerCore.snapshot().cubes[0].remainingQty')==3
 page.locator('#saveSheet').click();page.wait_for_selector('[data-meal=qa]')
 assert page.evaluate('PlannerCore.snapshot().cubes[0].remainingQty')==2
 page.locator('[data-meal=qa]').first.click()
 assert foods.evaluate('(e)=>e.open') and cubes.evaluate('(e)=>e.open')
 assert page.locator('#draftTotal').inner_text()=='165g'
 # Cancel leaves saved quantities untouched.
 page.on('dialog',lambda d:d.accept())
 page.locator('[data-pick][data-delta="1"]').click()
 page.locator('#cancelSheet').click()
 assert page.evaluate('PlannerCore.snapshot().cubes[0].remainingQty')==2
 page.locator('[data-meal=qa]').first.click()
 before=page.evaluate('JSON.stringify(PlannerCore.snapshot())')
 page.locator('[data-meal-type]').select_option('homemade')
 page.locator('.commercial-confirm [data-choice=keep]').click()
 assert foods.evaluate('(e)=>e.open') and foods.locator('summary').is_hidden()
 assert cubes.evaluate('(e)=>e.open') and cubes.locator('summary').is_hidden()
 page.locator('[data-meal-type]').select_option('commercial')
 assert page.locator('.commercial-confirm [data-choice=delete]').is_disabled()
 page.locator('.commercial-confirm [data-choice=keep]').click()
 assert foods.evaluate('(e)=>e.open') and cubes.evaluate('(e)=>e.open')
 assert page.locator('#draftTotal').inner_text()=='165g'
 page.locator('#cancelSheet').click()
 assert page.evaluate('JSON.stringify(PlannerCore.snapshot())')==before
 page.evaluate("async()=>{const C=PlannerCore,s=C.snapshot();s.cubes=[];s.cubeUsages=[];s.cubeChanges=[];await C.restore(s,'replace')}")
 page.reload();page.locator('[data-meal=qa]').first.click()
 cubes.locator('summary').click()
 assert '사용할 수 있는 큐브가 없어요.' in cubes.inner_text()
 print('PASS homemade/commercial transitions, linked cube protection, no-cube empty state')
 print('PASS equal columns at 4 widths, collapsed defaults, retained inputs/picks, saved auto-open, totals, stock and cancellation')
 b.close()
