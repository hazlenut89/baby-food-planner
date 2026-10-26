from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,390,430]:
  c=b.new_context(viewport={'width':width,'height':844});pg=c.new_page();pg.goto('http://127.0.0.1:8001/?day=180',wait_until='domcontentloaded');pg.wait_for_function('typeof window.openSharedMeals === "function"');pg.wait_for_timeout(150)
  pg.locator('#weekTab').focus();assert pg.locator('#weekTab').evaluate('(e)=>getComputedStyle(e).outlineColor')=='rgb(155, 124, 70)'
  baseline=pg.evaluate('JSON.stringify(localStorage)')
  for trigger,cancel in [('addIngredient','cancelIngredient'),('addCube','cancelCube')]:
   for back in [True,False]:
    pg.evaluate('(id)=>document.getElementById(id).click()',trigger);pg.wait_for_function('!document.querySelector("#mobile-editor-page").hidden');assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
    for field in pg.locator('#mobile-editor-page input[type=date]').all():
     box=field.bounding_box();assert box['x']+box['width']<=width
    if back:pg.go_back()
    else:pg.locator('#'+cancel).click()
    pg.wait_for_function('document.querySelector("#mobile-editor-page").hidden');assert 'day=180' in pg.url;assert pg.evaluate('JSON.stringify(localStorage)')==baseline
  print('PASS V1 ingredient/cube browser Back, cancel, date bounds and localStorage unchanged',width);c.close()
 b.close()
