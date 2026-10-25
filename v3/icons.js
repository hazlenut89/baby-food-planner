/* Original geometric SVG drawings. No artwork extracted from the reference poster. */
(function(){const shapes={
 milk:'<path fill="#d6e8fc" d="M8 4h16v7l5 5v16H6V11Z"/><path fill="white" d="M8 15h15v15H8Z"/><path d="M8 4l5 7h16M23 15v17"/>',
 flour:'<path fill="#f4dfbb" d="M8 4h19l-2 6 5 21H4L9 10Z"/><path d="M9 8h16M17 13v12m-4-10 4 4 4-4m-8 5 4 4 4-4"/>',
 tofu:'<path fill="#fff2d0" d="m4 12 20-6 8 7-20 7Z"/><path fill="#ffe4af" d="m4 12 8 8v12l-8-7Zm8 8 20-7v12l-20 7Z"/>',
 rice:'<path fill="#f0e6ca" d="M7 21Q7 13 13 14Q16 8 20 13Q26 12 26 21Z"/><path fill="#d1c4a1" d="M4 21h25q-1 10-12 10T4 21"/><path d="M9 24h15"/>',
 meat:'<path fill="#d78075" d="M6 14C10 3 29 7 28 18S15 30 8 27 2 20 6 14Z"/><path d="M10 13q6-5 12 1m-14 6q6 6 16-2"/><circle fill="#fff2df" cx="20" cy="18" r="3"/>',
 carrot:'<path fill="#eca169" d="m9 14 14 5L8 31Z"/><path fill="#9cac72" d="M15 14Q8 4 13 3l6 10Q22 2 26 6l-5 10"/><path d="m12 19 5 2m-7 3 3 1"/>',
 green:'<path fill="#9aac7d" d="M6 24C0 13 12 4 16 12c6-10 17-2 11 8l-10 10Z"/><path d="m16 30 2-16m-2 12-6-7m7 3 6-5"/>',
 broccoli:'<path fill="#a8b584" d="m13 21-2 10h10l-2-10Z"/><path fill="#789966" d="M9 23C0 20 2 12 9 12c0-9 14-10 16-2 10 0 10 13 2 14Z"/>',
 potato:'<path fill="#d8b57c" d="M8 7C19-1 31 9 29 21S12 33 6 25 0 13 8 7Z"/><path d="m10 11 1 1m12 6 1 1m-10 7 1-1"/>',
 cucumber:'<path fill="#9eb282" d="M9 30C-3 23 17 1 25 4s1 18-9 25Z"/><path d="m10 23 9-12m-7 5 3-5m3 12 4-6"/>',
 egg:'<path fill="#f2e8d8" d="M5 21C4 11 12 2 17 2s13 12 12 20S5 34 5 21Z"/><path d="M10 21q0 5 4 6"/>',
 apple:'<path fill="#d88e7d" d="M17 11C0 1 0 28 11 30q6-2 10 0C34 28 33 3 17 11Z"/><path fill="#91a778" d="M17 9q0-10 12-6Q29 10 17 9Z"/><path d="M17 12V6"/>',
 pumpkin:'<path fill="#e4ac6c" d="M4 13Q7 7 17 10q13-5 14 10T16 31 4 13Z"/><path d="M17 9V4m0 8q-5 8 0 17m5-16q4 7 0 14"/>',
 fish:'<path fill="#a0bac1" d="M5 18Q16 4 27 17 16 31 5 18Z"/><path fill="#a0bac1" d="m6 17-5-6v13Z"/><circle cx="23" cy="16" r="1" fill="#505b5a"/><path d="M18 10q-5 7 0 15"/>',
 banana:'<path fill="#e9cd75" d="M6 6Q13 24 28 16 22 35 9 25T6 6Z"/><path d="M11 18q7 7 13 3"/>',
 mushroom:'<path fill="#e6d8c3" d="m13 17-1 13h10l-2-13"/><path fill="#bb9c83" d="M2 19Q1 3 17 3t15 16Z"/><path d="M10 9h1m10 1h1"/>',
 bowl:'<path fill="#edcd7f" d="M4 17h26Q29 30 17 30T4 17Z"/><path d="m23 16 7-12M9 11h11m-8-5h7"/>',
 cube:'<path fill="#c5dce0" d="m17 3 14 7v17l-14 6-14-7V10Z"/><path d="m3 10 14 7 14-7M17 17v16M10 7l14 7"/>'};
shapes.peanut='<path fill="#e9bc78" d="M9 4c-6 3-5 10-1 14-4 4-2 12 4 14s10-2 11-7c6-1 11-6 9-12s-9-8-13-4C16 5 13 2 9 4Z"/><path d="m10 8 14 17M7 13l12 15M17 8l11 12M8 23l14-12M12 29l16-15"/>';
function food(name){return '<span class="food-icon" aria-hidden="true">'+PlannerFoodIcons.html(name,32)+'</span>';}
const ui={meal:'<rect x="4" y="3" width="16" height="18" rx="4"/><path d="M8 8h8M8 12h8M8 16h5"/>',cube:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M3 7l9 5v10"/>',ingredient:'<path d="M20 3C4 1 1 13 7 17S23 16 20 3ZM4 22 16 9"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3Z"/>',stats:'<path d="M4 20V10m8 10V4m8 16v-7"/>',plus:'<path d="M12 5v14M5 12h14"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',trash:'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',share:'<path d="M12 15V2m-4 4 4-4 4 4M7 10H4v12h16V10h-3"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',dots:'<circle cx="12" cy="4" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="20" r="1"/>',home:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8m-4-4h8"/>',check:'<path d="m5 12 4 4L19 6"/>'};
function emoji(name){const n=name||'';for(const [re,icon] of [[/쌀|죽|미음|오트|곡류|보리|현미/,'🍚'],[/소고기|돼지|양고기/,'🥩'],[/닭|오리/,'🍗'],[/애호박|오이/,'🥒'],[/당근/,'🥕'],[/브로콜리/,'🥦'],[/두부/,'◻️'],[/감자/,'🥔'],[/고구마/,'🍠'],[/호박/,'🎃'],[/배추|채|시금치|비타민/,'🥬'],[/토마토/,'🍅'],[/양파/,'🧅'],[/땅콩/,'🥜'],[/콩/,'🫘'],[/계란|달걀/,'🥚'],[/버섯/,'🍄'],[/연어|생선|대구/,'🐟'],[/땅콩/,'🥜'],[/우유/,'🥛'],[/사과/,'🍎'],[/배$/,'🍐'],[/바나나/,'🍌']])if(re.test(n))return icon;return '🥣';}
window.PlannerIcons={emoji,food,ui:k=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(ui[k]||ui.meal)+'</svg>'};})();
