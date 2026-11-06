document.addEventListener('DOMContentLoaded', () => {
  const campaign = document.querySelector('.campaign-container');
  if (!campaign) return;
  document.body.classList.add('world-teacher');
  const cards = [...campaign.querySelectorAll(':scope > .chapter-card')];
  const language = location.pathname.includes('world-cpp') ? 'C++' : 'Python';
  if (language === 'C++') document.body.classList.add('cpp-teacher');
  const sidebar = document.createElement('aside');
  sidebar.className = 'world-sidebar';
  sidebar.innerHTML = '<h2>课程目录</h2><input type="search" aria-label="搜索当前章节知识点" placeholder="搜索本章知识点"><nav aria-label="选择章节"></nav><p class="world-count"></p>';
  const main = document.createElement('main');
  main.className = 'world-main';
  const overview = document.createElement('section');
  overview.className = 'world-overview';
  main.append(overview,...cards);
  campaign.append(sidebar,main);
  const nav = sidebar.querySelector('nav');
  const search = sidebar.querySelector('input');
  const descriptions = cards.map(card => [...card.querySelectorAll('.level-desc')].map(e => e.textContent.trim()));
  cards.forEach((card,i) => {
    const title = card.querySelector('.chapter-title')?.textContent.trim().replace(/^[^\p{L}\p{N}]+/u,'') || `第${i+1}章`;
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<strong>第 ${i+1} 章</strong><small></small>`;
    button.querySelector('small').textContent = title.replace(/^第[^章]*章\s*[·・]?\s*/,'');
    button.addEventListener('click',()=>select(i));
    nav.append(button);
    card.querySelectorAll('.action-btn').forEach(link => {
      if(link.classList.contains('btn-know')) link.textContent='投屏讲解';
      else if(link.classList.contains('btn-code')) link.textContent='代码案例';
      else if(link.classList.contains('btn-quiz')) link.textContent='课堂练习';
    });
  });
  function select(i) {
    cards.forEach((card,n)=>card.classList.toggle('teacher-current',n===i));
    [...nav.children].forEach((button,n)=>button.classList.toggle('active',n===i));
    const card=cards[i], title=card.querySelector('.chapter-title')?.textContent.trim().replace(/^[^\p{L}\p{N}]+/u,'') || `第 ${i+1} 章`;
    const count=card.querySelectorAll('.level-row').length;
    overview.replaceChildren();
    const eyebrow=document.createElement('div');eyebrow.className='eyebrow';eyebrow.textContent=`${language} 主线课 · 第 ${i+1} 章`;
    const h=document.createElement('h1');h.textContent=title;
    const p=document.createElement('p');p.textContent=`本章涵盖 ${count} 个教学单元。重点内容：${descriptions[i].slice(0,3).join('；')}。`;
    const tags=document.createElement('div');tags.className='overview-tags';
    ['知识讲解','代码案例','课堂练习'].forEach(t=>{const s=document.createElement('span');s.textContent=t;tags.append(s)});
    overview.append(eyebrow,h,p,tags);
    const content=card.querySelector('.chapter-content');
    if(content && !content.classList.contains('active')) card.querySelector('.chapter-header')?.click();
    search.value='';filter();
    main.scrollTo({top:0,behavior:'smooth'});
  }
  function filter(){const q=search.value.trim().toLocaleLowerCase();const active=cards.find(c=>c.classList.contains('teacher-current'));if(!active)return;let count=0;active.querySelectorAll('.level-row').forEach(row=>{const visible=!q||row.textContent.toLocaleLowerCase().includes(q);row.classList.toggle('teacher-filtered',!visible);if(visible)count++});sidebar.querySelector('.world-count').textContent=q?`找到 ${count} 个教学单元`:`本章 ${count} 个教学单元`}
  search.addEventListener('input',filter);
  const saved=cards.findIndex(c=>c.querySelector('.chapter-content.active'));
  select(saved>=0?saved:0);
  document.querySelector('.page-title').textContent=`${language} 教师课程工作台`;
  const back=document.querySelector('.header-nav .back-btn');if(back)back.textContent='返回教学中心';
  const about=document.querySelector('.header-nav .about-btn');if(about)about.textContent='关于扣哒';
  const feedback=document.querySelector('.header-nav .feedback-btn');if(feedback)feedback.textContent='反馈问题';
});
