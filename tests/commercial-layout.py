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
 for w in [320,375,390,430]:
  page.set_viewport_size({'width':w,'height':844})
  brand=page.locator('[data-brand]').bounding_box()
  before=page.locator('[data-product-name]').bounding_box()
  height=page.locator('.meal-type-fields').bounding_box()['height']
  page.locator('[data-brand]').select_option('other')
  page.locator('[data-other-brand]').fill('마미포유')
  other=page.locator('[data-other-brand]').bounding_box()
  name=page.locator('[data-product-name]').bounding_box();grams=page.locator('[data-product-grams]').bounding_box()
  assert brand==other
  assert before==name and name['y']==grams['y']
  assert page.locator('.meal-type-fields').bounding_box()['height']==height
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'/tmp/other-brand-{w}.png',full_page=True)
  page.locator('[data-brand-change]').click()
  assert page.locator('[data-brand]').is_visible()
  page.locator('[data-brand]').select_option('푸드케어(클레)')
 page.locator('[data-brand]').select_option('other')
 assert page.locator('[data-other-brand]').input_value()=='마미포유'
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
 assert not foods.evaluate('(e)=>e.open') and not cubes.evaluate('(e)=>e.open')
 assert page.locator('#draftTotal').inner_text()=='165g'
 assert page.locator('[data-other-brand]').input_value()=='마미포유'
 # Cancel leaves saved quantities untouched.
 cubes.locator('summary').click()
 page.on('dialog',lambda d:d.accept())
 page.locator('[data-pick][data-delta="1"]').click()
 assert cubes.locator('summary').inner_text()=='보관 중인 큐브 · 1개 선택'
 assert '총 2개 사용' in cubes.locator('summary').get_attribute('title')
 for w in [320,375,390,430]:
  page.set_viewport_size({'width':w,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path='/tmp/accordion-open.png',full_page=True)
 page.locator('#cancelSheet').click()
 assert page.evaluate('PlannerCore.snapshot().cubes[0].remainingQty')==2
 page.locator('[data-meal=qa]').first.click()
 before=page.evaluate('JSON.stringify(PlannerCore.snapshot())')
 page.locator('[data-meal-type]').select_option('homemade')
 page.locator('.commercial-confirm [data-choice=keep]').click()
 assert foods.evaluate('(e)=>e.open') and foods.locator('summary').is_visible()
 assert foods.locator('summary').inner_text().startswith('식재료 구성')
 values=page.locator('#foodRows input').evaluate_all('(es)=>es.map(e=>e.value)')
 foods.locator('summary').click();foods.locator('summary').click()
 assert values==page.locator('#foodRows input').evaluate_all('(es)=>es.map(e=>e.value)')
 assert not cubes.evaluate('(e)=>e.open') and cubes.locator('summary').is_visible()
 page.locator('[data-meal-type]').select_option('commercial')
 assert page.locator('.commercial-confirm [data-choice=delete]').is_disabled()
 page.locator('.commercial-confirm [data-choice=keep]').click()
 assert not foods.evaluate('(e)=>e.open') and not cubes.evaluate('(e)=>e.open')
 assert page.locator('#draftTotal').inner_text()=='165g'
 page.locator('#cancelSheet').click()
 assert page.evaluate('JSON.stringify(PlannerCore.snapshot())')==before
 page.evaluate("async()=>{const C=PlannerCore,s=C.snapshot();s.cubes=[];s.cubeUsages=[];s.cubeChanges=[];await C.restore(s,'replace')}")
 page.reload();page.locator('[data-meal=qa]').first.click()
 cubes.locator('summary').click()
 page.wait_for_timeout(220)
 assert '사용할 수 있는 큐브가 없어요.' in cubes.inner_text()
 # Invalid additional ingredient must reveal its editor rather than remain hidden.
 foods.locator('summary').click()
 page.locator('.food-grams').first.fill('')
 foods.locator('summary').click()
 page.locator('#saveSheet').click()
 assert foods.evaluate('(e)=>e.open')
 assert page.locator('#sheetError').inner_text()
 # An empty homemade editor shows one draft row without writing an ingredient.
 page.locator('#cancelSheet').click()
 page.evaluate("async()=>{const C=PlannerCore;await C.saveMeal(237,'qa',{slot:1,kind:'homemade',foods:[],actualIntake:''})}")
 page.reload()
 before=page.evaluate('JSON.stringify(PlannerCore.snapshot())')
 page.locator('[data-meal=qa]').first.click()
 assert foods.evaluate('(e)=>e.open') and not cubes.evaluate('(e)=>e.open')
 assert page.locator('.food-name').count()==1 and page.locator('.food-name').input_value()==''
 assert foods.locator('summary').inner_text()=='식재료 구성'
 foods.locator('summary').click();foods.locator('summary').click()
 assert page.evaluate('JSON.stringify(PlannerCore.snapshot())')==before
 print('PASS empty homemade draft row, no automatic writes, homemade label/default and retained values')
 print('PASS incomplete extras reveal on save, cube type count distinct from quantity')
 print('PASS homemade/commercial transitions, linked cube protection, no-cube empty state')
 print('PASS equal columns at 4 widths, collapsed defaults, retained inputs/picks, saved collapsed defaults, totals, stock and cancellation')
 b.close()
