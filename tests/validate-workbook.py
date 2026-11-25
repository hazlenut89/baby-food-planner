"""Compare built-in plans with the user-supplied workbook: python tests/validate-workbook.py PATH."""
import sys,json,re,hashlib,openpyxl
from pathlib import Path
p=Path(sys.argv[1]);w=openpyxl.load_workbook(p,data_only=True)
d=json.loads(Path('v3/middle-plan.js').read_text().removeprefix('window.MiddlePlan=').rstrip(';\n'))
assert d['sha256']==hashlib.sha256(p.read_bytes()).hexdigest()
meals=0;exceptions=[]
for count,sheet in [('2','60일_2끼기본'),('3','60일_3끼확장')]:
 rows=list(w[sheet].values)[1:];assert len(rows)==len(d['plans'][count])==60
 for r,a in zip(rows,d['plans'][count]):
  assert a['day']==r[0];assert len(a['meals'])==(3 if count=='3' and r[0]>=29 else 2)
  for m in a['meals']:
   j=(3 if count=='2' else 2)+2*(m['slot']-1)
   parsed=[re.fullmatch(r'(.+?)\s+(\d+(?:\.\d+)?)g',s.strip()) for s in r[j].split(' + ')]
   assert m['foods']==[{'name':v[1],'g':float(v[2])} for v in parsed];assert m['plan']==r[j+1]==sum(f['g'] for f in m['foods']);meals+=1
   if a['day']%2==0 and m['foods']!=d['plans'][count][a['day']-2]['meals'][m['slot']-1]['foods']:exceptions.append((count,a['day'],m['slot']))
  j=7 if count=='2' else 8
  assert [a['total'],a['allergyNote'],a['note'],a['introduction']]==[r[j],'',r[j+2],r[j+1]]
  expected=re.match(r'NEW\s*·\s*(.+?)\s+—',a['introduction'] or '');assert [n for m in a['meals'] for n in m['plannedNew']]==([{'현미':'쌀·현미죽','퀴노아':'쌀·퀴노아죽'}.get(expected[1],expected[1])] if expected else []),(count,a['day'],a['introduction'])
# The importer omits entirely empty guide rows; compare every populated cell.
for name,rows in d['guides'].items():assert rows==[list(r) for r in w[name].values if any(v is not None for v in r)],name
print(f'PASS exact workbook match: 120 days, {meals} meals, weights, introductions, {len(d["guides"])} guides')
print('Workbook-defined two-day exceptions (retained exactly):',exceptions)
