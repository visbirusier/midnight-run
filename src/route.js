import * as THREE from 'three';
import course from '../dist/assets/tokyo-course.json' with { type: 'json' };

// OSM survey coordinates in metres. Small junction fillets keep a closed racing
// course drivable; elevations and street widths are approximations, not a survey.
function simplify(points, tolerance=5) {
 if(points.length<3)return points;
 const a=points[0],b=points.at(-1),ab=b.clone().sub(a),length=ab.lengthSq();let far=0,index=0;
 for(let i=1;i<points.length-1;i++){const t=THREE.MathUtils.clamp(points[i].clone().sub(a).dot(ab)/length,0,1);const d=points[i].distanceTo(a.clone().addScaledVector(ab,t));if(d>far){far=d;index=i;}}
 return far>tolerance?[...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)]:[a,b];
}
let controls=simplify(course.points.map(([x,z])=>new THREE.Vector3(x,0,z)));
// Merge short survey kinks before tight junctions so the inner road edge
// cannot fold back on itself after widening the closed course.
controls=controls.filter((p,i,a)=>{
 if(i<1||i>a.length-3)return true;
 const incoming=p.clone().sub(a[i-1]).normalize(),out=a[i+1].clone().sub(p).normalize(),next=a[i+2].clone().sub(a[i+1]).normalize();
 return !(p.distanceTo(a[i+1])<60&&incoming.angleTo(out)<.45&&out.angleTo(next)>1.6);
});
const curve=new THREE.CurvePath();let last=controls[0];
for(let i=1;i<controls.length-1;i++){
 const p=controls[i],a=controls[i-1],b=controls[i+1],cut=Math.min(30,p.distanceTo(a)*.46,p.distanceTo(b)*.46);
 const enter=p.clone().lerp(a,cut/p.distanceTo(a)),exit=p.clone().lerp(b,cut/p.distanceTo(b));
 if(last.distanceTo(enter)>.001)curve.add(new THREE.LineCurve3(last,enter));
 curve.add(new THREE.QuadraticBezierCurve3(enter,p,exit));last=exit;
}
curve.add(new THREE.LineCurve3(last,controls.at(-1)));curve.arcLengthDivisions=16000;
export const END=Math.floor(curve.getLength())-2,START=45,LENGTH=END-START-70;
const points=Array.from({length:END+3},(_,i)=>curve.getPointAt(Math.min(i/curve.getLength(),1)));
export const elevation=()=>0;
export function center(s){const v=THREE.MathUtils.clamp(s,0,END),i=Math.floor(v),p=points[i].clone().lerp(points[i+1],v-i);if(s<0)p.addScaledVector(tangent(0),s);if(s>END)p.addScaledVector(tangent(END),s-END);return p;}
export function tangent(s){const v=THREE.MathUtils.clamp(s,1,END-1),a=points[Math.floor(v-1)],b=points[Math.ceil(v+1)];return b.clone().sub(a).normalize();}
export function heading(s){const t=tangent(s);return -Math.atan2(t.x,-t.z);}
export const pitch=()=>0,bank=()=>0;
export function curvature(s){let d=heading(s+2)-heading(s-2);while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d/4;}
export function right(s){const h=heading(s);return new THREE.Vector3(Math.cos(h),0,-Math.sin(h));}
export function pathPoint(s,lane=0,height=0){return center(s).addScaledVector(right(s),lane).add(new THREE.Vector3(0,height,0));}
export function closestStation(x,z){let best=Infinity,station=0;for(let i=0;i<=END;i+=3){const d=(points[i].x-x)**2+(points[i].z-z)**2;if(d<best){best=d;station=i;}}return{station,distance:Math.sqrt(best)};}
const at=(lat,lon)=>closestStation((lon-course.origin[1])*111320*Math.cos(course.origin[0]*Math.PI/180),-(lat-course.origin[0])*111320).station;
export const junctions=[at(35.6584382,139.747091),at(35.65494,139.7452823),at(35.6540421,139.7498879),at(35.66099,139.75139),at(35.66460,139.75309)];
export function roadHalfWidth(s){const u=THREE.MathUtils.clamp((s-junctions[0]+50)/45,0,1);return 5.6+1.6*u*u*(3-2*u);}
export const districts=[
 {from:0,to:junctions[0],label:'東京タワー通り',short:'TOKYO TOWER ST.'},
 {from:junctions[0],to:junctions[1],label:'赤羽橋 / 祝田通り',short:'AKABANEBASHI'},
 {from:junctions[1],to:junctions[2],label:'芝公園 / 環状三号線',short:'SHIBA PARK'},
 {from:junctions[2],to:junctions[3],label:'日比谷通り',short:'HIBIYA-DORI'},
 {from:junctions[3],to:junctions[4],label:'御成門 / 日比谷通り',short:'ONARIMON'},
 {from:junctions[4],to:END+1,label:'愛宕 / 新虎通り',short:'ATAGO FINISH'}
];
export const districtAt=s=>districts.find(d=>s>=d.from&&s<d.to)||districts.at(-1);
