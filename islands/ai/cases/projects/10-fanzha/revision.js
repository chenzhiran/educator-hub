const lesson10=['不把账号、密码、验证码交给别人。','遇到可疑消息先停一停，自己去熟悉的入口核实。','拿不准时保留消息，找家长或老师帮忙。'];addStartLesson(lesson10);
const firstStory10=story10;story10=function(){firstStory10();$('guideBody').insertAdjacentHTML('afterbegin',lessonBlock(lesson10))};
document.querySelector('.footer').textContent='星光装备失踪预告　/　AI课案例';document.querySelector('.footer').classList.add('hide');
// Distribute the same three interactions around the open paved plaza.
const sites10=[[[455,555],[1280,465],[1030,745]],[[1240,470],[485,715],[585,535]],[[440,535],[1265,660],[895,770]]];
cases.forEach((c,i)=>c.nodes.forEach((n,j)=>{[n.x,n.y]=sites10[i][j]}));
// Foot-space is defined in the same 1440×900 cover view as the artwork.
const walkBoundary10=[[305,485],[435,420],[500,320],[705,225],[925,185],[1020,290],[1130,350],[1295,400],[1375,470],[1370,610],[1285,685],[1280,815],[1120,855],[890,835],[650,775],[485,725],[350,660],[285,560]];
const fountain10={x:845,y:397,rx:265,ry:122};
const blocks10=[[[1320,470],[1440,470],[1440,675],[1335,650]],[[295,625],[395,640],[465,720],[430,770],[320,715]],[[1135,780],[1210,765],[1235,815],[1170,850]]];
function insidePoly10(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){let a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
function footSpace10(x,y){return insidePoly10(x,y,walkBoundary10)&&((x-fountain10.x)/(fountain10.rx+12))**2+((y-fountain10.y)/(fountain10.ry+12))**2>1&&!blocks10.some(p=>insidePoly10(x,y,p))}
function canWalk10(x,y){return [[0,0],[9,0],[-9,0],[0,9],[0,-9]].every(([dx,dy])=>footSpace10(x+dx,y+dy))}
const grid10=24,nav10=[];for(let y=192;y<=840;y+=grid10)for(let x=288;x<=1392;x+=grid10)if(canWalk10(x,y))nav10.push({x,y,k:x+','+y});
const navMap10=new Map(nav10.map(p=>[p.k,p]));let route10=[];
function closestNav10(x,y){return nav10.reduce((a,b)=>Math.hypot(b.x-x,b.y-y)<Math.hypot(a.x-x,a.y-y)?b:a)}
function path10(sx,sy,gx,gy){let start=closestNav10(sx,sy),goal=closestNav10(gx,gy),open=[start],came=new Map(),cost=new Map([[start.k,0]]),seen=new Set();let h=p=>Math.hypot(p.x-goal.x,p.y-goal.y);while(open.length){open.sort((a,b)=>(cost.get(a.k)+h(a))-(cost.get(b.k)+h(b)));let a=open.shift();if(a===goal){let points=[a];while(came.has(a.k)){a=came.get(a.k);points.unshift(a)}return points.map(p=>({x:p.x,y:p.y}))}if(seen.has(a.k))continue;seen.add(a.k);for(let dx of [-grid10,0,grid10])for(let dy of [-grid10,0,grid10]){if(!dx&&!dy)continue;let b=navMap10.get((a.x+dx)+','+(a.y+dy));if(!b||seen.has(b.k))continue;if(!canWalk10(a.x+dx*.5,a.y+dy*.5))continue;if(dx&&dy&&(!canWalk10(a.x+dx,a.y)||!canWalk10(a.x,a.y+dy)))continue;let value=cost.get(a.k)+Math.hypot(dx,dy);if(value<(cost.get(b.k)??Infinity)){came.set(b.k,a);cost.set(b.k,value);open.push(b)}}}return []}
function setRoute10(x,y){route10=path10(player.x,player.y,x,y);if(!route10.length){toast('这边暂时走不过去，换一条石板路试试。');return false}return true}
go10=function(n){if(!started||paused||dialog)return;pending10=n;setRoute10(n.x-55,n.y+40);toast('前往 '+n.name+'：沿石板路绕过喷泉，抵达后自动调查。')};
function safeStep10(dx,dy){let count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));for(let i=0;i<count;i++){let nx=player.x+dx/count,ny=player.y+dy/count;if(canWalk10(nx,ny)){player.x=nx;player.y=ny}else if(canWalk10(nx,player.y))player.x=nx;else if(canWalk10(player.x,ny))player.y=ny}}
frame=function(t){let dt=Math.min((t-last)/1000,.05);last=t;if(!paused){walk+=dt;if(started&&!dialog){let kx=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),ky=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0);if(kx||ky){route10=[];pending10=null;let len=Math.hypot(kx,ky);safeStep10(kx/len*250*dt,ky/len*250*dt)}else if(route10.length){let p=route10[0],dx=p.x-player.x,dy=p.y-player.y,d=Math.hypot(dx,dy);if(d<4)route10.shift();else safeStep10(dx/d*Math.min(d,260*dt),dy/d*Math.min(d,260*dt))}player.tx=route10[0]?.x??player.x;player.ty=route10[0]?.y??player.y;let n=nearest();$('nearHint').textContent=n?'按 E 调查：'+n.name:'只能沿石板路走 · 点击目标自动绕路'}}draw();requestAnimationFrame(frame)};
cv.onclick=e=>{if(!started||paused||dialog)return;const r=Math.max(innerWidth/1440,innerHeight/900),x=(e.clientX-(innerWidth-1440*r)/2)/r,y=(e.clientY-(innerHeight-900*r)/2)/r;const n=cases[chapter].nodes.find(n=>Math.abs(n.x-x)<95&&y>n.y-230&&y<n.y+45);if(n){go10(n);return}pending10=null;if(!canWalk10(x,y)){toast('这里是喷泉、花坛或商店。小警探只能在石板路上走哦！');return}setRoute10(x,y)};
const priorAward10=uxAward;uxAward=function(title,sub){priorAward10(title,sub);if(solved>0){revealLessonEgg();document.querySelector('.footer').classList.remove('hide')}};
update();
