from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(accept_downloads=True);page=ctx.new_page();page.goto('http://127.0.0.1:8001/v3/',wait_until='domcontentloaded');page.wait_for_function('window.PlannerCore')
 page.evaluate('''async()=>{const C=PlannerCore;await C.load();await C.settings({babyName:'이미지 검증',birthday:'2026-01-01',startDay:180,stage:'middle',mealsPerDay:2});await C.saveMeal(180,'meal-1',{slot:1,foods:[{name:'브로콜리',g:10},{name:'쌀',g:20},{name:'처음보는재료',g:5}],actualIntake:30});}''')
 page.goto('http://127.0.0.1:8001/v3/?day=180',wait_until='domcontentloaded')
 counts=page.evaluate('''async()=>{let count=0;const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){count++;return original.apply(this,args)};const C=PlannerCore,canvas=document.createElement('canvas');for(const mode of ['day','week','month']){await PlannerCalendarImage.draw(canvas,{days:[180],state:C.snapshot(),mode,title:'검증',dateLabel:d=>d+'일',mealsOf:C.mealsOf,metrics:C.intakeMetrics});if(!canvas.toDataURL('image/png').startsWith('data:image/png'))throw Error('PNG failed');}CanvasRenderingContext2D.prototype.drawImage=original;return count;}''');assert counts==9,counts
 page.locator('[data-action=export]').click()
 with page.expect_download() as d:page.locator('[data-action=export-day]').click()
 d.value.save_as('/tmp/planner-v3-export.png');assert Path('/tmp/planner-v3-export.png').stat().st_size>1000
 page.evaluate("PlannerUI.switchTo('legacy',180)");page.wait_for_url('**/?day=180');page.wait_for_timeout(200)
 page.evaluate('''()=>{window.exportDraws=0;const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){exportDraws++;return draw.apply(this,args)}}''')
 with page.expect_download() as d:page.locator('#imageBtn').click()
 d.value.save_as('/tmp/planner-v1-export.png');assert Path('/tmp/planner-v1-export.png').stat().st_size>1000;assert page.evaluate('exportDraws')>=3
 print('PASS V3 day/week/month SVG draw, unknown fallback, PNG serialization; V1/V3 actual PNG downloads')
 b.close()
