document.addEventListener('DOMContentLoaded', () => {
  const basic = [
    ['基础起步','从输入输出、变量和运算开始，逐步掌握条件与循环。','顺序结构','基本运算','选择结构—单双分支','选择结构—逻辑运算符','选择结构—多分支','选择结构—综合练习','选择结构—其他写法','循环结构—while','循环结构—do while','循环结构—for'],
    ['数据与模块','用数组与字符串处理成组信息，再用函数拆解问题。','一维数组','一维数组练习','一维数组应用案例','简单排序','字符数组与字符串','字符数组应用案例','二维数组','二维数组应用案例','函数','递归函数','结构体']
  ];
  const algo = [
    ['算法入门','理解数、模拟、排序、枚举与递归等经典方法。','整数理论','模拟与高精度','排序算法','暴力枚举','递推','递归'],
    ['策略与搜索','练习选择策略、缩小范围与遍历状态空间。','贪心','二分与分治','二分应用','深度优先搜索（DFS）','广度优先搜索（BFS）'],
    ['状态与数据结构','面对更复杂的问题，学会描述状态并组织数据。','动态规划（DP）','线性表','二叉树','集合'],
    ['图与组合问题','把多种方法用于关系、二进制和计数问题。','图','位运算','进制转换','计数原理','排列组合']
  ];
  const target = document.querySelector('.curriculum-list');
  if (target) {
    const all = document.createElement('div');
    all.className = 'complete-course';
    let basicIndex = 0, algoIndex = 0;
    [...basic.map(group => ({group,kind:'基础篇',base:'oj-basic',next:()=>++basicIndex})),...algo.map(group => ({group,kind:'算法篇',base:'oj-algo',next:()=>++algoIndex}))].forEach(({group,kind,base,next}) => {
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      heading.textContent = `${kind} · ${group[0]}`;
      const description = document.createElement('p');
      description.textContent = group[1];
      const list = document.createElement('ol');
      group.slice(2).forEach(name => {
        const number = next();
        const item = document.createElement('li');
        const hasLesson = base === 'oj-basic' || number <= 14;
        const label = document.createElement(hasLesson ? 'a' : 'span');
        if (hasLesson) label.href = `../${base}/ch${number}/knowledge.html`;
        label.innerHTML = `<b>${String(number).padStart(2,'0')}</b>`;
        label.append(document.createTextNode(name));
        if (!hasLesson) label.append(document.createTextNode(' · 课程资源待开放'));
        item.append(label);
        list.append(item);
      });
      section.append(heading,description,list);
      all.append(section);
    });
    target.prepend(all);
    const kicker = target.closest('.section')?.querySelector('.section-head .eyebrow');
    if (kicker) kicker.textContent = '完整展示每一章';
  }
  const grid = document.querySelector('.difference');
  if (grid) {
    const proof = document.createElement('div');
    proof.className = 'proof-grid';
    proof.innerHTML = '<article><img src="assets/story-question.png" alt="双门密语题目中的故事场景" loading="lazy"><h3>题目有故事，孩子更容易读进去</h3><p>例如“英雄站在石门前”的双门密语，把输入与判断放进具体任务。原题页面配有场景图，帮助孩子理解题意。</p></article><article><img src="assets/algorithm-question.png" alt="算法篇的情境题配图" loading="lazy"><h3>题解用图讲清思路</h3><p>“因数探秘”的题解有核心图解。孩子做过题后，可以对照图示理解方法和边界，减少只看答案仍不明白的挫败感。</p></article><article><img src="assets/course-map.webp" alt="信奥课程地图" loading="lazy"><h3>从故事题走向系统算法</h3><p>基础篇的情境题逐步衔接算法篇的搜索、动态规划和图论，让刷题有清楚的进阶方向。</p></article>';
    grid.after(proof);
  }
});
