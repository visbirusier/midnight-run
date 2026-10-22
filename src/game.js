import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { START, LENGTH, END, center, pathPoint, heading, pitch, bank, curvature, right, tangent, elevation, roadHalfWidth, districtAt } from './route.js';
import { createVehicleFactory } from './vehicles.js';
import { PHYSICS_STEP, resolveVehicles, pose, contact } from './collisions.js';
import { createTokyoScene } from './tokyo-scene.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
let seed = 71298;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const random = (a,b) => a + rand() * (b-a);
const app = $('app');
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch (err) { $('loader').hidden=true; $('error').hidden=false; throw err; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.98;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setClearColor(0x101d2b);
$('world').appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x233547,.0035);
const camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.15,1700);
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.27,.45,1.15);
composer.addPass(bloom);composer.addPass(new OutputPass());

const city=createTokyoScene(scene,renderer);
const {boxGeo,unitCylinder,materials,box,cylinder,textBoard,glowTex,sky}=city;

// The ARX GT is built as a continuous, bevelled sports-car shell, with independent wheels,
// glass canopy, wing, diffuser, tail light bar, exhausts and illuminated instruments.
const contactCanvas=document.createElement('canvas');contactCanvas.width=128;contactCanvas.height=256;
const contactContext=contactCanvas.getContext('2d');contactContext.shadowColor='white';contactContext.shadowBlur=18;contactContext.fillStyle='white';contactContext.beginPath();contactContext.roundRect(20,30,88,196,24);contactContext.fill();const contactTexture=new THREE.CanvasTexture(contactCanvas);
const tireMat=new THREE.MeshStandardMaterial({color:0x080a0c,roughness:.85});
const glassMat=new THREE.MeshPhysicalMaterial({color:0x101c28,metalness:.55,roughness:.09,clearcoat:1,clearcoatRoughness:.08});
const redLight=new THREE.MeshBasicMaterial({color:new THREE.Color(0xff162c).multiplyScalar(3.5)});
const headLight=new THREE.MeshBasicMaterial({color:new THREE.Color(0xd4edff).multiplyScalar(3.2)});
const createCar=createVehicleFactory({box,materials,textBoard,glowTex,contactTexture,tireMat,glassMat,redLight,headLight});
const starter=createCar(0xc1c8bd,true,'gt3');const player=new THREE.Group();player.add(starter);player.userData=starter.userData;scene.add(player);
const rides={gt3:starter,revuelto:createCar(0xa2ae42,true,'revuelto'),ferrari:null};let selectedRide='ferrari';try{const saved=localStorage.getItem('midnight-ride');if(['ferrari','gt3','revuelto'].includes(saved))selectedRide=saved;}catch{}
const headlights=new THREE.SpotLight(0xd3e7ff,90,60,.42,.7,1.35);headlights.position.set(0,.8,-1.8);headlights.target.position.set(0,0,-35);player.add(headlights,headlights.target);
const underGlow=new THREE.PointLight(0xa3d6ed,.3,5,2);underGlow.position.set(0,.35,-.1);player.add(underGlow);
const opponents=[{name:'NOVA',color:0xd35c31,kind:'revuelto',lane:-4.4,lead:26,max:58},{name:'GHOST',color:0xc7c4bd,kind:'gt3',lane:-1.45,lead:48,max:62},{name:'KAI',color:0x335c83,kind:'revuelto',lane:4.4,lead:74,max:65}].map(o=>{o.mesh=createCar(o.color,false,o.kind);scene.add(o.mesh);o.halfWidth=o.mesh.userData.halfWidth;o.halfLength=o.mesh.userData.halfLength;return o;});
const traffic=Array.from({length:13},(_,i)=>{const mesh=createCar([0x657480,0x272c34,0x98928a,0x526673][i%4],false);mesh.scale.setScalar(.97);scene.add(mesh);return{mesh,s:START+180+i*224,halfWidth:1.17,halfLength:2.30,lane:[-4.5,-1.5,1.5,4.5][i%4],speed:random(18,29),near:false};});

// Rain follows the camera so the full course stays detailed without a large particle budget.
const rainCount=1500, rainData=new Float32Array(rainCount*6);
for(let i=0;i<rainCount;i++){const k=i*6,x=random(-45,45),y=random(0,28),z=random(-70,20);rainData.set([x,y,z,x-.08,y+.6,z+.12],k);}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainData,3));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xa6c4d8,transparent:true,opacity:.16,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
const sprayGeo=new THREE.BufferGeometry();const sprayData=new Float32Array(100*3);const sprayVel=Array.from({length:100},()=>({life:0,x:0,y:0,z:0}));sprayGeo.setAttribute('position',new THREE.BufferAttribute(sprayData,3));const spray=new THREE.Points(sprayGeo,new THREE.PointsMaterial({color:0xa0b5c2,size:.22,transparent:true,opacity:.15,depthWrite:false,map:glowTex}));spray.frustumCulled=false;scene.add(spray);

let mode='intro',previousMode='intro',speed=0,s=START,lane=2.7,steer=0,slip=0,nitro=100,elapsed=0,countdown=0,camMode=0,boosting=false,drifting=false,collisionCooldown=0,noticeTime=0,topSpeed=0,nearMisses=0,driftScore=0,quality='high',soundOn=false,pausedByBlur=false;
const keys=new Set();let best=0;try{best=Number(localStorage.getItem('midnight-run-shiba-best')||0);}catch{}
const timeFormat=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
$('best').textContent=best?timeFormat(best):'--:--.--';document.querySelector('.event-meta').innerHTML=(LENGTH/1000).toFixed(1)+' KM <b>·</b> 4 RACERS <b>·</b> REAL TOKYO STREETS';
const cameraTarget=new THREE.Vector3(),cameraDesired=new THREE.Vector3(),lookDesired=new THREE.Vector3();
let audioCtx,engineOsc,engineOsc2,engineGain,filter,windGain;
function initAudio(){
  if(audioCtx){audioCtx.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audioCtx=new AC();engineGain=audioCtx.createGain();engineGain.gain.value=0;filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=300;
  engineOsc=audioCtx.createOscillator();engineOsc.type='sawtooth';engineOsc.frequency.value=44;
  engineOsc2=audioCtx.createOscillator();engineOsc2.type='triangle';engineOsc2.frequency.value=88;engineOsc.connect(filter);engineOsc2.connect(filter);filter.connect(engineGain);engineGain.connect(audioCtx.destination);engineOsc.start();engineOsc2.start();
  const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate),data=buffer.getChannelData(0);let b=0;for(let i=0;i<data.length;i++){b=(b+(Math.random()*2-1)*.02)/1.02;data[i]=b*3.5;}const noise=audioCtx.createBufferSource();noise.buffer=buffer;noise.loop=true;windGain=audioCtx.createGain();windGain.gain.value=0;noise.connect(windGain);windGain.connect(audioCtx.destination);noise.start();
}
function setSound(value){soundOn=value;if(value)initAudio();$('sound').setAttribute('aria-pressed',String(value));$('sound').setAttribute('aria-label',value?'Mute sound':'Enable sound');$('sound').innerHTML=value?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/></svg>';}
function tone(freq=.2,duration=.1){if(!soundOn||!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(.055,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.start();o.stop(audioCtx.currentTime+duration);}
function announce(title,subtitle='',seconds=2){$('announcement').innerHTML=`${title}${subtitle?`<small>${subtitle}</small>`:''}`;$('announcement').style.opacity='1';noticeTime=seconds;}
function resetWorld(){s=START;lane=2.7;speed=0;steer=0;slip=0;nitro=100;elapsed=0;topSpeed=0;nearMisses=0;driftScore=0;collisionCooldown=0;keys.clear();opponents.forEach(o=>{o.s=START+o.lead;o.speed=0;o.finishedAt=null;});traffic.forEach((v,i)=>{v.s=START+180+i*224;v.near=false;});positionCars(0);}
function startRace(free=false){
  closeModal(false);resetWorld();app.classList.add('racing');$('race-hud').hidden=false;$('race-name').textContent=free?'FREE DRIVE':'TOKYO MIDNIGHT';$('position').parentElement.parentElement.style.visibility=free?'hidden':'visible';$('progress-label').textContent='0%';$('announcement').style.opacity=0;
  if(!soundOn)setSound(true);else initAudio();
  if(free){mode='free';$('countdown').hidden=true;announce('THE CITY IS YOURS','W / ↑ TO ACCELERATE · ESC TO PAUSE',3);}else{mode='countdown';countdown=3.5;$('countdown').hidden=false;$('countdown').innerHTML='<small>TOKYO MIDNIGHT</small>3';tone(400,.1);}
}
function backHome(){closeModal(false);mode='intro';resetWorld();$('countdown').hidden=true;$('race-hud').hidden=true;app.classList.remove('racing','boosting');$('announcement').style.opacity=0;}
function openModal(title,eyebrow,content,actions=''){if(mode!=='paused')previousMode=mode;mode='paused';keys.clear();$('modal-title').textContent=title;$('modal-eyebrow').textContent=eyebrow;$('modal-content').innerHTML=content;$('modal-actions').innerHTML=actions;$('modal').hidden=false;$('modal-close').focus();}
function closeModal(resume=true){$('modal').hidden=true;if(resume&&mode==='paused')mode=previousMode;keys.clear();pausedByBlur=false;}
function pause(){if(mode==='intro')return;if(mode==='paused'){closeModal();return;}if(mode==='finish')return;openModal('PAUSED.','THE CITY CAN WAIT','<p>Your race is right where you left it.</p>','<button class="primary" id="resume-btn"><span>BACK TO THE STREETS</span><span>↗</span></button><button class="secondary" id="restart-btn">RESTART RACE</button><button class="secondary" id="home-btn">MAIN MENU</button>');$('resume-btn').onclick=()=>closeModal();$('restart-btn').onclick=()=>startRace(previousMode==='free');$('home-btn').onclick=backHome;}
function help(){openModal('KNOW YOUR RIDE.','DRIVER HANDBOOK','<div class="controls-list"><span>Accelerate / brake</span><span><kbd>W / ↑</kbd><kbd>S / ↓</kbd></span><span>Steer</span><span><kbd>A / ←</kbd><kbd>D / →</kbd></span><span>Nitrous boost</span><span><kbd>SHIFT</kbd></span><span>Handbrake / drift</span><span><kbd>SPACE</kbd></span><span>Change camera</span><span><kbd>C</kbd></span><span>Reset your car</span><span><kbd>R</kbd></span><span>Pause / sound</span><span><kbd>ESC</kbd><kbd>M</kbd></span></div><p>Beat three rivals to the finish. Nitrous recharges when you ease off the boost. Keep it clean: traffic and barriers will slow you down. Gamepad and touch controls supported.</p>','<button class="primary" id="got-it"><span>GOT IT</span><span>↗</span></button>');$('got-it').onclick=()=>closeModal();}
function setQuality(q){quality=q;renderer.setPixelRatio(q==='high'?Math.min(devicePixelRatio,1.5):1);city.setQuality(q);bloom.enabled=q!=='performance';rain.visible=q!=='performance';resize();}
function settings(){openModal('MAKE IT YOURS.','GARAGE / SETTINGS',`<div class="setting-row"><label for="quality-select">Visual quality</label><select id="quality-select"><option value="high">Cinematic</option><option value="balanced">Balanced</option><option value="performance">Performance</option></select></div><div class="setting-row"><label for="audio-check">Engine & city audio</label><input id="audio-check" type="checkbox" ${soundOn?'checked':''}></div><div class="setting-row"><span>Body paint</span><div class="swatches"><button class="swatch" aria-label="Glacier silver" data-color="a6bac7" style="background:#a6bac7"></button><button class="swatch" aria-label="Signal yellow" data-color="d9cf54" style="background:#d9cf54"></button><button class="swatch" aria-label="Violet dusk" data-color="6e648a" style="background:#6e648a"></button><button class="swatch" aria-label="Obsidian" data-color="242930" style="background:#242930"></button></div></div><p>For the best experience, use a keyboard, turn up the sound, and go fullscreen.</p>`,'<button class="primary" id="settings-done"><span>BACK TO THE CITY</span><span>↗</span></button>');$('quality-select').value=quality;$('quality-select').onchange=e=>setQuality(e.target.value);$('audio-check').onchange=e=>setSound(e.target.checked);document.querySelectorAll('.swatch').forEach(b=>{b.onclick=()=>{player.userData.paint.color.set('#'+b.dataset.color);document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('active',x===b));};});$('settings-done').onclick=()=>closeModal();}
function finish(){
  mode='finish';const place=1+opponents.filter(o=>o.s>s).length;const record=!best||elapsed<best;if(record){best=elapsed;try{localStorage.setItem('midnight-run-shiba-best',String(best));}catch{}}$('best').textContent=timeFormat(best);tone(750,.45);
  previousMode='finish';openModal(place===1?'CITY. CONQUERED.':'SPRINT COMPLETE.',record?'NEW PERSONAL BEST':`TOKYO MIDNIGHT / FINISHED ${place}${place===2?'ND':place===3?'RD':'TH'}`,`<div class="result-stats"><div>POSITION<strong class="acid">${place} / 4</strong></div><div>TIME<strong>${timeFormat(elapsed)}</strong></div><div>TOP SPEED<strong>${Math.round(topSpeed)} <small>KM/H</small></strong></div></div><p>${nearMisses} near misses · ${Math.round(driftScore)} drift points<br>${place===1?'The after hours belong to you.':'One more run. Find your line and time your nitrous.'}</p>`,'<button class="primary" id="race-again"><span>ONE MORE RUN</span><span>↗</span></button><button class="secondary" id="result-home">BACK TO MAIN MENU</button>');$('race-again').onclick=()=>startRace();$('result-home').onclick=backHome;
}
$('start').onclick=()=>startRace();$('free-drive').onclick=()=>startRace(true);$('pause').onclick=pause;$('help').onclick=help;$('settings').onclick=settings;$('sound').onclick=()=>setSound(!soundOn);$('home').onclick=e=>{e.preventDefault();backHome();};$('modal-close').onclick=()=>previousMode==='finish'?backHome():closeModal();
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen();}catch{announce('FULLSCREEN UNAVAILABLE','USE YOUR BROWSER’S FULLSCREEN CONTROL');}}
$('fullscreen').onclick=fullscreen;
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)&&e.code!=='Tab')e.preventDefault();if(e.repeat){keys.add(e.code);return;}keys.add(e.code);if(e.code==='Enter'&&mode==='intro')startRace();if(e.code==='Escape'){$('modal').hidden?pause():(previousMode==='finish'?backHome():closeModal());}if(e.code==='KeyM')setSound(!soundOn);if(e.code==='KeyC'){camMode=(camMode+1)%3;announce(['CHASE CAMERA','LOW CHASE CAMERA','HOOD CAMERA'][camMode],'',1);}if(e.code==='KeyH')help();if(e.code==='KeyF')fullscreen();if(e.code==='KeyR'&&['race','free'].includes(mode)){lane=2.7;speed=0;slip=0;announce('BACK ON TRACK','',1);}});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(['race','free','countdown'].includes(mode)){pausedByBlur=true;pause();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(['race','free','countdown'].includes(mode))pause();}});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);});const end=()=>keys.delete(b.dataset.key);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',end);});
// Keep keyboard focus inside an open modal.
$('modal').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focus=[...$('modal').querySelectorAll('button,input,select')];const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});

let gamepadPauseWasDown=false;
function input(){const gp=navigator.getGamepads?.()[0];let turning=0,gas=0,brake=0,boost=false,drift=false;
  if(gp){turning=Math.abs(gp.axes[0])>.1?gp.axes[0]:0;gas=gp.buttons[7]?.value||0;brake=gp.buttons[6]?.value||0;boost=gp.buttons[0]?.pressed;drift=gp.buttons[1]?.pressed;const pp=gp.buttons[9]?.pressed;if(pp&&!gamepadPauseWasDown)pause();gamepadPauseWasDown=pp;}
  if(keys.has('KeyA')||keys.has('ArrowLeft'))turning=-1;if(keys.has('KeyD')||keys.has('ArrowRight'))turning=1;if(keys.has('KeyW')||keys.has('ArrowUp'))gas=1;if(keys.has('KeyS')||keys.has('ArrowDown'))brake=1;boost=boost||keys.has('ShiftLeft')||keys.has('ShiftRight');drift=drift||keys.has('Space');return{turning,gas,brake,boost,drift};}
function positionCars(dt){
  const place=(mesh,d,l)=>{mesh.position.copy(pathPoint(d,l,.04));mesh.rotation.order='YXZ';mesh.rotation.set(pitch(d),heading(d),bank(d));};
  place(player,s,lane);player.rotation.y-=steer*.045+slip;player.rotation.z+=steer*speed*.00065;
  player.userData.wheels.forEach((w,i)=>{w.rotation.x-=speed*dt/.43;if(i%2===0)w.rotation.y=-steer*.2;});
  for(const o of opponents){place(o.mesh,o.s,o.lane);o.mesh.visible=Math.abs(o.s-s)<280;o.mesh.userData.wheels.forEach(w=>w.rotation.x-=o.speed*dt/.43);}
  for(const v of traffic){place(v.mesh,v.s,v.lane);v.mesh.visible=Math.abs(v.s-s)<220;v.mesh.userData.wheels.forEach(w=>w.rotation.x-=v.speed*dt/.43);}
}
const collisionRoute={point:pathPoint,heading,halfWidth:roadHalfWidth};let collisionCount=0;
function updatePhysics(dt){
  const controls=input();steer=lerp(steer,controls.turning,1-Math.exp(-dt*6));
  boosting=controls.boost&&nitro>1&&speed>10&&controls.gas>0;drifting=controls.drift&&speed>12&&Math.abs(steer)>.15;
  const max=boosting?94:73;
  if(speed<max)speed+=controls.gas*(boosting?20:11.8)*dt;speed-=controls.brake*30*dt;speed-=(1.5+speed*speed*.00023)*dt;if(drifting)speed-=6*dt;if(!boosting&&speed>73)speed=Math.max(73,speed-11*dt);speed=clamp(speed,0,94);
  if(boosting)nitro=Math.max(0,nitro-21*dt);else nitro=Math.min(100,nitro+6*dt);
  slip=lerp(slip,drifting?steer*.36:0,1-Math.exp(-dt*(drifting?3:5)));
  lane+=steer*(2+speed*.115)*(drifting?1.5:1)*dt;
  // Lateral inertia from the road curvature requires gentle steering through long bends.
  lane-=curvature(s)*speed*speed*.065*dt;
  const bodyYaw=-steer*.045-slip;const edge=roadHalfWidth(s)-Math.abs(Math.cos(bodyYaw))*player.userData.halfWidth-Math.abs(Math.sin(bodyYaw))*player.userData.halfLength-.06;
  if(Math.abs(lane)>edge){lane=clamp(lane,-edge,edge);speed*=1-dt*1.9;if(collisionCooldown<=0){announce('BRUSHED THE BARRIER','FIND YOUR LINE',1);collisionCooldown=1.5;tone(75,.12);}}
  s+=speed*dt;elapsed+=dt;topSpeed=Math.max(topSpeed,speed*3.6);collisionCooldown-=dt;
  if(drifting){driftScore+=speed*.4*dt;if(noticeTime<=0)announce('DRIFT +'+Math.round(driftScore),'HOLD THE LINE',.55);}
  for(const o of opponents){const cornerSpeed=Math.sqrt(20/Math.max(.002,Math.abs(curvature(o.s+35))));const target=Math.min(o.max+(s-o.s>130?4:0),cornerSpeed);o.speed=target<o.speed?Math.max(target,o.speed-15*dt):Math.min(target,o.speed+8*dt);o.s+=o.speed*dt;if(o.s>=START+LENGTH&&!o.finishedAt)o.finishedAt=elapsed;}
  for(const v of traffic){v.s+=v.speed*dt;if(v.s<s-100){v.s=s+random(700,1450);v.near=false;}if(v.s>END)v.s=START+random(300,1500);}
  for(const v of [...opponents,...traffic]){
    const dz=v.s-s,dx=v.lane-lane;
    if(v.near===false&&dz<0&&dz>-5&&Math.abs(dx)>2&&Math.abs(dx)<3.8&&speed>32){v.near=true;nearMisses++;nitro=Math.min(100,nitro+10);announce('NEAR MISS','+10 NITROUS',1.4);}
  }
  const body={s,lane,speed,yaw:bodyYaw,halfWidth:player.userData.halfWidth,halfLength:player.userData.halfLength};
  const hits=resolveVehicles([body,...opponents,...traffic],collisionRoute);s=body.s;lane=body.lane;speed=body.speed;
  if(hits.has(body)&&collisionCooldown<=0){collisionCooldown=.7;announce('CONTACT','HOLD YOUR LINE',.7);tone(58,.12);collisionCount++;}
  if(mode==='race'&&s>=START+LENGTH){s=START+LENGTH;finish();}
  if(mode==='free'&&s>END-20){s=START;traffic.forEach((v,i)=>v.s=START+180+i*224);opponents.forEach(o=>o.s=START+o.lead);announce('BACK TO TOKYO TOWER','THE NIGHT IS STILL YOUNG',2);}
}
const map=$('minimap').getContext('2d');
function updateMap(){
  map.clearRect(0,0,250,170);map.strokeStyle='#627b861c';map.lineWidth=1;
  for(let i=0;i<7;i++){map.beginPath();map.moveTo(0,i*28);map.lineTo(250,i*28);map.moveTo(i*42,0);map.lineTo(i*42,170);map.stroke();}
  const origin=center(s),r=right(s),f=tangent(s);const project=d=>{const p=center(d).sub(origin);return[125+p.dot(r)*.39,135-p.dot(f)*.39];};
  const route=[];for(let d=s-60;d<s+420;d+=7)route.push(project(d));
  function line(color,width){map.beginPath();route.forEach((p,i)=>i?map.lineTo(...p):map.moveTo(...p));map.strokeStyle=color;map.lineWidth=width;map.lineJoin='round';map.stroke();}
  line('#586f8533',13);line('#91a9b43d',7);line('#d8ff55',2);
  for(const o of opponents){if(o.s>s-60&&o.s<s+420){map.fillStyle='#dbe7ec';map.beginPath();map.arc(...project(o.s),2.5,0,Math.PI*2);map.fill();}}
  map.save();map.translate(125+lane*.39,135);map.fillStyle='#d8ff55';map.shadowColor='#d8ff55';map.shadowBlur=8;map.beginPath();map.moveTo(0,-7);map.lineTo(5,5);map.lineTo(0,2);map.lineTo(-5,5);map.closePath();map.fill();map.restore();
}
function hud(){
  const kmh=Math.round(speed*3.6),gear=speed<1?'N':Math.min(6,1+Math.floor(speed/14));$('speed').textContent=String(kmh).padStart(3,'0');$('gear').textContent=gear;$('rpm-arc').style.strokeDasharray=`${speed<1?5:clamp(18+(speed%14)/14*65+(boosting?14:0),0,100)} 100`;$('nitro-bar').style.width=nitro+'%';$('timer').textContent=timeFormat(elapsed);$('position').textContent=1+opponents.filter(o=>o.s>s).length;
  const progress=clamp((s-START)/LENGTH*100,0,100);$('progress-label').textContent=Math.floor(progress)+'%';$('progress-bar').style.width=progress+'%';$('remaining').textContent=mode==='free'?'FREE DRIVE':Math.max(0,(START+LENGTH-s)/1000).toFixed(1)+' KM';app.classList.toggle('boosting',boosting);$('district').textContent=districtAt(s).short;const bend=curvature(s+65);$('route-cue').innerHTML=Math.abs(bend)>.004?`<b>${bend>0?'↖':'↗'}</b><span>${Math.abs(bend)>.009?'TIGHT BEND':'SWEEPING BEND'}<small>${Math.round(Math.sqrt(22/Math.abs(bend))*3.6/10)*10} KM/H ADVISED</small></span>`:'<b>↑</b><span>OPEN ROAD<small>FIND YOUR LINE</small></span>';updateMap();
}
const lastCarPosition=new THREE.Vector3();
function updateCamera(dt,t){
  const pos=player.position,isIntro=mode==='intro'||(mode==='paused'&&previousMode==='intro'),mobile=innerWidth<650;
  if(isIntro){
    cameraDesired.copy(pos).addScaledVector(right(s),mobile?5.2:5.6).addScaledVector(tangent(s),mobile?-11.5:-8.8);cameraDesired.y+=mobile?3.5:2.9;
    lookDesired.copy(pos).addScaledVector(right(s),mobile?-4.4:-16.5).addScaledVector(tangent(s),12);lookDesired.y+=mobile?2.1:1.05;camera.fov=53;
  }else if(camMode===2){cameraDesired.copy(pathPoint(s+1.6,lane,1.2));lookDesired.copy(pathPoint(s+32,lane*.7,1.25));camera.fov=70+(boosting?8:0);}
  else {const low=camMode===1,dist=low?6.8:8.7;cameraDesired.copy(pathPoint(s-dist,lane,low?1.9:3.7));lookDesired.copy(pathPoint(s+20,lane*.6,low?1.0:1.4));camera.fov=lerp(camera.fov,(low?62:58)+speed*.075+(boosting?7:0),1-Math.exp(-dt*3));}
  if(!isIntro){const delta=pos.clone().sub(lastCarPosition);if(delta.length()<30){camera.position.add(delta);cameraTarget.add(delta);}else{camera.position.copy(cameraDesired);cameraTarget.copy(lookDesired);}}
  camera.position.lerp(cameraDesired,1-Math.exp(-dt*8));cameraTarget.lerp(lookDesired,1-Math.exp(-dt*7));lastCarPosition.copy(pos);camera.lookAt(cameraTarget);
  if(boosting){camera.position.addScaledVector(right(s),Math.sin(t*80)*.014);camera.position.y+=Math.sin(t*93)*.012;}camera.updateProjectionMatrix();player.visible=camMode!==2||isIntro;
}
function updateRain(dt){
  rain.visible=quality!=='performance';
  rain.position.set(camera.position.x,elevation(s),camera.position.z);for(let i=0;i<rainCount;i++){const k=i*6;rainData[k+1]-=dt*23;rainData[k+4]-=dt*23;rainData[k+2]+=dt*(speed*.55+2);rainData[k+5]+=dt*(speed*.55+2);if(rainData[k+1]<0){const y=random(20,30);rainData[k+1]=y;rainData[k+4]=y+.6;const z=random(-70,20);rainData[k+2]=z;rainData[k+5]=z+.12;}}
  rainGeo.attributes.position.needsUpdate=true;
  sprayVel.forEach((p,i)=>{p.life-=dt;if(p.life<0&&speed>8){p.life=random(.2,.7);p.x=player.position.x+(rand()>.5?1:-1)+random(-.3,.3);p.y=player.position.y+.15;p.z=player.position.z+1.5;}p.y+=dt*.7;p.z+=dt*2;sprayData.set([p.x,p.y,p.z],i*3);});sprayGeo.attributes.position.needsUpdate=true;spray.visible=speed>8;
}
function updateAudio(){if(!audioCtx)return;const active=soundOn&&mode!=='paused';const t=audioCtx.currentTime;const rpm=42+(speed%14)*5+speed*.48;engineOsc.frequency.setTargetAtTime(rpm,t,.08);engineOsc2.frequency.setTargetAtTime(rpm*2.01,t,.08);filter.frequency.setTargetAtTime(180+speed*14+(boosting?600:0),t,.1);engineGain.gain.setTargetAtTime(active?.025+speed*.00035:0,t,.08);windGain.gain.setTargetAtTime(active?.04+speed*.001:0,t,.15);}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);
resetWorld();camera.position.set(player.position.x+5.6,2.8,player.position.z+8.4);cameraTarget.set(player.position.x-16.5,1.05,player.position.z-12);camera.lookAt(cameraTarget);hud();
let last=performance.now(),frame=0,fpsTime=0,fpsFrames=0,t=0,lastCount=4,accumulator=0;
function animate(now){
  requestAnimationFrame(animate);const realDt=(now-last)/1000,dt=Math.min(realDt,.045);last=now;t+=dt;
  if(mode==='countdown'){
    countdown-=dt;const num=Math.ceil(countdown-.5);if(num!==lastCount){lastCount=num;if(num>0)tone(400,.12);else tone(800,.3);}$('countdown').innerHTML=num>0?`<small>TOKYO MIDNIGHT</small>${num}`:'GO';
    if(countdown<=0){mode='race';$('countdown').hidden=true;announce('GO. MAKE IT COUNT.','W / ↑ TO ACCELERATE',2.4);}
  }
  if(mode==='race'||mode==='free'){accumulator+=Math.min(realDt,.1);while(accumulator>=PHYSICS_STEP&&['race','free'].includes(mode)){updatePhysics(PHYSICS_STEP);accumulator-=PHYSICS_STEP;}}else{boosting=false;accumulator=0;}
  if(mode!=='paused')positionCars(dt);
  player.userData.flames.forEach(f=>{f.visible=boosting;f.scale.y=.8+Math.sin(t*71)*.2;});
  player.userData.tailGlow.material.opacity=keys.has('KeyS')?.7:.3;
  updateCamera(dt,t);city.update(s,camera,t);updateRain(dt);updateAudio();
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('announcement').style.opacity=0;}
  if(frame++%3===0)hud();
  // Reflect only the nearby world. Buildings are instanced and the scene is fog culled.
  if(quality==='performance')renderer.render(scene,camera);else composer.render();
  fpsTime+=realDt;fpsFrames++;if(fpsTime>1){$('fps').textContent=Math.min(144,Math.round(fpsFrames/fpsTime));fpsFrames=0;fpsTime=0;}
}
requestAnimationFrame(animate);
function reveal(){if($('loader').hidden)return;$('loader').style.opacity=0;setTimeout(()=>$('loader').hidden=true,650);}
// Detailed vehicle mesh: Ferrari 458 Italia by vicent091036, CC BY 4.0,
// distributed in the Three.js examples. See assets/CREDITS.txt.
const draco=new DRACOLoader();draco.setDecoderPath('assets/draco/');draco.setWorkerLimit(1);
const loader=new GLTFLoader();loader.setDRACOLoader(draco);
function equipRide(kind){
 const ride=rides[kind];if(!ride)return;
 for(const child of [...player.children])if(![headlights,headlights.target,underGlow].includes(child))player.remove(child);
 player.add(ride);player.userData=ride.userData;selectedRide=kind;
 const names={ferrari:['458 <em>ITALIA</em>','FERRARI 458 / V8 / RWD'],gt3:['911 <em>GT3 STYLE</em>','ORIGINAL MESH / GT3-INSPIRED'],revuelto:['V12 <em>REVUELTO STYLE</em>','ORIGINAL MESH / REVUELTO-INSPIRED']};
 $('hero-caption').querySelector('strong').innerHTML=names[kind][0];$('hero-caption').querySelector('.car-spec').innerHTML='<i></i>'+names[kind][1];
 document.querySelectorAll('[data-ride]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ride===kind)));
 try{localStorage.setItem('midnight-ride',kind);}catch{}
}
document.querySelectorAll('[data-ride]').forEach(button=>button.onclick=()=>{if(mode==='intro')equipRide(button.dataset.ride);});
loader.load('assets/coupe.glb',gltf=>{
  const model=gltf.scene,ferrari=createCar(0x71899c);ferrari.userData.kind='ferrari';ferrari.userData.halfWidth=1.17;ferrari.userData.halfLength=2.32;
  model.updateMatrixWorld(true);const vehicleBounds=new THREE.Box3().setFromObject(model);model.position.y-=vehicleBounds.min.y;ferrari.userData.contactOffset=-vehicleBounds.min.y;
  const paint=ferrari.userData.paint;paint.roughness=.26;paint.metalness=.78;paint.envMap=scene.environment;paint.envMapIntensity=1.2;
  model.getObjectByName('body').material=paint;
  for(const name of ['rim_fl','rim_fr','rim_rl','rim_rr'])model.getObjectByName(name).material=materials.chrome;
  model.getObjectByName('glass').material=new THREE.MeshPhysicalMaterial({color:0x101b26,metalness:.2,roughness:.12,clearcoat:1,transparent:true,opacity:.94});
  model.getObjectByName('lights_red').material=redLight;model.getObjectByName('leds').material=headLight;
  const retained=[ferrari.userData.tailGlow,ferrari.userData.frontGlow,...ferrari.userData.flames,headlights,headlights.target,underGlow];
  for(const child of [...ferrari.children])if(!retained.includes(child))ferrari.remove(child);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});ferrari.add(model);ferrari.userData.wheels=['wheel_fl','wheel_rl','wheel_fr','wheel_rr'].map(n=>model.getObjectByName(n));
  ferrari.userData.realModel=true;
  const ao=new THREE.Mesh(new THREE.PlaneGeometry(2.8,5.7),new THREE.MeshBasicMaterial({map:contactTexture,color:0x000000,transparent:true,opacity:.8,depthWrite:false}));ao.rotation.x=-Math.PI/2;ao.position.y=.043;ferrari.add(ao);
  rides.ferrari=ferrari;equipRide(selectedRide);
  reveal();draco.dispose();
},undefined,()=>{equipRide('gt3');reveal();console.warn('458 unavailable; using the built-in GT3-inspired car.');});
setTimeout(reveal,12000);
function maximumOverlap(){const bodies=[{s,lane,speed,yaw:-steer*.045-slip,halfWidth:player.userData.halfWidth,halfLength:player.userData.halfLength},...opponents,...traffic];let depth=0;for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){if(Math.abs(bodies[i].s-bodies[j].s)>18)continue;const hit=contact(pose(bodies[i],collisionRoute),pose(bodies[j],collisionRoute));depth=Math.max(depth,hit?.depth||0);}return depth;}
// Read-only diagnostics for reproducible browser QA.
window.__midnight={get state(){return{mode,s,lane,speed,nitro,elapsed,topSpeed,nearMisses,driftScore,quality,camMode,detailedVehicle:!!player.userData.realModel,assetsReady:!!rides.ferrari,elevation:elevation(s),curvature:curvature(s),district:districtAt(s).short,car:selectedRide,pedestrians:city.pedestrianCount,collisionCount,maxOverlap:maximumOverlap(),vehicles:[{s,lane,speed,yaw:-steer*.045-slip,halfWidth:player.userData.halfWidth,halfLength:player.userData.halfLength},...opponents,...traffic].map(v=>({s:v.s,lane:v.lane,speed:v.speed})),position:1+opponents.filter(o=>o.s>s).length};}};
