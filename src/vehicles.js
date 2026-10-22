import * as THREE from 'three';
export function createVehicleFactory({box,materials,textBoard,glowTex,contactTexture,tireMat,glassMat,redLight,headLight}){
function shellGeometry(sections,shape){
  const vertices=[],indices=[],uv=[];
  const profile=new THREE.CatmullRomCurve3(shape.map(([x,y])=>new THREE.Vector3(x,y,0)),false,'catmullrom',.15).getPoints(40);
  const rails=profile.map(p=>new THREE.CatmullRomCurve3(sections.map(([z,w,y,h])=>new THREE.Vector3(p.x*w,y+p.y*h,z)),false,'catmullrom',.2));
  const rows=sections.length>2?32:4,n=profile.length;
  for(let i=0;i<rows;i++)rails.forEach((rail,j)=>{const p=rail.getPoint(i/(rows-1));vertices.push(p.x,p.y,p.z);uv.push(j/(n-1),i/(rows-1));});
  for(let i=0;i<rows-1;i++)for(let j=0;j<n-1;j++){const a=i*n+j;indices.push(a,a+n,a+1,a+1,a+n,a+n+1);}
  // Cap the rear and nose with triangle fans.
  for(const k of [0,rows-1])for(let j=1;j<n-2;j++){const a=k*n;indices.push(a,a+j+(k?0:1),a+j+(k?1:0));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function createCar(color=0xa6bac7,detail=true,kind='gt3'){
  const wedge=kind==='revuelto';
  const car=new THREE.Group();
  const paint=new THREE.MeshPhysicalMaterial({color,metalness:.65,roughness:.30,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.05,side:THREE.DoubleSide});
  const sections=wedge?
    [[-2.42,.75,.32,.22],[-2.16,1.02,.30,.40],[-1.4,1.02,.29,.52],[-.65,.98,.30,.54],[.65,1.03,.30,.56],[1.55,1.10,.30,.63],[2.36,.99,.37,.40]]:
    [[-2.22,.73,.33,.24],[-1.96,.97,.32,.42],[-1.35,1.01,.31,.62],[-.65,.93,.31,.53],[.6,.98,.30,.59],[1.3,1.06,.30,.72],[1.93,.99,.28,.65],[2.22,.85,.28,.57]];
  const profile=wedge?[[0,0],[-.86,0],[-1,.15],[-1,.72],[-.75,1],[0,1.02],[.75,1],[1,.72],[1,.15],[.86,0],[0,0]]:[[0,0],[-.86,0],[-1,.27],[-.97,.7],[-.81,.96],[0,1.03],[.81,.96],[.97,.7],[1,.27],[.86,0],[0,0]];
  const bodyG=shellGeometry(sections,profile);
  const body=new THREE.Mesh(bodyG,paint);car.add(body);body.castShadow=true;
  box(car,1.86,.15,4.05,0,.31,0,materials.dark);
  const cabinSections=wedge?[[-1.05,.71,.83,.02],[-.35,.68,.86,.37],[.42,.70,.86,.38],[1.0,.83,.88,.04]]:[[-1.02,.70,.85,.02],[-.52,.73,.86,.49],[.25,.72,.87,.54],[.88,.69,.89,.34],[1.54,.76,.89,.02]];
  const cabin=new THREE.Mesh(shellGeometry(cabinSections,[[0,0],[-1,0],[-.97,.55],[-.82,1],[0,1.03],[.82,1],[.97,.55],[1,0],[0,0]]),glassMat);car.add(cabin);
  const roofSections=wedge?[[-.33,.57,1.23,.025],[.42,.57,1.24,.025]]:[[-.52,.57,1.35,.025],[-.1,.60,1.43,.02],[.38,.58,1.38,.03],[.84,.54,1.24,.03]];
  car.add(new THREE.Mesh(shellGeometry(roofSections,[[-1,0],[-.9,1],[0,1.1],[.9,1],[1,0]]),paint));
  const stripe=(a,b,width,mat)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start),mesh=new THREE.Mesh(new THREE.CylinderGeometry(width,width,v.length(),8),mat);mesh.position.copy(start.addScaledVector(v,.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());car.add(mesh);return mesh;};
  for(const side of [-1,1]){
    stripe([side*.73,.89,-1.0],[side*.60,wedge?1.24:1.37,-.44],.027,paint);
    stripe([side*.59,wedge?1.24:1.39,.39],[side*.79,.91,wedge?1.05:1.53],.03,paint);
    box(car,.035,.045,1.55,side*.83,.89,.1,paint);
    box(car,.20,.09,.28,side*1.05,.99,-.68,paint);box(car,.12,.065,.06,side*1.08,.99,-.53,materials.chrome);
    box(car,.025,.025,.19,side*.96,.84,.25,materials.dark);
    box(car,.08,.07,2.5,side*1.03,.32,0,materials.dark);
    if(wedge){
      box(car,.45,.18,.07,side*.64,.46,-2.30,materials.dark);
      stripe([side*.73,.71,-2.26],[side*.51,.65,-2.35],.023,headLight);
      stripe([side*.73,.71,-2.26],[side*.86,.80,-2.12],.023,headLight);
      stripe([side*.73,.71,-2.26],[side*.93,.70,-2.15],.023,headLight);
      stripe([side*.58,.83,2.38],[side*.86,.90,2.31],.022,redLight);
      stripe([side*.58,.83,2.38],[side*.90,.75,2.32],.022,redLight);
      stripe([side*.58,.83,2.38],[side*.39,.83,2.39],.022,redLight);
      const intake=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape().moveTo(-.4,0).lineTo(.34,.12).lineTo(.43,.53).lineTo(-.24,.38).closePath()),materials.dark);intake.rotation.y=side*Math.PI/2;intake.position.set(side*1.015,.40,.53);car.add(intake);
      for(let j=0;j<5;j++)box(car,.85,.035,.09,side*.47,.95+j*.005,1.02+j*.14,materials.dark);
    }else{
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),materials.dark);lamp.scale.set(.23,.13,.31);lamp.rotation.x=-.3;lamp.position.set(side*.69,.87,-1.78);car.add(lamp);
      for(const x of [-1,1])for(const z of [-1,1]){const led=new THREE.Mesh(new THREE.SphereGeometry(.043,10,8),headLight);led.scale.set(1,.45,1.25);led.position.set(side*.69+x*.10,.985-z*.025,-1.78+z*.13);car.add(led);}
      box(car,.47,.18,.08,side*.61,.48,-2.10,materials.dark);
      stripe([side*.1,.87,2.15],[side*.79,.83,2.13],.024,redLight);
      for(let j=0;j<6;j++)box(car,.025,.025,.44,side*(.10+j*.055),1.07,1.58,materials.dark);
    }
  }
  box(car,.9,.18,.09,0,.44,wedge?-2.38:-2.13,materials.dark);
  box(car,1.82,.08,.3,0,.29,wedge?-2.3:-2.03,materials.dark);
  box(car,1.77,.21,.12,0,.46,wedge?2.35:2.13,materials.dark);
  const plate=textBoard('品川  330  /  01·48',.58,.15,'#c9c5ac','#263238');plate.position.set(0,.66,wedge?2.415:2.235);car.add(plate);
  const wheels=[];
  for(const side of [-1,1])for(const z of [-1.35,1.38]){
    const wg=new THREE.Group();wg.position.set(side*.97,.37,z);car.add(wg);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.365,.365,.25,32),tireMat);tire.rotation.z=Math.PI/2;wg.add(tire);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.265,.027,8,32),materials.chrome);ring.rotation.y=Math.PI/2;ring.position.x=side*.152;wg.add(ring);
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.242,.242,.02,24),materials.dark);disc.rotation.z=Math.PI/2;disc.position.x=side*.15;wg.add(disc);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const spoke=box(wg,.025,.045,.47,side*.175,0,0,materials.chrome);spoke.rotation.x=a;}
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.04,12),materials.chrome);hub.rotation.z=Math.PI/2;hub.position.x=side*.18;wg.add(hub);
    const brake=box(car,.04,.16,.12,side*1.12,.40,z-.18,new THREE.MeshStandardMaterial({color:0xb83021,roughness:.5}));
    wheels.push(wg);
    // A sculpted body-colored arch follows the upper half of each wheel.
    const arch=new THREE.Mesh(new THREE.TorusGeometry(.402,.018,6,24,Math.PI),paint);arch.rotation.y=Math.PI/2;arch.rotation.z=0;arch.position.set(side*.99,.37,z);car.add(arch);
  }
  if(wedge)box(car,.72,.29,.12,0,.70,2.34,materials.dark);
  const flames=[];
  for(const side of [-1,1]){
    const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(.088,.088,.10,16,1,true),materials.chrome);exhaust.rotation.x=Math.PI/2;exhaust.position.set(side*.20,wedge?.70:.38,wedge?2.36:2.17);car.add(exhaust);const inner=new THREE.Mesh(new THREE.CircleGeometry(.071,16),materials.dark);inner.position.set(side*.20,wedge?.70:.38,wedge?2.405:2.235);car.add(inner);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.13,.95,12),new THREE.MeshBasicMaterial({color:0x74ccff,transparent:true,opacity:.9}));flame.rotation.x=Math.PI/2;flame.position.set(side*.20,wedge?.70:.38,wedge?2.75:2.65);flame.visible=false;car.add(flame);flames.push(flame);
  }
  for(let i=-2;i<=2;i++)box(car,.025,.18,.47,i*.24,.29,2,materials.dark);
  if(!wedge){
    for(const side of [-1,1]){
      stripe([side*.56,1.02,1.65],[side*.56,1.44,1.47],.035,materials.dark);
      stripe([side*.56,1.44,1.47],[side*.56,1.44,1.96],.035,materials.dark);
    }
    box(car,1.93,.065,.40,0,1.44,1.99,materials.dark);
    for(const side of [-1,1])box(car,.035,.15,.43,side*.96,1.46,1.99,paint);
  }else{box(car,1.88,.07,.30,0,1.06,2.04,materials.dark);for(const side of [-1,1])box(car,.04,.14,.29,side*.82,1.01,2.03,paint);}
  car.scale.x=wedge?.97:.94;
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.2,6),new THREE.MeshBasicMaterial({map:contactTexture,color:0x000000,transparent:true,opacity:.72,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.042;car.add(shadow);
  const tailGlow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,5.8),new THREE.MeshBasicMaterial({map:glowTex,color:0xff1235,transparent:true,opacity:.38,depthWrite:false,blending:THREE.AdditiveBlending}));tailGlow.rotation.x=-Math.PI/2;tailGlow.position.set(0,.045,4.1);car.add(tailGlow);
  const frontGlow=new THREE.Mesh(new THREE.PlaneGeometry(5,18),new THREE.MeshBasicMaterial({map:glowTex,color:0x9bd6ee,transparent:true,opacity:.065,depthWrite:false,blending:THREE.AdditiveBlending}));frontGlow.rotation.x=-Math.PI/2;frontGlow.position.set(0,.046,-9);car.add(frontGlow);
  car.userData={paint,wheels,flames,tailGlow,frontGlow,kind,halfWidth:wedge?1.19:1.17,halfLength:wedge?2.49:2.30};return car;
}
return createCar;
}
