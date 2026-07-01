# 扣哒世界教学中心

这是一个面向老师、教研、机构运营与课程展示使用的静态教学资源中心。首页汇总扣哒世界主线课程、AI 课程、竞技场课程、信奥课程、考级真题、CSP 真题与计算机科学探索等入口；各课程模块放在 `islands/` 下，每个模块通过自己的 `index.html` 进入。

## 快速打开

推荐从项目根目录打开：

```text
educator-hub-main/index.html
```

如果需要用本地服务器预览，可以在 `educator-hub-main` 目录下运行：

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000/
```

## 当前入口结构

主入口文件：

| 页面 | 说明 |
| --- | --- |
| `index.html` | 教学中心主页，老师最常用的总入口 |
| `teacher-first-class.html` | 新老师入门指引 |
| `flower-experiment-class.html` | 线上编程课/花儿实验班展示页 |

首页顶部菜单当前跳转路径：

| 菜单 | 当前路径 |
| --- | --- |
| 扣哒宇宙AI课 | `islands/ai/index.html` |
| 竞技场课 | `islands/arena/index.html` |
| 扣哒世界Python课 | `islands/world-python/index.html` |
| 扣哒世界C++课 | `islands/world-cpp/index.html` |
| 扣哒信奥基础课 | `islands/oj-basic/index.html` |
| 扣哒信奥算法课 | `islands/oj-algo/index.html` |

首页“更多资源”菜单当前跳转路径：

| 菜单 | 当前路径 |
| --- | --- |
| 考级真题 | `islands/grade-exam/index.html` |
| CSP真题 | `islands/csp-real/index.html` |
| 计算机科学探索 | `islands/cs-science/index.html` |
| 线上编程课 | `flower-experiment-class.html` |

## `islands/` 模块说明

当前目录已经改为扁平模块结构，所有课程岛屿都直接位于 `islands/` 第一层。

```text
islands/
├─ ai/
├─ arena/
├─ csp-real/
├─ cs-science/
├─ grade-exam/
├─ oj-algo/
├─ oj-basic/
├─ world-cpp/
└─ world-python/
```

各模块用途：

| 模块 | 入口 | 内容概览 |
| --- | --- | --- |
| `ai` | `islands/ai/index.html` | 扣哒宇宙 AI 课程介绍、AI 入门、AI 探索、AI 沙盒、学生作品集 |
| `arena` | `islands/arena/index.html` | 竞技场教学中心，包含竞技场项目、规则介绍与课堂活动素材 |
| `world-python` | `islands/world-python/index.html` | Python 主线课程，包含 `ch1` 到 `ch7` 的知识、关卡、测验等内容 |
| `world-cpp` | `islands/world-cpp/index.html` | C++ 主线课程，包含 `ch1` 到 `ch7` 的知识、关卡、测验等内容 |
| `oj-basic` | `islands/oj-basic/index.html` | 扣哒信奥基础篇，包含语法、输入输出、基础结构、练习、真题与 OJ |
| `oj-algo` | `islands/oj-algo/index.html` | 扣哒信奥算法篇，包含算法专题、训练题、专题讲解与 OJ |
| `grade-exam` | `islands/grade-exam/index.html` | 编程考级真题入口，按 `level1` 到 `level6` 组织 |
| `csp-real` | `islands/csp-real/index.html` | CSP 真题与专题训练入口，当前有效内容在 `cspj/` 下 |
| `cs-science` | `islands/cs-science/index.html` | 计算机科学探索课程，按 `ch1` 到 `ch9` 组织 |

## 当前路径约定

因为目录已调整为扁平结构，链接应按以下规则维护：

1. 从根目录首页跳到课程模块：使用 `islands/<模块名>/index.html`。
2. 从课程模块首页返回教学中心主页：使用 `../../index.html`。
3. 从课程模块首页引用本模块内部章节：使用相对路径，例如 `ch1/sec1/knowledge.html`、`ch3/quiz.html`。
4. 从 `islands/ai/project/index.html` 返回 AI 课程首页：使用 `../index.html`。
5. 不再使用旧路径：
   - `islands/world/world-python/index.html`
   - `islands/world/world-cpp/index.html`
   - `islands/oj/oj-basic/index.html`
   - `islands/oj/oj-algo/index.html`
   - `islands/other/grade-exam/index.html`
   - `islands/other/csp-real/index.html`
   - `islands/other/cs-science/index.html`
   - `../../menu.html`

旧路径与新路径对应关系：

| 旧路径 | 新路径 |
| --- | --- |
| `islands/world/world-python/index.html` | `islands/world-python/index.html` |
| `islands/world/world-cpp/index.html` | `islands/world-cpp/index.html` |
| `islands/oj/oj-basic/index.html` | `islands/oj-basic/index.html` |
| `islands/oj/oj-algo/index.html` | `islands/oj-algo/index.html` |
| `islands/other/grade-exam/index.html` | `islands/grade-exam/index.html` |
| `islands/other/csp-real/index.html` | `islands/csp-real/index.html` |
| `islands/other/cs-science/index.html` | `islands/cs-science/index.html` |
| `../../menu.html` | `../../index.html` |

## 图片资源

首页图片已转换为更小的 WebP 格式以提升加载速度，原始 PNG/JPG 文件仍保留作为备份。

首页正在使用的图片：

| 用途 | 当前文件 |
| --- | --- |
| 顶部 logo | `logo-cn.webp` |
| 首页老师插图 | `assets/educator.webp` |
| Python/C++ 模块封面 | `assets/home-world.webp` |
| AI 模块封面 | `assets/home-ai.webp` |
| 竞技场模块封面 | `assets/home-arena.webp` |
| 信奥模块封面 | `assets/home-oj.webp` |

其他已生成的 WebP 文件：

| 文件 | 说明 |
| --- | --- |
| `assets/story_left_6.webp` | 从原 `story_left_6.png` 转换，用于后续需要时替换 |
| `assets/home-world-jpg.webp` | 从原 `home-world.jpg` 转换，当前首页未引用 |
| `assets/home-arena-jpg.webp` | 从原 `home-arena.jpg` 转换，当前首页未引用 |
| `images/logo.webp` | 从 `images/logo.png` 转换，当前首页未引用 |

## 维护建议

新增或移动课程目录时，建议按下面顺序检查：

1. 确认新目录下是否有 `index.html`。
2. 更新根目录 `index.html` 的顶部导航、模块卡片和资源菜单。
3. 更新对应模块 `index.html` 中的返回首页链接。
4. 检查模块内部链接是否仍能落到真实文件，例如 `knowledge.html`、`quiz.html`、`levels.html`。
5. 如果替换图片，优先使用 `.webp`，并保留原图作为备份。
6. 修改后打开 `index.html`，逐一点击顶部菜单、模块按钮和“更多资源”菜单确认跳转。

## 当前已校正的链接

本次目录调整后已修正：

- `index.html` 中所有指向旧 `islands/world/`、`islands/oj/`、`islands/other/` 的链接。
- `islands/world-python/index.html` 和 `islands/world-cpp/index.html` 中返回按钮的旧 `../../menu.html` 链接。
- `islands/csp-real/index.html` 中不存在的 `csps/array1d/quiz.html` 与 `csps/string/quiz.html` 链接，已改为当前存在的 `cspj/array1d/quiz.html` 与 `cspj/string/quiz.html`。

## 内容规模概览

当前各模块 HTML 文件数量概览：

| 模块 | HTML 数量 |
| --- | ---: |
| `ai` | 19 |
| `arena` | 72 |
| `csp-real` | 11 |
| `cs-science` | 73 |
| `grade-exam` | 79 |
| `oj-algo` | 179 |
| `oj-basic` | 231 |
| `world-cpp` | 191 |
| `world-python` | 213 |

这些数量用于快速了解内容规模，后续新增或删减课程后可以同步更新。
