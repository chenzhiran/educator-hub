function lessonBlock(items){return '<section class="learningGoals"><b>这次会学到什么？</b><ul>'+items.map(t=>'<li>'+t+'</li>').join('')+'</ul></section>'}
function addStartLesson(items){const box=document.querySelector('#intro .sheet'),stat=box.querySelector('.stat');if(stat)stat.insertAdjacentHTML('beforebegin',lessonBlock(items));else box.insertAdjacentHTML('beforeend',lessonBlock(items))}
document.body.insertAdjacentHTML('beforeend','<small id="secretLesson" class="secretLesson hide" aria-label="隐藏彩蛋">AI课案例</small>');
function revealLessonEgg(){document.getElementById('secretLesson').classList.remove('hide')}
