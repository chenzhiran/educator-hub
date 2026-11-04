window.RocketAudio=(()=>{
 let enabled=false,current=null;const pool={};
 const paths=['tap','count','splash','record','success','ambient'];
 function src(name){return(window.ROCKET_CONFIG.assetBase||'')+(window.ROCKET_CONFIG.audioPath||'assets/audio/')+name+'.wav';}
 function stop(){Object.values(pool).forEach(a=>{a.pause();a.currentTime=0;});current=null;}
 function play(name){if(!enabled||!paths.includes(name))return;const a=pool[name]||(pool[name]=new Audio(src(name)));if(['intro','structure','thrust','fair','evidence','summary'].includes(name)){if(current)current.pause();current=a;if(pool.ambient)pool.ambient.volume=.025;a.onended=()=>{current=null;if(pool.ambient)pool.ambient.volume=.09;};}a.currentTime=0;a.volume=name==='ambient'?.09:['splash','tap','count'].includes(name)?.35:.8;if(name==='ambient')a.loop=true;a.play().catch(()=>{});}
 function toggle(){enabled=!enabled;if(!enabled)stop();else play('ambient');return enabled;}
 return{play,stop,toggle,get enabled(){return enabled;}};
})();
