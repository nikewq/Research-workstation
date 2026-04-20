# 博士工作台 · PhD Workstation

> 一个为博士研究生定制的全功能工作台，集成日程管理、文献库、投稿追踪、实验日志、LaTeX 写作预览、专注计时、反思日记等模块。全部运行在浏览器本地，数据存储于 localStorage / IndexedDB，无需服务器。

## 在线访问

🔗 **[https://nikewq.github.io/Research-workstation/](https://nikewq.github.io/Research-workstation/)**

---

## 主要功能

| 模块 | 说明 |
|------|------|
| 📅 甘特图 | 可视化项目时间线，支持多项目管理 |
| 📖 文献管理 | 论文追踪、PDF 内嵌阅读器、AI 辅助解读 |
| 📄 投稿追踪 | 全周期状态（Submitted → Under Review → Revision → Accepted）|
| ✍️ LaTeX 写作 | 支持导入 Overleaf ZIP，.cls/.sty 宏解析，KaTeX 实时预览 |
| 🤖 AI 写作辅助 | 润色 / 精简 / 扩写 / 语法修正 / 翻译 / 摘要，多 Provider |
| 🔥 习惯打卡 | 自定义习惯，连续打卡统计 |
| 🍅 专注计时 | Pomodoro 计时器，原位集成于文献阅读界面 |
| 🕵️ 科研情报 | 每日科研圈动态汇总（AI 驱动） |
| 💬 留言墙 | 社区互动，AI 自动回复 |
| 🎨 高校主题 | 内置 32 所高校 VI 配色，支持 AI 生成任意学校配色 |

## 本地开发

直接打开 `index.html`，无需构建，无需 Node.js。

## 技术架构

- **单文件应用**：全部逻辑在一个 `index.html` 中（~9300 行），零构建依赖
- **存储层**：`localStorage`（结构化数据）+ `IndexedDB`（PDF Blob + 文件夹句柄）
- **PWA**：`manifest.json` + `sw.js`，支持离线使用与桌面安装
- **技术栈**：原生 HTML / CSS / JavaScript，无框架

---

## Acknowledgments

本项目在开发过程中使用了以下开源库与外部服务，在此致谢：

### 开源库

| 库 | 版本 | 用途 | 许可证 |
|----|------|------|--------|
| [KaTeX](https://katex.org/) | 0.16.9 | LaTeX 数学公式渲染 | MIT |
| [PDF.js](https://mozilla.github.io/pdf.js/) | 3.11.174 | 浏览器端 PDF 渲染与文字层提取 | Apache 2.0 |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | ZIP 压缩包解压（Overleaf 项目导入） | MIT |
| [Chart.js](https://www.chartjs.org/) | 4.4.0 | 数据可视化图表 | MIT |

以上库均通过 [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com) 或 [jsdelivr.net](https://www.jsdelivr.com/) CDN 加载。

### 数据与 API 服务

| 服务 | 用途 |
|------|------|
| [OpenAlex API](https://openalex.org/) | 每日文献聚合主力数据源，CORS 友好，无需 Key（免费） |
| [Semantic Scholar API](https://www.semanticscholar.org/product/api) | 论文搜索与元数据获取，降级备用（免费） |
| [Crossref API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) | 期刊论文元数据补充检索，三级降级兜底（免费） |
| [arXiv](https://arxiv.org/) | 论文预印本直链与 PDF |
| [Pollinations AI](https://pollinations.ai/) | 默认免费 AI 接口（无需注册） |

### AI 服务（用户自行配置）

本工作台支持接入以下 AI 服务，所有 API Key 由用户本地保存，不经过任何服务器：

- [Anthropic Claude API](https://www.anthropic.com/) — 学术写作辅助
- [Google Gemini API](https://ai.google.dev/)
- [OpenAI API](https://platform.openai.com/)（及任意兼容接口）

### 设计参考

- 高校主题配色参考各高校官方 VI 手册标准色
- 学术投稿状态流程参考 [IEEE Author Center](https://ieeeauthorcenter.ieee.org/) 与 [Elsevier 投稿指南](https://www.elsevier.com/researcher/author/submit-your-paper)

---

## 许可证

本项目代码以 [MIT License](LICENSE) 开源。

> 注：本工作台调用的外部 API 服务（Semantic Scholar、Crossref、各 AI 服务）须遵守各自的服务条款与使用限制。
