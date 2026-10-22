"""Rebuild the course and urban footprint snapshot from the preserved OSM XML.
Map data and derived data: © OpenStreetMap contributors, ODbL 1.0.
This closed-course racing direction is not a public-road navigation service.
"""
import xml.etree.ElementTree as ET
import json, math, heapq
from pathlib import Path

root = ET.parse('data/shiba-map.osm').getroot()
nodes = {n.get('id'): [float(n.get('lat')), float(n.get('lon'))] for n in root.findall('node')}
origin = [35.65858, 139.74543]
def xy(p): return [(p[1]-origin[1])*111320*math.cos(math.radians(origin[0])), -(p[0]-origin[0])*111320]
def distance(a,b): return math.dist(xy(a),xy(b))
roads=[]; buildings=[]; parks=[]
for w in root.findall('way'):
    tags={t.get('k'):t.get('v') for t in w.findall('tag')}
    refs=[n.get('ref') for n in w.findall('nd')]
    if not all(n in nodes for n in refs): continue
    geo=[nodes[n] for n in refs]
    if tags.get('highway') in ['primary','secondary','tertiary','unclassified','residential','primary_link','secondary_link','tertiary_link']:
        roads.append({'id':w.get('id'),'tags':tags,'nodes':refs,'geometry':geo})
    if tags.get('leisure') in ['park','garden'] and len(refs)>3:
        parks.append({'name':tags.get('name',''), 'points':[[round(x,2),round(z,2)] for x,z in map(xy,geo)]})
    if 'building' in tags and len(refs)>3:
        points=[xy(p) for p in geo]
        if any(-650<p[0]<1000 and -1000<p[1]<900 for p in points):
            try: height=float(tags.get('height','').replace(' m',''))
            except ValueError:
                try: height=float(tags.get('building:levels','5'))*3.3
                except ValueError: height=16.5
            buildings.append({'id':w.get('id'),'points':[[round(x,2),round(z,2)] for x,z in points], 'height':min(180,max(4,height)), 'name':tags.get('name',''), 'heightSource':'osm' if 'height' in tags or 'building:levels' in tags else 'estimated'})
graph={}
for r in roads:
    for a,b in zip(r['nodes'],r['nodes'][1:]):
        d=distance(nodes[a],nodes[b]);graph.setdefault(a,[]).append((b,d,r['id']));graph.setdefault(b,[]).append((a,d,r['id']))
waypoints=[(35.65983,139.74373,'東京タワー通り'),(35.65844,139.74709,'東京タワー通り'),(35.65494,139.74528,'環状三号線'),(35.65404,139.74989,'環状三号線'),(35.66460,139.75309,'日比谷通り'),(35.66600,139.74835,'新虎通り')]
def nearest(p,name):
    candidates={n for r in roads if r['tags'].get('name')==name for n in r['nodes']}
    return min(candidates, key=lambda n: distance(nodes[n],p))
snapped=[nearest(p[:2],p[2]) for p in waypoints]
route=[];ways=[]
for start,end in zip(snapped,snapped[1:]):
    queue=[(0,start)];cost={start:0};prev={}
    while queue:
        d,n=heapq.heappop(queue)
        if n==end:break
        if d>cost[n]:continue
        for other,length,wid in graph[n]:
            nd=d+length
            if nd<cost.get(other,math.inf):cost[other]=nd;prev[other]=(n,wid);heapq.heappush(queue,(nd,other))
    segment=[end];segmentways=[]
    while segment[-1]!=start:
        n,w=prev[segment[-1]];segment.append(n);segmentways.append(w)
    segment.reverse();segmentways.reverse()
    route+=segment if not route else segment[1:];ways+=segmentways
points=[xy(nodes[n]) for n in route]
length=sum(math.dist(a,b) for a,b in zip(points,points[1:]))
course={'attribution':'© OpenStreetMap contributors','license':'ODbL-1.0','source':'https://www.openstreetmap.org/api/0.6/map?bbox=139.742,35.651,139.756,35.667','retrieved':'2026-10-21','origin':origin,'waypoints':waypoints,'osmWayIds':list(dict.fromkeys(ways)),'coordinates':[nodes[n] for n in route],'points':[[round(x,3),round(z,3)] for x,z in points]}
Path('dist/assets/tokyo-course.json').write_text(json.dumps(course,ensure_ascii=False,indent=2))
urban={'attribution':course['attribution'],'license':course['license'],'buildings':buildings,'parks':parks,'roads':[{'id':r['id'],'name':r['tags'].get('name',''),'type':r['tags']['highway'],'points':[[round(x,2),round(z,2)] for x,z in map(xy,r['geometry'])]} for r in roads]}
Path('dist/assets/tokyo-blocks.json').write_text(json.dumps(urban,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'routeMeters':round(length),'points':len(points),'buildings':len(buildings),'ways':course['osmWayIds'],'snapped':[nodes[n] for n in snapped]}))
