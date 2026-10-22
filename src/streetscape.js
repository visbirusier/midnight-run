import * as THREE from 'three';
import blocks from '../dist/assets/tokyo-blocks.json' with {type:'json'};
import { END, pathPoint, heading, roadHalfWidth, closestStation, junctions } from './route.js';

export function buildStreetscape(scene, root, kit) {
 const { box, cylinder, materials: m, facadeMats, textBoard, standard, roadMat, random,glowTex }=kit;
 const batches=facadeMats.map(()=>({p:[],uv:[]}));
 const samples=[];for(let s=0;s<=END;s+=8)samples.push({s,p:pathPoint(s),w:roadHalfWidth(s)});
 function nearest(x,z){let d=Infinity,at;for(const q of samples){const v=(q.p.x-x)**2+(q.p.z-z)**2;if(v<d){d=v;at=q;}}return{distance:Math.sqrt(d),...at};}
 function polygon(points,mat,y){const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))),geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(geo,mat);mesh.position.y=y;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 // The secondary road network and parks use the same projected OSM coordinates.
 const sideRoad=roadMat.clone();sideRoad.roughness=.95;sideRoad.clearcoat=.12;
 for(const road of blocks.roads){const width=road.type==='residential'?4.5:7;for(let i=1;i<road.points.length;i++){const [x,z]=road.points[i-1],[nx,nz]=road.points[i],length=Math.hypot(nx-x,nz-z);if(length<.3||length>500)continue;box(root,width,.018,length,(x+nx)/2,.009,(z+nz)/2,sideRoad,Math.atan2(nx-x,nz-z));}}
 const parkMat=standard(0x172923,.98),bark=standard(0x29302b,.95),leaves=standard(0x253a32,.94);
 const plazaMat=standard(0x343c3f,.94);
 // Paved setbacks connect surveyed building plots to the existing sidewalks.
 for(let s=0;s<END;s+=12){for(const side of [-1,1]){
   const g=new THREE.Group();g.position.copy(pathPoint(s));g.rotation.y=heading(s);root.add(g);
   box(g,10,.08,12,side*(roadHalfWidth(s)+7.2),.035,0,plazaMat);
 }}
 function inside(x,z,pts){let yes=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 const crownGeo=new THREE.IcosahedronGeometry(1,2),treeMatrices=[];
 for(const p of blocks.parks){
  polygon(p.points,parkMat,.085);
  const xs=p.points.map(q=>q[0]),zs=p.points.map(q=>q[1]);
  for(let x=Math.min(...xs)+5;x<Math.max(...xs);x+=18)for(let z=Math.min(...zs)+5;z<Math.max(...zs);z+=18){
   if(!inside(x,z,p.points))continue;const n=nearest(x,z);if(n.distance<n.w+7||n.distance>210)continue;
   const h=random(3.8,6.8),radius=random(2,3.4);cylinder(root,.13,h,x,h/2,z,bark);
   const object=new THREE.Object3D();object.position.set(x,h,z);object.scale.set(radius,radius*.8,radius);object.updateMatrix();treeMatrices.push(object.matrix.clone());
  }
 }
 const trees=new THREE.InstancedMesh(crownGeo,leaves,treeMatrices.length);treeMatrices.forEach((matrix,i)=>trees.setMatrixAt(i,matrix));trees.receiveShadow=true;root.add(trees);
 // Footprints retain their real shape. OSM heights are used when available;
 // missing heights are deliberately estimated and documented in the data file.
 const streetFaces=[];
 blocks.buildings.forEach((b,index)=>{
   const pts=b.points.slice(0,-1);if(pts.length<3)return;
   const cx=pts.reduce((n,p)=>n+p[0],0)/pts.length,cz=pts.reduce((n,p)=>n+p[1],0)/pts.length;
   const near=nearest(cx,cz);if(near.distance>850)return;
   if(pts.some(([x,z])=>{const n=nearest(x,z);return n.distance<n.w+2;}))return;
   const batch=batches[index%facadeMats.length],h=b.height;
   const add=(v,uv)=>{batch.p.push(...v);batch.uv.push(...uv);};
   for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length],len=Math.hypot(a[0]-b[0],a[1]-b[1]);
    const ax=a[0],az=a[1],bx=b[0],bz=b[1];
    add([ax,.02,az,bx,.02,bz,ax,h,az,bx,.02,bz,bx,h,bz,ax,h,az],[0,0,len/14,0,0,h/26,len/14,0,len/14,h/26,0,h/26]);
    if(near.distance<32&&len>6&&len<38){const mx=(ax+bx)/2,mz=(az+bz)/2,n=nearest(mx,mz);if(n.distance<near.distance&&n.distance>n.w+2)streetFaces.push({x:mx,z:mz,len,h,angle:Math.atan2(bx-ax,bz-az)+Math.PI/2,s:n.s});}
   }
   const triangles=THREE.ShapeUtils.triangulateShape(pts.map(([x,z])=>new THREE.Vector2(x,z)),[]);
   for(const tri of triangles){for(const i of tri){const [x,z]=pts[i];add([x,h,z],[x/14,z/26]);}}
   if(near.distance<160&&h>14){box(root,2.4,1.6,2.8,cx,h+.8,cz,m.concrete);box(root,.08,4,.08,cx+1,h+2,cz,m.steel);}
 });
 batches.forEach((batch,i)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(batch.p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));geo.computeVertexNormals();const mat=facadeMats[i];mat.side=THREE.DoubleSide;mat.map.wrapS=mat.map.wrapT=THREE.RepeatWrapping;const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;mesh.castShadow=true;root.add(mesh);});
 const shopNames=[['珈琲 茶房','COFFEE / OPEN LATE'],['芝の食堂','SHIBA DINER'],['青葉書店','BOOKS & RECORDS'],['東京写真','PHOTO STUDIO'],['芝公園薬局','PHARMACY'],['居酒屋 灯','IZAKAYA / 02:00']];
 for(let i=0;i<streetFaces.length;i++){
  const f=streetFaces[i];if(i%2)continue;
  const g=new THREE.Group();g.position.set(f.x,0,f.z);g.rotation.y=f.angle;root.add(g);
  // Select the facade normal that points toward the street.
  const v=pathPoint(f.s).sub(g.position),normal=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),f.angle);if(v.dot(normal)<0)g.rotation.y+=Math.PI;
  const width=Math.min(f.len-.4,13),name=shopNames[i%shopNames.length];
  box(g,width,3.4,.22,0,1.72,.12,standard(i%3===0?0x555b56:0x343e42));
  for(let x=-width/2+1.3;x<width/2;x+=2.5){box(g,2.15,2.3,.14,x,1.35,.3,m.dark);box(g,2.05,.045,.03,x,2.48,.39,m.amber);box(g,.04,2.35,.04,x,1.36,.4,m.steel);}
  const sign=textBoard(name.join('  /  '),width,.72,i%3?'#162328':'#713e33','#ded2b5');sign.position.set(0,3.25,.3);g.add(sign);
  box(g,width+.4,.16,.9,0,2.87,.5,m.steel);
  if(i%8===0){const vertical=textBoard(name[0].slice(0,4),.8,3.5,'#263f47','#c4d4c9',true);vertical.position.set(-width/2,5.5,.6);g.add(vertical);}
 }
 // Human-scale details on the sidewalks: tactile paving, railings, lanterns,
 // bus shelters, utility cabinets, bins, bicycles and vending machines.
 const tactile=standard(0xa18b52,.9),vending=standard(0x9b3639,.43,.2),benchMat=standard(0x6a5541,.9);
 const people=[];const clothes=[0x3b4659,0x60594e,0x78494a,0x283d43,0xafa294].map(c=>standard(c,.88));const skin=standard(0xb18c70,.85),shoe=standard(0x171c22,.7);
 const sphere=new THREE.SphereGeometry(1,8,6),limbGeo=new THREE.CylinderGeometry(1,1,1,7),umbrellaGeo=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2);
 function person(s,side,index){
  const g=new THREE.Group(),mat=clothes[index%clothes.length],height=1.65+(index%4)*.045;
  function limb(r,l,x,y,z,material){const mesh=new THREE.Mesh(limbGeo,material);mesh.scale.set(r,l,r);mesh.position.set(x,y,z);g.add(mesh);return mesh;}
  const torso=box(g,.38,.59,.23,0,1.08,0,mat);torso.rotation.z=.025;
  const head=new THREE.Mesh(sphere,skin);head.scale.set(.13,.16,.13);head.position.y=1.57;g.add(head);
  const hair=new THREE.Mesh(sphere,shoe);hair.scale.set(.135,.085,.135);hair.position.set(0,1.67,.015);g.add(hair);
  const legs=[limb(.075,.67,-.105,.43,0,mat),limb(.075,.67,.105,.43,0,mat)];
  for(const x of [-.105,.105])box(g,.15,.1,.27,x,.09,-.045,shoe);
  const arms=[limb(.058,.58,-.25,1.08,0,mat),limb(.058,.58,.25,1.08,0,mat)];
  for(const x of [-.25,.25]){const hand=new THREE.Mesh(sphere,skin);hand.scale.set(.06,.075,.06);hand.position.set(x,.78,0);g.add(hand);}
  if(index%3!==0){const umbrella=new THREE.Mesh(umbrellaGeo,clothes[(index+2)%5]);umbrella.scale.set(.63,.23,.63);umbrella.position.set(.17,1.95,0);g.add(umbrella);limb(.012,.9,.17,1.53,0,m.steel);arms[1].rotation.x=-.65;}
  else{box(g,.24,.3,.12,-.26,.72,.08,benchMat);}
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.7,.8),new THREE.MeshBasicMaterial({color:0x000000,map:glowTex,transparent:true,opacity:.55,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;g.add(shadow);g.traverse(o=>{if(o.isMesh&&o!==shadow)o.castShadow=true;});g.scale.setScalar(height/1.75);scene.add(g);people.push({g,s,side,index,legs,arms});
 }
 for(let s=15;s<END-40;s+=21){for(const side of [-1,1]){
  const g=new THREE.Group();g.position.copy(pathPoint(s,side*(roadHalfWidth(s)+1.1),.12));g.rotation.y=heading(s);root.add(g);
  if(s%63===15){const near=closestStation(g.position.x,g.position.z);cylinder(g,.07,.95,-side*.75,.47,0,m.steel);box(g,.07,.08,5,-side*.75,.7,0,m.steel);}
  for(let z=-7;z<=7;z+=1.3)box(g,.35,.018,1.1,-side*.25,.015,z,tactile);
  if(s%105===15){
   box(g,.88,1.9,.68,side*.55,.95,0,vending);box(g,.68,1.1,.025,side*.55,1.18,.355,m.white);
   for(let x=0;x<3;x++)for(let y=0;y<4;y++)box(g,.12,.17,.03,side*.55-.23+x*.23,.82+y*.23,.38,[m.cyan,m.amber,m.pink][x]);box(g,.5,.14,.04,side*.55,.35,.38,m.dark);
   box(g,.6,1,.65,side*.5,.5,1.1,m.concrete);
  }
  if(s%147===15){cylinder(g,.16,3,side*.5,1.5,-4,bark);const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.75,1),leaves);crown.position.set(side*.5,4.2,-4);g.add(crown);box(g,.7,.4,.7,side*.5,.2,-4,m.concrete);}
  if(s%63===15){person(s+6,side,people.length);if(side>0)person(s+10,side,people.length);}
 }}
 for(const s of junctions){const g=new THREE.Group();g.position.copy(pathPoint(s-16));g.rotation.y=heading(s-16);root.add(g);const w=roadHalfWidth(s);for(let x=-w+.3;x<w;x+=1.3)box(g,.65,.018,3.6,x,.054,0,m.lane);for(const side of [-1,1]){cylinder(g,.08,5.6,side*(w+.8),2.8,-3,m.steel);box(g,2.6,.08,.09,side*(w-.4),5.5,-3,m.steel);box(g,1.1,.38,.3,side*(w-1.6),5.27,-3,m.dark);for(let i=0;i<3;i++){const l=new THREE.Mesh(new THREE.CircleGeometry(.11,12),i===0?m.cyan:standard(0x35232a));l.position.set(side*(w-1.6)+(i-1)*.32,5.27,-2.84);g.add(l);}}}
 for(const s of [165,630,1380,2140]){const g=new THREE.Group();g.position.copy(pathPoint(s,roadHalfWidth(s)+1.8));g.rotation.y=heading(s);root.add(g);box(g,1.8,.14,4,0,2.45,0,m.steel);for(const z of [-1.7,1.7])box(g,.07,2.4,.07,.75,1.2,z,m.steel);box(g,.6,.12,3,0,.65,0,benchMat);const sign=textBoard('都営バス / BUS',1,.5,'#e0d8bb','#24313a');sign.position.set(0,2.15,1.8);g.add(sign);}
 return {count:people.length,update(s,time){for(const p of people){p.g.visible=Math.abs(p.s-s)<145;if(!p.g.visible)continue;const walk=Math.sin(time*.24+p.index)*3;const d=p.s+walk;p.g.position.copy(pathPoint(d,p.side*(roadHalfWidth(d)+1.65),.14));p.g.rotation.y=heading(d)+(Math.cos(time*.24+p.index)>0?0:Math.PI);p.legs.forEach((l,i)=>l.rotation.x=Math.sin(time*3+p.index+i*Math.PI)*.28);p.arms[0].rotation.x=-Math.sin(time*3+p.index)*.2;}}};
}
