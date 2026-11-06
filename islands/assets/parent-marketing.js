document.addEventListener('DOMContentLoaded', () => {
  const hero=document.querySelector('.hero');
  hero.querySelector('h1').innerHTML='难题看得懂，<br>孩子才愿意<em>自己想</em>。';
  hero.querySelector('.hero-lead').textContent='怕刷题太枯燥、孩子看不懂题，家长也帮不上忙？扣哒信奥把编程与算法放进有画面的故事任务里：先读懂问题，再动手写代码，最后借助图解看明白自己的解法。每学一段，都能看到孩子从“等答案”走向“自己想办法”。';
  hero.querySelector('.hero-card strong').textContent='让孩子愿意开始，也知道怎样继续';
  const concerns=document.querySelector('#concerns');
  concerns.querySelector('h2').innerHTML='孩子愿不愿意学、卡住怎么办、<br><em>学完究竟会什么？</em>';
  const difference=document.querySelector('.difference');
  const headings=['先被故事吸引，再读懂题目','写出代码，马上看到反馈','看懂图解，把错误变成经验'];
  const copies=['题目以角色、关卡与情境呈现，让抽象的条件、变量和数据有具体画面。孩子先想清楚任务，再进入代码。','每个专题连着实战题。孩子自己运行、提交、修改，思考过程能留下可检验的结果。','题解配图说明关键步骤。做过的题可以回头看懂“为什么这样解”，再把方法用到新题。'];
  [...difference.children].forEach((card,i)=>{card.querySelector('h3').textContent=headings[i];card.querySelector('p').textContent=copies[i];card.querySelector('.icon').textContent=''});
  const path=document.querySelector('#path');
  path.querySelector('.section-head').innerHTML='<p class="eyebrow">看得见的能力进阶</p><h2>从敢动手，到能独立解难题</h2><p>五个阶段，每一步都对应孩子能完成的真实任务。进阶方向来自基础篇与算法篇现有课程。</p>';
  const old=[...path.querySelector('.container').children].filter(el=>!el.classList.contains('section-head'));
  old.forEach(el=>el.remove());
  const stages=[
    ['01 · 先有兴趣','看懂任务，写出第一行代码','用顺序、变量和运算，让故事中的角色按自己的指令行动。','孩子能解释程序先做什么、后做什么'],
    ['02 · 建立逻辑','让程序会选择、会重复','用条件与循环处理不同情况，理解错误从哪里来。','孩子能自己修改条件，让结果发生变化'],
    ['03 · 组织信息','把一堆数据整理清楚','学数组、字符串、函数，学会把复杂任务拆成小步骤。','孩子能完成需要统计、查找与分类的题'],
    ['04 · 找到方法','比较不同解法，寻找更好的路','从排序、枚举、贪心和二分进入搜索，开始考虑效率。','孩子能说出为何选这种方法'],
    ['05 · 独立挑战','面对新题，设计完整解法','用动态规划、数据结构、图与组合知识解决综合问题。','孩子能读题、建模、调试并复盘']
  ];
  const chart=document.createElement('div');chart.className='parent-roadmap';
  stages.forEach(([step,title,copy,outcome])=>{const card=document.createElement('article');card.innerHTML=`<span class="step">${step}</span><h3>${title}</h3><p>${copy}</p><strong>${outcome}</strong>`;chart.append(card)});
  const outcome=document.createElement('div');outcome.className='parent-outcome';outcome.innerHTML='<article><h3>基础篇：让孩子能写</h3><p>21 个专题，从输入输出到函数与结构体；适合建立完整程序设计能力。</p></article><article><h3>算法篇：让孩子会想</h3><p>20 个专题，从经典策略到搜索、动态规划与图；适合已有基础后系统进阶。</p></article>';
  path.querySelector('.container').append(chart,outcome);
  const curriculum=path.nextElementSibling;
  curriculum.querySelector('.section-head').innerHTML='<p class="eyebrow">课程如何帮助孩子跨过难点</p><h2>每一段学习，都有看得见的变化</h2><p>家长可以先看成长目标；完整 41 章的课程内容保留在下方，随时查阅。</p>';
  const benefits=document.createElement('div');benefits.className='parent-benefits';benefits.innerHTML='<article><span class="mark">从不敢写到愿意试</span><h3>故事关卡降低第一步的门槛</h3><p>顺序、判断与循环不是孤立术语，而是帮助角色完成任务的工具。孩子更容易读懂“这道题要我做什么”。</p></article><article><span class="mark">从会模仿到能迁移</span><h3>一题做懂，比盲目刷十题更重要</h3><p>讲解、练习、图解题解连成闭环，孩子可以回看自己做过的题，理解方法为何有效。</p></article><article><span class="mark">从写小程序到解决复杂问题</span><h3>基础与算法衔接清楚</h3><p>先学变量、循环、数组和函数，再进入搜索、动态规划与图，减少知识断层。</p></article><article><span class="mark">家长能看见成长</span><h3>不用懂代码，也能听懂孩子的思路</h3><p>请孩子讲清题目、解释一次错误和修改过程；能说清“为什么”，就是比完成数量更有价值的进步。</p></article>';
  curriculum.querySelector('.curriculum-layout').before(benefits);
  const map=curriculum.querySelector('.map-card');map.querySelector('h3').textContent='想核对具体学什么？';map.querySelector('p').textContent='下方保留基础篇 21 章和算法篇 20 章的完整专题名称。资源尚未开放的章节会明确标注。';
  const proof=document.querySelector('.proof-grid');
  if(proof){const img=proof.children[1].querySelector('img');img.src='assets/sorting-story.png';img.alt='排序算法故事题：冰原中的角色收集数字并排列';proof.children[1].querySelector('h3').textContent='抽象算法，放进看得见的任务';proof.children[1].querySelector('p').textContent='排序题把数字变成冰原中的道具和阵列，让孩子先看见“整理顺序”这件事，再理解代码如何完成。题解中的图示帮助复盘方法。';}
  const how=document.querySelector('#how');how.querySelector('h2').textContent='孩子愿意继续学，是因为每一步都能看懂、能做到';
});
