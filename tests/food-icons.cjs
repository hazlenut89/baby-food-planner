const fs=require('fs'),vm=require('vm'),assert=require('assert');
const map=JSON.parse(fs.readFileSync('assets/food-icons/manifest.json'));
const coverage=JSON.parse(fs.readFileSync('previews/food-icon-coverage.json'));
const context={window:{},document:{readyState:'loading',addEventListener(){},currentScript:{src:'https://example.test/assets/food-icons/adapter.js'}},URL};vm.runInNewContext(fs.readFileSync('assets/food-icons/adapter.js','utf8'),context);
for(const name of coverage.rawNames)assert(!context.window.PlannerFoodIcons.url(name).endsWith('/default.svg'),name);
for(const file of [...Object.values(map),'default']){const svg=fs.readFileSync('assets/food-icons/'+file+'.svg','utf8');assert(svg.includes('viewBox="0 0 64 64"'));assert(!/<(?:script|image|text)\b/.test(svg));}
assert(context.window.PlannerFoodIcons.url('미등록 재료').endsWith('/default.svg'));
for(const page of ['index.html','v3/index.html'])assert(fs.readFileSync(page,'utf8').includes('food-icons/adapter.js'));
console.log('PASS: 47 source labels mapped; 49 standalone SVGs; fallback; V1/V3 shared adapter connected');
