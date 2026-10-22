import assert from 'node:assert/strict';
import { PHYSICS_STEP as dt, contact, pose, resolveVehicles } from '../src/collisions.js';
import { pathPoint, heading, roadHalfWidth } from '../src/route.js';
const straight={point:(s,lane)=>({x:lane,z:-s}),heading:()=>0,halfWidth:()=>7.2};
const real={point:pathPoint,heading,halfWidth:roadHalfWidth};
function depth(bodies,route){let max=0;for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)max=Math.max(max,contact(pose(bodies[i],route),pose(bodies[j],route))?.depth||0);return max;}
function body(s,lane,speed=0,extra={}){return{s,lane,speed,halfLength:2.5,halfWidth:1.2,...extra};}
const results=[];
function simulate(name,bodies,route,seconds=4,movement=()=>{}){let max=0,touched=false;for(let i=0;i<seconds/dt;i++){for(const b of bodies)b.s+=b.speed*dt;movement(bodies,dt);touched=resolveVehicles(bodies,route).size>0||touched;max=Math.max(max,depth(bodies,route));}assert.ok(max<.002,`${name}: residual penetration ${max}`);assert.ok(touched,`${name}: must exercise a contact`);results.push({name,maxPenetrationMeters:max,contacts:touched});}
simulate('boost-speed rear-end', [body(0,0,94),body(15,0,18)],straight);
simulate('side squeeze against curb',[body(10,4.5,25),body(10,6,25)],straight,2,b=>b[0].lane+=.03);
simulate('five-car chain',[0,5.1,10.2,15.3,20.4].map((s,i)=>body(s,0,i===0?94:0)),straight,5);
simulate('drifting rotated bodies',[body(10,0,34,{yaw:.38}),body(15,1.2,20,{yaw:-.1})],straight);
simulate('real Tokyo tight junction',[body(750,0,35),body(755,0,14)],real,2);
simulate('collision cannot be bypassed by feedback cooldown',[body(10,0,94,{collisionCooldown:999}),body(14,0,15,{collisionCooldown:999})],straight);
// Same elapsed simulation, different render batching: no frame-rate-dependent tunnelling.
for(const fps of [20,30,60,120]){const cars=[body(0,0,94),body(12,0,0)];let acc=0;for(let f=0;f<fps*2;f++){acc+=1/fps;while(acc+1e-10>=dt){cars.forEach(c=>c.s+=c.speed*dt);resolveVehicles(cars,straight);acc-=dt;assert.ok(depth(cars,straight)<.002);}}assert.ok(cars[0].s<cars[1].s);}
console.log(JSON.stringify({passed:true,physicsHz:120,results,renderRates:[20,30,60,120]},null,2));
