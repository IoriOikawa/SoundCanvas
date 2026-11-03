"""Convert the pinned public-domain bunny package mesh into a local ES module.
Usage: python3 scripts/prepare-bunny.py /path/to/bunny-index.js
Source: https://github.com/mikolalysenko/bunny/tree/d70c5da8e02ee56d20ec3360e0859f37fada81ba
One Loop subdivision improves the low-resolution scan's silhouette.
"""
import json, sys, math
from pathlib import Path
lines=Path(sys.argv[1]).read_text().splitlines()
data={line.split('=')[0].split('.')[1].strip():json.loads(line.split('=',1)[1].rstrip('; ')) for line in lines}
vertices=data['positions']; faces=data.get('faces',data.get('cells'))
# Normalize around the bounding-box center, keeping Y vertical.
mins=[min(v[i]for v in vertices)for i in range(3)]
maxs=[max(v[i]for v in vertices)for i in range(3)]
scale=3.8/max(maxs[i]-mins[i]for i in range(3))
vertices=[[(v[i]-(mins[i]+maxs[i])/2)*scale for i in range(3)]for v in vertices]
neighbors=[set()for _ in vertices]; edges={}
for a,b,c in faces:
 for x,y,o in [(a,b,c),(b,c,a),(c,a,b)]:
  neighbors[x].add(y);neighbors[y].add(x)
  edges.setdefault(tuple(sorted((x,y))),[]).append(o)
new=[]
for i,v in enumerate(vertices):
 boundary=[b if a==i else a for(a,b),op in edges.items()if len(op)==1 and i in(a,b)]
 if len(boundary)==2:new.append([.75*v[k]+.125*sum(vertices[j][k]for j in boundary)for k in range(3)])
 else:
  n=len(neighbors[i]);beta=3/16 if n==3 else 3/(8*n)
  new.append([(1-n*beta)*v[k]+beta*sum(vertices[j][k]for j in neighbors[i])for k in range(3)])
edge_ids={}
for(a,b),op in edges.items():
 edge_ids[a,b]=len(new)
 if len(op)==2:new.append([.375*(vertices[a][k]+vertices[b][k])+.125*sum(vertices[j][k]for j in op)for k in range(3)])
 else:new.append([.5*(vertices[a][k]+vertices[b][k])for k in range(3)])
triangles=[]
for a,b,c in faces:
 ab=edge_ids[tuple(sorted((a,b)))];bc=edge_ids[tuple(sorted((b,c)))];ca=edge_ids[tuple(sorted((c,a)))]
 triangles.extend([(a,ab,ca),(b,bc,ab),(c,ca,bc),(ab,bc,ca)])
positions=[round(v,6)for point in new for v in point]
indices=[v for triangle in triangles for v in triangle]
text='// Stanford Bunny: Stanford Computer Graphics Laboratory.\n// Adapted from the public-domain bunny package by Mikola Lysenko.\n// Pinned source, transformation and regeneration: assets/BUNNY-NOTICE.md\n'
text+='export const BUNNY_POSITIONS = new Float32Array('+json.dumps(positions,separators=(',',':'))+');\n'
text+='export const BUNNY_INDICES = new Uint16Array('+json.dumps(indices,separators=(',',':'))+');\n'
Path('src/bunny-data.js').write_text(text)
print(f'{len(new)} vertices, {len(triangles)} triangles; {len(text)} bytes')
