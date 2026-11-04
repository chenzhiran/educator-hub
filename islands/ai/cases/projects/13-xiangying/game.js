/* 巷影预瞄 — original procedural assets. Three.js r160 (MIT). */
'use strict';
(() => {
const $ = id => document.getElementById(id);
const VERSION = 'alley-1';
let renderer, scene, camera, gun, flash, sun;
let state = 'home', mode = 'challenge', previousState = 'run';
let elapsed = 0, prep = 3, kills = 0, heads = 0, shots = 0, hits = 0, ammo = 12, reload = 0;
let yaw = 0, pitch = 0, lastShot = -999, recoil = 0, hitFade = 0, toastTime = 0, routeClock = 0;
let sensitivity = 1, volume = .4, reduced = false, assist = true, best = 0, savedSettings = {};
let dragControl=false, dragging=false;
let audio, route = [], records = [], reportPoints = [], resultSnapshot = null;
const keys = new Set(), targets = [], colliders = [], shotMeshes = [], headLines = [], lamps = [];
const ray = new THREE.Raycaster(), direction = new THREE.Vector3(), clock = new THREE.Clock();
const player = new THREE.Vector3(0, 1.65, 14);
const streets = [[-3,3,-9,17],[-3,19,-12,-6],[13,19,-30,-6],[3,24,-40,-25]];
const positions = [[-1.5,5],[1.5,-2],[-1.6,-8.6],[6.5,-8.7],[11.3,-7.5],[16.2,-10],[16.7,-17],[14.6,-24],[7,-28.5],[21,-29.2],[7.5,-36.3],[20.5,-37.8]];
let randomSeed = 7523;
function rand(){randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;}
function material(color, roughness=.85, metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function box(w,h,d,mat,x=0,y=0,z=0,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(r1,r2,h,mat,x,y,z,parent=scene,n=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(r,mat,x,y,z,parent=scene,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
function texture(kind){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
 if(kind==='brick'){
  ctx.fillStyle='#6e5555';ctx.fillRect(0,0,512,512);
  for(let row=0;row<16;row++)for(let col=-1;col<5;col++){
   const x=col*128+(row%2)*64,y=row*32, v=Math.floor(rand()*20);
   ctx.fillStyle=`rgb(${151+v},${101+v},${87+v})`;ctx.fillRect(x+2,y+2,124,28);
   ctx.fillStyle='#ffffff12';ctx.fillRect(x+3,y+3,120,2);ctx.fillStyle='#352b3320';ctx.fillRect(x+3,y+27,120,2);
  }
 }else if(kind==='stone'){
  ctx.fillStyle='#665e69';ctx.fillRect(0,0,512,512);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
   const x=col*128+(row%2)*64,y=row*64,v=Math.floor(rand()*22);
   ctx.fillStyle=`rgb(${125+v},${117+v},${131+v})`;ctx.fillRect(x+2,y+2,124,60);
   ctx.strokeStyle='#e0d5d12a';ctx.strokeRect(x+4,y+4,120,56);
  }
 }else if(kind==='plaster'){
  ctx.fillStyle='#d2b6a0';ctx.fillRect(0,0,512,512);
 }else if(kind==='roof'){
  ctx.fillStyle='#774e48';ctx.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=64)for(let x=0;x<512;x+=32){ctx.fillStyle=`hsl(12,30%,${38+rand()*12}%)`;ctx.fillRect(x+1,y+1,30,62);ctx.fillStyle='#f4af8a32';ctx.fillRect(x+3,y+3,3,58);ctx.fillStyle='#442c3a60';ctx.fillRect(x+1,y+57,30,6);}
 }
 for(let i=0;i<22000;i++){ctx.fillStyle=rand()>.5?'#fff':'#000';ctx.globalAlpha=rand()*.06;ctx.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*3);}ctx.globalAlpha=1;
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
let mats;
function makeScene(){
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
 $('world').appendChild(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#718290');scene.fog=new THREE.Fog('#85919a',28,95);
 camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.08,150);camera.rotation.order='YXZ';scene.add(camera);
 const skyCanvas=document.createElement('canvas');skyCanvas.width=2;skyCanvas.height=256;
 const sc=skyCanvas.getContext('2d'),grad=sc.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#253c58');grad.addColorStop(.45,'#74858f');grad.addColorStop(.75,'#d0a497');grad.addColorStop(1,'#d5b5a0');sc.fillStyle=grad;sc.fillRect(0,0,2,256);
 const skyTex=new THREE.CanvasTexture(skyCanvas);skyTex.colorSpace=THREE.SRGBColorSpace;
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(110,24,16),new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,depthWrite:false})));
 scene.add(new THREE.HemisphereLight('#b9d8ee','#77576a',2));
 sun=new THREE.DirectionalLight('#ffcea1',3.1);sun.position.set(-18,28,5);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-37,right:37,top:37,bottom:-37,near:1,far:100});sun.target.position.set(5,0,-14);sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
 const fill=new THREE.DirectionalLight('#9dbfde',.8);fill.position.set(20,12,-30);scene.add(fill);
 const brick=texture('brick');brick.repeat.set(2,2);
 const stone=texture('stone');stone.repeat.set(18,22);
 const plaster=texture('plaster');plaster.repeat.set(2,2);
 const roof=texture('roof');roof.repeat.set(3,2);
 mats={brick:new THREE.MeshStandardMaterial({map:brick,roughness:.92}),plaster:new THREE.MeshStandardMaterial({map:plaster,roughness:.96}),roof:new THREE.MeshStandardMaterial({map:roof,roughness:.9}),ground:new THREE.MeshStandardMaterial({map:stone,roughness:.88}),trim:material('#d4bbaa'),dark:material('#39454b'),wood:material('#77614f'),metal:material('#354147',.45,.55),glass:material('#233e4c',.3,.4),leaf:material('#617255'),pot:material('#a76e55'),cloth:material('#e5c8a8'),awning:material('#b96750'),line:new THREE.MeshBasicMaterial({color:'#8cd9d5',transparent:true,opacity:.65}),glow:new THREE.MeshStandardMaterial({color:'#f6d699',emissive:'#ffc068',emissiveIntensity:2})};
 box(100,.2,110,mats.ground,5,-.15,-16);
 // Seven building blocks form a continuous, readable street route.
 building(-14,-3,-25,20,9,mats.plaster);building(3,13,-6,20,8,mats.brick);
 building(-3,13,-25,-12,10,mats.plaster);building(19,30,-25,7,11,mats.brick);
 building(-8,3,-44,-25,9,mats.brick);building(3,26,-49,-40,10,mats.plaster);building(24,33,-44,-25,8,mats.plaster);
 // Terminate entry with a clear locked gate.
 box(6,4,.35,mats.dark,0,2,17.5);for(let x=-2.7;x<3;x+=.4)box(.05,3,.07,mats.metal,x,1.8,17.25);
 marketDetails();arch(16,-28,6);tower(10,-46);
 // Pavement edges and short teaching head lines.
 for(const r of streets){
  const [x1,x2,z1,z2]=r;
  for(const x of [x1+.13,x2-.13])box(.22,.08,z2-z1,mats.trim,x,.015,(z1+z2)/2);
 }
 const lineSegments=[[-2.97,1.6,5,0,18],[2.97,1.6,6,0,17],[7.5,1.6,-11.97,10,0],[19.02,1.6,-18,0,12],[3.03,1.6,-33,0,11],[14,1.6,-39.97,17,0]];
 for(const [x,y,z,w,d] of lineSegments){const o=box(w||.025,.025,d||.025,mats.line,x,y,z);o.castShadow=false;headLines.push(o);}
 // Intentional, sparse dressing: paper, weeds, planters.
 for(let i=0;i<35;i++){const r=streets[i%4],x=r[0]+.3+rand()*(r[1]-r[0]-.6),z=r[2]+rand()*(r[3]-r[2]);if(i%3===0){const p=box(.2+rand()*.22,.008,.25,mats.cloth,x,.02,z);p.rotation.y=rand()*6;}else if(i%3===1){plant(x,.05,z,.45);}}
 for(const [x,z] of [[-2.6,10],[3.5,-6.3],[12.5,-11.7],[19.7,-27],[3.6,-33],[23.4,-35]])plant(x,0,z,.9,true);
 // Draped laundry and hanging market sign.
 laundry(-2.9,3,4.8,1);laundry(13.2,19,5.6,-21);
 sign(-2.8,3.4,3,'FORNO',Math.PI/2);sign(7.5,3.6,-5.76,'MERCATO',0);
 // Horizon silhouettes establish scale beyond playable blocks.
 for(let i=0;i<8;i++)box(5,8+rand()*7,5,mats.plaster,-20+i*8,4,-57-rand()*8);
 positions.forEach(([x,z],i)=>makeTarget(i,x,z));
 batchScenery();makeGun();
}
function batchScenery(){
 // Instance repeated static scenery; keep original invisible raycast meshes intact.
 scene.updateMatrixWorld(true);const groups=new Map();
 for(const o of [...scene.children]){
  if(!o.isMesh||headLines.includes(o)||!['BoxGeometry','SphereGeometry'].includes(o.geometry.type))continue;
  const key=o.material.uuid+o.geometry.type;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 }
 for(const objects of groups.values()){
  if(objects.length<3)continue;const first=objects[0],isBox=first.geometry.type==='BoxGeometry';
  const geometry=isBox?new THREE.BoxGeometry(1,1,1):new THREE.SphereGeometry(1,12,8);
  const batch=new THREE.InstancedMesh(geometry,first.material,objects.length);batch.castShadow=true;batch.receiveShadow=true;
  objects.forEach((o,i)=>{const p=o.geometry.parameters;const scale=isBox?new THREE.Vector3(p.width,p.height,p.depth):new THREE.Vector3(p.radius,p.radius,p.radius);batch.setMatrixAt(i,o.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(scale.x,scale.y,scale.z)));scene.remove(o);});
  batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();scene.add(batch);
 }
}
function building(x1,x2,z1,z2,h,mat){
 const w=x2-x1,d=z2-z1,cx=(x1+x2)/2,cz=(z1+z2)/2;
 const wall=box(w,h,d,mat,cx,h/2,cz);shotMeshes.push(wall);colliders.push([x1,x2,z1,z2]);
 box(w+.35,.25,d+.35,mats.trim,cx,.22,cz);box(w+.45,.22,d+.45,mats.trim,cx,h-.1,cz);
 const roof=box(w+.8,.45,d+.8,mats.roof,cx,h+.15,cz);roof.rotation.z=.025;
 // Windows are repeated facade modules with inset glass, sill and shutters.
 for(const z of [z1-.045,z2+.045])for(let x=x1+1.6;x<x2-.8;x+=2.7)for(let y=2.7;y<h-1;y+=2.8){
   box(1.15,1.65,.09,mats.dark,x,y,z);box(.9,1.35,.11,mats.glass,x,y,z+(z===z1-.045?-.04:.04));
   box(1.4,.12,.28,mats.trim,x,y-.88,z);box(.06,1.4,.14,mats.wood,x,y,z);box(1.05,.06,.14,mats.wood,x,y,z);
   for(const s of [-1,1])box(.28,1.6,.1,mats.wood,x+s*.72,y,z);
 }
 for(const x of [x1-.045,x2+.045])for(let z=z1+1.8;z<z2-1;z+=3.4)for(let y=2.8;y<h-1;y+=2.8){
   box(.09,1.6,1.1,mats.dark,x,y,z);box(.11,1.3,.86,mats.glass,x+(x<x1?-.04:.04),y,z);box(.28,.12,1.35,mats.trim,x,y-.85,z);box(.14,1.4,.05,mats.wood,x,y,z);
 }
 for(const x of [x1+.13,x2-.13])for(const z of [z1+.13,z2-.13])box(.16,h,.16,mats.trim,x,h/2,z);
}
function plant(x,y,z,size,pot=false){
 if(pot)cylinder(.27*size,.19*size,.42*size,mats.pot,x,y+.21*size,z);
 const base=y+(pot?.4*size:0);
 for(let i=0;i<5;i++){const o=sphere(.18*size,mats.leaf,x+(rand()-.5)*size*.6,base+.15*size+rand()*.3*size,z+(rand()-.5)*size*.6,scene,.65,1.7,.65);o.rotation.z=(rand()-.5)*1.5;}
}
function arch(x,z,width){
 const archMat=material('#b2a39b');
 for(const s of [-1,1]){const o=box(.65,3.25,.9,archMat,x+s*width/2,1.625,z);shotMeshes.push(o);box(.9,.25,1.15,mats.trim,x+s*width/2,.15,z);}
 const shape=new THREE.Shape(),r=width/2;
 shape.absarc(0,3.2,r+.33,0,Math.PI,false);shape.lineTo(-r+.33,3.2);shape.absarc(0,3.2,r-.33,Math.PI,0,true);shape.closePath();
 const o=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.9,bevelEnabled:false,curveSegments:20}),archMat);o.position.set(x,0,z-.45);o.castShadow=true;o.receiveShadow=true;scene.add(o);shotMeshes.push(o);
 for(let i=0;i<11;i++){const a=i*Math.PI/10;const b=box(.06,.62,.94,mats.trim,x+Math.cos(a)*r,3.2+Math.sin(a)*r,z);b.rotation.z=a-Math.PI/2;}
 sphere(.3,mats.trim,x,6.25,z,scene,1,.8,.6);
}
function tower(x,z){
 box(3,15,3,mats.plaster,x,7.5,z);box(3.5,.3,3.5,mats.trim,x,13,z);
 for(const xx of [-1.1,1.1])for(const zz of [-1.1,1.1])box(.3,2.5,.3,mats.trim,x+xx,15,z+zz);
 const roof=new THREE.Mesh(new THREE.ConeGeometry(2.5,2,4),mats.roof);roof.position.set(x,17,z);roof.rotation.y=Math.PI/4;roof.castShadow=true;scene.add(roof);
 const bell=cylinder(.42,.65,.8,mats.metal,x,14.9,z);sphere(.25,mats.metal,x,14.4,z);box(.05,1,.05,mats.metal,x,18.2,z);
}
function sign(x,y,z,text,rot){
 const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#33484a';ctx.fillRect(0,0,512,192);ctx.strokeStyle='#cbb78f';ctx.lineWidth=5;ctx.strokeRect(12,12,488,168);ctx.fillStyle='#e7d5b3';ctx.textAlign='center';ctx.font='48px Georgia';ctx.fillText(text,256,104);ctx.font='16px Georgia';ctx.fillText('BOTTEGA · DAL 1926',256,145);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;scene.add(g);box(2.4,.95,.12,mats.wood,0,0,0,g);const p=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.86),new THREE.MeshStandardMaterial({map:t,roughness:.9}));p.position.z=.07;g.add(p);
}
function laundry(x1,x2,y,z){
 const points=[new THREE.Vector3(x1,y,z),new THREE.Vector3((x1+x2)/2,y-.25,z),new THREE.Vector3(x2,y,z)];const curve=new THREE.CatmullRomCurve3(points);const rope=new THREE.Mesh(new THREE.TubeGeometry(curve,16,.012,4,false),mats.dark);scene.add(rope);
 for(let i=1;i<=4;i++){const x=x1+(x2-x1)*i/5;const cloth=box(.55,.7,.025,i%2?mats.cloth:mats.awning,x,y-.55,z);cloth.rotation.z=(i%2?1:-1)*.08;}
}
function marketDetails(){
 // North face of the brick shop, awning projects over the market lane.
 box(5.6,2.6,.12,mats.trim,7.5,1.35,-6.08);
 for(let y=.2;y<2.6;y+=.13)box(5.4,.035,.06,mats.dark,7.5,y,-6.17);
 for(let i=0;i<12;i++){const a=box(.5,.09,1.55,i%2?mats.cloth:mats.awning,4.75+i*.5,3,-6.65);a.rotation.x=-.14;box(.5,.22,.07,i%2?mats.cloth:mats.awning,4.75+i*.5,2.8,-7.4);}
 box(2,.13,.65,mats.wood,10.9,.9,-6.5);for(const x of [10.1,11.7])box(.1,.9,.5,mats.wood,x,.45,-6.5);box(2.05,.03,.69,mats.cloth,10.9,1,-6.5);
 for(const [x,z,w,h,d] of [[3.8,-7.1,.8,.75,.8],[12,-10.9,1.1,.75,.85],[18.2,-21,.8,.9,.8],[4,-30,1.1,.7,1]]){
  const o=box(w,h,d,mats.wood,x,h/2,z);colliders.push([x-w/2,x+w/2,z-d/2,z+d/2]);shotMeshes.push(o);
  for(let y=.12;y<h;y+=.18)box(w+.02,.025,d+.02,mats.dark,x,y,z);
  for(const dx of [-w*.4,w*.4])box(.06,h+.04,d+.04,mats.trim,x+dx,h/2,z);
 }
 // Warm wall lanterns: emissive fixtures, no expensive per-lamp shadows.
 for(const [x,z] of [[2.9,6],[-2.9,-2],[13.1,-15],[23.9,-32]]){
  box(.18,.3,.23,mats.metal,x,3.3,z);box(.14,.2,.16,mats.glow,x,3.3,z);lamps.push(new THREE.Vector3(x,3.3,z));
 }
 // Stone planter in courtyard, kept clear of the route.
 box(2,.55,1.2,mats.trim,10,.275,-33);box(1.75,.04,.95,mats.wood,10,.57,-33);colliders.push([9,11,-33.6,-32.4]);
 for(let i=0;i<7;i++)plant(9.3+rand()*1.4,.6,-33.3+rand()*.6,.7);
}
function makeTarget(id,x,z){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=(id%3-1)*.3;scene.add(g);
 const bodyMat=material('#34464e',.55,.4),edge=material('#849a9b',.5,.45),orange=material('#dc9d67',.5,.3);
 const visor=new THREE.MeshStandardMaterial({color:'#72e4db',emissive:'#36aaa8',emissiveIntensity:.8,roughness:.25,metalness:.5});
 const meshes=[];
 function mark(o,part){o.userData={target:id,part};meshes.push(o);shotMeshes.push(o);return o;}
 const head=mark(sphere(.205,edge,0,1.61,0,g,1,1.13,.95),'head');
 mark(box(.34,.105,.12,visor,0,1.64,.16,g),'head');
 mark(box(.41,.48,.26,bodyMat,0,1.15,0,g),'body');box(.35,.27,.025,edge,0,1.2,.145,g);box(.08,.17,.025,orange,0,1.2,.166,g);
 mark(box(.3,.17,.24,bodyMat,0,.82,0,g),'body');
 for(const s of [-1,1]){
  mark(cylinder(.075,.07,.55,bodyMat,s*.12,.48,0,g),'body');sphere(.08,edge,s*.12,.65,0,g);box(.13,.1,.26,bodyMat,s*.12,.15,.055,g);
  const arm=mark(cylinder(.065,.065,.43,bodyMat,s*.29,1.13,.015,g),'body');arm.rotation.z=s*.13;sphere(.085,orange,s*.26,1.37,0,g);
 }
 cylinder(.34,.38,.07,mats.dark,0,.035,0,g,24);
 const outline=new THREE.Mesh(new THREE.TorusGeometry(.235,.012,6,24),new THREE.MeshBasicMaterial({color:'#edc184',depthTest:true}));outline.position.set(0,1.61,.05);g.add(outline);outline.visible=false;
 targets.push({id,group:g,meshes,outline,hp:100,dead:false,death:0,headPos:new THREE.Vector3(x,1.61,z),visibleFor:0,candidate:null,first:null,angle:null,killTime:null,headKill:false});
}
function makeGun(){
 gun=new THREE.Group();camera.add(gun);
 const steel=material('#34454c',.45,.7),black=material('#1e2b32',.6,.2),edge=material('#71878b',.38,.65),wood=material('#aa9478',.6,.1),hand=material('#71635b');
 // A compact, carefully layered silhouette in view space, muzzle toward -Z.
 box(.16,.19,.47,steel,0,0,0,gun);box(.135,.05,.49,edge,0,.115,-.02,gun);
 box(.14,.15,.32,black,0,-.01,-.35,gun);
 const barrel=cylinder(.025,.028,.38,steel,0,.015,-.66,gun);barrel.rotation.x=Math.PI/2;
 const muzzle=cylinder(.037,.037,.08,black,0,.015,-.88,gun);muzzle.rotation.x=Math.PI/2;
 for(let i=0;i<7;i++)box(.17,.028,.026,edge,0,.03,-.25-i*.045,gun);
 const mag=box(.11,.23,.14,black,0,-.19,-.06,gun);mag.rotation.x=-.18;
 const grip=box(.095,.21,.12,black,0,-.19,.14,gun);grip.rotation.x=-.3;
 box(.13,.14,.25,black,0,-.015,.32,gun);box(.18,.24,.07,steel,0,-.025,.47,gun);
 for(const x of [-.048,.048])box(.025,.09,.045,black,x,.18,.12,gun);box(.12,.02,.05,black,0,.23,.12,gun);
 box(.025,.095,.035,black,0,.18,-.51,gun);box(.012,.025,.02,wood,0,.24,-.51,gun);
 box(.018,.04,.06,wood,.088,.02,.12,gun);box(.02,.035,.08,edge,.09,-.03,0,gun);
 const glove=material('#41494b');sphere(.09,glove,.015,-.19,.15,gun,.75,1.3,1);sphere(.1,glove,-.045,-.08,-.4,gun,.8,.7,1.4);
 const arm=box(.12,.13,.45,hand,.025,-.25,.39,gun);arm.rotation.x=.12;
 const sleeve=box(.16,.17,.32,black,-.13,-.2,-.23,gun);sleeve.rotation.y=-.5;
 const fg=new THREE.ConeGeometry(.1,.22,5);fg.rotateX(-Math.PI/2);flash=new THREE.Mesh(fg,new THREE.MeshBasicMaterial({color:'#ffce78',transparent:true,opacity:.9}));flash.position.set(0,.015,-1);gun.add(flash);flash.visible=false;
 gun.scale.setScalar(.58);gun.position.set(.24,-.23,-.46);gun.rotation.set(0,-.025,0);
}
function reset(){
 player.set(0,1.65,14);yaw=0;pitch=0;elapsed=0;prep=3;kills=0;heads=0;shots=0;hits=0;ammo=12;reload=0;recoil=0;lastShot=-999;routeClock=0;route=[[0,14]];resultSnapshot=null;keys.clear();
 for(const t of targets){Object.assign(t,{hp:100,dead:false,death:0,visibleFor:0,candidate:null,first:null,angle:null,killTime:null,headKill:false});t.group.visible=true;t.group.scale.setScalar(1);t.group.position.y=0;t.outline.visible=false;}
 $('timerLabel').textContent=mode==='challenge'?'剩余时间':'练习用时';$('modeLabel').textContent=mode==='challenge'?'限时挑战':'自由练习';$('assistRow').hidden=mode!=='practice';$('hitText').style.opacity=0;$('hitmarker').style.opacity=0;
 updateHUD();
}
function lock(){
 if(dragControl){toast('拖动鼠标转动视角 · 单击射击 · Esc 暂停');return;}
 const fallback=()=>{dragControl=true;dragging=false;toast('当前浏览器使用拖动视角 · 单击射击 · Esc 暂停');};
 try{const p=renderer.domElement.requestPointerLock();if(p&&p.catch)p.catch(fallback);}
 catch(e){fallback();}
}
function begin(){
 reset();state='prep';$('home').hidden=true;$('pause').hidden=true;$('results').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');
 initAudio();lock();
}
function pause(){if(!['run','prep'].includes(state))return;previousState=state;state='paused';keys.clear();dragging=false;$('pause').hidden=false;$('endPractice').hidden=mode!=='practice';if(document.pointerLockElement)document.exitPointerLock();}
function resume(){if(state!=='paused')return;state=previousState;$('pause').hidden=true;lock();initAudio();}
function home(){state='home';keys.clear();if(document.pointerLockElement)document.exitPointerLock();$('hud').hidden=true;$('results').hidden=true;$('pause').hidden=true;$('home').hidden=false;document.body.classList.remove('playing');gun.visible=false;targets.forEach(t=>{t.group.visible=true;t.group.scale.setScalar(1);t.group.position.y=0;t.outline.visible=false;});updateBest();}
function initAudio(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch(e){/* Audio is optional. */}}
function sound(type){if(!audio||!volume)return;const time=audio.currentTime,gain=audio.createGain();gain.connect(audio.destination);
 if(type==='shot'){
  const n=Math.floor(audio.sampleRate*.12),buffer=audio.createBuffer(1,n,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
  const source=audio.createBufferSource();source.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1800;source.connect(filter);filter.connect(gain);gain.gain.setValueAtTime(volume*.5,time);gain.gain.exponentialRampToValueAtTime(.001,time+.12);source.start();
 }else{const osc=audio.createOscillator();osc.type=type==='head'?'sine':'triangle';osc.frequency.setValueAtTime(type==='head'?1100:type==='hit'?620:type==='reload'?240:440,time);osc.frequency.exponentialRampToValueAtTime(type==='head'?1650:180,time+.14);gain.gain.setValueAtTime(volume*.13,time);gain.gain.exponentialRampToValueAtTime(.001,time+.18);osc.connect(gain);osc.start();osc.stop(time+.19);}}
function validPosition(x,z){
 const radius=.24;
 for(const [dx,dz] of [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]])if(!streets.some(r=>x+dx>r[0]&&x+dx<r[1]&&z+dz>r[2]&&z+dz<r[3]))return false;
 return !colliders.some(r=>x+radius>r[0]&&x-radius<r[1]&&z+radius>r[2]&&z-radius<r[3]);
}
function shoot(){
 if(state!=='run'||(!dragControl&&document.pointerLockElement!==renderer.domElement)||reload>0||elapsed-lastShot<.18)return;
 if(ammo<=0){toast('弹匣已空 · 按 R 换弹');sound('reload');return;}
 ammo--;shots++;lastShot=elapsed;recoil=.065;flash.visible=true;sound('shot');
 camera.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(0,0),camera);
 const candidates=shotMeshes.filter(m=>m.userData.target===undefined||!targets[m.userData.target].dead);
 const intersections=ray.intersectObjects(candidates,false);
 if(intersections.length){const o=intersections[0].object;if(o.userData.target!==undefined){const t=targets[o.userData.target];const head=o.userData.part==='head';hits++;t.hp-=head?100:50;hitFade=.2;$('hitmarker').style.color=head?'#f2bd65':'#fff';sound(head?'head':'hit');
  if(t.hp<=0){t.dead=true;t.death=.22;t.killTime=elapsed;t.headKill=head;kills++;if(head)heads++;$('hitText').textContent=(head?'精准爆头':'目标击破')+' · '+String(t.id+1).padStart(2,'0');$('hitText').style.opacity=1;}
 }}
 updateHUD();if(kills===12)finish();
}
function startReload(){if(state!=='run'||reload>0||ammo===12)return;reload=1.2;sound('reload');updateHUD();}
function score(){return kills*100+heads*50+(mode==='challenge'&&kills===12?Math.floor(Math.max(0,60-elapsed))*10:0);}
function fmtTime(n){n=Math.max(0,n);return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');}
function updateHUD(){
 $('kills').textContent=String(kills).padStart(2,'0');$('score').textContent=score();$('timer').textContent=fmtTime(mode==='challenge'?Math.ceil(Math.max(0,60-elapsed)):elapsed);$('ammo').textContent=String(ammo).padStart(2,'0');$('accuracy').textContent='命中率 '+(shots?Math.round(hits/shots*100)+'%':'—');
 $('reloadLabel').textContent=reload>0?'正在换弹…':ammo===0?'按 R 更换弹匣':'SEMI AUTO / 训练步枪';$('ammoBars').innerHTML=Array.from({length:12},(_,i)=>'<i class="'+(i>=ammo?'empty':'')+'"></i>').join('');document.querySelector('.time-stat').classList.toggle('urgent',mode==='challenge'&&elapsed>=50);
}
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;toastTime=3;}
function observe(dt){
 camera.getWorldDirection(direction);camera.updateMatrixWorld();const view=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 const walls=shotMeshes.filter(o=>o.userData.target===undefined);
 for(const t of targets){
  if(t.dead){t.outline.visible=false;continue;}
  let visible=false;
  if(view.containsPoint(t.headPos)){
   let pass=0;for(const offset of [-.12,0,.12]){const point=t.headPos.clone();point.x+=offset;const delta=point.sub(player),distance=delta.length();ray.set(player,delta.normalize());ray.far=distance-.08;if(!ray.intersectObjects(walls,false).length)pass++;}visible=pass>=2;ray.far=Infinity;
  }
  t.outline.visible=visible&&mode==='practice'&&assist;
  if(t.first!==null)continue;
  if(visible){if(t.visibleFor===0){t.candidate={time:elapsed-dt,angle:THREE.MathUtils.radToDeg(direction.angleTo(t.headPos.clone().sub(player).normalize()))};}t.visibleFor+=dt;if(t.visibleFor>=.1){t.first=t.candidate.time;t.angle=t.candidate.angle;}}
  else {t.visibleFor=0;t.candidate=null;}
 }
}
function finish(){
 if(state!=='run')return;state='results';keys.clear();route.push([player.x,player.z]);if(document.pointerLockElement)document.exitPointerLock();
 $('hud').hidden=true;$('results').hidden=false;document.body.classList.remove('playing');
 const samples=targets.filter(t=>t.angle!==null),arrived=samples.filter(t=>t.angle<=3),times=targets.filter(t=>t.dead&&t.first!==null).map(t=>(t.killTime-t.first)*1000);
 const data={version:VERSION,mode,score:score(),kills,heads,shots,hits,elapsed:Math.min(mode==='challenge'?60:Infinity,elapsed),accuracy:shots?hits/shots:null,headRate:kills?heads/kills:null,preaim:samples.length?arrived.length/samples.length:null,mean:times.length?times.reduce((a,b)=>a+b,0)/times.length:null,date:new Date().toISOString()};
 resultSnapshot=data;const isBest=mode==='challenge'&&data.score>best;let stored=true;
 if(isBest)best=data.score;
 try{records.push(data);records=records.slice(-10);localStorage.setItem(VERSION,JSON.stringify({best,records}));}catch(e){stored=false;}
 $('resultEyebrow').textContent=mode==='practice'?'PRACTICE COMPLETE / 自由练习':'SESSION COMPLETE / 挑战结束';
 $('resultTitle').textContent=kills===12?'所有转角，都有答案。':'每一次，都更接近。';
 $('resultSubtitle').textContent=(kills===12?'全部目标已击破':(mode==='practice'?'练习结束':'时间到')+' · 还有 '+(12-kills)+' 个目标')+' / 用时 '+data.elapsed.toFixed(1)+' 秒'+(mode==='practice'?' / 练习成绩不参与挑战纪录':'');
 $('finalScore').textContent=data.score;$('newBest').hidden=!isBest;
 const percent=v=>v===null?'—':Math.round(v*100)+'%';
 $('resultMetrics').innerHTML=[['命中率',percent(data.accuracy)],['爆头率',percent(data.headRate)],['预瞄到位率',percent(data.preaim)],['平均击破用时',data.mean===null?'—':Math.round(data.mean)+' ms']].map(([name,value])=>`<div class="metric"><small>${name}</small><strong>${value}</strong></div>`).join('');
 const tips=[];const unseen=targets.filter(t=>t.first===null&&!t.dead);
 if(unseen.length>=3){const zones=[unseen.filter(t=>t.id<3).length,unseen.filter(t=>t.id>=3&&t.id<7).length,unseen.filter(t=>t.id>=7).length],max=zones.indexOf(Math.max(...zones));tips.push('路线观察 · <b>'+['入口巷道','市场区','拱门庭院'][max]+'</b>还有 '+zones[max]+' 个目标未观察，下一局可以多清一个角落。');}
 if(samples.length>=3&&data.preaim<.5){const worst=[...samples].sort((a,b)=>b.angle-a.angle)[0];tips.push('提前预瞄 · 目标 <b>'+String(worst.id+1).padStart(2,'0')+'</b> 首次偏差 '+worst.angle.toFixed(1)+'°，转角前先把准星保持在头线。');}
 if(shots>=5&&data.accuracy<.7)tips.push('射击节奏 · 先稳定准星再单击，减少移动中仓促开枪。');
 if(!tips.length)tips.push(kills===12?'节奏很好 · 下一局试着用更少的调整，走完这条街巷。':'继续熟悉路线 · 保持头线，依次清点近处和远处目标。');
 if(!stored)tips.unshift('本局成绩未能保存到此浏览器。');
 $('advice').innerHTML=tips.slice(0,2).map(t=>'<p>'+t+'</p>').join('');
 $('pointDetail').textContent='点击目标编号查看记录。到位标准：首次可见偏差 ≤ 3°。';drawMap($('reportMap'),true);sound('head');
}
function drawMap(canvas,report=false){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const pad=report?30:13,scale=Math.min((w-pad*2)/30,(h-pad*2)/61);const ox=(w-30*scale)/2,oy=(h-61*scale)/2;
 const convert=(x,z)=>[ox+(x+4)*scale,oy+(z+42)*scale];
 ctx.fillStyle='#14222b';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#91a4a94a';ctx.lineWidth=1;
 for(const r of streets){const [x,y]=convert(r[0],r[2]);ctx.fillStyle='#60717a';ctx.fillRect(x,y,(r[1]-r[0])*scale,(r[3]-r[2])*scale);ctx.strokeRect(x,y,(r[1]-r[0])*scale,(r[3]-r[2])*scale);}
 if(report&&route.length>1){ctx.beginPath();route.forEach(([x,z],i)=>{const [px,py]=convert(x,z);i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.strokeStyle='#8cd9d5';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);}
 reportPoints=[];
 for(const t of targets){if(!report&&mode==='challenge')continue;const [x,y]=convert(t.headPos.x,t.headPos.z);ctx.fillStyle=t.dead?'#8bd2ba':t.first!==null?'#eec184':'#263c49';ctx.strokeStyle=t.dead?'#a3dcc6':t.first!==null?'#eec184':'#c6d0c7';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,report?8:3,0,Math.PI*2);ctx.fill();ctx.stroke();if(report){ctx.fillStyle=t.first===null&&!t.dead?'#d3dcd6':'#17262c';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.id+1,x,y);reportPoints.push({x,y,id:t.id});}}
 const [px,py]=convert(player.x,player.z);ctx.save();ctx.translate(px,py);ctx.rotate(-yaw);ctx.fillStyle='#a5eee1';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(-4,5);ctx.lineTo(0,3);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.restore();
 if(report){const [sx,sy]=convert(0,14);ctx.fillStyle='#d5dfd2';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('起点',sx,sy+18);}
}
function updateBest(){$('homeBest').textContent=best?best.toLocaleString()+' 分':'尚无纪录';}
function saveSettings(){try{localStorage.setItem(VERSION+'-settings',JSON.stringify({sensitivity,volume,reduced,assist,low:$('lowQuality').checked}));}catch(e){}}
function loadStorage(){try{const d=JSON.parse(localStorage.getItem(VERSION)||'{}');best=Number.isFinite(d.best)?Math.max(0,d.best):0;records=Array.isArray(d.records)?d.records.slice(-10):[];savedSettings=JSON.parse(localStorage.getItem(VERSION+'-settings')||'{}')||{};}catch(e){}updateBest();}
function bind(){
 document.querySelectorAll('.mode').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('selected',b===button));}));
 $('start').onclick=begin;$('resume').onclick=resume;$('restart').onclick=begin;$('again').onclick=begin;$('quit').onclick=home;$('backHome').onclick=home;$('pauseButton').onclick=pause;$('endPractice').onclick=()=>{state='run';$('pause').hidden=true;finish();};
 document.addEventListener('keydown',e=>{if(['INPUT','BUTTON'].includes(document.activeElement.tagName)&&state==='paused')return;if(['KeyW','KeyA','KeyS','KeyD','KeyR','Space'].includes(e.code)&&['run','prep'].includes(state))e.preventDefault();if(e.code==='Escape')pause();if(e.code==='KeyR')startReload();keys.add(e.code);});document.addEventListener('keyup',e=>keys.delete(e.code));
 document.addEventListener('mousemove',e=>{if(!['run','prep'].includes(state)||(!dragControl&&document.pointerLockElement!==renderer.domElement)||(dragControl&&!dragging))return;yaw-=e.movementX*.002*sensitivity;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002*sensitivity,-1.35,1.35);});
 let pressX=0,pressY=0;
 renderer.domElement.addEventListener('mousedown',e=>{if(e.button===0){if(dragControl){dragging=true;pressX=e.clientX;pressY=e.clientY;}else shoot();}});
 document.addEventListener('mouseup',e=>{if(e.button===0&&dragControl){if(dragging&&Math.hypot(e.clientX-pressX,e.clientY-pressY)<5)shoot();dragging=false;}});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
 document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',()=>{keys.clear();pause();});
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 $('sensitivity').oninput=e=>{sensitivity=Number(e.target.value);$('sensValue').textContent=sensitivity.toFixed(1);saveSettings();};
 $('volume').oninput=e=>{volume=Number(e.target.value)/100;$('volumeValue').textContent=Math.round(volume*100)+'%';saveSettings();};
 $('reduceMotion').onchange=e=>{reduced=e.target.checked;saveSettings();};$('assist').onchange=e=>{assist=e.target.checked;saveSettings();};
 $('lowQuality').onchange=e=>{renderer.shadowMap.enabled=!e.target.checked;renderer.setPixelRatio(Math.min(devicePixelRatio,e.target.checked?1:1.6));scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});saveSettings();};
 if(Number.isFinite(savedSettings.sensitivity)){$('sensitivity').value=savedSettings.sensitivity;$('sensitivity').dispatchEvent(new Event('input'));}
 if(Number.isFinite(savedSettings.volume)){$('volume').value=savedSettings.volume*100;$('volume').dispatchEvent(new Event('input'));}
 for(const [id,key] of [['reduceMotion','reduced'],['assist','assist'],['lowQuality','low']])if(typeof savedSettings[key]==='boolean'){$(id).checked=savedSettings[key];$(id).dispatchEvent(new Event('change'));}
 $('reportMap').onclick=e=>{const c=$('reportMap'),r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*c.width,y=(e.clientY-r.top)/r.height*c.height;const p=reportPoints.find(p=>Math.hypot(p.x-x,p.y-y)<14);if(!p)return;const t=targets[p.id];$('pointDetail').textContent='目标 '+String(t.id+1).padStart(2,'0')+' · '+(t.dead?'已击破':t.first!==null?'已观察，未击破':'未观察')+' / '+(t.angle===null?'观察样本不足':'首次预瞄偏差 '+t.angle.toFixed(1)+'°')+(t.dead&&t.first!==null?' / 击破用时 '+Math.round((t.killTime-t.first)*1000)+' ms':'');};
}
let frame=0;
function tick(){
 requestAnimationFrame(tick);const rawDt=clock.getDelta(),dt=Math.min(rawDt,.05);frame++;
 if(state==='home'){
  const t=performance.now()*.0001;camera.position.set(-.8+Math.sin(t)*.12,1.95,11.7);camera.rotation.set(.055,-.1+Math.sin(t)*.025,0,'YXZ');gun.visible=false;headLines.forEach(o=>o.visible=false);
 }else{
  gun.visible=state!=='results';camera.position.copy(player);camera.rotation.set(pitch,yaw,0,'YXZ');headLines.forEach(o=>o.visible=mode==='practice'&&assist&&['run','prep'].includes(state));
 }
 if(['run','prep'].includes(state)&&(dragControl||document.pointerLockElement===renderer.domElement)){
  if(state==='prep'){const old=Math.ceil(prep);prep-=rawDt;$('countdown').textContent=prep>0?Math.ceil(prep):'';if(Math.ceil(prep)!==old&&prep>0)sound('reload');if(prep<=0){state='run';toast(mode==='practice'?'沿街前进 · 保持头线 · 按 R 换弹':'60 秒 · 清点 12 个目标');}}
  else{
   elapsed=Math.min(mode==='challenge'?60:Infinity,elapsed+rawDt);
   let forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);const len=Math.hypot(forward,side);if(len){forward/=len;side/=len;const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*3.2*dt,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*3.2*dt;if(validPosition(player.x+dx,player.z))player.x+=dx;if(validPosition(player.x,player.z+dz))player.z+=dz;}
   camera.position.copy(player);camera.updateMatrixWorld(true);observe(dt);
   if(reload>0){reload-=dt;if(reload<=0){reload=0;ammo=12;sound('reload');updateHUD();}}
   routeClock+=dt;if(routeClock>.2){routeClock=0;route.push([player.x,player.z]);if(mode==='practice'&&route.length>6000)route=route.filter((_,i)=>i%2===0);}
   if(mode==='challenge'&&elapsed>=60)finish();
   $('zone').textContent=player.z<-25?'拱门庭院':player.z<-6?'市场区':'入口巷道';
  }
  for(const t of targets)if(t.dead&&t.death>0){t.death-=dt;t.group.scale.y=Math.max(.01,t.death/.22);if(t.death<=0)t.group.visible=false;}
  if(!reduced){const moving=keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD');gun.position.y=-.23+(moving?Math.sin(elapsed*10)*.007:Math.sin(elapsed*2)*.002);gun.rotation.z=reload>0?Math.sin((1.2-reload)/1.2*Math.PI)*-.6:0;gun.position.z=-.46+recoil;gun.position.x=.24+(reload>0?-.08*Math.sin((1.2-reload)/1.2*Math.PI):0);}else{gun.position.set(.24,-.23,-.46);gun.rotation.z=0;}
  recoil=Math.max(0,recoil-dt*.6);flash.visible=recoil>.05;
 }
 if(!['prep'].includes(state))$('countdown').textContent='';
 if(hitFade>0){hitFade-=dt;$('hitmarker').style.opacity=Math.max(0,hitFade/.2);if(hitFade<=0)setTimeout(()=>{$('hitText').style.opacity=0;},200);}
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0;}
 if(frame%6===0&&state==='run'){updateHUD();drawMap($('minimap'));}
 renderer.render(scene,camera);
}
try{
 loadStorage();makeScene();bind();$('loading').hidden=true;home();tick();
 // Read-only diagnostics used for local verification.
 window.alleyDiagnostics=()=>({state,mode,elapsed,kills,heads,shots,hits,ammo,reload,score:score(),player:{x:player.x,z:player.z},targetCount:targets.length,visibleTargets:targets.filter(t=>t.first!==null).length,renderer:renderer.info.render,version:VERSION});
}catch(e){$('loading').hidden=true;$('error').hidden=false;$('errorText').textContent='请使用支持 WebGL 的桌面浏览器打开，并确认 vendor/three.min.js 与 game.js 文件完整。'+e.message;console.error(e);}
})();
