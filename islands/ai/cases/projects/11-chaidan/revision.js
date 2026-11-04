const lesson11=['发照片前，遮住住址等私人信息。','给手机、平板上的应用开权限：用到什么，才开什么。','陌生人发来的文件先不打开，找家长或老师帮忙。'];addStartLesson(lesson11);
const startGuide11=guidance11;guidance11=function(){uxGuide('安雅的安全舱小课堂','<div class="narrative">观星直播马上开始，曙光号却亮起三盏红灯！安雅在广播里说：“别着急，我们一项一项检查。”</div>'+lessonBlock(lesson11)+uxSteps(['先点左边第1项“隐私档案”，再点画面里的发光圆环，打开任务屏幕。','照片任务：点三张小标签遮住信息，再关掉“附带位置标记”。','权限任务：一开始都不开。看清每个应用要做什么，只勾选它需要的权限。','文件任务：先把陌生文件收起来，不打开；去自己知道的软件目录找更新。','三盏灯都变绿后，点中间的大核心，按提示放入三把钥匙。']),null,'安雅 / 出发前先读一读')};$('guideOpen').onclick=guidance11;
narrative11[0]=['合影里，藏着小秘密','直播合影要发出去了！安雅发现：照片上有门牌和住址。请把这些信息遮住，再关掉位置标记。'];
narrative11[1]=['应用想借哪些“小钥匙”？','相机、麦克风和位置都是设备的小钥匙，也叫“权限”。看清应用要做什么，只打开它现在需要的权限。'];
narrative11[2]=['陌生人的“救急文件”','有人发来一个文件，说：“快打开，能修好飞船！”先别点。把它收起来，再去自己熟悉的软件目录核实。'];
const previousTerm11=showTerm;showTerm=function(i){previousTerm11(i);if(done[i])return;if(i===1){$('terminalBody').insertAdjacentHTML('afterbegin','<div class="learningNote"><b>权限是什么？</b><p>应用想用设备的相机、麦克风或位置，要先得到你的同意。这次请从“全部关闭”开始，只打开真正需要的那一项。</p></div>')}if(i===2){const b=$('terminalBody').querySelector('.card p');if(b)b.innerHTML='谁发来的：不认识的人<br>他说：“快打开，别问大人！”<br>名字和图标好看，也不能说明它安全。'}};
const learnAfter11=[
['你学会了：分享照片前，保护小秘密','住址、门牌和位置，不随便发给陌生人。分享前，看看照片里有什么，也看看有没有附带位置。','下一步：点“返回安全舱”，再去右边第2项“权限边界”。'],
['你学会了：设备权限，用到才打开','拍照时开相机，通话时开麦克风，找路时才用位置。不用把所有权限都打开；用完后，也可以到手机或平板的设置里关掉。不懂就问家长。','下一步：点“返回安全舱”，再去前方第3项“文件隔离”。'],
['你学会了：陌生文件，先不打开','不认识的人发来的文件，不乱点，也不转给同学试。先找家长或老师，再去自己熟悉的地方核实。','下一步：点“返回安全舱”，再点中间发光的大核心。']
];
const learnedComplete11=complete;complete=function(i){if(done[i])return;learnedComplete11(i);const s=learnAfter11[i];$('terminalTitle').textContent='做到了！第 '+(i+1)+' 盏灯变绿啦';$('terminalDesc').textContent='安雅：“太棒了，曙光号又恢复了一点！”';$('terminalBody').innerHTML=uxMedal()+'<div class="learningNote"><b>'+s[0]+'</b><p>'+s[1]+'</p></div><div class="narrative">'+s[2]+'</div>';actions([{text:'记住啦，返回安全舱 →',cls:'primary',fn:()=>{closeTerminal();toast(s[2])}}]);revealLessonEgg()};
const beforeVictory11=victory;victory=function(){beforeVictory11();if(corePuzzle11){$('terminalTitle').textContent='三把小钥匙，按顺序放好';$('terminalDesc').textContent='安雅读出提示：“先保护照片里的信息，再决定设备权限，最后检查陌生文件。”按这个顺序点下面的钥匙。';$('terminalTag').textContent='最后一步 / 让飞船重新亮起来'}};
updateHud();
