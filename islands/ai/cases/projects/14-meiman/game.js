'use strict';

const $ = id => document.getElementById(id);
const world = $('world'), effects = $('effects'), paint = effects.getContext('2d');
const radar = $('map').getContext('2d');
const gl = world.getContext('webgl', { antialias: true, alpha: true });
const ink = '#242320';
const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const mix = (a, b, t) => a + (b - a) * t;
const keys = new Set();
const weapons = [
  { name:'P-17 · 回收手枪', cap:17, damage:38, interval:.24, load:1.05 },
  { name:'R-36 · 铆钉步枪', cap:30, damage:23, interval:.105, load:1.35 },
  { name:'S-08 · 破拆霰弹枪', cap:8, damage:24, interval:.53, load:1.3 }
];
const zones = [
  { en:'SALVAGE YARD', name:'露天堆场', times:[0,23,47], waves:[3,5,6] },
  { en:'FOUNDRY LINE', name:'铸造线', times:[0,27,58], waves:[5,6,7] },
  { en:'SCRAP KING', name:'熔炉核心', times:[0,24,48,72], waves:[4,5,6,4] }
];

let state = 'home', player, zone = 0, wave = 0, sectorTime = 0, elapsed = 0;
let score = 0, kills = 0, total = 0, boss, upgrades, loadout, gunIndex;
let enemies = [], debris = [], bolts = [], floaters = [], solids = [], scenery = [];
let firing = false, aiming = false, reload = 0, cooldown = 0, recoil = 0, flash = 0, hurt = 0, hit = 0;
let announceTime = 0, rumble = 0, walk = 0, stride = 0, lastFrame = 0;
let viewW = 1, viewH = 1, aspect = 1, focus = 1.34, lastHud = 0;
let audio, audioNoise, muted = false, softLook = false, dragLook = false;
let staticMesh, staticEdges, stream, streamEdges, program, uniforms, attrs, concrete;
let randomState = 7;
function rand() {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 4294967296;
}

function initGL() {
  const vertex = 'attribute vec3 p;attribute vec3 c;attribute vec3 m;uniform vec3 eye,right,up,fwd;uniform vec2 scale;varying vec3 col,mat;varying float fog;void main(){vec3 d=p-eye;float z=dot(d,fwd);gl_Position=vec4(dot(d,right)*scale.x,dot(d,up)*scale.y,z*1.001-.095,z);col=c;mat=m;fog=z;}';
  const fragment = 'precision mediump float;varying vec3 col,mat;varying float fog;uniform sampler2D tex;void main(){vec3 color=col;if(mat.z>.5){vec3 t=texture2D(tex,mat.xy).rgb;color*=mix(vec3(1.),t*1.25,.61);}float haze=smoothstep(22.,85.,fog);gl_FragColor=vec4(mix(color,vec3(.77,.70,.58),haze*.8),1.);}';
  function compile(kind, source) {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  attrs = ['p','c','m'].map(n => gl.getAttribLocation(program,n));
  uniforms = Object.fromEntries(['eye','right','up','fwd','scale','tex'].map(n => [n,gl.getUniformLocation(program,n)]));
  concrete = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, concrete);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([217,204,183,255]));
  const material = new Image();
  material.onload = () => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 512;
    tile.getContext('2d').drawImage(material,0,0,512,512);
    gl.bindTexture(gl.TEXTURE_2D,concrete);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  material.src = 'assets/concrete.jpg';
  gl.uniform1i(uniforms.tex,0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(1,1);
  staticMesh = gl.createBuffer(); staticEdges = gl.createBuffer();
  stream = gl.createBuffer(); streamEdges = gl.createBuffer();
}

const shades = [1.02,.69,.87,.59,1.16,.48];
const faces = [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
const colorCache = new Map();
function color(hex) {
  if (!colorCache.has(hex)) colorCache.set(hex,hex.match(/.{2}/g).map(v => parseInt(v,16)/255));
  return colorCache.get(hex);
}
function vertex(out, p, c, u=0, v=0, m=0) {
  out.push(p[0],p[1],p[2],c[0],c[1],c[2],u,v,m);
}
function box(mesh, lines, b) {
  const [x,y,z,w,h,d,hex,angle=0,tex=0,edge=true] = b;
  const c = color(hex), sn = Math.sin(angle), cs = Math.cos(angle);
  const p = [[-w,0,-d],[w,0,-d],[w,h*2,-d],[-w,h*2,-d],[-w,0,d],[w,0,d],[w,h*2,d],[-w,h*2,d]]
    .map(([a,v,q]) => [x+(a*cs-q*sn)/2,y+v/2,z+(a*sn+q*cs)/2]);
  faces.forEach((face,i) => {
    const tint = c.map(n => n*shades[i]);
    const u = (i===2 || i===3 ? d : w)/5, v = (i>=4 ? d : h)/5;
    for (const j of [0,1,2,0,2,3]) vertex(mesh,p[face[j]],tint,j===1||j===2?u:0,j>=2?v:0,tex);
  });
  if (edge) for (const [a,b] of edges) {
    vertex(lines,p[a],[.115,.104,.092]); vertex(lines,p[b],[.115,.104,.092]);
  }
}
function cylinder(mesh, lines, x,y,z,r,h,hex) {
  const n=12, c=color(hex);
  const ring=Array.from({length:n+1},(_,i)=>[x+Math.cos(i*TAU/n)*r,z+Math.sin(i*TAU/n)*r]);
  for(let i=0;i<n;i++) {
    const [ax,az]=ring[i], [bx,bz]=ring[i+1];
    const a=[ax,y,az], b=[bx,y,bz], top=[bx,y+h,bz], d=[ax,y+h,az];
    const tint=c.map(v=>v*(.74+.26*Math.cos((i+.5)*TAU/n+1.07)));
    for(const p of [a,b,top,a,top,d]) vertex(mesh,p,tint,p[0]===ax?0:.15,(p[1]-y)/5,1);
    for(const p of [[x,y+h,z],d,top]) vertex(mesh,p,c);
    for(const p of [a,b,d,top]) vertex(lines,p,[.15,.125,.105]);
  }
}
function groundShadow(mesh,x,z,w,d,h) {
  const tint=[.55,.47,.36], shift=Math.min(h*.75,6);
  const a=[x-w/2,.001,z-d/2], b=[x+w/2,.001,z-d/2];
  const c=[x+w/2+shift,.001,z+d/2+shift*.3], d2=[x-w/2+shift,.001,z+d/2+shift*.3];
  for(const p of [a,b,c,a,c,d2]) vertex(mesh,p,tint,p[0]/5,p[2]/5,1);
}
function draw(buffer, count, mode) {
  if (!count) return;
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  attrs.forEach((a,i) => { gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,3,gl.FLOAT,false,36,i*12); });
  gl.drawArrays(mode,0,count);
}
function upload(buffer, data, usage) {
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),usage);
}
function makeArena() {
  solids=[]; scenery=[]; randomState=91+zone*48;
  const palette = ['a05439','6b7773','baa276','b9813a'];
  function prop(x,y,z,w,h,d,c,a=0,t=0,line=true) { scenery.push([x,y,z,w,h,d,c,a,t,line]); }
  function solid(x,z,w,h,d,c,t=0) { solids.push({x,z,w,h,d}); prop(x,0,z,w,h,d,c,0,t); }
  prop(0,-.38,0,160,.37,160,'cbb48d',0,1,false);
  const layout = [
    [[-11,-8,6,2,3], [10,-5,5,2.5,4],[-5,1,3,1.2,2],[6,10,4,1.4,3],[-13,13,4,3,5],[13,12,4,1.8,3],[-1,-14,5,1.3,2.5]],
    [[-9,-3,5,2.4,5],[8,1,5,2.6,6],[0,-8,4,1.1,2],[-15,-13,4,3,4],[13,11,4,2.4,5],[-5,10,3,1.2,3],[12,-12,5,1.8,3]],
    [[-11,-8,6,2.3,4],[11,-8,6,2.3,4],[-7,8,3,1.3,3],[7,8,3,1.3,3],[0,-12,4,1.1,2],[-15,11,3,2.1,4],[15,11,3,2.1,4]]
  ][zone];
  layout.forEach(([x,z,w,h,d],i) => {
    const c=palette[(i+zone)%palette.length];
    solid(x,z,w,h,d,c,1);
    prop(x,h,z,w+.18,.13,d+.18,'4e483b');
    for(let n=0;n<Math.floor(w/.62);n++) prop(x-w/2+.36+n*.62,.17,z+d/2+.035,.085,h-.33,.075,'74624c');
    prop(x,h*.56,z+d/2+.075,w*.57,.34,.055,'e6a63a');
    for(let n=0;n<Math.floor(w*.57/.36);n++) prop(x-w*.25+n*.36,h*.56,z+d/2+.11,.10,.34,.018,'38352a',0,0,false);
  });
  for (const s of [-1,1]) {
    solid(s*21,0,1.3,2.6,45,'bba480',1);
    solid(0,s*21,42,2.7,1.25,'bba480',1);
    for (let n=-18;n<=18;n+=4) {
      prop(n,0,s*20.25,.30,3.2,.34,'6f6b59');
      prop(s*20.25,0,n,.34,3.2,.30,'6f6b59');
      prop(n,2.65,s*21,3.93,.23,1.43,'656155');
      prop(s*21,2.65,n,1.43,.23,3.93,'656155');
    }
    for (let i=0;i<6;i++) {
      const z=-19+i*7.4;
      prop(s*18,0,z,.56,5.2,.56,'514b43');
      prop(s*17.9,4.6,z,1.15,.28,1.03,'8a5d3a');
      prop(s*18,4.91,z,3.1,.36,7.5,'6d6458');
      prop(s*16.55,5.36,z,.12,.12,7.45,'373731');
      for(let j=0;j<5;j++) prop(s*16.55,5.2,z-3.4+j*1.7,.12,.62,.13,'464138');
    }
  }
  const bridge = zone===1 ? -4 : -12;
  prop(0,5.1,bridge,36,.48,2.5,'786554');
  for(let x=-17;x<=17;x+=2) {
    prop(x,5.55,bridge+1.2,.16,.96,.16,'474139');
    prop(x,5.55,bridge-1.2,.16,.96,.16,'474139');
    prop(x,5.13,bridge+1.24,1.7,.22,.08,x%4===1?'d59c3e':'403930');
  }
  for(const off of [-1.19,1.19]) prop(0,6.43,bridge+off,36,.14,.15,'443e36');
  if(zone===1) {
    for(const x of [-12,12]) {
      solid(x,-19,3.7,6.4,1.8,'7f5140',1);
      prop(x,1.1,-18.07,2.8,2.9,.12,'292e2c');
      for(let n=0;n<7;n++) prop(x-1.14+n*.38,1.35,-17.99,.15,2.35,.065,'da743e');
      prop(x,4.04,-18,2.9,.34,.20,'e8ab4e');
      prop(x,6.34,-19,2.9,.58,2.25,'4e493f');
    }
  }
  if(zone===2) {
    solid(0,-20,11,7.1,1.9,'685343',1);
    prop(0,1,-19,7.75,4.8,.18,'383631');
    for(const x of [-4.6,4.6]) {
      solid(x,-18.9,.8,7.6,1.4,'a05a3b');
      prop(x,2.2,-18.18,.56,2.7,.08,'e89142');
    }
    for(let n=0;n<11;n++) prop(-3.2+n*.64,5.13,-18.88,.36,.28,.10,n%2?'dba13e':'d97943');
  }
  for(let i=0;i<52;i++) {
    const side=i%4, r=24+rand()*19, v=(rand()-.5)*90;
    const x=side<2?(side===0?-r:r):v, z=side>1?(side===2?-r:r):v;
    const w=2+rand()*5,d=2+rand()*5,h=1+rand()*7;
    prop(x,0,z,w,h,d,i%3?'a69075':'857a6d',0,1);
    if(i%3===0) prop(x,h,z,w*.65,1.4+rand()*6,d*.75,'82634a',Math.PI/4);
  }
  for(const [x,z] of [[-14,-26],[12,-27],[25,9]]) {
    prop(x,0,z,4,12,4,'8c7964',Math.PI/4,1);
    prop(x,9,z,4.6,.45,4.6,'716052',Math.PI/4);
    prop(x,12,z,4.7,.55,4.7,'524b43',Math.PI/4);
    prop(x,12.4,z,1.15,3.4,1.15,'a66b41',Math.PI/4);
    prop(x+2.3,13.4,z,4.4,.68,.75,'a66b41');
  }
  prop(-8,15,-35,27,.54,.6,'9f6a42');
  prop(-17,0,-35,.86,15.5,.86,'825b42');
  for(let x=-20;x<5;x+=1.35) prop(x,15.54,-35,.16,.68,.3,'675044');
  prop(-8,16.15,-35,27,.17,.4,'8c5e40');
  prop(3,8,-35,.075,7.2,.075,'4d4640');
  for(let i=0;i<130;i++) {
    const x=(rand()-.5)*40,z=(rand()-.5)*40;
    if(solids.some(s=>Math.abs(x-s.x)<s.w/2&&Math.abs(z-s.z)<s.d/2)) continue;
    prop(x,-.01,z,.2+rand()*1.25,.008,.04+rand()*.16,i%3?'aa936d':'7d715c',rand()*TAU,0,false);
  }
  for (let i=-16;i<=16;i+=4) {
    prop(i,.003,-18,2.6,.005,.105,'d9bd68',0,0,false);
    prop(i,.003,18,2.6,.005,.105,'d9bd68',0,0,false);
  }
  const mesh=[], lines=[];
  scenery.forEach(b=>box(mesh,lines,b));
  for(const {x,z,w,d,h} of solids.slice(0,layout.length)) groundShadow(mesh,x,z,w,d,h);
  for(const [x,z] of [[-14,-26],[12,-27],[25,9]]) {
    cylinder(mesh,lines,x,4.1,z,2.95,7.9,'a18a70');
    cylinder(mesh,lines,x,4.02,z,3.05,.20,'554d41');
    cylinder(mesh,lines,x,7.7,z,3,.18,'71604a');
    cylinder(mesh,lines,x,11.9,z,3.04,.24,'655143');
  }
  for(const [x,z] of [[-16,-10],[16,5],[-14,6],[14,-11]]) {
    cylinder(mesh,lines,x,0,z,.53,1.17,'a8673c');
    cylinder(mesh,lines,x,.18,z,.56,.1,'534d42');
    cylinder(mesh,lines,x,.87,z,.56,.1,'534d42');
    solids.push({x,z,w:1.06,d:1.06,h:1.17});
  }
  upload(staticMesh,mesh,gl.STATIC_DRAW); upload(staticEdges,lines,gl.STATIC_DRAW);
  return [mesh.length/9,lines.length/9];
}
let arenaCounts = [0,0];

function camera() {
  const sn=Math.sin(player.yaw), cs=Math.cos(player.yaw);
  const pitch=player.pitch+recoil*.015, cp=Math.cos(pitch), sp=Math.sin(pitch);
  return { eye:[player.x,1.68+Math.sin(walk*2)*stride*.042,player.z],
    right:[cs,0,sn], up:[-sn*sp,cp,cs*sp], fwd:[sn*cp,sp,-cs*cp] };
}
function project(cam,x,y,z) {
  const dx=x-cam.eye[0],dy=y-cam.eye[1],dz=z-cam.eye[2];
  const d=dx*cam.fwd[0]+dy*cam.fwd[1]+dz*cam.fwd[2];
  if(d<.12) return null;
  return { x:viewW/2+(dx*cam.right[0]+dz*cam.right[2])*focus*viewH/2/d,
    y:viewH/2-(dx*cam.up[0]+dy*cam.up[1]+dz*cam.up[2])*focus*viewH/2/d, d };
}

function robot(mesh, lines, e) {
  const size=e.size, yaw=Math.atan2(player.x-e.x,player.z-e.z), s=Math.sin(yaw), c=Math.cos(yaw);
  const paintColor=e.hit>0?'ffe8a1':e.type==='boss'?'ae4e36':e.type==='spot'?'66827e':e.type==='heavy'?'c58c36':'837b62';
  const steel='4d5554', rubber='2f3231', light=e.charge>0?'ff512b':'ffbe47';
  function part(x,y,z,w,h,d,t) { box(mesh,lines,[e.x+(x*c+z*s)*size,y*size,e.z+(-x*s+z*c)*size,w*size,h*size,d*size,t,-yaw]); }
  const pace=Math.sin(e.step)*.25;
  for(const side of [-1,1]) {
    part(side*.26,0,pace*side+.09,.35,.18,.54,rubber);
    part(side*.26,.16,pace*side,.25,.49,.27,steel);
    part(side*.26,.40,pace*side+.12,.31,.21,.15,paintColor);
    part(side*.69,1.05,0,.37,.34,.52,paintColor);
    part(side*.78,.62,e.charge>0?.27:.10,.27,.49,.36,steel);
    part(side*.78,.67,e.charge>0?.51:.31,.29,.23,.27,rubber);
  }
  part(0,.58,0,.77,.23,.40,rubber);
  part(0,.80,0,1.10,.56,.55,steel);
  part(0,.91,.31,.75,.34,.13,paintColor);
  part(0,.99,.385,.42,.105,.026,'e4b158');
  part(0,.885,.384,.65,.056,.025,'343533');
  for(const side of [-1,1]) {
    part(side*.29,1.19,.386,.068,.055,.035,'9d9a7d');
    part(side*.55,1.24,.272,.19,.047,.035,'333533');
    part(side*.71,.73,.31,.055,.24,.07,'aba185');
  }
  part(0,1.36,0,.61,.40,.54,paintColor);
  part(0,1.48,.285,.52,.15,.09,rubber);
  part(e.type==='spot'?.08:0,1.50,.337,e.type==='spot'?.16:.37,.088,.022,light);
  if(e.type==='boss') {
    part(-.83,1.36,.02,.50,.45,.63,'b85430');
    part(.83,1.36,.02,.50,.45,.63,'b85430');
    part(0,1.06,.397,.23,.21,.10,'ff6533');
    part(-.36,1.28,-.32,.15,.65,.16,steel);
    part(.36,1.28,-.32,.15,.65,.16,steel);
  }
}
function render() {
  const cam=camera();
  focus=mix(focus,aiming?1.96:1.34,.18);
  world.style.setProperty('--sky-x',(50+Math.sin(player.yaw)*48)+'%');
  world.style.setProperty('--sky-y',clamp(-player.pitch*125,0,100)+'%');
  gl.viewport(0,0,world.width,world.height);
  gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.uniform3fv(uniforms.eye,cam.eye); gl.uniform3fv(uniforms.right,cam.right);
  gl.uniform3fv(uniforms.up,cam.up); gl.uniform3fv(uniforms.fwd,cam.fwd);
  gl.uniform2f(uniforms.scale,focus/aspect,focus);
  draw(staticMesh,arenaCounts[0],gl.TRIANGLES); draw(staticEdges,arenaCounts[1],gl.LINES);
  const mesh=[], lines=[];
  for(const e of enemies) {
    box(mesh,lines,[e.x,.007,e.z,e.size*1.65,.006,e.size*1.02,'77694e',0,0,false]);
    robot(mesh,lines,e);
  }
  for(const d of debris) box(mesh,lines,[d.x,Math.max(.02,d.y),d.z,d.w,d.w*.7,d.w,d.color,d.spin]);
  for(const b of bolts) box(mesh,lines,[b.x,b.y,b.z,b.radius*2,b.radius*2,b.radius*2,'ff8247',0,0,false]);
  upload(stream,mesh,gl.STREAM_DRAW); upload(streamEdges,lines,gl.STREAM_DRAW);
  draw(stream,mesh.length/9,gl.TRIANGLES); draw(streamEdges,lines.length/9,gl.LINES);
  renderEffects(cam);
}

function blocked(x,z,r=.31) {
  return Math.abs(x)>20-r || Math.abs(z)>20-r ||
    solids.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);
}
function move(a,x,z,r) {
  if(!blocked(a.x+x,a.z,r)) a.x+=x;
  if(!blocked(a.x,a.z+z,r)) a.z+=z;
}
function intersection(p,d,lo,hi) {
  let min=0,max=90;
  for(let i=0;i<3;i++) {
    if(Math.abs(d[i])<1e-6) {
      if(p[i]<lo[i]||p[i]>hi[i]) return Infinity;
      continue;
    }
    const near=(lo[i]-p[i])/d[i],far=(hi[i]-p[i])/d[i];
    min=Math.max(min,Math.min(near,far)); max=Math.min(max,Math.max(near,far));
    if(min>max) return Infinity;
  }
  return min;
}
function wallDistance(p,d) {
  let distance=Infinity;
  for(let i=0;i<solids.length;i++) {
    const o=solids[i];
    distance=Math.min(distance,intersection(p,d,[o.x-o.w/2,0,o.z-o.d/2],[o.x+o.w/2,o.h,o.z+o.d/2]));
  }
  return distance;
}
const paths = new Int16Array(1600);
const queue = new Int16Array(1600);
let pathTime=0;
const cell = (x,z) => clamp(Math.floor(x+20),0,39)+40*clamp(Math.floor(z+20),0,39);
function navigation() {
  paths.fill(-1);
  let head=0,tail=0;
  const start=cell(player.x,player.z);
  paths[start]=0; queue[tail++]=start;
  while(head<tail) {
    const from=queue[head++], x=from%40, z=from;
    for(const next of [x>0?from-1:-1,x<39?from+1:-1,z>=40?from-40:-1,z<1560?from+40:-1]) {
      if(next<0||paths[next]!==-1||blocked(next%40-19.5,Math.floor(next/40)-19.5,.54)) continue;
      paths[next]=paths[from]+1; queue[tail++]=next;
    }
  }
}
function waypoint(e) {
  let index=cell(e.x,e.z);
  const x=index%40;
  let value=paths[index]<0?Infinity:paths[index];
  for(const next of [x>0?index-1:-1,x<39?index+1:-1,index>=40?index-40:-1,index<1560?index+40:-1]) {
    if(next>=0&&paths[next]>=0&&paths[next]<value) { index=next; value=paths[next]; }
  }
  return [index%40-19.5,Math.floor(index/40)-19.5];
}
function spawn(type,x,z) {
  const config = {
    grunt:[1,73,2.3,2.4,6], spot:[.91,61,2.1,3.2,10],
    heavy:[1.31,130,1.85,3.45,13], boss:[2.5,1250,1.53,3.05,18]
  }[type];
  const [size,hp,speed,rate,damage]=config;
  const e={type,x,z,size,hp,max:hp,speed,rate,damage,step:0,charge:0,fireIn:1.3+rand()*1.6,hit:0};
  enemies.push(e); total++;
  return e;
}
function nextWave() {
  const layout=zones[zone], n=layout.waves[wave], angles=rand()*TAU;
  for(let i=0;i<n;i++) {
    let x,z;
    for(let tries=0;tries<60;tries++) {
      const a=angles+TAU*i/n+tries*.53;
      const r=14+rand()*4;
      x=Math.cos(a)*r; z=Math.sin(a)*r;
      if(!blocked(x,z,1.15)&&Math.hypot(x-player.x,z-player.z)>10&&enemies.every(e=>Math.hypot(e.x-x,e.z-z)>1.8)) break;
    }
    if(blocked(x,z,1.15)) {
      const safe=[[-16,-17],[16,-17],[-16,17],[16,17],[0,18],[0,-18]].find(p=>!blocked(...p,1.15)&&Math.hypot(p[0]-player.x,p[1]-player.z)>10);
      if(safe) [x,z]=safe;
    }
    spawn(i%4===3?'heavy':i%3===2?'spot':'grunt',x,z);
  }
  wave++;
  if(zone===2&&wave===4) {
    const candidates=[[0,-16],[-16,0],[16,0],[0,16]].sort((a,b)=>Math.hypot(b[0]-player.x,b[1]-player.z)-Math.hypot(a[0]-player.x,a[1]-player.z));
    boss=spawn('boss',...candidates[0]); banner('SCRAP KING! · 废铁之王',2.3); sound('boss');
  } else {
    banner('WAVE 0'+wave+' / 0'+layout.waves.length,1.55);
    sound('wave');
  }
}
function banner(message,time=1.7) {
  $('announcement').replaceChildren(Object.assign(document.createElement('span'),{textContent:message}));
  $('announcement').hidden=false; announceTime=time;
}
function weapon() { return weapons[loadout[gunIndex].id]; }
function startGame() {
  zone=0; elapsed=0; score=0; kills=0; total=0;
  upgrades={damage:1,speed:1,armor:1,max:100};
  loadout=[{id:0,ammo:17}]; gunIndex=0;
  player={x:0,z:17,yaw:0,pitch:0,hp:100};
  $('home').hidden=true; $('hud').hidden=false;
  $('game').classList.add('in-game');
  enterZone();
}
function enterZone() {
  wave=0; sectorTime=0; boss=null; pathTime=0; walk=0; stride=0;
  enemies=[]; debris=[]; bolts=[]; floaters=[];
  recoil=flash=hurt=hit=rumble=cooldown=reload=0;
  Object.assign(player,{x:0,z:17,yaw:0,pitch:0});
  loadout.forEach(g=>g.ammo=weapons[g.id].cap);
  arenaCounts=makeArena();
  state='play';
  $('overlay').hidden=true;
  nextWave();
  banner('SECTOR 0'+(zone+1)+' · '+zones[zone].name,2.5);
  updateHUD();
  capture();
}
function beginReload() {
  if(!reload&&loadout[gunIndex].ammo<weapon().cap) {
    reload=weapon().load; sound('reload'); updateHUD();
  }
}
function chooseGun(i) {
  if(i>=loadout.length||i===gunIndex) return;
  gunIndex=i; reload=0; cooldown=.18; sound('reload'); updateHUD();
}
function shoot() {
  const item=loadout[gunIndex], w=weapon();
  if(!item.ammo) { beginReload(); return; }
  item.ammo--; cooldown=w.interval; flash=.074; recoil=Math.min(1.7,recoil+.65);
  sound(item.id===2?'shotgun':'shot');
  const cam=camera(), p=cam.eye, pellets=item.id===2?7:1;
  let landed=false;
  for(let i=0;i<pellets;i++) {
    const spread=item.id===2?.077:aiming?.003:.008;
    const h=i===0?0:(rand()-.5)*spread*2, v=i===0?0:(rand()-.5)*spread*2;
    const direction=cam.fwd.map((c,k)=>c+cam.right[k]*h+cam.up[k]*v);
    let best=wallDistance(p,direction), target=null, critical=false;
    for(const e of enemies) {
      const s=e.size, pad=.64*s;
      const t=intersection(p,direction,[e.x-pad,0,e.z-pad],[e.x+pad,1.77*s,e.z+pad]);
      if(t>=best) continue;
      best=t; target=e; critical=p[1]+t*direction[1]>s*1.39;
    }
    if(target) {
      landed=true;
      const damage=Math.round(w.damage*upgrades.damage*(critical?1.6:1));
      target.hp-=damage; target.hit=.105;
      if(i===0||pellets===1) floaters.push({x:target.x,y:target.size*1.7,z:target.z,time:.64,text:critical?'暴击 '+damage:String(damage),color:critical?'#ffce45':'#fff0cb'});
      if(target.hp<=0) destroy(target);
    } else if(i===0&&best<45) {
      const x=p[0]+direction[0]*best,y=p[1]+direction[1]*best,z=p[2]+direction[2]*best;
      burst(x,y,z,4,false);
    }
  }
  if(landed) { hit=.16; sound('hit'); }
  updateHUD();
}
function burst(x,y,z,n,big) {
  for(let i=0;i<n;i++) debris.push({x,y,z,vx:(rand()-.5)*9,vy:rand()*5+.9,vz:(rand()-.5)*9,w:(.04+rand()*.19)*(big?1.65:1),time:.32+rand()*.64,color:['e5a846','5a5646','c75f37','a7a28c'][i%4],spin:rand()*TAU});
}
function destroy(e) {
  enemies.splice(enemies.indexOf(e),1);
  kills++;
  floaters.push({x:e.x,y:e.size*2,z:e.z,time:.8,text:e.type==='boss'?'KRAK-BOOM!':'CLANG!',color:'#ffbb42'});
  score+=e.type==='boss'?5000:e.type==='heavy'?350:e.type==='spot'?270:180;
  burst(e.x,e.size,e.z,e.type==='boss'?38:13,true);
  if(e.type==='boss') { rumble=.4; sound('boss'); banner('BOSS DOWN! · 首领已报废',2.4); }
  else if(rand()<.22) player.hp=Math.min(upgrades.max,player.hp+4);
}
function takeDamage(value) {
  if(state!=='play') return;
  player.hp=Math.max(0,player.hp-value*upgrades.armor);
  hurt=.32; rumble=.11; sound('hurt');
  if(!player.hp) endGame(false);
}
function attack(e,distance) {
  const y=e.size*1.15, dy=1.53-y;
  const dx=player.x-e.x,dz=player.z-e.z;
  if(distance<e.size*.67+.88&&e.type!=='spot') {
    takeDamage(e.damage);
    return;
  }
  const bossShot=e.type==='boss', count=bossShot?5:1, speed=e.type==='spot'?12:bossShot?8:6.8;
  const heading=Math.atan2(dz,dx);
  for(let i=0;i<count;i++) {
    const a=heading+(i-(count-1)/2)*.15;
    bolts.push({x:e.x+Math.cos(a)*e.size*.57,y,z:e.z+Math.sin(a)*e.size*.57,vx:Math.cos(a)*speed,vy:dy*speed/Math.max(distance,1),vz:Math.sin(a)*speed,radius:bossShot?.17:.11,damage:e.damage,time:3.3});
  }
  sound(e.type==='spot'?'ping':'enemy');
}
function stepEnemies(dt) {
  pathTime-=dt;
  if(pathTime<=0) { navigation(); pathTime=.25; }
  for(const e of enemies) {
    if(state!=='play') break;
    e.hit=Math.max(0,e.hit-dt); e.fireIn-=dt;
    const dx=player.x-e.x,dz=player.z-e.z,dist=Math.max(.001,Math.hypot(dx,dz));
    const height=e.size*1.15;
    const visible=wallDistance([e.x,height,e.z],[dx/dist,(1.53-height)/dist,dz/dist])>=dist;
    if(e.charge>0) {
      e.charge-=dt;
      if(e.charge<=0) {
        if(visible) attack(e,dist);
        e.fireIn=e.rate+rand()*.75;
      }
      continue;
    }
    const reach=e.type==='spot'?23:e.type==='boss'?21:e.type==='heavy'?10:9;
    if(e.fireIn<=0&&visible&&dist<reach) {
      e.charge=e.type==='spot'?1.15:e.type==='boss'?.85:.60;
      if(e.type==='spot') sound('ping');
      continue;
    }
    if(dist<e.size*.65+.85 || (e.type==='spot'&&visible&&dist<9)) continue;
    const walkable=wallDistance([e.x,.4,e.z],[dx/dist,0,dz/dist])>=dist+.35;
    const [tx,tz]=walkable?[player.x,player.z]:waypoint(e);
    let x=tx-e.x,z=tz-e.z;
    for(const other of enemies) {
      if(other===e) continue;
      const ox=e.x-other.x,oz=e.z-other.z,d=Math.hypot(ox,oz), separation=(e.size+other.size)*.59;
      if(d>.001&&d<separation) { x+=ox/d*(separation-d)*4; z+=oz/d*(separation-d)*4; }
    }
    const len=Math.hypot(x,z);
    if(len>.05) {
      move(e,x/len*e.speed*dt,z/len*e.speed*dt,e.size>.99?.52:.4);
      e.step+=dt*e.speed*5;
    }
  }
  bolts=bolts.filter(b=>{
    b.time-=dt;
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
    if(b.time<0||b.y<0||Math.abs(b.x)>20||Math.abs(b.z)>20||
      solids.some(o=>b.y<o.h&&Math.abs(b.x-o.x)<o.w/2&&Math.abs(b.z-o.z)<o.d/2)) return false;
    if(Math.hypot(b.x-player.x,b.z-player.z)<.48+b.radius&&b.y>.28&&b.y<1.9) {
      takeDamage(b.damage); return false;
    }
    return true;
  });
}

let clearedAt=-1;
function step(dt) {
  sectorTime+=dt; elapsed+=dt;
  if(wave<zones[zone].times.length&&sectorTime>=zones[zone].times[wave]) nextWave();
  const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const turning=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
  player.yaw+=turning*dt*1.9;
  const moving=Math.hypot(forward,side);
  const running=keys.has('ShiftLeft')||keys.has('ShiftRight');
  const speed=(aiming?3.4:running?8.5:5.45)*upgrades.speed;
  stride=mix(stride,moving?running?1.35:1:0,.16);
  walk+=dt*speed*1.44;
  if(moving) {
    const s=Math.sin(player.yaw),c=Math.cos(player.yaw);
    move(player,(s*forward+c*side)*speed*dt/moving,(-c*forward+s*side)*speed*dt/moving,.37);
  }
  if(reload>0) {
    reload-=dt;
    if(reload<=0) { loadout[gunIndex].ammo=weapon().cap; reload=0; sound('ready'); }
  }
  cooldown-=dt;
  if(firing&&cooldown<=0&&!reload) shoot();
  stepEnemies(dt);
  if(state!=='play') return;
  for(const p of debris) {
    p.time-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
    p.vy-=dt*13; p.spin+=dt*4;
    if(p.y<.02) { p.y=.02; p.vy*=-.25; p.vx*=.79; p.vz*=.79; }
  }
  debris=debris.filter(d=>d.time>0);
  for(const f of floaters) { f.time-=dt; f.y+=dt*.75; }
  floaters=floaters.filter(f=>f.time>0);
  if(!enemies.length&&wave===zones[zone].waves.length) {
    if(clearedAt<0) { clearedAt=sectorTime; bolts=[]; if(zone<2) banner('SECTOR CLEAR! · 区域清空',1.7); }
    if(sectorTime-clearedAt>1.75) { if(zone===2) endGame(true); else offerCards(); }
  } else clearedAt=-1;
  if(announceTime>0&&(announceTime-=dt)<=0) $('announcement').hidden=true;
  recoil*=Math.exp(-dt*10);
  flash=Math.max(0,flash-dt); hurt=Math.max(0,hurt-dt); hit=Math.max(0,hit-dt); rumble=Math.max(0,rumble-dt);
  if(elapsed-lastHud>.095||elapsed<lastHud) { lastHud=elapsed; updateHUD(); }
}

function resize() {
  viewW=world.clientWidth; viewH=world.clientHeight; aspect=viewW/viewH;
  const dpr=Math.min(1.5,window.devicePixelRatio||1);
  world.width=effects.width=Math.round(viewW*dpr); world.height=effects.height=Math.round(viewH*dpr);
  paint.setTransform(dpr,0,0,dpr,0,0);
}
function poly(points,fill,width=3) {
  paint.beginPath();
  points.forEach(([x,y],i)=>i?paint.lineTo(x,y):paint.moveTo(x,y));
  paint.closePath();
  paint.fillStyle=fill; paint.fill();
  if(width) { paint.lineWidth=width; paint.strokeStyle=ink; paint.stroke(); }
}
function weaponArt() {
  const id=loadout[gunIndex].id;
  const scale=clamp(viewH/605,.56,1.7), bob=Math.sin(walk)*stride*5;
  const zoom=clamp((focus-1.34)/.62,0,1);
  const x=viewW/2+mix(viewH*.255,viewH*.055,zoom), y=viewH*.91;
  paint.save(); paint.translate(x+bob+Math.sin(elapsed*2.2)*2,y+Math.abs(bob)*.85+recoil*19);
  paint.rotate(mix(.34,.83,zoom)); paint.scale(scale,scale); paint.lineJoin='round';
  if(reload) {
    const tilt=Math.sin(reload/weapon().load*Math.PI);
    paint.translate(25*tilt,54*tilt); paint.rotate(.32*tilt);
  }
  const long=id!==0, tip=long?-185:-113, finish=id===2?'#9d5937':id===1?'#6f7b68':'#687372';
  poly([[187,120],[89,36],[53,18],[14,24],[-6,62],[80,144]],'#a77350',5);
  poly([[105,69],[61,35],[20,39],[9,66],[82,136],[119,133]],'#50544a',3);
  poly([[112,84],[73,53],[53,60],[103,112],[139,124]],'#76735a',2);
  poly([[157,108],[110,95],[124,120],[180,141]],'#6f4a37',0);
  poly([[6,-32],[54,-27],[59,-3],[47,34],[29,66],[-6,51],[-9,19]],'#353c3c',5);
  poly([[10,-5],[39,3],[31,37],[20,49],[4,41]],'#586161',2);
  for(let i=0;i<6;i++) {
    poly([[7,4+i*5],[31,10+i*5],[29,13+i*5],[6,7+i*5]],'#2d3332',0);
  }
  if(long) {
    poly([[-59,-19],[-22,-11],[-35,28],[-64,21],[-73,9]],'#424b47',4);
    poly([[-65,15],[-42,20],[-39,24],[-62,25]],'#929384',2);
    poly([[-146,-41],[-91,-31],[-68,-15],[-81,9],[-119,-1],[-158,-27]],'#554c3e',5);
    poly([[-163,-43],[-123,-31],[-100,-11],[-121,11],[-148,5],[-177,-19]],'#5d5b50',4);
    poly([[-172,-31],[-147,-20],[-139,-6],[-151,-3],[-175,-18]],'#847c60',2);
  }
  poly([[tip,-84],[tip+13,-89],[-10,-58],[53,-35],[65,-19],[53,-4],[18,-9],[-43,-30],[tip+1,-64]],'#363d3e',5);
  poly([[tip,-84],[tip+13,-89],[-11,-62],[55,-37],[65,-26],[49,-23],[-40,-53],[tip+1,-72]],'#8a9290',3);
  poly([[tip+14,-72],[-23,-49],[49,-23],[52,-9],[12,-12],[-63,-38],[tip+16,-61]],finish,3);
  poly([[tip-5,-88],[tip+9,-89],[tip+14,-78],[tip+8,-65],[tip-3,-68],[tip-9,-78]],'#343a3b',3);
  poly([[tip-5,-83],[tip+2,-84],[tip+5,-79],[tip+2,-74],[tip-5,-76]],'#181c1d',1);
  poly([[-7,-62],[2,-73],[15,-70],[17,-56]],'#343c3d',3);
  poly([[tip+14,-89],[tip+21,-96],[tip+28,-94],[tip+28,-86]],'#353d3b',3);
  poly([[-20,-48],[24,-33],[37,-24],[17,-27],[-28,-43]],'#abb09b',1);
  if(long) {
    poly([[-73,-64],[-64,-81],[-24,-67],[-14,-58],[-31,-51]],'#434b49',4);
    poly([[-67,-76],[-57,-75],[-49,-65],[-57,-62],[-68,-68]],'#b98947',2);
  }
  for(let i=0;i<7;i++) {
    const xx=tip+22+i*8, yy=-69+i*2.05;
    poly([[xx,yy],[xx+4,yy+1],[xx+4,yy+7],[xx,yy+6]],i<4?'#333a3b':'#454c47',.8);
  }
  poly([[16,9],[43,17],[40,31],[31,35],[11,25],[4,18]],'#555849',3);
  poly([[22,15],[37,19],[35,24],[30,25],[16,20]],'#7e7d62',1);
  if(flash>0) {
    paint.save(); paint.translate(tip-7,-83);
    const m=id===2?1.26:.93;
    paint.scale(m,m);
    poly([[-39,-6],[-75,-28],[-31,-23],[-39,-54],[-13,-27],[2,-43],[5,-19],[32,-23],[17,-7],[29,14],[5,8],[-3,28],[-13,9],[-42,17],[-31,3]],'#f67839',4);
    poly([[-53,-22],[-20,-17],[-21,-33],[-4,-15],[11,-13],[3,-3],[10,10],[-8,3],[-22,10],[-19,0]],'#ffe25e',1);
    paint.restore();
  }
  paint.restore();
}
function renderEffects(cam) {
  paint.clearRect(0,0,viewW,viewH);
  for(const e of enemies) {
    const base=project(cam,e.x,e.size*1.68,e.z);
    if(!base||base.x<0||base.x>viewW) continue;
    const dir=[e.x-cam.eye[0],e.size*1.55-cam.eye[1],e.z-cam.eye[2]];
    if((e.charge>0||e.hp<e.max)&&wallDistance(cam.eye,dir)<.95) continue;
    if(e.type==='spot'&&e.charge>0) {
      const src=project(cam,e.x,e.size*1.54,e.z);
      if(src) {
        paint.save(); paint.setLineDash([7,4]);
        paint.strokeStyle='#ff523d'; paint.lineWidth=2;
        paint.beginPath(); paint.moveTo(src.x,src.y); paint.lineTo(viewW/2,viewH*.5); paint.stroke();
        paint.restore();
        paint.font='900 14px system-ui'; paint.textAlign='center'; paint.strokeStyle='#2b2119'; paint.lineWidth=4;
        paint.strokeText('LOCKED',base.x,base.y-16); paint.fillStyle='#ff754b'; paint.fillText('LOCKED',base.x,base.y-16);
      }
    }
    if(e.type!=='boss'&&(e.hp<e.max||e.charge>0)) {
      const w=clamp(260/base.d,15,49), x=base.x-w/2;
      paint.fillStyle='#242320'; paint.fillRect(x-1,base.y-7,w+2,5);
      paint.fillStyle=e.charge>0?'#ff6743':'#f3bd42'; paint.fillRect(x,base.y-6,w*e.hp/e.max,3);
    }
  }
  for(const f of floaters) {
    const p=project(cam,f.x,f.y,f.z);
    if(!p) continue;
    paint.globalAlpha=clamp(f.time*4,0,1);
    paint.textAlign='center'; paint.font='italic 900 22px Impact, Microsoft YaHei';
    paint.lineWidth=4; paint.strokeStyle=ink; paint.strokeText(f.text,p.x,p.y-14);
    paint.fillStyle=f.color; paint.fillText(f.text,p.x,p.y-14);
  }
  paint.globalAlpha=1;
  weaponArt();
}
function formatTime(t) {
  return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
}
function updateHUD() {
  $('stage').textContent='SECTOR 0'+(zone+1)+' / 03 · '+zones[zone].en;
  const waiting=zones[zone].times[wave]-sectorTime;
  $('objective').textContent=boss?.hp>0?'废铁之王 · SCRAP KING':enemies.length?'清除目标 · 剩余 '+enemies.length+' 台':
    waiting>0?'下一批抵达 · '+Math.ceil(waiting)+' 秒':'区域已清空';
  $('bossTrack').hidden=!(boss?.hp>0);
  if(boss) $('bossBar').style.width=clamp(boss.hp/boss.max*100,0,100)+'%';
  $('timer').textContent=formatTime(elapsed); $('score').textContent=String(score).padStart(5,'0')+' 分';
  $('hp').textContent=Math.ceil(player.hp); $('healthBar').style.width=player.hp/upgrades.max*100+'%';
  $('weapon').textContent=weapon().name;
  $('rounds').textContent=String(loadout[gunIndex].ammo).padStart(2,'0');
  $('capacity').textContent='/ '+weapon().cap;
  $('gunHint').textContent=reload>0?'装填中 · '+Math.ceil(reload*10)/10+'s':loadout.length===1?'R 装填 · 右键瞄准':'R 装填 · 1 / 2 切枪';
  drawRadar();
}
function drawRadar() {
  radar.clearRect(0,0,126,126);
  radar.save(); radar.translate(63,63);
  radar.beginPath(); radar.arc(0,0,57,0,TAU); radar.clip(); radar.fillStyle='#272923'; radar.fillRect(-58,-58,116,116);
  radar.strokeStyle='#ad9b5c52'; radar.lineWidth=1;
  for(const r of [18,36,55]) { radar.beginPath(); radar.arc(0,0,r,0,TAU); radar.stroke(); }
  radar.beginPath(); radar.moveTo(-56,0); radar.lineTo(56,0); radar.moveTo(0,-56); radar.lineTo(0,56); radar.stroke();
  const f=2.43;
  radar.fillStyle='#aaa28163';
  for(const o of solids) radar.fillRect((o.x-o.w/2)*f,(o.z-o.d/2)*f,o.w*f,o.d*f);
  const angle=elapsed*2.4;
  radar.fillStyle='#f8cb4032'; radar.beginPath(); radar.moveTo(0,0); radar.arc(0,0,57,angle-.47,angle); radar.fill();
  for(const e of enemies) {
    radar.fillStyle=e.type==='boss'?'#ff743a':e.charge>0?'#ffd64b':'#f98e65';
    radar.beginPath(); radar.arc(e.x*f,e.z*f,e.type==='boss'?5:2.4,0,TAU); radar.fill();
  }
  radar.translate(player.x*f,player.z*f); radar.rotate(player.yaw);
  radar.fillStyle='#fff1c7'; radar.beginPath(); radar.moveTo(0,-6); radar.lineTo(4,5); radar.lineTo(0,3); radar.lineTo(-4,5); radar.fill();
  radar.restore();
}

const cardIcons=[
  'M12 21h77v-5h21v9h31v10h-39l-5 16H82l3-16H61l-8 13H39l3-13H12z',
  'M10 23h123v8h-42l-8 8H67l-8 12H43l4-17-27 9-10-5z',
  'M38 15h52l13 13-9 18-30 12-30-12-9-18z M63 21v30 M45 35h37',
  'M35 12h61l15 15-9 21H27l-9-21z M55 21h22v18H55z',
  'M31 23h37l17-11 15 4-9 9 12 8 16-5-3 15-13 8-21-8H31z',
  'M81 10 38 33h28l-7 19 45-27H75z'
];
function overlay(tag,title,description,label,action) {
  $('overlay').hidden=false;
  $('panelTag').textContent=tag; $('panelTitle').textContent=title; $('panelText').textContent=description;
  $('cards').hidden=true; $('panelActions').hidden=!label;
  $('continue').textContent=label||''; $('continue').onclick=action||null;
  if(label) $('continue').focus();
}
function release(next) {
  state=next; firing=false; aiming=false; keys.clear(); dragLook=false;
  if(document.pointerLockElement===world) document.exitPointerLock();
}
function offerCards() {
  release('upgrade');
  overlay('SALVAGE REWARD / 战利品','捡一张升级卡','整备后进入下一战区。每张卡都附带战间修复。');
  const options=zone===0?[
    ['武器','铆钉步枪','30 发弹匣，适合连续压制。',0,()=>loadout.push({id:1,ammo:30})],
    ['武器','破拆霰弹枪','一发七颗弹丸，近距离破甲。',1,()=>loadout.push({id:2,ammo:8})],
    ['防护','加厚底盘','生命上限 +35，受到的伤害降低 20%。',2,()=>{upgrades.max+=35;upgrades.armor*=.8;}]
  ]:[
    ['输出','超压弹药','所有枪械伤害提高 32%。',3,()=>upgrades.damage*=1.32],
    ['防护','应急维修','恢复全部生命，生命上限 +25。',4,()=>{upgrades.max+=25;player.hp=upgrades.max;}],
    ['机动','轻量化改装','移动速度提高 20%，受到的伤害降低 15%。',5,()=>{upgrades.speed*=1.2;upgrades.armor*=.85;}]
  ];
  const cards=$('cards'); cards.replaceChildren(); cards.hidden=false;
  options.forEach(([tag,title,body,icon,apply])=>{
    const card=document.createElement('button');
    card.className='card';
    card.innerHTML='<small>'+tag+'</small><svg viewBox="0 0 150 64" aria-hidden="true"><path d="'+cardIcons[icon]+'"/></svg><b>'+title+'</b><span>'+body+'</span>';
    card.onclick=()=>{
      if(state!=='upgrade') return;
      apply(); if(zone===0&&loadout.length>1) gunIndex=1;
      player.hp=Math.min(upgrades.max,player.hp+47);
      zone++; clearedAt=-1; enterZone();
    };
    cards.append(card);
  });
  cards.firstElementChild.focus();
}
function pause() {
  if(state!=='play') return;
  release('pause');
  overlay('FIELD PAUSE / 战地暂停','行动暂停','WASD 移动，鼠标瞄准和射击，右键精瞄。','继续试炼 ↗',()=>{
    state='play'; $('overlay').hidden=true; capture();
  });
}
function endGame(won) {
  release('end');
  overlay(won?'MISSION COMPLETE / 任务完成':'SIGNAL LOST / 信号中断',won?'废铁之王，报废！':'试炼中断',
    '用时 '+formatTime(elapsed)+'　·　击毁 '+kills+' / '+total+' 台　·　得分 '+score,'再打一次 ↗',startGame);
  sound(won?'wave':'hurt');
}
function returnHome() {
  release('home');
  $('overlay').hidden=true; $('hud').hidden=true; $('home').hidden=false;
  $('game').classList.remove('in-game'); $('start').focus();
}
function capture() {
  softLook=false;
  try {
    if(!world.requestPointerLock) { softLook=true; return; }
    const promise=world.requestPointerLock();
    if(promise?.catch) promise.catch(()=>{ if(state==='play') softLook=true; });
  } catch { softLook=true; }
}
document.addEventListener('pointerlockerror',()=>{ if(state==='play') softLook=true; });
let wasLocked=false;
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===world;
  if(locked) softLook=false;
  else if(wasLocked&&state==='play') pause();
  wasLocked=locked;
});
document.addEventListener('mousemove',e=>{
  if(state!=='play'||(document.pointerLockElement!==world&&!softLook)) return;
  if(softLook&&!dragLook&&(e.clientX<0||e.clientX>viewW||e.clientY<0||e.clientY>viewH)) return;
  const sensitivity=aiming?.0014:.00235;
  player.yaw+=e.movementX*sensitivity; player.pitch=clamp(player.pitch-e.movementY*sensitivity,-1.05,1.06);
});
world.addEventListener('mousedown',e=>{
  if(state!=='play') return;
  wakeAudio(); dragLook=true;
  if(e.button===0) { firing=true; if(cooldown<=0&&!reload) shoot(); }
  if(e.button===2) aiming=true;
});
document.addEventListener('mouseup',e=>{
  dragLook=false;
  if(e.button===0) firing=false;
  if(e.button===2) aiming=false;
});
$('game').addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&state==='play') { pause(); return; }
  if(state!=='play') return;
  if(e.code==='Space'||e.code.startsWith('Arrow')) e.preventDefault();
  keys.add(e.code);
  if(e.code==='KeyR') beginReload();
  if(e.code==='Digit1') chooseGun(0);
  if(e.code==='Digit2') chooseGun(1);
  if(e.code==='Space') firing=true;
});
document.addEventListener('keyup',e=>{keys.delete(e.code); if(e.code==='Space') firing=false;});
window.addEventListener('blur',()=>{ if(state==='play') pause(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&state==='play') pause(); });
$('menu').onclick=returnHome;
$('mute').onclick=()=>{
  muted=!muted; $('mute').textContent=muted?'音效 OFF':'音效 ON';
  $('mute').setAttribute('aria-pressed',String(muted));
  if(!muted) wakeAudio();
};

function wakeAudio() {
  if(muted||!window.AudioContext) return;
  if(!audio) {
    audio=new AudioContext();
    audioNoise=audio.createBuffer(1,Math.floor(audio.sampleRate*.3),audio.sampleRate);
    const samples=audioNoise.getChannelData(0);
    for(let i=0;i<samples.length;i++) samples[i]=Math.random()*2-1;
  }
  if(audio.state==='suspended') audio.resume().catch(()=>{});
}
const sfx={
  shot:[148,48,.105,.095,.11],shotgun:[104,34,.18,.14,.17],
  reload:[340,190,.11,.043,.026],ready:[640,430,.072,.026,.018],
  hit:[1200,580,.082,.034,.021],hurt:[78,38,.19,.085,.075],
  boss:[62,32,.28,.14,.13],wave:[410,790,.21,.053,0],
  ping:[950,1200,.09,.039,0],enemy:[190,85,.1,.032,.028]
};
function sound(name) {
  if(muted||!audio||audio.state!=='running') return;
  const [from,to,length,volume,noise]=sfx[name], t=audio.currentTime;
  const o=audio.createOscillator(), g=audio.createGain();
  o.type=noise?'triangle':'sine'; o.frequency.setValueAtTime(from,t); o.frequency.exponentialRampToValueAtTime(to,t+length);
  g.gain.setValueAtTime(volume,t); g.gain.exponentialRampToValueAtTime(.0001,t+length);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t+length);
  if(noise) {
    const n=audio.createBufferSource(), ng=audio.createGain(), low=audio.createBiquadFilter();
    n.buffer=audioNoise; low.type='lowpass'; low.frequency.value=name==='shotgun'?1500:3000;
    ng.gain.setValueAtTime(noise,t); ng.gain.exponentialRampToValueAtTime(.0001,t+length);
    n.connect(low).connect(ng).connect(audio.destination); n.start(t); n.stop(t+length);
  }
}
function loop(t) {
  const dt=Math.min(.04,(t-lastFrame)/1000||0); lastFrame=t;
  if(state==='play') {
    step(dt);
    render();
    $('crosshair').classList.toggle('hit',hit>0);
    $('damage').style.opacity=hurt*1.95;
    const shake=rumble>0?Math.sin(t*.10)*rumble*10:0;
    world.style.transform=shake?'translateX('+shake+'px) scale(1.012)':'';
  }
  requestAnimationFrame(loop);
}
if(gl) {
  try {
    initGL(); resize(); window.addEventListener('resize',resize);
    $('start').onclick=()=>{ wakeAudio(); clearedAt=-1; startGame(); };
    requestAnimationFrame(loop);
  } catch(e) { showFailure(e); }
} else showFailure('WebGL unavailable');
function showFailure(reason) {
  console.error(reason);
  $('start').disabled=true;
  document.querySelector('.cover-copy p').textContent='无法启动 3D 渲染。请在支持 WebGL 的桌面浏览器中打开游戏。';
}

