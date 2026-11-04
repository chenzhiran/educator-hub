/* Illustrated game interface, guidance and achievement presentation. */
const uxImage=src=>{const im=new Image();im.src='assets/'+src;return im};
function uxSprite(c,im,x,y,w,h){if(im?.complete&&im.naturalWidth)c.drawImage(im,x,y,w,h)}
document.body.insertAdjacentHTML('beforeend',`<div class="achievement hide" id="achievement"><img src="assets/medal.png" alt=""><div><small>任务进展</small><b id="achievementTitle"></b><span id="achievementSub"></span></div></div><div id="confetti" aria-hidden="true"></div><button class="guideOpen" id="guideOpen">? 操作指引</button><div class="overlay hide" id="guideOverlay"><section class="sheet guideSheet"><button class="close" id="guideClose" aria-label="关闭指引">×</button><div class="eyebrow" id="guideTag">任务指引</div><h2 id="guideTitle"></h2><div id="guideBody"></div><button class="primary" id="guideContinue">明白了，开始行动 →</button></section></div><div class="nextTask" id="nextTask"><span>下一步</span><b id="nextTaskTitle"></b><small id="nextTaskDesc"></small></div>`);
let uxAwardTimer,uxGuideActive=false,uxGuideAfter=null,uxGuidePause=false;
function uxChime(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>beep(f,.22),i*85))}
function uxAward(title,sub=''){clearTimeout(uxAwardTimer);$('achievementTitle').textContent=title;$('achievementSub').textContent=sub;$('achievement').classList.remove('hide');uxChime();for(let i=0;i<30;i++){const p=document.createElement('i');p.style.cssText=`--x:${Math.random()*100}vw;--d:${Math.random()*.5}s;--r:${Math.random()*720}deg;background:${['#f9d37b','#79e6d3','#e2adfa','#fff2b8'][i%4]}`;$('confetti').append(p);setTimeout(()=>p.remove(),2000)}uxAwardTimer=setTimeout(()=>$('achievement').classList.add('hide'),2600)}
function uxGuide(title,html,after=null,tag='任务指引'){uxGuideActive=true;uxGuideAfter=after;uxGuidePause=paused;paused=true;$('guideTitle').textContent=title;$('guideBody').innerHTML=html;$('guideTag').textContent=tag;$('guideOverlay').classList.remove('hide')}
function uxGuideClose(){uxGuideActive=false;paused=uxGuidePause;$('guideOverlay').classList.add('hide');const fn=uxGuideAfter;uxGuideAfter=null;if(fn)fn()}
$('guideClose').onclick=uxGuideClose;$('guideContinue').onclick=uxGuideClose;
const uxOriginalPause=pause;pause=function(){if(uxGuideActive){uxGuideClose();return}uxOriginalPause()};$('pause').onclick=pause;$('resume').onclick=pause;
function uxNext(title,desc=''){$('nextTaskTitle').textContent=title;$('nextTaskDesc').textContent=desc}
function uxSteps(steps){return '<ol class="guideSteps">'+steps.map(s=>'<li>'+s+'</li>').join('')+'</ol>'}
function uxPortrait(src,caption=''){return '<figure class="portrait"><img src="assets/'+src+'" alt="'+caption+'"><figcaption>'+caption+'</figcaption></figure>'}
function uxMedal(){return '<img class="successMedal" src="assets/medal.png" alt="任务成功徽章">'}
window.addEventListener('keydown',e=>{if(e.code==='F1'){e.preventDefault();$('guideOpen').click()}});
