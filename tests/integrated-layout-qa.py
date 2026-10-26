from playwright.sync_api import sync_playwright
URL='http://127.0.0.1:8001'
def dates_fit(pg,root):
 for el in pg.locator(root+' input[type=date]').all():
  if not el.is_visible():continue
  box=el.bounding_box();parent=el.locator('..').bounding_box();assert box['width']>0 and box['x']>=parent['x']-1 and box['x']+box['width']<=parent['x']+parent['width']+1
 assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  c=b.new_context(viewport={'width':width,'height':844});pg=c.new_page();pg.goto(URL+'/v3/?day=215',wait_until='domcontentloaded');pg.wait_for_function('window.PlannerCore');pg.evaluate('''async()=>{const C=PlannerCore;await C.load();await C.settings({babyName:'모바일 QA',birthday:'2026-03-26',startDay:180,stage:'middle',mealsPerDay:2});await C.saveMeal(215,'m',{slot:1,foods:[{name:'쌀',g:60}],actualIntake:50,memo:'끼니 메모'});await C.saveMeal(215,'snack-record',{slot:4,type:'snack',foods:[{name:'배',g:10}],actualIntake:5,memo:'간식 메모'});}''');pg.reload(wait_until='domcontentloaded');assert '간식 메모' in pg.locator('[data-meal=snack-record]').inner_text()
  for view in ['week','month']:
   pg.locator('[data-view='+view+']').click();el=pg.locator('.week-grid' if view=='week' else '.month-panel');assert el.evaluate('(e)=>e.nextElementSibling.getBoundingClientRect().top-e.getBoundingClientRect().bottom')>=16
  for action in ['new-cube','new-ingredient','jump']:
   if action=='jump':pg.locator('[data-action=jump]').click()
   else:pg.locator('[data-action=add]').click();pg.locator('[data-action='+action+']').click()
   dates_fit(pg,'#sheet');assert pg.locator('.mobile-edit-route').count()==1;pg.locator('#cancelSheet').click()
  pg.evaluate("document.querySelector('[data-page=settings]').click()");dates_fit(pg,'#settingsForm');text=pg.locator('#main').inner_text();assert '© 밤송이맘. 기존' not in text and '© 2026' in text and '진료와 개별 영양 상담' in text
  pg.locator('#legacyLink').click();pg.wait_for_url('**/?day=215');pg.locator('[data-edit-meal=m]').click();pg.locator('#sharedMealDialog [data-back]').click();bar=pg.locator('#sharedMealDialog .meal-add-actions').first;buttons=bar.locator('button');assert buttons.count()==3
  boxes=[el.bounding_box() for el in buttons.all()];assert max(r['y'] for r in boxes)-min(r['y'] for r in boxes)<1
  for a,z in zip(boxes,boxes[1:]):assert a['x']+a['width']<z['x']
  assert boxes[-1]['x']+boxes[-1]['width']<=width;assert all(el.evaluate('(e)=>e.scrollWidth<=e.clientWidth') for el in buttons.all());buttons.nth(1).click();assert pg.locator('#sharedSlot').input_value()=='5';assert pg.locator('.mobile-edit-route').count()==1;pg.locator('#sharedMealDialog header [data-close]').click()
  for trigger,root,cancel in [('addCube','#mobile-editor-page','cancelCube'),('addIngredient','#mobile-editor-page','cancelIngredient'),('openJump','#jumpDialog','closeJump')]:
   pg.evaluate('(id)=>document.getElementById(id).click()',trigger);dates_fit(pg,root);pg.locator('#'+cancel).click()
  pg.screenshot(path=f'/tmp/integrated-layout-{width}.png',full_page=True);print('PASS date bounds, week/month spacing, snack memo, three aligned V1 actions and editor navigation',width);c.close()
 b.close()
