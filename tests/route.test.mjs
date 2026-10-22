import assert from 'node:assert/strict';
import { TOKYO_TOWER } from '../src/landmarks.js';
import { START,LENGTH,END,center,pathPoint,tangent,right,curvature,elevation,roadHalfWidth,pitch } from '../src/route.js';
let maxCurvature=0,maxGrade=0,maxStepError=0,minWidth=Infinity,maxHeight=0;
for(let s=START;s<START+LENGTH;s+=2){
 const p=center(s),next=center(s+1),t=tangent(s),r=right(s),w=roadHalfWidth(s);
 assert.ok(p.toArray().every(Number.isFinite));
 assert.ok(Math.abs(t.dot(r))<1e-9,'Lateral offsets must be perpendicular to travel');
 const left=pathPoint(s,-w),rightEdge=pathPoint(s,w);
 assert.ok(Math.abs(Math.hypot(rightEdge.x-left.x,rightEdge.z-left.z)-w*2)<1e-8);
 assert.ok(w>=5.5&&w<=7.3);
 assert.ok(next.distanceTo(p)<1.03&&next.distanceTo(p)>.97,'No gaps or jumps in centerline');
 assert.ok(Math.abs(curvature(s))*(w+2.4)<1,'Inner pavement offset must not fold at a junction');
 maxCurvature=Math.max(maxCurvature,Math.abs(curvature(s)));
 maxGrade=Math.max(maxGrade,Math.abs(Math.tan(pitch(s))));
 maxStepError=Math.max(maxStepError,Math.abs(next.distanceTo(p)-1));
 minWidth=Math.min(minWidth,w*2);maxHeight=Math.max(maxHeight,elevation(s));
}
assert.ok(START+LENGTH<END);assert.ok(maxCurvature>1/100);assert.ok(LENGTH>2500&&LENGTH<2900);assert.ok(maxGrade<.11);
console.log(JSON.stringify({passed:true,raceLength:LENGTH,minRadiusMeters:1/maxCurvature,maxGradePercent:maxGrade*100,minRoadWidthMeters:minWidth,maxElevationMeters:maxHeight,maxStepErrorMeters:maxStepError},null,2));

// The landmark's entire lower perimeter must clear both road and sidewalk.
let towerClearance=Infinity;
const w=TOKYO_TOWER.baseHalfWidth*TOKYO_TOWER.horizontalScale;
for(let s=0;s<500;s++){const p=center(s);for(const side of [-1,1])for(let i=0;i<=100;i++){
 const v=-w+2*w*i/100;
 for(const [x,z] of [[side*w,v],[v,side*w]])towerClearance=Math.min(towerClearance,Math.hypot(p.x-x,p.z-z)-roadHalfWidth(s)-TOKYO_TOWER.legRadius*TOKYO_TOWER.horizontalScale);
}}
assert.ok(towerClearance>3, 'Tower legs must clear the full pavement');
console.log(JSON.stringify({towerClearanceMeters:towerClearance}));
