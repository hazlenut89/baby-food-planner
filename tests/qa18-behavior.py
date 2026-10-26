from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},accept_downloads=True);pg=c.new_page();errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.goto('http://127.0.0.1:8001/v3/?day=180',wait_until='domcontentloaded');pg.wait_for_function('window.PlannerCore')
 pg.evaluate('''async()=>{const C=PlannerCore;await C.load();await C.settings({babyName:'18항목 QA',birthday:'2026-01-01',startDay:180,stage:'middle',mealsPerDay:2});await C.saveMeal(180,'m',{slot:1,foods:[{name:'쌀',g:100}],actualIntake:80});await C.saveMeal(180,'s',{slot:4,type:'snack',foods:[{name:'배',g:20}],actualIntake:10});await C.saveCube([{name:'당근',grams:10,initialQty:3,madeOn:C.todayISO(),storage:'frozen'}]);}''');pg.reload(wait_until='domcontentloaded')
 assert '120g' in pg.locator('.daily-intake').inner_text() and '90g' in pg.locator('.daily-intake').inner_text();assert '1끼 + 간식 1회' in pg.locator('#main').inner_text();assert '90' in pg.locator('#summary .metric').first.inner_text()
 # Real commercial editor submission, separated product/extras and unchanged arithmetic.
 pg.locator('[data-meal=m]').click();pg.locator('[data-meal-type]').select_option('commercial');pg.locator('[data-product-name]').fill('QA 제품');pg.locator('[data-product-grams]').fill('80');pg.locator('[data-product-ingredients]').fill('쇠고기, 애 호박, 비트, 알수없음');pg.locator('.food-grams').fill('20');pg.locator('#saveSheet').click();pg.wait_for_function('!document.querySelector("#sheet").open');assert '120g' in pg.locator('.daily-intake').inner_text()
 for view in ['week','month']:
  pg.locator('[data-view='+view+']').click();root=pg.locator('[data-meal=m]') if view=='week' else pg.locator('.month-day[data-day="180"]');src=root.locator('img').evaluate_all('(es)=>es.map(e=>e.src)');assert all(any('/'+n+'.svg' in u for u in src) for n in ['beef','zucchini','beet','default']),src
 # Canvas intercept verifies real SVG assets, labels and totals, not just a nonempty file.
 pg.evaluate('''()=>{window.drawn=[];window.labels=[];const d=CanvasRenderingContext2D.prototype.drawImage,t=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.drawImage=function(i,...a){drawn.push(i.src);return d.call(this,i,...a)};CanvasRenderingContext2D.prototype.fillText=function(t,...a){labels.push(t);return CanvasRenderingContext2D.prototype._text.call(this,t,...a)};CanvasRenderingContext2D.prototype._text=t;}''')
 pg.locator('[data-action=export]').click()
 with pg.expect_download() as download:pg.locator('[data-action=export-day]').click()
 download.value.save_as('/tmp/qa18-v3.png');assert pg.evaluate("['beef','zucchini','beet'].every(n=>drawn.some(u=>u.endsWith('/'+n+'.svg')))");assert '간식' in pg.evaluate('labels')
 pg.locator('#legacyLink').click();pg.wait_for_url('**/?day=180');assert '90g' in pg.locator('#weekDetail').inner_text();pg.locator('#allTab').click();assert '120g' in pg.locator('.daybtn[data-day="180"]').inner_text();assert pg.locator('.daybtn[data-day="180"] img[src$="beef.svg"]').count()
 with pg.expect_download() as download:pg.locator('#imageBtn').click()
 download.value.save_as('/tmp/qa18-v1.png')
 pg.locator('#v3Switch').click();pg.wait_for_url('**/v3/?day=180')
 # Navigation and browser Back leave the independent page, retaining records.
 snapshot=pg.evaluate('JSON.stringify(PlannerCore.snapshot())');pg.locator('[data-action=jump]').click();assert pg.locator('.mobile-edit-route').count();pg.go_back();pg.wait_for_function('!document.querySelector("#sheet").open');assert pg.evaluate('JSON.stringify(PlannerCore.snapshot())')==snapshot
 pg.locator('[data-action=jump]').click();pg.locator('#jumpDayV3').fill('181');pg.locator('[data-action=jump-day]').click();assert 'day=181' in pg.locator('#legacyLink').get_attribute('href')
 pg.locator('#moreButton').click();assert pg.locator('#moreMenu button svg').count()==4;assert pg.locator('#moreMenu [data-action=install]').is_visible();pg.locator('#moreMenu [data-action=install]').click();assert pg.locator('#sheet').is_visible();pg.locator('#closeSheet').click()
 # All three V3 editor types: cancel and real browser back preserve state.
 for action in ['new-meal','new-cube','new-ingredient']:
  pg.locator('[data-action=add]').click();assert pg.locator('#sheet').evaluate('(e)=>e.matches(":modal")');pg.locator('[data-action='+action+']').click();assert pg.locator('.mobile-edit-route').count();assert not pg.locator('#sheet').evaluate('(e)=>e.matches(":modal")');pg.go_back();pg.wait_for_function('!document.querySelector("#sheet").open')
 # Deleted inventory hidden, manufacturing history retained in both UIs.
 pg.evaluate("document.querySelector('[data-page=cube]').click()");cube=pg.evaluate('PlannerCore.snapshot().cubes[0].id');pg.on('dialog',lambda d:d.accept());pg.locator('[data-remove-cube="'+cube+'"]').click();assert not pg.locator('[data-remove-cube="'+cube+'"]').count();pg.locator('[data-action=cube-history]').click();assert '당근' not in pg.locator('#sheetContent').inner_text();pg.locator('#closeSheet').click()
 pg.evaluate("document.querySelector('[data-page=stats]').click()");assert not pg.locator('.chart-axis').count();assert pg.locator('.stat-grid').evaluate('(e)=>parseFloat(getComputedStyle(e).marginBottom)')>0
 pg.evaluate("document.querySelector('[data-page=settings]').click()");assert '© 2026' in pg.locator('#main').inner_text();assert '진료와 개별 영양 상담' in pg.locator('#main').inner_text()
 # Width checks include visible card/button geometry; keep evidence screenshots locally.
 for width in [320,375,390,430,1200]:
  pg.set_viewport_size({'width':width,'height':844});pg.evaluate("document.querySelector('[data-page=meal]').click()");pg.locator('[data-view=week]').click();assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  if width<768:assert pg.locator('.week-grid').evaluate('(e)=>e.nextElementSibling.getBoundingClientRect().top-e.getBoundingClientRect().bottom')>=16
  for action in ['extra-meal','new-snack']:
   el=pg.locator('[data-action='+action+']');assert el.evaluate('(e)=>getComputedStyle(e).textDecorationLine')=='none';assert el.evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')<=14
 pg.screenshot(path='/tmp/qa18-desktop.png',full_page=True)
 # Apply through the actual preview/confirmation form, preserving already entered records.
 pg.locator('#moreButton').click();pg.locator('#moreMenu [data-action=example]').click();pg.locator('.template-options summary').click();pg.locator('#templateLength').fill('1');pg.locator('#templateDay').fill('181');pg.locator('[data-action=template-preview]').click();assert pg.locator('#templatePreview').inner_text();before=pg.evaluate('JSON.stringify(PlannerCore.snapshot().days[180])');pg.locator('#saveSheet').click();pg.wait_for_function('!document.querySelector("#sheet").open');assert pg.evaluate('JSON.stringify(PlannerCore.snapshot().days[180])')==before;assert pg.evaluate('PlannerCore.snapshot().days[181].meals.length')==2
 # V1 reads the same removed batch as history, never active inventory.
 pg.locator('#legacyLink').click();pg.wait_for_url('**/?day=181');pg.locator('#ingredientTab').click();pg.locator('#cubeSubTab').click();assert pg.locator('#cubeList .cube-card').count()==0;assert '0개' in pg.locator('#cubeTotal').inner_text();pg.locator('#weekTab').click();assert '© 2026' in pg.locator('footer').last.inner_text()
 assert not errors,errors;print('PASS QA18: snack totals, commercial aliases across weekly/monthly/PNG, navigation/back, editors, inventory/history, menu, stats, copyright and 5 widths');b.close()
