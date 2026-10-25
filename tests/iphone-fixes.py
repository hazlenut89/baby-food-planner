from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430,1200]:
  ctx=b.new_context(viewport={'width':width,'height':800});pg=ctx.new_page();pg.goto('http://127.0.0.1:8001/v3/',wait_until='domcontentloaded');pg.locator('[data-action=add]').click() if width<768 else pg.evaluate("document.querySelector('[data-action=add]').click()")
  assert pg.locator('#sheet').evaluate('(e)=>e.matches(":modal")');assert not pg.locator('.mobile-edit-route').count();pg.mouse.click(2,2);assert not pg.locator('#sheet').evaluate('(e)=>e.open')
  if width<768:
   pg.locator('[data-action=add]').click();pg.locator('[data-action=new-cube]').click();assert not pg.locator('#sheet').evaluate('(e)=>e.matches(":modal")')
   pg.locator('[name=name]').fill('당근');pg.locator('[name=grams]').fill('10');pg.locator('[name=initialQty]').fill('4');pg.locator('[data-action=add-cube-row]').click();rows=pg.locator('[data-cube-row]');assert rows.nth(1).locator('[name=grams]').input_value()=='';assert rows.nth(1).locator('[name=initialQty]').input_value()==''
   for date in pg.locator('input[type=date]').all():
    r=date.bounding_box();parent=date.locator('..').bounding_box();assert r['x']+r['width']<=parent['x']+parent['width']+1
   assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
  print('PASS bottom sheet, outside close and layout',width);ctx.close()
 ctx=b.new_context(viewport={'width':390,'height':844});pg=ctx.new_page();pg.goto('http://127.0.0.1:8001/v3/',wait_until='domcontentloaded');pg.wait_for_function('window.PlannerCore');pg.evaluate("async()=>{await PlannerCore.load();await PlannerCore.settings({babyName:'',birthday:'2026-01-01',startDay:180,stage:'middle',mealsPerDay:2})}");pg.reload(wait_until='domcontentloaded')
 pg.locator('[data-action=new-snack]').click();pg.locator('.food-name').fill('배');pg.locator('.food-grams').fill('20');pg.locator('#mealActual').fill('10');pg.locator('#saveSheet').click();pg.wait_for_timeout(200);assert not pg.locator('.mobile-edit-route').count();snack=pg.evaluate("Object.values(PlannerCore.snapshot().days).flatMap(d=>d.meals||[]).find(m=>m.type==='snack')");assert snack['actualIntake']==10
 pg.locator('[data-meal="'+snack['id']+'"]').click();pg.locator('#mealActual').fill('12');pg.locator('#saveSheet').click();pg.wait_for_timeout(200);pg.locator('[data-view=month]').click();assert '간식' in pg.locator('.month-grid').inner_text();pg.locator('[data-view=week]').click();pg.locator('[data-meal="'+snack['id']+'"]').click();pg.on('dialog',lambda d:d.accept());pg.locator('[data-action=delete-meal]').click();pg.wait_for_timeout(200);assert not pg.evaluate("Object.values(PlannerCore.snapshot().days).flatMap(d=>d.meals||[]).some(m=>m.type==='snack')");print('PASS snack UI add/edit/month/delete');b.close()
