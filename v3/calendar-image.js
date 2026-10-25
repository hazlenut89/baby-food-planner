/* Shared canvas renderer: the download and QA use the same draw function. */
(function(g){
function draw(canvas,{days,state,mode,title,dateLabel,mealsOf,metrics,leading=0}){
 const ctx=canvas.getContext('2d'),columns=mode==='day'?1:7,width=mode==='day'?900:1960,pad=32,gap=10,cellWidth=(width-2*pad-gap*(columns-1))/columns,font=mode==='day'?25:21,line=font+10;
 ctx.font=font+'px "Apple SD Gothic Neo", "Noto Sans CJK KR", sans-serif';
 const wrap=text=>{const out=[];let part='';for(const char of String(text)){if(ctx.measureText(part+char).width>cellWidth-28){out.push(part);part='';}part+=char;}if(part)out.push(part);return out;};
 const cells=[...Array.from({length:leading},()=>null),...days.map(day=>{const lines=[];for(const m of mealsOf(state.days[day]).filter(m=>m.foods.length)){lines.push({text:m.type==='snack'?'간식':m.slot+'끼',bold:true});for(const f of m.foods)wrap(f.name+' '+f.g+'g').forEach(text=>lines.push({text}));const v=metrics([m]);wrap('계획 '+v.plan+'g · 섭취 '+(m.actualIntake===''||m.actualIntake==null?'미기록':m.actualIntake+'g')).forEach(text=>lines.push({text,muted:true}));lines.push({text:''});}if(!lines.length)lines.push({text:'기록 없음',muted:true});return {day,lines};})];
 const rows=[];for(let i=0;i<cells.length;i+=columns){const chunk=cells.slice(i,i+columns);rows.push({cells:chunk,height:Math.max(140,...chunk.map(c=>c?90+c.lines.length*line:0))});}
 canvas.width=width;canvas.height=190+rows.reduce((n,r)=>n+r.height+gap,0)+65;
 ctx.fillStyle='#fffcf5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#292929';ctx.font='bold 34px "Apple SD Gothic Neo", sans-serif';ctx.fillText(title,pad,55);ctx.font='22px "Apple SD Gothic Neo", sans-serif';ctx.fillStyle='#777269';ctx.fillText('밤송이맘 이유식 플래너 · '+({day:'선택 날짜',week:'주간',month:'월간'})[mode],pad,94);
 if(mode==='month'){ctx.fillStyle='#292929';['일','월','화','수','목','금','토'].forEach((s,i)=>ctx.fillText(s,pad+i*(cellWidth+gap)+12,145));}
 let y=170;rows.forEach(row=>{row.cells.forEach((cell,col)=>{if(!cell)return;const x=pad+col*(cellWidth+gap);ctx.fillStyle='#ffffff';ctx.fillRect(x,y,cellWidth,row.height);ctx.strokeStyle='#e6e0d2';ctx.strokeRect(x,y,cellWidth,row.height);ctx.fillStyle='#f4cd65';ctx.fillRect(x,y,cellWidth,53);ctx.fillStyle='#292929';ctx.font='bold '+font+'px "Apple SD Gothic Neo", sans-serif';ctx.fillText(dateLabel(cell.day)+' · '+cell.day+'일',x+12,y+34);let ly=y+82;cell.lines.forEach(l=>{ctx.fillStyle=l.muted?'#777269':'#292929';ctx.font=(l.bold?'bold ':'')+font+'px "Apple SD Gothic Neo", sans-serif';ctx.fillText(l.text,x+12,ly);ly+=line;});});y+=row.height+gap;});
 ctx.font='22px "Apple SD Gothic Neo", sans-serif';ctx.fillStyle='#777269';ctx.fillText('by 밤송이맘 · 우리 아기의 소중한 기록',pad,canvas.height-25);return canvas;
}
g.PlannerCalendarImage={draw};
})(typeof window==='undefined'?globalThis:window);
