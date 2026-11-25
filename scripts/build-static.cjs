/* Explicit runtime allowlist: development files never enter the deploy artifact. */
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../dist'),root=path.resolve(__dirname,'..');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const files=['apple-touch-icon.png','backup-ui.js','editor-viewport.css','editor-viewport.js','icon-192.png','icon-512.png','index.html','legacy-meals.css','legacy-meals.js','manifest.webmanifest','meal-type.js','sw.js','ui-choice.js'];
for(const name of [...files,'assets','v3'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true,filter:src=>!['preview.html','audit.csv'].includes(path.basename(src))});
console.log('Static runtime artifact: dist (tests, reports, previews and scripts excluded)');
