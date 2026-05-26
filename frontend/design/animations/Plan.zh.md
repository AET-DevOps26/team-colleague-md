> **Note:** This Chinese version is superseded by the new English `Plan.md` (which adopts a hybrid Components + Pages architecture). Kept here as historical reference of the earlier Tier A/B model.

# Verita 动画 Demo 文件架构方案

> **目的**：把现在塞在 `demo/Verita Transition.html`（2630 行，原 `Verita Auth.html` 改名而来）里的 35+ 动画拆成多个小文件，每个文件聚焦一种连贯交互，未来新增动画不再让单文件爆炸。
>
> **本质目的**：用这些 demo 提前设计 + 验证动画效果，并作为 React 实现时的 1:1 参考（每个 demo ≈ 一个 React 组件 / hook）。

---

## 1. 拆分原则

1. **按"用户能看到的连贯交互"分**，不按动画类型分
   - sign-in flow 是 9 个动画串成 1 个交互 → 放一起
   - search 的 6 个动画也是一个连贯交互 → 放一起
2. **每个文件 < 600 行**（超过就再拆）
3. **每个文件可以独立打开预览**，只通过 `_shared/tokens.css` 共享 motion tokens
4. **每个文件顶部加一段注释**：写明演示什么动画、对应到 `Verita Animation Spec.md` 的哪一节、React 实现时用什么组件 / hook 名字
5. **测试目标**：未来新加一个动画（比如 Editor Drawer），只新建一个 demo 文件，不动其他文件，**永远不引入回归**

---

## 2. 目录结构总览

```
demo/
├── Plan.md                                ← 本文档
├── 00 Index.html                          ← 导航页：列出所有 demo + 缩略图 + 链接
├── _shared/
│   └── tokens.css                         ← 共享 motion tokens / 色板 / 字体
│
├── ── Tier A · 已实现（来自 Verita Transition.html）──
├── 01 Layout & Sidebar.html               ← Sidebar rail 折叠 + topbar
├── 02 View Transitions.html               ← Home ↔ Detail push
├── 03 Search.html                         ← Search overlay + push 模式
├── 04 Auth Modal.html                     ← Auth modal 本身
├── 05 Auth Sign-in Flow.html              ← 登录成功的全流程编排
├── 06 Settings Modal.html                 ← Settings modal
├── 07 Feed & Cards.html                   ← Card hover + tag filter + masonry refresh
├── 08 Utility & Reduced Motion.html       ← Toast + FAB + AI panel + reduced-motion
│
├── ── Tier B · 待新增（对应根目录现有页面）──
├── 09 Post Editor.html                    ← 编辑器交互动画
├── 10 User Profile.html                   ← Profile 进入与 tabs 切换
├── 11 Digest Management.html              ← Digest 管理 + 添加/移除卡片
├── 12 Digest Post.html                    ← Digest 阅读动画
├── 13 Admin.html                          ← Admin 后台动画
├── 14 404 & Errors.html                   ← 错误页过渡
│
└── ── 保留 ──
    └── Verita Transition.html             ← 当前完整快照（原 Verita Auth.html 改名，包含所有已实现动画 + auth 流程，作为整体集成参考；不再迭代）
```

---

## 3. Tier A · 已实现的 8 个 demo（拆自 Verita Transition.html）

每个 demo 的目标内容都已经在当前 `demo/Verita Transition.html` 里实现过，拆分时主要是**摘出来 + 简化**。

### `01 Layout & Sidebar.html` (~400 行)
**演示**：
- Sidebar rail 折叠（hover 自动展开）
- Nav-item label / badge 折叠
- Brand "Verita" 后缀 slide
- Topbar 滚动出现的 shadow
- Avatar button hover

**触发方式**：静态首页 + sidebar，鼠标 hover sidebar 看折叠展开；提供一个 toggle 按钮模拟 detail mode 强制折叠。

**对应 Spec 节点**：§2.2, §2.3
**React 组件提示**：`<Sidebar />`, `<Topbar />`, `useRailCollapse()`

---

### `02 View Transitions.html` (~500 行)
**演示**：
- Home → Detail push（460ms `--ease-page`）
- Detail → Home pull
- 转场期间的可见性守卫（`.is-animating .pane`）
- Detail 内部的 reading progress bar

**触发方式**：两个 pane（home 和 detail）+ 切换按钮，反复触发观察 push / pull。

**对应 Spec 节点**：§2.1
**React 组件提示**：`<ViewStack />`, `useViewTransition()`

---

### `03 Search.html` (~600 行)
**演示**：
- Search overlay open / close（scale + fade）
- 第一次 search → push 模式（stage 整体推到 search pane）
- 再次 search → overlay 模式（不再 push）
- Result cards stagger-in
- Input focus ring

**触发方式**：home + 搜索栏，点击触发 overlay；输入提交触发 push；返回 home 再 search 触发 overlay。

**对应 Spec 节点**：§2.4
**React 组件提示**：`<SearchOverlay />`, `<SearchResultsPane />`, `useSearchMode()`

---

### `04 Auth Modal.html` (~600 行)
**演示**：
- Modal open（backdrop 160ms + panel 180ms scale）
- Content stagger-in（80→120→160→200→240→280ms）
- 横向 panel push（Login ↔ Signup ↔ Forgot）
- Stage height 240ms 缓动
- 错误 shake（6px × 2）
- Modal close（160ms 同时 fade）
- Reduced motion 降级

**触发方式**：一个 trigger 按钮 + 完整 modal；点 tabs / Forgot link / 故意触发错误观察 shake。

**对应 Spec 节点**：§2.8（除 sign-in 编排部分）
**React 组件提示**：`<AuthModal />`, `<AuthPanel />`, `useAuthMode()`

---

### `05 Auth Sign-in Flow.html` (~500 行)
**演示**（这是**编排**，不是单独动画）：
- CTA → spinner（120ms cross-fade）
- 700ms fake delay
- Check 圆 280ms scale-in
- "Welcome back" 文字 100ms 后渐入
- 700ms hold
- Modal close（与下面并行）
- Topbar Sign-in 按钮 morph 成头像（240ms）
- Sidebar Sign-in nav-item 消失
- Welcome toast（240ms slide）
- Masonry feed refresh（路 B：120ms 淡出 → 换内容 → 220ms 淡入）

**触发方式**：一个简化的 home 视图 + 一个"模拟登录成功"按钮 → 完整播放编排。

**对应 Spec 节点**：§2.8（sign-in 编排部分）+ §2.9
**React 组件提示**：`<SignInChoreography />`, `useSignInFlow()`

---

### `06 Settings Modal.html` (~300 行)
**演示**：
- Settings modal open / close（160ms scale + fade）
- 内部 interaction（频率切换、通知 toggle）

**触发方式**：触发按钮 + 全 modal。

**对应 Spec 节点**：§2.5
**React 组件提示**：`<SettingsModal />`

---

### `07 Feed & Cards.html` (~500 行)
**演示**：
- Card hover lift
- Like button bounce
- Tag chip filter（卡片 fade + scale + stagger 重新进入）
- Digest CTA arrow slide
- Masonry refresh fade（路 B 单独 demo，不带 sign-in 编排）

**触发方式**：一个 masonry + tag chips + 各种 hover 状态可触发。

**对应 Spec 节点**：§2.9 + Spec 中关于 card hover / filter 的小节
**React 组件提示**：`<Masonry />`, `<PostCard />`, `<TagChipFilter />`

---

### `08 Utility & Reduced Motion.html` (~300 行)
**演示**：
- Toast slide + fade
- Refresh FAB hover + spin
- AI summary panel expand（chevron + max-height）
- Transition hint fade
- Reading progress bar
- 同一文件最后一节 demo `prefers-reduced-motion` 降级

**触发方式**：每种动画一个 trigger 按钮 + 一个 toggle 模拟 reduced-motion 媒体查询。

**对应 Spec 节点**：§4
**React 组件提示**：`<Toast />`, `<RefreshFab />`, `<AiSummaryPanel />`, `useReducedMotion()`

---

## 4. Tier B · 待新增的 6 个 demo（对应根目录现有页面）

这些页面目前是**静态页面**，还没设计任何动画。每个文件初版可以先写一个简化骨架 + 1-2 个核心动画占位，后续按需加。

### `09 Post Editor.html`（对应 `Verita Post Editor.html`，1097 行）
**潜在动画**：
- 进入编辑器：Drawer 从右侧 slide 进入 / fade 进入（取决于是 push 还是 modal）
- AI 助手 panel 展开 / 折叠
- 自动保存 toast（"Saved at 14:32"）
- Publish 按钮 → confirm modal → spinner → 成功
- Field focus 状态过渡
- 工具栏切换（粗体、链接等）的 active 状态

**React 组件提示**：`<PostEditor />`, `<EditorDrawer />`, `<AiAssistantPanel />`, `useAutoSave()`

---

### `10 User Profile.html`（对应 `Verita User Profile.html`，1073 行）
**潜在动画**：
- 进入 profile：Avatar push 转场（同 §2.7 的方向，从 topbar 头像位置放大到 profile）
- Tabs 切换（Posts / Saves / Following）的下划线 slide
- Follow 按钮 toggle（"Follow" ↔ "Following" 状态变化 + bounce）
- 文章列表 stagger-in
- Hero header 视差 / fade

**React 组件提示**：`<UserProfile />`, `<TabBar />`, `<FollowButton />`, `useProfileTransition()`

---

### `11 Digest Management.html`（对应 `Verita Digest Management.html`，645 行）
**潜在动画**：
- 添加文章到 digest：从 home 卡片 → 飞入 digest 列表（FLIP 动画）
- 移除文章：fade + collapse 高度
- 拖拽重排：item drag + drop 阴影
- 保存 digest 成功 toast

**React 组件提示**：`<DigestManager />`, `<DraggableList />`, `useFlipAnimation()`

---

### `12 Digest Post.html`（对应 `Verita Digest Post.html`，901 行）
**潜在动画**：
- 进入 digest：和普通 post detail 同样的 push 转场
- 多篇文章之间的 horizontal swipe / next-prev 切换
- Reading progress（按 digest 整体进度，跨篇）
- 末尾 "All caught up" 状态淡入

**React 组件提示**：`<DigestReader />`, `<MultiPostNavigator />`

---

### `13 Admin.html`（对应 `Verita Admin.html`，821 行）
**潜在动画**：
- 数据表格筛选时的 row fade + collapse
- Tab 切换（Users / Reports / Settings）下划线 slide
- 操作 confirm modal（删除用户、封禁等）
- Inline edit field 进入 / 退出
- 状态徽章颜色过渡（active → suspended）

**React 组件提示**：`<AdminPanel />`, `<DataTable />`, `<InlineEdit />`

---

### `14 404 & Errors.html`（对应 `Verita 404.html`，199 行 + 通用错误状态）
**潜在动画**：
- 404 页进入：fade + scale 微入场
- "Go back" 按钮 hover
- 通用空状态（empty state）的 illustration fade + bounce
- 网络错误 banner slide-in from top

**React 组件提示**：`<NotFoundPage />`, `<EmptyState />`, `<ErrorBanner />`

---

## 5. 共享文件

### `_shared/tokens.css`
所有 demo 通过 `<link rel="stylesheet" href="_shared/tokens.css">` 引用，包含：

**Motion tokens**：
```css
:root {
  --dur-fast:    180ms;
  --dur-base:    220ms;
  --dur-page:    460ms;
  --dur-rail:    320ms;
  --dur-stagger: 40ms;
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-ios:    cubic-bezier(0.32, 0.72, 0, 1);
  --ease-page:   cubic-bezier(0.4, 0, 0.2, 1);
}
```

**色板 + 字体**（从 `Verita Transition.html` 抽取）：
```css
:root {
  --bg-base:        #FFFFFF;
  --bg-surface:     #F9F9F9;
  --bg-elevated:    #F0F0F0;
  --text-primary:   #0A0A0A;
  --text-secondary: #6B6B6B;
  --text-tertiary:  #ABABAB;
  --border-subtle:  #EBEBEB;
  --accent:         #0A0A0A;
  --font-sans:      "Inter", system-ui, -apple-system, sans-serif;
  --font-mono:      "JetBrains Mono", ui-monospace, monospace;
  --font-serif:     "Newsreader", "Iowan Old Style", Georgia, serif;
}
```

**通用基础样式**：reset、按钮基础、focus ring、`prefers-reduced-motion` 全局降级。

---

### `00 Index.html`
导航页：14 张卡片（8 个 Tier A + 6 个 Tier B），每张卡片包含：
- 编号 + 标题（如 "04 Auth Modal"）
- 一句话描述（如 "Modal open/close + 横向 panel push + content stagger"）
- 状态徽章（🟢 已实现 / 🟡 占位 / 🔴 待设计）
- 缩略图（可以是动画片段截图，初版可以省略）
- "Open demo" 链接

---

## 6. 落地路线（建议执行顺序）

**阶段 1 · 基建**（先做，避免之后每次都重复）：
1. 建 `_shared/tokens.css`
2. 建 `00 Index.html` 骨架（先不放截图，纯链接）

**阶段 2 · Tier A 拆分**（已有的内容，最容易）：
3. 从 **`04 Auth Modal.html`** 开始拆（最近做的，逻辑最清楚）
4. 然后 **`05 Auth Sign-in Flow.html`**（紧接着 04）
5. 然后 **`07 Feed & Cards.html`** + **`02 View Transitions.html`**（关联紧）
6. 再做 **`01 Layout & Sidebar.html`** + **`03 Search.html`**
7. 最后 **`06 Settings Modal.html`** + **`08 Utility & Reduced Motion.html`**

**阶段 3 · Tier B 占位**（每个文件先写骨架 + 一句话注释，标记"待设计"）：
8. 一次性建 6 个 Tier B 文件的空骨架，确保 `00 Index.html` 入口齐全
9. 之后按业务优先级逐个填充（建议顺序：Editor → Profile → Digest Post → Digest Management → Admin → 404）

**阶段 4 · 收尾**：
10. 更新 `Verita Animation Spec.md`，把每节加上对应 demo 文件的链接
11. 验证：每个 demo 独立打开能跑、`00 Index.html` 入口齐全、`Verita Transition.html` 保留为参考（不再迭代）

---

## 7. 维护约定

- **每个文件顶部固定注释模板**：
  ```html
  <!--
    Demo: 04 Auth Modal
    Spec: §2.8 Auth modal
    React: <AuthModal />, useAuthMode()
    Last reviewed: YYYY-MM-DD
  -->
  ```
- **新增动画时先看是否能放进现有文件**：能放进的优先复用；不能放进的（独立交互）才新建文件
- **超过 600 行强制拆分**：超过就一定要拆，不要妥协
- **不要再让单文件承载多个无关交互**：这是 `Verita Transition.html`（原 `Verita Auth.html`）的教训
- **Spec 文档是 source of truth**：demo 是验证手段，最终规格在 `doc/Verita Animation Spec.md`，每次改动同步

---

## 8. 总结

- **Tier A（8 个）**：来自 `Verita Transition.html` 现有动画的拆分，工作量是"摘出来 + 简化"
- **Tier B（6 个）**：对应根目录还没动画的页面（Editor / Profile / Digest Mgmt / Digest Post / Admin / 404），先建骨架占位
- **共享 + 导航（2 个）**：`_shared/tokens.css` + `00 Index.html`
- **保留（1 个）**：`Verita Transition.html`（原 `Verita Auth.html` 改名，包含所有已实现动画 + auth 流程，整体集成参考）

**总计 17 个文件**（含目录文件、共享、保留），覆盖现有所有页面的动画需求 + 未来扩展空间。
