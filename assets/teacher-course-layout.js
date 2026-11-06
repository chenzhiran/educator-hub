document.addEventListener('DOMContentLoaded', () => {
  const world = document.querySelector('.campaign-container');
  const oj = !world && document.querySelector('body > .container .chapter-card') ? document.querySelector('body > .container') : null;
  const root = world || oj;
  if (!root) return;
  if (world) return; // Python / C++ 使用独立的单章工作台布局。
  document.body.classList.add(world ? 'teacher-course' : 'teacher-oj');
  const cards = [...root.querySelectorAll(':scope > .chapter-card')];
  const index = document.createElement('aside');
  index.className = 'teacher-index';
  index.setAttribute('aria-label', '章节导航与搜索');
  index.innerHTML = '<h2>课程目录</h2><input type="search" aria-label="搜索章节、知识点或题目" placeholder="搜索章节、知识点或题目"><nav aria-label="章节跳转"></nav><span class="result-count"></span>';
  root.prepend(index);
  let ojMain = null;
  let overview = null;
  if (oj) {
    ojMain = document.createElement('main');
    ojMain.className = 'oj-main';
    overview = document.createElement('section');
    overview.className = 'oj-overview';
    ojMain.append(overview, ...cards);
    root.append(ojMain);
  }
  const nav = index.querySelector('nav');
  const input = index.querySelector('input');
  const count = index.querySelector('.result-count');
  function showChapter(i) {
    cards.forEach((item, n) => item.classList.toggle('teacher-current', n === i));
    [...nav.children].forEach((item, n) => item.classList.toggle('active', n === i));
    const card = cards[i];
    const title = card.querySelector('.chapter-title')?.textContent.trim() || `第 ${i + 1} 章`;
    const topics = [...card.querySelectorAll('.knowledge-area .k-tag')].map(el => el.textContent.trim()).filter(Boolean);
    const solutions = [...card.querySelectorAll('.solution-select option')].filter(opt => opt.value).length;
    overview.replaceChildren();
    const kicker = document.createElement('p'); kicker.className = 'oj-eyebrow'; kicker.textContent = `扣哒信奥 · ${location.pathname.includes('oj-algo') ? '算法篇' : '基础篇'} · 第 ${i + 1} 章`;
    const heading = document.createElement('h2'); heading.textContent = title;
    const intro = document.createElement('p'); intro.textContent = topics.length ? `本章围绕${topics.slice(0, 4).join('、')}展开。先看讲解，再做练习，最后结合题解和选讲资料复盘。` : '本章汇集知识讲解、课堂练习、题解与选讲资料。';
    const meta = document.createElement('div'); meta.className = 'oj-meta';
    [`${topics.length} 个知识点`, `${solutions} 道可选题解`, 'C++ / Python 课件与练习'].forEach(text => { const span = document.createElement('span'); span.textContent = text; meta.append(span); });
    overview.append(kicker, heading, intro, meta);
    ojMain.scrollTo({top: 0, behavior: 'smooth'});
  }
  cards.forEach((card, i) => {
    card.id ||= `teacher-chapter-${i + 1}`;
    const label = card.querySelector('.chapter-title')?.textContent.trim().replace(/^[^\p{L}\p{N}]+/u, '') || `第 ${i + 1} 章`;
    const chapterTitle = card.querySelector('.chapter-title');
    if (oj && chapterTitle) chapterTitle.textContent = label;
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<strong>第 ${i + 1} 章</strong><span></span>`;
    button.querySelector('span').textContent = label;
    button.addEventListener('click', () => {
      if (world) {
        const content = card.querySelector('.chapter-content');
        if (content && !content.classList.contains('active')) card.querySelector('.chapter-header')?.click();
      }
      if (oj) showChapter(i);
      else card.scrollIntoView({behavior:'smooth',block:'start'});
      nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === button));
    });
    nav.append(button);
  });
  if (oj && cards.length) {
    if (location.pathname.includes('oj-algo')) document.body.classList.add('algo-teacher');
    showChapter(0);
    const header = document.querySelector('body > header');
    const brand = document.createElement('a'); brand.className = 'oj-back'; brand.href = '../../index.html'; brand.textContent = '返回教学中心';
    const logo = document.createElement('img'); logo.className = 'oj-logo'; logo.src = '../../logo-cn.webp'; logo.alt = '扣哒世界';
    header.prepend(brand, logo);
    const heading = document.querySelector('body > header h1');
    if (heading) heading.textContent = `扣哒信奥 · ${location.pathname.includes('oj-algo') ? '算法篇' : '基础篇'}`;
    const searchBox = document.getElementById('searchBox');
    if (searchBox) searchBox.placeholder = '搜索题号或题名，例如 1101、双门密语';
  }
  input.addEventListener('input', () => {
    const query = input.value.trim().toLocaleLowerCase();
    let visible = 0;
    cards.forEach((card, i) => {
      const matches = !query || card.textContent.toLocaleLowerCase().includes(query);
      card.classList.toggle('teacher-hidden', !matches);
      nav.children[i].hidden = !matches;
      if (matches) visible++;
      if (world && query && matches) {
        const content = card.querySelector('.chapter-content');
        if (content && !content.classList.contains('active')) card.querySelector('.chapter-header')?.click();
      }
    });
    if (oj && query) {
      const first = cards.find(card => !card.classList.contains('teacher-hidden'));
      if (first) showChapter(cards.indexOf(first));
    }
    count.textContent = query ? `找到 ${visible} 个相关章节` : `共 ${cards.length} 个章节`;
  });
  count.textContent = `共 ${cards.length} 个章节`;
});
