const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('v3/middle-plan.js','utf8'),sandbox);
const data=sandbox.window.MiddlePlan;
// Regression baseline of the approved committed plan, NOT a substitute for workbook comparison.
// Covers every day/slot/name/gram/major-protein combination without rewriting meal data.
assert.equal(crypto.createHash('sha256').update(JSON.stringify(data.plans)).digest('hex'),'05bc3da69919282ab762850445a489a2e1e14e7019b02183a315d6d4b8b20a4d','approved meal contents changed');
const initial=['쌀','오트밀','소고기','애호박','청경채','브로콜리','양배추','시금치','당근','단호박','감자','오이','배추','고구마','달걀'];
// History/allergen identity is separate from the displayed ingredient name.
const canonical=n=>n==='밀가루'?'밀':n.includes('땅콩')?'땅콩':n.replace('완숙계란','달걀');
const expected={1:'닭고기',3:'밀가루',5:'땅콩버터',7:'두부',9:'양파',11:'콜리플라워',13:'케일',15:'요거트',17:'대구',19:'무',21:'참깨페이스트',23:'아몬드버터',25:'연어',27:'가지',29:'토마토',31:'쌀·현미죽',33:'돼지고기',35:'아욱',39:'비트',41:'쌀·퀴노아죽',43:'완두콩',45:'배 퓌레',47:'양송이버섯',49:'사과 퓌레',51:'새송이버섯',53:'병아리콩',55:'파프리카',57:'비타민채',59:'렌틸콩'};
const vegetables=new Set('가지 감자 고구마 단호박 당근 무 배추 브로콜리 비타민채 비트 새송이버섯 시금치 아욱 애호박 양배추 양송이버섯 양파 오이 청경채 케일 콜리플라워 토마토 파프리카'.split(' '));
const roots=new Set('감자 고구마 무 비트 당근'.split(' '));
// Conservative planning groups, not claims of medically forbidden pairings.
const nitrate=new Set('시금치 비트 청경채 배추 아욱 비타민채'.split(' '));
const report={};
for(const [count,rows] of Object.entries(data.plans)){
 assert.equal(rows.length,60);const intro={},duplicateVegetableDays=[];let fish=0,wheat=0;
 for(const r of rows){
  const newNames=r.meals.flatMap(m=>m.plannedNew);
  assert.deepEqual(Array.from(newNames),expected[r.day]?[expected[r.day]]:[],count+' NEW '+r.day);
  for(const n of newNames){assert(!initial.includes(n));assert(!intro[canonical(n)]);intro[canonical(n)]=r.day;}
 }
 rows.forEach((r,i)=>{
  assert.equal(r.day,i+1);assert.equal(r.meals.length,count==='3'&&r.day>=29?3:2);
  assert(r.meals.some(m=>m.foods.some(f=>f.name==='소고기')),'beef '+r.day);
  let dailyVeg=[];
  for(const m of r.meals){
   const names=m.foods.map(f=>f.name),set=new Set(names),where=count+'/'+r.day+'/'+m.slot;
   assert.equal(set.size,names.length,'duplicate ingredient '+where);
   assert(m.foods.every(f=>Number.isFinite(f.g)&&f.g>0));
   assert.equal(m.foods.reduce((s,f)=>s+f.g,0),m.plan,where);
   assert(names.filter(n=>vegetables.has(n)).length<=3,'vegetable limit '+where);
   assert(names.filter(n=>roots.has(n)).length<=1,'root limit '+where);
   assert(names.filter(n=>nitrate.has(n)).length<=1,'nitrate group '+where);
   for(const n of m.plannedNew){
    assert.equal(m.slot,1);assert(names.some(x=>canonical(x)===canonical(n)));
    assert(!r.meals.filter(x=>x.slot!==1).some(x=>x.foods.some(f=>canonical(f.name)===canonical(n))),'same-day new exposure '+where);
   }
   for(const f of m.foods){
    const n=canonical(f.name);if(intro[n])assert(r.day>=intro[n],'early exposure '+where+' '+n);
    if(/연어|대구|가자미|명태|흰살생선/.test(n))fish++;
    if(f.name==='밀가루')wheat++;assert.notEqual(f.name,'밀','display name');
    if(vegetables.has(f.name))dailyVeg.push(f.name);
   }
  }
  assert.equal(r.meals.reduce((s,m)=>s+m.plan,0),r.total);
  if(new Set(dailyVeg).size!==dailyVeg.length)duplicateVegetableDays.push(r.day);
 });
 assert.equal(duplicateVegetableDays.length,0,'daily duplicate vegetables');
 assert.equal(wheat,8,'wheat appearance count');
 report[count]={days:60,meals:rows.reduce((n,r)=>n+r.meals.length,0),wheat,fish,duplicateVegetableDays,checks:'PASS'};
}
for(let i=0;i<60;i++)assert.equal(JSON.stringify(data.plans['2'][i].meals),JSON.stringify(data.plans['3'][i].meals.slice(0,2)),'shared '+(i+1));
console.log(JSON.stringify(report,null,2));
