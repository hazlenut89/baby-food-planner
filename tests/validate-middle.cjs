const fs=require('fs'),vm=require('vm'),assert=require('assert');const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('v3/middle-plan.js','utf8'),sandbox);const data=sandbox.window.MiddlePlan;
const initial=['쌀','오트밀','소고기','애호박','청경채','브로콜리','양배추','시금치','당근','단호박','감자','오이','배추','고구마','달걀'];
const canonical=n=>n.includes('밀가루')?'밀':n.includes('땅콩')?'땅콩':n.replace('완숙계란','달걀');
let ingredients=new Set(initial),report={};
for(const [count,rows] of Object.entries(data.plans)){
 assert.equal(rows.length,60);const intro={};let duplicateVegetables=[],fish=0,early=[];
 for(const r of rows)for(const m of r.meals)for(const n of m.plannedNew){assert(!initial.includes(n));intro[n]=r.day;}
 for(const [d,n] of Object.entries({1:'닭고기',3:'밀',5:'땅콩',7:'두부',9:'양파',11:'콜리플라워',13:'케일'}))assert.equal(intro[n],+d);
 rows.forEach((r,i)=>{assert.equal(r.day,i+1);assert.equal(r.meals.length,count==='3'&&r.day>=29?3:2);let vegetables=[];
 for(const m of r.meals){assert.equal(m.foods.reduce((s,f)=>s+f.g,0),m.plan);for(const n of m.plannedNew){assert.equal(m.slot,1);assert(m.foods.some(f=>canonical(f.name)===n));}
 for(const f of m.foods){const n=canonical(f.name);for(const part of ({'쌀죽':['쌀'],'오트밀죽':['오트밀'],'쌀오트밀죽':['쌀','오트밀'],'퀴노아쌀죽':['퀴노아','쌀']}[n]||[n]))ingredients.add(part);if(intro[n]&&r.day<intro[n])early.push([r.day,n]);if(/연어|대구|가자미|명태|흰살생선/.test(n))fish++;if(/브로콜리|양배추|청경채|애호박|당근|시금치|단호박|양파|케일|콜리플라워|비트|무$|가지|오이|배추|아욱|근대|연근|버섯/.test(n))vegetables.push(n);}}
 assert.equal(r.meals.reduce((s,m)=>s+m.plan,0),r.total);if(new Set(vegetables).size!==vegetables.length)duplicateVegetables.push(r.day);
 });assert.equal(early.length,0);report[count]={days:60,weights:'PASS',introductions:'PASS',firstMeal:'PASS',initialNewDuplicates:'PASS',beforeIntroduction:early,duplicateVegetableDays:duplicateVegetables,fishServings:fish};
}
fs.writeFileSync('previews/ingredients.json',JSON.stringify([...ingredients].sort(),null,2));fs.writeFileSync('previews/plan-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
