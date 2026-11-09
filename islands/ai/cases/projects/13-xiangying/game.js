/* 巷影预瞄 ALLEY / PRECISION LAB — original procedural assets. Three.js (MIT). */
'use strict';
(() => {
const $ = id => document.getElementById(id);
const VERSION = 'alley-2';
let renderer, scene, camera, gun, flash, sun, sky;
let state = 'home', mode = 'world1', previousState = 'run';
let elapsed = 0, prep = 3, kills = 0, heads = 0, shots = 0, hits = 0;
let yaw = 0, pitch = 0, lastShot = -999, recoil = 0, hitFade = 0, toastTime = 0, routeClock = 0;
let sensitivity = 1, volume = .4, reduced = false, assist = true, best = 0, savedSettings = {};
let dragControl = false, dragging = false;
let audio, route = [], records = [], reportPoints = [], resultSnapshot = null;
const keys = new Set(), targets = [], shotMeshes = [], headLines = [], lampLights = [], env = [], dyn = [];
const ray = new THREE.Raycaster(), direction = new THREE.Vector3(), clock = new THREE.Clock();
const player = new THREE.Vector3(0, 1.65, 14);
let mats = {}, randomSeed = 7523, activeMap, colliders, floors;
function rand(){randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;}
function material(color, roughness = .85, metalness = 0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}

/* ================= 武器表 =================
   槽位：1 长枪（AK47 / M4 / AWP）· 2 刀 · 3 手枪（初始手枪 / 左轮）
   同槽位的枪互斥，换枪时按已付价格全额退款补差价 */
const WEAPONS = {
 knife:{id:'knife',name:'战术刀',label:'MELEE / 战术刀',type:'melee',damage:50,range:2.8,rate:.46,clip:null,auto:false,speed:1.5,slot:'2',kind:'knife'},
 pistol:{id:'pistol',name:'手枪',label:'SEMI AUTO / 手枪',type:'gun',damage:20,headMul:2.5,range:48,rate:.18,clip:12,reload:1.35,spread:.008,moveSpread:.028,auto:false,speed:1,slot:'3',kind:'pistol'},
 revolver:{id:'revolver',name:'左轮',label:'REVOLVER / 左轮 · 单发',type:'gun',damage:100/3,headMul:3,range:52,rate:.4,clip:6,reload:2.7,spread:.006,moveSpread:.03,auto:false,speed:1,slot:'3',kind:'pistol',pierceArmor:true},
 m4:{id:'m4',name:'M4',label:'AUTO / M4',type:'gun',damage:25,headMul:4,range:62,rate:.095,clip:30,reload:2,spread:.017,moveSpread:.035,auto:true,speed:1,slot:'1',kind:'rifle'},
 ak:{id:'ak',name:'AK47',label:'AUTO / AK47',type:'gun',damage:25,headMul:4,range:60,rate:.105,clip:25,reload:2.25,spread:.022,moveSpread:.042,auto:true,speed:1,slot:'1',kind:'rifle'},
 awp:{id:'awp',name:'AWP',label:'SNIPER / AWP · 右键开镜',type:'gun',damage:100,headMul:1,range:120,rate:2,clip:10,reload:3.2,spread:.055,moveSpread:.06,auto:false,speed:.92,slot:'1',kind:'rifle',scope:1.5,scopeSwitch:true}
};
const SLOT_ORDER = ['knife','pistol','revolver','m4','ak','awp'];
const RIFLE_IDS = ['m4','ak','awp'];
const PISTOL_IDS = ['pistol','revolver'];
const BASE_FOV = 75;

function makeWeapon(ws, wd){
 const g = new THREE.Group();
 const steel = material('#34454c', .45, .7), black = material('#1e2b32', .6, .2), edge = material('#71878b', .38, .65), wood = material('#a28460', .62, .1);
 const glove = material('#3d4547');
 if(ws.id === 'knife' || ws.melee){
  const bladeMat = new THREE.MeshStandardMaterial({color:'#c9d4d8',roughness:.22,metalness:.92,emissive:'#1b2a33',emissiveIntensity:.4});
  const blade = box(.035,.085,.36,bladeMat,.0,.075,-.24,g); blade.rotation.x = -.05;
  box(.03,.02,.3,edge,0,.12,-.24,g);
  box(.055,.06,.09,black,-.005,.055,-.05,g);
  const guard = box(.09,.022,.05,steel,0,.025,-.05,g);
  const grip = box(.05,.13,.06,black,0,-.03,.03,g); grip.rotation.x = .32;
  box(.015,.02,.06,edge,.0,-.09,.06,g);
  box(.19,.2,.17,glove,0,-.02,.16,g);
  box(.2,.22,.26,black,0,-.06,.34,g); box(.22,.24,.3,black,0,-.07,.6,g);
  g.scale.setScalar(.95); g.position.set(.3,-.26,-.5); g.rotation.set(.05,-.14,.06);
  return g;
 }
 if(ws.id === 'pistol'){
  box(.075,.11,.3,steel,0,.02,-.02,g);
  box(.07,.055,.34,steel,0,-.02,-.06,g);
  box(.03,.03,.42,black,0,.015,-.3,g);
  const grip = box(.065,.2,.1,black,0,-.16,.09,g); grip.rotation.x = -.28;
  box(.05,.03,.12,edge,0,-.04,-.15,g);
  box(.02,.03,.02,edge,0,.09,-.18,g); box(.02,.03,.02,edge,0,.09,.05,g);
  box(.012,.06,.03,black,0,-.12,.03,g);
  box(.045,.09,.06,black,0,-.24,.11,g);
  for(let i=0;i<4;i++)box(.07,.012,.008,edge,0,.055-i*.026,-.12,g);
  box(.18,.2,.19,glove,0,-.02,.2,g);
  box(.18,.2,.24,black,-.03,-.05,.42,g);
  g.scale.setScalar(.95); g.position.set(.25,-.24,-.46); g.rotation.set(0,-.03,0);
  return g;
 }
 if(ws.id === 'revolver'){
  // 转轮手枪：枪管 + 转轮弹巢 + 木质握把
  box(.06,.075,.34,steel,0,.035,-.13,g);                       // 枪管
  const barrelTip = cylinder(.026,.026,.06,steel,0,.035,-.31,g,12); barrelTip.rotation.x = Math.PI/2;
  box(.05,.05,.05,edge,0,.035,-.34,g);                          // 准星
  const drum = cylinder(.058,.058,.13,steel,0,.02,.05,g,12);    // 转轮弹巢
  drum.rotation.z = Math.PI/2;
  const drumFace = cylinder(.03,.03,.135,material('#20292e',.5,.6),0,.02,.05,g,10); drumFace.rotation.z = Math.PI/2;
  for(let i=0;i<6;i++){                                         // 6 个弹巢孔
   const a = i/6*Math.PI*2;
   const hole = cylinder(.011,.011,.142,material('#151d21',.6,.4),Math.cos(a)*.04,.02+Math.sin(a)*.04,.05,g,8);
   hole.rotation.z = Math.PI/2;
  }
  box(.075,.115,.14,steel,0,.0,.12,g);                          // 机身
  box(.055,.05,.2,edge,0,.075,.0,g);                             // 上机匣
  const hammer = box(.028,.05,.05,steel,0,.105,.19,g); hammer.rotation.x = -.3;
  box(.05,.05,.03,material('#4a4038',.5,.3),0,.075,.22,g);       // 击锤握片
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.052,.009,6,14,Math.PI*1.2),steel);
  guard.position.set(0,-.06,.11); guard.rotation.set(0,Math.PI/2,0); g.add(guard);
  const grip = box(.058,.16,.075,wood,0,-.15,.13,g); grip.rotation.x = -.3;
  box(.05,.03,.02,edge,0,-.235,.155,g);                          // 握把底帽
  box(.03,.045,.035,steel,.042,.02,.05,g);                       // 击锤轴
  box(.2,.2,.19,glove,0,-.02,.24,g);
  box(.2,.21,.26,black,-.02,-.05,.46,g);
  g.scale.setScalar(.95); g.position.set(.25,-.235,-.46); g.rotation.set(0,-.02,0);
  return g;
 }
 if(ws.id === 'awp'){
  // 狙击枪：长枪管 + 瞄准镜 + 枪托 + 两脚架
  box(.085,.1,.62,steel,0,.02,-.14,g);                        // 枪身
  const barrel = cylinder(.021,.024,.56,material('#20292d',.45,.6),0,.045,-.56,g,12); barrel.rotation.x = Math.PI/2;
  const muzzle = cylinder(.032,.03,.09,steel,0,.045,-.86,g,12); muzzle.rotation.x = Math.PI/2;
  box(.05,.055,.22,edge,0,.045,-.4,g);
  // 瞄准镜
  const scope = cylinder(.038,.038,.30,material('#161d21',.35,.6),0,.135,-.16,g,14); scope.rotation.x = Math.PI/2;
  const lens = cylinder(.031,.031,.012,new THREE.MeshStandardMaterial({color:'#7fd3e8',emissive:'#2c7f96',emissiveIntensity:.6,roughness:.15,metalness:.7}),0,.135,-.31,g,14);
  lens.rotation.x = Math.PI/2;
  box(.035,.06,.05,steel,0,.09,-.19,g); box(.035,.06,.05,steel,0,.09,-.06,g);
  box(.05,.03,.13,black,0,.175,-.16,g);
  // 枪托与握把
  const stock = box(.06,.13,.36,black,0,-.03,.34,g); stock.rotation.x = -.06;
  box(.07,.16,.09,black,0,-.14,.2,g);
  const grip = box(.055,.13,.06,black,0,-.11,.19,g); grip.rotation.x = -.3;
  const mag = box(.06,.13,.09,black,0,-.13,.02,g);
  box(.055,.02,.2,steel,0,-.09,-.5,g);                        // 两脚架
  box(.02,.13,.02,steel,-.035,-.16,-.52,g); box(.02,.13,.02,steel,.035,-.16,-.52,g);
  box(.2,.2,.22,glove,0,-.05,.44,g);
  box(.21,.21,.26,black,-.02,-.06,.62,g);
  g.scale.setScalar(.8); g.position.set(.245,-.235,-.5); g.rotation.set(0,-.02,0);
  return g;
 }
 // rifles
 const long = ws.id === 'ak', bodyLen = .50;
 box(.09,.11,bodyLen,steel,0,.02,-.06,g);
 box(.095,.12,.16,black,0,.0,.16,g);
 box(.075,.05,.42,black,0,.13,-.08,g);
 box(.05,.06,.3,long?wood:black,0,-.06,-.3,g);
 const barrel = cylinder(.017,.019,long?.42:.36,black,0,.035,-.5,g,10); barrel.rotation.x = Math.PI/2;
 const muzzle = cylinder(.026,.024,.07,steel,0,.035,-.7,g,10); muzzle.rotation.x = Math.PI/2;
 box(.03,.075,.05,edge,0,.1,-.36,g);
 const magMat = long?material('#2a3238',.7,.4):black;
 const mag = box(.055,.2,.065,magMat,0,-.15,-.1,g); mag.rotation.x = long?.2:.1;
 const grip = box(.055,.15,.07,black,0,-.13,.18,g); grip.rotation.x = -.32;
 const stock = box(.055,.1,.3,long?wood:black,0,-.01,.42,g); stock.rotation.x = -.04;
 if(long){ box(.055,.02,.32,wood,0,.12,.34,g); box(.04,.04,.1,steel,0,-.12,-.4,g); }
 else { box(.05,.06,.24,black,0,.1,.34,g); box(.075,.075,.2,black,0,.0,.16,g); }
 box(.02,.05,.03,edge,.05,.05,.06,g);
 box(.09,.045,.09,black,0,.11,-.16,g); box(.02,.03,.02,black,0,.155,-.2,g);
 box(.18,.2,.22,glove,0,-.05,.28,g);
 box(.19,.21,.26,black,-.02,-.06,.5,g);
 g.scale.setScalar(.82); g.position.set(.245,-.235,-.5); g.rotation.set(0,-.02,0);
 return g;
}

/* ================= 地图构建 ================= */
function texture(kind){
 const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
 if(kind === 'brick'){
  ctx.fillStyle = '#6e5555'; ctx.fillRect(0,0,512,512);
  for(let row=0;row<16;row++)for(let col=-1;col<5;col++){
   const x = col*128+(row%2)*64, y = row*32, v = Math.floor(rand()*20);
   ctx.fillStyle = `rgb(${151+v},${101+v},${87+v})`; ctx.fillRect(x+2,y+2,124,28);
   ctx.fillStyle = '#ffffff12'; ctx.fillRect(x+3,y+3,120,2); ctx.fillStyle = '#352b3320'; ctx.fillRect(x+3,y+27,120,2);
  }
 }else if(kind === 'stone'){
  ctx.fillStyle = '#665e69'; ctx.fillRect(0,0,512,512);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
   const x = col*128+(row%2)*64, y = row*64, v = Math.floor(rand()*22);
   ctx.fillStyle = `rgb(${125+v},${117+v},${131+v})`; ctx.fillRect(x+2,y+2,124,60);
   ctx.strokeStyle = '#e0d5d12a'; ctx.strokeRect(x+4,y+4,120,56);
  }
 }else if(kind === 'plaster'){
  ctx.fillStyle = '#d2b6a0'; ctx.fillRect(0,0,512,512);
 }else if(kind === 'roof'){
  ctx.fillStyle = '#774e48'; ctx.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=64)for(let x=0;x<512;x+=32){ctx.fillStyle=`hsl(12,30%,${38+rand()*12}%)`;ctx.fillRect(x+1,y+1,30,62);ctx.fillStyle='#f4af8a32';ctx.fillRect(x+3,y+3,3,58);ctx.fillStyle='#442c3a60';ctx.fillRect(x+1,y+57,30,6);}
 }else if(kind === 'crate'){
  ctx.fillStyle = '#6b5a45'; ctx.fillRect(0,0,512,512);
  for(let i=0;i<8;i++){ctx.fillStyle=`hsl(28,18%,${30+rand()*10}%)`;ctx.fillRect(0,i*64,512,60);ctx.fillStyle='#20170f30';ctx.fillRect(0,i*64+58,512,6);}
 }
 for(let i=0;i<22000;i++){ctx.fillStyle = rand()>.5?'#fff':'#000';ctx.globalAlpha = rand()*.06;ctx.fillRect(rand()*512,rand()*512,1+rand()*3,1+rand()*3);}
 ctx.globalAlpha = 1;
 const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function box(w,h,d,mat,x=0,y=0,z=0,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(r1,r2,h,mat,x,y,z,parent=scene,n=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(r,mat,x,y,z,parent=scene,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}

const MAPS = [];
function makeMap(id, name, subtitle, zoneNames, theme, hub){
 return {id,name,subtitle,zones:zoneNames,theme,hub,floors:[],colliders:[],spots:[],navPts:[],bombsites:[],attackSpawn:new THREE.Vector3(),defendSpawn:new THREE.Vector3(),
  pickups:{armor25:new THREE.Vector3(),armor50:new THREE.Vector3(),ammo:new THREE.Vector3()},
  bombCarrier:new THREE.Vector3(),group:new THREE.Group()};
}
function addFloor(m,r){
 m.floors.push(r);
 if(r.stairs)return;
 const w = r.x2-r.x1, d = r.z2-r.z1;
 const mesh = box(w,.16,d,mats.ground,(r.x1+r.x2)/2,(r.y||0)-.08,(r.z1+r.z2)/2,m.group);
 mesh.userData.part = 'ground';
 shotMeshes.push(mesh);
 if(r.y)box(w+.2,.2,d+.2,mats.trim,(r.x1+r.x2)/2,r.y+.02,(r.z1+r.z2)/2,m.group);
}
function addStairs(m,x1,z1,x2,z2,y1,y2,dir){
 const steps = 9, w = x2-x1, d = z2-z1;
 for(let i=0;i<steps;i++){
  const t = i/steps, y = y1+(y2-y1)*t, h = (y2-y1)/steps+ .02;
  if(dir === 'z')box(w,h,d/steps,mats.trim,x1+w/2,y+h/2,z1+d*(t+.5/steps),m.group);
  else box(w/steps,h,d,mats.trim,x1+w*(t+.5/steps),y+h/2,z1+d/2,m.group);
 }
 m.colliders.push([x1,x2,z1,z2,true]);
}
function addWall(m,x1,x2,z1,z2,h,opt={}){
 const mat = opt.mat || (opt.kind === 'crate'?mats.crate:opt.kind === 'brick'?mats.brick:opt.kind === 'stone'?mats.stoneW:mats.plaster);
 const base = opt.y || 0, cx = (x1+x2)/2, cz = (z1+z2)/2, w = x2-x1, d = z2-z1;
 const mesh = box(w,h,d,mat,cx,base+h/2,cz,m.group);
 mesh.userData.part = 'wall';
 shotMeshes.push(mesh);
 m.colliders.push([x1,x2,z1,z2]);
 if(opt.trim !== false && h > 1.4){
  box(w+.22,.2,d+.22,mats.trim,cx,base+h-.1,cz,m.group);
  box(w+.14,.16,d+.14,mats.trim,cx,base+.08,cz,m.group);
 }
 if(opt.windows !== false && h > 4 && w > 2.4){
  for(let x=x1+1.4;x<x2-1.1;x+=2.6){
   const g1 = box(1,.9,.06,mats.dark,x,base+h*.55,cz + (d>w?0:0),m.group);
   if(d < w){ g1.position.z = z2+.04; box(.86,.76,.05,mats.glass,x,base+h*.55,z1-.04,m.group); }
   else { g1.rotation.y = Math.PI/2; g1.position.set(x2+.04,base+h*.55,cz); }
  }
 }
 return mesh;
}
function addColumn(m,x,z,h,size=1){
 box(size,h,size,mats.trim,x,h/2,z,m.group);
 m.colliders.push([x-size/2,x+size/2,z-size/2,z+size/2]);
}
function addCrate(m,x,z,size=1,h=1.1){
 addWall(m,x-size/2,x+size/2,z-size/2,z+size/2,h,{kind:'crate',trim:false});
 addWall(m,x+size/2,x+size/2+.5,z-size/2,z+size/2,h*.7,{kind:'crate',trim:false});
}
function addLamp(m,x,z,y=3.6){
 const pole = cylinder(.055,.07,3.2,mats.metal,x,1.6,z,m.group,8);
 const arm = box(.7,.06,.06,mats.metal,x+.3,3.24,z,m.group);
 const shade = new THREE.Mesh(new THREE.ConeGeometry(.3,.24,10),mats.metal); shade.position.set(x+.62,3.16,z); m.group.add(shade);
 box(.16,.2,.16,mats.glow,x+.62,3.04,z,m.group);
 if(lampLights.length < 4){
  const light = new THREE.PointLight('#ffbe7a',26,17,2); light.position.set(x+.62,3,z); m.group.add(light); lampLights.push(light);
 }
}
function addBanner(m,x,y,z,text,rotY,color){
 const c = document.createElement('canvas'); c.width = 256; c.height = 96; const ctx = c.getContext('2d');
 ctx.fillStyle = color; ctx.fillRect(0,0,256,96); ctx.strokeStyle = '#0e1a2060'; ctx.lineWidth = 6; ctx.strokeRect(6,6,244,84);
 ctx.fillStyle = '#f6efe0'; ctx.font = 'bold 44px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,128,50);
 const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
 const p = new THREE.Mesh(new THREE.PlaneGeometry(1.9,.7),new THREE.MeshStandardMaterial({map:t,roughness:.95,side:THREE.DoubleSide}));
 p.position.set(x,y,z); p.rotation.y = rotY; m.group.add(p);
}
function addSiteMark(m,x,z,label,color){
 const g = new THREE.Group(); g.position.set(x,0,z); m.group.add(g);
 const disc = new THREE.Mesh(new THREE.CircleGeometry(3.4,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.09,depthWrite:false}));
 disc.rotation.x = -Math.PI/2; disc.position.y = .03; disc.raycast = () => {}; g.add(disc);
 const ring = new THREE.Mesh(new THREE.RingGeometry(3.3,3.45,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.55,side:THREE.DoubleSide}));
 ring.rotation.x = -Math.PI/2; ring.position.y = .04; ring.raycast = () => {}; g.add(ring);
 const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
 ctx.fillStyle = color; ctx.font = 'bold 96px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label,64,68);
 const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
 const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.8,depthWrite:false}));
 p.rotation.x = -Math.PI/2; p.position.set(x,.05,z); m.group.add(p);
 m.bombsites.push({id:label,name:label==='A'?'A 区':'B 区',center:new THREE.Vector3(x,0,z),radius:3.4,material:disc,labelMesh:p});
}
function addSpawnMark(m,pos,team){
 const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
 ctx.strokeStyle = team === 'attack'?'#eec184':'#8cd9d5'; ctx.lineWidth = 6;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(128,128,40+i*30,0,Math.PI*2);ctx.stroke();}
 ctx.fillStyle = team === 'attack'?'#eec184':'#8cd9d5'; ctx.font = 'bold 26px Georgia'; ctx.textAlign = 'center';
 ctx.fillText(team === 'attack'?'ATTACK SPAWN':'DEFEND SPAWN',128,140);
 const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
 const p = new THREE.Mesh(new THREE.PlaneGeometry(4.4,4.4),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.5,depthWrite:false}));
 p.rotation.x = -Math.PI/2; p.position.set(pos.x,.05,pos.z); m.group.add(p);
}

/* ---- 图三：石庭要塞地面高度 ---- */
function groundAt(x,z){
 const m = MAPS[2];
 if(!m || m.id !== 'world3')return 0;
 if(x > 27 && x < 34.5 && z > 11.6 && z < 14.4)return Math.max(1.6,Math.min(3.2,1.6+(z-11.6)*.55));
 if(x > 25.5 && x < 27)return 3.2;
 if(x > 34.5 && x < 36 && z > 11.6 && z < 14.4)return Math.max(1.6,3.2-(z-11.6)*.55);
 return 0;
}

/* ---- 一号世界：双区巷战（完全对称） ---- */
function buildWorld1(m){
 addFloor(m,{x1:-26,x2:26,z1:-36,z2:36,name:0});
 for(let x=-26;x<=26;x+=4)for(let z=-36;z<=36;z+=4){const p = box(.6,.02,.6,mats.trim,x,.012,z,m.group); p.castShadow = false;}
 // 外围围墙
 addWall(m,-27,-26,-36,36,7.5,{kind:'brick'}); addWall(m,26,27,-36,36,7.5,{kind:'brick'});
 addWall(m,-26,26,-37,-36,7.5,{kind:'brick'}); addWall(m,-26,26,36,37,7.5,{kind:'brick'});
 addColumn(m,-26,-36,7.5,1.4); addColumn(m,26,-36,7.5,1.4); addColumn(m,-26,36,7.5,1.4); addColumn(m,26,36,7.5,1.4);
 addBanner(m,-25.94,5,-20,'FORNO',Math.PI/2,'#33484a'); addBanner(m,25.94,5,18,'MERCATO',-Math.PI/2,'#4a3a35');
 // 中央庭院隔墙：中路留 8 米宽通道（|x|<4 全通），墙上开两个包点门洞（|x|∈[11,13] 通行）
 addWall(m,-26,-13,-1.4,1.4,5.4,{kind:'brick'}); addWall(m,-11,-4,-1.4,1.4,5.4,{kind:'brick'});
 addWall(m,4,11,-1.4,1.4,5.4,{kind:'brick'}); addWall(m,13,26,-1.4,1.4,5.4,{kind:'brick'});
 addWall(m,-13,-11,-1.4,1.4,.9,{kind:'crate',trim:false}); addWall(m,11,13,-1.4,1.4,.9,{kind:'crate',trim:false});
 addWall(m,-25,-19,1.4,8,2.4,{kind:'stone',trim:true}); addWall(m,19,25,-8,-1.4,2.4,{kind:'stone',trim:true});
 addCrate(m,-10.5,6.5,1.5,1.15); addCrate(m,10.5,-6.5,1.5,1.15);
 // 中路两侧门柱
 addWall(m,-2.2,-1,-13,-10.5,3.2,{kind:'stone'}); addWall(m,1,2.2,10.5,13,3.2,{kind:'stone'});
 addLamp(m,-3.2,-9); addLamp(m,3.2,9); addLamp(m,-16.5,-2.4); addLamp(m,16.5,2.4);
 // A 区（-x 侧）
 addWall(m,-26,-15,-19,-18,4.2,{kind:'brick'}); addWall(m,-26,-15,18,19,4.2,{kind:'brick'});
 addWall(m,-15,-14,-19,-10.5,4.2,{kind:'stone'}); addWall(m,-15,-14,10.5,19,4.2,{kind:'stone'});
 // 厅内两条矮掩体（保留掩体感，但不阻断通行）
 addWall(m,-23,-16,-11.6,-11,1.2,{kind:'crate',trim:false}); addWall(m,-23,-16,11,11.6,1.2,{kind:'crate',trim:false});
 addWall(m,-26,-14,-10,-9,1.3,{kind:'crate',trim:false}); addWall(m,-26,-14,9,10,1.3,{kind:'crate',trim:false});
 // 包点厅与中路之间的门洞（|x|∈[12,14] 处的隔墙已留空，这里补上门框）
 addWall(m,-14,-13.4,-9,-8.2,3.6,{kind:'stone'}); addWall(m,-14,-13.4,8.2,9,3.6,{kind:'stone'});
 addWall(m,-14,-13,-26,-18.5,3.4,{kind:'stone'});
 addCrate(m,-16.5,-15.5,1.6); addCrate(m,-15.5,15.5,1.6); addCrate(m,-12.5,-5.5,1.3); addCrate(m,-12.5,5.5,1.3);
 addSiteMark(m,-19,-4,'A','#eec184');
 // B 区（+x 侧）
 addWall(m,15,26,-19,-18,4.2,{kind:'brick'}); addWall(m,15,26,18,19,4.2,{kind:'brick'});
 addWall(m,14,15,-19,-11,4.2,{kind:'stone'}); addWall(m,14,15,11,19,4.2,{kind:'stone'});
 addWall(m,16,23,-11.6,-11,1.2,{kind:'crate',trim:false}); addWall(m,16,23,11,11.6,1.2,{kind:'crate',trim:false});
 addWall(m,14,15,-10,-9,1.3,{kind:'crate',trim:false}); addWall(m,14,15,9,10,1.3,{kind:'crate',trim:false});
 addWall(m,13,14,-26,-18.5,3.4,{kind:'stone'});
 addCrate(m,16.5,15.5,1.6); addCrate(m,15.5,-15.5,1.6); addCrate(m,12.5,5.5,1.3); addCrate(m,12.5,-5.5,1.3);
 addSiteMark(m,19,4,'B','#8cd9d5');
 // 两个重生点小院（中间留 6 米宽的院门，保证与主战场连通）
 addWall(m,-11,-3,-26,-25,2.8,{kind:'stone'}); addWall(m,3,11,-26,-25,2.8,{kind:'stone'});
 addWall(m,-11,-3,25,26,2.8,{kind:'stone'}); addWall(m,3,11,25,26,2.8,{kind:'stone'});
 addColumn(m,-11,-25.6,2.8,1.2); addColumn(m,11,-25.6,2.8,1.2); addColumn(m,-11,25.6,2.8,1.2); addColumn(m,11,25.6,2.8,1.2);
 addSpawnMark(m,new THREE.Vector3(0,0,29),'attack'); addSpawnMark(m,new THREE.Vector3(0,0,-29),'defend');
 m.attackSpawn.set(0,0,29); m.defendSpawn.set(0,0,-29);
 m.pickups.armor25.set(-3.2,0,30.5); m.pickups.armor50.set(3.2,0,30.5); m.pickups.ammo.set(0,0,32.2);
 m.bombCarrier.set(-5.6,0,30.5);
 m.spots = [
  {t:'A',x:-19,z:-4},{t:'A',x:-21,z:-4.5},{t:'A',x:-17,z:-4},{t:'A',x:-23,z:-4},
  {t:'B',x:19,z:4},{t:'B',x:21,z:4.5},{t:'B',x:17,z:4},{t:'B',x:23,z:4},
  {t:'D',x:0,z:-6},{t:'D',x:0,z:-16},{t:'D',x:-6,z:-3},{t:'D',x:6,z:3}
 ];
 // 导航点全部落在净宽 ≥1.6m 的通道中央（中路 8m、双侧走廊 4m、包点厅内）
 m.navPts = [[0,28],[0,20],[0,12],[0,5],[0,-5],[0,-12],[0,-20],[0,-28],
  [-9,11],[-13,11],[-20,11],[-21,-8],[-12,-8],[-9,-4],
  [-12,9],[-12,3],[-19,7],[-19,-7],[-17,0],[-22,0],
  [9,-11],[13,-11],[20,-11],[21,8],[12,8],[9,4],
  [12,-9],[12,-3],[19,-7],[19,7],[17,0],[22,0]];
}
/* ---- 二号世界：回廊仓库 ---- */
function buildWorld2(m){
 addFloor(m,{x1:-25,x2:25,z1:-35,z2:35,name:0});
 for(let x=-24;x<=24;x+=4)for(let z=-34;z<=34;z+=4){const p = box(.55,.02,.55,mats.dark,x,.012,z,m.group); p.castShadow = false;}
 addWall(m,-26,-25,-35,35,7,{kind:'brick'}); addWall(m,25,26,-35,35,7,{kind:'brick'});
 addWall(m,-25,25,-36,-35,7,{kind:'brick'}); addWall(m,-25,25,35,36,7,{kind:'brick'});
 addColumn(m,-25,-35,7,1.4); addColumn(m,25,-35,7,1.4); addColumn(m,-25,35,7,1.4); addColumn(m,25,35,7,1.4);
 // 中央建筑：外墙 14..18，南北门洞 |x|<4，东西门洞 |z|<3.5，外环走廊净宽 7m
 addWall(m,-18,-4,14,18,6.2,{kind:'brick'}); addWall(m,4,18,14,18,6.2,{kind:'brick'});
 addWall(m,-18,-4,-18,-14,6.2,{kind:'brick'}); addWall(m,4,18,-18,-14,6.2,{kind:'brick'});
 addWall(m,-18,-14,-14,14,6.2,{kind:'brick'}); addWall(m,14,18,-14,14,6.2,{kind:'brick'});
 // 内部大厅隔墙（左右各一道，中间穿廊贯通）
 addWall(m,-12,-4,-11,-6,4.4,{kind:'brick'}); addWall(m,4,12,6,11,4.4,{kind:'brick'});
 addWall(m,-12,-11,-4,4,4.4,{kind:'brick'}); addWall(m,11,12,-4,4,4.4,{kind:'brick'});

 addWall(m,-9,-4,3,3.8,3,{kind:'crate'}); addWall(m,4,9,-3.8,-3,3,{kind:'crate'});
 addCrate(m,-16,-15,1.4); addCrate(m,16,15,1.4);
 addColumn(m,-4,4,6.2,1.3); addColumn(m,4,-4,6.2,1.3);
 addLamp(m,-21,-22); addLamp(m,21,22); addLamp(m,-21,22); addLamp(m,21,-22);
 // A 区（西侧内厅）B 区（东侧内厅）
 addSiteMark(m,-21,0,'A','#eec184'); addSiteMark(m,21,0,'B','#8cd9d5');
 addWall(m,-22,-14,10,10.8,2.6,{kind:'stone'});
 addWall(m,14,22,-10.8,-10,2.6,{kind:'stone'});
 addSpawnMark(m,new THREE.Vector3(0,0,30),'attack'); addSpawnMark(m,new THREE.Vector3(0,0,-30),'defend');
 m.attackSpawn.set(0,0,30); m.defendSpawn.set(0,0,-30);
 m.pickups.armor25.set(-4,0,31.5); m.pickups.armor50.set(4,0,31.5); m.pickups.ammo.set(0,0,33);
 m.bombCarrier.set(-7,0,31.5);
 m.spots = [
  {t:'A',x:-21,z:-6},{t:'A',x:-21,z:6},{t:'A',x:-9,z:0},{t:'A',x:-21,z:18},
  {t:'B',x:21,z:6},{t:'B',x:21,z:-6},{t:'B',x:9,z:0},{t:'B',x:21,z:-18},
  {t:'D',x:0,z:-24},{t:'D',x:-6,z:-5},{t:'D',x:6,z:5}
 ];
 // 外环走廊（|x| 18~26 或 |z| 18~26），大厅穿廊 |x|<4 且 |z|<10
 m.navPts = [[0,30],[0,23],[0,17],[0,10],[0,3],[0,-3],[0,-10],[0,-17],[0,-23],[0,-30],
  [-6,20],[-18,22],[-22,14],[-22,0],[-22,-14],[-18,-22],[-6,-20],
  [6,-20],[18,-22],[22,-14],[22,0],[22,14],[18,22],[6,20],
  [-8,0],[8,0],[-9,12],[9,12],[-9,-12],[9,-12],
  [-16,10],[-16,-10],[-19,0],[16,-10],[16,10],[19,0]];
}
/* ---- 三号世界：石庭要塞（高低差 + 楼梯） ---- */
function buildWorld3(m){
 addFloor(m,{x1:-30,x2:30,z1:-34,z2:34,name:0});
 addFloor(m,{x1:25.5,x2:36,z1:10,z2:16,y:3.2,name:3});
 addFloor(m,{x1:-36,x2:-25.5,z1:-16,z2:-10,y:3.2,name:4});
 addStairs(m,27,11.6,34.5,14.4,0,3.2,'z'); addStairs(m,-34.5,-14.4,-27,-11.6,0,3.2,'z');
 for(let x=-29;x<=29;x+=4)for(let z=-33;z<=33;z+=4){const p = box(.55,.02,.55,mats.trim,x,.012,z,m.group); p.castShadow = false;}
 addWall(m,-31,-30,-34,34,8,{kind:'stone'}); addWall(m,30,31,-34,34,8,{kind:'stone'});
 addWall(m,-30,30,-35,-34,8,{kind:'stone'}); addWall(m,-30,30,34,35,8,{kind:'stone'});
 addColumn(m,-30,-34,8,1.5); addColumn(m,30,-34,8,1.5); addColumn(m,-30,34,8,1.5); addColumn(m,30,34,8,1.5);
 // 两侧高台护栏
 addWall(m,25.5,36,16,16.6,4.4,{kind:'stone'}); addWall(m,-36,-25.5,-16.6,-16,4.4,{kind:'stone'});
 addWall(m,-27,-26,-16,-10,4.4,{kind:'stone'}); addWall(m,26,27,10,16,4.4,{kind:'stone'});
 // 中路石廊
 addWall(m,-3,-2,-24,-6,4.6,{kind:'brick'}); addWall(m,2,3,6,24,4.6,{kind:'brick'});
 addWall(m,-3,3,-24,-23.2,3,{kind:'stone'}); addWall(m,-3,3,23.2,24,3,{kind:'stone'});
 addColumn(m,-2.5,0,4.6,1.3); addColumn(m,2.5,0,4.6,1.3);
 addCrate(m,-8,0,1.7); addCrate(m,8,0,1.7); addCrate(m,-6,-18,1.5); addCrate(m,6,18,1.5);
 addLamp(m,-4,20); addLamp(m,4,-20); addLamp(m,-14,2); addLamp(m,14,-2);
 // A 区（西侧，含高墙）
 addWall(m,-30,-20,-10,-8,5,{kind:'brick'}); addWall(m,-30,-20,8,10,5,{kind:'brick'});
 addWall(m,-20,-19,-10,-6,5,{kind:'stone'}); addWall(m,-20,-19,6,10,5,{kind:'stone'});
 addSiteMark(m,-24,0,'A','#eec184');
 // B 区（东侧）
 addWall(m,20,30,-10,-8,5,{kind:'brick'}); addWall(m,20,30,8,10,5,{kind:'brick'});
 addWall(m,19,20,-10,-6,5,{kind:'stone'}); addWall(m,19,20,6,10,5,{kind:'stone'});
 addSiteMark(m,24,0,'B','#8cd9d5');
 addSpawnMark(m,new THREE.Vector3(0,0,30),'attack'); addSpawnMark(m,new THREE.Vector3(0,0,-30),'defend');
 m.attackSpawn.set(0,0,30); m.defendSpawn.set(0,0,-30);
 m.pickups.armor25.set(-4,0,31.5); m.pickups.armor50.set(4,0,31.5); m.pickups.ammo.set(0,0,33.5);
 m.bombCarrier.set(-7.5,0,31.5);
 m.spots = [
  {t:'A',x:-21,z:-6},{t:'A',x:-21,z:6},{t:'A',x:-21,z:2},{t:'A',x:-21,z:-2},
  {t:'B',x:21,z:6},{t:'B',x:21,z:-6},{t:'B',x:21,z:2},{t:'B',x:21,z:-2},
  {t:'D',x:0,z:-26},{t:'D',x:-7,z:-5},{t:'D',x:7,z:-5}
 ];
 // 中路石廊净宽 4m（|x|<2），A/B 区入口在 |z|<2 的缺口
 m.navPts = [[0,30],[0,26],[0,20],[0,12],[0,4],[0,-4],[0,-12],[0,-20],[0,-26],[0,-30],
  [-8,16],[-15,16],[-16,6],[-15,-16],[-9,-15],[-8,-20],
  [8,-16],[15,-16],[16,-6],[15,16],[9,15],[8,20],
  [-6,0],[6,0],[-24,10],[24,-10],[-6,14],[6,-14],[-17,0],[17,0],[-21,0],[21,0]];
}

/* ---- 旧世界：训练场（沿用原街巷） ---- */
const TRAIN_ROUTE = [];
function buildTrain(m){
 const streets = [[-3,3,-9,17],[-3,19,-12,-6],[13,19,-30,-6],[3,24,-40,-25]];
 m.streets = streets;
 addFloor(m,{x1:-45,x2:55,z1:-70,z2:35,name:0});
 const building = (x1,x2,z1,z2,h,mat)=>{const w = x2-x1,d = z2-z1,cx = (x1+x2)/2,cz = (z1+z2)/2;addWall(m,x1,x2,z1,z2,h,{mat,trim:true});box(w+.8,.45,d+.8,mats.roof,cx,h+.15,cz,m.group);};
 building(-14,-3,-25,20,9,mats.plaster); building(3,13,-6,20,8,mats.brick);
 building(-3,13,-25,-12,10,mats.plaster); building(19,30,-25,7,11,mats.brick);
 building(-8,3,-44,-25,9,mats.brick); building(3,26,-49,-40,10,mats.plaster); building(24,33,-44,-25,8,mats.plaster);
 // 入口封门
 box(6,4,.35,mats.dark,0,2,17.5,m.group); for(let x=-2.7;x<3;x+=.4)box(.05,3,.07,mats.metal,x,1.8,17.25,m.group);
 m.colliders.push([-3.2,3.2,17.2,17.9]);
 // 街口牌匾
 const sign = (x,y,z,text,rot)=>{const c = document.createElement('canvas');c.width = 512;c.height = 192;const ctx = c.getContext('2d');ctx.fillStyle = '#33484a';ctx.fillRect(0,0,512,192);ctx.strokeStyle = '#cbb78f';ctx.lineWidth = 5;ctx.strokeRect(12,12,488,168);ctx.fillStyle = '#e7d5b3';ctx.textAlign = 'center';ctx.font = '48px Georgia';ctx.fillText(text,256,104);ctx.font = '16px Georgia';ctx.fillText('BOTTEGA · DAL 1926',256,145);const t = new THREE.CanvasTexture(c);t.colorSpace = THREE.SRGBColorSpace;const g = new THREE.Group();g.position.set(x,y,z);g.rotation.y = rot;m.group.add(g);box(2.4,.95,.12,mats.wood,0,0,0,g);const p = new THREE.Mesh(new THREE.PlaneGeometry(2.3,.86),new THREE.MeshStandardMaterial({map:t,roughness:.9}));p.position.z = .07;g.add(p);};
 sign(-2.8,3.4,3,'FORNO',Math.PI/2); sign(7.5,3.6,-5.76,'MERCATO',0);
 // 街边木箱与花盆
 for(const [x,z,w,h,d] of [[3.8,-7.1,.8,.75,.8],[12,-10.9,1.1,.75,.85],[18.2,-21,.8,.9,.8],[4,-30,1.1,.7,1]]){
  addWall(m,x-w/2,x+w/2,z-d/2,z+d/2,h,{kind:'crate',trim:false});
 }
 for(const r of streets){const [x1,x2] = r; for(const x of [x1+.13,x2-.13])box(.22,.08,r[3]-r[2],mats.trim,x,.015,(r[2]+r[3])/2,m.group);}
 m.attackSpawn.set(0,0,14); m.defendSpawn.set(0,0,14);
 m.train = true;
 m.trainPositions = [[-1.5,5],[1.5,-2],[-1.6,-8.6],[6.5,-8.7],[11.3,-7.5],[16.2,-10],[16.7,-17],[14.6,-24],[7,-28.5],[21,-29.2],[7.5,-36.3],[20.5,-37.8]];
}

/* ---- 训练场目标 ---- */
function makeTarget(id,x,z){
 const g = new THREE.Group(); g.position.set(x,0,z); g.rotation.y = (id%3-1)*.3; MAPS[3].group.add(g);
 g.updateMatrixWorld(true);
 const bodyMat = material('#34464e',.55,.4), edge = material('#849a9b',.5,.45), orange = material('#dc9d67',.5,.3);
 const visor = new THREE.MeshStandardMaterial({color:'#72e4db',emissive:'#36aaa8',emissiveIntensity:.8,roughness:.25,metalness:.5});
 const meshes = [];
 const mark = (o,part)=>{o.userData = {target:id,part};o.userData.agent = null;meshes.push(o);shotMeshes.push(o);return o;};
 const head = mark(sphere(.205,edge,0,1.61,0,g,1,1.13,.95),'head');
 mark(box(.34,.105,.12,visor,0,1.64,.16,g),'head');
 // 躯干
 mark(box(.41,.48,.26,bodyMat,0,1.15,0,g),'body');
 mark(box(.35,.27,.025,edge,0,1.2,.145,g),'body');   // 胸前装甲板
 mark(box(.08,.17,.025,orange,0,1.2,.166,g),'body');  // 胸口橙色标记
 mark(box(.3,.17,.24,bodyMat,0,.82,0,g),'body');
 for(const s of [-1,1]){
  mark(cylinder(.075,.07,.55,bodyMat,s*.12,.48,0,g),'body');            // 腿
  mark(sphere(.08,edge,s*.12,.65,0,g),'body');                          // 膝
  mark(box(.13,.1,.26,bodyMat,s*.12,.15,.055,g),'body');                // 脚
  const arm = mark(cylinder(.065,.065,.43,bodyMat,s*.29,1.13,.015,g),'body'); arm.rotation.z = s*.13;
  mark(sphere(.085,orange,s*.26,1.37,0,g),'body');                      // 肩
 }
 mark(cylinder(.34,.38,.07,mats.dark,0,.035,0,g,24),'body');            // 底座
 targets.push({id,group:g,meshes,outline:null,hp:100,dead:false,death:0,headPos:new THREE.Vector3(x,1.61,z),visibleFor:0,candidate:null,first:null,angle:null,killTime:null,headKill:false});
}

/* ---- 场景装配 ---- */
function disposeScene(){
 for(const o of scene.children.slice()){
  if(o === camera || o.isLight || o === sky)continue;
  scene.remove(o);
  o.traverse(c => {if(c.geometry)c.geometry.dispose();});
 }
 shotMeshes.length = 0; targets.length = 0; headLines.length = 0; lampLights.length = 0; dyn.length = 0;
}
function makeScene(){
 renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
 $('world').appendChild(renderer.domElement);
 scene = new THREE.Scene(); scene.background = new THREE.Color('#718290'); scene.fog = new THREE.Fog('#85919a',38,120);
 camera = new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.08,180); camera.rotation.order = 'YXZ'; scene.add(camera);
 const skyCanvas = document.createElement('canvas'); skyCanvas.width = 2; skyCanvas.height = 256;
 const sc = skyCanvas.getContext('2d'), grad = sc.createLinearGradient(0,0,0,256);
 grad.addColorStop(0,'#253c58'); grad.addColorStop(.45,'#74858f'); grad.addColorStop(.75,'#d0a497'); grad.addColorStop(1,'#d5b5a0');
 sc.fillStyle = grad; sc.fillRect(0,0,2,256);
 const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
 sky = new THREE.Mesh(new THREE.SphereGeometry(150,24,16),new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,depthWrite:false})); scene.add(sky);
 scene.add(new THREE.HemisphereLight('#b9d8ee','#77576a',2.1));
 sun = new THREE.DirectionalLight('#ffcea1',3.1); sun.position.set(-22,34,8); sun.castShadow = true;
 sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-46,right:46,top:46,bottom:-46,near:1,far:120}); sun.target.position.set(0,0,0); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
 scene.add(sun,sun.target);
 const fill = new THREE.DirectionalLight('#9dbfde',.85); fill.position.set(24,14,-34); scene.add(fill);
 const brick = texture('brick'); brick.repeat.set(2,2);
 const stone = texture('stone'); stone.repeat.set(20,24);
 const plaster = texture('plaster'); plaster.repeat.set(2,2);
 const roof = texture('roof'); roof.repeat.set(3,2);
 const crate = texture('crate'); crate.repeat.set(1,1);
 mats = {
  brick:new THREE.MeshStandardMaterial({map:brick,roughness:.92}),
  plaster:new THREE.MeshStandardMaterial({map:plaster,roughness:.96}),
  roof:new THREE.MeshStandardMaterial({map:roof,roughness:.9}),
  ground:new THREE.MeshStandardMaterial({map:stone,roughness:.88}),
  stoneW:new THREE.MeshStandardMaterial({map:plaster,color:'#b6b0a8',roughness:.95}),
  crate:new THREE.MeshStandardMaterial({map:crate,roughness:.95}),
  trim:material('#d4bbaa'), dark:material('#39454b'), wood:material('#77614f'),
  metal:material('#354147',.45,.55), glass:material('#233e4c',.3,.4),
  glow:new THREE.MeshStandardMaterial({color:'#f6d699',emissive:'#ffc068',emissiveIntensity:2}),
  line:new THREE.MeshBasicMaterial({color:'#8cd9d5',transparent:true,opacity:.65})
 };
 const defs = [
  ['world1','一号世界','双区巷战',['攻方重生','中路','A 区','B 区','守方重生'],null],
  ['world2','二号世界','回廊仓库',['攻方重生','外环回廊','A 区','B 区','守方重生'],null],
  ['world3','三号世界','石庭要塞',['攻方重生','中庭','A 区','B 区','守方重生'],null],
  ['train','旧世界','暮色市场训练场',['入口巷道','市场区','拱门庭院','深处庭口'],null]
 ];
 MAPS.length = 0;
 defs.forEach((d,i) => { const m = makeMap(d[0],d[1],d[2],d[3],null,null); m.group.name = d[0]; scene.add(m.group); MAPS.push(m); });
 buildWorld1(MAPS[0]); buildWorld2(MAPS[1]); buildWorld3(MAPS[2]); buildTrain(MAPS[3]);
 MAPS[0].group.visible = MAPS[1].group.visible = MAPS[2].group.visible = MAPS[3].group.visible = false;
 MAPS[3].trainPositions.forEach(([x,z],i) => makeTarget(i,x,z));
 // 训练头线（仅旧世界练习模式）
 const lineSegments = [[-2.97,1.6,5,0,18],[2.97,1.6,6,0,17],[7.5,1.6,-11.97,10,0],[19.02,1.6,-18,0,12],[3.03,1.6,-33,0,11],[14,1.6,-39.97,17,0]];
 for(const [x,y,z,w,d] of lineSegments){const o = box(w||.025,.025,d||.025,mats.line,x,y,z,MAPS[3].group); o.castShadow = false; headLines.push(o);}
 // 场景装饰：远景剪影
 for(let i=0;i<10;i++)box(5,8+rand()*7,5,mats.plaster,-30+i*8,4,-62-rand()*8,MAPS[3].group);
 sky.skyTex = skyTex;
 makeGun();
 buildBotPool();
 applyMap(MAPS[0]);
}
/* 可命中物体 = 当前地图的全部网格 + 训练靶 + 人机。
   Raycaster 不检查 visible，若不在此收窄，隐藏地图的墙会把子弹全部挡掉。 */
function collectShotMeshes(){
 shotMeshes.length = 0;
 const m = activeMap;
 m.group.traverse(o => {if(o.isMesh){if(o.userData.part === undefined)o.userData.part = 'prop'; shotMeshes.push(o);}});
 if(m.train)for(const t of targets)shotMeshes.push(...t.meshes);
 for(const a of bots)if(a.alive)shotMeshes.push(...a.meshes);
}
function applyMap(m){
 for(const mp of MAPS){mp.group.visible = mp === m;}
 colliders = m.colliders; floors = m.floors; activeMap = m;
 collectShotMeshes();
 if(m === undefined)return;
 if(m.theme){scene.background = new THREE.Color(m.theme.bg); scene.fog.color.set(m.theme.fog);}
 sun.target.position.set(m.hub||new THREE.Vector3(0,0,0));
 sun.shadow.camera.updateProjectionMatrix();
 const span = 46; Object.assign(sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span}); sun.shadow.camera.updateProjectionMatrix();
}

/* ---- 人机模型池 ---- */
const bots = [], bodyParts = [];
function buildBotPool(){
 for(let i=0;i<10;i++){
  const team = i < 5 ? 'attack' : 'defend';
  const suit = team === 'attack'?{base:'#5c5340',accent:'#eec184',dark:'#3a352a'}:{base:'#384b52',accent:'#8cd9d5',dark:'#25343a'};
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const suitMat = material(suit.base,.72,.08), darkMat = material(suit.dark,.75,.1), accentMat = material(suit.accent,.55,.2);
  const skin = material('#c9a184',.85,0), visor = new THREE.MeshStandardMaterial({color:suit.accent,emissive:suit.accent,emissiveIntensity:.55,roughness:.3,metalness:.5});
  const meshes = [];
  const part = (o,name)=>{o.userData = {agent:i,part:name};meshes.push(o);shotMeshes.push(o);g.add(o);return o;};
  const hip = part(box(.38,.2,.24,darkMat,0,.92,0),'body');
  const torso = part(box(.46,.52,.28,suitMat,0,1.3,0),'body');
  part(box(.48,.1,.3,accentMat,0,1.12,0),'body'); part(box(.1,.09,.06,accentMat,0,1.4,.16),'body');
  part(box(.26,.16,.2,darkMat,0,1.24,-.2),'body');
  const head = part(sphere(.145,skin,0,1.69,0),'head');
  part(box(.28,.11,.26,darkMat,0,1.76,0),'head');
  part(box(.2,.055,.1,visor,0,1.68,.125),'head');
  const armR = part(cylinder(.065,.06,.42,suitMat,.3,1.3,.04),'body'); armR.rotation.z = .12;
  const armL = part(cylinder(.065,.06,.42,suitMat,-.3,1.3,.04),'body'); armL.rotation.z = -.12;
  const legR = part(cylinder(.085,.075,.82,darkMat,.12,.46,0),'body');
  const legL = part(cylinder(.085,.075,.82,darkMat,-.12,.46,0),'body');
  const weapon = new THREE.Group();
  weapon.add(new THREE.Mesh(new THREE.BoxGeometry(.07,.1,.5),material('#232f34',.5,.5)));
  weapon.add(new THREE.Mesh(new THREE.BoxGeometry(.04,.03,.4),material('#161f22',.5,.5)));
  weapon.position.set(.2,1.16,-.28); g.add(weapon);
  const muzzle = new THREE.Object3D(); muzzle.position.set(.2,1.18,-.58); g.add(muzzle);
  const flashMesh = new THREE.Mesh(new THREE.ConeGeometry(.09,.22,5),new THREE.MeshBasicMaterial({color:'#ffd27c',transparent:true,opacity:.9,depthWrite:false}));
  flashMesh.rotation.x = -Math.PI/2; flashMesh.position.set(.2,1.18,-.68); flashMesh.visible = false; g.add(flashMesh);
  const marker = new THREE.Mesh(new THREE.ConeGeometry(.13,.24,4),new THREE.MeshBasicMaterial({color:suit.accent,transparent:true,opacity:.85,depthWrite:false}));
  marker.position.set(0,2.1,0); marker.rotation.x = Math.PI; g.add(marker);
  // 队友名牌：青色底 + 名字，敌对不显示
  const nameCanvas = document.createElement('canvas'); nameCanvas.width = 256; nameCanvas.height = 64;
  const nameTex = new THREE.CanvasTexture(nameCanvas); nameTex.colorSpace = THREE.SRGBColorSpace;
  const namePlate = new THREE.Mesh(new THREE.PlaneGeometry(1.15,.29),new THREE.MeshBasicMaterial({map:nameTex,transparent:true,depthWrite:false,depthTest:false}));
  namePlate.position.set(0,2.28,0); namePlate.renderOrder = 6; g.add(namePlate);
  const barGroup = new THREE.Group(); barGroup.position.set(0,1.98,0);
  const barBg = new THREE.Mesh(new THREE.PlaneGeometry(.5,.06),new THREE.MeshBasicMaterial({color:'#0d1519',transparent:true,opacity:.7,depthWrite:false}));
  const barFg = new THREE.Mesh(new THREE.PlaneGeometry(.5,.06),new THREE.MeshBasicMaterial({color:'#8bd2ba',depthWrite:false}));
  barFg.position.z = .002; barGroup.add(barBg,barFg); g.add(barGroup);
  const agent = {
   index:i, team, group:g, meshes, parts:{torso,head,legR,legL,armR,armL,hip}, weapon, muzzle, flashMesh, marker, barGroup, barFg,
   namePlate, nameCanvas, nameTex, plateText:'',
   pos:new THREE.Vector3(), yaw:0, hp:100, armor:0, alive:false, name:'', skill:1, hasBomb:false, bombSite:null,
   path:[], pathIndex:0, repath:0, think:0, fireCd:0, burst:0, phase:'advance', spot:null, stuckT:0, lastPos:new THREE.Vector3(),
   muzzleT:0, strafe:0, phaseT:0, plantT:0, blindUntil:0
  };
  bots.push(agent); bodyParts.push(...meshes);
 }
}
function gunFlashBot(a){
 a.flashMesh.visible = true; a.muzzleT = .055;
 const time = audio?audio.currentTime:0;
 if(audio && volume && time >= 0 && a.pos.distanceTo(player) < 32){
  const gain = audio.createGain(); gain.connect(audio.destination);
  const osc = audio.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(180,time); osc.frequency.exponentialRampToValueAtTime(60,time+.1);
  const dist = a.pos.distanceTo(player); gain.gain.setValueAtTime(volume*.13*Math.max(0,1-dist/32),time); gain.gain.exponentialRampToValueAtTime(.001,time+.12);
  osc.connect(gain); osc.start(); osc.stop(time+.13);
 }
}

/* ---- 视角内武器模型 ---- */
const gunModels = {};
function makeGun(){
 gun = new THREE.Group(); camera.add(gun);
 for(const id of SLOT_ORDER){const g = makeWeapon(WEAPONS[id]); g.visible = false; gun.add(g); gunModels[id] = g;}
 const fg = new THREE.ConeGeometry(.1,.24,5); fg.rotateX(-Math.PI/2);
 flash = new THREE.Mesh(fg,new THREE.MeshBasicMaterial({color:'#ffce78',transparent:true,opacity:.92})); flash.position.set(0,.02,-.95); gun.add(flash); flash.visible = false;
}

/* ---- 物理碰撞与地面 ---- */
function inLadder(m,x,z){
 return m.floors.some(r => r.stairs && x > r.x1-.05 && x < r.x2+.05 && z > r.z1-.05 && z < r.z2+.05);
}
function surfaceAt(m,x,z,prevY){
 let best = 0;
 for(const r of m.floors){
  if(r.stairs)continue;
  const y = r.y||0;
  if(y > prevY + .35)continue;
  if(x < r.x1 || x > r.x2 || z < r.z1 || z > r.z2)continue;
  if(y > best)best = y;
 }
 return best;
}
/* 玩家跳跃用：脚下真实地面高度（三号世界的楼梯坡面也算） */
const GRAVITY = 18, JUMP_SPEED = 6.2;
function groundHeightAt(m,x,z){
 let best = 0;
 for(const r of m.floors){
  const y = r.stairs?0:(r.y||0);
  if(x < r.x1 || x > r.x2 || z < r.z1 || z > r.z2)continue;
  if(y > best)best = y;
 }
 return best+(m.id === 'world3'?groundAt(x,z):0);
}
function playerFloorAt(m,x,z){return groundHeightAt(m,x,z);}
function validPosition(x,z,y=0,radius=.3){
 const m = activeMap;
 if(m.train){
  for(const [dx,dz] of [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]])
   if(!m.streets.some(r => x+dx > r[0] && x+dx < r[1] && z+dz > r[2] && z+dz < r[3]))return false;
 }
 return !m.colliders.some(c => !c[4] && y < 2.4 && x+radius > c[0] && x-radius < c[1] && z+radius > c[2] && z-radius < c[3]);
}
/* 人机专用：楼梯区域不做水平碰撞，改用梯形地面高度 */
/* 人机专用站立判定：只有“脚下真实地面”在 2.4 米以下时，矮墙才算阻挡；
   站在高台上（3.2 米平台）时不会被下面的矮墙挡住 */
function botPositionOk(x,z,y,radius){
 const m = activeMap;
 if(m.train){
  for(const [dx,dz] of [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]])
   if(!m.streets.some(r => x+dx > r[0] && x+dx < r[1] && z+dz > r[2] && z+dz < r[3]))return false;
 }
 const floorY = m.id === 'world3'?groundAt(x,z):0;
 for(const c of m.colliders){
  if(c[4])continue;
  if(floorY >= 2.4)break;
  if(x+radius > c[0] && x-radius < c[1] && z+radius > c[2] && z-radius < c[3])return false;
 }
 return true;
}
function segClear(m,x,z,dx,dz){
 const steps = Math.max(2,Math.ceil(Math.hypot(dx,dz)/.42)), r = .34;
 for(let i=1;i<=steps;i++){
  const px = x+dx*i/steps, pz = z+dz*i/steps;
  if(m.train && !inLadder(m,px,pz)){
   let inside = false;
   for(const s of m.streets)if(px > s[0] && px < s[1] && pz > s[2] && pz < s[3]){inside = true;break;}
   if(!inside)return false;
  }
  for(const c of m.colliders)if(!c[4] && px+r > c[0] && px-r < c[1] && pz+r > c[2] && pz-r < c[3])return false;
 }
 return true;
}
function losClear(ax,az,bx,bz){
 const m = activeMap, dx = bx-ax, dz = bz-az, steps = Math.max(2,Math.ceil(Math.hypot(dx,dz)/.6));
 for(let i=1;i<steps;i++){
  const px = ax+dx*i/steps, pz = az+dz*i/steps;
  for(const c of m.colliders)if(!c[4] && px > c[0] && px < c[1] && pz > c[2] && pz < c[3])return false;
 }
 return true;
}
function nearestPoint(m,x,z){
 let best = null, bd = 1e9;
 for(const p of m.navPts){const d = (p[0]-x)**2+(p[1]-z)**2; if(d < bd){bd = d;best = p;}}
 return best;
}
/* 把目标点吸附到附近的可行走位置，避免终点落在墙体里 */
function snapWalkable(m,x,z){
 if(segClear(m,x,z,0,0))return [x,z];
 for(let r=.5;r<=3.2;r+=.5){
  for(let i=0;i<12;i++){
   const a = i/12*Math.PI*2, nx = x+Math.cos(a)*r, nz = z+Math.sin(a)*r;
   if(segClear(m,nx,nz,0,0)&&segClear(m,nx,nz,x-nx,z-nz))return [nx,nz];
  }
 }
 return [x,z];
}
function findPath(m,sx,sz,gx,gz){
 const pts = m.navPts.concat([[gx,gz]]);
 const goal = pts.length-1;
 // 直线可达优先（保留真实终点）；否则吸附到最近的可行走位置再规划
 if(segClear(m,sx,sz,gx-sx,gz-sz))return [[gx,gz]];
 const snapped = snapWalkable(m,gx,gz);
 gx = snapped[0]; gz = snapped[1];
 pts[goal] = [gx,gz];
 let start = -1, sd = 1e9, n = pts.length-1;
 for(let i=0;i<n;i++){const d = (pts[i][0]-sx)**2+(pts[i][1]-sz)**2; if(d < sd){sd = d;start = i;}}
 if(start < 0)return [[gx,gz]];
 const dist = pts.map(() => Infinity), prev = pts.map(() => -1), done = pts.map(() => false);
 dist[start] = 0;
 for(let iter=0;iter<n+1;iter++){
  let u = -1, bd = Infinity;
  for(let i=0;i<=n;i++)if(!done[i] && dist[i] < bd){bd = dist[i];u = i;}
  if(u < 0)break;
  done[u] = true; if(u === goal)break;
  for(let v=0;v<=n;v++){
   if(done[v] || v === u)continue;
   const ax = pts[u][0], az = pts[u][1], bx = pts[v][0], bz = pts[v][1], d = Math.hypot(bx-ax,bz-az);
   if(d > 19)continue;
   if(dist[u]+d < dist[v] && segClear(m,ax,az,bx-ax,bz-az)){dist[v] = dist[u]+d;prev[v] = u;}
  }
 }
 if(prev[goal] < 0){
  // 目标不可直达：退回到“离目标最近且与起点连通”的导航点，再由行走逻辑逐步靠近
  let bestIdx = -1, bestD = Infinity;
  for(let i=0;i<n;i++){
   if(!Number.isFinite(dist[i]))continue;
   const d = (pts[i][0]-gx)**2+(pts[i][1]-gz)**2;
   if(d < bestD){bestD = d;bestIdx = i;}
  }
  if(bestIdx >= 0){
   const out = []; let cur = bestIdx;
   while(cur >= 0 && cur !== start){out.push([pts[cur][0],pts[cur][1]]);cur = prev[cur];}
   out.reverse();
   out.push([gx,gz]);
   return out;
  }
  const near = nearestPoint(m,sx,sz);
  if(near && (near[0] !== sx || near[1] !== sz)&&segClear(m,sx,sz,near[0]-sx,near[1]-sz))return [[near[0],near[1]],[gx,gz]];
  return [[gx,gz]];
 }
 const path = [];
 let cur = goal;
 while(cur >= 0 && cur !== start){path.push([pts[cur][0],pts[cur][1]]);cur = prev[cur];}
 return path.reverse();
}

/* ---- 声音 ---- */
function initAudio(){try{audio = audio || new (window.AudioContext||window.webkitAudioContext)(); if(audio.state === 'suspended')audio.resume();}catch(e){}}
function sound(type){
 if(!audio || !volume)return;
 const time = audio.currentTime, gain = audio.createGain(); gain.connect(audio.destination);
 if(type === 'shot' || type === 'rifle' || type === 'pistol'){
  const n = Math.floor(audio.sampleRate*(type === 'rifle'?.13:.1)), buffer = audio.createBuffer(1,n,audio.sampleRate), data = buffer.getChannelData(0);
  for(let i=0;i<n;i++)data[i] = (Math.random()*2-1)*Math.pow(1-i/n,type === 'pistol'?4:2.6);
  const source = audio.createBufferSource(); source.buffer = buffer;
  const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = type === 'pistol'?2600:type === 'rifle'?1500:1800;
  source.connect(filter); filter.connect(gain);
  gain.gain.setValueAtTime(volume*(type === 'rifle'?.42:type === 'pistol'?.5:.5),time); gain.gain.exponentialRampToValueAtTime(.001,time+(type === 'rifle'?.16:.12));
  source.start();
 }else if(type === 'knife'){
  const n = Math.floor(audio.sampleRate*.18), buffer = audio.createBuffer(1,n,audio.sampleRate), data = buffer.getChannelData(0);
  for(let i=0;i<n;i++)data[i] = (Math.random()*2-1)*Math.pow(1-i/n,1.4)*.7;
  const source = audio.createBufferSource(); source.buffer = buffer;
  const filter = audio.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1400; filter.Q.value = 1.6;
  source.connect(filter); filter.connect(gain); gain.gain.setValueAtTime(volume*.3,time); gain.gain.exponentialRampToValueAtTime(.001,time+.18); source.start();
 }else{
  const osc = audio.createOscillator(); osc.type = type === 'head'?'sine':type === 'hit'?'triangle':'sine';
  const f0 = type === 'head'?1100:type === 'hit'?620:type === 'hurt'?180:type === 'plant'?300:type === 'pick'?720:type === 'throw'?520:440;
  osc.frequency.setValueAtTime(f0,time); osc.frequency.exponentialRampToValueAtTime(Math.max(60,f0*.28),time+.16);
  gain.gain.setValueAtTime(volume*.14,time); gain.gain.exponentialRampToValueAtTime(.001,time+.2);
  osc.connect(gain); osc.start(); osc.stop(time+.21);
  if(type === 'flash'){
   // 爆开：低频冲击 + 高频耳鸣
   const n2 = Math.floor(audio.sampleRate*.5), buf = audio.createBuffer(1,n2,audio.sampleRate), d = buf.getChannelData(0);
   for(let i=0;i<n2;i++)d[i] = (Math.random()*2-1)*Math.pow(1-i/n2,2.2);
   const src = audio.createBufferSource(); src.buffer = buf;
   const lp = audio.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900;
   src.connect(lp); lp.connect(gain);
   gain.gain.setValueAtTime(volume*.5,time); gain.gain.exponentialRampToValueAtTime(.001,time+.5);
   src.start();
   const ring = audio.createOscillator(); ring.type='sine'; ring.frequency.setValueAtTime(4200,time);
   const rg = audio.createGain(); rg.gain.setValueAtTime(volume*.09,time); rg.gain.exponentialRampToValueAtTime(.001,time+1.6);
   ring.connect(rg); rg.connect(audio.destination); ring.start(); ring.stop(time+1.7);
  }
 }
}
function toast(text,duration=2.4){$('toast').textContent = text; $('toast').style.opacity = 1; toastTime = duration;}

/* ================= 游戏状态 ================= */
const GAME = {
 side:'attack', scoreA:0, scoreD:0, round:1, roundTime:180, roundEnd:0, result:null,
 hp:100, armor:0, alive:true, money:3200, buyTime:20, dropping:0, bomb:false, bombSite:null,
 phase:'', bombTimer:0, defuse:0, enemies:5, allies:5, spectate:null, flash:0
};
const WEAPON_STATE = {knife:{owned:true,paid:0},pistol:{owned:true,paid:0},revolver:{owned:false,paid:0},m4:{owned:false,paid:0},ak:{owned:false,paid:0},awp:{owned:false,paid:0}};
/* 当前槽位装备：长枪槽三选一，手枪槽二选一 */
let rifleEquipped = null, pistolEquipped = 'pistol';
let currentWeapon = 'knife', switchTime = 0, switchFrom = null, reloadT = 0, mag = 0, meleeAnim = 0, meleeCd = 0, firing = false;
let scopeOn = false, scopeSwitchT = 0;
let killFeedItems = [];
let damageFade = 0, deathCamT = 0;

const PLAYER_RADIUS = .3;
function downed(){return GAME.hp <= 0;}
function canControl(){return ['run','prep'].includes(state) && GAME.alive && (dragControl || document.pointerLockElement === renderer.domElement);}
function weaponDef(){return WEAPONS[currentWeapon];}

function resetPlayerForRound(){
 const m = activeMap, base = GAME.side === 'attack'?m.attackSpawn:m.defendSpawn;
 const offsets = [[0,0],[-1.6,1.4],[1.6,1.4],[-1.6,-1.4],[1.6,-1.4]];
 const o = offsets[0];
 const x = base.x + o[0], z = base.z + o[1];
 player.set(x,groundHeightAt(m,x,z)+1.65,z);
 GAME.jumpVel = 0; GAME.grounded = true; GAME.crouchBlend = 0; GAME.eyeHeight = 1.65;
 GAME.accuracy = {speed:0,moving:false,airborne:false};
 yaw = GAME.side === 'attack'?0:Math.PI; pitch = 0;
 GAME.hp = 100; GAME.armor = 0; GAME.alive = true; GAME.spectate = null;
 // 装备重置：长枪槽清空，手枪槽回到初始手枪
 WEAPON_STATE.knife.owned = true; WEAPON_STATE.knife.paid = 0;
 WEAPON_STATE.pistol.owned = true; WEAPON_STATE.pistol.paid = 0;
 for(const id of ['revolver','m4','ak','awp']){WEAPON_STATE[id].owned = false; WEAPON_STATE[id].paid = 0;}
 rifleEquipped = null; pistolEquipped = 'pistol';
 currentWeapon = 'pistol'; mag = WEAPONS.pistol.clip; switchTime = 0; switchFrom = null; reloadT = 0;
 scopeOn = false;
}
function resetMatch(){
 MAPS.forEach(map => {map.bombsites.forEach(s => {s.material.opacity = .09; s.labelMesh.material.opacity = .8;});});
 for(const t of targets){Object.assign(t,{hp:100,dead:false,death:0,visibleFor:0,candidate:null,first:null,angle:null,killTime:null,headKill:false}); t.group.visible = true; t.group.scale.setScalar(1);}
 for(const a of bots){a.alive = false; a.group.visible = false;}
 elapsed = 0; prep = 0; kills = 0; heads = 0; shots = 0; hits = 0; recoil = 0; lastShot = -999; routeClock = 0; route = [];
 killFeedItems = []; $('killfeed').innerHTML = '';
 resultSnapshot = null; GAME.round = 1; GAME.scoreA = 0; GAME.scoreD = 0; GAME.roundEnd = 0; GAME.result = null;
 GAME.money = 6000;
 keys.clear(); firing = false;
 // 清理场上遗留的闪光弹与白屏
 for(const g of grenades){
  scene.remove(g.mesh);
  if(g.trailMesh){scene.remove(g.trailMesh); g.trailMesh.geometry.dispose(); g.trailMesh.material.dispose();}
  if(g.glow)scene.remove(g.glow);
 }
 grenades.length = 0; GAME.flash = 0;
 const wf = $('whiteFlash'); if(wf){wf.style.opacity = 0; wf.style.transition = 'none';}
 flashTimer = 0;
 collectShotMeshes();
}
function startRound(){
 const m = activeMap;
 MAPS.forEach(map => {map.bombsites.forEach(s => {s.material.opacity = .09; s.labelMesh.material.opacity = .8;});});
 GAME.roundTime = 180; GAME.roundEnd = 0; GAME.phase = 'live'; GAME.dropping = 0; GAME.bomb = null; GAME.bombSite = null; GAME.bombPos = null;
 GAME.buyTime = 20; GAME.defuse = 0; GAME.enemies = 5; GAME.allies = 5; GAME.plantSite = null;
 resetPlayerForRound();
 if(!m.train)spawnBots();
 route = [[player.x,player.z]];
 $('plantBar').hidden = true; $('bombBar').hidden = true;
 applyMap(m);
 collectShotMeshes();
 const bomb = ensureBombObject(); bomb.visible = false;
 // 攻方炸弹：玩家为攻方时由玩家携带，否则交给一名攻方人机
 if(!m.train&&GAME.side === 'attack'){GAME.bomb = 'carried'; GAME.bombSite = nearestSite(player);}
 updateHUD();
}

/* ---- 人机出生 ---- */
/* 队友名牌：青底白字 + 小三角，让敌我一眼可分 */
function drawNamePlate(a){
 const c = a.nameCanvas, ctx = c.getContext('2d');
 const label = a.name+(a.hasBomb?' ◈':'');
 if(c._text === label)return;
 c._text = label;
 ctx.clearRect(0,0,c.width,c.height);
 ctx.fillStyle = '#0e2a30ee';
 ctx.beginPath();
 const r = 14;
 ctx.moveTo(10+r,6); ctx.lineTo(246-r,6); ctx.quadraticCurveTo(246,6,246,6+r);
 ctx.lineTo(246,58-r); ctx.quadraticCurveTo(246,58,246-r,58); ctx.lineTo(10+r,58);
 ctx.quadraticCurveTo(10,58,10,58-r); ctx.lineTo(10,6+r); ctx.quadraticCurveTo(10,6,10+r,6);
 ctx.fill();
 ctx.strokeStyle = '#8cd9d5cc'; ctx.lineWidth = 3; ctx.stroke();
 ctx.fillStyle = '#d8fbf6'; ctx.font = 'bold 32px "Microsoft YaHei",sans-serif';
 ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
 ctx.fillText(label,128,34);
 a.nameTex.needsUpdate = true;
}
function spawnBots(){
 const m = activeMap;
 const siteChoice = m.bombsites[Math.random() < .5?0:1].id;
 const names = {attack:['阿尔法','布拉沃','查理','三角洲','回声'],defend:['哨兵','铁壁','夜莺','锚点','石墙']};
 // 玩家占自己阵营的一个名额，因此同阵营只剩 4 名 AI，对方是 5 名
 const attackCount = 5-(GAME.side === 'attack'?1:0);
 const defendCount = 5-(GAME.side === 'defend'?1:0);
 const offsets = [[0,0],[-2.2,2],[2.2,2],[-2.2,-2],[2.2,-2]];
 let aCount = 0, dCount = 0;
 for(const a of bots){
  a.alive = false; a.group.visible = false; if(a.namePlate)a.namePlate.visible = false;
 }
 for(const a of bots){
  const isAttack = a.index < 5;
  if(isAttack && aCount >= attackCount)continue;
  if(!isAttack && dCount >= defendCount)continue;
  const idx = isAttack?aCount++:dCount++;
  const base = isAttack?m.attackSpawn:m.defendSpawn;
  const o = offsets[idx]||[0,0];
  let x = base.x+o[0], z = base.z+o[1];
  if(!validPosition(x,z,0,.45)){x = base.x; z = base.z;}
  a.pos.set(x,surfaceAt(m,x,z,0),z);
  a.alive = true; a.hp = 100; a.armor = 0; a.hasBomb = false; a.bombSite = null; a.siteChoice = null;
  a.path = []; a.pathIndex = 0; a.repath = 0; a.think = Math.random(); a.fireCd = .6+Math.random(); a.burst = 0; a.phase = 'advance';
  a.stuckT = 0; a.lastPos.copy(a.pos); a.plantT = 0; a.spot = null; a.strafe = 0; a.prefPlayer = false;
  a.group.visible = true; a.group.position.set(a.pos.x,a.pos.y,a.pos.z); a.group.scale.set(1,1,1);
  a.name = names[isAttack?'attack':'defend'][idx%5]; a.skill = .62+Math.random()*.2;
  a.yaw = isAttack?Math.PI:0;
  a.marker.material.color.set(isAttack?'#eec184':'#8cd9d5');
  a.barFg.scale.x = 1; a.barFg.position.x = 0; a.barFg.material.color.set('#8bd2ba');
  a.barGroup.visible = true; a.marker.visible = true;
  a.muzzleT = 0; a.flashMesh.visible = false; a.weapon.visible = true;
  drawNamePlate(a);
  if(a.team === 'attack')assignSpot(a);
 }
 // 玩家守方时，炸弹交给一名攻方人机
 if(GAME.side !== 'attack'){
  const carriers = bots.filter(a => a.team === 'attack'&&a.alive);
  if(carriers.length){const c = carriers[0]; c.hasBomb = true; c.bombSite = siteChoice; GAME.bomb = 'carried'; GAME.bombSite = m.bombsites.find(s => s.id === siteChoice);}
 }
 GAME.bombSiteChoice = siteChoice;
}

/* ---- 玩家武器操作 ---- */
const SWITCH_TIME = .55;
const SWITCH_TIME_AWP = 1.15;   // AWP 掏枪动画更慢更有分量
function setWeapon(id){
 if(!WEAPON_STATE[id] || !WEAPON_STATE[id].owned)return;
 if(id === currentWeapon || switchTime > .32 || reloadT > 0)return;
 switchFrom = currentWeapon; currentWeapon = id;
 // AWP 需要更长的掏枪动作
 switchTime = id === 'awp' ? SWITCH_TIME_AWP : SWITCH_TIME;
 meleeAnim = 0; reloadT = 0; scopeOn = false;
 const w = WEAPONS[id];
 mag = w.clip === null ? 0 : w.clip;
 sound('reload');
 updateHUD();
}
/* 槽位切换：1 长枪 · 2 刀 · 3 手枪 */
function setSlot(kind){
 if(kind === 'rifle'){
  if(!rifleEquipped){toast('未购买长枪 · 按 B 购买 AK47 / M4 / AWP'); return;}
  setWeapon(rifleEquipped);
 }else if(kind === 'knife'){
  setWeapon('knife');
 }else if(kind === 'pistol'){
  setWeapon(pistolEquipped || 'pistol');
 }
}
/* AWP 开镜切换（点击右键） */
function toggleScope(){
 if(currentWeapon !== 'awp' || !GAME.alive || state !== 'run')return;
 if(switchTime > 0 || reloadT > 0)return;
 scopeOn = !scopeOn;
 scopeSwitchT = .16;
 sound('pick');
 updateHUD();
}
/* 退出开镜：开火后自动调用，视野平滑复位 */
function exitScope(){
 if(!scopeOn)return;
 scopeOn = false;
 scopeSwitchT = .16;
}
function startReload(){
 const w = weaponDef();
 if(state !== 'run' || !GAME.alive || w.clip === null || reloadT > 0 || switchTime > 0)return;
 if(mag >= w.clip)return;
 reloadT = w.reload; sound('reload'); updateHUD();
}
/* 弹匣打空后自动换弹（所有模式通用） */
function autoReload(){
 const w = weaponDef();
 if(w.clip === null || mag > 0 || reloadT > 0 || switchTime > 0 || !GAME.alive)return;
 if(state !== 'run')return;
 startReload();
}
function weaponName(){return weaponDef().name;}
function muzzlePos(){
 camera.updateMatrixWorld(true);
 const v = new THREE.Vector3(currentWeapon === 'knife'?.3:.245, -.05, -.62); return camera.localToWorld(v);
}
function canFire(){
 if(!GAME.alive || state !== 'run' || reloadT > 0 || switchTime > 0)return false;
 if(!dragControl && document.pointerLockElement !== renderer.domElement)return false;
 return true;
}
function playerShoot(){
 if(!canFire())return;
 const w = weaponDef();
 if(w.type === 'melee'){
  if(meleeCd > 0)return;
  meleeCd = w.rate; meleeAnim = .34; sound('knife');
  const eye = camera.position.clone(), dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const MELEE_CONE = .87; // 约 50°，近战不需要精确对准
  let bestBot = null, bestTarget = null, bd = w.range;
  for(const a of bots){
   if(!a.alive)continue;
   const to = a.pos.clone(); to.y += 1.2;
   const dist = to.distanceTo(eye); if(dist > bd)continue;
   if(dir.angleTo(to.clone().sub(eye).normalize()) < MELEE_CONE && losClear(eye.x,eye.z,a.pos.x,a.pos.z)){bestBot = a; bd = dist;}
  }
  if(!bestBot){
   for(const t of targets){
    if(t.dead)continue;
    const to = t.headPos.clone(); to.y = 1.2;
    const dist = to.distanceTo(eye); if(dist > bd)continue;
    if(dist < w.range && dir.angleTo(to.clone().sub(eye).normalize()) < MELEE_CONE){bestTarget = t; bd = dist;}
   }
  }
  if(bestBot || bestTarget){
   hitFade = .2; $('hitmarker').style.color = '#fff'; sound('hit');
   if(bestBot)damageBot(bestBot,w.damage,'body','刀');
   if(bestTarget){
    bestTarget.hp -= 50;
    if(bestTarget.hp <= 0){
     bestTarget.dead = true; bestTarget.death = .22; bestTarget.killTime = elapsed; bestTarget.headKill = false; kills++;
     $('hitText').textContent = '目标击破 · '+String(bestTarget.id+1).padStart(2,'0'); $('hitText').style.opacity = 1;
    }
   }
  }
  updateHUD(); return;
 }
 if(elapsed-lastShot < w.rate)return;
 if(mag <= 0){autoReload(); return;}
 mag--; shots++; lastShot = elapsed; recoil = w.id === 'ak'?.08:w.id === 'm4'?.06:.05; flash.visible = true; sound(w.id === 'pistol'?'pistol':'rifle');
 chSpread = 1;
 // 打空瞬间立即进入换弹，无需松手或按 R
 const emptied = mag === 0;
 if(!reduced){pitch = Math.min(1.35,pitch+(w.id === 'ak'?.021:w.id === 'm4'?.016:.014)); yaw += (Math.random()-.5)*.004;}
 camera.updateMatrixWorld(true); ray.setFromCamera(new THREE.Vector2(0,0),camera); ray.far = w.range;
 const aimDir = new THREE.Vector3(); camera.getWorldDirection(aimDir);
 // 精度规则：只有“站定不动”才是准的。
 // 走动、蹲走、跳跃、下落 —— 一律附加巨大散布，几乎打不中。
 const acc = GAME.accuracy;
 let spread;
 if(w.id === 'awp'){
  // AWP：未开镜散布极大；开镜后站定且着地则完全无散布
  if(scopeOn) spread = (acc.moving || acc.airborne) ? .012 : 0;
  else spread = .055 + (acc.moving ? .05 : 0);
 }else{
  spread = acc.moving ? .085 : (acc.airborne ? .12 : w.spread);
 }
 if(spread > .0005){
  aimDir.x += (Math.random()-.5)*spread*2;
  aimDir.y += (Math.random()-.5)*spread*2;
  aimDir.z += (Math.random()-.5)*spread*2;
  aimDir.normalize();
 }
 // 只有站定时才给容差吸附；移动/跳跃中取消吸附
 if(!acc.moving) {
  const assist = aimAssist(aimDir, w.range);
  if(assist)aimDir.copy(assist.clone().sub(camera.position).normalize());
 }
 ray.set(camera.position,aimDir);
 const candidates = shotMeshes.filter(o => {
  if(o.userData.target !== undefined)return !targets[o.userData.target].dead;
  if(o.userData.agent !== undefined){const a = bots[o.userData.agent]; return a && a.alive;}
  return true;
 });
 const intersections = ray.intersectObjects(candidates,false);
 const hit = resolveHit(intersections);
 raycasterDecals(hit);
 if(hit && hit.kind === 'bot'){
  const a = bots[hit.index]; const head = hit.part === 'head';
  if(a && a.alive){
   hits++; hitFade = .2; $('hitmarker').style.color = head?'#f2bd65':'#fff';
   damageBot(a, w.damage*(head?w.headMul:1), head?'head':'body', w.name, w.pierceArmor);
   sound(head?'head':'hit');
  }
 }else if(hit && hit.kind === 'target'){
  const t = targets[hit.index], head = hit.part === 'head';
  if(t && !t.dead){
   hits++; t.hp -= head?100:50; hitFade = .2; $('hitmarker').style.color = head?'#f2bd65':'#fff'; sound(head?'head':'hit');
   if(t.hp <= 0){t.dead = true; t.death = .22; t.killTime = elapsed; t.headKill = head; kills++; if(head)heads++;
    $('hitText').textContent = (head?'精准爆头':'目标击破')+' · '+String(t.id+1).padStart(2,'0'); $('hitText').style.opacity = 1;}
  }
 }
 updateHUD();
 if(emptied)autoReload();
 // AWP 开火结算完成后自动退出开镜（本发子弹仍按开镜状态计算）
 if(w.id === 'awp')exitScope();
}
/* 命中容差：视线方向与目标夹角小于容差（且无遮挡）时返回目标点 */
const AIM_TOLERANCE = {head:2.4, body:2.0}; // 角度（度）
function aimAssist(dir,range){
 const eye = camera.position;
 let best = null, bestAng = Infinity;
 const consider = (point, radius, tolerance) => {
  const to = point.clone().sub(eye), dist = to.length();
  if(dist > range || dist < .3)return;
  const ang = THREE.MathUtils.radToDeg(dir.angleTo(to.clone().normalize()));
  const allow = Math.atan2(radius, Math.max(.6, dist))*180/Math.PI*0.9 + tolerance;
  if(ang < allow && ang < bestAng){
   if(!losClear(eye.x,eye.z,point.x,point.z))return;
   bestAng = ang; best = point.clone();
  }
 };
 for(const a of bots){
  if(!a.alive)continue;
  const d2 = (a.pos.x-eye.x)**2+(a.pos.z-eye.z)**2;
  if(d2 > range*range)continue;
  const body = new THREE.Vector3(a.pos.x,a.pos.y+1.15,a.pos.z);
  const head = new THREE.Vector3(a.pos.x,a.pos.y+1.66,a.pos.z);
  consider(head,.18,AIM_TOLERANCE.head);
  consider(body,.32,AIM_TOLERANCE.body);
 }
 for(const t of targets){
  if(t.dead)continue;
  if((t.headPos.x-eye.x)**2+(t.headPos.z-eye.z)**2 > range*range)continue;
  consider(t.headPos.clone(),.2,AIM_TOLERANCE.head);
  consider(new THREE.Vector3(t.headPos.x,1.2,t.headPos.z),.34,AIM_TOLERANCE.body);
 }
 return best;
}
/* 射线命中：在所有候选里按距离排序取“第一个有效结果”。
   旧代码只看 intersections[0]，一旦命中地板/装饰（没有 userData）就吞掉整发子弹，这就是“打不死”的原因。 */
function resolveHit(intersections){
 for(let i=0;i<intersections.length;i++){
  const o = intersections[i].object;
  if(o.userData.target !== undefined)return {kind:'target',index:o.userData.target,part:o.userData.part,point:intersections[i].point};
  if(o.userData.agent !== undefined && o.userData.agent !== null)return {kind:'bot',index:o.userData.agent,part:o.userData.part,point:intersections[i].point};
  // 墙体与地面是真实遮挡，命中即终止
  const p = o.userData.part;
  if(p === 'wall' || p === 'ground')return {kind:'wall',point:intersections[i].point};
  // 装饰、道具不阻挡判定，继续向后寻找真正的目标
 }
 return null;
}
function raycasterDecals(hit){/* 预留：命中火花 */}

/* ---- 伤害结算 ---- */
function damageBot(a,dmg,part,weapon,pierceArmor){
 if(!a || !a.alive)return;
 let d = dmg;
 // 左轮为高威力单发武器，破甲能力极强：护甲不削减其伤害，
 // 以保证“爆头一枪死、身体三枪死”在任何护甲状态下都成立
 if(a.armor > 0 && !pierceArmor){const absorb = Math.min(a.armor,d*.5); a.armor -= absorb; d -= absorb*.85;}
 a.hp -= d;
 a.barGroup.visible = true;
 a.barFg.scale.x = Math.max(0,Math.min(1,a.hp/100));
 a.barFg.position.x = -(1-Math.max(0,Math.min(1,a.hp/100)))*.25;
 a.barFg.material.color.set(a.hp > 55?'#8bd2ba':a.hp > 25?'#eec184':'#ff8a6b');
 // 被打中后立刻还击，避免人机站着挨枪
 if(a.alive&&a.hp > 0&&a.fireCd > 0)a.fireCd = Math.min(a.fireCd,.22);
 if(a.hp <= 0)killBot(a,part,weapon,true);
}
function killBot(a,part,weapon,byPlayer){
 if(!a.alive)return;
 a.alive = false; a.group.visible = false; a.barGroup.visible = false;
 if(byPlayer){kills++;   if(part === 'head')heads++; GAME.money = Math.min(16000,GAME.money+300);
  pushFeed({name:'你',team:GAME.side},a,weapon,part);
  $('hitText').textContent = (part === 'head'?'精准爆头':'击倒')+' · '+a.name; $('hitText').style.opacity = 1;
 }
 if(a.hasBomb){a.hasBomb = false; dropBombNear(a.pos);}
 if(a.namePlate)a.namePlate.visible = false;
 checkRoundState();
}
function killPlayer(byBot){
 if(!GAME.alive)return;
 GAME.hp = 0; GAME.alive = false; firing = false; GAME.spectate = null; GAME.dropping = 0;
 $('plantBar').hidden = true;
 if(byBot)pushFeed(byBot,{name:'你',team:GAME.side},'枪械','body');
 sound('hurt'); damageFade = 1;
 $('damageFlash').classList.add('on');
 toast('你已阵亡 · 观战中 · 本回合结束自动继续',3);
 if(GAME.bomb === 'carried'){GAME.bomb = 'dropped'; dropBombNear({x:player.x,z:player.z});}
 checkRoundState();
 updateHUD();
}
function hurtPlayer(dmg){
 if(!GAME.alive)return;
 let d = dmg;
 if(GAME.armor > 0){const absorb = Math.min(GAME.armor,d*.5); GAME.armor -= absorb; d -= absorb*.85;}
 GAME.hp = Math.max(0,GAME.hp-d);
 damageFade = .9; $('damageFlash').classList.add('on'); setTimeout(()=>$('damageFlash').classList.remove('on'),90);
 if(reduced)pitch = Math.min(1.35,pitch+.008);
 sound('hurt');
 if(GAME.hp <= 0)killPlayer(null);
 updateHUD();
}
function pushFeed(attacker,victim,weapon,part){
 const div = document.createElement('div');
 const an = typeof attacker === 'string'?attacker:attacker.name;
 const ac = attacker === '你'?'#eec184':(typeof attacker === 'object'&&attacker.team === 'attack'?'#eec184':'#8cd9d5');
 const vc = victim && victim.team === 'attack'?'#eec184':'#8cd9d5';
 div.innerHTML = `<span style="color:${ac}">${an}</span><i>${part === 'head'?'爆头':'击杀'} · ${weapon}</i><span style="color:${vc}">${victim.name}</span>`;
 $('killfeed').appendChild(div);
 setTimeout(()=>div.remove(),5200);
 while($('killfeed').children.length > 5)$('killfeed').firstChild.remove();
}

/* ================= 炸弹流程 ================= */
let bombObject = null;
function ensureBombObject(){
 if(bombObject)return bombObject;
 const g = new THREE.Group();
 const body = new THREE.Mesh(new THREE.BoxGeometry(.36,.22,.24),material('#2c3a3e',.6,.4)); body.castShadow = true; g.add(body);
 const led = new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.06),new THREE.MeshStandardMaterial({color:'#ff5a3c',emissive:'#ff3b1c',emissiveIntensity:2}));
 led.position.set(.1,.14,0); g.add(led);
 const strap = new THREE.Mesh(new THREE.BoxGeometry(.4,.05,.26),material('#1a2427',.7,.2)); strap.position.y = .05; g.add(strap);
 bombObject = g; bombObject.visible = false; scene.add(g); return g;
}
function siteAt(x,z){
 for(const s of activeMap.bombsites)if(Math.hypot(x-s.center.x,z-s.center.z) <= s.radius)return s;
 return null;
}
function dropBombNear(pos){
 const m = activeMap;
 const site = siteAt(pos.x,pos.z);
 const target = site?site.center:new THREE.Vector3(pos.x,0,pos.z);
 GAME.bombPos = target.clone();
 GAME.bomb = 'dropped';
 const g = ensureBombObject(); g.visible = true; g.position.set(target.x,.2,target.z);
 if(!site)GAME.dropping = 0;
}
function pickupBomb(){
 if(GAME.bomb !== 'dropped')return;
 GAME.bomb = 'carried'; GAME.bombSite = GAME.plantTarget || nearestSite(player);
 if(bombObject)bombObject.visible = false;
 sound('pick'); toast('已拾取炸弹 · 站进 A 区或 B 区按 F 下包（5 秒）',3);
 updateHUD();
}
function nearestSite(pos){
 let best = activeMap.bombsites[0], bd = 1e9;
 for(const s of activeMap.bombsites){const d = Math.hypot(pos.x-s.center.x,pos.z-s.center.z); if(d < bd){bd = d;best = s;}}
 return best;
}
function startPlant(){
 const s = siteAt(player.x,player.z);
 if(!s){toast('必须站在 A 区或 B 区内才能下包'); return;}
 GAME.dropping = 5; GAME.plantSite = s; GAME.bombSite = s;
 $('plantBar').hidden = false; $('plantLabel').textContent = '正在下包 · '+s.name;
 sound('plant');
}
function finishPlant(){
 const s = GAME.plantSite || nearestSite(player);
 GAME.dropping = 0; GAME.bomb = 'planted'; GAME.bombSite = s; GAME.bombTimer = 40;
 bombObject.visible = true; bombObject.position.set(s.center.x,.2,s.center.z);
 $('plantBar').hidden = true; $('bombBar').hidden = true;
 s.material.opacity = .3;
 toast('炸弹已安放 · '+s.name+' · 40 秒后引爆',3.2);
 pushSiteAlert(s);
 updateHUD();
}
function pushSiteAlert(s){toast('炸弹已安放于 '+s.name+'！守住它',3);}
function defuseTick(dt){
 if(GAME.bomb !== 'planted')return;
 const s = GAME.bombSite;
 if(GAME.side !== 'defend')return;
 if(!GAME.alive)return;
 // 必须按住 F 才能拆除，松开即中断
 const near = Math.hypot(player.x-s.center.x,player.z-s.center.z) <= s.radius+1.5;
 const holding = keys.has('KeyF')&&near;
 $('plantBar').hidden = !near;
 if(near){
  $('plantLabel').textContent = holding?'正在拆除炸弹…':'按住 F 拆除炸弹（5 秒）';
  $('plantBar').querySelector('b').style.width = (GAME.defuse/5*100)+'%';
 }
 if(!holding){GAME.defuse = Math.max(0,GAME.defuse-dt*1.6); return;}
 GAME.defuse += dt;
 if(GAME.defuse >= 5){
  GAME.defuse = 5; GAME.bomb = 'defused';
  $('plantBar').hidden = true;
  if(bombObject)bombObject.visible = false;
  endRound('defend','炸弹已被拆除');
 }
}

/* ================= 闪光弹 ================= */
const FLASH_FUSE = 2.5;          // 引信时间（秒）
const FLASH_FULL = 3;            // 正面看到：致盲 3 秒
const FLASH_BACK = .1;           // 背对爆点：致盲 0.1 秒
const FLASH_RANGE = 42;          // 最大生效距离
let grenades = [], flashTimer = 0, flashLight = null;

function makeFlashMesh(){
 const g = new THREE.Group();
 const body = new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.13,10),
  new THREE.MeshStandardMaterial({color:'#6b7a52',roughness:.55,metalness:.35,emissive:'#2c3a1c',emissiveIntensity:.6}));
 body.rotation.x = Math.PI/2; g.add(body);
 const cap = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.05,8),
  new THREE.MeshStandardMaterial({color:'#b9bda6',roughness:.4,metalness:.6,emissive:'#4a4f3c',emissiveIntensity:.5}));
 cap.rotation.x = Math.PI/2; cap.position.z = .08; g.add(cap);
 const led = new THREE.Mesh(new THREE.SphereGeometry(.02,8,6),
  new THREE.MeshStandardMaterial({color:'#ff7a4c',emissive:'#ff5a2c',emissiveIntensity:3}));
 led.position.z = .1; g.add(led);
 // 尾焰，让飞行中的弹体更醒目
 const flame = new THREE.Mesh(new THREE.ConeGeometry(.045,.16,8),
  new THREE.MeshBasicMaterial({color:'#ffca7a',transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending}));
 flame.rotation.x = -Math.PI/2; flame.position.z = -.14; g.add(flame);
 g.traverse(o => {if(o.isMesh)o.castShadow = true;});
 return g;
}
/* 拖尾：26 个顶点构成的点串，用顶点色做亮度渐变 + 加色混合 */
const TRAIL_N = 26;
function makeTrail(){
 const geo = new THREE.BufferGeometry();
 geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N*3),3));
 geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_N*3),3));
 const mat = new THREE.PointsMaterial({size:.13,vertexColors:true,transparent:true,depthWrite:false,
  blending:THREE.AdditiveBlending,sizeAttenuation:true});
 const p = new THREE.Points(geo,mat);
 p.frustumCulled = false;
 return p;
}
function updateTrail(g){
 const posAttr = g.trailMesh.geometry.attributes.position;
 const colAttr = g.trailMesh.geometry.attributes.color;
 const pa = posAttr.array, ca = colAttr.array;
 for(let i=0;i<TRAIL_N;i++){
  const src = g.trail[Math.min(i,g.trail.length-1)] || g.pos;
  pa[i*3] = src.x; pa[i*3+1] = src.y; pa[i*3+2] = src.z;
  // 越靠头部越亮，尾端逐渐熄灭
  const k = 1 - i/TRAIL_N, f = Math.pow(k,1.5);
  ca[i*3] = f; ca[i*3+1] = f*.85; ca[i*3+2] = f*.55;
 }
 posAttr.needsUpdate = true;
 colAttr.needsUpdate = true;
}
function throwFlash(){
 if(!GAME.alive || state !== 'run')return;
 if((GAME.flash|0) <= 0){toast('没有闪光弹 · 按 B 购买'); return;}
 GAME.flash--;
 const m = activeMap;
 const g = makeFlashMesh();
 const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
 const start = camera.position.clone().add(dir.clone().multiplyScalar(.45)).add(new THREE.Vector3(0,-.12,0));
 g.position.copy(start);
 scene.add(g);
 // 拖尾与跟随光点，让飞行轨迹清晰可见
 const trailMesh = makeTrail();
 trailMesh.position.copy(start);
 scene.add(trailMesh);
 const glow = new THREE.PointLight('#ffd9a0', 2.2, 4.5, 2);
 glow.position.copy(start);
 scene.add(glow);
 grenades.push({
  mesh:g, trailMesh, glow, trail:[start.clone()], pos:start.clone(),
  vel:dir.clone().multiplyScalar(15).add(new THREE.Vector3(0,3.4,0)),
  fuse:FLASH_FUSE, spin:new THREE.Vector3(Math.random()*6-3,Math.random()*6-3,Math.random()*6-3),
  dead:false
 });
 sound('throw');
 toast('闪光弹已投出 · 2.5 秒后爆开',2);
 updateHUD();
}
function updateGrenades(dt){
 const m = activeMap;
 for(let i=grenades.length-1;i>=0;i--){
  const g = grenades[i];
  g.fuse -= dt;
  g.vel.y -= 17*dt;
  const nx = g.pos.x + g.vel.x*dt, ny = g.pos.y + g.vel.y*dt, nz = g.pos.z + g.vel.z*dt;
  // 撞墙：沿法线反弹并衰减
  if(!validPosition(nx, g.pos.z, g.pos.y, .12)){g.vel.x = -g.vel.x*.42; }
  else g.pos.x = nx;
  if(!validPosition(g.pos.x, nz, g.pos.y, .12)){g.vel.z = -g.vel.z*.42; }
  else g.pos.z = nz;
  const floor = groundHeightAt(m, g.pos.x, g.pos.z) + .07;
  if(ny <= floor){
   g.pos.y = floor;
   if(Math.abs(g.vel.y) > 1.1){g.vel.y = -g.vel.y*.36; g.vel.x *= .7; g.vel.z *= .7;}
   else {g.vel.y = 0; g.vel.x *= .82; g.vel.z *= .82;}
  } else g.pos.y = ny;
  // 静止后摩擦力使其停下
  g.vel.x *= (1 - dt*1.6); g.vel.z *= (1 - dt*1.6);
  g.mesh.position.copy(g.pos);
  g.mesh.rotation.x += g.spin.x*dt; g.mesh.rotation.y += g.spin.y*dt; g.mesh.rotation.z += g.spin.z*dt;
  // 拖尾：把当前位置插到轨迹最前，并同步渲染
  g.trail.unshift(g.pos.clone());
  if(g.trail.length > TRAIL_N)g.trail.pop();
  updateTrail(g);
  g.glow.position.copy(g.pos);
  // 落地后逐渐熄灭尾焰
  const spd = Math.hypot(g.vel.x,g.vel.y,g.vel.z);
  const flame = g.mesh.children.find(c => c.geometry && c.geometry.type === 'ConeGeometry');
  if(flame){flame.material.opacity = Math.min(.85, spd*.09); flame.scale.setScalar(Math.min(1.4,.5+spd*.06));}
  if(g.fuse <= 0){detonateFlash(g); grenades.splice(i,1);}
 }
}
/* 三维视线判定：墙体阻挡则不致盲 */
function flashLineOfSight(from, to){
 const dir = to.clone().sub(from), dist = dir.length();
 if(dist < .05)return true;
 if(dist > FLASH_RANGE)return false;
 const r = new THREE.Raycaster(from.clone(), dir.clone().normalize(), .05, dist - .18);
 const walls = shotMeshes.filter(o => o.userData.target === undefined && o.userData.agent === undefined);
 return r.intersectObjects(walls, false).length === 0;
}
function detonateFlash(g){
 // 清理拖尾与跟随光点
 if(g.trailMesh){scene.remove(g.trailMesh); g.trailMesh.geometry.dispose(); g.trailMesh.material.dispose(); g.trailMesh = null;}
 if(g.glow){scene.remove(g.glow); g.glow = null;}
 const eye = camera.position.clone();
 const to = g.pos.clone();
 const dist = eye.distanceTo(to);
 let duration = 0;
 if(dist <= FLASH_RANGE && flashLineOfSight(eye, to)){
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const ang = THREE.MathUtils.radToDeg(fwd.angleTo(to.clone().sub(eye).normalize()));
  // 正面看到 → 3 秒；背对或侧对 → 仅 0.1 秒
  duration = ang <= 80 ? FLASH_FULL : FLASH_BACK;
 }
 // 视觉：爆点强光
 if(!flashLight){
  flashLight = new THREE.PointLight('#ffffff', 0, 26, 2);
  scene.add(flashLight);
 }
 flashLight.position.copy(g.pos);
 flashLight.intensity = 90;
 const flashBall = new THREE.Mesh(new THREE.SphereGeometry(.35,10,8),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.95}));
 flashBall.position.copy(g.pos); scene.add(flashBall);
 setTimeout(() => {
  scene.remove(flashBall);
  flashBall.geometry.dispose(); flashBall.material.dispose();
 }, 220);
 setTimeout(() => {if(flashLight)flashLight.intensity = 0;}, 180);
 if(duration > 0)applyFlash(duration);
 // 人机看到爆点也会被致盲，3 秒内无法开枪
 for(const a of bots){
  if(!a.alive)continue;
  const bEye = new THREE.Vector3(a.pos.x, a.pos.y+1.6, a.pos.z);
  const bTo = g.pos.clone();
  const bDist = bEye.distanceTo(bTo);
  if(bDist > FLASH_RANGE)continue;
  if(!flashLineOfSight(bEye, bTo))continue;
  const bFwd = new THREE.Vector3(Math.sin(a.yaw), 0, Math.cos(a.yaw));
  const ang = THREE.MathUtils.radToDeg(bFwd.angleTo(bTo.clone().sub(bEye).setY(0).normalize()));
  if(ang <= 80) a.blindUntil = elapsed + 3;
 }
 sound('flash');
}
function applyFlash(duration){
 const el = $('whiteFlash');
 if(!el)return;
 flashTimer = duration;
 el.style.transition = 'none';
 el.style.opacity = 1;
 // 结束前留出一点余量做淡出
 const fade = Math.min(.45, duration);
 setTimeout(() => {
  el.style.transition = 'opacity ' + fade + 's ease-out';
  el.style.opacity = 0;
 }, Math.max(0,(duration-fade)*1000));
 setTimeout(() => {flashTimer = 0;}, duration*1000);
}
/* ================= 回合判定 ================= */
function teamAlive(){
 let a = 0, d = 0;
 if(GAME.alive){if(GAME.side === 'attack')a++;else d++;}
 for(const b of bots)if(b.alive){if(b.team === 'attack')a++;else d++;}
 return {attack:a,defend:d};
}
function checkRoundState(){
 if(!GAME.bomb||activeMap.train)return;
 const t = teamAlive(); GAME.enemies = GAME.side === 'attack'?t.defend:t.attack; GAME.allies = GAME.side === 'attack'?t.attack:t.defend;
 updateHUD();
 if(GAME.phase !== 'live')return;
 const playerTeamAlive = GAME.side === 'attack'?t.attack:t.defend;
 const enemyAlive = GAME.side === 'attack'?t.defend:t.attack;
 if(enemyAlive === 0){endRound(GAME.side,(GAME.side === 'attack'?'攻方':'守方')+'全歼对手'); return;}
 if(playerTeamAlive === 0){
  // 玩家阵营全灭：攻方有包未爆则等待爆炸，否则守方胜
  if(GAME.side === 'attack'){if(GAME.bomb === 'planted')return; endRound('defend','攻方全灭');}
  else endRound('attack','守方全灭');
 }
}
function endRound(winner,reason){
 if(GAME.phase !== 'live')return;
 GAME.phase = 'ended'; GAME.roundEnd = 4.2; GAME.result = {winner,reason};
 if(winner === 'attack')GAME.scoreA++; else GAME.scoreD++;
 if((winner === 'attack') === (GAME.side === 'attack'))GAME.money = Math.min(16000,GAME.money+1500);
 else GAME.money = Math.min(16000,GAME.money+700);
 toast((winner === GAME.side?'回合胜利':'回合失利')+' · '+reason,3.4);
 $('plantBar').hidden = true; $('bombBar').hidden = true;
 sound(winner === GAME.side?'head':'hurt');
 updateHUD();
}
function nextRound(){
 GAME.round++;
 startRound();
 toast('第 '+GAME.round+' 回合 · 按 B 补充装备');
}

/* ================= 人机 AI ================= */
function botMove(a,dx,dz,dt){
 const m = activeMap;
 // 任何 NaN/Infinity 位移都直接丢弃，否则坐标被污染后模型会永久“消失”
 if(!Number.isFinite(dx)||!Number.isFinite(dz))return;
 dx = THREE.MathUtils.clamp(dx,-1.2,1.2);
 dz = THREE.MathUtils.clamp(dz,-1.2,1.2);
 const steps = 3;
 for(let i=0;i<steps;i++){
  const sx = dx/steps, sz = dz/steps;
  if(botPositionOk(a.pos.x+sx,a.pos.z,a.pos.y,.3))a.pos.x += sx;
  if(botPositionOk(a.pos.x,a.pos.z+sz,a.pos.y,.3))a.pos.z += sz;
 }
 a.pos.y = surfaceAt(m,a.pos.x,a.pos.z,a.pos.y);
}
/* 兜底：坐标非法或已卡进墙体时，拉回最近的合法导航点 */
function botSanitize(a){
 const m = activeMap;
 if(!Number.isFinite(a.pos.x)||!Number.isFinite(a.pos.z)||!Number.isFinite(a.pos.y))return true;
 if(!botPositionOk(a.pos.x,a.pos.z,a.pos.y,.05)){
  const near = nearestPoint(m,a.pos.x,a.pos.z)||[m.defendSpawn.x,m.defendSpawn.z];
  a.pos.set(near[0],surfaceAt(m,near[0],near[1],3),near[1]);
  a.path = []; a.pathIndex = 0; a.repath = 0;
  return true;
 }
 return false;
}
/* 沿路点行走：始终朝“视线内最远的路点”走，避免被中间墙体卡住 */
function botWalkPath(a,dt,speed){
 const m = activeMap;
 if(!a.path.length)return false;
 while(a.pathIndex < a.path.length-1){
  const p = a.path[a.pathIndex];
  if(Math.hypot(p.x-a.pos.x,p.y-a.pos.z) < .55){a.pathIndex++;}
  else break;
 }
 if(a.pathIndex >= a.path.length)return false;
 let target = a.path[a.pathIndex];
 for(let i=a.path.length-1;i>a.pathIndex;i--){
  const p = a.path[i];
  if(segClear(m,a.pos.x,a.pos.z,p.x-a.pos.x,p.y-a.pos.z)){a.pathIndex = i; target = p; break;}
 }
 const dx = target.x-a.pos.x, dz = target.y-a.pos.z, d = Math.hypot(dx,dz);
 // d 可能为 0（路点与自身重合），除法会产生 NaN 让模型直接消失
 if(!(d > 1e-4)){
  a.pathIndex++;
  return false;
 }
 botYawDamp(a,Math.atan2(dx,dz),dt);
 botMove(a,dx/d*dt*speed,dz/d*dt*speed,dt);
 return true;
}
/* 绕障：直线被挡时，用 9 个方向做射线试探，挑“离目标最近且能走”的方向小步前进 */
function botDetour(a,gx,gz,dt,speed){
 const base = Math.atan2(gx-a.pos.x,gz-a.pos.z);
 let best = null, bestScore = -Infinity;
 for(let i=-4;i<=4;i++){
  const ang = base+i*.4, dx = Math.sin(ang), dz = Math.cos(ang);
  if(!segClear(activeMap,a.pos.x,a.pos.z,dx*1.5,dz*1.5))continue;
  const nx = a.pos.x+dx*1.5, nz = a.pos.z+dz*1.5;
  const score = -Math.hypot(gx-nx,gz-nz)-Math.abs(i)*.35;
  if(score > bestScore){bestScore = score; best = {dx,dz};}
 }
 if(!best){
  botYawDamp(a,(a.yaw||0)+1.2,dt);
  return false;
 }
 botYawDamp(a,Math.atan2(best.dx,best.dz),dt);
 botMove(a,best.dx*dt*speed*.7,best.dz*dt*speed*.7,dt);
 return true;
}
function botYawDamp(a,target,dt){
 let d = target-a.yaw;
 while(d > Math.PI)d -= Math.PI*2;
 while(d < -Math.PI)d += Math.PI*2;
 a.yaw += d*Math.min(1,dt*9);
}
function botFindPath(a,gx,gz){
 const m = activeMap;
 a.path = findPath(m,a.pos.x,a.pos.z,gx,gz).map(p => new THREE.Vector2(p[0],p[1]));
 a.pathIndex = 0;
 a.repath = 1.6+Math.random()*1.2;
}
function botGoalPosition(a){
 const m = activeMap;
 if(a.team === 'attack'){
  if(a.hasBomb || GAME.bomb === 'carried' || GAME.bomb === 'planted'){
   const s = (a.hasBomb&&a.bombSite?m.bombsites.find(b => b.id === a.bombSite):null) || GAME.bombSite || m.bombsites[0];
   const j = a.hasBomb?1.2:3.2;
   return {x:s.center.x+(Math.random()-.5)*j*2,z:s.center.z+(Math.random()-.5)*j*2};
  }
  if(!a.siteChoice)a.siteChoice = m.bombsites[Math.random()<.5?0:1];
  return {x:a.siteChoice.center.x+(Math.random()-.5)*5,z:a.siteChoice.center.z+(Math.random()-.5)*5};
 }
 if(a.spot)return {x:a.spot.x,z:a.spot.z};
 return {x:m.defendSpawn.x,z:m.defendSpawn.z};
}
function assignSpot(a){
 const m = activeMap;
 if(a.team === 'defend'){
  const pool = m.spots.filter(s => s.t === 'A' || s.t === 'B');
  a.spot = pool[Math.floor(Math.random()*pool.length)];
 }else{
  const s = a.bombSite?m.bombsites.find(b => b.id === a.bombSite):null;
  const tgt = s||m.bombsites[Math.floor(Math.random()*2)];
  a.spot = {t:tgt.id,x:tgt.center.x,z:tgt.center.z};
 }
}
function botCanSee(a,px,py,pz){
 const eye = new THREE.Vector3(a.pos.x,a.pos.y+1.6,a.pos.z);
 const target = new THREE.Vector3(px,py,pz);
 const dist = eye.distanceTo(target);
 if(dist > 55)return false;
 return losClear(eye.x,eye.z,target.x,target.z);
}
function botShoot(a,target,targetIsPlayer,dt){
 a.fireCd -= dt;
 if(a.muzzleT > 0){a.muzzleT -= dt; if(a.muzzleT <= 0)a.flashMesh.visible = false;}
 // 被闪光弹致盲期间无法开枪
 if(a.blindUntil > elapsed)return;
 if(a.fireCd > 0)return;
 const dist = a.pos.distanceTo(target);
 const aimDelay = a.acquire>0?a.acquire:0;
 const hitChance = THREE.MathUtils.clamp((a.skill-aimDelay)*(1-dist/80),.05,.4);
 a.burst = a.burst > 0?a.burst-1:3+Math.floor(Math.random()*4);
 a.fireCd = a.burst > 0?.12+Math.random()*.08:.7+Math.random()*.7;
 gunFlashBot(a);
 if(Math.random() < hitChance){
  if(targetIsPlayer)hurtPlayer(20);
  else if(target && target.hp !== undefined && target.alive !== undefined){
   target.hp -= 20;
   if(target.hp <= 0)killBot(target,'body',WEAPONS.m4.name,false);
  }
 }
}
function botStep(a,dt){
 const m = activeMap;
 a.think -= dt;
 if(a.repath > 0)a.repath -= dt;
 // 走到路径尽头就重算，避免站在原地看着墙壁
 if(a.path.length&&a.pathIndex >= a.path.length){a.path = []; a.pathIndex = 0; a.repath = 0;}
 // 目标选择：能先看到玩家则优先玩家，否则取最近的可见敌人
 let target = null, targetIsPlayer = false, targetDist = 1e9, seenPlayer = false;
 const enemyTeam = a.team === 'attack'?'defend':'attack';
 if(GAME.alive && GAME.side === enemyTeam){
  const py = player.y - .45;
  if(botCanSee(a,player.x,py,player.z)){target = player; targetIsPlayer = true; seenPlayer = true; targetDist = a.pos.distanceTo(player);}
 }
 let nearest = null, nd = 1e9;
 for(const b of bots){
  if(!b.alive || b.team !== enemyTeam)continue;
  if(!botCanSee(a,b.pos.x,b.pos.y+1.2,b.pos.z))continue;
  const d = a.pos.distanceTo(b.pos);
  if(d < nd){nearest = b; nd = d;}
 }
 if(nearest && (!seenPlayer || nd < targetDist*.55)){target = nearest; targetIsPlayer = false; targetDist = nd; a.prefPlayer = false;}
 else if(seenPlayer){a.prefPlayer = true;}
 if(target){
  // 面朝目标并射击（有短暂的反应时间，不会瞬间锁头）
  botYawDamp(a,Math.atan2(target.x-a.pos.x,target.z-a.pos.z),dt);
  if(a.lastTarget !== target){a.lastTarget = target; a.acquire = .32+Math.random()*.3;}
  else if(a.acquire > 0)a.acquire = Math.max(0,a.acquire-dt);
  botShoot(a,target,targetIsPlayer,dt);
  a.phase = 'engage';
  // 侧身移动
  if(a.think <= 0){a.think = 1.1+Math.random()*.9; a.strafe = (Math.random()<.5?-1:1)*(.6+Math.random()*.9);}
  if(targetDist > 12){
   const gx = a.pos.x+(target.x-a.pos.x)/targetDist*1.4, gz = a.pos.z+(target.z-a.pos.z)/targetDist*1.4;
   if(segClear(m,a.pos.x,a.pos.z,gx-a.pos.x,gz-a.pos.z))botMove(a,(gx-a.pos.x)*dt*2.2,(gz-a.pos.z)*dt*2.2,dt);
  }else if(targetDist < 6){
   const gx = a.pos.x-(target.x-a.pos.x)/targetDist*.6, gz = a.pos.z-(target.z-a.pos.z)/targetDist*.6;
   if(segClear(m,a.pos.x,a.pos.z,gx-a.pos.x,gz-a.pos.z))botMove(a,(gx-a.pos.x)*dt*1.8,(gz-a.pos.z)*dt*1.8,dt);
  }else{
   const px = Math.cos(a.yaw)*a.strafe*.35, pz = -Math.sin(a.yaw)*a.strafe*.35;
   if(segClear(m,a.pos.x,a.pos.z,px,pz))botMove(a,px*dt*2.2,pz*dt*2.2,dt);
  }
  a.repath = Math.min(a.repath,.4);
 }else{
  if(a.team === 'attack' && !a.spot)assignSpot(a);
  if(!a.spot && a.team === 'defend')assignSpot(a);
  const goal = botGoalPosition(a);
  const far = Math.hypot(goal.x-a.pos.x,goal.z-a.pos.z) > 1.4;
  // 目标点变化或路径失效时立刻重算
  if(far&&(!a.path.length || a.repath <= 0 || a.goalKey !== (a.spot?a.spot.t+'_'+Math.round(a.spot.x):'free'))){
   a.goalKey = a.spot?a.spot.t+'_'+Math.round(a.spot.x):'free';
   botFindPath(a,goal.x,goal.z);
  }
  if(far){
   const walked = botWalkPath(a,dt,2.9);
   if(!walked){
    // 路点走完或规划失败：直接朝目标做绕障试探
    a.unstick = (a.unstick||0)+1;
    if(!botDetour(a,goal.x,goal.z,dt,2.9)&&a.unstick > 20){a.repath = 0; a.path = [];}
    if(a.unstick > 45){a.unstick = 0; a.repath = 0; a.path = []; a.spot = null; a.goalKey = null;}
   }else a.unstick = 0;
  }else if(a.team === 'defend'){
   a.yaw = m.hub?Math.atan2(m.hub.x-a.pos.x,m.hub.z-a.pos.z):a.yaw;
   if(a.think <= 0){a.think = 2+Math.random()*2; a.yaw += (Math.random()-.5)*1.2;}
  }else{
   if(a.think <= 0){a.think = 2+Math.random()*2; a.yaw += (Math.random()-.5)*1.4;}
  }
 // 攻方下包
 if(a.hasBomb){
  const site = m.bombsites.find(s => Math.hypot(s.center.x-a.pos.x,s.center.z-a.pos.z) < s.radius+.9);
  if(site){
   a.plantT += dt;
   if(a.plantT >= 5){a.hasBomb = false; GAME.bomb = 'planted'; GAME.bombSite = site; GAME.bombTimer = 40; site.material.opacity = .3; bombObject.visible = true; bombObject.position.set(site.center.x,.2,site.center.z);
    toast('人机已下包 · '+site.name,3); updateHUD();}
  }else {a.plantT = 0; if(!a.path.length || a.repath <= 0)botFindPath(a,a.spot.x,a.spot.z);}
 }
}
 // 卡死检测：贴墙时先沿墙侧移、再后退，最后重算路径
 const moved = a.pos.distanceTo(a.lastPos);
 if(moved < .012){
  a.stuckT += dt;
  if(a.stuckT > .45){
   a.stuckT = 0;
   a.unstick = (a.unstick||0)+1;
   const back = a.unstick === 1?1.2:(a.unstick === 2?2.2:1.0);
   const ang = a.yaw+(a.unstick%2?1:-1)*.8+Math.PI;
   botYawDamp(a,Math.atan2(Math.cos(ang),-Math.sin(ang)),dt);
   botMove(a,Math.cos(ang)*back*dt*3.2,-Math.sin(ang)*back*dt*3.2,dt);
   a.path = []; a.pathIndex = 0; a.repath = .2;
   if(a.unstick > 2){a.spot = null; a.goalKey = null; a.unstick = 0;}
  }
 }else{a.stuckT = 0; if(moved > .05)a.unstick = 0;}
 a.lastPos.copy(a.pos);
}
function updateBots(dt){
 if(activeMap.train)return;
 for(const a of bots){
  if(!a.alive)continue;
  if(a.muzzleT > 0){a.muzzleT -= dt; if(a.muzzleT <= 0)a.flashMesh.visible = false;}
  botStep(a,dt);
  botSanitize(a);
  if(!Number.isFinite(a.yaw))a.yaw = 0;
  a.group.position.set(a.pos.x,a.pos.y,a.pos.z);
  a.group.rotation.y = a.yaw;
  const friendly = a.team === GAME.side;
  const dist = a.pos.distanceTo(player);
  const bar = a.barGroup;
  bar.lookAt(camera.position);
  // 队友：始终显示青色倒三角 + 名字牌 + 血条；敌人：不显示任何标记
  bar.visible = friendly && dist < 58;
  a.marker.visible = friendly && dist < 58;
  a.namePlate.visible = friendly && dist < 34;
  if(a.namePlate.visible){
   a.namePlate.quaternion.copy(camera.quaternion);
   const k = THREE.MathUtils.clamp(dist/34,.55,1);
   a.namePlate.scale.setScalar(1+(1-k)*.35);
   a.namePlate.material.opacity = k;
  }
 }
 // 攻方全灭但包已下 → 只等爆炸
}

/* ================= HUD ================= */
function zoneName(){
 const m = activeMap;
 if(m.train)return player.z < -25?'深处庭口':player.z < -6?'市场区':'入口巷道';
 if(m.id === 'world1')return Math.abs(player.z) < 3?'中路':player.z < -9?'双方交火区':Math.abs(player.x) > 14?'A / B 区侧翼':player.z > 22?'攻方重生':player.z < -22?'守方重生':'外围街巷';
 if(m.id === 'world2')return Math.abs(player.x) > 13?'A / B 区侧厅':Math.hypot(player.x,player.z) < 12?'中央穿廊':Math.abs(player.z) > 25?'重生平台':'外环回廊';
 return Math.abs(player.x) > 19?'A / B 区':Math.abs(player.x) < 4?'中庭石廊':player.z > 24?'攻方重生':player.z < -24?'守方重生':'侧路';
}
function updateHUD(){
 const w = weaponDef();
 const hasClip = w.clip !== null;
 $('ammo').textContent = hasClip?String(mag).padStart(2,'0'):'∞';
 $('ammoMax').textContent = hasClip?'/ '+w.clip:'';
 $('reloadLabel').textContent = reloadT > 0?'正在换弹…':(hasClip&&mag === 0?'按 R 更换弹匣':w.label);
 $('ammoBars').innerHTML = hasClip?Array.from({length:Math.min(w.clip,30)},()=>`<i class="${'x'}"></i>`).join(''):'';
 if(hasClip){
  const bars = $('ammoBars').children;
  for(let i=0;i<bars.length;i++)bars[i].className = i >= mag?'empty':'';
 }
 $('hpValue').textContent = Math.max(0,Math.round(GAME.hp));
 $('hpFill').style.width = Math.max(0,Math.min(100,GAME.hp))+'%';
 $('hpFill').style.background = GAME.hp > 55?'#8bd2ba':GAME.hp > 25?'#eec184':'#ff8a6b';
 $('armorValue').textContent = Math.round(GAME.armor);
 $('armorFill').style.width = Math.min(100,GAME.armor*2)+'%';
 $('accuracy').textContent = '命中率 '+(shots?Math.round(hits/shots*100)+'%':'—');
 $('scoreLine').textContent = GAME.scoreA+' : '+GAME.scoreD;
 const t = teamAlive();
 $('aliveLine').textContent = (GAME.side === 'attack'?t.attack:t.defend)+' : '+(GAME.side === 'attack'?t.defend:t.attack);
 $('sideLabel').textContent = (GAME.side === 'attack'?'攻方 ATTACK':'守方 DEFEND')+' · 第 '+GAME.round+' 回合';
 const label = mode === 'train'?'自由练习':activeMap.name;
 $('modeLabel').textContent = label;
 $('zone').textContent = zoneName();
 document.querySelectorAll('.slot').forEach(b => {
  const kind = b.dataset.slot;
  const equipped = kind === 'rifle' ? rifleEquipped : kind === 'pistol' ? pistolEquipped : 'knife';
  b.classList.toggle('active', equipped === currentWeapon);
  b.classList.toggle('locked', kind === 'rifle' && !rifleEquipped);
 });
 $('slotRifle').textContent = rifleEquipped ? WEAPONS[rifleEquipped].name : '长枪';
 $('slotPistol').textContent = pistolEquipped ? WEAPONS[pistolEquipped].name : '手枪';
 if(activeMap.train){
  $('timer').textContent = fmtTime(elapsed); $('timerLabel').textContent = '练习用时';
  $('aliveLine').textContent = kills+' / 12';
  $('scoreLine').textContent = score();
 }else{
  const remain = GAME.bomb === 'planted'?GAME.bombTimer:GAME.roundTime;
  $('timer').textContent = fmtTime(Math.max(0,Math.ceil(remain)));
  $('timerLabel').textContent = GAME.bomb === 'planted'?'炸弹倒计时':'回合时间';
  document.querySelector('.time-stat').classList.toggle('urgent',remain <= 20);
 }
 const carrying = GAME.side === 'attack' && GAME.bomb === 'carried';
 const inSite = carrying && siteAt(player.x,player.z);
 $('bombBar').hidden = !(carrying && GAME.alive && GAME.phase === 'live');
 $('crosshairHint').textContent = GAME.bomb === 'planted'&&GAME.side === 'defend'&&GAME.alive&&Math.hypot(player.x-GAME.bombSite.center.x,player.z-GAME.bombSite.center.z) < GAME.bombSite.radius+2
  ? '按住 F 拆包 · '+(5-GAME.defuse).toFixed(1)+'s' : (inSite?'按 F 下包':'');
 $('keyHint').textContent = GAME.crouching?'蹲伏中 · 速度减半 · 空格 跳跃 · R 换弹 · E 闪光 · B 购买':'WASD 移动 · 空格 跳跃 · Ctrl 蹲 · R 换弹 · E 闪光 · B 购买 · Esc 暂停';
 $('flashSlot').textContent = 'E 投掷闪光弹 ×' + (GAME.flash|0);
 // 准星精度提示 + 扩大准星表现散布
 const acc = GAME.accuracy||{moving:false,airborne:false};
 const spreadNow = acc.airborne||acc.moving;
 const as = $('aimState');
 if(as){
  as.textContent = acc.airborne?'腾空 · 无法精准射击':acc.moving?'移动中 · 散布扩大':'站定 · 精准';
  as.classList.toggle('spread',spreadNow);
 }
 const ch = $('crosshair');
 if(ch&&!ch.classList.contains('off')){
  if(chSet.dynamic){
   const sc = 1 + (acc.moving?.9:0) + chSpread*.55;
   ch.style.transform = 'scale('+sc.toFixed(3)+')';
  } else ch.style.transform = 'scale(1)';
 }
 if(ch)ch.style.transition = 'transform .08s';
 $('crosshair').classList.toggle('off',reloadT > 0||!GAME.alive||currentWeapon === 'knife');
}
function fmtTime(n){n = Math.max(0,n); return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');}

/* ================= 小地图 ================= */
function mapBounds(){
 const m = activeMap;
 if(m.train)return {x1:-6,x2:34,z1:-46,z2:20};
 return {x1:-32,x2:32,z1:-38,z2:38};
}
function drawMap(canvas,report=false){
 const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
 ctx.clearRect(0,0,w,h); ctx.fillStyle = '#14222b'; ctx.fillRect(0,0,w,h);
 const b = mapBounds(), pad = report?26:8;
 const scale = Math.min((w-pad*2)/(b.x2-b.x1),(h-pad*2)/(b.z2-b.z1));
 const ox = (w-(b.x2-b.x1)*scale)/2, oy = (h-(b.z2-b.z1)*scale)/2;
 const conv = (x,z)=>[ox+(x-b.x1)*scale,oy+(z-b.z1)*scale];
 // 可行走地面
 ctx.fillStyle = '#3c4d55';
 ctx.fillRect(ox,oy,(b.x2-b.x1)*scale,(b.z2-b.z1)*scale);
 // 墙
 ctx.fillStyle = '#22323a';
 for(const c of activeMap.colliders){const [x1,x2,,] = c; const [x,y] = conv(x1,c[2]); ctx.fillRect(x,y,(x2-x1)*scale,(c[3]-c[2])*scale);}
 if(activeMap.train){ctx.fillStyle = '#5c6b70'; for(const s of activeMap.streets){const [x,y] = conv(s[0],s[2]); ctx.fillRect(x,y,(s[1]-s[0])*scale,(s[3]-s[2])*scale);}}
 // 包点
 for(const s of activeMap.bombsites){
  const [x,y] = conv(s.center.x-s.radius,s.center.z-s.radius);
  ctx.strokeStyle = s.id === 'A'?'#eec184':'#8cd9d5'; ctx.lineWidth = report?2:1.4;
  ctx.strokeRect(x,y,s.radius*2*scale,s.radius*2*scale);
  ctx.fillStyle = s.id === 'A'?'#eec18455':'#8cd9d555'; ctx.fillRect(x,y,s.radius*2*scale,s.radius*2*scale);
  ctx.fillStyle = s.id === 'A'?'#eec184':'#8cd9d5'; ctx.font = 'bold '+(report?10:7)+'px sans-serif'; ctx.textAlign = 'center';
  const [cx,cy] = conv(s.center.x,s.center.z); ctx.fillText(s.id,cx,cy+3);
 }
 // 重生点
 for(const [pos,color] of [[activeMap.attackSpawn,'#eec184'],[activeMap.defendSpawn,'#8cd9d5']]){
  if(!pos)continue; const [x,y] = conv(pos.x,pos.z); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x,y,report?7:4,0,Math.PI*2); ctx.stroke();
 }
 // 轨迹
 if(report&&route.length > 1){ctx.beginPath(); route.forEach(([x,z],i) => {const [px,py] = conv(x,z); i?ctx.lineTo(px,py):ctx.moveTo(px,py);}); ctx.strokeStyle = '#8cd9d5aa'; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);}
 reportPoints = [];
 for(const a of bots){
  if(!a.alive)continue;
  const [x,y] = conv(a.pos.x,a.pos.z);
  const friendly = a.team === GAME.side;
  // 敌军只在小地图上显示“被看见/开枪”后的位置
  const revealed = !friendly && (a.muzzleT > -.5 && a.pos.distanceTo(player) < 34 && losClear(player.x,player.z,a.pos.x,a.pos.z));
  if(!friendly && !revealed)continue;
  ctx.beginPath(); ctx.arc(x,y,report?5:3,0,Math.PI*2);
  ctx.fillStyle = friendly?'#8bd2ba':'#ff8a6b'; ctx.fill();
  if(a.hasBomb){ctx.strokeStyle = '#eec184'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x,y,(report?9:5),0,Math.PI*2); ctx.stroke();}
 }
 if(activeMap.train)for(const t of targets){if(t.dead)continue; const [x,y] = conv(t.headPos.x,t.headPos.z); ctx.fillStyle = t.first !== null?'#eec184':'#7f8f92'; ctx.beginPath(); ctx.arc(x,y,report?6:2.4,0,Math.PI*2); ctx.fill();}
 if(GAME.bomb === 'dropped'&&GAME.bombPos){const [x,y] = conv(GAME.bombPos.x,GAME.bombPos.z); ctx.fillStyle = '#ff8a6b'; ctx.fillRect(x-3,y-3,6,6);}
 // 玩家
 const [px,py] = conv(player.x,player.z);
 ctx.save(); ctx.translate(px,py);
 const heading = -yaw;
 ctx.rotate(heading);
 ctx.fillStyle = GAME.alive?'#e8f8f0':'#7d8b8e';
 ctx.beginPath(); ctx.moveTo(0,-(report?8:6)); ctx.lineTo(-(report?5:3.6),(report?6:4)); ctx.lineTo(0,(report?3:2.4)); ctx.lineTo((report?5:3.6),(report?6:4)); ctx.closePath(); ctx.fill();
 ctx.restore();
 if(!report){
  ctx.strokeStyle = '#ffffff22'; ctx.lineWidth = 1; ctx.strokeRect(.5,.5,w-1,h-1);
 }
}

/* ================= 首页 / 场景切换 ================= */
function setMode(m){
 mode = m;
 document.querySelectorAll('.mode').forEach(b => b.classList.toggle('selected',b.dataset.mode === m));
 const m2 = MAPS.find(x => x.id === m);
 if(m2){
  applyMap(m2);
  collectShotMeshes();
  camera.position.set(m2.train?-.8:0,1.95,m2.train?11.7:m2.attackSpawn.z+8);
  yaw = m2.train?-.1:Math.PI; pitch = .04;
 }
}
function updateBest(){$('homeBest').textContent = best?('最高得分 '+best.toLocaleString()):'尚无纪录';}
function saveSettings(){try{localStorage.setItem(VERSION+'-settings',JSON.stringify({sensitivity,volume,reduced,assist,low:$('lowQuality').checked}));}catch(e){}}
function loadStorage(){
 try{
  const d = JSON.parse(localStorage.getItem(VERSION)||'{}');
  best = Number.isFinite(d.best)?Math.max(0,d.best):0; records = Array.isArray(d.records)?d.records.slice(-10):[];
  savedSettings = JSON.parse(localStorage.getItem(VERSION+'-settings')||'{}')||{};
 }catch(e){}
 updateBest();
}
function reset(){
 resetMatch();
 if(mode === 'train'){
  state = 'prep'; prep = 3;
  player.set(0,groundHeightAt(activeMap,0,14)+1.65,14); yaw = 0; pitch = 0;
  GAME.jumpVel = 0; GAME.grounded = true; GAME.crouchBlend = 0;
  GAME.alive = true; GAME.hp = 100; GAME.armor = 0; GAME.phase = 'live';
  currentWeapon = 'pistol'; mag = WEAPONS.pistol.clip;
  // 训练场：全部武器免费解锁
  for(const id of ['m4','ak','awp','revolver']){WEAPON_STATE[id].owned = true; WEAPON_STATE[id].paid = 0;}
  rifleEquipped = 'awp'; pistolEquipped = 'revolver';
  GAME.bomb = null; ensureBombObject().visible = false;
  }else{
  state = 'run';
  GAME.side = Math.random() < .5?'attack':'defend';
  startRound();
  if(GAME.side === 'attack')toast('你是攻方 · 已携带炸弹 · 去 A 区或 B 区按 F 下包 · 按 B 购买',4);
 }
 $('timerLabel').textContent = mode === 'train'?'练习用时':'回合时间';
 $('assistRow').hidden = mode !== 'train';
 $('hitText').style.opacity = 0; $('hitmarker').style.opacity = 0;
 updateHUD();
}
let lockRetries = 0;
function lock(){
 if(dragControl){toast('拖动鼠标转动视角 · 单击射击 · Esc 暂停'); return;}
 const el = renderer.domElement;
 const request = () => {
  try{
   const p = el.requestPointerLock && el.requestPointerLock();
   if(p&&p.catch)p.catch(() => scheduleLockRetry());
  }catch(e){scheduleLockRetry();}
 };
 // 重新开一局时往往还处于/刚退出指针锁定状态，浏览器会拒绝 requestPointerLock，
 // 这里统一先释放，再在用户手势之后延迟重试
 if(document.pointerLockElement){
  document.exitPointerLock();
  setTimeout(request,80);
 } else if(document.pointerLockElement === null && document.hasFocus && !document.hasFocus()){
  scheduleLockRetry();
 } else {
  request();
  setTimeout(() => {if(!document.pointerLockElement)scheduleLockRetry();},120);
 }
}
function scheduleLockRetry(){
 if(dragControl||lockRetries > 12)return;
 if(!['run','prep','paused'].includes(state))return;
 lockRetries++;
 setTimeout(() => {
  if(document.pointerLockElement)return;
  if(!['run','prep'].includes(state))return;
  try{
   const p = renderer.domElement.requestPointerLock();
   if(p&&p.catch)p.catch(() => scheduleLockRetry());
  }catch(e){scheduleLockRetry();}
 }, 180);
}
function begin(){
 $('home').hidden = true; $('pause').hidden = true; $('results').hidden = true; $('hud').hidden = false; $('shop').hidden = true;
 document.body.classList.add('playing');
 initAudio();
 reset();
 lockRetries = 0;
 lock();
 if(mode !== 'train'){toast(GAME.side === 'attack'?'你是攻方 · 带着包去 A 区或 B 区 · 按 B 购买':'你是守方 · 守住 A 区与 B 区 · 按 B 购买',4);}
}
function pause(){
 if(!['run','prep'].includes(state))return;
 previousState = state; state = 'paused'; keys.clear(); dragging = false;
 $('pause').hidden = false; $('endPractice').hidden = mode !== 'train';
 if(document.pointerLockElement)document.exitPointerLock();
}
function resume(){if(state !== 'paused')return; state = previousState; $('pause').hidden = true; $('shop').hidden = true; initAudio(); lockRetries = 0; lock();}
function home(){
 state = 'home'; keys.clear(); firing = false;
 if(document.pointerLockElement)document.exitPointerLock();
 $('hud').hidden = true; $('results').hidden = true; $('pause').hidden = true; $('shop').hidden = true; $('home').hidden = false;
 $('aimLab').hidden = true;
 document.body.classList.remove('playing');
 gun.visible = false; ensureBombObject().visible = false;
 bots.forEach(a => {a.alive = false; a.group.visible = false;});
 targets.forEach(t => {t.group.visible = true; t.group.scale.setScalar(1);});
 setMode(mode); updateBest();
}
function shopOpen(){
 if(!['run','prep'].includes(state))return;
 const inSpawn = GAME.side === 'attack'?Math.hypot(player.x-activeMap.attackSpawn.x,player.z-activeMap.attackSpawn.z) < 12:Math.hypot(player.x-activeMap.defendSpawn.x,player.z-activeMap.defendSpawn.z) < 12;
 if(!GAME.alive){toast('阵亡后无法购买'); return;}
 if(!inSpawn && GAME.buyTime <= 0){toast('只能在自己重生点或购买阶段购买'); return;}
 state = 'shop'; firing = false; keys.clear();
 $('shop').hidden = false; refreshShop();
 if(document.pointerLockElement)document.exitPointerLock();
}
function refreshShop(){
 $('shopMoney').textContent = GAME.money;
 document.querySelectorAll('.buy').forEach(b => {
  const id = b.dataset.buy;
  const isGun = id === 'ak'||id === 'm4'||id === 'awp'||id === 'revolver'||id === 'pistol';
  // 长枪之间互斥、手枪之间互斥：只有当前装备的那把才算“已拥有”
  let owned = false;
  if(isGun){
   const kind = WEAPONS[id].kind;
   const cur = kind === 'rifle' ? rifleEquipped : pistolEquipped;
   owned = cur === id;
  }
  b.classList.toggle('owned', !!owned);
  const cost = BUY_PRICE[id] !== undefined ? BUY_PRICE[id] : 0;
  b.style.opacity = owned ? .72 : (GAME.money >= cost ? 1 : .45);
  b.querySelector('em').textContent = owned ? '已装备' : (cost === 0 ? '免费' : String(cost));
 });
}
const BUY_PRICE = {ak:2900,m4:2900,awp:3700,revolver:800,pistol:0,armor25:320,armor50:650,ammo:80,flash:300};
function buy(id){
 const price = BUY_PRICE[id];
 if(price === undefined)return;
 const isGun = id === 'ak'||id === 'm4'||id === 'awp'||id === 'revolver'||id === 'pistol';
 // 同槽位的枪不能重复拥有：先退掉旧枪的已付金额，再扣新枪价格（等价换枪 + 找差价）
 if(isGun){
  const kind = WEAPONS[id].kind;
  const oldId = kind === 'rifle' ? rifleEquipped : pistolEquipped;
  if(oldId === id){toast('已装备 '+WEAPONS[id].name); return;}
  if(GAME.money < price - (oldId ? (WEAPON_STATE[oldId].paid || 0) : 0)){
   toast('资金不足'); return;
  }
  let refund = 0;
  if(oldId && WEAPON_STATE[oldId]){
   refund = WEAPON_STATE[oldId].paid || 0;
   WEAPON_STATE[oldId].owned = false;
   WEAPON_STATE[oldId].paid = 0;
  }
  GAME.money = Math.max(0, GAME.money + refund - price);
  WEAPON_STATE[id].owned = true;
  WEAPON_STATE[id].paid = price;
  if(kind === 'rifle')rifleEquipped = id; else pistolEquipped = id;
  // 只有当手里握的正是被换掉的那把时才自动切换
  if(currentWeapon === oldId)setWeapon(id);
  else toast('已购买 '+WEAPONS[id].name+' · 按 '+(kind === 'rifle'?'1':'3')+' 切换');
  if(refund > 0)toast('已购买 '+WEAPONS[id].name+' · 退回 '+refund+'（差价 '+(refund-price)+'）',3);
  sound('pick'); refreshShop(); updateHUD(); return;
 }
 if(GAME.money < price){toast('资金不足'); return;}
 GAME.money -= price;
 if(id === 'armor25'){GAME.armor = Math.min(100,GAME.armor+25); toast('轻甲 · 护甲 '+Math.round(GAME.armor));}
 else if(id === 'armor50'){GAME.armor = Math.min(100,GAME.armor+50); toast('重甲 · 护甲 '+Math.round(GAME.armor));}
 else if(id === 'ammo'){const w = weaponDef(); if(w.clip !== null)mag = w.clip; toast('弹药已补满');}
 else if(id === 'flash'){
  if((GAME.flash|0) >= 2){GAME.money += price; toast('最多携带 2 枚闪光弹'); refreshShop(); updateHUD(); return;}
  GAME.flash = (GAME.flash|0) + 1; toast('已购买闪光弹 · 按 E 投掷');
 }
 sound('pick'); refreshShop(); updateHUD();
}
function closeShop(){
 if(state !== 'shop')return;
 state = GAME.phase === 'live'?'run':'prep';
 $('shop').hidden = true; lockRetries = 0; lock();
}

/* ================= 训练场观察与结算 ================= */
function observe(dt){
 if(mode !== 'train')return;
 camera.getWorldDirection(direction);
 const view = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 const walls = shotMeshes.filter(o => o.userData.target === undefined && o.userData.agent === undefined);
 const eye = new THREE.Vector3(player.x,player.y,player.z);
 for(const t of targets){
  if(t.dead){t.visibleFor = 0; continue;}
  let visible = false;
  if(view.containsPoint(t.headPos)){
   let pass = 0;
   for(const off of [-.12,0,.12]){
    const point = t.headPos.clone(); point.x += off;
    const delta = point.clone().sub(eye), distance = delta.length();
    ray.set(eye,delta.normalize()); ray.far = distance-.08;
    if(!ray.intersectObjects(walls,false).length)pass++;
   }
   visible = pass >= 2; ray.far = Infinity;
  }
  if(t.first !== null)continue;
  if(visible){if(t.visibleFor === 0)t.candidate = {time:elapsed-dt,angle:THREE.MathUtils.radToDeg(direction.angleTo(t.headPos.clone().sub(eye).normalize()))};
   t.visibleFor += dt; if(t.visibleFor >= .1){t.first = t.candidate.time; t.angle = t.candidate.angle;}}
  else {t.visibleFor = 0; t.candidate = null;}
 }
}
function score(){return kills*100+heads*50;}
function finish(){
 if(state === 'results')return;
 state = 'results'; keys.clear(); firing = false; route.push([player.x,player.z]);
 if(document.pointerLockElement)document.exitPointerLock();
 $('hud').hidden = true; $('results').hidden = false; document.body.classList.remove('playing');
 const total = targets.length, samples = targets.filter(t => t.angle !== null);
 const data = {version:VERSION,mode,score:score(),kills,heads,shots,hits,elapsed,accuracy:shots?hits/shots:null,headRate:kills?heads/kills:null,date:new Date().toISOString()};
 resultSnapshot = data;
 const isBest = data.score > best; if(isBest)best = data.score;
 try{records.push(data); records = records.slice(-10); localStorage.setItem(VERSION,JSON.stringify({best,records}));}catch(e){}
 $('resultEyebrow').textContent = 'PRACTICE COMPLETE / 训练完成';
 $('resultTitle').textContent = kills === total?'所有目标，都已击破。':'每一次，都更接近。';
 $('resultSubtitle').textContent = '击破 '+kills+' / '+total+' 个目标 · 用时 '+elapsed.toFixed(1)+' 秒';
 $('finalScore').textContent = data.score; $('finalScoreLabel').textContent = '本局得分';
 $('newBest').hidden = !isBest;
 const pct = v => v === null?'—':Math.round(v*100)+'%';
 $('resultMetrics').innerHTML = [['命中率',pct(data.accuracy)],['爆头率',pct(data.headRate)],['观察目标',samples.length+' / '+total]].map(([n,v]) => `<div class="metric"><small>${n}</small><strong>${v}</strong></div>`).join('');
 $('advice').innerHTML = kills === total?'<p>路线已清空 · 换一把武器或去 <b>世界 1-3</b> 试试真人机对枪。</p>':'<p>还有 <b>'+(total-kills)+'</b> 个目标未被击破，试试从拱门庭院绕后。</p>';
 $('pointDetail').textContent = '点击地图上的标记查看目标情况。';
 drawMap($('reportMap'),true); sound('head'); updateBest();
}

/* ================= 准心工坊 ================= */
const CH_DEFAULT = {color:'#d9fff0',thick:2,len:5,gap:4,dot:0,alpha:100,outline:true,dynamic:false,hide:false};
const CH_PRESETS = {
 default:{color:'#d9fff0',thick:2,len:5,gap:4,dot:0,alpha:100,outline:true,dynamic:false,hide:false},
 cross:{color:'#ffffff',thick:2,len:9,gap:6,dot:0,alpha:100,outline:true,dynamic:false,hide:false},
 dot:{color:'#8cd9d5',thick:2,len:0,gap:0,dot:3,alpha:100,outline:true,dynamic:false,hide:false},
 tshape:{color:'#eec184',thick:2,len:8,gap:3,dot:0,alpha:100,outline:true,dynamic:true,hide:false},
 hidden:{color:'#d9fff0',thick:2,len:5,gap:4,dot:0,alpha:100,outline:true,dynamic:false,hide:true}
};
let chSet = Object.assign({},CH_DEFAULT);
let aimPrevState = 'home', chSpread = 0;

function applyCrosshair(){
 const r = document.documentElement.style;
 r.setProperty('--ch-color',chSet.color);
 r.setProperty('--ch-thick',chSet.thick+'px');
 r.setProperty('--ch-len',chSet.len+'px');
 r.setProperty('--ch-gap',chSet.gap+'px');
 r.setProperty('--ch-dot',chSet.dot+'px');
 r.setProperty('--ch-alpha',(chSet.alpha/100).toFixed(2));
 const ch = $('crosshair');
 if(ch){
  ch.classList.toggle('outlined',!!chSet.outline);
  ch.classList.toggle('hidden',!!chSet.hide);
 }
}
function saveCrosshair(){
 try{localStorage.setItem(VERSION+'-crosshair',JSON.stringify(chSet));}catch(e){}
}
function loadCrosshair(){
 try{
  const d = JSON.parse(localStorage.getItem(VERSION+'-crosshair')||'null');
  if(d&&typeof d === 'object')chSet = Object.assign({},CH_DEFAULT,d);
 }catch(e){}
 applyCrosshair();
}
function drawAimPreview(){
 const cv = $('aimCanvas');
 if(!cv)return;
 const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W/2, cy = H/2;
 // 模拟暮色街区背景
 const g = ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,'#2b3d4c'); g.addColorStop(.55,'#4a5a63'); g.addColorStop(1,'#2a2620');
 ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
 ctx.fillStyle = '#1d262c'; ctx.fillRect(0,cy-26,W,52);
 ctx.fillStyle = '#c8b48a22';
 for(let i=0;i<8;i++)ctx.fillRect(i*56-14,cy-34,34,16);
 // 远处墙面
 ctx.fillStyle = '#33424a';
 ctx.fillRect(40,60,120,150); ctx.fillRect(260,90,110,120);
 ctx.fillStyle = '#243038'; ctx.fillRect(48,70,104,10);
 // 地面透视线
 ctx.strokeStyle = '#8aa0a044'; ctx.lineWidth = 1;
 for(let i=-4;i<=4;i++){ctx.beginPath();ctx.moveTo(cx+i*40,cy);ctx.lineTo(cx+i*140,H);ctx.stroke();}
 // 一个人形靶（方便观察准心覆盖效果）
 ctx.fillStyle = '#1b2429'; ctx.beginPath(); ctx.ellipse(cx,cy-6,26,46,0,0,Math.PI*2); ctx.fill();
 ctx.fillStyle = '#232f35'; ctx.beginPath(); ctx.ellipse(cx,cy-58,15,17,0,0,Math.PI*2); ctx.fill();
 ctx.fillStyle = '#8cd9d5'; ctx.beginPath(); ctx.arc(cx,cy-60,4,0,Math.PI*2); ctx.fill();
 // 准心
 ctx.save();
 ctx.globalAlpha = chSet.alpha/100;
 const col = chSet.color;
 const drawLine = (x1,y1,x2,y2)=>{
  ctx.strokeStyle = chSet.outline ? '#000' : col; ctx.lineWidth = chSet.thick+2;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = chSet.thick;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
 };
 const t = chSet.thick, L = chSet.len, G = chSet.gap;
 if(L > 0){
  drawLine(cx,cy-G-L,cx,cy-G);      // 上
  drawLine(cx,cy+G,cx,cy+G+L);      // 下
  drawLine(cx-G-L,cy,cx-G,cy);      // 左
  drawLine(cx+G,cy,cx+G+L,cy);      // 右
 }
 if(chSet.dot > 0){
  ctx.beginPath(); ctx.arc(cx,cy,chSet.dot/2,0,Math.PI*2);
  ctx.fillStyle = chSet.outline?'#000':col; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,Math.max(.5,chSet.dot/2-1),0,Math.PI*2);
  ctx.fillStyle = col; ctx.fill();
 }
 ctx.restore();
 // 说明
 ctx.fillStyle = '#cfe3e0'; ctx.font = '12px Consolas,monospace'; ctx.textAlign = 'left';
 ctx.fillText('厚 '+chSet.thick+'  长 '+chSet.len+'  间距 '+chSet.gap+'  点 '+chSet.dot, 14, H-14);
 ctx.textAlign = 'right';
 ctx.fillStyle = '#8d9a9e';
 ctx.fillText(chSet.hide?'准心已隐藏':(chSet.dynamic?'动态准心':'静态准心'), W-14, H-14);
}
function syncAimControls(){
 $('aimThick').value = chSet.thick; $('outThick').textContent = chSet.thick;
 $('aimLen').value = chSet.len; $('outLen').textContent = chSet.len;
 $('aimGap').value = chSet.gap; $('outGap').textContent = chSet.gap;
 $('aimDot').value = chSet.dot; $('outDot').textContent = chSet.dot;
 $('aimAlpha').value = chSet.alpha; $('outAlpha').textContent = chSet.alpha+'%';
 $('aimOutline').checked = !!chSet.outline;
 $('aimDynamic').checked = !!chSet.dynamic;
 $('aimHide').checked = !!chSet.hide;
 $('aimColorPicker').value = chSet.color;
 document.querySelectorAll('#aimColors button').forEach(b => b.classList.toggle('on',b.dataset.color.toLowerCase() === chSet.color.toLowerCase()));
 document.querySelectorAll('#aimPresets button').forEach(b => b.classList.toggle('on', b.dataset.preset === matchPreset()));
}
function matchPreset(){
 for(const k in CH_PRESETS){
  const p = CH_PRESETS[k];
  if(p.color===chSet.color&&p.thick===chSet.thick&&p.len===chSet.len&&p.gap===chSet.gap&&p.dot===chSet.dot&&p.hide===chSet.hide)return k;
 }
 return '';
}
function openAimLab(){
 aimPrevState = state;
 state = 'aim';
 $('aimLab').hidden = false;
 if(document.pointerLockElement)document.exitPointerLock();
 syncAimControls(); drawAimPreview();
}
function closeAimLab(){
 $('aimLab').hidden = true;
 state = aimPrevState;
 // 从暂停菜单进入时，关闭后要把暂停面板重新显示出来
 if(state === 'paused'){$('pause').hidden = false; return;}
 if(state === 'run'||state === 'prep'){lockRetries = 0; lock();}
}
function bindAimLab(){
 $('openAim').onclick = openAimLab;
 $('openAim2').onclick = () => {$('pause').hidden = true; openAimLab();};
 $('aimClose').onclick = closeAimLab;
 const upd = () => {applyCrosshair(); saveCrosshair(); syncAimControls(); drawAimPreview();};
 document.querySelectorAll('#aimPresets button').forEach(b => b.onclick = () => {
  chSet = Object.assign({},CH_PRESETS[b.dataset.preset]); upd();
 });
 document.querySelectorAll('#aimColors button').forEach(b => b.onclick = () => {chSet.color = b.dataset.color; upd();});
 $('aimColorPicker').oninput = e => {chSet.color = e.target.value; upd();};
 $('aimThick').oninput = e => {chSet.thick = +e.target.value; upd();};
 $('aimLen').oninput = e => {chSet.len = +e.target.value; upd();};
 $('aimGap').oninput = e => {chSet.gap = +e.target.value; upd();};
 $('aimDot').oninput = e => {chSet.dot = +e.target.value; upd();};
 $('aimAlpha').oninput = e => {chSet.alpha = +e.target.value; upd();};
 $('aimOutline').onchange = e => {chSet.outline = e.target.checked; upd();};
 $('aimDynamic').onchange = e => {chSet.dynamic = e.target.checked; upd();};
 $('aimHide').onchange = e => {chSet.hide = e.target.checked; upd();};
 $('aimReset').onclick = () => {chSet = Object.assign({},CH_DEFAULT); upd(); toast('准心已恢复默认');};
}

/* ================= 输入 ================= */
function bind(){
 document.querySelectorAll('.mode').forEach(button => button.addEventListener('click',() => setMode(button.dataset.mode)));
 $('start').onclick = begin; $('resume').onclick = resume; $('restart').onclick = begin; $('again').onclick = begin;
 $('quit').onclick = home; $('backHome').onclick = home; $('pauseButton').onclick = pause;
 $('endPractice').onclick = () => {$('pause').hidden = true; finish();};
 $('closeShop').onclick = closeShop;
 document.querySelectorAll('.buy').forEach(b => b.onclick = () => buy(b.dataset.buy));
 document.querySelectorAll('.slot').forEach(b => b.onclick = e => {e.stopPropagation(); setSlot(b.dataset.slot);});

 document.addEventListener('keydown',e => {
  if(state === 'aim'){
   if(e.code === 'Escape'){e.preventDefault(); closeAimLab();}
   return;
  }
  if(state === 'shop'){if(e.code === 'KeyB'||e.code === 'Escape'){e.preventDefault(); closeShop();} return;}
  if(['KeyW','KeyA','KeyS','KeyD','KeyR','Space','ControlLeft'].includes(e.code)&&['run','prep'].includes(state))e.preventDefault();
  if(e.code === 'Escape'){pause(); return;}
  if(state === 'results'){return;}
  if(e.code === 'KeyR'){startReload(); return;}
  if(e.code === 'KeyB'){shopOpen(); return;}
  if(e.code === 'KeyE'){throwFlash(); return;}
  if(e.code === 'Digit1')return setSlot('rifle');
  if(e.code === 'Digit2')return setSlot('knife');
  if(e.code === 'Digit3')return setSlot('pistol');
  if(e.code === 'Space'){e.preventDefault(); keys.add('Space'); return;}
  if(e.code === 'KeyF'){
   if(GAME.side === 'attack'&&GAME.bomb === 'carried'&&GAME.alive&&state === 'run'){if(siteAt(player.x,player.z))startPlant(); else toast('必须站在 A 区或 B 区内才能下包');}
   if(GAME.bomb === 'dropped'&&GAME.alive&&GAME.side === 'attack'&&GAME.bombPos&&Math.hypot(player.x-GAME.bombPos.x,player.z-GAME.bombPos.z) < 2.2){GAME.bomb = 'carried'; pickupBomb();}
  }
  keys.add(e.code);
 });
 document.addEventListener('keyup',e => keys.delete(e.code));
 document.addEventListener('mousemove',e => {
  if(!['run','prep'].includes(state)||!GAME.alive)return;
  if(!dragControl&&document.pointerLockElement !== renderer.domElement)return;
  if(dragControl&&!dragging)return;
  const sens = scopeOn ? sensitivity*.55 : sensitivity;   // 开镜时降低灵敏度
  yaw -= e.movementX*.002*sens;
  pitch = THREE.MathUtils.clamp(pitch-e.movementY*.002*sens,-1.35,1.35);
 });
 let pressX = 0, pressY = 0;
 renderer.domElement.addEventListener('mousedown',e => {
  // 指针未锁定时先尝试重新锁定，避免鼠标指针一直露在画面上
  if(!document.pointerLockElement && !dragControl && ['run','prep'].includes(state)){
   lockRetries = 0; lock(); e.preventDefault(); return;
  }
  if(e.button !== 0)return;
  if(dragControl){dragging = true; pressX = e.clientX; pressY = e.clientY;}
  firing = true;
  if(weaponDef().type === 'melee'||!weaponDef().auto)playerShoot();
  else playerShoot();
 });
 document.addEventListener('mouseup',e => {
  if(e.button !== 0)return;
  firing = false;
  if(dragControl){if(dragging&&Math.hypot(e.clientX-pressX,e.clientY-pressY) < 5&&weaponDef().type === 'melee')playerShoot(); dragging = false;}
 });
 // 右键切换开镜（AWP）
 document.addEventListener('mousedown',e => {
  if(e.button === 2){e.preventDefault(); toggleScope();}
 }, true);
 renderer.domElement.addEventListener('contextmenu',e => e.preventDefault());
 document.addEventListener('pointerlockchange',() => {
  if(document.pointerLockElement){lockRetries = 0; return;}
  if(['run','prep'].includes(state))pause();
 });
 document.addEventListener('pointerlockerror',() => {if(['run','prep'].includes(state))scheduleLockRetry();});
 document.addEventListener('visibilitychange',() => {if(document.hidden)pause();});
 window.addEventListener('blur',() => {keys.clear(); firing = false; if(['run','prep'].includes(state))pause();});
 window.addEventListener('resize',() => {camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);});
 // 灵敏度：0.01 ~ 10，最多两位小数
 const sensText = $('sensitivityText'), sensRange = $('sensitivity');
 function applySens(v,from){
  v = Math.min(10,Math.max(.01,Number(v)||.01));
  v = Math.round(v*100)/100;
  sensitivity = v;
  if(from !== 'text')sensText.value = v.toFixed(2);
  if(from !== 'range')sensRange.value = v;
  $('sensValue').textContent = v.toFixed(2);
  saveSettings();
 }
 sensText.addEventListener('input',e => {
  let raw = e.target.value.replace(/[^\d.]/g,'');
  const dot = raw.indexOf('.');
  if(dot >= 0)raw = raw.slice(0,dot+1)+raw.slice(dot+1).replace(/\./g,'').slice(0,2);
  raw = raw.slice(0,5);
  e.target.value = raw;
  const num = Number(raw);
  if(raw&&Number.isFinite(num))applySens(num,'text');
 });
 sensText.addEventListener('blur',() => {applySens(sensText.value||sensitivity,'none'); sensText.value = sensitivity.toFixed(2);});
 sensRange.addEventListener('input',e => applySens(e.target.value,'range'));
 $('volume').oninput = e => {volume = Number(e.target.value)/100; $('volumeValue').textContent = Math.round(volume*100)+'%'; saveSettings();};
 $('reduceMotion').onchange = e => {reduced = e.target.checked; saveSettings();};
 $('assist').onchange = e => {assist = e.target.checked; saveSettings();};
 $('lowQuality').onchange = e => {
  renderer.shadowMap.enabled = !e.target.checked;
  renderer.setPixelRatio(Math.min(devicePixelRatio,e.target.checked?1:1.6));
  scene.traverse(o => {if(o.material)o.material.needsUpdate = true;});
  saveSettings();
 };
 if(Number.isFinite(savedSettings.sensitivity))applySens(savedSettings.sensitivity,'all');
 else applySens(1,'all');
 if(Number.isFinite(savedSettings.volume)){$('volume').value = savedSettings.volume*100; $('volume').dispatchEvent(new Event('input'));}
 for(const [id,key] of [['reduceMotion','reduced'],['assist','assist'],['lowQuality','low']])if(typeof savedSettings[key] === 'boolean'){$(id).checked = savedSettings[key]; $(id).dispatchEvent(new Event('change'));}
 $('reportMap').onclick = () => {};
}

/* ================= 主循环 ================= */
let frame = 0;
function updatePlayer(dt){
 const m = activeMap;
 // 蹲下：只受按键控制，与是否离地无关；视角高度平滑过渡
 const wantCrouch = keys.has('ControlLeft')||keys.has('ControlRight');
 const standH = 1.65, crouchH = 1.05;
 if(GAME.crouchBlend === undefined)GAME.crouchBlend = 0;
 GAME.crouchBlend += ((wantCrouch?1:0)-GAME.crouchBlend)*Math.min(1,dt*12);
 const crouch = GAME.crouchBlend > .5;
 const eyeH = standH+(crouchH-standH)*GAME.crouchBlend;
 const w = weaponDef();
 let speed = 4.0*(crouch?.5:1)*(w.type === 'melee'?w.speed:1);
 if(GAME.bomb === 'carried')speed *= .95;
 let forward = (keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
 let side = (keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
 const len = Math.hypot(forward,side);
 const feetY = player.y-eyeH;
 const beforeX = player.x, beforeZ = player.z;
 if(len&&GAME.alive&&GAME.dropping <= 0){
  forward /= len; side /= len;
  const dx = (-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt;
  const dz = (-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt;
  if(validPosition(player.x+dx,player.z,feetY,PLAYER_RADIUS))player.x += dx;
  if(validPosition(player.x,player.z+dz,feetY,PLAYER_RADIUS))player.z += dz;
 }
 // 真实速度判定：只有“这一帧确实没位移”才算站定，贴墙推着走也算移动
 const realSpeed = Math.hypot(player.x-beforeX,player.z-beforeZ)/Math.max(dt,1e-4);
 GAME.speedNow = realSpeed;
 // 跳跃：空格起跳，恒定重力下落
 if(GAME.jumpVel === undefined){GAME.jumpVel = 0; GAME.grounded = true;}
 // 地面高度只按“脚下所在地面/楼梯”判定，不能用当前悬空高度反推，否则会悬停
 const ground = groundHeightAt(m,player.x,player.z);
 if(GAME.grounded&&keys.has('Space')&&GAME.alive&&GAME.dropping <= 0){
  GAME.jumpVel = JUMP_SPEED; GAME.grounded = false; sound('jump');
 }
 if(!GAME.grounded){
  GAME.jumpVel -= GRAVITY*dt;
  player.y += GAME.jumpVel*dt;
  if(player.y-eyeH <= ground){player.y = ground+eyeH; GAME.jumpVel = 0; GAME.grounded = true;}
 } else {
  player.y = ground+eyeH;
 }
 GAME.crouching = crouch;
 GAME.eyeHeight = eyeH;
 GAME.feet = player.y-eyeH;
 // 命中精度状态：站定才准，移动或离地都不准
 const air = !GAME.grounded;
 GAME.accuracy = {
  speed: GAME.speedNow,
  // 只有真正“按住移动键且发生了位移”才算走动
  moving: !air && GAME.speedNow > .35,
  airborne: air
 };
 if(GAME.dropping > 0){
  if(siteAt(player.x,player.z)&&GAME.alive){
   GAME.dropping = Math.max(0,GAME.dropping-dt);
   $('plantBar').hidden = false;
   $('plantBar').querySelector('b').style.width = ((1-GAME.dropping/5)*100)+'%';
   if(GAME.dropping <= 0)finishPlant();
  }else{GAME.dropping = 0; $('plantBar').hidden = true; toast('离开包点 · 下包取消');}
 }
 if(GAME.bomb === 'planted'&&GAME.phase === 'live'){
  GAME.bombTimer -= dt;
  if(GAME.side === 'defend'&&GAME.alive)defuseTick(dt);
  if(GAME.bombTimer <= 0){GAME.bomb = 'exploded'; endRound('attack','炸弹爆炸');}
  if(frame%10 === 0)updateHUD();
 }
 if(GAME.phase === 'live')GAME.roundTime = Math.max(0,GAME.roundTime-dt);
 if(GAME.buyTime > 0)GAME.buyTime -= dt;
 if(meleeCd > 0)meleeCd -= dt;
 if(reloadT > 0){
  reloadT -= dt;
  if(reloadT <= 0){reloadT = 0; mag = w.clip; sound('reload'); updateHUD();}
 }
 if(switchTime > 0)switchTime = Math.max(0,switchTime-dt);
 // 自动步枪连发
 if(firing&&w.auto&&canFire()&&GAME.phase !== 'ended')playerShoot();
 // 弹匣打空自动换弹：开火中也能触发，不必等松手
 if(mag === 0&&reloadT <= 0&&w.clip !== null&&switchTime <= 0)autoReload();
}
function updateCameraPose(dt){
 const bob = reduced?0:(keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')?Math.sin(elapsed*9)*.012:Math.sin(elapsed*2)*.003);
 if(GAME.alive){
  // player.y 始终记录“脚底 + 眼睛高度”，蹲下时 eyeHeight 已平滑过渡
  camera.position.set(player.x,player.y+bob,player.z);
  camera.rotation.set(pitch,yaw,0,'YXZ');
 }else{
  // 观战：跟随最近的存活队友或俯瞰
  const ally = bots.filter(a => a.alive&&a.team === GAME.side);
  const target = ally[0];
  if(target){
   const camPos = target.pos.clone().add(new THREE.Vector3(0,1.9,0));
   const look = target.pos.clone();
   camPos.x += Math.sin(performance.now()*.0004)*1.4; camPos.z += Math.cos(performance.now()*.0004)*1.4;
   camera.position.lerp(camPos,Math.min(1,dt*3));
   camera.lookAt(look);
  }else{
   camera.lookAt(new THREE.Vector3(0,0,0));
  }
 }
}
function updateViewModel(dt){
 const w = weaponDef();
 for(const id of SLOT_ORDER)gunModels[id].visible = id === currentWeapon;
 gun.visible = GAME.alive&&state !== 'results'&&state !== 'shop'&&!scopeOn;
 // 开镜：视野放大 1.5 倍 + 镜片遮罩 + 隐藏普通准心
 const scoped = scopeOn && currentWeapon === 'awp';
 const wantFov = scoped ? BASE_FOV/(w.scope||1.5) : BASE_FOV;
 if(Math.abs(camera.fov - wantFov) > .01){
  camera.fov += (wantFov - camera.fov)*Math.min(1,dt*14);
  camera.updateProjectionMatrix();
 }
 const mask = $('scopeMask');
 if(mask)mask.classList.toggle('on',scoped);
 const ch = $('crosshair');
 if(ch)ch.classList.toggle('scoped',scoped);
 if(!GAME.alive)return;
 const m = gunModels[currentWeapon];
 const moving = keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD');
 let px = .245, py = -.235, pz = -.5, rz = 0, rx = 0;
 if(w.type === 'melee'){px = .3; py = -.26; pz = -.5;}
 const bobX = reduced?0:(moving?Math.sin(elapsed*9)*.011:Math.sin(elapsed*2)*.003);
 const bobY = reduced?0:(moving?Math.abs(Math.cos(elapsed*9))*.008:Math.sin(elapsed*3.4)*.002);
 py += bobY + recoil*.35;
 pz += recoil*1.1;
 px += bobX;
 // 切枪动画：从下方抬起（AWP 动作更慢、幅度更大）
 const swTime = currentWeapon === 'awp' ? SWITCH_TIME_AWP : SWITCH_TIME;
 if(switchTime > 0){
  const k = 1-switchTime/swTime; const e = 1-Math.pow(1-k,3);
  py += (1-e)*-.42; rx += (1-e)*.85; rz += (1-e)*.35;
 }
 // 换弹动画
 if(reloadT > 0){
  const k = 1-reloadT/w.reload; const s = Math.sin(Math.min(1,k)*Math.PI);
  rz += s*.62; py += s*-.1; rx += s*.18;
 }
 // 挥刀动画
 if(w.type === 'melee'&&meleeAnim > 0){
  meleeAnim = Math.max(0,meleeAnim-dt);
  const k = 1-meleeAnim/.34; const s = Math.sin(k*Math.PI);
  rx += s*1.15; rz += s*-.5; px += s*-.16; pz += s*-.12; py += s*.05;
 }
 if(GAME.dropping > 0){py -= .06; rz += .4;}
 m.position.set(px,py,pz);
 m.rotation.set(rx,(w.type === 'melee'?-.22:-.02),rz);
}
function tick(){
 requestAnimationFrame(tick);
 const rawDt = clock.getDelta(), dt = Math.min(rawDt,.06); frame++;
 if(state === 'home'){
  const t = performance.now()*.0002;
  const m = activeMap;
  const look = m.train?new THREE.Vector3(-.8,1.95,11.7):new THREE.Vector3(m.attackSpawn.x,2,m.attackSpawn.z-16);
  camera.position.set(look.x+Math.sin(t)*1.2,m.id === 'train'?1.95:2.4,look.z+(m.id === 'train'?0:14));
  camera.rotation.set(m.id === 'train'?.055:.02,m.id === 'train'?-.1+Math.sin(t)*.05:Math.PI+Math.sin(t)*.04,0,'YXZ');
  gun.visible = false; headLines.forEach(o => o.visible = false);
 }else if(['run','prep','paused','shop','results'].includes(state)){
  if(['run','prep'].includes(state)){
   if(GAME.alive&&(dragControl||document.pointerLockElement === renderer.domElement)){
    if(state === 'prep'){
     const old = Math.ceil(prep); prep -= rawDt;
     $('countdown').textContent = prep > 0?Math.ceil(prep):'';
     if(Math.ceil(prep) !== old&&prep > 0)sound('reload');
     if(prep <= 0){state = 'run'; $('countdown').textContent = '';}
    }
    elapsed += rawDt;
    if(GAME.phase === 'live')updatePlayer(dt);
    // 单点异常不能让整场画面冻结：捕获后移除问题闪光弹并继续渲染
    try{updateGrenades(dt);}catch(err){console.error('updateGrenades',err); grenades.length = 0;}
    observe(dt);
   }
   if(GAME.phase === 'live'&&!activeMap.train){
    updateBots(dt);
    if(GAME.roundTime <= 0&&GAME.bomb !== 'planted')endRound('defend','时间耗尽');
    if(GAME.phase === 'ended'){
     GAME.roundEnd -= rawDt;
     if(GAME.roundEnd <= 0)nextRound();
    }
   }
   routeClock += dt;
   if(routeClock > .18){routeClock = 0; route.push([player.x,player.z]); if(route.length > 4000)route.shift();}
  }
  updateCameraPose(dt);
  updateViewModel(dt);
 }else{
  gun.visible = false;
 }
 if(mode === 'train')for(const t of targets)if(t.dead&&t.death > 0){t.death -= dt; t.group.scale.y = Math.max(.01,t.death/.22); if(t.death <= 0)t.group.visible = false;}
 if(state === 'run'&&mode === 'train'&&kills === targets.length&&targets.length)finish();
 recoil = Math.max(0,recoil-dt*.9);
 chSpread = Math.max(0,chSpread-dt*3.6);
 flash.visible = recoil > .045&&GAME.alive;
 if(hitFade > 0){hitFade -= dt; $('hitmarker').style.opacity = Math.max(0,hitFade/.2); if(hitFade <= 0)setTimeout(() => {$('hitText').style.opacity = 0;},200);}
 if(toastTime > 0){toastTime -= dt; if(toastTime <= 0)$('toast').style.opacity = 0;}
 if(damageFade > 0)damageFade = Math.max(0,damageFade-dt*1.4);
 if(frame%8 === 0&&['run','prep'].includes(state)){updateHUD(); drawMap($('minimap'));}
 if(frame%2 === 0&&!GAME.alive&&GAME.phase === 'live'){/* spectate marker */}
 renderer.render(scene,camera);
}

try{
 loadStorage(); makeScene(); bind(); bindAimLab(); loadCrosshair(); $('loading').hidden = true;
 setMode('world1'); home(); tick();
 window.alleyDiagnostics = () => ({state,mode,side:GAME.side,hp:GAME.hp,armor:GAME.armor,ammo:mag,weapon:currentWeapon,reload:reloadT,switchTime,
  jumpVel:+(GAME.jumpVel||0).toFixed(2),grounded:GAME.grounded,crouch:+(GAME.crouchBlend||0).toFixed(2),eyeHeight:+(GAME.eyeHeight||0).toFixed(2),feet:+(GAME.feet||0).toFixed(2),
  ground:+(groundHeightAt(activeMap,player.x,player.z)).toFixed(2),
  player:{x:+player.x.toFixed(2),y:+player.y.toFixed(2),z:+player.z.toFixed(2)},bots:bots.filter(a => a.alive).map(a => ({team:a.team,name:a.name,hp:Math.round(a.hp),pos:{x:+a.pos.x.toFixed(1),z:+a.pos.z.toFixed(1)},hasBomb:a.hasBomb,phase:a.phase,path:a.path.length})),
  bomb:GAME.bomb,scores:{attack:GAME.scoreA,defend:GAME.scoreD},round:GAME.round,roundTime:GAME.roundTime,render:renderer.info.render,version:VERSION});
}catch(e){
 $('loading').hidden = true; $('error').hidden = false;
 $('errorText').textContent = '请使用支持 WebGL 的桌面浏览器打开，并确认 vendor/three.min.js 与 game.js 文件完整。'+e.message;
 console.error(e);
}
})();
