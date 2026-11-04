/* 简化教学模型。单位SI；忽略排水结束后的空气推力、升力、风与姿态不稳定。 */
(function(root){
 'use strict';
 function simulate(input){
  const p={water:Number(input.water),pressure:Number(input.pressure),angle:Number(input.angle)};
  if(!Number.isFinite(p.water)||p.water<100||p.water>800||!Number.isFinite(p.pressure)||p.pressure<0.2||p.pressure>0.6||!Number.isFinite(p.angle)||p.angle<30||p.angle>75)throw new Error('参数超出课堂模拟范围');
  const dt=.001,V=.00125,rho=1000,ambient=101325,airDensity=1.225,area=.0064,Cd=.48,nozzle=.000045,flowC=.78,dryMass=.12,g=9.81;
  const angle=p.angle*Math.PI/180,ux=Math.cos(angle),uy=Math.sin(angle),water0=p.water/1e6,air0=V-water0,absolute0=ambient+p.pressure*1e6;
  const airMass=absolute0*air0/(287*293);
  let w=water0,x=0,y=.7,vx=0,vy=0,t=0,maxHeight=y,burnTime=0;const path=[];
  for(let n=0;n<30000;n++){
   let thrust=0,waterNext=w;
   const internal=absolute0*Math.pow(air0/(V-w),1.4);
   if(w>0&&internal>ambient){
    const exhaust=Math.sqrt(2*(internal-ambient)/rho),flow=flowC*nozzle*exhaust;
    const expelled=Math.min(w,flow*dt);waterNext=Math.max(0,w-expelled);
    thrust=rho*expelled/dt*exhaust;burnTime=t+dt;
   }
   const mass=dryMass+airMass+rho*(w+waterNext)/2,speed=Math.hypot(vx,vy),drag=.5*airDensity*Cd*area*speed;
   const ax=(thrust*ux-drag*vx)/mass,ay=(thrust*uy-drag*vy)/mass-g;
   vx+=ax*dt;vy+=ay*dt;x+=vx*dt;y+=vy*dt;t+=dt;w=waterNext;maxHeight=Math.max(maxHeight,y);
   if(n%10===0)path.push({t,x,y:Math.max(0,y),vx,vy,water:w/water0,powered:thrust>0});
   if(y<=0&&t>.05){
    const f=Math.min(1,Math.max(0,(y-vy*dt)/(-vy*dt)));x-=vx*dt*(1-f);t-=dt*(1-f);y=0;
    while(path.length&&path[path.length-1].t>=t)path.pop();
    path.push({t,x,y:0,vx,vy,water:w/water0,powered:false});break;
   }
  }
  return {params:p,path,height:maxHeight,distance:x,time:t,burnTime,model:'water-thrust-v1'};
 }
 if(typeof module!=='undefined')module.exports={simulate};else root.RocketModel={simulate};
})(typeof window!=='undefined'?window:globalThis);
